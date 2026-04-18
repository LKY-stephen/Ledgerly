import type { ReadableStorageDatabase } from "@creator-cfo/storage";

import {
  createTrendPointsFromTotals,
  defaultEntityId,
  homeRecentPageSize,
  type HomeMetricSnapshot,
  type HomeRecentRecord,
  type HomeTrendPoint,
} from "../ledger/ledger-domain";

export interface HomeSnapshot {
  hasMore: boolean;
  metrics: HomeMetricSnapshot;
  recentRecords: HomeRecentRecord[];
  trend: HomeTrendPoint[];
}

export interface JournalListSnapshot {
  hasMore: boolean;
  records: HomeRecentRecord[];
}

export async function loadHomeSnapshot(
  database: ReadableStorageDatabase,
  input: {
    entityId?: string;
    limit?: number;
    now?: string;
    offset?: number;
  } = {},
): Promise<HomeSnapshot> {
  const entityId = input.entityId ?? defaultEntityId;
  const now = input.now ?? new Date().toISOString().slice(0, 10);
  const offset = input.offset ?? 0;
  const limit = input.limit ?? homeRecentPageSize;
  const monthStart = `${now.slice(0, 7)}-01`;
  const monthEnd = endOfMonth(now);
  const latestRecordRow = await database.getFirstAsync<{ latestOn: string | null }>(
    `SELECT MAX(occurred_on) AS latestOn
      FROM records
      WHERE entity_id = ?
        AND record_kind IN ('income', 'non_business_income', 'expense', 'personal_spending');`,
    entityId,
  );
  const latestRecordDate = latestRecordRow?.latestOn ?? null;
  const defaultTrendStart = shiftIsoDate(now, -29);
  const trendEnd =
    latestRecordDate && latestRecordDate < defaultTrendStart
      ? latestRecordDate
      : now;
  const trendStart = shiftIsoDate(trendEnd, -29);
  const recentSnapshot = await loadJournalListSnapshot(database, {
    entityId,
    limit,
    offset,
  });
  const metricRow =
    (await database.searchFirstRecordsByDateRangeAsync<{
      incomeCents: number | null;
      outflowCents: number | null;
    }>({
      dateRange: {
        endOn: monthEnd,
        startOn: monthStart,
      },
      entityId,
      select: `COALESCE(SUM(CASE WHEN r.record_kind IN ('income', 'non_business_income') THEN r.amount_cents ELSE 0 END), 0) AS incomeCents,
        COALESCE(SUM(CASE WHEN r.record_kind IN ('expense', 'personal_spending') THEN r.amount_cents ELSE 0 END), 0) AS outflowCents`,
    })) ?? { incomeCents: 0, outflowCents: 0 };
  const trendRows = await database.searchRecordsByDateRangeAsync<{
    amountCents: number;
    occurredOn: string;
  }>({
    dateRange: {
      endOn: trendEnd,
      startOn: trendStart,
    },
    entityId,
    groupBy: "r.occurred_on",
    orderBy: "r.occurred_on ASC",
    recordKinds: ["income", "non_business_income", "expense", "personal_spending"],
    select: `r.occurred_on AS occurredOn,
      COALESCE(SUM(r.amount_cents), 0) AS amountCents`,
  });
  const totalsByDate = Object.fromEntries(trendRows.map((row) => [row.occurredOn, row.amountCents]));
  const incomeCents = metricRow.incomeCents ?? 0;
  const outflowCents = metricRow.outflowCents ?? 0;

  return {
    hasMore: recentSnapshot.hasMore,
    metrics: {
      incomeCents,
      netCents: incomeCents - outflowCents,
      outflowCents,
    },
    recentRecords: recentSnapshot.records,
    trend: createTrendPointsFromTotals(totalsByDate, trendEnd),
  };
}

export async function loadJournalListSnapshot(
  database: ReadableStorageDatabase,
  input: {
    entityId?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<JournalListSnapshot> {
  const entityId = input.entityId ?? defaultEntityId;
  const offset = input.offset ?? 0;
  const limit = input.limit ?? homeRecentPageSize;
  const records = await database.getAllAsync<HomeRecentRecord>(
    `SELECT
      record_id AS recordId,
      description,
      amount_cents AS amountCents,
      record_kind AS recordKind,
      occurred_on AS occurredOn,
      created_at AS createdAt,
      source_label AS sourceLabel,
      target_label AS targetLabel
    FROM records
    WHERE entity_id = ?
    ORDER BY occurred_on DESC, created_at DESC, record_id DESC
    LIMIT ?
    OFFSET ?;`,
    entityId,
    limit + 1,
    offset,
  );

  return {
    hasMore: records.length > limit,
    records: records.slice(0, limit),
  };
}

function endOfMonth(dateValue: string): string {
  const date = new Date(`${dateValue.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(dateValue: string, offsetDays: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
