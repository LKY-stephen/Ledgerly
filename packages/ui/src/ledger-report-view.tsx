import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { surfaceTokens, type SurfaceTokens } from "./tokens";

export type LedgerReportScopeId = "business" | "personal";
export type LedgerReportViewId = "general-ledger" | "balance-sheet" | "profit-loss";
export type LedgerEntryKind = "expense" | "income" | "personal";

export interface LedgerMetricCardView {
  accent?: "danger" | "neutral" | "success";
  id: string;
  label: string;
  value: string;
}

export interface LedgerSectionRowView {
  amount: string;
  id: string;
  label: string;
  note: string;
}

export interface LedgerEquationRowView {
  accent?: "danger" | "neutral" | "success";
  id: string;
  label: string;
  value: string;
}

export interface LedgerEquationSnapshotView {
  label: string;
  rows: readonly LedgerEquationRowView[];
  summary: string;
}

export interface LedgerGeneralLedgerPostingRecordView {
  amount: string;
  dateLabel: string;
  description: string;
  memo: string | null;
  recordId: string;
  sourceLabel: string;
  targetLabel: string;
}

export interface LedgerGeneralLedgerPostingLineView {
  accountName: string;
  amount: string;
  detail: string;
  id: string;
  record: LedgerGeneralLedgerPostingRecordView;
  side: "credit" | "debit";
}

export interface LedgerGeneralLedgerEntryView {
  amount: string;
  dateLabel: string;
  id: string;
  kind: LedgerEntryKind;
  kindLabel: string;
  lines: readonly LedgerGeneralLedgerPostingLineView[];
  side: "credit" | "debit" | "mixed";
  signedAmountCents: number;
  subtitle: string;
  title: string;
}

export interface LedgerGeneralLedgerSnapshotView {
  debitTotal: string;
  entries: readonly LedgerGeneralLedgerEntryView[];
  equation: LedgerEquationSnapshotView;
  metricCards: readonly LedgerMetricCardView[];
  recordCountLabel: string;
}

export interface LedgerBalanceSheetSnapshotView {
  assetRows: readonly LedgerSectionRowView[];
  carryForwardRows: readonly LedgerSectionRowView[];
  equation: LedgerEquationSnapshotView;
  equationLabel: string;
  equationSummary: string;
  equityAmount: string;
  equityRows: readonly LedgerSectionRowView[];
  liabilityRows: readonly LedgerSectionRowView[];
  metricCards: readonly LedgerMetricCardView[];
  netPositionLabel: string;
}

export interface LedgerProfitAndLossSnapshotView {
  expenseRows: readonly LedgerSectionRowView[];
  metricCards: readonly LedgerMetricCardView[];
  netIncomeLabel: string;
  revenueRows: readonly LedgerSectionRowView[];
}

export interface LedgerReportSnapshotView {
  balanceSheet: LedgerBalanceSheetSnapshotView;
  generalLedger: LedgerGeneralLedgerSnapshotView;
  profitAndLoss: LedgerProfitAndLossSnapshotView;
}

export interface LedgerReportCopy {
  cashAndBankLabel: string;
  fields: {
    amount: string;
    date: string;
    description: string;
    source: string;
    target: string;
  };
  recordCard: {
    emptyValue: string;
    equationResult: string;
    equationTitle: string;
    memo: string;
    nonOwnerRule: string;
    ownerRule: string;
    recordId: string;
    side: string;
    title: string;
  };
  sections: {
    assets: string;
    credit: string;
    debit: string;
    equity: string;
    expenses: string;
    journalPersonal: string;
    journalRecent: string;
    liabilities: string;
    netIncome: string;
    netIncomeSummary: string;
    pnlOnlyBody: string;
    pnlOnlyTitle: string;
    revenue: string;
  };
}

export interface LedgerReportBodyProps {
  copy: LedgerReportCopy;
  onSelectEntry: (entry: LedgerGeneralLedgerEntryView) => void;
  palette?: SurfaceTokens;
  selectedScope: LedgerReportScopeId;
  selectedView: LedgerReportViewId;
  snapshot: LedgerReportSnapshotView;
  testID?: string;
}

export interface LedgerGeneralLedgerDetailModalProps {
  copy: LedgerReportCopy;
  entry: LedgerGeneralLedgerEntryView | null;
  onClose: () => void;
  palette?: SurfaceTokens;
}

export function LedgerReportBody({
  copy,
  onSelectEntry,
  palette = surfaceTokens,
  selectedScope,
  selectedView,
  snapshot,
  testID,
}: LedgerReportBodyProps) {
  return (
    <View style={styles.reportBody} testID={testID}>
      {selectedView === "general-ledger" ? (
        <>
          <MetricGrid cards={snapshot.generalLedger.metricCards} palette={palette} />
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>
              {selectedScope === "personal"
                ? copy.sections.journalPersonal
                : copy.sections.journalRecent}
            </Text>
            <Text style={[styles.sectionMeta, { color: palette.inkMuted }]}>
              {snapshot.generalLedger.recordCountLabel}
            </Text>
          </View>
          <View style={styles.sectionStack}>
            {snapshot.generalLedger.entries.map((entry) => (
              <GeneralLedgerCard
                cashAndBankLabel={copy.cashAndBankLabel}
                entry={entry}
                key={entry.id}
                labels={copy.sections}
                onSelectEntry={onSelectEntry}
                palette={palette}
              />
            ))}
          </View>
          <GeneralLedgerEquationCard
            equation={snapshot.generalLedger.equation}
            palette={palette}
          />
        </>
      ) : null}

      {selectedView === "balance-sheet" ? (
        <>
          <MetricGrid cards={snapshot.balanceSheet.metricCards} palette={palette} />
          <LedgerValueSectionCard
            palette={palette}
            rows={snapshot.balanceSheet.assetRows}
            title={copy.sections.assets}
          />
          <LedgerValueSectionCard
            palette={palette}
            rows={snapshot.balanceSheet.liabilityRows}
            title={copy.sections.liabilities}
          />
          <LedgerValueSectionCard
            palette={palette}
            rows={snapshot.balanceSheet.equityRows}
            title={copy.sections.equity}
          />
          <GeneralLedgerEquationCard
            equation={snapshot.balanceSheet.equation}
            palette={palette}
          />
        </>
      ) : null}

      {selectedView === "profit-loss" ? (
        selectedScope === "personal" ? (
          <>
            <MetricGrid cards={snapshot.profitAndLoss.metricCards} palette={palette} />
            <LedgerInlineStatusCard
              body={copy.sections.pnlOnlyBody}
              palette={palette}
              title={copy.sections.pnlOnlyTitle}
            />
          </>
        ) : (
          <>
            <MetricGrid cards={snapshot.profitAndLoss.metricCards} palette={palette} />
            <LedgerValueSectionCard
              palette={palette}
              rows={snapshot.profitAndLoss.revenueRows}
              title={copy.sections.revenue}
            />
            <LedgerValueSectionCard
              palette={palette}
              rows={snapshot.profitAndLoss.expenseRows}
              title={copy.sections.expenses}
            />
            <View
              style={[
                styles.equationCard,
                {
                  backgroundColor: palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.equationEyebrow, { color: palette.inkMuted }]}>
                {copy.sections.netIncome}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[styles.netIncomeValue, { color: palette.ink }]}
              >
                {snapshot.profitAndLoss.netIncomeLabel}
              </Text>
              <Text style={[styles.equationSummary, { color: palette.inkMuted }]}>
                {copy.sections.netIncomeSummary}
              </Text>
            </View>
          </>
        )
      ) : null}
    </View>
  );
}

export function LedgerGeneralLedgerDetailModal({
  copy,
  entry,
  onClose,
  palette = surfaceTokens,
}: LedgerGeneralLedgerDetailModalProps) {
  if (!entry) {
    return null;
  }

  const isOwnerGroup = entry.title === copy.cashAndBankLabel;
  const debitTotalCents = entry.lines.reduce(
    (total, line) =>
      total + (line.side === "debit" ? parseCurrencyLabelToCents(line.amount) : 0),
    0,
  );
  const creditTotalCents = entry.lines.reduce(
    (total, line) =>
      total + (line.side === "credit" ? parseCurrencyLabelToCents(line.amount) : 0),
    0,
  );
  const displayAmountCents = isOwnerGroup
    ? debitTotalCents - creditTotalCents
    : creditTotalCents - debitTotalCents;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View
        style={[
          styles.modalBackdrop,
          {
            backgroundColor: withAlpha(
              palette.ink,
              palette.name === "dark" ? 0.52 : 0.28,
            ),
          },
        ]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <View style={[styles.recordModalCard, { backgroundColor: palette.shellMuted }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={[styles.modalEyebrow, { color: palette.inkMuted }]}>
                {copy.recordCard.title}
              </Text>
              <Text style={[styles.modalTitle, { color: palette.ink }]}>
                {entry.title}
              </Text>
              <Text style={[styles.modalSummary, { color: palette.inkMuted }]}>
                {entry.amount} · {entry.subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons color={palette.ink} name="close" size={18} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.recordFieldStack}
            showsVerticalScrollIndicator={false}
          >
            {entry.lines.map((line) => {
              const fields = [
                { label: copy.fields.date, value: line.record.dateLabel },
                { label: copy.recordCard.recordId, value: line.record.recordId },
                {
                  label: copy.fields.description,
                  value: line.record.description,
                },
                { label: copy.fields.amount, value: line.record.amount },
                {
                  label: copy.recordCard.side,
                  value:
                    line.side === "debit"
                      ? copy.sections.debit
                      : copy.sections.credit,
                },
                { label: copy.fields.source, value: line.record.sourceLabel },
                { label: copy.fields.target, value: line.record.targetLabel },
              ];

              if (line.record.memo) {
                fields.push({
                  label: copy.recordCard.memo,
                  value: line.record.memo,
                });
              }

              return (
                <View
                  key={line.id}
                  style={[
                    styles.groupedRecordCard,
                    { backgroundColor: palette.paper, borderColor: palette.border },
                  ]}
                >
                  <Text style={[styles.groupedRecordTitle, { color: palette.ink }]}>
                    {line.detail}
                  </Text>
                  <View style={styles.groupedRecordMetaRow}>
                    <View style={styles.groupedRecordMetaCopy}>
                      <Text
                        style={[styles.groupedRecordSummary, { color: palette.inkMuted }]}
                      >
                        {line.record.dateLabel} ·{" "}
                        {line.side === "debit"
                          ? copy.sections.debit
                          : copy.sections.credit}{" "}
                        · {line.accountName}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.groupedRecordAmount,
                        {
                          color: isPositiveSignal(line, isOwnerGroup)
                            ? palette.success
                            : palette.destructive,
                        },
                      ]}
                    >
                      {formatSignedCurrencyLabel(
                        line.amount,
                        isPositiveSignal(line, isOwnerGroup),
                      )}
                    </Text>
                  </View>
                  {fields.map((field) => (
                    <View key={`${line.id}-${field.label}`} style={styles.recordFieldRow}>
                      <Text
                        style={[styles.recordFieldLabel, { color: palette.inkMuted }]}
                      >
                        {field.label}
                      </Text>
                      <Text style={[styles.recordFieldValue, { color: palette.ink }]}>
                        {field.value || copy.recordCard.emptyValue}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <View
              style={[
                styles.equationDetailCard,
                { backgroundColor: palette.paper, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.equationDetailTitle, { color: palette.ink }]}>
                {copy.recordCard.equationTitle}
              </Text>
              <Text style={[styles.equationDetailBody, { color: palette.inkMuted }]}>
                {isOwnerGroup
                  ? copy.recordCard.ownerRule
                  : copy.recordCard.nonOwnerRule}
              </Text>
              <Text style={[styles.equationDetailFormula, { color: palette.ink }]}>
                {isOwnerGroup
                  ? `${copy.sections.debit} ${formatCurrencyLabelFromCents(debitTotalCents)} - ${copy.sections.credit} ${formatCurrencyLabelFromCents(creditTotalCents)} = ${copy.recordCard.equationResult} ${formatCurrencyLabelFromCents(displayAmountCents)}`
                  : `${copy.sections.credit} ${formatCurrencyLabelFromCents(creditTotalCents)} - ${copy.sections.debit} ${formatCurrencyLabelFromCents(debitTotalCents)} = ${copy.recordCard.equationResult} ${formatCurrencyLabelFromCents(displayAmountCents)}`}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MetricGrid({
  cards,
  palette,
}: {
  cards: readonly LedgerMetricCardView[];
  palette: SurfaceTokens;
}) {
  return (
    <View style={styles.metricGrid}>
      {cards.map((card) => (
        <View
          key={card.id}
          style={[
            styles.metricCard,
            { backgroundColor: palette.paper, borderColor: palette.border },
          ]}
        >
          <Text
            numberOfLines={2}
            style={[styles.metricLabel, { color: palette.inkMuted }]}
          >
            {card.label}
          </Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.62}
            numberOfLines={1}
            style={[styles.metricValue, { color: palette.ink }]}
          >
            {card.value}
          </Text>
          <View
            style={[
              styles.metricAccentBar,
              {
                backgroundColor:
                  card.accent === "danger"
                    ? palette.destructive
                    : card.accent === "neutral"
                      ? palette.ink
                      : palette.success,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function GeneralLedgerCard({
  cashAndBankLabel,
  entry,
  labels,
  onSelectEntry,
  palette,
}: {
  cashAndBankLabel: string;
  entry: LedgerGeneralLedgerEntryView;
  labels: LedgerReportCopy["sections"];
  onSelectEntry: (entry: LedgerGeneralLedgerEntryView) => void;
  palette: SurfaceTokens;
}) {
  return (
    <View
      style={[
        styles.transactionCard,
        {
          backgroundColor: palette.paper,
          borderColor: palette.border,
          borderLeftColor:
            entry.kind === "income"
              ? withAlpha(palette.success, palette.name === "dark" ? 0.45 : 0.24)
              : entry.kind === "personal"
                ? withAlpha(palette.accent, palette.name === "dark" ? 0.42 : 0.22)
                : withAlpha(
                    palette.destructive,
                    palette.name === "dark" ? 0.45 : 0.18,
                  ),
        },
      ]}
    >
      <View
        style={[styles.transactionHeader, { borderBottomColor: palette.divider }]}
      >
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIconWrap,
              {
                backgroundColor:
                  entry.kind === "income"
                    ? withAlpha(palette.success, palette.name === "dark" ? 0.22 : 0.16)
                    : entry.kind === "personal"
                      ? withAlpha(palette.accent, palette.name === "dark" ? 0.2 : 0.14)
                      : withAlpha(palette.destructive, palette.name === "dark" ? 0.22 : 0.14),
              },
            ]}
          >
            <Ionicons
              color={
                entry.kind === "income"
                  ? palette.success
                  : entry.kind === "personal"
                    ? palette.accent
                    : palette.destructive
              }
              name={
                entry.kind === "income"
                  ? "arrow-down-outline"
                  : "arrow-up-outline"
              }
              size={18}
            />
          </View>
          <View style={styles.transactionCopy}>
            <Text numberOfLines={2} style={[styles.transactionTitle, { color: palette.ink }]}>
              {entry.title}
            </Text>
            <Text numberOfLines={2} style={[styles.transactionMeta, { color: palette.inkMuted }]}>
              {entry.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[
              styles.transactionAmount,
              {
                color:
                  entry.kind === "income"
                    ? palette.success
                    : entry.kind === "personal"
                      ? palette.accent
                      : palette.destructive,
              },
            ]}
          >
            {entry.amount}
          </Text>
          {entry.dateLabel ? (
            <Text style={[styles.transactionSource, { color: palette.inkMuted }]}>
              {entry.dateLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.postingLineStack, { borderTopColor: palette.divider }]}>
        {entry.lines.map((line, index) => (
          <PostingLine
            cashAndBankLabel={cashAndBankLabel}
            entry={entry}
            isFirst={index === 0}
            key={line.id}
            labels={labels}
            line={line}
            onPress={() => onSelectEntry(entry)}
            palette={palette}
          />
        ))}
      </View>
    </View>
  );
}

function PostingLine({
  cashAndBankLabel,
  entry,
  isFirst,
  labels,
  line,
  onPress,
  palette,
}: {
  cashAndBankLabel: string;
  entry: LedgerGeneralLedgerEntryView;
  isFirst: boolean;
  labels: LedgerReportCopy["sections"];
  line: LedgerGeneralLedgerPostingLineView;
  onPress: () => void;
  palette: SurfaceTokens;
}) {
  const isDebit = line.side === "debit";
  const isPositive = isPostingLinePositive(entry, line, cashAndBankLabel);
  const postingAccent = isPositive ? palette.success : palette.destructive;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.postingLineRow,
        !isFirst ? [styles.listRowSplit, { borderTopColor: palette.divider }] : null,
        pressed
          ? [
              styles.postingLineRowPressed,
              { backgroundColor: withAlpha(palette.ink, palette.name === "dark" ? 0.08 : 0.03) },
            ]
          : null,
      ]}
      testID={`ledger-posting-line-${line.id}`}
    >
      <View style={styles.postingLineCopy}>
        <Text numberOfLines={1} style={[styles.postingLineTitle, { color: palette.ink }]}>
          {isDebit ? labels.debit : labels.credit} · {line.accountName}
        </Text>
        <Text numberOfLines={2} style={[styles.postingLineDetail, { color: palette.inkMuted }]}>
          {line.detail}
        </Text>
      </View>
      <View style={styles.postingLineRight}>
        <Text style={[styles.postingLineDate, { color: palette.inkMuted }]}>
          {line.record.dateLabel}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.postingLineAmount, { color: postingAccent }]}
        >
          {formatSignedCurrencyLabel(line.amount, isPositive)}
        </Text>
      </View>
    </Pressable>
  );
}

function GeneralLedgerEquationCard({
  equation,
  palette,
}: {
  equation: LedgerEquationSnapshotView;
  palette: SurfaceTokens;
}) {
  return (
    <View
      style={[
        styles.equationDetailCard,
        { backgroundColor: palette.paper, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.equationDetailTitle, { color: palette.ink }]}>
        {equation.label}
      </Text>
      <Text style={[styles.equationDetailBody, { color: palette.inkMuted }]}>
        {equation.summary}
      </Text>
      <View style={styles.equationBreakdownStack}>
        {equation.rows.map((row, index) => (
          <View
            key={row.id}
            style={[
              styles.equationBreakdownRow,
              index > 0 ? [styles.listRowSplit, { borderTopColor: palette.divider }] : null,
            ]}
          >
            <Text style={[styles.equationBreakdownLabel, { color: palette.ink }]}>
              {row.label}
            </Text>
            <Text
              style={[
                styles.equationBreakdownAmount,
                {
                  color:
                    row.accent === "danger"
                      ? palette.destructive
                      : row.accent === "success"
                        ? palette.success
                        : palette.ink,
                },
              ]}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LedgerValueSectionCard({
  palette,
  rows,
  title,
}: {
  palette: SurfaceTokens;
  rows: readonly LedgerSectionRowView[];
  title: string;
}) {
  return (
    <View
      style={[styles.sheetCard, { backgroundColor: palette.paper, borderColor: palette.border }]}
    >
      <View style={[styles.sheetHeader, { borderBottomColor: palette.divider }]}>
        <Text style={[styles.sheetTitle, { color: palette.ink }]}>{title}</Text>
      </View>
      <View style={styles.sheetRowStack}>
        {rows.map((row, index) => (
          <View
            key={row.id}
            style={[
              styles.sheetRow,
              index > 0 ? [styles.listRowSplit, { borderTopColor: palette.divider }] : null,
            ]}
          >
            <View style={styles.sheetCopy}>
              <Text numberOfLines={2} style={[styles.sheetLabel, { color: palette.ink }]}>
                {row.label}
              </Text>
              <Text numberOfLines={3} style={[styles.sheetNote, { color: palette.inkMuted }]}>
                {row.note}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={[styles.sheetAmount, { color: palette.ink }]}
            >
              {row.amount}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LedgerInlineStatusCard({
  body,
  palette,
  title,
}: {
  body: string;
  palette: SurfaceTokens;
  title: string;
}) {
  return (
    <View
      style={[styles.statusCard, { backgroundColor: palette.paper, borderColor: palette.border }]}
    >
      <Text style={[styles.statusTitle, { color: palette.ink }]}>{title}</Text>
      <Text style={[styles.statusBody, { color: palette.inkMuted }]}>{body}</Text>
    </View>
  );
}

function isPositiveSignal(
  line: LedgerGeneralLedgerPostingLineView,
  isOwnerGroup: boolean,
): boolean {
  return isOwnerGroup ? line.side === "debit" : line.side === "credit";
}

function isPostingLinePositive(
  entry: LedgerGeneralLedgerEntryView,
  line: LedgerGeneralLedgerPostingLineView,
  cashAndBankLabel: string,
): boolean {
  return isPositiveSignal(line, entry.title === cashAndBankLabel);
}

function formatSignedCurrencyLabel(amount: string, positive: boolean): string {
  return `${positive ? "+" : "-"}${amount}`;
}

function formatCurrencyLabelFromCents(amountCents: number): string {
  const absoluteValue = Math.abs(amountCents);
  const isNegative = amountCents < 0;
  const dollars = absoluteValue / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(dollars);

  return isNegative ? `-${formatted}` : formatted;
}

function parseCurrencyLabelToCents(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

function withAlpha(color: string, alpha: number) {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  if (color.startsWith("#")) {
    const normalized = color.slice(1);
    const hex = normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
  }

  const rgbMatch = color.match(/^rgb\(([^)]+)\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${clampedAlpha})`;
  }

  const rgbaMatch = color.match(/^rgba\(([^)]+)\)$/);
  if (rgbaMatch) {
    const [red = "0", green = "0", blue = "0"] = rgbaMatch[1]
      .split(",")
      .map((part) => part.trim());
    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
  }

  return color;
}

const styles = StyleSheet.create({
  equationBreakdownAmount: {
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  equationBreakdownLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    paddingRight: 12,
  },
  equationBreakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  equationBreakdownStack: {
    gap: 0,
  },
  equationCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  equationDetailBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  equationDetailCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  equationDetailFormula: {
    fontSize: 13,
    lineHeight: 19,
  },
  equationDetailTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  equationEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  equationSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  groupedRecordAmount: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  groupedRecordCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  groupedRecordMetaCopy: {
    flex: 1,
    gap: 2,
  },
  groupedRecordMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  groupedRecordSummary: {
    fontSize: 12,
    lineHeight: 18,
  },
  groupedRecordTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  listRowSplit: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricAccentBar: {
    borderBottomRightRadius: 999,
    borderTopRightRadius: 999,
    bottom: 18,
    height: 40,
    left: 0,
    position: "absolute",
    width: 4,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 114,
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  metricValue: {
    flexShrink: 1,
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    lineHeight: 30,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCloseButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  modalSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  netIncomeValue: {
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  postingLineAmount: {
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  postingLineCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  postingLineDate: {
    fontSize: 12,
    lineHeight: 18,
  },
  postingLineDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  postingLineRight: {
    alignItems: "flex-end",
    gap: 6,
    justifyContent: "center",
    minWidth: 104,
  },
  postingLineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  postingLineRowPressed: {
    opacity: 1,
  },
  postingLineStack: {
    borderTopWidth: 0,
  },
  postingLineTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  recordFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    width: 108,
  },
  recordFieldRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  recordFieldStack: {
    gap: 14,
    paddingBottom: 4,
  },
  recordFieldValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  recordModalCard: {
    borderRadius: 28,
    gap: 16,
    maxHeight: "84%",
    padding: 20,
  },
  reportBody: {
    gap: 14,
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionStack: {
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  sheetAmount: {
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    minWidth: 108,
    textAlign: "right",
  },
  sheetCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  sheetCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sheetHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sheetLabel: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  sheetNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  sheetRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sheetRowStack: {
    gap: 0,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  statusBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  transactionAmount: {
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    lineHeight: 28,
  },
  transactionCard: {
    borderLeftWidth: 4,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  transactionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  transactionHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  transactionIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  transactionLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  transactionMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 6,
    justifyContent: "center",
    minWidth: 92,
  },
  transactionSource: {
    fontSize: 12,
    lineHeight: 18,
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
});
