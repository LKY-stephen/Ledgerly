import type {
  WritableStorageDatabase,
  StorageSqlValue,
} from "@ledgerly/storage";
import {
  resolveStandardReceiptEntry,
  persistResolvedStandardReceiptEntry,
  loadProfitAndLossSummary,
  loadBalanceSheetSummary,
  loadGeneralLedgerSummary,
  loadTaxHelperSnapshot,
  type StandardReceiptUserClassification,
  type ProfitAndLossSummary,
  type BalanceSheetSummary,
  type GeneralLedgerSummary,
  type TaxHelperSnapshot,
} from "@ledgerly/storage";
import type {
  LedgerlySdkConfig,
  RecordRow,
  CounterpartyRow,
  EntityRow,
  MonthlyMetrics,
  TrendPoint,
  ListRecordsFilter,
  CreateRecordInput,
  UpdateRecordInput,
  CreateCounterpartyInput,
  ContextSnapshot,
} from "./types";

const DEFAULT_ENTITY_ID = "entity-main";
const DEFAULT_CURRENCY = "USD";

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
    const limit = filter?.limit ?? 50;
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
      `SELECT record_id AS recordId, entity_id AS entityId, record_status AS recordStatus,
              source_system AS sourceSystem, description, memo, occurred_on AS occurredOn,
              currency, amount_cents AS amountCents, source_label AS sourceLabel,
              target_label AS targetLabel, source_counterparty_id AS sourceCounterpartyId,
              target_counterparty_id AS targetCounterpartyId, record_kind AS recordKind,
              category_code AS categoryCode, subcategory_code AS subcategoryCode,
              tax_category_code AS taxCategoryCode, tax_line_code AS taxLineCode,
              business_use_bps AS businessUseBps, created_at AS createdAt, updated_at AS updatedAt
       FROM records AS r
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.occurred_on DESC, r.created_at DESC
       LIMIT ? OFFSET ?;`,
      ...params,
    );
  }

  async getRecord(recordId: string): Promise<RecordRow | null> {
    return this.db.getFirstAsync<RecordRow>(
      `SELECT record_id AS recordId, entity_id AS entityId, record_status AS recordStatus,
              source_system AS sourceSystem, description, memo, occurred_on AS occurredOn,
              currency, amount_cents AS amountCents, source_label AS sourceLabel,
              target_label AS targetLabel, source_counterparty_id AS sourceCounterpartyId,
              target_counterparty_id AS targetCounterpartyId, record_kind AS recordKind,
              category_code AS categoryCode, subcategory_code AS subcategoryCode,
              tax_category_code AS taxCategoryCode, tax_line_code AS taxLineCode,
              business_use_bps AS businessUseBps, created_at AS createdAt, updated_at AS updatedAt
       FROM records WHERE record_id = ? LIMIT 1;`,
      recordId,
    );
  }

  async createRecord(input: CreateRecordInput): Promise<RecordRow> {
    const entityId = this.entityId(input.entityId);
    const now = new Date().toISOString();
    const recordId = `rec-${crypto.randomUUID()}`;

    const classification: StandardReceiptUserClassification = input.recordKind;

    const resolved = resolveStandardReceiptEntry(
      {
        amountCents: input.amountCents,
        currency: input.currency ?? this.defaultCurrency,
        description: input.description,
        entityId,
        memo: input.memo,
        occurredOn: input.occurredOn,
        source: input.source,
        target: input.target,
        userClassification: classification,
      },
      {
        createdAt: now,
        recordId,
        sourceSystem: "agent",
        updatedAt: now,
      },
    );

    await persistResolvedStandardReceiptEntry(this.db, resolved);

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
    params.push(now);
    params.push(recordId);

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

    return rows.map((r) => ({
      date: r.occurredOn,
      incomeCents: r.incomeCents,
      expenseCents: r.expenseCents,
      netCents: r.incomeCents - r.expenseCents,
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

  async getProfitAndLoss(startDate: string, endDate: string, entityId?: string): Promise<ProfitAndLossSummary> {
    return loadProfitAndLossSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  async getBalanceSheet(startDate: string, endDate: string, entityId?: string): Promise<BalanceSheetSummary> {
    return loadBalanceSheetSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  async getGeneralLedger(startDate: string, endDate: string, entityId?: string): Promise<GeneralLedgerSummary> {
    return loadGeneralLedgerSummary(this.db, this.entityId(entityId), { startDate, endDate });
  }

  // ── Tax ──

  async getTaxSummary(taxYear: number, entityId?: string): Promise<TaxHelperSnapshot> {
    return loadTaxHelperSnapshot(this.db, { entityId: this.entityId(entityId), taxYear });
  }
}
