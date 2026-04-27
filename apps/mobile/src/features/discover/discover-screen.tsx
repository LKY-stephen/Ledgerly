import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { AppIcon } from "../../components/app-icon";
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import {
  getNewsPage,
  loadMoreNewsPage,
  refreshNewsPage,
  type NewsArticle,
} from "./news-feed";
import { formatDiscoverPublishedDate } from "./discover-localization";

export function DiscoverScreen() {
  const router = useRouter();
  const { columns } = useResponsive();
  const { copy, palette, resolvedLocale } = useAppShell();
  const initialPage = getNewsPage(0, resolvedLocale);
  const [articles, setArticles] = useState<NewsArticle[]>(initialPage.articles);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const localizedPage = getNewsPage(0, resolvedLocale);
    setArticles(localizedPage.articles);
    setNextCursor(localizedPage.nextCursor);
    setHasMore(localizedPage.hasMore);
  }, [resolvedLocale]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 320));
    const refreshedPage = refreshNewsPage(resolvedLocale);
    setArticles(refreshedPage.articles);
    setNextCursor(refreshedPage.nextCursor);
    setHasMore(refreshedPage.hasMore);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 320));
    const nextPage = loadMoreNewsPage(nextCursor, resolvedLocale);
    setArticles((current) => [...current, ...nextPage.articles]);
    setNextCursor(nextPage.nextCursor);
    setHasMore(nextPage.hasMore);
    setIsLoadingMore(false);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
    >
      <FlatList
        key={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.container}
        data={articles}
        keyExtractor={(item) => item.slug}
        numColumns={columns}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>
              {copy.discover.emptyTitle}
            </Text>
            <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>
              {copy.discover.emptySummary}
            </Text>
          </View>
        }
        ListFooterComponent={
          articles.length > 0 ? (
            <View style={styles.footer}>
              {hasMore ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLoadMore}
                  style={[
                    styles.loadMoreButton,
                    {
                      backgroundColor: palette.paper,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator color={palette.accent} />
                  ) : null}
                  <Text style={[styles.loadMoreLabel, { color: palette.ink }]}>
                    {isLoadingMore
                      ? copy.discover.loadingMore
                      : copy.discover.loadMore}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>
                {copy.discover.eyebrow}
              </Text>
              <Text style={[styles.latestLabel, { color: palette.inkMuted }]}>
                {copy.discover.latestLabel}
              </Text>
              <Text style={[styles.title, { color: palette.ink }]}>
                {copy.discover.latestTitle}
              </Text>
              <Text style={[styles.summary, { color: palette.inkMuted }]}>
                {copy.discover.summary}
              </Text>
            </View>

            <View
              style={[
                styles.refreshHint,
                {
                  backgroundColor: palette.accentSoft,
                  borderColor: palette.border,
                },
              ]}
            >
              <AppIcon color={palette.accent} name="news" size={18} />
              <Text style={[styles.refreshHintLabel, { color: palette.ink }]}>
                {copy.discover.refreshHint}
              </Text>
              {Platform.OS === "web" ? (
                <Pressable
                  accessibilityLabel="Refresh"
                  accessibilityRole="button"
                  onPress={handleRefresh}
                  style={({ pressed }) => [
                    styles.webRefreshButton,
                    { opacity: pressed || isRefreshing ? 0.5 : 1 },
                  ]}
                >
                  <Ionicons color={palette.accent} name="refresh-outline" size={18} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        {...(Platform.OS !== "web" ? { onRefresh: handleRefresh, refreshing: isRefreshing } : {})}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(`/news/${item.slug}` as never);
            }}
            style={[
              styles.card,
              columns > 1 ? styles.cardMultiCol : null,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: palette.accentSoft },
                ]}
              >
                <Text style={[styles.categoryLabel, { color: palette.accent }]}>
                  {item.category}
                </Text>
              </View>
              <Text style={[styles.sourceLabel, { color: palette.inkMuted }]}>
                {item.source}
              </Text>
            </View>

            <Text style={[styles.cardTitle, { color: palette.ink }]}>
              {item.title}
            </Text>
            <Text style={[styles.cardSummary, { color: palette.inkMuted }]}>
              {item.summary}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <AppIcon color={palette.accent} name="time" size={16} />
                <Text style={[styles.metaText, { color: palette.inkMuted }]}>
                  {formatDiscoverPublishedDate(
                    item.publishedAt,
                    resolvedLocale,
                  )}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: palette.inkMuted }]}>
                {item.readMinutes} {copy.discover.readTimeLabel}
              </Text>
            </View>

            <Text style={[styles.openArticleLabel, { color: palette.accent }]}>
              {copy.discover.openArticle}
            </Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
    padding: 16,
  },
  cardMultiCol: {
    flex: 1,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnWrapper: {
    gap: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  container: {
    gap: 12,
    padding: 18,
    paddingBottom: 32,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 18,
  },
  emptySummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    paddingBottom: 18,
    paddingTop: 4,
  },
  header: {
    gap: 12,
  },
  hero: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 16,
  },
  latestLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
  },
  loadMoreLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  openArticleLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  refreshHint: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshHintLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  safeArea: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  webRefreshButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
