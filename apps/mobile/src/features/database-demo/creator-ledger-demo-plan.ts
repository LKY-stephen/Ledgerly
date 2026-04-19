import {
  persistResolvedStandardReceiptEntry,
  resolveStandardReceiptEntry,
  type ReadableStorageDatabase,
  type StandardReceiptEntryInput,
  type WritableStorageDatabase,
} from "@ledgerly/storage";

import { defaultEntityId } from "../ledger/ledger-domain";
import { ensureDefaultEntity } from "../ledger/ledger-store";
import { databaseDemoSourceSystem } from "./demo-data";

const creatorLedgerDemoRecordIdPrefix = "demo-creator";

export interface CreatorLedgerDemoSeedRecord {
  createdAt: string;
  input: StandardReceiptEntryInput;
  recordId: string;
  updatedAt: string;
}

export const creatorLedgerDemoSeedPlan: readonly CreatorLedgerDemoSeedRecord[] = [
  {
    createdAt: "2026-04-14T09:00:00.000Z",
    input: {
      amountCents: 128_000,
      currency: "USD",
      description: "YouTube AdSense payout",
      entityId: defaultEntityId,
      occurredOn: "2026-04-14",
      source: "YouTube",
      target: "Business checking",
      userClassification: "income",
    },
    recordId: "demo-creator-001",
    updatedAt: "2026-04-14T09:05:00.000Z",
  },
  {
    createdAt: "2026-04-13T09:00:00.000Z",
    input: {
      amountCents: 96_000,
      currency: "USD",
      description: "Patreon member payout",
      entityId: defaultEntityId,
      occurredOn: "2026-04-13",
      source: "Patreon",
      target: "Business checking",
      userClassification: "income",
    },
    recordId: "demo-creator-002",
    updatedAt: "2026-04-13T09:05:00.000Z",
  },
  {
    createdAt: "2026-04-11T09:00:00.000Z",
    input: {
      amountCents: 18_900,
      currency: "USD",
      description: "Adobe Creative Cloud renewal",
      entityId: defaultEntityId,
      occurredOn: "2026-04-11",
      source: "Business checking",
      target: "Adobe",
      userClassification: "expense",
    },
    recordId: "demo-creator-003",
    updatedAt: "2026-04-11T09:05:00.000Z",
  },
  {
    createdAt: "2026-04-09T09:00:00.000Z",
    input: {
      amountCents: 245_000,
      currency: "USD",
      description: "Sponsorship payout: TechDaily",
      entityId: defaultEntityId,
      occurredOn: "2026-04-09",
      source: "TechDaily",
      target: "Business checking",
      userClassification: "income",
    },
    recordId: "demo-creator-004",
    updatedAt: "2026-04-09T09:05:00.000Z",
  },
  {
    createdAt: "2026-04-07T09:00:00.000Z",
    input: {
      amountCents: 42_000,
      currency: "USD",
      description: "Camera and mic rental",
      entityId: defaultEntityId,
      occurredOn: "2026-04-07",
      source: "Business checking",
      target: "Production Rentals",
      userClassification: "expense",
    },
    recordId: "demo-creator-005",
    updatedAt: "2026-04-07T09:05:00.000Z",
  },
  {
    createdAt: "2026-04-05T09:00:00.000Z",
    input: {
      amountCents: 8_600,
      currency: "USD",
      description: "Coffee and meals during shoot day",
      entityId: defaultEntityId,
      occurredOn: "2026-04-05",
      source: "Business card",
      target: "Cafe Luna",
      userClassification: "personal_spending",
    },
    recordId: "demo-creator-006",
    updatedAt: "2026-04-05T09:05:00.000Z",
  },
  {
    createdAt: "2026-03-29T09:00:00.000Z",
    input: {
      amountCents: 54_000,
      currency: "USD",
      description: "Affiliate payout: ShareASale",
      entityId: defaultEntityId,
      occurredOn: "2026-03-29",
      source: "ShareASale",
      target: "Business checking",
      userClassification: "income",
    },
    recordId: "demo-creator-007",
    updatedAt: "2026-03-29T09:05:00.000Z",
  },
  {
    createdAt: "2026-03-26T09:00:00.000Z",
    input: {
      amountCents: 12_600,
      currency: "USD",
      description: "Notion and tool stack subscription",
      entityId: defaultEntityId,
      occurredOn: "2026-03-26",
      source: "Business checking",
      target: "Notion",
      userClassification: "expense",
    },
    recordId: "demo-creator-008",
    updatedAt: "2026-03-26T09:05:00.000Z",
  },
] as const;

export function isCreatorLedgerDemoRecordId(recordId: string): boolean {
  return recordId.startsWith(`${creatorLedgerDemoRecordIdPrefix}-`);
}

export async function listCreatorLedgerDemoRecordIds(
  database: ReadableStorageDatabase,
): Promise<string[]> {
  const rows = await database.getAllAsync<{ recordId: string }>(
    `SELECT record_id AS recordId
    FROM records
    WHERE source_system = ? AND record_id LIKE ?
    ORDER BY created_at ASC;`,
    databaseDemoSourceSystem,
    `${creatorLedgerDemoRecordIdPrefix}-%`,
  );

  return rows.map((row) => row.recordId);
}

export async function replaceCreatorLedgerDemoRecords(
  database: WritableStorageDatabase,
): Promise<{ recordCount: number }> {
  await ensureDefaultEntity(database, creatorLedgerDemoSeedPlan[0]?.createdAt ?? new Date().toISOString());

  const existingRecordIds = await listCreatorLedgerDemoRecordIds(database);

  for (const recordId of existingRecordIds) {
    await database.runAsync("DELETE FROM records WHERE record_id = ?;", recordId);
  }

  for (const record of creatorLedgerDemoSeedPlan) {
    await persistResolvedStandardReceiptEntry(
      database,
      resolveStandardReceiptEntry(record.input, {
        createdAt: record.createdAt,
        recordId: record.recordId,
        recordStatus: "posted",
        sourceSystem: databaseDemoSourceSystem,
        updatedAt: record.updatedAt,
      }),
    );
  }

  return { recordCount: creatorLedgerDemoSeedPlan.length };
}
