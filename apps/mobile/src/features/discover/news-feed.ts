import type { ResolvedLocale } from "../app-shell/types";

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
    summary:
      "Creators are tracking settlement lag and reserve windows just as closely as monthly revenue totals.",
    source: "Ledgerly Desk",
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
    title:
      "TikTok Shop creators are planning cash around fee timing, not just top-line sales",
    summary:
      "Net settlement timing is reshaping how short-form commerce teams think about runway and inventory risk.",
    source: "Ledgerly Desk",
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
    title:
      "Membership revenue is becoming the stabilizer in mixed creator income stacks",
    summary:
      "Recurring support is increasingly used as the buffer against campaign and ad volatility.",
    source: "Ledgerly Desk",
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
    summary:
      "Invoice visibility is becoming part of campaign planning, not a downstream admin task.",
    source: "Ledgerly Desk",
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
    summary:
      "More creators are treating reserve visibility as an always-on signal rather than a filing-season emergency.",
    source: "Ledgerly Desk",
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
    title:
      "Stablecoin payout conversations are staying exploratory but operationally relevant",
    summary:
      "Even before adoption, creators want to compare what alternate settlement rails could do for timing and fees.",
    source: "Ledgerly Desk",
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
    title:
      "Statement discipline is still the fastest way to reduce payout confusion",
    summary:
      "Creators juggling multiple platforms are investing in cleaner statement review before chasing deeper automation.",
    source: "Ledgerly Desk",
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
    title:
      "Mini runway dashboards are replacing giant creator finance spreadsheets",
    summary:
      "A smaller, always-available signal set is winning over all-in-one templates for daily decisions.",
    source: "Ledgerly Desk",
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
    title:
      "Contractor visibility is becoming the missing half of creator margin tracking",
    summary:
      "Revenue is easy to celebrate, but margin confidence still depends on seeing collaborators and tool spend clearly.",
    source: "Ledgerly Desk",
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
    title:
      "Shopify creators are blending storefront and media reporting more tightly",
    summary:
      "The separation between media performance and commerce operations keeps shrinking.",
    source: "Ledgerly Desk",
    publishedAt: "2026-03-26T10:00:00.000Z",
    readMinutes: 4,
    body: [
      "As creator brands mature, storefront results and audience-platform revenue are being reviewed as one operating picture instead of two teams with separate dashboards.",
      "That puts more pressure on the home shell to stay simple while still connecting signals across channels.",
      "A good discover feed can support that by surfacing the right operating questions, not just trend summaries.",
    ],
  },
];

const localizedNewsFeedZh: Record<
  string,
  Pick<NewsArticle, "body" | "category" | "summary" | "title">
> = {
  "youtube-payout-forecast-2026": {
    body: [
      "对很多创作者团队来说，稳定的回款节奏往往比单月漂亮的 CPM 更重要，因为支出和税金并不会跟着平台的结算节奏一起延后。",
      "开始使用本地优先财务工具的团队，已经在并排比较回款节奏、争议延迟和预留金需求，而不是等到月末再导出报表统一核对。",
      "这也是为什么现金到账时间的仪表板正在从“附属报表”变成一块核心产品界面。",
    ],
    category: "平台",
    summary:
      "创作者现在跟踪结算延迟和预留窗口的频率，已经接近他们盯月收入总额的频率。",
    title: "YouTube 回款节奏，比表面上的 CPM 更值得盯",
  },
  "tiktok-shop-cash-planning": {
    body: [
      "随着平台费率和退款窗口拉长，从成交到可动用现金之间的时间差，正成为电商型创作者团队更敏感的经营变量。",
      "更健康的团队会把销售快照和未来七天的应付款放在一起看，确保经营决策基于真正可支配的现金，而不是账面热度。",
      "对本地优先产品来说，机会在于先把这些信号讲清楚，而不是一开始就强推完整的后台系统。",
    ],
    category: "现金流",
    summary:
      "净结算到账时间，正在重塑短视频电商团队对 runway 和库存风险的判断方式。",
    title: "TikTok Shop 创作者开始围绕费率到账时间做现金规划",
  },
  "patreon-membership-stability": {
    body: [
      "拥有稳定会员收入的创作者，越来越把它当作经营里的“可预测底盘”，让营销、协作和报税决策更平稳。",
      "会员制收入不再只是锦上添花的补充项，而是被视为支撑其他尝试的基础节奏。",
      "因此，持续性收入在计划层面的价值，往往比它在仪表板上的占比更高。",
    ],
    category: "收入结构",
    summary: "持续订阅支持，正在成为对冲 campaign 与广告波动的稳定器。",
    title: "会员收入，正在成为创作者混合收入结构里的稳定器",
  },
  "invoice-ops-for-brand-deals": {
    body: [
      "高频承接品牌合作的团队，开始把开票节点和内容排期绑定，这样催款动作能更早启动。",
      "这能降低“账面收入看起来很好，但现金到账过晚”的错觉，避免短期支出被拖住。",
      "结果就是，发票跟踪正从运营后台工具，逐步进入日常的创作者执行流程。",
    ],
    category: "运营",
    summary:
      "发票可见性正逐步成为 campaign 规划的一部分，而不再只是后端行政流程。",
    title: "品牌合作的开票流程，正越来越贴近内容排期本身",
  },
  "tax-reserve-behavior-shift": {
    body: [
      "最能降低申报焦虑的团队，通常不是报税季前突击补钱，而是平时就持续做税金预留。",
      "当预留状态能和平台收入、费用录入、发票时间一起被看到时，决策负担会明显下降。",
      "这正是本地优先财务首页适合提前提供的轻量级信号。",
    ],
    category: "税务",
    summary:
      "越来越多创作者把税金预留当成持续性的经营信号，而不是报税季的临时补救动作。",
    title: "税金预留，正从季度冲刺变成每周习惯",
  },
  "stablecoin-payout-watch": {
    body: [
      "大多数团队不会一夜之间切换回款渠道，但他们确实开始更认真地比较手续费、合规负担和到账速度。",
      "如果产品能把这些权衡讲清楚，即使用户暂时不切换，也能提前做好准备。",
      "因此，关于结算方式的探索型内容，在真正上线转账功能之前就已经有价值。",
    ],
    category: "结算",
    summary:
      "即便还没真正采用，创作者也越来越想比较不同结算轨道在时间和手续费上的差异。",
    title: "稳定币回款仍处探索阶段，但已经开始影响经营判断",
  },
  "bilibili-statement-discipline": {
    body: [
      "当回款让人感到混乱时，第一步通常不是加更多工具，而是建立更清晰的对账节奏。",
      "能把下载下来的结算单和当下的经营场景放在一起查看的团队，通常更快发现差异并降低月末惊讶。",
      "这也是为什么，即使移动端壳层已经很漂亮，本地文件仓管理仍然很重要。",
    ],
    category: "报表",
    summary:
      "在追求更深自动化之前，多平台创作者依然先把结算单核对纪律做得更扎实。",
    title: "先把结算单看清楚，仍然是降低回款混乱的最快办法",
  },
  "creator-runway-mini-dashboards": {
    body: [
      "越来越多经营者偏向更聚焦的视图，只回答几个紧迫问题: 现在能动用多少、接下来要付什么、哪些回款还不确定。",
      "这也是为什么移动端财务界面常常比超大表格系统更有行动感。",
      "真正有效的仪表板，通常先收缩范围，再增加图表。",
    ],
    category: "规划",
    summary: "相比全能模板，更轻、更常开的 runway 信号集正在赢得日常经营决策。",
    title: "轻量 runway 仪表板，正在替代庞杂的创作者财务表格",
  },
  "agency-contractor-spend-visibility": {
    body: [
      "小团队创作者经常低估外包、人力协作和工具订阅对利润的侵蚀速度。",
      "如果这些成本能和回款时间一起被看到，而不是埋在另一张表格里，利润判断会更可靠。",
      "这正推动更多财务工具把成本快照做得更紧凑、更运营友好。",
    ],
    category: "成本",
    summary:
      "收入容易被看见，但真正的利润把控仍然取决于对协作者和工具支出的清晰认知。",
    title: "协作者成本可见性，正在成为利润判断缺失的另一半",
  },
  "shopify-creator-ops-rhythm": {
    body: [
      "随着创作者品牌成熟，独立站表现和内容平台收入越来越被当作同一张经营图来审视，而不是两个互不相干的团队视角。",
      "这也让首页必须在保持简单的同时，把不同渠道的信号连接起来。",
      "好的发现页内容，价值不只是告诉你趋势，而是帮你看到当下该问什么问题。",
    ],
    category: "电商",
    summary: "内容表现与店铺经营之间的边界，正在持续收缩。",
    title: "Shopify 创作者，开始把店铺和内容平台经营节奏一起看",
  },
};

function getLocalizedNewsFeed(locale: ResolvedLocale): NewsArticle[] {
  if (locale !== "zh-CN") {
    return localNewsFeed;
  }

  return localNewsFeed.map((article) => {
    const localized = localizedNewsFeedZh[article.slug];

    return localized
      ? {
          ...article,
          ...localized,
        }
      : article;
  });
}

export function getNewsPage(
  cursor = 0,
  locale: ResolvedLocale = "en",
): NewsFeedPage {
  const feed = getLocalizedNewsFeed(locale);
  const articles = feed.slice(cursor, cursor + PAGE_SIZE);
  const nextCursor = cursor + articles.length;

  return {
    articles,
    hasMore: nextCursor < feed.length,
    nextCursor,
  };
}

export function refreshNewsPage(locale: ResolvedLocale = "en"): NewsFeedPage {
  return getNewsPage(0, locale);
}

export function loadMoreNewsPage(
  cursor: number,
  locale: ResolvedLocale = "en",
): NewsFeedPage {
  return getNewsPage(cursor, locale);
}

export function getNewsArticleBySlug(
  slug: string,
  locale: ResolvedLocale = "en",
): NewsArticle | null {
  return (
    getLocalizedNewsFeed(locale).find((article) => article.slug === slug) ??
    null
  );
}
