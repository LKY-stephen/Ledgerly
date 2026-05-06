import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  LedgerReportBody,
  LedgerGeneralLedgerDetailModal,
  type LedgerGeneralLedgerEntryView,
  type LedgerReportCopy,
} from "@ledgerly/ui";

import { useAppShell } from "../../app-shell/provider";
import { getLedgerRuntimeCopy } from "../../ledger/ledger-localization";
import { useLedgerScreen } from "../../ledger/use-ledger-screen";

export function ShowLedgerPanel() {
  const { copy, palette, resolvedLocale } = useAppShell();
  const runtimeCopy = getLedgerRuntimeCopy(resolvedLocale);
  const screenCopy = copy.ledgerScreen;
  const {
    isLoaded,
    snapshot,
    selectedScope,
    selectedView,
  } = useLedgerScreen();

  const reportCopy = useMemo<LedgerReportCopy>(
    () => ({
      cashAndBankLabel: runtimeCopy.journal.cashAndBank,
      fields: {
        amount: copy.ledger.parse.fieldAmount,
        date: copy.ledger.parse.fieldDate,
        description: copy.ledger.parse.fieldDescription,
        source: copy.ledger.parse.fieldSource,
        target: copy.ledger.parse.fieldTarget,
      },
      recordCard: {
        emptyValue: screenCopy.recordCard.emptyValue,
        equationResult: screenCopy.recordCard.equationResult,
        equationTitle: screenCopy.recordCard.equationTitle,
        memo: screenCopy.recordCard.memo,
        nonOwnerRule: screenCopy.recordCard.nonOwnerRule,
        ownerRule: screenCopy.recordCard.ownerRule,
        recordId: screenCopy.recordCard.recordId,
        side: screenCopy.recordCard.side,
        title: screenCopy.recordCard.title,
      },
      sections: {
        assets: screenCopy.sections.assets,
        credit: screenCopy.sections.credit,
        debit: screenCopy.sections.debit,
        equity: screenCopy.sections.equity,
        expenses: screenCopy.sections.expenses,
        journalPersonal: screenCopy.sections.journalPersonal,
        journalRecent: screenCopy.sections.journalRecent,
        liabilities: screenCopy.sections.liabilities,
        netIncome: screenCopy.sections.netIncome,
        netIncomeSummary: screenCopy.sections.netIncomeSummary,
        pnlOnlyBody: screenCopy.sections.pnlOnlyBody,
        pnlOnlyTitle: screenCopy.sections.pnlOnlyTitle,
        revenue: screenCopy.sections.revenue,
      },
    }),
    [copy.ledger.parse, runtimeCopy.journal.cashAndBank, screenCopy],
  );

  const [selectedEntry, setSelectedEntry] =
    useState<LedgerGeneralLedgerEntryView | null>(null);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.inkMuted} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <LedgerReportBody
          copy={reportCopy}
          onSelectEntry={setSelectedEntry}
          palette={palette}
          selectedScope={selectedScope}
          selectedView={selectedView}
          snapshot={snapshot}
        />
      </ScrollView>

      <LedgerGeneralLedgerDetailModal
        copy={reportCopy}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
});
