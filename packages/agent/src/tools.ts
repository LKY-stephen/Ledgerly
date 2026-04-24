import type { LedgerlySDK } from "@ledgerly/sdk";
import type { ToolDefinition, ToolExecutor } from "./types";

const defaultRecordParties = {
  expense: {
    source: "Business checking",
    target: "Unspecified vendor",
  },
  income: {
    source: "Unspecified payer",
    target: "Business checking",
  },
  non_business_income: {
    source: "Unspecified payer",
    target: "Personal account",
  },
  personal_spending: {
    source: "Personal checking",
    target: "Unspecified merchant",
  },
} as const;

function parseCommaSeparated(value: unknown): string[] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValues = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

export const ledgerTools: ToolDefinition[] = [
  {
    name: "list_records",
    description:
      "List financial records with optional filters. Returns records sorted by date descending. Use this to show the user their transactions, income, expenses, etc.",
    parameters: {
      type: "object",
      properties: {
        recordKind: {
          type: "string",
          description: "Filter by record type",
          enum: ["income", "non_business_income", "expense", "personal_spending"],
        },
        startDate: {
          type: "string",
          description: "Filter records on or after this date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "Filter records on or before this date (YYYY-MM-DD)",
        },
        search: {
          type: "string",
          description: "Search text in description, source, or target",
        },
        limit: {
          type: "string",
          description: "Max number of records to return (default 20)",
        },
      },
    },
  },
  {
    name: "get_record",
    description: "Get a single record by its ID. Use this to show details of a specific transaction.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID to look up",
        },
      },
      required: ["recordId"],
    },
  },
  {
    name: "create_record",
    description:
      "Create a new financial record. Use this when the user wants to add a new income, expense, or personal spending entry.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Description of the transaction",
        },
        amountCents: {
          type: "string",
          description: "Amount in cents (e.g. 1500 for $15.00). Must be a positive integer.",
        },
        occurredOn: {
          type: "string",
          description: "Date of the transaction (YYYY-MM-DD)",
        },
        recordKind: {
          type: "string",
          description: "Type of record",
          enum: ["income", "non_business_income", "expense", "personal_spending"],
        },
        source: {
          type: "string",
          description: "Source/payer of the transaction. Optional for quick-add flows.",
        },
        target: {
          type: "string",
          description: "Target/payee of the transaction. Optional for quick-add flows.",
        },
        memo: {
          type: "string",
          description: "Optional memo or notes",
        },
        currency: {
          type: "string",
          description: "Currency code (default USD)",
        },
        taxLineCode: {
          type: "string",
          description: "IRS Schedule C tax line code for expenses",
          enum: ["line1", "line8", "line10", "line11", "line15", "line16b", "line17", "line18", "line20a", "line20b", "line21", "line22", "line23", "line24a", "line25", "line27a"],
        },
        taxCategoryCode: {
          type: "string",
          description: "Tax category code (e.g. schedule-c-other-expense, meals, travel)",
        },
      },
      required: ["description", "amountCents", "occurredOn", "recordKind"],
    },
  },
  {
    name: "update_record",
    description: "Update an existing financial record. Use this when the user wants to modify a transaction.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID to update",
        },
        description: {
          type: "string",
          description: "New description",
        },
        amountCents: {
          type: "string",
          description: "New amount in cents",
        },
        occurredOn: {
          type: "string",
          description: "New date (YYYY-MM-DD)",
        },
        memo: {
          type: "string",
          description: "New memo",
        },
        recordKind: {
          type: "string",
          description: "New record type",
          enum: ["income", "non_business_income", "expense", "personal_spending"],
        },
        taxLineCode: {
          type: "string",
          description: "IRS Schedule C tax line code",
          enum: ["line1", "line8", "line10", "line11", "line15", "line16b", "line17", "line18", "line20a", "line20b", "line21", "line22", "line23", "line24a", "line25", "line27a"],
        },
        taxCategoryCode: {
          type: "string",
          description: "Tax category code",
        },
      },
      required: ["recordId"],
    },
  },
  {
    name: "delete_record",
    description:
      "Delete a financial record. Use this when the user explicitly asks to remove a transaction. Always confirm with the user before deleting.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID to delete",
        },
      },
      required: ["recordId"],
    },
  },
  {
    name: "get_monthly_metrics",
    description:
      "Get monthly financial summary (income, expenses, net profit). Use this to answer questions about monthly financial performance.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Month in YYYY-MM format (default: current month)",
        },
      },
    },
  },
  {
    name: "get_daily_trend",
    description:
      "Get daily income/expense trend for a date range. Use this to show spending patterns or income trends over time.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date (YYYY-MM-DD)",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "list_counterparties",
    description:
      "List all counterparties (transaction parties like clients, vendors, etc).",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_counterparty",
    description: "Create a new counterparty (client, vendor, etc).",
    parameters: {
      type: "object",
      properties: {
        displayName: {
          type: "string",
          description: "Name of the counterparty",
        },
        counterpartyType: {
          type: "string",
          description: "Type of counterparty (e.g. client, vendor, platform)",
        },
        notes: {
          type: "string",
          description: "Optional notes about the counterparty",
        },
      },
      required: ["displayName", "counterpartyType"],
    },
  },
  {
    name: "get_context_snapshot",
    description:
      "Get a summary overview of the current ledger state. Use this to understand the current financial situation before answering general questions.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_profit_and_loss",
    description:
      "Generate a Profit & Loss (income statement) report. Shows revenue and expenses grouped by counterparty with totals and net income.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date exclusive (YYYY-MM-DD)",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_balance_sheet",
    description:
      "Generate a Balance Sheet report. Shows opening balance, period revenue and expenses, and closing balance.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Period start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "Period end date exclusive (YYYY-MM-DD)",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_general_ledger",
    description:
      "Generate a General Ledger report. Shows all posting entries with debit/credit details for a date range.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date exclusive (YYYY-MM-DD)",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "get_tax_summary",
    description:
      "Get tax helper data for a given year. Returns Schedule C line item aggregations, Schedule SE preview, and review notices.",
    parameters: {
      type: "object",
      properties: {
        taxYear: {
          type: "string",
          description: "Tax year (e.g. 2026)",
        },
      },
      required: ["taxYear"],
    },
  },
  {
    name: "get_storage_overview",
    description:
      "Get the local storage overview for the active Ledgerly package. Use this to understand the local schema and file-vault footprint available to the assistant.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_records_by_date_range",
    description:
      "Search records by date range using the SDK's storage-backed date-range query wrapper.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Inclusive start date (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "Inclusive end date (YYYY-MM-DD)",
        },
        endExclusiveDate: {
          type: "string",
          description: "Exclusive end date (YYYY-MM-DD). Use instead of endDate when needed.",
        },
        recordKinds: {
          type: "string",
          description: "Comma-separated record kinds to include",
        },
        recordStatuses: {
          type: "string",
          description: "Comma-separated record statuses to include",
        },
        limit: {
          type: "string",
          description: "Max number of records to return",
        },
      },
    },
  },
  {
    name: "list_evidences",
    description:
      "List evidence items tracked in the local workflow. Use this to inspect uploaded or parsed documents.",
    parameters: {
      type: "object",
      properties: {
        parseStatus: {
          type: "string",
          description: "Filter by parse status",
          enum: ["pending", "parsed", "failed"],
        },
        limit: {
          type: "string",
          description: "Max number of evidence rows to return",
        },
      },
    },
  },
  {
    name: "get_evidence",
    description: "Get a single evidence item by ID.",
    parameters: {
      type: "object",
      properties: {
        evidenceId: {
          type: "string",
          description: "The evidence ID to look up",
        },
      },
      required: ["evidenceId"],
    },
  },
  {
    name: "list_evidence_files",
    description: "List stored files for a given evidence item.",
    parameters: {
      type: "object",
      properties: {
        evidenceId: {
          type: "string",
          description: "Evidence ID whose files should be returned",
        },
      },
      required: ["evidenceId"],
    },
  },
  {
    name: "list_upload_batches",
    description:
      "List upload workflow batches. Use this to inspect the current state of uploaded evidence and downstream workflow progress.",
    parameters: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "Optional batch state filter",
        },
        limit: {
          type: "string",
          description: "Max number of batches to return",
        },
      },
    },
  },
  {
    name: "get_upload_batch",
    description: "Get a single upload batch by its batch ID.",
    parameters: {
      type: "object",
      properties: {
        batchId: {
          type: "string",
          description: "The upload batch ID to look up",
        },
      },
      required: ["batchId"],
    },
  },
  {
    name: "list_extraction_runs",
    description: "List extraction runs for a batch or evidence item.",
    parameters: {
      type: "object",
      properties: {
        batchId: {
          type: "string",
          description: "Filter by batch ID",
        },
        evidenceId: {
          type: "string",
          description: "Filter by evidence ID",
        },
      },
    },
  },
  {
    name: "list_planner_runs",
    description: "List planner runs for a batch or evidence item.",
    parameters: {
      type: "object",
      properties: {
        batchId: {
          type: "string",
          description: "Filter by batch ID",
        },
        evidenceId: {
          type: "string",
          description: "Filter by evidence ID",
        },
      },
    },
  },
  {
    name: "list_planner_read_tasks",
    description: "List planner read tasks for a planner run.",
    parameters: {
      type: "object",
      properties: {
        plannerRunId: {
          type: "string",
          description: "Planner run ID",
        },
      },
      required: ["plannerRunId"],
    },
  },
  {
    name: "list_candidate_records",
    description: "List workflow candidate records generated during planner review.",
    parameters: {
      type: "object",
      properties: {
        batchId: {
          type: "string",
          description: "Filter by batch ID",
        },
        evidenceId: {
          type: "string",
          description: "Filter by evidence ID",
        },
        plannerRunId: {
          type: "string",
          description: "Filter by planner run ID",
        },
        states: {
          type: "string",
          description: "Comma-separated candidate record states",
        },
      },
    },
  },
  {
    name: "list_workflow_write_proposals",
    description:
      "List workflow write proposals generated during review. Useful for inspecting pending approval items and downstream workflow dependencies.",
    parameters: {
      type: "object",
      properties: {
        plannerRunId: {
          type: "string",
          description: "Filter by planner run ID",
        },
        candidateId: {
          type: "string",
          description: "Filter by candidate ID",
        },
        proposalType: {
          type: "string",
          description: "Filter by workflow proposal type",
        },
        states: {
          type: "string",
          description: "Comma-separated workflow proposal states",
        },
      },
    },
  },
  {
    name: "list_workflow_audit_events",
    description: "List workflow audit events for a batch, candidate, planner run, or write proposal.",
    parameters: {
      type: "object",
      properties: {
        batchId: {
          type: "string",
          description: "Filter by batch ID",
        },
        plannerRunId: {
          type: "string",
          description: "Filter by planner run ID",
        },
        candidateId: {
          type: "string",
          description: "Filter by candidate ID",
        },
        writeProposalId: {
          type: "string",
          description: "Filter by write proposal ID",
        },
        limit: {
          type: "string",
          description: "Max number of audit events to return",
        },
      },
    },
  },
  {
    name: "get_schedule_c_aggregation",
    description:
      "Get the lower-level Schedule C aggregation for a tax year. Use this when the user needs line-level tax detail beyond the summary helper.",
    parameters: {
      type: "object",
      properties: {
        taxYear: {
          type: "string",
          description: "Tax year (e.g. 2026)",
        },
      },
      required: ["taxYear"],
    },
  },
  {
    name: "get_schedule_se_preview",
    description:
      "Get the lower-level Schedule SE preview for a tax year. Use this when the user needs the net-profit preview rather than the full tax summary.",
    parameters: {
      type: "object",
      properties: {
        taxYear: {
          type: "string",
          description: "Tax year (e.g. 2026)",
        },
      },
      required: ["taxYear"],
    },
  },
  {
    name: "get_tax_helper_evidence_file_links",
    description:
      "Get the evidence-file links for specific record IDs in a tax year. Use this when the user needs the supporting files behind tax-related records.",
    parameters: {
      type: "object",
      properties: {
        taxYear: {
          type: "string",
          description: "Tax year (e.g. 2026)",
        },
        recordIds: {
          type: "string",
          description: "Comma-separated record IDs to look up",
        },
      },
      required: ["taxYear", "recordIds"],
    },
  },
];

export const toolExecutors: Record<string, ToolExecutor> = {
  async list_records(sdk, args) {
    return sdk.listRecords({
      recordKind: args.recordKind as string | undefined,
      startDate: args.startDate as string | undefined,
      endDate: args.endDate as string | undefined,
      search: args.search as string | undefined,
      limit: args.limit ? parseInt(args.limit as string, 10) : 20,
    });
  },

  async get_record(sdk, args) {
    const record = await sdk.getRecord(args.recordId as string);
    if (!record) return { error: "Record not found" };
    return record;
  },

  async create_record(sdk, args) {
    const recordKind =
      (args.recordKind as "income" | "non_business_income" | "expense" | "personal_spending") ??
      "expense";
    const defaultParties = defaultRecordParties[recordKind];

    return sdk.createRecord({
      description: args.description as string,
      amountCents: parseInt(args.amountCents as string, 10),
      occurredOn: args.occurredOn as string,
      recordKind,
      source: (args.source as string | undefined)?.trim() || defaultParties.source,
      target: (args.target as string | undefined)?.trim() || defaultParties.target,
      memo: args.memo as string | undefined,
      currency: args.currency as string | undefined,
      taxLineCode: args.taxLineCode as string | undefined,
      taxCategoryCode: args.taxCategoryCode as string | undefined,
    });
  },

  async update_record(sdk, args) {
    const updates: Record<string, unknown> = {};
    if (args.description) updates.description = args.description;
    if (args.amountCents) updates.amountCents = parseInt(args.amountCents as string, 10);
    if (args.occurredOn) updates.occurredOn = args.occurredOn;
    if (args.memo) updates.memo = args.memo;
    if (args.recordKind) updates.recordKind = args.recordKind;
    if (args.taxLineCode) updates.taxLineCode = args.taxLineCode;
    if (args.taxCategoryCode) updates.taxCategoryCode = args.taxCategoryCode;

    const record = await sdk.updateRecord(args.recordId as string, updates);
    if (!record) return { error: "Record not found" };
    return record;
  },

  async delete_record(sdk, args) {
    const deleted = await sdk.deleteRecord(args.recordId as string);
    return { success: deleted, recordId: args.recordId };
  },

  async get_monthly_metrics(sdk, args) {
    return sdk.getMonthlyMetrics(args.month as string | undefined);
  },

  async get_daily_trend(sdk, args) {
    return sdk.getDailyTrend(args.startDate as string, args.endDate as string);
  },

  async list_counterparties(sdk) {
    return sdk.listCounterparties();
  },

  async create_counterparty(sdk, args) {
    return sdk.createCounterparty({
      displayName: args.displayName as string,
      counterpartyType: args.counterpartyType as string,
      notes: args.notes as string | undefined,
    });
  },

  async get_context_snapshot(sdk) {
    return sdk.getContextSnapshot();
  },

  async get_profit_and_loss(sdk, args) {
    return sdk.getProfitAndLoss(args.startDate as string, args.endDate as string);
  },

  async get_balance_sheet(sdk, args) {
    return sdk.getBalanceSheet(args.startDate as string, args.endDate as string);
  },

  async get_general_ledger(sdk, args) {
    return sdk.getGeneralLedger(args.startDate as string, args.endDate as string);
  },

  async get_tax_summary(sdk, args) {
    return sdk.getTaxSummary(parseInt(args.taxYear as string, 10));
  },

  async get_storage_overview(sdk) {
    return sdk.getStorageOverview();
  },

  async search_records_by_date_range(sdk, args) {
    return sdk.searchRecordsByDateRange({
      endExclusiveOn: args.endExclusiveDate as string | undefined,
      endOn: args.endDate as string | undefined,
      limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
      recordKinds: parseCommaSeparated(args.recordKinds),
      recordStatuses: parseCommaSeparated(args.recordStatuses),
      startOn: args.startDate as string | undefined,
    });
  },

  async list_evidences(sdk, args) {
    return sdk.listEvidences({
      limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
      parseStatus: args.parseStatus as "failed" | "parsed" | "pending" | undefined,
    });
  },

  async get_evidence(sdk, args) {
    const evidence = await sdk.getEvidence(args.evidenceId as string);
    if (!evidence) return { error: "Evidence not found" };
    return evidence;
  },

  async list_evidence_files(sdk, args) {
    return sdk.listEvidenceFiles(args.evidenceId as string);
  },

  async list_upload_batches(sdk, args) {
    return sdk.listUploadBatches({
      limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
      states: args.state
        ? ([args.state as string] as Array<
            | "approved"
            | "candidates_generated"
            | "duplicate_file"
            | "evidence_registered"
            | "failed"
            | "no_match"
            | "parse_complete"
            | "parse_pending"
            | "parsing"
            | "partially_approved"
            | "planning"
            | "rejected"
            | "review_required"
            | "uploaded"
            | "write_proposal_ready"
          >)
        : undefined,
    });
  },

  async get_upload_batch(sdk, args) {
    const batch = await sdk.getUploadBatch(args.batchId as string);
    if (!batch) return { error: "Upload batch not found" };
    return batch;
  },

  async list_extraction_runs(sdk, args) {
    return sdk.listExtractionRuns({
      batchId: args.batchId as string | undefined,
      evidenceId: args.evidenceId as string | undefined,
    });
  },

  async list_planner_runs(sdk, args) {
    return sdk.listPlannerRuns({
      batchId: args.batchId as string | undefined,
      evidenceId: args.evidenceId as string | undefined,
    });
  },

  async list_planner_read_tasks(sdk, args) {
    return sdk.listPlannerReadTasks(args.plannerRunId as string);
  },

  async list_candidate_records(sdk, args) {
    return sdk.listCandidateRecords({
      batchId: args.batchId as string | undefined,
      evidenceId: args.evidenceId as string | undefined,
      plannerRunId: args.plannerRunId as string | undefined,
      states: parseCommaSeparated(args.states) as
        | Array<
            | "approved"
            | "candidate"
            | "duplicate"
            | "failed"
            | "needs_review"
            | "persisted_draft"
            | "persisted_final"
            | "proposed_write_pending"
            | "rejected"
            | "validated"
          >
        | undefined,
    });
  },

  async list_workflow_write_proposals(sdk, args) {
    return sdk.listWorkflowWriteProposals({
      candidateId: args.candidateId as string | undefined,
      plannerRunId: args.plannerRunId as string | undefined,
      proposalType: args.proposalType as
        | "create_counterparty"
        | "merge_counterparty"
        | "persist_candidate_record"
        | "resolve_duplicate_receipt"
        | "update_candidate_record"
        | "update_workflow_state"
        | undefined,
      states: parseCommaSeparated(args.states) as
        | Array<"approved" | "blocked" | "executed" | "failed" | "pending_approval" | "rejected">
        | undefined,
    });
  },

  async list_workflow_audit_events(sdk, args) {
    return sdk.listWorkflowAuditEvents({
      batchId: args.batchId as string | undefined,
      candidateId: args.candidateId as string | undefined,
      limit: args.limit ? parseInt(args.limit as string, 10) : undefined,
      plannerRunId: args.plannerRunId as string | undefined,
      writeProposalId: args.writeProposalId as string | undefined,
    });
  },

  async get_schedule_c_aggregation(sdk, args) {
    return sdk.getScheduleCAggregation(parseInt(args.taxYear as string, 10));
  },

  async get_schedule_se_preview(sdk, args) {
    return sdk.getScheduleSEPreview(parseInt(args.taxYear as string, 10));
  },

  async get_tax_helper_evidence_file_links(sdk, args) {
    return sdk.getTaxHelperEvidenceFileLinks(
      parseInt(args.taxYear as string, 10),
      parseCommaSeparated(args.recordIds) ?? [],
    );
  },
};

export async function executeTool(
  sdk: LedgerlySDK,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const executor = toolExecutors[toolName];
  if (!executor) {
    return { error: `Unknown tool: ${toolName}` };
  }

  try {
    return await executor(sdk, args);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed" };
  }
}
