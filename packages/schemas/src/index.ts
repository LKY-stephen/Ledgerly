export interface ProductModule {
  slug: string;
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

