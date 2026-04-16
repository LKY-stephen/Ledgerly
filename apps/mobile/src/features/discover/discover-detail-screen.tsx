import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { AppIcon } from "../../components/app-icon";
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import { formatDiscoverPublishedDate } from "./discover-localization";
import { getNewsArticleBySlug } from "./news-feed";

function resolveSlug(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function DiscoverDetailScreen() {
  const router = useRouter();
  const { isExpanded } = useResponsive();
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const { copy, palette, resolvedLocale } = useAppShell();
  const article = getNewsArticleBySlug(resolveSlug(slug), resolvedLocale);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="discover-detail-screen"
    >
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: palette.shell,
            borderBottomColor: palette.divider,
          },
        ]}
      >
        <BackHeaderBar
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/discover");
            }
          }}
          palette={palette}
          title={copy.common.appName}
        />
      </View>
      <ScrollView
        contentContainerStyle={[styles.container, isExpanded ? styles.containerWide : null]}
        showsVerticalScrollIndicator={false}
      >
        {article ? (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: palette.paper,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.categoryPill,
                    { backgroundColor: palette.accentSoft },
                  ]}
                >
                  <Text
                    style={[styles.categoryLabel, { color: palette.accent }]}
                  >
                    {article.category}
                  </Text>
                </View>
                <Text style={[styles.eyebrow, { color: palette.accent }]}>
                  {copy.discover.latestLabel}
                </Text>
              </View>

              <Text style={[styles.title, { color: palette.ink }]}>
                {article.title}
              </Text>
              <Text style={[styles.summary, { color: palette.inkMuted }]}>
                {article.summary}
              </Text>

              <View style={styles.metaGrid}>
                <View
                  style={[
                    styles.metaCard,
                    {
                      backgroundColor: palette.shell,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: palette.inkMuted }]}>
                    {copy.discover.sourceLabel}
                  </Text>
                  <Text style={[styles.metaValue, { color: palette.ink }]}>
                    {article.source}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metaCard,
                    {
                      backgroundColor: palette.shell,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.metaLabel, { color: palette.inkMuted }]}>
                    {copy.discover.publishedLabel}
                  </Text>
                  <Text style={[styles.metaValue, { color: palette.ink }]}>
                    {formatDiscoverPublishedDate(
                      article.publishedAt,
                      resolvedLocale,
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.readTimeRow,
                  {
                    backgroundColor: palette.accentSoft,
                    borderColor: palette.border,
                  },
                ]}
              >
                <AppIcon color={palette.accent} name="time" size={17} />
                <Text style={[styles.readTimeText, { color: palette.ink }]}>
                  {article.readMinutes} {copy.discover.readTimeLabel}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.bodyCard,
                {
                  backgroundColor: palette.paper,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              {article.body.map((paragraph) => (
                <Text
                  key={paragraph}
                  style={[styles.paragraph, { color: palette.ink }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>
              {copy.discover.missingArticleTitle}
            </Text>
            <Text style={[styles.emptySummary, { color: palette.inkMuted }]}>
              {copy.discover.missingArticleSummary}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  bodyCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
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
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  containerWide: {
    alignSelf: "center",
    maxWidth: 720,
    width: "100%",
  },
  emptyState: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  emptySummary: {
    fontSize: 15,
    lineHeight: 23,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
  },
  readTimeRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  readTimeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
  },
});
