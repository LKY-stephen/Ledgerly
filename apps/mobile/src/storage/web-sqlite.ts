import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import type { StorageSqlValue } from "@ledgerly/storage";
import {
  loadDatabaseFromIndexedDB,
  saveDatabaseToIndexedDB,
} from "./web-persistence";

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => `/${file}`,
    });
  }

  return sqlJsPromise;
}

export interface WebSqliteDatabase {
  getAllAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row | null>;
  runAsync(source: string, ...params: StorageSqlValue[]): Promise<void>;
  execAsync(source: string): Promise<void>;
  exportDatabase(): Uint8Array;
  close(options?: { persist?: boolean }): void;
}

let activeDatabase: WebSqliteDatabase | null = null;

/**
 * Returns the active web database singleton, or null if not yet initialized.
 * Use this for standalone functions outside React context (e.g. loadHomeScreenSnapshot).
 */
export function getActiveWebDatabase(): WebSqliteDatabase | null {
  return activeDatabase;
}

async function createWebSqliteDatabase(input: {
  persistChanges: boolean;
  seedData?: Uint8Array | null;
}): Promise<WebSqliteDatabase> {
  const SQL = await getSqlJs();
  const raw: SqlJsDatabase = input.seedData ? new SQL.Database(input.seedData) : new SQL.Database();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function schedulePersist() {
    if (!input.persistChanges) {
      return;
    }

    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      saveTimer = null;
      const data = raw.export();
      saveDatabaseToIndexedDB(data).catch((error) => {
        console.error("[web-sqlite] Failed to persist database:", error);
      });
    }, 300);
  }

  function normalizeParams(params: StorageSqlValue[]): (string | number | Uint8Array | null)[] {
    return params.map((param) => {
      if (typeof param === "bigint") {
        return Number(param);
      }

      return param;
    });
  }

  function queryRows<Row>(source: string, params: StorageSqlValue[]): Row[] {
    const stmt = raw.prepare(source);

    try {
      if (params.length > 0) {
        stmt.bind(normalizeParams(params));
      }

      const rows: Row[] = [];

      while (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        const row: Record<string, unknown> = {};

        for (let i = 0; i < columns.length; i++) {
          row[columns[i]] = values[i];
        }

        rows.push(row as Row);
      }

      return rows;
    } finally {
      stmt.free();
    }
  }

  const db: WebSqliteDatabase = {
    async getAllAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row[]> {
      return queryRows<Row>(source, params);
    },

    async getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]): Promise<Row | null> {
      const rows = queryRows<Row>(source, params);
      return rows[0] ?? null;
    },

    async runAsync(source: string, ...params: StorageSqlValue[]): Promise<void> {
      if (params.length > 0) {
        raw.run(source, normalizeParams(params));
      } else {
        raw.run(source);
      }

      schedulePersist();
    },

    async execAsync(source: string): Promise<void> {
      raw.exec(source);
      schedulePersist();
    },

    exportDatabase(): Uint8Array {
      return raw.export();
    },

    close(options) {
      const persist = options?.persist ?? input.persistChanges;

      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }

      if (persist) {
        const data = raw.export();
        saveDatabaseToIndexedDB(data).catch(() => {});
      }

      raw.close();

      if (activeDatabase === db) {
        activeDatabase = null;
      }
    },
  };

  return db;
}

export async function createTransientWebSqliteDatabase(
  seedData?: Uint8Array | null,
): Promise<WebSqliteDatabase> {
  return createWebSqliteDatabase({
    persistChanges: false,
    seedData,
  });
}

export async function openWebSqliteDatabase(): Promise<WebSqliteDatabase> {
  if (activeDatabase) {
    return activeDatabase;
  }

  const savedData = await loadDatabaseFromIndexedDB();
  const db = await createWebSqliteDatabase({
    persistChanges: true,
    seedData: savedData,
  });

  activeDatabase = db;
  return db;
}
