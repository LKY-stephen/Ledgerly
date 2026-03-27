import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SectionCard, StatPill, surfaceTokens } from "@creator-cfo/ui";

import { buildHomeSections } from "./sections";
import { bootstrapLocalStorage } from "../../storage/bootstrap";
import type { BootstrapStatus } from "../../storage/status";

const sections = buildHomeSections();

export function HomeScreen() {
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>({
    databaseName: "booting",
    fileCollectionCount: 0,
    fileVaultRoot: "booting",
    platformCount: sections.platforms.length,
    status: "idle",
    structuredTableCount: 0,
    summary: "Preparing local SQLite and file-vault contracts...",
  });

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
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Creator CFO mobile foundation</Text>
          <Text style={styles.title}>Finance control for creators, now local-first.</Text>
          <Text style={styles.summary}>
            This phase replaces the previous web and backend starter with an Expo / React Native
            app that owns structured finance data and document storage directly on device.
          </Text>

          <View style={styles.pills}>
            <StatPill label="Product modules" value={sections.modules.length.toString()} />
            <StatPill label="Supported platforms" value={sections.platforms.length.toString()} />
            <StatPill
              label={bootstrapStatus.status === "ready" ? "Tables ready" : "Bootstrap state"}
              value={
                bootstrapStatus.status === "ready"
                  ? bootstrapStatus.structuredTableCount.toString()
                  : bootstrapStatus.status
              }
            />
          </View>
        </View>

        <View style={styles.sectionStack}>
          <SectionCard
            eyebrow="Product scope"
            title="Operating modules"
            footer={<Text style={styles.footerText}>Shared via @creator-cfo/schemas.</Text>}
          >
            {sections.modules.map((module) => (
              <View key={module.slug} style={styles.listRow}>
                <Text style={styles.rowTitle}>{module.title}</Text>
                <Text style={styles.rowSummary}>{module.summary}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard
            eyebrow="Persistence"
            title="Local storage model"
            footer={<Text style={styles.footerText}>{bootstrapStatus.summary}</Text>}
          >
            {sections.storageCards.map((card) => (
              <View key={card.title} style={styles.storageMetric}>
                <Text style={styles.storageTitle}>{card.title}</Text>
                <Text style={styles.storageValue}>{card.value}</Text>
                <Text style={styles.rowSummary}>{card.label}</Text>
              </View>
            ))}

            <Text style={styles.subheading}>Document vault collections</Text>
            {sections.storageCollections.map((collection) => (
              <View key={collection.slug} style={styles.listRow}>
                <Text style={styles.rowTitle}>{collection.title}</Text>
                <Text style={styles.rowSummary}>{collection.summary}</Text>
              </View>
            ))}
          </SectionCard>

          <SectionCard
            eyebrow="Workflow"
            title="Guardrails for future slices"
            footer={<Text style={styles.footerText}>No backend until a later PRD says so.</Text>}
          >
            {sections.workflowPrinciples.map((principle) => (
              <View key={principle.title} style={styles.listRow}>
                <Text style={styles.rowTitle}>{principle.title}</Text>
                <Text style={styles.rowSummary}>{principle.summary}</Text>
              </View>
            ))}
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    color: "#79d7cd",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footerText: {
    color: "#61717d",
    fontSize: 13,
  },
  hero: {
    gap: 14,
    padding: 22,
    borderRadius: 30,
    backgroundColor: surfaceTokens.shell,
  },
  listRow: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(20, 33, 61, 0.08)",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 8,
  },
  rowSummary: {
    color: "#61717d",
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    color: "#14213d",
    fontSize: 16,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
    backgroundColor: surfaceTokens.shell,
  },
  sectionStack: {
    gap: 16,
  },
  storageMetric: {
    gap: 4,
    paddingVertical: 6,
  },
  storageTitle: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "700",
  },
  storageValue: {
    color: "#14213d",
    fontSize: 28,
    fontWeight: "700",
  },
  subheading: {
    paddingTop: 8,
    color: "#14213d",
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    color: "#d9efec",
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: "#fffdf9",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
});

