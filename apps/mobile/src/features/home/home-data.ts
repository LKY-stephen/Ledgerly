import type { ReadableStorageDatabase } from "@creator-cfo/storage";
import type { ResolvedLocale } from "../app-shell/types";

import {
  createTrendPointsFromDailyTotals,
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

export async function loadHomeSnapshot(
  database: ReadableStorageDatabase,
  input: {
    entityId?: string;
    limit?: number;
    locale?: ResolvedLocale;
    now?: string;
    offset?: number;
  } = {},
): Promise<HomeSnapshot> {
  const entityId = input.entityId ?? defaultEntityId;
  const locale = input.locale ?? "en";
  const latestOccurredOnRow =
    input.now === undefined
      ? await database.getFirstAsync<{ latestOccurredOn: string | null }>(
          `SELECT occurred_on AS latestOccurredOn
          FROM records
          WHERE entity_id = ?
          ORDER BY occurred_on DESC, created_at DESC
          LIMIT 1;`,
          entityId,
        )
      : null;
  const latestCreatedOnRow =
    input.now === undefined
      ? await database.getFirstAsync<{ latestCreatedOn: string | null }>(
          `SELECT substr(created_at, 1, 10) AS latestCreatedOn
          FROM records
          WHERE entity_id = ?
          ORDER BY created_at DESC
          LIMIT 1;`,
          entityId,
        )
      : null;
  const metricsNow =
    input.now ??
    latestOccurredOnRow?.latestOccurredOn?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);
  const trendNow =
    input.now ??
    latestCreatedOnRow?.latestCreatedOn?.slice(0, 10) ??
    metricsNow;
  const offset = input.offset ?? 0;
  const limit = input.limit ?? homeRecentPageSize;
  const monthStart = `${metricsNow.slice(0, 7)}-01`;
  const monthEnd = endOfMonth(metricsNow);
  const trendStart = shiftIsoDate(trendNow, -29);
  const recentRows = await database.getAllAsync<HomeRecentRecord>(
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
    ORDER BY occurred_on DESC, created_at DESC
    LIMIT ?
    OFFSET ?;`,
    entityId,
    limit + 1,
    offset,
  );
  const metricRow = (await database.searchFirstRecordsByDateRangeAsync<{
    incomeCents: number | null;
    outflowCents: number | null;
  }>({
    dateRange: {
      endOn: monthEnd,
      startOn: monthStart,
    },
    entityId,
    select: `COALESCE(SUM(CASE WHEN r.record_kind = 'income' THEN r.amount_cents ELSE 0 END), 0) AS incomeCents,
        COALESCE(SUM(CASE WHEN r.record_kind IN ('expense', 'personal_spending') THEN r.amount_cents ELSE 0 END), 0) AS outflowCents`,
  })) ?? { incomeCents: 0, outflowCents: 0 };
  const trendRows = await database.getAllAsync<{
    createdOn: string;
    expenseCents: number;
    incomeCents: number;
  }>(
    `SELECT
      substr(created_at, 1, 10) AS createdOn,
      COALESCE(SUM(CASE WHEN record_kind = 'income' THEN amount_cents ELSE 0 END), 0) AS incomeCents,
      COALESCE(
        SUM(CASE WHEN record_kind IN ('expense', 'personal_spending') THEN amount_cents ELSE 0 END),
        0
      ) AS expenseCents
    FROM records
    WHERE entity_id = ?
      AND substr(created_at, 1, 10) >= ?
      AND substr(created_at, 1, 10) <= ?
    GROUP BY substr(created_at, 1, 10)
    ORDER BY createdOn ASC;`,
    entityId,
    trendStart,
    trendNow,
  );
  const totalsByDate = Object.fromEntries(
    trendRows.map((row) => [
      row.createdOn,
      {
        expenseCents: row.expenseCents ?? 0,
        incomeCents: row.incomeCents ?? 0,
      },
    ]),
  );
  const incomeCents = metricRow.incomeCents ?? 0;
  const outflowCents = metricRow.outflowCents ?? 0;

  return {
    hasMore: recentRows.length > limit,
    metrics: {
      incomeCents,
      netCents: incomeCents - outflowCents,
      outflowCents,
    },
    recentRecords: recentRows.slice(0, limit),
    trend: createTrendPointsFromDailyTotals(totalsByDate, trendNow, locale),
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
