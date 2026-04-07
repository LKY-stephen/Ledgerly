import type { ReadableStorageDatabase } from "./database";
import {
  buildScheduleCAggregation,
  getScheduleCLineDefinition,
  type ScheduleCAggregationResult,
  type ScheduleCSupportedLineCode,
} from "./schedule-c";
import {
  buildSupportedScheduleCNetProfitPreview,
  type SupportedScheduleCNetProfitPreview,
} from "./schedule-se";
import {
  buildTaxYearDateRange,
  loadScheduleCCandidateRecords,
  type TaxQueryScope,
} from "./tax-queries";

export interface TaxHelperDerivedField {
  fieldId: string;
  fieldName: string;
  formName: "Form 1040" | "Schedule C" | "Schedule SE";
  ledgerImpliedValue: string;
  recordIds: string[];
  sourceNote: string;
}

export interface TaxHelperSnapshot {
  businessRecordCount: number;
  derivedFields: TaxHelperDerivedField[];
  exportableRecordIds: string[];
  mappedRecordCount: number;
  notices: string[];
}

export interface TaxHelperEvidenceFileLink {
  evidenceFileId: string;
  evidenceId: string;
  mimeType: string | null;
  originalFileName: string;
  recordId: string;
  relativePath: string;
  vaultCollection: string;
}

interface CountRow {
  count: number;
}

export async function loadTaxHelperSnapshot(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<TaxHelperSnapshot> {
  const [businessRecordCount, candidateRecords] = await Promise.all([
    loadBusinessRecordCount(database, scope),
    loadScheduleCCandidateRecords(database, scope),
  ]);
  const aggregation = buildScheduleCAggregation(candidateRecords);
  const scheduleSEPreview = buildSupportedScheduleCNetProfitPreview(aggregation);
  const derivedFields = buildTaxHelperDerivedFields({
    aggregation,
    scheduleSEPreview,
  });
  const notices = [
    ...Object.values(aggregation.lineReviewNotes),
    aggregation.partVReviewNote,
  ].filter((note): note is string => Boolean(note));

  return {
    businessRecordCount,
    derivedFields,
    exportableRecordIds: dedupeStable(
      derivedFields.flatMap((field) => field.recordIds),
    ),
    mappedRecordCount: candidateRecords.length,
    notices,
  };
}

export async function loadTaxHelperEvidenceFileLinks(
  database: ReadableStorageDatabase,
  input: {
    recordIds: readonly string[];
    taxYear: number;
  },
): Promise<TaxHelperEvidenceFileLink[]> {
  if (!input.recordIds.length) {
    return [];
  }

  const placeholders = input.recordIds.map(() => "?").join(", ");
  const dateRange = buildTaxYearDateRange(input.taxYear);

  return database.getAllAsync<TaxHelperEvidenceFileLink>(
    `SELECT DISTINCT
      rel.record_id AS recordId,
      rel.evidence_id AS evidenceId,
      ef.evidence_file_id AS evidenceFileId,
      ef.vault_collection AS vaultCollection,
      ef.relative_path AS relativePath,
      ef.original_file_name AS originalFileName,
      ef.mime_type AS mimeType
    FROM record_evidence_links rel
    INNER JOIN evidences ev
      ON ev.evidence_id = rel.evidence_id
    INNER JOIN evidence_files ef
      ON ef.evidence_id = rel.evidence_id
    WHERE rel.record_id IN (${placeholders})
      AND ev.captured_date >= ?
      AND ev.captured_date < ?
    ORDER BY rel.record_id ASC, ef.evidence_file_id ASC;`,
    ...input.recordIds,
    dateRange.startOn,
    dateRange.endExclusiveOn,
  );
}

async function loadBusinessRecordCount(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<number> {
  const dateRange = buildTaxYearDateRange(scope.taxYear);
  const row = await database.getFirstAsync<CountRow>(
    `SELECT COUNT(*) AS count
    FROM records
    WHERE entity_id = ?
      AND record_status IN ('posted', 'reconciled')
      AND record_kind IN ('income', 'expense')
      AND occurred_on >= ?
      AND occurred_on < ?;`,
    scope.entityId,
    dateRange.startOn,
    dateRange.endExclusiveOn,
  );

  return row?.count ?? 0;
}

function buildTaxHelperDerivedFields(input: {
  aggregation: ScheduleCAggregationResult;
  scheduleSEPreview: SupportedScheduleCNetProfitPreview;
}): TaxHelperDerivedField[] {
  const fields: TaxHelperDerivedField[] = [];

  const directLineCodes: readonly ScheduleCSupportedLineCode[] = [
    "line1",
    "line8",
    "line10",
    "line11",
    "line15",
    "line16b",
    "line17",
    "line18",
    "line20a",
    "line20b",
    "line21",
    "line22",
    "line23",
    "line24a",
    "line25",
  ];

  for (const lineCode of directLineCodes) {
    const lineAmount = input.aggregation.lineAmounts[lineCode];
    const lineDefinition = getScheduleCLineDefinition(lineCode);

    if (!lineAmount || !lineDefinition) {
      continue;
    }

    fields.push({
      fieldId: `schedule-c-${lineCode}`,
      fieldName: buildScheduleCFieldName(lineCode, lineDefinition.description),
      formName: "Schedule C",
      ledgerImpliedValue: formatCurrencyLabel(lineAmount.amountCents, lineAmount.currency),
      recordIds: [...lineAmount.matchedRecordIds],
      sourceNote: `Derived from ${lineAmount.matchedRecordCount} authoritative record${lineAmount.matchedRecordCount === 1 ? "" : "s"} mapped to ${lineCode}.`,
    });
  }

  const partVTotal = input.aggregation.lineAmounts.line27a;

  if (partVTotal && !input.aggregation.partVReviewNote) {
    const partVValue = formatCurrencyLabel(partVTotal.amountCents, partVTotal.currency);
    const recordIds = [...partVTotal.matchedRecordIds];
    const sourceNote = `Derived from ${partVTotal.matchedRecordCount} authoritative Part V record${partVTotal.matchedRecordCount === 1 ? "" : "s"} grouped into local other-expense detail.`;

    fields.push({
      fieldId: "schedule-c-line27b",
      fieldName: "Line 27b. Total other expenses from line 48",
      formName: "Schedule C",
      ledgerImpliedValue: partVValue,
      recordIds,
      sourceNote,
    });
    fields.push({
      fieldId: "schedule-c-line48",
      fieldName: "Line 48. Total other expenses",
      formName: "Schedule C",
      ledgerImpliedValue: partVValue,
      recordIds,
      sourceNote,
    });
  }

  if (
    input.scheduleSEPreview.netProfitCents !== null &&
    input.scheduleSEPreview.currency
  ) {
    fields.push({
      fieldId: "schedule-se-line2",
      fieldName: "Line 2. Net profit or (loss) from Schedule C",
      formName: "Schedule SE",
      ledgerImpliedValue: formatCurrencyLabel(
        input.scheduleSEPreview.netProfitCents,
        input.scheduleSEPreview.currency,
      ),
      recordIds: dedupeStable(
        Object.values(input.aggregation.lineAmounts).flatMap((lineAmount) =>
          lineAmount?.matchedRecordIds ?? [],
        ),
      ),
      sourceNote: input.scheduleSEPreview.sourceNote,
    });
  }

  return fields;
}

function buildScheduleCFieldName(
  lineCode: ScheduleCSupportedLineCode,
  description: string,
): string {
  return `Line ${lineCode.slice("line".length)}. ${description}`;
}

function formatCurrencyLabel(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amountCents / 100);
}

function dedupeStable(values: readonly string[]): string[] {
  return [...new Set(values)];
}
