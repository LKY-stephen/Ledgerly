export type LedgerFilter = "income" | "expenses" | "invoices";

export interface LedgerRecordCard {
  amountLabel: string;
  dateLabel: string;
  iconLabel: string;
  id: string;
  kind: LedgerFilter;
  title: string;
}

export interface UploadSourceCard {
  id: string;
  summary: string;
  title: string;
}

export interface ParseProgressStep {
  id: string;
  summary: string;
  title: string;
}

export interface ParseCategoryOption {
  description: string;
  id: "income" | "expense" | "invoice";
  title: string;
}

export const ledgerFilters: ReadonlyArray<{ id: LedgerFilter; label: string }> = [
  { id: "income", label: "Income" },
  { id: "expenses", label: "Expenses" },
  { id: "invoices", label: "Invoices" },
];

export const ledgerRecordCards: ReadonlyArray<LedgerRecordCard> = [
  {
    id: "youtube",
    kind: "income",
    title: "YouTube Partner Program",
    dateLabel: "Oct 12, 2023",
    amountLabel: "$12,450.00",
    iconLabel: "YT",
  },
  {
    id: "spotify",
    kind: "income",
    title: "Spotify Technology S.A.",
    dateLabel: "Oct 08, 2023",
    amountLabel: "$4,210.88",
    iconLabel: "SP",
  },
  {
    id: "adobe",
    kind: "income",
    title: "Adobe Brand Sponsorship",
    dateLabel: "Sep 29, 2023",
    amountLabel: "$8,000.00",
    iconLabel: "AD",
  },
  {
    id: "merch",
    kind: "income",
    title: "Merchandise Sales - Q3",
    dateLabel: "Sep 24, 2023",
    amountLabel: "$22,140.50",
    iconLabel: "MS",
  },
  {
    id: "masterclass",
    kind: "income",
    title: "Masterclass Royalties",
    dateLabel: "Sep 15, 2023",
    amountLabel: "$3,105.00",
    iconLabel: "MC",
  },
  {
    id: "camera-rental",
    kind: "expenses",
    title: "Camera Rental House",
    dateLabel: "Oct 05, 2023",
    amountLabel: "$540.00",
    iconLabel: "CR",
  },
  {
    id: "travel",
    kind: "expenses",
    title: "West Coast Creator Summit",
    dateLabel: "Sep 21, 2023",
    amountLabel: "$1,240.30",
    iconLabel: "TR",
  },
  {
    id: "invoice-q4",
    kind: "invoices",
    title: "Brand Studio Retainer - Q4",
    dateLabel: "Due Nov 01, 2023",
    amountLabel: "$6,800.00",
    iconLabel: "IV",
  },
];

export const uploadSourceCards: ReadonlyArray<UploadSourceCard> = [
  {
    id: "receipt",
    title: "Receipt capture",
    summary: "Best for expenses, software renewals, travel receipts, and vendor bills.",
  },
  {
    id: "invoice",
    title: "Invoice drop",
    summary: "Use for unpaid client invoices, agency work, and contract deliverables.",
  },
  {
    id: "statement",
    title: "Statement import",
    summary: "Use for platform payout statements, settlement reports, or remittance files.",
  },
];

export const parseProgressSteps: ReadonlyArray<ParseProgressStep> = [
  {
    id: "classify",
    title: "Classify document",
    summary: "Receipt detected and routed into the expense review lane.",
  },
  {
    id: "extract",
    title: "Extract key fields",
    summary: "Vendor, amount, and transaction date normalized into mock review fields.",
  },
  {
    id: "assign",
    title: "Assign ledger category",
    summary: "Suggested category is ready, but stays editable before anything is saved.",
  },
];

export const parseCategoryOptions: ReadonlyArray<ParseCategoryOption> = [
  {
    id: "income",
    title: "Income",
    description: "Revenue, payouts, and client receipts.",
  },
  {
    id: "expense",
    title: "Expense",
    description: "Subscriptions, gear, and travel.",
  },
  {
    id: "invoice",
    title: "Invoice",
    description: "Pending receivables and client billing.",
  },
];

export function getLedgerCardsForFilter(filter: LedgerFilter): readonly LedgerRecordCard[] {
  return ledgerRecordCards.filter((card) => card.kind === filter);
}
