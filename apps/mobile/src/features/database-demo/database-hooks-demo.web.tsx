import { Pressable, StyleSheet, Text, View } from "react-native";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";
import { SectionCard, type SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { Form1099NecSection } from "../form-1099-nec/form-1099-nec-section";

interface DatabaseHooksDemoProps {
  form1099NecCopy: AppCopy["discover"]["form1099Nec"];
  isBootstrapped: boolean;
  manualBadge: string;
  palette: SurfaceTokens;
}

const storagePlan = getLocalStorageBootstrapPlan();

export function DatabaseHooksDemo({
  form1099NecCopy,
  isBootstrapped,
  manualBadge,
  palette,
}: DatabaseHooksDemoProps) {
  return (
    <SectionCard
      eyebrow="Hooks demo"
      title="Interact with SQLite through hooks"
      footer={
        <Text style={styles.footerText}>
          Web preview keeps this section explanatory so the static export stays stable; the native
          app runs the same flow against `{storagePlan.databaseName}`.
        </Text>
      }
    >
      <Text style={styles.summary}>
        Native demo flow:
      </Text>
      <View style={styles.listRow}>
        <Text style={styles.rowTitle}>1. Mount `SQLiteProvider`</Text>
        <Text style={styles.rowSummary}>
          Use the shared database name and schema initialization helper before rendering hook
          consumers.
        </Text>
      </View>
      <View style={styles.listRow}>
        <Text style={styles.rowTitle}>2. Query with a custom hook</Text>
        <Text style={styles.rowSummary}>
          `useDatabaseDemo()` wraps `useSQLiteContext()` and returns multi-record CRUD actions,
          selected-record state, selected-field state, and current-database report previews built
          from the accounting reporting view.
        </Text>
      </View>
      <View style={styles.listRow}>
        <Text style={styles.rowTitle}>3. Switch report tabs</Text>
        <Text style={styles.rowSummary}>
          The native demo lets you create multiple demo `records`, select one record, update one
          chosen field, delete the selected record, and switch across postings, journal, general
          ledger, balance sheet, and profit/loss views for the current demo database.
        </Text>
      </View>
      <View style={styles.listRow}>
        <Text style={styles.rowTitle}>4. Surface ledger health</Text>
        <Text style={styles.rowSummary}>
          The native card also shows a warning if the current demo ledger is unbalanced, using the
          same accounting posting surface as the report tabs.
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <Form1099NecSection
          copy={form1099NecCopy}
          manualBadge={manualBadge}
          palette={palette}
          renderLauncher={(openPreview) => (
            <Pressable accessibilityRole="button" onPress={openPreview} style={styles.button}>
              <Text style={styles.buttonLabel}>{form1099NecCopy.openPreview}</Text>
            </Pressable>
          )}
        />
      </View>
      <Text style={styles.summary}>
        Bootstrap state: {isBootstrapped ? "metadata ready" : "waiting for preview bootstrap"}.
      </Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#f8f2e7",
    borderColor: "rgba(20, 33, 61, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: "#14213d",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  footerText: {
    color: "#61717d",
    fontSize: 13,
  },
  listRow: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(20, 33, 61, 0.08)",
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
  summary: {
    color: "#465560",
    fontSize: 15,
    lineHeight: 22,
  },
});
