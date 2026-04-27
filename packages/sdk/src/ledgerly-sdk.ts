import type {
  FileVaultCollectionSlug,
  StorageSqlValue,
  WritableStorageDatabase,
} from "@ledgerly/storage";
import {
  buildEvidenceManifestPath,
  buildEvidenceObjectPath,
  buildTaxYearDateRange,
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
  getLocalStorageOverview,
  getVaultCollectionSamplePath,
  loadBalanceSheetSummary,
  loadGeneralLedgerSummary,
  loadProfitAndLossSummary,
  loadScheduleCAggregation,
  loadScheduleCCandidateRecords,
  loadScheduleSEPreview,
  loadTaxHelperEvidenceFileLinks,
  loadTaxHelperSnapshot,
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  type BalanceSheetSummary,
  type GeneralLedgerSummary,
  type ProfitAndLossSummary,
  type TaxHelperSnapshot,
} from "@ledgerly/storage";
import type {
  CandidateRecordFilter,
  ContextSnapshot,
  CounterpartyRow,
  CreateCounterpartyInput,
  CreateRecordInput,
  EntityRow,
  EvidenceFileRow,
  EvidenceFilter,
  EvidenceRow,
  ExtractionRunFilter,
  ExtractionRunRow,
  LedgerlySdkConfig,
  ListRecordsFilter,
  LocalStorageBootstrapManifest,
  LocalStorageBootstrapPlan,
  LocalStorageOverview,
  MonthlyMetrics,
  PlannerReadTaskRow,
  PlannerRunFilter,
  PlannerRunRow,
  RecordDateRangeSearchInput,
  RecordRow,
  ResolvedStandardReceiptEntry,
  ScheduleCAggregationResult,
  ScheduleCCandidateRecord,
  StandardReceiptEntryInput,
  StandardReceiptPersistenceContext,
  SupportedScheduleCNetProfitPreview,
  TaxHelperEvidenceFileLink,
  TaxYearDateRange,
  TrendPoint,
  UpdateRecordInput,
  UploadBatchFilter,
  UploadBatchRow,
  WorkflowAuditEventFilter,
  WorkflowAuditEventRow,
  WorkflowCandidateRecordRow,
  WorkflowWriteProposalFilter,
  WorkflowWriteProposalRow,
} from "./types";

const DEFAULT_ENTITY_ID = "entity-main";
const DEFAULT_CURRENCY = "USD";
const DEFAULT_LIST_LIMIT = 50;
const DEFAULT_AUDIT_LIMIT = 50;

function buildRecordSelect(alias = "r"): string {
  return `${alias}.record_id AS recordId,
      ${alias}.entity_id AS entityId,
      ${alias}.record_status AS recordStatus,
      ${alias}.source_system AS sourceSystem,
      ${alias}.description,
      ${alias}.memo,
      ${alias}.occurred_on AS occurredOn,
      ${alias}.currency,
      ${alias}.amount_cents AS amountCents,
      ${alias}.source_label AS sourceLabel,
      ${alias}.target_label AS targetLabel,
      ${alias}.source_counterparty_id AS sourceCounterpartyId,
      ${alias}.target_counterparty_id AS targetCounterpartyId,
      ${alias}.record_kind AS recordKind,
      ${alias}.category_code AS categoryCode,
      ${alias}.subcategory_code AS subcategoryCode,
      ${alias}.tax_category_code AS taxCategoryCode,
      ${alias}.tax_line_code AS taxLineCode,
      ${alias}.business_use_bps AS businessUseBps,
      ${alias}.created_at AS createdAt,
      ${alias}.updated_at AS updatedAt`;
}

function parseOptionalJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as T;
}

function appendOptionalInClause(
  clauses: string[],
  params: StorageSqlValue[],
  columnName: string,
  values: readonly string[] | undefined,
): void {
  if (!values?.length) {
    return;
  }

  const normalizedValues = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!normalizedValues.length) {
    return;
  }

  clauses.push(`${columnName} IN (${normalizedValues.map(() => "?").join(", ")})`);
  params.push(...normalizedValues);
}

function appendLimitOffset(
  source: string,
  params: StorageSqlValue[],
  limit: number | undefined,
  offset: number | undefined,
): string {
  let nextSource = source;

  if (typeof limit === "number") {
    nextSource += "\nLIMIT ?";
    params.push(limit);
  } else if (typeof offset === "number") {
    nextSource += "\nLIMIT -1";
  }

  if (typeof offset === "number") {
    nextSource += "\nOFFSET ?";
    params.push(offset);
  }

  return `${nextSource};`;
}

export class LedgerlySDK {
  private db: WritableStorageDatabase;
  private defaultEntityId: string;
  private defaultCurrency: string;

  constructor(db: WritableStorageDatabase, config?: LedgerlySdkConfig) {
    this.db = db;
    this.defaultEntityId = config?.defaultEntityId ?? DEFAULT_ENTITY_ID;
    this.defaultCurrency = config?.defaultCurrency ?? DEFAULT_CURRENCY;
  }

  private entityId(override?: string): string {
    return override ?? this.defaultEntityId;
  }

  // ── Storage / Package Operations ──

  getStorageOverview(): LocalStorageOverview {
    return getLocalStorageOverview();
  }

  getStorageBootstrapManifest(): LocalStorageBootstrapManifest {
    return createLocalStorageBootstrapManifest();
  }

  getStorageBootstrapPlan(): LocalStorageBootstrapPlan {
    return getLocalStorageBootstrapPlan();
  }

  getVaultCollectionSamplePath(collection: FileVaultCollectionSlug): string {
    return getVaultCollectionSamplePath(collection);
  }

  buildEvidenceObjectPath(sha256Hex: string, extension: string): string {
    return buildEvidenceObjectPath(sha256Hex, extension);
  }

  buildEvidenceManifestPath(evidenceId: string): string {
    return buildEvidenceManifestPath(evidenceId);
  }

  // ── Entity Operations ──

  async listEntities(): Promise<EntityRow[]> {
    return this.db.getAllAsync<EntityRow>(
      `SELECT entity_id AS entityId, legal_name AS legalName, entity_type AS entityType,
              base_currency AS baseCurrency, default_timezone AS defaultTimezone, created_at AS createdAt
       FROM entities ORDER BY created_at ASC;`,
    );
  }

  async getEntity(entityId?: string): Promise<EntityRow | null> {
    return this.db.getFirstAsync<EntityRow>(
      `SELECT entity_id AS entityId, legal_name AS legalName, entity_type AS entityType,
              base_currency AS baseCurrency, default_timezone AS defaultTimezone, created_at AS createdAt
       FROM entities WHERE entity_id = ? LIMIT 1;`,
      this.entityId(entityId),
    );
  }

  async ensureDefaultEntity(): Promise<void> {
    const existing = await this.getEntity();
    if (existing) return;
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO entities (entity_id, legal_name, entity_type, base_currency, default_timezone, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      this.defaultEntityId,
      "Sole Proprietor",
      "sole_proprietorship",
      this.defaultCurrency,
      "America/Los_Angeles",
      now,
    );
  }

  // ── Record Operations ──

  async listRecords(filter?: ListRecordsFilter): Promise<RecordRow[]> {
    const entityId = this.entityId(filter?.entityId);
    const limit = filter?.limit ?? DEFAULT_LIST_LIMIT;
    const offset = filter?.offset ?? 0;

    const clauses: string[] = ["r.entity_id = ?"];
    const params: StorageSqlValue[] = [entityId];

    if (filter?.recordKind) {
      clauses.push("r.record_kind = ?");
      params.push(filter.recordKind);
    }

    if (filter?.recordKinds?.length) {
      clauses.push(`r.record_kind IN (${filter.recordKinds.map(() => "?").join(", ")})`);
      params.push(...filter.recordKinds);
    }

    if (filter?.startDate) {
      clauses.push("r.occurred_on >= ?");
      params.push(filter.startDate);
    }

    if (filter?.endDate) {
      clauses.push("r.occurred_on <= ?");
      params.push(filter.endDate);
    }

    if (filter?.search) {
      clauses.push("(r.description LIKE ? OR r.source_label LIKE ? OR r.target_label LIKE ?)");
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }

    params.push(limit, offset);

    return this.db.getAllAsync<RecordRow>(
      `SELECT ${buildRecordSelect("r")}
       FROM records AS r
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.occurred_on DESC, r.created_at DESC
       LIMIT ? OFFSET ?;`,
      ...params,
    );
  }

  async searchRecordsByDateRange(input: RecordDateRangeSearchInput): Promise<RecordRow[]> {
    return this.db.searchRecordsByDateRangeAsync<RecordRow>({
      dateRange: {
        endExclusiveOn: input.endExclusiveOn,
        endOn: input.endOn,
        startOn: input.startOn,
      },
      entityId: this.entityId(input.entityId),
      limit: input.limit,
      offset: input.offset,
      orderBy: "r.occurred_on DESC, r.created_at DESC",
      recordKinds: input.recordKinds,
      recordStatuses: input.recordStatuses,
      select: buildRecordSelect("r"),
    });
  }

  async searchFirstRecordByDateRange(
    input: RecordDateRangeSearchInput,
  ): Promise<RecordRow | null> {
    return this.db.searchFirstRecordsByDateRangeAsync<RecordRow>({
      dateRange: {
        endExclusiveOn: input.endExclusiveOn,
        endOn: input.endOn,
        startOn: input.startOn,
      },
      entityId: this.entityId(input.entityId),
      offset: input.offset,
      orderBy: "r.occurred_on DESC, r.created_at DESC",
      recordKinds: input.recordKinds,
      recordStatuses: input.recordStatuses,
      select: buildRecordSelect("r"),
    });
  }

  async getRecord(recordId: string): Promise<RecordRow | null> {
    return this.db.getFirstAsync<RecordRow>(
      `SELECT ${buildRecordSelect("records")}
       FROM records WHERE record_id = ? LIMIT 1;`,
      recordId,
    );
  }

  resolveRecordClassification(
    input: StandardReceiptEntryInput,
    context: StandardReceiptPersistenceContext,
  ): ResolvedStandardReceiptEntry {
    return resolveStandardReceiptEntry(input, context);
  }

  async persistResolvedRecordClassification(
    resolved: ResolvedStandardReceiptEntry,
  ): Promise<RecordRow | null> {
    await persistResolvedStandardReceiptEntry(this.db, resolved);
    return this.getRecord(resolved.record.recordId);
  }

  async createRecord(input: CreateRecordInput): Promise<RecordRow> {
    const entityId = this.entityId(input.entityId);
    const now = new Date().toISOString();
    const recordId = `rec-${crypto.randomUUID()}`;

    const resolved = this.resolveRecordClassification(
      {
        amountCents: input.amountCents,
        currency: input.currency ?? this.defaultCurrency,
        description: input.description,
        entityId,
        memo: input.memo,
        occurredOn: input.occurredOn,
        source: input.source,
        target: input.target,
        userClassification: input.recordKind,
      },
      {
        createdAt: now,
        recordId,
        sourceSystem: "agent",
        updatedAt: now,
      },
    );

    await this.persistResolvedRecordClassification(resolved);

    if (input.taxCategoryCode || input.taxLineCode) {
      const taxUpdates: UpdateRecordInput = {};
      if (input.taxCategoryCode) taxUpdates.taxCategoryCode = input.taxCategoryCode;
      if (input.taxLineCode) taxUpdates.taxLineCode = input.taxLineCode;
      await this.updateRecord(recordId, taxUpdates);
    }

    return (await this.getRecord(recordId))!;
  }

  async updateRecord(recordId: string, updates: UpdateRecordInput): Promise<RecordRow | null> {
    const existing = await this.getRecord(recordId);
    if (!existing) return null;

    const sets: string[] = [];
    const params: StorageSqlValue[] = [];
    const now = new Date().toISOString();

    if (updates.description !== undefined) {
      sets.push("description = ?");
      params.push(updates.description);
    }
    if (updates.memo !== undefined) {
      sets.push("memo = ?");
      params.push(updates.memo);
    }
    if (updates.amountCents !== undefined) {
      sets.push("amount_cents = ?");
      params.push(updates.amountCents);
    }
    if (updates.occurredOn !== undefined) {
      sets.push("occurred_on = ?");
      params.push(updates.occurredOn);
    }
    if (updates.sourceLabel !== undefined) {
      sets.push("source_label = ?");
      params.push(updates.sourceLabel);
    }
    if (updates.targetLabel !== undefined) {
      sets.push("target_label = ?");
      params.push(updates.targetLabel);
    }
    if (updates.recordKind !== undefined) {
      sets.push("record_kind = ?");
      params.push(updates.recordKind);
    }
    if (updates.recordStatus !== undefined) {
      sets.push("record_status = ?");
      params.push(updates.recordStatus);
    }
    if (updates.categoryCode !== undefined) {
      sets.push("category_code = ?");
      params.push(updates.categoryCode);
    }
    if (updates.taxCategoryCode !== undefined) {
      sets.push("tax_category_code = ?");
      params.push(updates.taxCategoryCode);
    }
    if (updates.taxLineCode !== undefined) {
      sets.push("tax_line_code = ?");
      params.push(updates.taxLineCode);
    }

    if (sets.length === 0) return existing;

    sets.push("updated_at = ?");
    params.push(now, recordId);

    await this.db.runAsync(
      `UPDATE records SET ${sets.join(", ")} WHERE record_id = ?;`,
      ...params,
    );

    return this.getRecord(recordId);
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const existing = await this.getRecord(recordId);
    if (!existing) return false;

    await this.db.runAsync(
      `DELETE FROM record_evidence_links WHERE record_id = ?;`,
      recordId,
    );
    await this.db.runAsync(
      `DELETE FROM record_entry_classifications WHERE record_id = ?;`,
      recordId,
    );
    await this.db.runAsync(
      `DELETE FROM records WHERE record_id = ?;`,
      recordId,
    );
    return true;
  }

  // ── Counterparty Operations ──

  async listCounterparties(entityId?: string): Promise<CounterpartyRow[]> {
    return this.db.getAllAsync<CounterpartyRow>(
      `SELECT counterparty_id AS counterpartyId, entity_id AS entityId,
              counterparty_type AS counterpartyType, display_name AS displayName,
              raw_reference AS rawReference, notes, created_at AS createdAt
       FROM counterparties WHERE entity_id = ?
       ORDER BY display_name ASC;`,
      this.entityId(entityId),
    );
  }

  async getCounterparty(counterpartyId: string): Promise<CounterpartyRow | null> {
    return this.db.getFirstAsync<CounterpartyRow>(
      `SELECT counterparty_id AS counterpartyId, entity_id AS entityId,
              counterparty_type AS counterpartyType, display_name AS displayName,
              raw_reference AS rawReference, notes, created_at AS createdAt
       FROM counterparties WHERE counterparty_id = ? LIMIT 1;`,
      counterpartyId,
    );
  }

  async createCounterparty(input: CreateCounterpartyInput): Promise<CounterpartyRow> {
    const entityId = this.entityId(input.entityId);
    const counterpartyId = `cp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO counterparties (counterparty_id, entity_id, counterparty_type, display_name, raw_reference, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      counterpartyId,
      entityId,
      input.counterpartyType,
      input.displayName,
      input.rawReference ?? null,
      input.notes ?? null,
      now,
    );

    return (await this.getCounterparty(counterpartyId))!;
  }

  // ── Evidence / Workflow Operations ──

  async listEvidences(filter?: EvidenceFilter): Promise<EvidenceRow[]> {
    const entityId = this.entityId(filter?.entityId);
    const limit = filter?.limit ?? DEFAULT_LIST_LIMIT;
    const offset = filter?.offset ?? 0;
    const clauses = ["entity_id = ?"];
    const params: StorageSqlValue[] = [entityId];

    if (filter?.parseStatus) {
      clauses.push("parse_status = ?");
      params.push(filter.parseStatus);
    }

    const source = appendLimitOffset(
      `SELECT
        evidence_id AS evidenceId,
        entity_id AS entityId,
        evidence_kind AS evidenceKind,
        file_path AS filePath,
        parse_status AS parseStatus,
        extracted_data AS extractedDataJson,
        captured_date AS capturedDate,
        captured_amount_cents AS capturedAmountCents,
        captured_source AS capturedSource,
        captured_target AS capturedTarget,
        captured_description AS capturedDescription,
        source_system AS sourceSystem,
        created_at AS createdAt
      FROM evidences
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC`,
      params,
      limit,
      offset,
    );

    const rows = await this.db.getAllAsync<
      Omit<EvidenceRow, "extractedData"> & { extractedDataJson: string | null }
    >(source, ...params);

    return rows.map((row) => ({
      ...row,
      extractedData: parseOptionalJson(row.extractedDataJson),
    }));
  }

  async getEvidence(evidenceId: string): Promise<EvidenceRow | null> {
    const row = await this.db.getFirstAsync<
      Omit<EvidenceRow, "extractedData"> & { extractedDataJson: string | null }
    >(
      `SELECT
        evidence_id AS evidenceId,
        entity_id AS entityId,
        evidence_kind AS evidenceKind,
        file_path AS filePath,
        parse_status AS parseStatus,
        extracted_data AS extractedDataJson,
        captured_date AS capturedDate,
        captured_amount_cents AS capturedAmountCents,
        captured_source AS capturedSource,
        captured_target AS capturedTarget,
        captured_description AS capturedDescription,
        source_system AS sourceSystem,
        created_at AS createdAt
      FROM evidences
      WHERE evidence_id = ?
      LIMIT 1;`,
      evidenceId,
    );

    if (!row) {
      return null;
    }

    return {
      ...row,
      extractedData: parseOptionalJson(row.extractedDataJson),
    };
  }

  async listEvidenceFiles(evidenceId: string): Promise<EvidenceFileRow[]> {
    const rows = await this.db.getAllAsync<
      Omit<EvidenceFileRow, "isPrimary"> & { isPrimaryInt: number }
    >(
      `SELECT
        evidence_file_id AS evidenceFileId,
        evidence_id AS evidenceId,
        vault_collection AS vaultCollection,
        relative_path AS relativePath,
        original_file_name AS originalFileName,
        mime_type AS mimeType,
        size_bytes AS sizeBytes,
        sha256_hex AS sha256Hex,
        captured_at AS capturedAt,
        is_primary AS isPrimaryInt
      FROM evidence_files
      WHERE evidence_id = ?
      ORDER BY captured_at ASC, evidence_file_id ASC;`,
      evidenceId,
    );

    return rows.map((row) => ({
      ...row,
      isPrimary: row.isPrimaryInt === 1,
    }));
  }

  async listUploadBatches(filter?: UploadBatchFilter): Promise<UploadBatchRow[]> {
    const entityId = this.entityId(filter?.entityId);
    const limit = filter?.limit ?? DEFAULT_LIST_LIMIT;
    const offset = filter?.offset ?? 0;
    const clauses = ["entity_id = ?"];
    const params: StorageSqlValue[] = [entityId];

    appendOptionalInClause(clauses, params, "state", filter?.states);

    const source = appendLimitOffset(
      `SELECT
        batch_id AS batchId,
        evidence_id AS evidenceId,
        entity_id AS entityId,
        source_system AS sourceSystem,
        state,
        duplicate_kind AS duplicateKind,
        duplicate_of_evidence_id AS duplicateOfEvidenceId,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM upload_batches
      WHERE ${clauses.join(" AND ")}
      ORDER BY created_at DESC`,
      params,
      limit,
      offset,
    );

    return this.db.getAllAsync<UploadBatchRow>(source, ...params);
  }

  async getUploadBatch(batchId: string): Promise<UploadBatchRow | null> {
    return this.db.getFirstAsync<UploadBatchRow>(
      `SELECT
        batch_id AS batchId,
        evidence_id AS evidenceId,
        entity_id AS entityId,
        source_system AS sourceSystem,
        state,
        duplicate_kind AS duplicateKind,
        duplicate_of_evidence_id AS duplicateOfEvidenceId,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM upload_batches
      WHERE batch_id = ?
      LIMIT 1;`,
      batchId,
    );
  }

  async listExtractionRuns(filter?: ExtractionRunFilter): Promise<ExtractionRunRow[]> {
    const clauses: string[] = [];
    const params: StorageSqlValue[] = [];

    if (filter?.batchId) {
      clauses.push("batch_id = ?");
      params.push(filter.batchId);
    }

    if (filter?.evidenceId) {
      clauses.push("evidence_id = ?");
      params.push(filter.evidenceId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.getAllAsync<
      Omit<ExtractionRunRow, "parsePayload"> & { parsePayloadJson: string | null }
    >(
      `SELECT
        extraction_run_id AS extractionRunId,
        batch_id AS batchId,
        evidence_id AS evidenceId,
        state,
        parser_kind AS parserKind,
        model,
        parse_payload AS parsePayloadJson,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM extraction_runs
      ${where}
      ORDER BY created_at DESC;`,
      ...params,
    );

    return rows.map((row) => ({
      ...row,
      parsePayload: parseOptionalJson(row.parsePayloadJson),
    }));
  }

  async listPlannerRuns(filter?: PlannerRunFilter): Promise<PlannerRunRow[]> {
    const clauses: string[] = [];
    const params: StorageSqlValue[] = [];

    if (filter?.batchId) {
      clauses.push("batch_id = ?");
      params.push(filter.batchId);
    }

    if (filter?.evidenceId) {
      clauses.push("evidence_id = ?");
      params.push(filter.evidenceId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.getAllAsync<
      Omit<PlannerRunRow, "plannerPayload" | "summary"> & {
        plannerPayloadJson: string | null;
        summaryJson: string | null;
      }
    >(
      `SELECT
        planner_run_id AS plannerRunId,
        batch_id AS batchId,
        evidence_id AS evidenceId,
        extraction_run_id AS extractionRunId,
        state,
        planner_payload_json AS plannerPayloadJson,
        summary_json AS summaryJson,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM planner_runs
      ${where}
      ORDER BY created_at DESC;`,
      ...params,
    );

    return rows.map((row) => ({
      ...row,
      plannerPayload: parseOptionalJson(row.plannerPayloadJson),
      summary: parseOptionalJson(row.summaryJson),
    }));
  }

  async listPlannerReadTasks(plannerRunId: string): Promise<PlannerReadTaskRow[]> {
    const rows = await this.db.getAllAsync<
      Omit<PlannerReadTaskRow, "input" | "result"> & {
        inputJson: string | null;
        resultJson: string | null;
      }
    >(
      `SELECT
        read_task_id AS readTaskId,
        planner_run_id AS plannerRunId,
        task_type AS taskType,
        status,
        input_json AS inputJson,
        result_json AS resultJson,
        rationale,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM planner_read_tasks
      WHERE planner_run_id = ?
      ORDER BY created_at ASC;`,
      plannerRunId,
    );

    return rows.map((row) => ({
      ...row,
      input: parseOptionalJson(row.inputJson) ?? undefined,
      result: parseOptionalJson(row.resultJson) ?? undefined,
    }));
  }

  async listCandidateRecords(
    filter?: CandidateRecordFilter,
  ): Promise<WorkflowCandidateRecordRow[]> {
    const clauses: string[] = [];
    const params: StorageSqlValue[] = [];

    if (filter?.batchId) {
      clauses.push("batch_id = ?");
      params.push(filter.batchId);
    }

    if (filter?.evidenceId) {
      clauses.push("evidence_id = ?");
      params.push(filter.evidenceId);
    }

    if (filter?.plannerRunId) {
      clauses.push("planner_run_id = ?");
      params.push(filter.plannerRunId);
    }

    appendOptionalInClause(clauses, params, "state", filter?.states);

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.getAllAsync<
      Omit<WorkflowCandidateRecordRow, "payload" | "review"> & {
        payloadJson: string;
        reviewJson: string | null;
      }
    >(
      `SELECT
        candidate_id AS candidateId,
        batch_id AS batchId,
        planner_run_id AS plannerRunId,
        evidence_id AS evidenceId,
        state,
        payload_json AS payloadJson,
        review_json AS reviewJson,
        record_id AS recordId,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM candidate_records
      ${where}
      ORDER BY created_at ASC;`,
      ...params,
    );

    return rows.map((row) => ({
      ...row,
      payload: JSON.parse(row.payloadJson) as WorkflowCandidateRecordRow["payload"],
      review: parseOptionalJson(row.reviewJson),
    }));
  }

  async listWorkflowWriteProposals(
    filter?: WorkflowWriteProposalFilter,
  ): Promise<WorkflowWriteProposalRow[]> {
    const clauses: string[] = [];
    const params: StorageSqlValue[] = [];

    if (filter?.plannerRunId) {
      clauses.push("planner_run_id = ?");
      params.push(filter.plannerRunId);
    }

    if (filter?.candidateId) {
      clauses.push("candidate_id = ?");
      params.push(filter.candidateId);
    }

    if (filter?.proposalType) {
      clauses.push("proposal_type = ?");
      params.push(filter.proposalType);
    }

    appendOptionalInClause(clauses, params, "state", filter?.states);

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.db.getAllAsync<
      Omit<WorkflowWriteProposalRow, "approvalRequired" | "dependencyIds" | "payload"> & {
        approvalRequiredInt: number;
        dependencyIdsJson: string | null;
        payloadJson: string;
      }
    >(
      `SELECT
        write_proposal_id AS writeProposalId,
        planner_run_id AS plannerRunId,
        candidate_id AS candidateId,
        proposal_type AS proposalType,
        state,
        approval_required AS approvalRequiredInt,
        dependency_ids AS dependencyIdsJson,
        payload_json AS payloadJson,
        rationale,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM workflow_write_proposals
      ${where}
      ORDER BY created_at ASC;`,
      ...params,
    );

    return rows.map((row) => ({
      ...row,
      approvalRequired: row.approvalRequiredInt === 1,
      dependencyIds: parseOptionalJson<string[]>(row.dependencyIdsJson) ?? [],
      payload: JSON.parse(row.payloadJson) as WorkflowWriteProposalRow["payload"],
    }));
  }

  async listCounterpartyCreateProposals(
    plannerRunId: string,
  ): Promise<WorkflowWriteProposalRow[]> {
    return this.listWorkflowWriteProposals({
      plannerRunId,
      proposalType: "create_counterparty",
    });
  }

  async listCounterpartyMergeProposals(
    plannerRunId: string,
  ): Promise<WorkflowWriteProposalRow[]> {
    return this.listWorkflowWriteProposals({
      plannerRunId,
      proposalType: "merge_counterparty",
    });
  }

  async listWorkflowAuditEvents(
    filter?: WorkflowAuditEventFilter,
  ): Promise<WorkflowAuditEventRow[]> {
    const clauses: string[] = [];
    const params: StorageSqlValue[] = [];

    if (filter?.batchId) {
      clauses.push("batch_id = ?");
      params.push(filter.batchId);
    }

    if (filter?.plannerRunId) {
      clauses.push("planner_run_id = ?");
      params.push(filter.plannerRunId);
    }

    if (filter?.candidateId) {
      clauses.push("candidate_id = ?");
      params.push(filter.candidateId);
    }

    if (filter?.writeProposalId) {
      clauses.push("write_proposal_id = ?");
      params.push(filter.writeProposalId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const source = appendLimitOffset(
      `SELECT
        event_id AS eventId,
        batch_id AS batchId,
        planner_run_id AS plannerRunId,
        candidate_id AS candidateId,
        write_proposal_id AS writeProposalId,
        event_type AS eventType,
        message,
        payload_json AS payloadJson,
        created_at AS createdAt
      FROM workflow_audit_events
      ${where}
      ORDER BY created_at ASC`,
      params,
      filter?.limit ?? DEFAULT_AUDIT_LIMIT,
      filter?.offset,
    );

    const rows = await this.db.getAllAsync<
      Omit<WorkflowAuditEventRow, "payload"> & { payloadJson: string | null }
    >(source, ...params);

    return rows.map((row) => ({
      ...row,
      payload: parseOptionalJson(row.payloadJson),
    }));
  }

  // ── Metrics ──

  async getMonthlyMetrics(month?: string, entityId?: string): Promise<MonthlyMetrics> {
    const eid = this.entityId(entityId);
    const now = month ?? new Date().toISOString().slice(0, 7);
    const startOn = `${now}-01`;
    const year = parseInt(now.slice(0, 4), 10);
    const mon = parseInt(now.slice(5, 7), 10);
    const endOn =
      mon === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(mon + 1).padStart(2, "0")}-01`;

    const row = await this.db.getFirstAsync<{
      incomeCents: number | null;
      outflowCents: number | null;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN record_kind IN ('income', 'non_business_income') THEN amount_cents ELSE 0 END), 0) AS incomeCents,
        COALESCE(SUM(CASE WHEN record_kind IN ('expense', 'personal_spending') THEN amount_cents ELSE 0 END), 0) AS outflowCents
       FROM records
       WHERE entity_id = ? AND occurred_on >= ? AND occurred_on < ?
         AND record_kind IN ('income', 'non_business_income', 'expense', 'personal_spending');`,
      eid,
      startOn,
      endOn,
    );

    const incomeCents = row?.incomeCents ?? 0;
    const outflowCents = row?.outflowCents ?? 0;
    return { incomeCents, outflowCents, netCents: incomeCents - outflowCents };
  }

  async getDailyTrend(
    startDate: string,
    endDate: string,
    entityId?: string,
  ): Promise<TrendPoint[]> {
    const eid = this.entityId(entityId);

    const rows = await this.db.getAllAsync<{
      occurredOn: string;
      incomeCents: number;
      expenseCents: number;
    }>(
      `SELECT occurred_on AS occurredOn,
        COALESCE(SUM(CASE WHEN record_kind IN ('income', 'non_business_income') THEN amount_cents ELSE 0 END), 0) AS incomeCents,
        COALESCE(SUM(CASE WHEN record_kind IN ('expense', 'personal_spending') THEN amount_cents ELSE 0 END), 0) AS expenseCents
       FROM records
       WHERE entity_id = ? AND occurred_on >= ? AND occurred_on <= ?
         AND record_kind IN ('income', 'non_business_income', 'expense', 'personal_spending')
       GROUP BY occurred_on
       ORDER BY occurred_on ASC;`,
      eid,
      startDate,
      endDate,
    );

    return rows.map((row) => ({
      date: row.occurredOn,
      incomeCents: row.incomeCents,
      expenseCents: row.expenseCents,
      netCents: row.incomeCents - row.expenseCents,
    }));
  }

  async getRecordCount(entityId?: string): Promise<number> {
    const eid = this.entityId(entityId);
    const row = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM records WHERE entity_id = ?;`,
      eid,
    );
    return row?.count ?? 0;
  }

  // ── Context Snapshot (for AI) ──

  async getContextSnapshot(entityId?: string): Promise<ContextSnapshot> {
    const eid = this.entityId(entityId);

    const entity = await this.getEntity(eid);
    const totalRecords = await this.getRecordCount(eid);
    const monthlyMetrics = await this.getMonthlyMetrics(undefined, eid);
    const recentRecords = await this.listRecords({ entityId: eid, limit: 10 });

    const cpRow = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM counterparties WHERE entity_id = ?;`,
      eid,
    );

    return {
      entityName: entity?.legalName ?? "Unknown",
      entityId: eid,
      totalRecords,
      monthlyMetrics,
      recentRecords,
      counterpartyCount: cpRow?.count ?? 0,
    };
  }

  // ── Financial Reports ──

  async getProfitAndLoss(
    startDate: string,
    endDate: string,
    entityId?: string,
  ): Promise<ProfitAndLossSummary> {
    return loadProfitAndLossSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  async getBalanceSheet(
    startDate: string,
    endDate: string,
    entityId?: string,
  ): Promise<BalanceSheetSummary> {
    return loadBalanceSheetSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  async getGeneralLedger(
    startDate: string,
    endDate: string,
    entityId?: string,
  ): Promise<GeneralLedgerSummary> {
    return loadGeneralLedgerSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  // ── Tax ──

  getTaxYearDateRange(taxYear: number): TaxYearDateRange {
    return buildTaxYearDateRange(taxYear);
  }

  async getTaxSummary(taxYear: number, entityId?: string): Promise<TaxHelperSnapshot> {
    return loadTaxHelperSnapshot(this.db, { entityId: this.entityId(entityId), taxYear });
  }

  async getScheduleCCandidateRecords(
    taxYear: number,
    entityId?: string,
  ): Promise<ScheduleCCandidateRecord[]> {
    return loadScheduleCCandidateRecords(this.db, {
      entityId: this.entityId(entityId),
      taxYear,
    });
  }

  async getScheduleCAggregation(
    taxYear: number,
    entityId?: string,
  ): Promise<ScheduleCAggregationResult> {
    return loadScheduleCAggregation(this.db, {
      entityId: this.entityId(entityId),
      taxYear,
    });
  }

  async getScheduleSEPreview(
    taxYear: number,
    entityId?: string,
  ): Promise<SupportedScheduleCNetProfitPreview> {
    return loadScheduleSEPreview(this.db, {
      entityId: this.entityId(entityId),
      taxYear,
    });
  }

  async getTaxHelperEvidenceFileLinks(
    taxYear: number,
    recordIds: readonly string[],
  ): Promise<TaxHelperEvidenceFileLink[]> {
    return loadTaxHelperEvidenceFileLinks(this.db, { recordIds, taxYear });
  }
}
