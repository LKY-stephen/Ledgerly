import type { ReadableStorageDatabase } from "./database";
import {
  buildScheduleCAggregation,
  type ScheduleCAggregationResult,
  type ScheduleCCandidateRecord,
} from "./schedule-c";
import {
  buildSupportedScheduleCNetProfitPreview,
  type SupportedScheduleCNetProfitPreview,
} from "./schedule-se";

interface TaxYearProfileRow {
  accountingMethod: string;
}

interface EntityLegalNameRow {
  legalName: string;
}

export interface TaxQueryScope {
  entityId: string;
  taxYear: number;
}

export interface TaxYearDateRange {
  endExclusiveOn: string;
  startOn: string;
}

export function buildTaxYearDateRange(taxYear: number): TaxYearDateRange {
  const normalizedTaxYear = normalizeTaxYear(taxYear);

  return {
    endExclusiveOn: `${normalizedTaxYear + 1}-01-01`,
    startOn: `${normalizedTaxYear}-01-01`,
  };
}

export async function loadEntityLegalName(
  database: ReadableStorageDatabase,
  entityId: string,
): Promise<string | null> {
  const normalizedEntityId = normalizeEntityId(entityId);
  const row = await database.getFirstAsync<EntityLegalNameRow>(
    `SELECT legal_name AS legalName
    FROM entities
    WHERE entity_id = ?
    LIMIT 1;`,
    normalizedEntityId,
  );

  return row?.legalName ?? null;
}

export async function loadScheduleCCandidateRecords(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<ScheduleCCandidateRecord[]> {
  const normalizedScope = normalizeTaxQueryScope(scope);
  await assertCashAccountingMethod(database, normalizedScope);
  const dateRange = buildTaxYearDateRange(normalizedScope.taxYear);

  return database.searchRecordsByDateRangeAsync<ScheduleCCandidateRecord>({
    dateRange: {
      endExclusiveOn: dateRange.endExclusiveOn,
      startOn: dateRange.startOn,
    },
    entityId: normalizedScope.entityId,
    orderBy: "r.occurred_on ASC, r.record_id ASC",
    recordStatuses: ["posted", "reconciled"],
    select: `r.record_id AS recordId,
      r.record_kind AS recordKind,
      r.record_status AS recordStatus,
      r.occurred_on AS occurredOn,
      r.currency,
      r.description,
      r.memo,
      r.category_code AS categoryCode,
      r.subcategory_code AS subcategoryCode,
      r.tax_category_code AS taxCategoryCode,
      CASE
        WHEN LOWER(TRIM(COALESCE(r.tax_line_code, ''))) = 'line27b' THEN 'line27a'
        ELSE r.tax_line_code
      END AS taxLineCode,
      r.amount_cents AS amountCents,
      r.business_use_bps AS businessUseBps`,
    where: "COALESCE(r.tax_line_code, '') <> ''",
  });
}

export async function loadScheduleCAggregation(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<ScheduleCAggregationResult> {
  const candidateRecords = await loadScheduleCCandidateRecords(database, scope);
  return buildScheduleCAggregation(candidateRecords);
}

export async function loadScheduleSEPreview(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<SupportedScheduleCNetProfitPreview> {
  const aggregation = await loadScheduleCAggregation(database, scope);
  return buildSupportedScheduleCNetProfitPreview(aggregation);
}

async function assertCashAccountingMethod(
  database: ReadableStorageDatabase,
  scope: TaxQueryScope,
): Promise<void> {
  const row = await database.getFirstAsync<TaxYearProfileRow>(
    `SELECT accounting_method AS accountingMethod
    FROM tax_year_profiles
    WHERE entity_id = ? AND tax_year = ?
    LIMIT 1;`,
    scope.entityId,
    scope.taxYear,
  );

  if (!row) {
    return;
  }

  if (row.accountingMethod.trim().toLowerCase() !== "cash") {
    throw new Error(
      `Only cash accounting_method is supported for local Schedule C and Schedule SE queries. Received "${row.accountingMethod}" for ${scope.entityId} tax year ${scope.taxYear}.`,
    );
  }
}

function normalizeTaxQueryScope(scope: TaxQueryScope): TaxQueryScope {
  return {
    entityId: normalizeEntityId(scope.entityId),
    taxYear: normalizeTaxYear(scope.taxYear),
  };
}

function normalizeEntityId(entityId: string): string {
  const normalizedEntityId = entityId.trim();

  if (!normalizedEntityId) {
    throw new Error("Tax queries require a non-empty entityId.");
  }

  return normalizedEntityId;
}

function normalizeTaxYear(taxYear: number): number {
  if (!Number.isInteger(taxYear) || taxYear < 1900 || taxYear > 9999) {
    throw new Error(`Tax queries require a four-digit integer taxYear. Received "${taxYear}".`);
  }

  return taxYear;
}
