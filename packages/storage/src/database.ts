export type StorageSqlValue = Uint8Array | bigint | null | number | string;

export interface StorageRecordDateRange {
  endExclusiveOn?: string;
  endOn?: string;
  startOn?: string;
}

export interface StorageRecordDateRangeSearch {
  dateRange: StorageRecordDateRange;
  entityId: string;
  groupBy?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  params?: readonly StorageSqlValue[];
  recordKinds?: readonly string[];
  recordStatuses?: readonly string[];
  select: string;
  where?: string;
}

export interface StorageSqlReader {
  getAllAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row | null>;
}

export interface ReadableStorageDatabase extends StorageSqlReader {
  searchFirstRecordsByDateRangeAsync<Row>(
    search: StorageRecordDateRangeSearch,
  ): Promise<Row | null>;
  searchRecordsByDateRangeAsync<Row>(
    search: StorageRecordDateRangeSearch,
  ): Promise<Row[]>;
}

export interface StorageSqlWriter extends StorageSqlReader {
  runAsync(source: string, ...params: StorageSqlValue[]): Promise<unknown>;
}

export interface WritableStorageDatabase
  extends ReadableStorageDatabase,
    StorageSqlWriter {}

export function createReadableStorageDatabase(
  database: StorageSqlReader,
): ReadableStorageDatabase {
  return {
    ...database,
    searchFirstRecordsByDateRangeAsync<Row>(search: StorageRecordDateRangeSearch) {
      return searchFirstRecordsByDateRangeAsync<Row>(database, search);
    },
    searchRecordsByDateRangeAsync<Row>(search: StorageRecordDateRangeSearch) {
      return searchRecordsByDateRangeAsync<Row>(database, search);
    },
  };
}

export function createWritableStorageDatabase(
  database: StorageSqlWriter,
): WritableStorageDatabase {
  return {
    ...createReadableStorageDatabase(database),
    runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.runAsync(source, ...params);
    },
  };
}

export function buildRecordDateRangeSearch(search: StorageRecordDateRangeSearch): {
  params: StorageSqlValue[];
  source: string;
} {
  const normalizedEntityId = search.entityId.trim();

  if (!normalizedEntityId) {
    throw new Error("Record date-range searches require a non-empty entityId.");
  }

  const normalizedSelect = normalizeSqlFragment(search.select, "select");
  const normalizedWhere = normalizeOptionalSqlFragment(search.where);
  const normalizedGroupBy = normalizeOptionalSqlFragment(search.groupBy);
  const normalizedOrderBy = normalizeOptionalSqlFragment(search.orderBy);
  const normalizedParams = [...(search.params ?? [])];
  const { clauses: rangeClauses, params: rangeParams } = buildDateRangeClauses(search.dateRange);
  const params: StorageSqlValue[] = [normalizedEntityId];
  const whereClauses = ["r.entity_id = ?"];

  appendInClause(whereClauses, params, "r.record_kind", search.recordKinds);
  appendInClause(whereClauses, params, "r.record_status", search.recordStatuses);

  for (const clause of rangeClauses) {
    whereClauses.push(clause);
  }

  params.push(...rangeParams);

  if (normalizedWhere) {
    whereClauses.push(`(${normalizedWhere})`);
  }

  params.push(...normalizedParams);

  let source = `SELECT
  ${normalizedSelect}
FROM records AS r
WHERE ${whereClauses.join("\n  AND ")}`;

  if (normalizedGroupBy) {
    source += `\nGROUP BY ${normalizedGroupBy}`;
  }

  if (normalizedOrderBy) {
    source += `\nORDER BY ${normalizedOrderBy}`;
  }

  if (typeof search.limit === "number") {
    const normalizedLimit = normalizeLimit(search.limit);
    source += "\nLIMIT ?";
    params.push(normalizedLimit);
  } else if (typeof search.offset === "number") {
    source += "\nLIMIT -1";
  }

  if (typeof search.offset === "number") {
    const normalizedOffset = normalizeOffset(search.offset);
    source += "\nOFFSET ?";
    params.push(normalizedOffset);
  }

  return {
    params,
    source: `${source};`,
  };
}

export async function searchRecordsByDateRangeAsync<Row>(
  database: StorageSqlReader,
  search: StorageRecordDateRangeSearch,
): Promise<Row[]> {
  const query = buildRecordDateRangeSearch(search);
  return database.getAllAsync<Row>(query.source, ...query.params);
}

export async function searchFirstRecordsByDateRangeAsync<Row>(
  database: StorageSqlReader,
  search: StorageRecordDateRangeSearch,
): Promise<Row | null> {
  const query = buildRecordDateRangeSearch(search);
  return database.getFirstAsync<Row>(query.source, ...query.params);
}

function buildDateRangeClauses(dateRange: StorageRecordDateRange): {
  clauses: string[];
  params: StorageSqlValue[];
} {
  const clauses: string[] = [];
  const params: StorageSqlValue[] = [];
  const startOn = normalizeOptionalDateValue(dateRange.startOn);
  const endOn = normalizeOptionalDateValue(dateRange.endOn);
  const endExclusiveOn = normalizeOptionalDateValue(dateRange.endExclusiveOn);

  if (!startOn && !endOn && !endExclusiveOn) {
    throw new Error("Record date-range searches require at least one date bound.");
  }

  if (endOn && endExclusiveOn) {
    throw new Error(
      "Record date-range searches cannot specify both endOn and endExclusiveOn.",
    );
  }

  if (startOn) {
    clauses.push("r.occurred_on >= ?");
    params.push(startOn);
  }

  if (endOn) {
    clauses.push("r.occurred_on <= ?");
    params.push(endOn);
  }

  if (endExclusiveOn) {
    clauses.push("r.occurred_on < ?");
    params.push(endExclusiveOn);
  }

  return { clauses, params };
}

function appendInClause(
  clauses: string[],
  params: StorageSqlValue[],
  columnName: string,
  values: readonly string[] | undefined,
): void {
  if (!values?.length) {
    return;
  }

  const normalizedValues = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!normalizedValues.length) {
    return;
  }

  clauses.push(`${columnName} IN (${normalizedValues.map(() => "?").join(", ")})`);
  params.push(...normalizedValues);
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Record date-range searches require a non-negative integer limit. Received "${value}".`);
  }

  return value;
}

function normalizeOffset(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Record date-range searches require a non-negative integer offset. Received "${value}".`);
  }

  return value;
}

function normalizeOptionalDateValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeOptionalSqlFragment(fragment: string | undefined): string | null {
  if (typeof fragment !== "string") {
    return null;
  }

  return normalizeSqlFragment(fragment, "fragment");
}

function normalizeSqlFragment(fragment: string, label: string): string {
  const normalizedFragment = fragment.trim();

  if (!normalizedFragment) {
    throw new Error(`Record date-range searches require a non-empty ${label} fragment.`);
  }

  if (normalizedFragment.includes(";")) {
    throw new Error(`Record date-range searches do not allow semicolons in ${label} fragments.`);
  }

  return normalizedFragment;
}
