export interface NewsArticle {
  body: string[];
  category: string;
  publishedAt: string;
  readMinutes: number;
  slug: string;
  source: string;
  summary: string;
  title: string;
}

export interface NewsFeedPage {
  articles: NewsArticle[];
  hasMore: boolean;
  nextCursor: number;
}

const PAGE_SIZE = 4;

export const localNewsFeed: NewsArticle[] = [
  {
    slug: "youtube-payout-forecast-2026",
    category: "Platform",
    title: "YouTube payout pacing matters more than headline CPM",
    summary: "Creators are tracking settlement lag and reserve windows just as closely as monthly revenue totals.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-27T08:00:00.000Z",
    readMinutes: 4,
    body: [
      "A stable payout rhythm often matters more to operators than a single strong CPM month because expenses and taxes still move on fixed dates.",
      "Teams with local-first finance tooling are starting to compare payout cadence, dispute delays, and reserve needs side by side instead of waiting for month-end exports.",
      "That shift is why cash timing dashboards are becoming a first-class product surface rather than a reporting afterthought.",
    ],
  },
  {
    slug: "tiktok-shop-cash-planning",
    category: "Cash Flow",
    title: "TikTok Shop creators are planning cash around fee timing, not just top-line sales",
    summary: "Net settlement timing is reshaping how short-form commerce teams think about runway and inventory risk.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-27T07:00:00.000Z",
    readMinutes: 3,
    body: [
      "Commerce creators are watching the gap between order volume and available cash much more closely as platform fees and refund windows extend the journey from sale to usable balance.",
      "The healthiest teams are now pairing sales snapshots with next-seven-day obligations so operating decisions stay grounded in what can actually be deployed.",
      "For local-first products, the opportunity is to show those signals without forcing a full back-office stack on day one.",
    ],
  },
  {
    slug: "patreon-membership-stability",
    category: "Revenue Mix",
    title: "Membership revenue is becoming the stabilizer in mixed creator income stacks",
    summary: "Recurring support is increasingly used as the buffer against campaign and ad volatility.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-27T06:00:00.000Z",
    readMinutes: 5,
    body: [
      "Creators with recurring membership income are using it as the predictable layer that keeps marketing, contractor, and filing decisions calmer.",
      "Instead of treating memberships as a bonus stream, operators increasingly see them as the base rhythm that supports experimentation elsewhere.",
      "That framing makes recurring revenue more useful as a planning signal than as a vanity percentage in a dashboard.",
    ],
  },
  {
    slug: "invoice-ops-for-brand-deals",
    category: "Operations",
    title: "Brand-deal invoice ops are moving closer to content calendars",
    summary: "Invoice visibility is becoming part of campaign planning, not a downstream admin task.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-27T05:00:00.000Z",
    readMinutes: 4,
    body: [
      "Teams running frequent brand partnerships are aligning invoice issuance with campaign milestones so payout follow-up starts earlier.",
      "That reduces the risk of high-revenue months looking strong on paper while cash arrives too late to cover near-term obligations.",
      "The result is that invoice tracking is moving from operations-only tooling into everyday creator execution workflows.",
    ],
  },
  {
    slug: "tax-reserve-behavior-shift",
    category: "Tax",
    title: "Tax reserves are shifting from quarterly scramble to weekly habit",
    summary: "More creators are treating reserve visibility as an always-on signal rather than a filing-season emergency.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T18:00:00.000Z",
    readMinutes: 3,
    body: [
      "The teams reducing filing stress most effectively are carving out reserves continuously instead of trying to repair the gap near deadlines.",
      "When reserve status is visible next to platform earnings, expense intake, and invoice timing, the decision burden drops noticeably.",
      "That is exactly the kind of lightweight signal a local-first dashboard can surface early in the product journey.",
    ],
  },
  {
    slug: "stablecoin-payout-watch",
    category: "Settlement",
    title: "Stablecoin payout conversations are staying exploratory but operationally relevant",
    summary: "Even before adoption, creators want to compare what alternate settlement rails could do for timing and fees.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T16:30:00.000Z",
    readMinutes: 4,
    body: [
      "Most teams are not changing payout rails overnight, but they are asking sharper questions about fee drag, compliance workload, and settlement timing.",
      "Products that frame those tradeoffs clearly can help users prepare without forcing a premature decision.",
      "That makes exploratory settlement coverage useful long before any real transfer workflow is launched.",
    ],
  },
  {
    slug: "bilibili-statement-discipline",
    category: "Reporting",
    title: "Statement discipline is still the fastest way to reduce payout confusion",
    summary: "Creators juggling multiple platforms are investing in cleaner statement review before chasing deeper automation.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T15:00:00.000Z",
    readMinutes: 4,
    body: [
      "When payouts feel unclear, the first fix is usually a clearer statement review rhythm rather than more tooling complexity.",
      "Teams that keep downloaded statements attached to operating context resolve discrepancies faster and reduce month-end surprises.",
      "This is why local file-vault organization remains valuable even in a visually polished mobile shell.",
    ],
  },
  {
    slug: "creator-runway-mini-dashboards",
    category: "Planning",
    title: "Mini runway dashboards are replacing giant creator finance spreadsheets",
    summary: "A smaller, always-available signal set is winning over all-in-one templates for daily decisions.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T13:00:00.000Z",
    readMinutes: 5,
    body: [
      "Operators are reaching for focused views that answer a few urgent questions well: what is available now, what is due next, and which payouts are uncertain.",
      "That shift is one reason mobile-first finance surfaces can feel more actionable than large spreadsheet operating systems.",
      "The most effective dashboards cut scope before they add more charts.",
    ],
  },
  {
    slug: "agency-contractor-spend-visibility",
    category: "Costs",
    title: "Contractor visibility is becoming the missing half of creator margin tracking",
    summary: "Revenue is easy to celebrate, but margin confidence still depends on seeing collaborators and tool spend clearly.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T11:30:00.000Z",
    readMinutes: 3,
    body: [
      "Creators with lean teams often underestimate how quickly contractor and tooling commitments can erode strong revenue months.",
      "Margin visibility improves when those costs sit close to payout timing rather than in a separate buried spreadsheet.",
      "That is pushing more finance tooling toward compact, operator-friendly cost snapshots.",
    ],
  },
  {
    slug: "shopify-creator-ops-rhythm",
    category: "Commerce",
    title: "Shopify creators are blending storefront and media reporting more tightly",
    summary: "The separation between media performance and commerce operations keeps shrinking.",
    source: "Creator CFO Desk",
    publishedAt: "2026-03-26T10:00:00.000Z",
    readMinutes: 4,
    body: [
      "As creator brands mature, storefront results and audience-platform revenue are being reviewed as one operating picture instead of two teams with separate dashboards.",
      "That puts more pressure on the home shell to stay simple while still connecting signals across channels.",
      "A good discover feed can support that by surfacing the right operating questions, not just trend summaries.",
    ],
  },
];

export function getNewsPage(cursor = 0): NewsFeedPage {
  const articles = localNewsFeed.slice(cursor, cursor + PAGE_SIZE);
  const nextCursor = cursor + articles.length;

  return {
    articles,
    hasMore: nextCursor < localNewsFeed.length,
    nextCursor,
  };
}

export function refreshNewsPage(): NewsFeedPage {
  return getNewsPage(0);
}

export function loadMoreNewsPage(cursor: number): NewsFeedPage {
  return getNewsPage(cursor);
}

export function getNewsArticleBySlug(slug: string): NewsArticle | null {
  return localNewsFeed.find((article) => article.slug === slug) ?? null;
}
