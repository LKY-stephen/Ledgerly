import {
  buildTaxHelperLauncherState,
  type LedgerTaxHelperLauncherState,
} from "./ledger-tax-helper.shared";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { LedgerScopeId, LedgerYearOption } from "./ledger-reporting";

interface LedgerTaxHelperProps {
  selectedScope: LedgerScopeId;
  yearOptions: readonly LedgerYearOption[];
}

export function LedgerTaxHelper(props: LedgerTaxHelperProps) {
  const { selectedScope, yearOptions } = props;
  const launcherState: LedgerTaxHelperLauncherState = buildTaxHelperLauncherState({
    latestYearLabel: yearOptions[0]?.label ?? null,
    selectedScope,
    yearCount: yearOptions.length,
  });
  const disabledReason = launcherState.canOpen
    ? "This helper depends on the native local database runtime and is not active in the static web preview."
    : launcherState.note;

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Tax Report Helper</Text>
        <Text style={styles.title}>Preview derived tax rows from the business ledger.</Text>
        <Text style={styles.summary}>
          Native builds can review local tax helper rows and export linked evidence archives from the active package.
        </Text>
        <Text style={styles.note}>{disabledReason}</Text>
      </View>
      <Pressable accessibilityRole="button" disabled style={styles.button}>
        <Text style={styles.buttonLabel}>Open helper</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 32, 69, 0.2)",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#F4F9FF",
    borderColor: "rgba(0, 32, 69, 0.12)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    marginTop: 24,
    padding: 20,
  },
  copy: {
    gap: 8,
  },
  eyebrow: {
    color: "#0F5B99",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  note: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 13,
    lineHeight: 19,
  },
  summary: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: "#002045",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
});
