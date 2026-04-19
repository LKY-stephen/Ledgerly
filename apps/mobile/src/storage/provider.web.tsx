import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import {
  createReadableStorageDatabase as createReadableView,
  createWritableStorageDatabase as createWritableView,
  type ReadableStorageDatabase,
  type StorageSqlValue,
  type WritableStorageDatabase,
} from "@ledgerly/storage";

import { useAppShell } from "../features/app-shell/provider";
import { openWebSqliteDatabase, type WebSqliteDatabase } from "./web-sqlite";
import { initializeLocalDatabase } from "./database";

const WebDatabaseContext = createContext<WebSqliteDatabase | null>(null);

export function useWebDatabaseContext(): WebSqliteDatabase {
  const db = useContext(WebDatabaseContext);

  if (!db) {
    throw new Error("useWebDatabaseContext must be used within a LocalStorageProvider on web.");
  }

  return db;
}

export function createReadableStorageDatabaseFromWeb(
  database: WebSqliteDatabase,
): ReadableStorageDatabase {
  return createReadableView({
    getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, ...params);
    },
    getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, ...params);
    },
  });
}

export function createWritableStorageDatabaseFromWeb(
  database: WebSqliteDatabase,
): WritableStorageDatabase {
  return createWritableView({
    getAllAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getAllAsync<Row>(source, ...params);
    },
    getFirstAsync<Row>(source: string, ...params: StorageSqlValue[]) {
      return database.getFirstAsync<Row>(source, ...params);
    },
    runAsync(source: string, ...params: StorageSqlValue[]) {
      return database.runAsync(source, ...params);
    },
  });
}

export function LocalStorageProvider({ children }: PropsWithChildren) {
  const { isStorageSuspended, storageGateState, storageRevision } = useAppShell();
  const [database, setDatabase] = useState<WebSqliteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isStorageSuspended || storageGateState.kind !== "ready") {
      return;
    }

    let isMounted = true;

    openWebSqliteDatabase()
      .then(async (db) => {
        await initializeLocalDatabase(db);

        if (isMounted) {
          setDatabase(db);
        } else {
          db.close();
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize web database.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isStorageSuspended, storageGateState.kind, storageRevision]);

  if (isStorageSuspended || storageGateState.kind !== "ready") {
    return null;
  }

  if (error) {
    return null;
  }

  if (!database) {
    return null;
  }

  return (
    <WebDatabaseContext.Provider value={database}>
      {children}
    </WebDatabaseContext.Provider>
  );
}
