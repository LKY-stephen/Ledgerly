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
  const trendStart = shiftIsoDate(now, -29);
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
  const metricRow =
    (await database.getFirstAsync<{
      incomeCents: number | null;
      outflowCents: number | null;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN record_kind = 'income' THEN amount_cents ELSE 0 END), 0) AS incomeCents,
        COALESCE(SUM(CASE WHEN record_kind IN ('expense', 'personal_spending') THEN amount_cents ELSE 0 END), 0) AS outflowCents
      FROM records
      WHERE entity_id = ?
        AND occurred_on BETWEEN ? AND ?;`,
      entityId,
      monthStart,
      monthEnd,
    )) ?? { incomeCents: 0, outflowCents: 0 };
  const trendRows = await database.getAllAsync<{ amountCents: number; occurredOn: string }>(
    `SELECT
      occurred_on AS occurredOn,
      COALESCE(SUM(amount_cents), 0) AS amountCents
    FROM records
    WHERE entity_id = ?
      AND record_kind = 'income'
      AND occurred_on BETWEEN ? AND ?
    GROUP BY occurred_on
    ORDER BY occurred_on ASC;`,
    entityId,
    trendStart,
    now,
  );
  const totalsByDate = Object.fromEntries(trendRows.map((row) => [row.occurredOn, row.amountCents]));
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
    trend: createTrendPointsFromTotals(totalsByDate, now),
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
