import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SectionCard } from "./section-card";
import { StatPill } from "./stat-pill";
import { surfaceTokens, type SurfaceTokens } from "./tokens";

export type LedgerReportCellTone =
  | "default"
  | "muted"
  | "negative"
  | "positive";

export interface LedgerReportSummaryItem {
  id: string;
  label: string;
  value: string;
}

export interface GeneralLedgerTableColumn {
  id: string;
  label: string;
}

export interface GeneralLedgerTableCell {
  columnId: string;
  tone?: LedgerReportCellTone;
  value: string;
}

export interface GeneralLedgerTableRow {
  cells: readonly GeneralLedgerTableCell[];
  id: string;
}

export interface GeneralLedgerTableProps {
  columns: readonly GeneralLedgerTableColumn[];
  emptyLabel?: string;
  palette?: SurfaceTokens;
  rows: readonly GeneralLedgerTableRow[];
  summaryItems?: readonly LedgerReportSummaryItem[];
  testID?: string;
  title: string;
}

export interface LedgerValueRow {
  id: string;
  label: string;
  note?: string;
  tone?: LedgerReportCellTone;
  value: string;
}

export interface BalanceSheetTableProps {
  emptyLabel?: string;
  footer?: string;
  palette?: SurfaceTokens;
  rows: readonly LedgerValueRow[];
  summaryItems?: readonly LedgerReportSummaryItem[];
  testID?: string;
  title: string;
}

export interface ProfitAndLossSection {
  id: string;
  rows: readonly LedgerValueRow[];
  title: string;
}

export interface ProfitAndLossTableProps {
  emptyLabel?: string;
  footer?: string;
  netIncomeLabel: string;
  netIncomeValue: string;
  palette?: SurfaceTokens;
  sections: readonly ProfitAndLossSection[];
  summaryItems?: readonly LedgerReportSummaryItem[];
  testID?: string;
  title: string;
}

export function GeneralLedgerTable({
  columns,
  emptyLabel = "No entries available.",
  palette = surfaceTokens,
  rows,
  summaryItems = [],
  testID,
  title,
}: GeneralLedgerTableProps) {
  return (
    <SectionCard palette={palette} title={title}>
      <View style={styles.contentStack} testID={testID}>
        {summaryItems.length ? (
          <SummaryStrip items={summaryItems} palette={palette} />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.tableShell, { borderColor: palette.border }]}>
            <View
              style={[
                styles.tableHeaderRow,
                {
                  backgroundColor: palette.paperMuted,
                  borderBottomColor: palette.border,
                },
              ]}
            >
              {columns.map((column) => (
                <View
                  key={column.id}
                  style={[
                    styles.tableCell,
                    getGeneralLedgerColumnStyle(column.id),
                  ]}
                >
                  <Text style={[styles.tableHeaderLabel, { color: palette.inkMuted }]}>
                    {column.label}
                  </Text>
                </View>
              ))}
            </View>

            {rows.length ? (
              rows.map((row) => (
                <View
                  key={row.id}
                  style={[
                    styles.tableBodyRow,
                    { borderBottomColor: palette.divider },
                  ]}
                >
                  {columns.map((column) => {
                    const cell = row.cells.find(
                      (candidate) => candidate.columnId === column.id,
                    );

                    return (
                      <View
                        key={column.id}
                        style={[
                          styles.tableCell,
                          getGeneralLedgerColumnStyle(column.id),
                        ]}
                      >
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.tableValue,
                            { color: getToneColor(cell?.tone, palette) },
                            column.id === "amount"
                              ? styles.amountValue
                              : null,
                          ]}
                        >
                          {cell?.value ?? ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateLabel, { color: palette.inkMuted }]}>
                  {emptyLabel}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SectionCard>
  );
}

export function BalanceSheetTable({
  emptyLabel = "No balance rows available.",
  footer,
  palette = surfaceTokens,
  rows,
  summaryItems = [],
  testID,
  title,
}: BalanceSheetTableProps) {
  return (
    <SectionCard palette={palette} title={title}>
      <View style={styles.contentStack} testID={testID}>
        {summaryItems.length ? (
          <SummaryStrip items={summaryItems} palette={palette} />
        ) : null}

        {rows.length ? (
          <View style={[styles.valueList, { borderColor: palette.border }]}>
            {rows.map((row, index) => (
              <View
                key={row.id}
                style={[
                  styles.valueRow,
                  index < rows.length - 1
                    ? {
                        borderBottomColor: palette.divider,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      }
                    : null,
                ]}
              >
                <View style={styles.valueRowCopy}>
                  <Text style={[styles.valueRowLabel, { color: palette.ink }]}>
                    {row.label}
                  </Text>
                  {row.note ? (
                    <Text style={[styles.valueRowNote, { color: palette.inkMuted }]}>
                      {row.note}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.valueRowAmount,
                    { color: getToneColor(row.tone, palette) },
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateLabel, { color: palette.inkMuted }]}>
              {emptyLabel}
            </Text>
          </View>
        )}

        {footer ? (
          <Text style={[styles.footerLabel, { color: palette.inkMuted }]}>
            {footer}
          </Text>
        ) : null}
      </View>
    </SectionCard>
  );
}

export function ProfitAndLossTable({
  emptyLabel = "No profit and loss rows available.",
  footer,
  netIncomeLabel,
  netIncomeValue,
  palette = surfaceTokens,
  sections,
  summaryItems = [],
  testID,
  title,
}: ProfitAndLossTableProps) {
  const hasRows = sections.some((section) => section.rows.length > 0);

  return (
    <SectionCard palette={palette} title={title}>
      <View style={styles.contentStack} testID={testID}>
        {summaryItems.length ? (
          <SummaryStrip items={summaryItems} palette={palette} />
        ) : null}

        {hasRows ? (
          <View style={styles.sectionStack}>
            {sections.map((section) => (
              <View
                key={section.id}
                style={[
                  styles.valueList,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.valueSectionHeader,
                    {
                      backgroundColor: palette.paperMuted,
                      borderBottomColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.valueSectionTitle, { color: palette.ink }]}>
                    {section.title}
                  </Text>
                </View>
                {section.rows.length ? (
                  section.rows.map((row, index) => (
                    <View
                      key={row.id}
                      style={[
                        styles.valueRow,
                        index < section.rows.length - 1
                          ? {
                              borderBottomColor: palette.divider,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                            }
                          : null,
                      ]}
                    >
                      <View style={styles.valueRowCopy}>
                        <Text style={[styles.valueRowLabel, { color: palette.ink }]}>
                          {row.label}
                        </Text>
                        {row.note ? (
                          <Text
                            style={[
                              styles.valueRowNote,
                              { color: palette.inkMuted },
                            ]}
                          >
                            {row.note}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.valueRowAmount,
                          { color: getToneColor(row.tone, palette) },
                        ]}
                      >
                        {row.value}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text
                      style={[
                        styles.emptyStateLabel,
                        { color: palette.inkMuted },
                      ]}
                    >
                      {emptyLabel}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateLabel, { color: palette.inkMuted }]}>
              {emptyLabel}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.netIncomeCard,
            {
              backgroundColor: palette.paperMuted,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.netIncomeLabel, { color: palette.inkMuted }]}>
            {netIncomeLabel}
          </Text>
          <Text style={[styles.netIncomeValue, { color: palette.ink }]}>
            {netIncomeValue}
          </Text>
        </View>

        {footer ? (
          <Text style={[styles.footerLabel, { color: palette.inkMuted }]}>
            {footer}
          </Text>
        ) : null}
      </View>
    </SectionCard>
  );
}

function SummaryStrip({
  items,
  palette,
}: {
  items: readonly LedgerReportSummaryItem[];
  palette: SurfaceTokens;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.summaryStrip}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <StatPill
          key={item.id}
          label={item.label}
          palette={palette}
          value={item.value}
        />
      ))}
    </ScrollView>
  );
}

function getToneColor(
  tone: LedgerReportCellTone | undefined,
  palette: SurfaceTokens,
): string {
  if (tone === "negative") {
    return palette.destructive;
  }

  if (tone === "positive") {
    return palette.success;
  }

  if (tone === "muted") {
    return palette.inkMuted;
  }

  return palette.ink;
}

function getGeneralLedgerColumnStyle(columnId: string) {
  switch (columnId) {
    case "date":
      return styles.dateColumn;
    case "kind":
      return styles.kindColumn;
    case "source":
    case "target":
      return styles.counterpartyColumn;
    case "amount":
      return styles.amountColumn;
    case "description":
    default:
      return styles.descriptionColumn;
  }
}

const styles = StyleSheet.create({
  amountColumn: {
    alignItems: "flex-end",
    minWidth: 120,
  },
  amountValue: {
    textAlign: "right",
  },
  contentStack: {
    gap: 16,
  },
  counterpartyColumn: {
    minWidth: 150,
  },
  dateColumn: {
    minWidth: 112,
  },
  descriptionColumn: {
    minWidth: 196,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyStateLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  kindColumn: {
    minWidth: 132,
  },
  netIncomeCard: {
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  netIncomeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  netIncomeValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  sectionStack: {
    gap: 12,
  },
  summaryStrip: {
    gap: 12,
    paddingBottom: 4,
  },
  tableBodyRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tableCell: {
    justifyContent: "center",
  },
  tableHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tableHeaderRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tableShell: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  valueList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  valueRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  valueRowAmount: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "right",
  },
  valueRowCopy: {
    flex: 1,
    gap: 4,
  },
  valueRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  valueRowNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueSectionHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  valueSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
