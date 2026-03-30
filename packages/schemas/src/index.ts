export interface ProductModule {
  slug: string;
  title: string;
  summary: string;
}

export interface WorkflowPrinciple {
  title: string;
  summary: string;
}

export const productModules: ProductModule[] = [
  {
    slug: "revenue-hub",
    title: "Revenue Hub",
    summary: "Aggregate creator earnings from multiple platforms into one ledger.",
  },
  {
    slug: "invoice-desk",
    title: "Invoice Desk",
    summary: "Track invoice issuance, payout expectations, and collection status.",
  },
  {
    slug: "cost-journal",
    title: "Cost Journal",
    summary: "Record operating costs, tools, talent, and campaign spending.",
  },
  {
    slug: "tax-forecast",
    title: "Tax Forecast",
    summary: "Estimate taxes and cash obligations before payment deadlines arrive.",
  },
  {
    slug: "stablecoin-settlement",
    title: "Stablecoin Settlement",
    summary: "Prepare future payout flows for compliant stablecoin collections.",
  },
];

export const supportedPlatforms = [
  "YouTube",
  "TikTok",
  "Bilibili",
  "X",
  "Patreon",
  "Shopify",
] as const;

export type SupportedPlatform = (typeof supportedPlatforms)[number];

export const workflowPrinciples: WorkflowPrinciple[] = [
  {
    title: "Local-first finance ops",
    summary: "Creators can draft, inspect, and organize their records without waiting on a backend.",
  },
  {
    title: "Structured plus file-based storage",
    summary:
      "Operational records and evidence metadata live in SQLite while evidence objects and exports live in a dedicated vault.",
  },
  {
    title: "Contract-driven changes",
    summary: "Storage tables, vault rules, docs, and tests move together as one change.",
  },
];
