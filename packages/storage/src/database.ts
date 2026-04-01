export type StorageSqlValue = Uint8Array | bigint | null | number | string;

export interface ReadableStorageDatabase {
  getAllAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row | null>;
}

export interface WritableStorageDatabase extends ReadableStorageDatabase {
  runAsync(source: string, ...params: StorageSqlValue[]): Promise<unknown>;
}
