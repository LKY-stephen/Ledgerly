import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "../../components/app-icon";
import { useAppShell } from "../app-shell/provider";
import {
  getNewsPage,
  loadMoreNewsPage,
  refreshNewsPage,
  type NewsArticle,
} from "./news-feed";

export function DiscoverScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const initialPage = getNewsPage();
  const [articles, setArticles] = useState<NewsArticle[]>(initialPage.articles);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 320));
    const refreshedPage = refreshNewsPage();
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
    const nextPage = loadMoreNewsPage(nextCursor);
    setArticles((current) => [...current, ...nextPage.articles]);
    setNextCursor(nextPage.nextCursor);
    setHasMore(nextPage.hasMore);
    setIsLoadingMore(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <FlatList
        contentContainerStyle={styles.container}
        data={articles}
        keyExtractor={(item) => item.slug}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>{copy.discover.emptyTitle}</Text>
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
                    { backgroundColor: palette.paper, borderColor: palette.border },
                  ]}
                >
                  {isLoadingMore ? <ActivityIndicator color={palette.accent} /> : null}
                  <Text style={[styles.loadMoreLabel, { color: palette.ink }]}>
                    {isLoadingMore ? copy.discover.loadingMore : copy.discover.loadMore}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.discover.eyebrow}</Text>
              <Text style={[styles.latestLabel, { color: palette.inkMuted }]}>
                {copy.discover.latestLabel}
              </Text>
              <Text style={[styles.title, { color: palette.ink }]}>{copy.discover.latestTitle}</Text>
              <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.discover.summary}</Text>
            </View>

            <View
              style={[
                styles.refreshHint,
                { backgroundColor: palette.accentSoft, borderColor: palette.border },
              ]}
            >
              <AppIcon color={palette.accent} name="news" size={18} />
              <Text style={[styles.refreshHintLabel, { color: palette.ink }]}>{copy.discover.refreshHint}</Text>
            </View>
          </View>
        }
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push(`/news/${item.slug}`);
            }}
            style={[
              styles.card,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.categoryPill, { backgroundColor: palette.accentSoft }]}>
                <Text style={[styles.categoryLabel, { color: palette.accent }]}>{item.category}</Text>
              </View>
              <Text style={[styles.sourceLabel, { color: palette.inkMuted }]}>{item.source}</Text>
            </View>

            <Text style={[styles.cardTitle, { color: palette.ink }]}>{item.title}</Text>
            <Text style={[styles.cardSummary, { color: palette.inkMuted }]}>{item.summary}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <AppIcon color={palette.accent} name="time" size={16} />
                <Text style={[styles.metaText, { color: palette.inkMuted }]}>
                  {new Date(item.publishedAt).toLocaleDateString()}
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
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  container: {
    gap: 14,
    padding: 20,
    paddingBottom: 36,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  emptySummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 6,
  },
  header: {
    gap: 14,
  },
  hero: {
    gap: 10,
  },
  latestLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadMoreButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  loadMoreLabel: {
    fontSize: 15,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  refreshHint: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  refreshHintLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  safeArea: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
