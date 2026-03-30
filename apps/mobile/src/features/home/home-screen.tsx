import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionCard } from "@creator-cfo/ui";

import { DatabaseHooksDemo } from "../database-demo/database-hooks-demo";
import { buildHomeSections } from "./sections";
import { AppIcon } from "../../components/app-icon";
import { IconMetricCard } from "../../components/icon-metric-card";
import { bootstrapLocalStorage } from "../../storage/bootstrap";
import type { BootstrapStatus } from "../../storage/status";
import { useAppShell } from "../app-shell/provider";

export function HomeScreen() {
  const { copy, palette, session, sessionDisplayName } = useAppShell();
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>({
    databaseName: "booting",
    fileCollectionCount: 0,
    fileVaultRoot: "booting",
    platformCount: 0,
    status: "idle",
    structuredTableCount: 0,
    summary: "Preparing local SQLite and file-vault contracts...",
  });
  const sections = buildHomeSections(copy, session);
  const storageCardRows = chunkItems(sections.storageCards, 2);

  useEffect(() => {
    let isMounted = true;

    bootstrapLocalStorage()
      .then((status) => {
        if (isMounted) {
          setBootstrapStatus(status);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setBootstrapStatus({
            databaseName: "unavailable",
            fileCollectionCount: 0,
            fileVaultRoot: "unavailable",
            platformCount: sections.platforms.length,
            status: "error",
            structuredTableCount: 0,
            summary:
              error instanceof Error
                ? error.message
                : "Local bootstrap failed with an unknown error.",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sections.platforms.length]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View
          style={[
            styles.hero,
            {
              backgroundColor: palette.heroEnd,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{sections.sessionTitle}</Text>
          <Text style={[styles.title, { color: palette.inkOnAccent }]}>{copy.home.focusTitle}</Text>
          <Text style={[styles.summary, { color: palette.inkOnAccent }]}>
            {sessionDisplayName}. {copy.home.heroSummary}
          </Text>

          <View style={styles.heroMetricGrid}>
            <View style={styles.metricRow}>
              {sections.heroMetrics.slice(0, 2).map((metric) => (
                <IconMetricCard
                  key={metric.label}
                  icon={metric.icon}
                  label={metric.label}
                  palette={palette}
                  style={styles.metricCard}
                  summary={metric.summary}
                  value={metric.value}
                />
              ))}
            </View>
            <View style={styles.metricRow}>
              <IconMetricCard
                icon="bootstrap"
                label={copy.home.metricBootstrapLabel}
                palette={palette}
                style={styles.metricCardWide}
                summary={copy.home.metricBootstrapSummary}
                value={
                  bootstrapStatus.status === "ready"
                    ? `${bootstrapStatus.structuredTableCount}`
                    : copy.home.metricBootstrapIdle
                }
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionStack}>
          <SectionCard
            eyebrow={copy.tabs.home}
            footer={
              <Text style={[styles.footerText, { color: palette.inkMuted }]}>{copy.home.moduleFooter}</Text>
            }
            palette={palette}
            title={copy.home.signalTitle}
          >
            <View style={styles.focusGrid}>
              <View style={styles.focusRow}>
                {sections.focusCards.slice(0, 2).map((card, index) => (
                  <View
                    key={card.title}
                    style={[
                      styles.focusCard,
                      styles.focusCardHalf,
                      {
                        backgroundColor: palette.accentSoft,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.focusHeader}>
                      <View style={[styles.focusIconWrap, { backgroundColor: palette.paperMuted }]}>
                        <AppIcon
                          color={palette.accent}
                          name={index === 0 ? "modules" : "workflow"}
                          size={18}
                        />
                      </View>
                      <Text style={[styles.focusTitle, { color: palette.ink }]}>{card.title}</Text>
                    </View>
                    <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{card.summary}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.focusRow}>
                {sections.focusCards.slice(2).map((card) => (
                  <View
                    key={card.title}
                    style={[
                      styles.focusCard,
                      styles.focusCardWide,
                      {
                        backgroundColor: palette.accentSoft,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.focusHeader}>
                      <View style={[styles.focusIconWrap, { backgroundColor: palette.paperMuted }]}>
                        <AppIcon color={palette.accent} name="profile" size={18} />
                      </View>
                      <Text style={[styles.focusTitle, { color: palette.ink }]}>{card.title}</Text>
                    </View>
                    <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{card.summary}</Text>
                  </View>
                ))}
              </View>
            </View>

            {sections.modules.map((module) => (
              <View key={module.slug} style={[styles.listRow, { borderTopColor: palette.divider }]}>
                <Text style={[styles.rowTitle, { color: palette.ink }]}>{module.title}</Text>
                <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{module.summary}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard
            eyebrow={copy.home.persistenceEyebrow}
            footer={
              <Text style={[styles.footerText, { color: palette.inkMuted }]}>{bootstrapStatus.summary}</Text>
            }
            palette={palette}
            title={copy.home.storageTitle}
          >
            <View style={styles.storageGrid}>
              {storageCardRows.map((row) => (
                <View key={row.map((card) => card.label).join("-")} style={styles.metricRow}>
                  {row.map((card) => (
                    <IconMetricCard
                      key={card.label}
                      icon={card.icon}
                      label={card.label}
                      palette={palette}
                      style={row.length === 1 ? styles.metricCardWide : styles.metricCard}
                      summary={card.summary}
                      value={card.value}
                    />
                  ))}
                </View>
              ))}
            </View>

            <Text style={[styles.subheading, { color: palette.ink }]}>{copy.home.collectionsTitle}</Text>
            {sections.storageCollections.map((collection) => (
              <View
                key={collection.slug}
                style={[styles.listRow, { borderTopColor: palette.divider }]}
              >
                <Text style={[styles.rowTitle, { color: palette.ink }]}>{collection.title}</Text>
                <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{collection.summary}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard
            eyebrow={copy.home.workflowEyebrow}
            footer={
              <Text style={[styles.footerText, { color: palette.inkMuted }]}>{copy.home.workflowFooter}</Text>
            }
            palette={palette}
            title={copy.home.workflowTitle}
          >
            {sections.workflowPrinciples.map((principle) => (
              <View
                key={principle.title}
                style={[styles.listRow, { borderTopColor: palette.divider }]}
              >
                <Text style={[styles.rowTitle, { color: palette.ink }]}>{principle.title}</Text>
                <Text style={[styles.rowSummary, { color: palette.inkMuted }]}>{principle.summary}</Text>
              </View>
            ))}
          </SectionCard>

          <DatabaseHooksDemo
            calculatedBadge={copy.discover.calculatedBadge}
            form1099NecCopy={copy.discover.form1099Nec}
            formScheduleCCopy={copy.discover.formScheduleC}
            isBootstrapped={bootstrapStatus.status === "ready"}
            manualBadge={copy.discover.manualBadge}
            palette={palette}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function chunkItems<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footerText: {
    fontSize: 13,
  },
  focusCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  focusCardHalf: {
    flex: 1,
  },
  focusCardWide: {
    flex: 1,
  },
  focusHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  focusIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  focusGrid: {
    gap: 10,
  },
  focusRow: {
    flexDirection: "row",
    gap: 10,
  },
  focusTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  hero: {
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 22,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  heroMetricGrid: {
    gap: 12,
    paddingTop: 10,
  },
  listRow: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metricCard: {
    flex: 1,
  },
  metricCardWide: {
    flex: 1,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  rowSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  sectionStack: {
    gap: 16,
  },
  storageGrid: {
    gap: 12,
  },
  subheading: {
    paddingTop: 8,
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
});
