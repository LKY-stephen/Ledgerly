import { describe, expect, it } from "vitest";

import {
  getNewsArticleBySlug,
  getNewsPage,
  loadMoreNewsPage,
  localNewsFeed,
  refreshNewsPage,
} from "../src/features/discover/news-feed";

describe("discover news feed", () => {
  it("returns the first local page by default", () => {
    const page = getNewsPage();

    expect(page.articles).toHaveLength(4);
    expect(page.articles[0]?.slug).toBe(localNewsFeed[0]?.slug);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe(4);
  });

  it("loads subsequent pages and reports when the feed is exhausted", () => {
    const secondPage = loadMoreNewsPage(4);
    const finalPage = loadMoreNewsPage(8);

    expect(secondPage.articles).toHaveLength(4);
    expect(secondPage.articles[0]?.slug).toBe(localNewsFeed[4]?.slug);
    expect(secondPage.hasMore).toBe(true);

    expect(finalPage.articles).toHaveLength(2);
    expect(finalPage.hasMore).toBe(false);
    expect(finalPage.nextCursor).toBe(localNewsFeed.length);
  });

  it("refreshes back to the first page", () => {
    const refreshed = refreshNewsPage();

    expect(refreshed).toEqual(getNewsPage(0));
  });

  it("resolves detail articles by slug and returns null for unknown slugs", () => {
    expect(getNewsArticleBySlug("youtube-payout-forecast-2026")?.title).toContain("YouTube");
    expect(getNewsArticleBySlug("missing-slug")).toBeNull();
  });
});
