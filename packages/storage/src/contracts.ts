export interface StructuredTableContract {
  name: string;
  summary: string;
  createStatement: string;
}

export interface FileVaultCollectionContract {
  slug: string;
  title: string;
  summary: string;
  defaultExtension: string;
}

export const structuredStoreContract = {
  databaseName: "creator-cfo-local.db",
  version: 1,
  tables: [
    {
      name: "income_snapshots",
      summary: "Aggregated revenue snapshots per creator platform and payout window.",
      createStatement: `CREATE TABLE IF NOT EXISTS income_snapshots (
        id TEXT PRIMARY KEY NOT NULL,
        platform TEXT NOT NULL,
        gross_amount_cents INTEGER NOT NULL,
        payout_currency TEXT NOT NULL,
        captured_at TEXT NOT NULL
      );`,
    },
    {
      name: "invoice_records",
      summary: "Invoices, statuses, counterparties, and due dates tracked directly on device.",
      createStatement: `CREATE TABLE IF NOT EXISTS invoice_records (
        id TEXT PRIMARY KEY NOT NULL,
        client_name TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        due_on TEXT
      );`,
    },
    {
      name: "expense_records",
      summary: "Costs, tools, campaign spend, and collaborators attached to creator operations.",
      createStatement: `CREATE TABLE IF NOT EXISTS expense_records (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        incurred_on TEXT NOT NULL,
        note TEXT
      );`,
    },
    {
      name: "tax_forecasts",
      summary: "Estimated tax obligations, reserve ratios, and next filing checkpoints.",
      createStatement: `CREATE TABLE IF NOT EXISTS tax_forecasts (
        id TEXT PRIMARY KEY NOT NULL,
        jurisdiction TEXT NOT NULL,
        estimated_due_cents INTEGER NOT NULL,
        reserve_ratio REAL NOT NULL,
        forecasted_on TEXT NOT NULL
      );`,
    },
    {
      name: "cash_flow_snapshots",
      summary: "Working-capital snapshots for runway, inflow timing, and payout confidence.",
      createStatement: `CREATE TABLE IF NOT EXISTS cash_flow_snapshots (
        id TEXT PRIMARY KEY NOT NULL,
        available_cash_cents INTEGER NOT NULL,
        upcoming_obligations_cents INTEGER NOT NULL,
        runway_days INTEGER NOT NULL,
        captured_at TEXT NOT NULL
      );`,
    },
  ],
} as const satisfies {
  databaseName: string;
  version: number;
  tables: StructuredTableContract[];
};

export const fileVaultContract = {
  rootDirectory: "creator-cfo-vault",
  collections: [
    {
      slug: "receipts",
      title: "Receipts",
      summary: "Expense receipts, tool invoices, and creator operation proofs.",
      defaultExtension: "jpg",
    },
    {
      slug: "invoice-exports",
      title: "Invoice Exports",
      summary: "Generated invoice PDFs or shareable drafts for clients.",
      defaultExtension: "pdf",
    },
    {
      slug: "statements",
      title: "Statements",
      summary: "Platform statements and payout evidence downloaded by the user.",
      defaultExtension: "csv",
    },
    {
      slug: "tax-support",
      title: "Tax Support",
      summary: "Documents reserved for estimates, filings, and audit support.",
      defaultExtension: "pdf",
    },
  ],
} as const satisfies {
  rootDirectory: string;
  collections: FileVaultCollectionContract[];
};

export type FileVaultCollectionSlug = (typeof fileVaultContract.collections)[number]["slug"];

export function sanitizeVaultFileName(fileName: string): string {
  return fileName.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

export function buildVaultRelativePath(
  collection: FileVaultCollectionSlug,
  fileName: string,
): string {
  return `${collection}/${sanitizeVaultFileName(fileName)}`;
}

