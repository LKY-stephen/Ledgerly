import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SQLiteProvider } from "expo-sqlite";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";
import { SectionCard, surfaceTokens, type SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { initializeLocalDatabase } from "../../storage/database";
import { Form1099NecSection } from "../form-1099-nec/form-1099-nec-section";
import { buildDatabaseDemoMetrics, databaseDemoReportTabs } from "./demo-data";
import type {
  DatabaseDemoJournalEntryPreview,
  DatabaseDemoLedgerAccountPreview,
  DatabaseDemoReportTab,
  DatabaseDemoSnapshot,
  DatabaseDemoStatementSectionPreview,
} from "./demo-data";
import { useDatabaseDemo } from "./use-database-demo.native";

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
  if (!isBootstrapped) {
    return (
      <SectionCard
        eyebrow="Hooks demo"
        title="Interact with SQLite through hooks"
        footer={<Text style={styles.footerText}>Waiting for local storage bootstrap.</Text>}
      >
        <Text style={styles.summary}>
          This demo mounts a SQLite provider and reads or writes sample finance rows through a
          custom hook once the storage bootstrap is ready.
        </Text>
      </SectionCard>
    );
  }

  return (
    <SQLiteProvider databaseName={storagePlan.databaseName} onInit={initializeLocalDatabase}>
      <DatabaseHooksDemoCard
        form1099NecCopy={form1099NecCopy}
        manualBadge={manualBadge}
        palette={palette}
      />
    </SQLiteProvider>
  );
}

function DatabaseHooksDemoCard({
  form1099NecCopy,
  manualBadge,
  palette,
}: Pick<DatabaseHooksDemoProps, "form1099NecCopy" | "manualBadge" | "palette">) {
  const [selectedReportTab, setSelectedReportTab] = useState<DatabaseDemoReportTab>("postings");
  const {
    createRecord,
    deleteRecord,
    editableFields,
    error,
    isBusy,
    isLoaded,
    refresh,
    selectField,
    selectRecord,
    selectedField,
    selectedRecordId,
    snapshot,
    updateSelectedRecord,
  } = useDatabaseDemo();
  const metrics = buildDatabaseDemoMetrics(snapshot);
  const hasRecord = snapshot.counts.recordCount > 0;
  const selectedFieldOption =
    editableFields.find((option) => option.value === selectedField) ?? editableFields[0];
  const selectedReportTabOption =
    databaseDemoReportTabs.find((tab) => tab.value === selectedReportTab) ?? databaseDemoReportTabs[0];
  const selectedRecord = snapshot.recentRecords.find((record) => record.recordId === selectedRecordId) ?? null;

  return (
    <SectionCard
      eyebrow="Hooks demo"
      title="CRUD records through hooks"
      footer={
        <Text style={styles.footerText}>
          `SQLiteProvider` opens `{storagePlan.databaseName}` and `useDatabaseDemo()` wraps
          `useSQLiteContext()` for multi-record CRUD plus current-database accounting report tabs
          powered by `accounting_posting_lines_v`.
        </Text>
      }
    >
      <Text style={styles.summary}>
        This sample now keeps CRUD and reporting in one place: create deterministic `records`,
        select which record is active, choose one editable field to update, and switch among
        postings, journal, general ledger, balance sheet, and profit/loss views built from the
        current demo database.
      </Text>

      <View style={styles.metricRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {snapshot.counts.journalEntryCount > 0 ? (
        snapshot.ledgerHealth.isBalanced ? (
          <View style={styles.healthCard}>
            <Text style={styles.healthTitle}>Ledger balanced</Text>
            <Text style={styles.healthText}>
              Debits {snapshot.ledgerHealth.debitTotalLabel} · credits{" "}
              {snapshot.ledgerHealth.creditTotalLabel}
            </Text>
          </View>
        ) : (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Ledger warning</Text>
            <Text style={styles.warningText}>{snapshot.ledgerHealth.warningText}</Text>
            <Text style={styles.warningMeta}>
              Debits {snapshot.ledgerHealth.debitTotalLabel} · credits{" "}
              {snapshot.ledgerHealth.creditTotalLabel}
            </Text>
          </View>
        )
      ) : null}

      <Text style={styles.subheading}>Selected field</Text>
      <View style={styles.selectionRow}>
        {editableFields.map((field) => (
          <SelectionChip
            key={field.value}
            disabled={isBusy || !hasRecord}
            isSelected={field.value === selectedField}
            label={field.label}
            onPress={() => {
              selectField(field.value);
            }}
          />
        ))}
      </View>
      <Text style={styles.selectionHint}>
        {hasRecord
          ? selectedFieldOption?.description
          : "Create a record first, then pick which field the update action should mutate."}
      </Text>

      <View style={styles.buttonRow}>
        <DemoButton
          disabled={isBusy || !isLoaded}
          label="Create record"
          onPress={() => {
            void createRecord();
          }}
          tone="accent"
        />
        <DemoButton
          disabled={isBusy || !selectedRecordId}
          label="Update selected field"
          onPress={() => {
            void updateSelectedRecord();
          }}
          tone="neutral"
        />
        <DemoButton
          disabled={isBusy || !selectedRecordId}
          label="Delete selected record"
          onPress={() => {
            void deleteRecord();
          }}
          tone="neutral"
        />
        <DemoButton
          disabled={isBusy || !isLoaded}
          label="Refresh"
          onPress={() => {
            void refresh();
          }}
          tone="neutral"
        />
        <Form1099NecSection
          copy={form1099NecCopy}
          manualBadge={manualBadge}
          palette={palette}
          renderLauncher={(openPreview) => (
            <DemoButton
              disabled={false}
              label={form1099NecCopy.openPreview}
              onPress={openPreview}
              tone="neutral"
            />
          )}
        />
      </View>

      {selectedRecord ? (
        <Text style={styles.selectionSummary}>
          Selected record: {selectedRecord.description} ({selectedRecord.recordId}) with field{" "}
          {selectedFieldOption?.label.toLowerCase()}.
        </Text>
      ) : (
        <Text style={styles.selectionSummary}>
          No record is selected yet. Create one or more records to activate the selection flow.
        </Text>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.subheading}>Demo records</Text>
      {snapshot.recentRecords.length === 0 ? (
        <Text style={styles.emptyText}>
          Create one or more demo records to inspect record queries and derived postings.
        </Text>
      ) : (
        snapshot.recentRecords.map((record) => (
          <Pressable
            key={record.recordId}
            disabled={isBusy}
            onPress={() => {
              void selectRecord(record.recordId);
            }}
            style={({ pressed }) => [
              styles.recordRow,
              record.recordId === selectedRecordId ? styles.recordRowSelected : null,
              pressed && !isBusy ? styles.recordRowPressed : null,
            ]}
          >
            <Text style={styles.rowTitle}>
              {record.description} · gross {record.grossAmountLabel}
            </Text>
            <Text style={styles.rowSummary}>
              {record.recordKind} · {record.status} · net {record.netAmountLabel} ·{" "}
              {record.recognizedOn}
            </Text>
            <Text style={styles.recordMeta}>
              {record.recordId === selectedRecordId ? "Selected" : "Tap to select"} · {record.recordId}
            </Text>
          </Pressable>
        ))
      )}

      <Text style={styles.subheading}>Current database reports</Text>
      <View style={styles.selectionRow}>
        {databaseDemoReportTabs.map((tab) => (
          <SelectionChip
            key={tab.value}
            disabled={isBusy}
            isSelected={tab.value === selectedReportTab}
            label={tab.label}
            onPress={() => {
              setSelectedReportTab(tab.value);
            }}
          />
        ))}
      </View>
      <Text style={styles.selectionHint}>{selectedReportTabOption?.description}</Text>

      <DatabaseDemoReportPanel
        selectedRecordId={selectedRecordId}
        selectedReportTab={selectedReportTab}
        snapshot={snapshot}
      />

      <Text style={styles.summary}>{snapshot.summary}</Text>
    </SectionCard>
  );
}

interface DemoButtonProps {
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: "accent" | "neutral";
}

function DemoButton({ disabled, label, onPress, tone }: DemoButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "accent" ? styles.buttonAccent : styles.buttonNeutral,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text style={tone === "accent" ? styles.buttonAccentLabel : styles.buttonNeutralLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

interface SelectionChipProps {
  disabled: boolean;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function SelectionChip({ disabled, isSelected, label, onPress }: SelectionChipProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionChip,
        isSelected ? styles.selectionChipSelected : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text style={isSelected ? styles.selectionChipSelectedLabel : styles.selectionChipLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

interface DatabaseDemoReportPanelProps {
  selectedRecordId: string | null;
  selectedReportTab: DatabaseDemoReportTab;
  snapshot: DatabaseDemoSnapshot;
}

function DatabaseDemoReportPanel({
  selectedRecordId,
  selectedReportTab,
  snapshot,
}: DatabaseDemoReportPanelProps) {
  if (selectedReportTab === "postings") {
    if (snapshot.selectedPostingLines.length === 0) {
      return (
        <Text style={styles.emptyText}>
          {selectedRecordId
            ? "This selected record has no derived posting lines yet."
            : "Select or create a record to inspect derived posting lines."}
        </Text>
      );
    }

    return (
      <>
        {snapshot.selectedPostingLines.map((line) => (
          <View key={`${line.lineNo}-${line.accountRole}`} style={styles.listRow}>
            <Text style={styles.rowTitle}>
              Line {line.lineNo} · {line.accountName}
            </Text>
            <Text style={styles.rowSummary}>
              {line.accountRole} · {line.direction} · {line.amountLabel}
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (selectedReportTab === "journal") {
    if (snapshot.journalEntries.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Create one or more postable demo records to inspect journal entries.
        </Text>
      );
    }

    return (
      <>
        {snapshot.journalEntries.map((entry) => (
          <JournalEntryCard key={entry.recordId} entry={entry} />
        ))}
      </>
    );
  }

  if (selectedReportTab === "generalLedger") {
    if (snapshot.ledgerAccounts.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Create one or more postable demo records to inspect general-ledger balances and activity.
        </Text>
      );
    }

    return (
      <>
        {snapshot.ledgerAccounts.map((account) => (
          <LedgerAccountCard
            key={`${account.accountCode}-${account.accountName}`}
            account={account}
          />
        ))}
      </>
    );
  }

  if (selectedReportTab === "balanceSheet") {
    if (snapshot.balanceSheetSections.length === 0) {
      return (
        <Text style={styles.emptyText}>
          Create one or more postable demo records to inspect the balance sheet.
        </Text>
      );
    }

    return (
      <>
        {snapshot.balanceSheetSections.map((section) => (
          <StatementSectionCard key={section.title} section={section} />
        ))}
      </>
    );
  }

  if (snapshot.profitAndLossSections.length === 0) {
    return (
      <Text style={styles.emptyText}>
        Create one or more postable demo records to inspect profit and loss output.
      </Text>
    );
  }

  return (
    <>
      {snapshot.profitAndLossSections.map((section) => (
        <StatementSectionCard key={section.title} section={section} />
      ))}
    </>
  );
}

interface JournalEntryCardProps {
  entry: DatabaseDemoJournalEntryPreview;
}

function JournalEntryCard({ entry }: JournalEntryCardProps) {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.rowTitle}>
        {entry.postingOn} · {entry.description}
      </Text>
      <Text style={styles.reportMeta}>
        {entry.recordId} · dr {entry.debitTotalLabel} · cr {entry.creditTotalLabel}
      </Text>
      {entry.lines.map((line) => (
        <View key={`${entry.recordId}-${line.lineNo}-${line.accountRole}`} style={styles.nestedRow}>
          <Text style={styles.nestedRowTitle}>
            Line {line.lineNo} · {line.accountLabel}
          </Text>
          <Text style={styles.rowSummary}>
            {line.accountRole} · {line.direction} · {line.amountLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface LedgerAccountCardProps {
  account: DatabaseDemoLedgerAccountPreview;
}

function LedgerAccountCard({ account }: LedgerAccountCardProps) {
  return (
    <View style={styles.reportCard}>
      <Text style={styles.rowTitle}>
        {account.accountCode} · {account.accountName}
      </Text>
      <Text style={styles.reportMeta}>
        {account.accountType} · {account.normalBalance} normal · balance {account.balanceDirection}{" "}
        {account.balanceLabel}
      </Text>
      <Text style={styles.reportMeta}>
        Total debits {account.debitTotalLabel} · total credits {account.creditTotalLabel}
      </Text>
      {account.activityLines.map((line) => (
        <View key={`${account.accountCode}-${line.recordId}-${line.postingOn}-${line.summary}`} style={styles.nestedRow}>
          <Text style={styles.nestedRowTitle}>
            {line.postingOn} · {line.recordId}
          </Text>
          <Text style={styles.rowSummary}>
            {line.summary} · {line.direction} · {line.amountLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface StatementSectionCardProps {
  section: DatabaseDemoStatementSectionPreview;
}

function StatementSectionCard({ section }: StatementSectionCardProps) {
  return (
    <View style={styles.reportCard}>
      <View style={styles.statementHeader}>
        <Text style={styles.rowTitle}>{section.title}</Text>
        <Text style={styles.statementTotal}>{section.totalLabel}</Text>
      </View>
      {section.lines.map((line) => (
        <View key={`${section.title}-${line.label}`} style={styles.statementRow}>
          <Text style={styles.rowSummary}>{line.label}</Text>
          <Text style={styles.statementLineAmount}>{line.amountLabel}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  buttonAccent: {
    backgroundColor: surfaceTokens.accent,
    borderColor: surfaceTokens.accent,
  },
  buttonAccentLabel: {
    color: "#f8fffd",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonNeutral: {
    backgroundColor: "#f8f2e7",
    borderColor: surfaceTokens.border,
  },
  buttonNeutralLabel: {
    color: "#14213d",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emptyText: {
    color: "#61717d",
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#a61b1b",
    fontSize: 14,
    fontWeight: "600",
  },
  footerText: {
    color: "#61717d",
    fontSize: 13,
  },
  healthCard: {
    gap: 4,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#eefaf6",
    borderWidth: 1,
    borderColor: "rgba(23, 125, 87, 0.18)",
  },
  healthText: {
    color: "#3d5e52",
    fontSize: 14,
    lineHeight: 20,
  },
  healthTitle: {
    color: surfaceTokens.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  listRow: {
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(20, 33, 61, 0.08)",
  },
  metricCard: {
    flex: 1,
    minWidth: 88,
    gap: 4,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#f2fbf8",
  },
  metricLabel: {
    color: "#61717d",
    fontSize: 13,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricValue: {
    color: surfaceTokens.accent,
    fontSize: 24,
    fontWeight: "700",
  },
  nestedRow: {
    gap: 4,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(20, 33, 61, 0.08)",
  },
  nestedRowTitle: {
    color: "#284251",
    fontSize: 14,
    fontWeight: "700",
  },
  recordMeta: {
    color: "#61717d",
    fontSize: 13,
    fontWeight: "600",
  },
  recordRow: {
    gap: 4,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20, 33, 61, 0.08)",
    backgroundColor: "#fffaf2",
  },
  recordRowPressed: {
    transform: [{ scale: 0.99 }],
  },
  recordRowSelected: {
    borderColor: surfaceTokens.accent,
    backgroundColor: "#eefaf6",
  },
  reportCard: {
    gap: 6,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(20, 33, 61, 0.08)",
    backgroundColor: "#fffaf2",
  },
  reportMeta: {
    color: "#61717d",
    fontSize: 13,
    lineHeight: 18,
  },
  rowSummary: {
    color: "#61717d",
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    color: surfaceTokens.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surfaceTokens.border,
    backgroundColor: "#fffaf2",
  },
  selectionChipLabel: {
    color: surfaceTokens.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  selectionChipSelected: {
    borderColor: surfaceTokens.accent,
    backgroundColor: "#eefaf6",
  },
  selectionChipSelectedLabel: {
    color: surfaceTokens.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  selectionHint: {
    color: "#61717d",
    fontSize: 14,
    lineHeight: 20,
  },
  selectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectionSummary: {
    color: "#465560",
    fontSize: 14,
    lineHeight: 20,
  },
  statementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  statementLineAmount: {
    color: surfaceTokens.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  statementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(20, 33, 61, 0.08)",
  },
  statementTotal: {
    color: surfaceTokens.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  subheading: {
    paddingTop: 6,
    color: surfaceTokens.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    color: "#465560",
    fontSize: 15,
    lineHeight: 22,
  },
  warningCard: {
    gap: 4,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#fff2ef",
    borderWidth: 1,
    borderColor: "rgba(166, 27, 27, 0.16)",
  },
  warningMeta: {
    color: "#7c3535",
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    color: "#8c2f2f",
    fontSize: 14,
    lineHeight: 20,
  },
  warningTitle: {
    color: "#a61b1b",
    fontSize: 14,
    fontWeight: "700",
  },
});
