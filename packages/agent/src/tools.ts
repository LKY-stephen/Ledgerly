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
    });
  },

  async update_record(sdk, args) {
    const updates: Record<string, unknown> = {};
    if (args.description) updates.description = args.description;
    if (args.amountCents) updates.amountCents = parseInt(args.amountCents as string, 10);
    if (args.occurredOn) updates.occurredOn = args.occurredOn;
    if (args.memo) updates.memo = args.memo;
    if (args.recordKind) updates.recordKind = args.recordKind;

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
