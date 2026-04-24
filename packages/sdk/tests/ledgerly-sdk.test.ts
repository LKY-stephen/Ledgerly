import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWritableStorageDatabase,
  structuredStoreContract,
  type StorageSqlValue,
} from "@ledgerly/storage";
import { LedgerlySDK } from "../src/index";

function createSdkTestDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");

  for (const pragma of structuredStoreContract.pragmas) {
    database.exec(pragma);
  }

  for (const statement of structuredStoreContract.schemaStatements) {
    database.exec(statement);
  }

  for (const statement of structuredStoreContract.maintenanceStatements) {
    database.exec(statement);
  }

  return database;
}

function createWritableDatabase(database: DatabaseSync) {
  return createWritableStorageDatabase({
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).all({}, ...params) as Row[];
    },
    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return (database.prepare(source).get({}, ...params) as Row | undefined) ?? null;
    },
    async runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.prepare(source).run({}, ...params);
    },
  });
}

function createSdk(database: DatabaseSync) {
  return new LedgerlySDK(createWritableDatabase(database), {
    defaultCurrency: "USD",
    defaultEntityId: "entity-main",
  });
}

function buildEvidenceFields(
  input: Partial<{
    amountCents: number;
    date: string;
    description: string;
    notes: string;
    source: string;
    target: string;
  }> = {},
) {
  return {
    amountCents: input.amountCents ?? null,
    category: null,
    date: input.date ?? null,
    description: input.description ?? null,
    notes: input.notes ?? null,
    source: input.source ?? null,
    target: input.target ?? null,
    taxCategory: null,
  };
}

function buildReceiptParsePayload(input: {
  amountCents: number;
  date: string;
  description: string;
  source: string;
  target: string;
}) {
  const fields = buildEvidenceFields(input);
  return {
    candidates: fields,
    fields,
    model: "gpt-4o",
    parser: "openai_gpt" as const,
    rawSummary: input.description,
    rawText: input.description,
    records: [{ candidates: fields, fields }],
    warnings: [],
  };
}

function seedSdkFixture(database: DatabaseSync): void {
  const insertEntity = database.prepare(
    `INSERT INTO entities (
      entity_id,
      legal_name,
      entity_type,
      base_currency,
      default_timezone,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
  );
  insertEntity.run(
    "entity-main",
    "SDK Demo Books",
    "sole_proprietorship",
    "USD",
    "America/Los_Angeles",
    "2026-01-01T08:00:00.000Z",
  );
  insertEntity.run(
    "entity-other",
    "Other SDK Demo Books",
    "sole_proprietorship",
    "USD",
    "America/New_York",
    "2026-01-02T08:00:00.000Z",
  );

  database
    .prepare(
      `INSERT INTO tax_year_profiles (
        entity_id,
        tax_year,
        accounting_method,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?);`,
    )
    .run(
      "entity-main",
      2026,
      "cash",
      "2026-01-01T08:00:00.000Z",
      "2026-01-01T08:00:00.000Z",
    );

  const insertCounterparty = database.prepare(
    `INSERT INTO counterparties (
      counterparty_id,
      entity_id,
      counterparty_type,
      display_name,
      raw_reference,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
  );
  insertCounterparty.run(
    "cp-sponsor",
    "entity-main",
    "client",
    "Sponsor Inc",
    "Sponsor",
    "Main sponsor",
    "2026-01-05T08:00:00.000Z",
  );
  insertCounterparty.run(
    "cp-adobe",
    "entity-main",
    "vendor",
    "Adobe",
    "Adobe",
    "Software vendor",
    "2026-01-06T08:00:00.000Z",
  );

  const insertRecord = database.prepare(
    `INSERT INTO records (
      record_id,
      entity_id,
      record_status,
      source_system,
      description,
      memo,
      occurred_on,
      currency,
      amount_cents,
      source_label,
      target_label,
      source_counterparty_id,
      target_counterparty_id,
      record_kind,
      category_code,
      subcategory_code,
      tax_category_code,
      tax_line_code,
      business_use_bps,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );

  insertRecord.run(
    "income-jan",
    "entity-main",
    "posted",
    "sdk-test",
    "January sponsorship",
    null,
    "2026-01-15",
    "USD",
    250_000,
    "Sponsor Inc",
    "Business checking",
    "cp-sponsor",
    null,
    "income",
    null,
    null,
    null,
    "line1",
    10_000,
    "2026-01-15T08:00:00.000Z",
    "2026-01-15T08:01:00.000Z",
  );
  insertRecord.run(
    "income-feb",
    "entity-main",
    "posted",
    "sdk-test",
    "February memberships",
    null,
    "2026-02-10",
    "USD",
    150_000,
    "Patreon",
    "Business checking",
    null,
    null,
    "income",
    null,
    null,
    null,
    "line1",
    10_000,
    "2026-02-10T08:00:00.000Z",
    "2026-02-10T08:01:00.000Z",
  );
  insertRecord.run(
    "expense-feb",
    "entity-main",
    "reconciled",
    "sdk-test",
    "Creative Cloud",
    "annual plan",
    "2026-02-20",
    "USD",
    50_000,
    "Business checking",
    "Adobe",
    null,
    "cp-adobe",
    "expense",
    null,
    null,
    "schedule-c-other-expense",
    "line18",
    10_000,
    "2026-02-20T08:00:00.000Z",
    "2026-02-20T08:01:00.000Z",
  );
  insertRecord.run(
    "expense-mar",
    "entity-main",
    "posted",
    "sdk-test",
    "Studio props",
    null,
    "2026-03-05",
    "USD",
    12_500,
    "Business checking",
    "Prop Store",
    null,
    null,
    "expense",
    null,
    null,
    "schedule-c-other-expense",
    "line27a",
    10_000,
    "2026-03-05T08:00:00.000Z",
    "2026-03-05T08:01:00.000Z",
  );
  insertRecord.run(
    "personal-mar",
    "entity-main",
    "posted",
    "sdk-test",
    "Coffee stop",
    null,
    "2026-03-09",
    "USD",
    3_400,
    "Personal checking",
    "Cafe",
    null,
    null,
    "personal_spending",
    null,
    null,
    null,
    null,
    10_000,
    "2026-03-09T08:00:00.000Z",
    "2026-03-09T08:01:00.000Z",
  );
  insertRecord.run(
    "income-other-entity",
    "entity-other",
    "posted",
    "sdk-test",
    "Other entity income",
    null,
    "2026-02-01",
    "USD",
    999_999,
    "Other",
    "Business checking",
    null,
    null,
    "income",
    null,
    null,
    null,
    "line1",
    10_000,
    "2026-02-01T08:00:00.000Z",
    "2026-02-01T08:01:00.000Z",
  );

  const evidenceIncomePayload = buildReceiptParsePayload({
    amountCents: 250_000,
    date: "2026-01-15",
    description: "January sponsorship",
    source: "Sponsor Inc",
    target: "Business checking",
  });
  const evidenceExpensePayload = buildReceiptParsePayload({
    amountCents: 50_000,
    date: "2026-02-20",
    description: "Creative Cloud",
    source: "Business checking",
    target: "Adobe",
  });

  const insertEvidence = database.prepare(
    `INSERT INTO evidences (
      evidence_id,
      entity_id,
      evidence_kind,
      file_path,
      parse_status,
      extracted_data,
      captured_date,
      captured_amount_cents,
      captured_source,
      captured_target,
      captured_description,
      source_system,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertEvidence.run(
    "evidence-income",
    "entity-main",
    "receipt",
    "ledgerly-vault/evidence-objects/entity-main/uploads/2026/01/income.pdf",
    "parsed",
    JSON.stringify(evidenceIncomePayload),
    "2026-01-15",
    250_000,
    "Sponsor Inc",
    "Business checking",
    "January sponsorship",
    "sdk-test",
    "2026-01-15T08:00:00.000Z",
  );
  insertEvidence.run(
    "evidence-expense",
    "entity-main",
    "receipt",
    "ledgerly-vault/evidence-objects/entity-main/uploads/2026/02/expense.pdf",
    "parsed",
    JSON.stringify(evidenceExpensePayload),
    "2026-02-20",
    50_000,
    "Business checking",
    "Adobe",
    "Creative Cloud",
    "sdk-test",
    "2026-02-20T08:00:00.000Z",
  );

  const insertEvidenceFile = database.prepare(
    `INSERT INTO evidence_files (
      evidence_file_id,
      evidence_id,
      vault_collection,
      relative_path,
      original_file_name,
      mime_type,
      size_bytes,
      sha256_hex,
      captured_at,
      is_primary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertEvidenceFile.run(
    "file-income",
    "evidence-income",
    "evidence-objects",
    "evidence-objects/entity-main/uploads/2026/01/income.pdf",
    "income.pdf",
    "application/pdf",
    1234,
    "abc123income",
    "2026-01-15T08:00:00.000Z",
    1,
  );
  insertEvidenceFile.run(
    "file-expense",
    "evidence-expense",
    "evidence-objects",
    "evidence-objects/entity-main/uploads/2026/02/expense.pdf",
    "expense.pdf",
    "application/pdf",
    2345,
    "abc123expense",
    "2026-02-20T08:00:00.000Z",
    1,
  );

  const insertBatch = database.prepare(
    `INSERT INTO upload_batches (
      batch_id,
      evidence_id,
      entity_id,
      source_system,
      state,
      duplicate_kind,
      duplicate_of_evidence_id,
      error_message,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertBatch.run(
    "batch-income",
    "evidence-income",
    "entity-main",
    "sdk-test",
    "approved",
    null,
    null,
    null,
    "2026-01-15T09:00:00.000Z",
    "2026-01-15T09:01:00.000Z",
  );
  insertBatch.run(
    "batch-expense",
    "evidence-expense",
    "entity-main",
    "sdk-test",
    "review_required",
    null,
    null,
    null,
    "2026-02-20T09:00:00.000Z",
    "2026-02-20T09:01:00.000Z",
  );

  const expensePlannerPayload = {
    businessEvents: ["expense_detected"],
    candidateRecords: [
      {
        amountCents: 50_000,
        currency: "USD",
        date: "2026-02-20",
        description: "Creative Cloud",
        evidenceId: "evidence-expense",
        recordKind: "expense",
        sourceLabel: "Business checking",
        targetLabel: "Adobe",
        taxCategoryCode: "schedule-c-other-expense",
      },
    ],
    classifiedFacts: [],
    counterpartyResolutions: [
      {
        confidence: "high",
        displayName: "Adobe",
        matchedDisplayNames: ["Adobe"],
        matchedCounterpartyIds: ["cp-adobe"],
        role: "target",
        status: "matched",
      },
    ],
    duplicateHints: [],
    readTasks: [
      {
        input: { target: "Adobe" },
        rationale: "Look up vendor",
        readTaskId: "task-expense",
        result: { matchedCounterpartyIds: ["cp-adobe"] },
        status: "completed",
        taskType: "counterparty_lookup",
      },
    ],
    summary: "Expense needs review",
    warnings: [],
    writeProposals: [
      {
        proposalType: "create_counterparty",
        role: "target",
        values: { displayName: "Adobe" },
      },
      {
        proposalType: "merge_counterparty",
        values: { conflictCounterpartyId: "cp-adobe" },
      },
    ],
  };

  const insertExtractionRun = database.prepare(
    `INSERT INTO extraction_runs (
      extraction_run_id,
      batch_id,
      evidence_id,
      state,
      parser_kind,
      model,
      parse_payload,
      error_message,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertExtractionRun.run(
    "extract-income",
    "batch-income",
    "evidence-income",
    "complete",
    "openai_gpt",
    "gpt-4o",
    JSON.stringify(evidenceIncomePayload),
    null,
    "2026-01-15T09:05:00.000Z",
    "2026-01-15T09:06:00.000Z",
  );
  insertExtractionRun.run(
    "extract-expense",
    "batch-expense",
    "evidence-expense",
    "complete",
    "openai_gpt",
    "gpt-4o",
    JSON.stringify(evidenceExpensePayload),
    null,
    "2026-02-20T09:05:00.000Z",
    "2026-02-20T09:06:00.000Z",
  );

  const insertPlannerRun = database.prepare(
    `INSERT INTO planner_runs (
      planner_run_id,
      batch_id,
      evidence_id,
      extraction_run_id,
      state,
      planner_payload_json,
      summary_json,
      error_message,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertPlannerRun.run(
    "planner-expense",
    "batch-expense",
    "evidence-expense",
    "extract-expense",
    "complete",
    JSON.stringify(expensePlannerPayload),
    JSON.stringify(expensePlannerPayload),
    null,
    "2026-02-20T09:10:00.000Z",
    "2026-02-20T09:11:00.000Z",
  );

  database
    .prepare(
      `INSERT INTO planner_read_tasks (
        read_task_id,
        planner_run_id,
        task_type,
        status,
        input_json,
        result_json,
        rationale,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    )
    .run(
      "task-expense",
      "planner-expense",
      "counterparty_lookup",
      "completed",
      JSON.stringify({ target: "Adobe" }),
      JSON.stringify({ matchedCounterpartyIds: ["cp-adobe"] }),
      "Look up vendor",
      "2026-02-20T09:12:00.000Z",
      "2026-02-20T09:13:00.000Z",
    );

  database
    .prepare(
      `INSERT INTO candidate_records (
        candidate_id,
        batch_id,
        planner_run_id,
        evidence_id,
        state,
        payload_json,
        review_json,
        record_id,
        error_message,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    )
    .run(
      "candidate-expense",
      "batch-expense",
      "planner-expense",
      "evidence-expense",
      "needs_review",
      JSON.stringify(expensePlannerPayload.candidateRecords[0]),
      JSON.stringify({ notes: "Needs confirmation" }),
      null,
      null,
      "2026-02-20T09:14:00.000Z",
      "2026-02-20T09:15:00.000Z",
    );

  const insertProposal = database.prepare(
    `INSERT INTO workflow_write_proposals (
      write_proposal_id,
      planner_run_id,
      candidate_id,
      proposal_type,
      state,
      approval_required,
      dependency_ids,
      payload_json,
      rationale,
      error_message,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  );
  insertProposal.run(
    "proposal-create-counterparty",
    "planner-expense",
    "candidate-expense",
    "create_counterparty",
    "pending_approval",
    1,
    null,
    JSON.stringify({ role: "target", displayName: "Adobe" }),
    "Need a vendor entry",
    null,
    "2026-02-20T09:16:00.000Z",
    "2026-02-20T09:17:00.000Z",
  );
  insertProposal.run(
    "proposal-merge-counterparty",
    "planner-expense",
    "candidate-expense",
    "merge_counterparty",
    "blocked",
    1,
    JSON.stringify(["proposal-create-counterparty"]),
    JSON.stringify({ role: "target", conflictCounterpartyId: "cp-adobe" }),
    "Potential duplicate vendor",
    null,
    "2026-02-20T09:18:00.000Z",
    "2026-02-20T09:19:00.000Z",
  );

  database
    .prepare(
      `INSERT INTO workflow_audit_events (
        event_id,
        batch_id,
        planner_run_id,
        candidate_id,
        write_proposal_id,
        event_type,
        message,
        payload_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    )
    .run(
      "audit-expense",
      "batch-expense",
      "planner-expense",
      "candidate-expense",
      "proposal-create-counterparty",
      "proposal_created",
      "Created counterparty proposal",
      JSON.stringify({ proposalType: "create_counterparty" }),
      "2026-02-20T09:20:00.000Z",
    );

  const insertRecordEvidenceLink = database.prepare(
    `INSERT INTO record_evidence_links (
      record_id,
      evidence_id,
      link_role,
      is_primary,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?);`,
  );
  insertRecordEvidenceLink.run(
    "income-jan",
    "evidence-income",
    "supporting_document",
    1,
    null,
    "2026-01-15T09:25:00.000Z",
  );
  insertRecordEvidenceLink.run(
    "expense-feb",
    "evidence-expense",
    "supporting_document",
    1,
    null,
    "2026-02-20T09:25:00.000Z",
  );
}

describe("LedgerlySDK", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes storage overview, bootstrap metadata, and vault helper paths", () => {
    const sdk = createSdk(createSdkTestDatabase());

    expect(sdk.getStorageOverview().tableCount).toBe(structuredStoreContract.tables.length);
    expect(sdk.getStorageBootstrapManifest().databaseName).toBe("ledgerly-local.db");
    expect(sdk.getStorageBootstrapPlan().databaseName).toBe("ledgerly-local.db");
    expect(sdk.getVaultCollectionSamplePath("evidence-objects")).toContain("evidence-objects");
    expect(sdk.buildEvidenceObjectPath("ABCD1234", "pdf")).toBe(
      "evidence-objects/ab/cd/abcd1234.pdf",
    );
    expect(sdk.buildEvidenceManifestPath("sample-evidence")).toBe(
      "evidence-manifests/sample-evidence.json",
    );
  });

  it("lists entities and ensures the default entity when missing", async () => {
    const populatedDatabase = createSdkTestDatabase();
    seedSdkFixture(populatedDatabase);
    const populatedSdk = createSdk(populatedDatabase);

    await expect(populatedSdk.listEntities()).resolves.toHaveLength(2);
    await expect(populatedSdk.getEntity()).resolves.toMatchObject({
      entityId: "entity-main",
      legalName: "SDK Demo Books",
    });

    const emptyDatabase = createSdkTestDatabase();
    const emptySdk = createSdk(emptyDatabase);

    await emptySdk.ensureDefaultEntity();

    await expect(emptySdk.getEntity()).resolves.toMatchObject({
      entityId: "entity-main",
      legalName: "Sole Proprietor",
    });
  });

  it("lists, searches, and fetches records through the public SDK", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);

    const records = await sdk.listRecords({ recordKinds: ["income", "expense"], limit: 10 });
    const rangedRecords = await sdk.searchRecordsByDateRange({
      endOn: "2026-02-28",
      recordKinds: ["income"],
      startOn: "2026-01-01",
    });
    const firstRecord = await sdk.searchFirstRecordByDateRange({
      endOn: "2026-03-31",
      recordKinds: ["income", "expense"],
      startOn: "2026-01-01",
    });

    expect(records.some((record) => record.recordId === "expense-feb")).toBe(true);
    expect(rangedRecords.map((record) => record.recordId)).toEqual(["income-feb", "income-jan"]);
    expect(firstRecord?.recordId).toBe("expense-mar");
    await expect(sdk.getRecord("income-jan")).resolves.toMatchObject({
      description: "January sponsorship",
    });
  });

  it("resolves, persists, creates, updates, and deletes records", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);
    const randomUUID = vi.fn().mockReturnValue("created-record");

    vi.stubGlobal("crypto", { randomUUID });

    const resolved = sdk.resolveRecordClassification(
      {
        amountCents: 22_000,
        currency: "USD",
        description: "Business dinner",
        entityId: "entity-main",
        occurredOn: "2026-04-12",
        source: "Business checking",
        target: "Restaurant",
        userClassification: "expense",
      },
      {
        createdAt: "2026-04-12T10:00:00.000Z",
        recordId: "rec-resolved-record",
        sourceSystem: "sdk-test",
        updatedAt: "2026-04-12T10:00:00.000Z",
      },
    );

    expect(resolved.record.taxLineCode).toBe("line27a");

    const persisted = await sdk.persistResolvedRecordClassification(resolved);
    expect(persisted?.recordId).toBe("rec-resolved-record");

    const created = await sdk.createRecord({
      amountCents: 9_900,
      description: "Notebook supplies",
      occurredOn: "2026-04-15",
      recordKind: "expense",
      source: "Business checking",
      target: "Stationery store",
    });
    expect(created.recordId).toBe("rec-created-record");

    const updated = await sdk.updateRecord(created.recordId, {
      description: "Office supplies",
      taxLineCode: "line22",
    });
    expect(updated).toMatchObject({
      description: "Office supplies",
      taxLineCode: "line22",
    });

    await expect(sdk.deleteRecord(created.recordId)).resolves.toBe(true);
    await expect(sdk.getRecord(created.recordId)).resolves.toBeNull();
  });

  it("lists, fetches, and creates counterparties", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);
    const randomUUID = vi.fn().mockReturnValue("new-counterparty");

    vi.stubGlobal("crypto", { randomUUID });

    await expect(sdk.listCounterparties()).resolves.toHaveLength(2);
    await expect(sdk.getCounterparty("cp-adobe")).resolves.toMatchObject({
      displayName: "Adobe",
    });

    const created = await sdk.createCounterparty({
      counterpartyType: "vendor",
      displayName: "Prop Store",
      notes: "New vendor",
    });

    expect(created.counterpartyId).toBe("cp-new-counterparty");
    expect(await sdk.listCounterparties()).toHaveLength(3);
  });

  it("lists evidence rows, files, batches, and workflow rows", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);

    const evidences = await sdk.listEvidences({ parseStatus: "parsed", limit: 10 });
    const evidence = await sdk.getEvidence("evidence-expense");
    const evidenceFiles = await sdk.listEvidenceFiles("evidence-expense");
    const batches = await sdk.listUploadBatches({ limit: 10, states: ["review_required"] });
    const batch = await sdk.getUploadBatch("batch-expense");
    const extractionRuns = await sdk.listExtractionRuns({ evidenceId: "evidence-expense" });
    const plannerRuns = await sdk.listPlannerRuns({ evidenceId: "evidence-expense" });
    const plannerReadTasks = await sdk.listPlannerReadTasks("planner-expense");
    const candidateRecords = await sdk.listCandidateRecords({ plannerRunId: "planner-expense" });
    const writeProposals = await sdk.listWorkflowWriteProposals({
      plannerRunId: "planner-expense",
    });
    const createProposals = await sdk.listCounterpartyCreateProposals("planner-expense");
    const mergeProposals = await sdk.listCounterpartyMergeProposals("planner-expense");
    const auditEvents = await sdk.listWorkflowAuditEvents({ batchId: "batch-expense" });

    expect(evidences).toHaveLength(2);
    expect(evidence?.capturedDescription).toBe("Creative Cloud");
    expect(evidenceFiles[0]).toMatchObject({
      evidenceFileId: "file-expense",
      isPrimary: true,
    });
    expect(batches).toHaveLength(1);
    expect(batch?.state).toBe("review_required");
    expect(extractionRuns[0]?.extractionRunId).toBe("extract-expense");
    expect(plannerRuns[0]?.plannerRunId).toBe("planner-expense");
    expect(plannerReadTasks[0]?.readTaskId).toBe("task-expense");
    expect(candidateRecords[0]?.candidateId).toBe("candidate-expense");
    expect(writeProposals).toHaveLength(2);
    expect(createProposals[0]?.proposalType).toBe("create_counterparty");
    expect(mergeProposals[0]?.proposalType).toBe("merge_counterparty");
    expect(auditEvents[0]?.eventId).toBe("audit-expense");
  });

  it("returns metrics, trends, counts, and context snapshots", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);

    await expect(sdk.getMonthlyMetrics("2026-02")).resolves.toEqual({
      incomeCents: 150_000,
      netCents: 100_000,
      outflowCents: 50_000,
    });

    const trend = await sdk.getDailyTrend("2026-01-01", "2026-03-31");
    expect(trend).toHaveLength(5);
    expect(await sdk.getRecordCount()).toBe(5);

    await expect(sdk.getContextSnapshot()).resolves.toMatchObject({
      counterpartyCount: 2,
      entityId: "entity-main",
      entityName: "SDK Demo Books",
      totalRecords: 5,
    });
  });

  it("returns report and tax helper outputs", async () => {
    const database = createSdkTestDatabase();
    seedSdkFixture(database);
    const sdk = createSdk(database);

    const profitAndLoss = await sdk.getProfitAndLoss("2026-01-01", "2026-04-01");
    const balanceSheet = await sdk.getBalanceSheet("2026-01-01", "2026-04-01");
    const generalLedger = await sdk.getGeneralLedger("2026-01-01", "2026-04-01");
    const taxRange = sdk.getTaxYearDateRange(2026);
    const taxSummary = await sdk.getTaxSummary(2026);
    const scheduleCCandidates = await sdk.getScheduleCCandidateRecords(2026);
    const scheduleCAggregation = await sdk.getScheduleCAggregation(2026);
    const scheduleSEPreview = await sdk.getScheduleSEPreview(2026);
    const taxEvidenceLinks = await sdk.getTaxHelperEvidenceFileLinks(2026, [
      "income-jan",
      "expense-feb",
    ]);

    expect(profitAndLoss.totalRevenueCents).toBe(400_000);
    expect(profitAndLoss.totalExpenseCents).toBe(62_500);
    expect(balanceSheet.closingBalanceCents).toBe(334_100);
    expect(generalLedger.entryCount).toBe(5);
    expect(taxRange).toEqual({
      endExclusiveOn: "2027-01-01",
      startOn: "2026-01-01",
    });
    expect(taxSummary.businessRecordCount).toBe(4);
    expect(scheduleCCandidates).toHaveLength(4);
    expect(scheduleCAggregation.lineAmounts.line1?.amountCents).toBe(400_000);
    expect(scheduleSEPreview.netProfitCents).toBe(337_500);
    expect(taxEvidenceLinks).toHaveLength(2);
  });
});
