const DB_STORE_NAME = "ledgerly-db-store";
const DB_KEY = "active-database";
const IDB_NAME = "ledgerly-idb";
const IDB_VERSION = 1;
const LEGACY_PRODUCT_SLUG = ["creator", "cfo"].join("-");
const LEGACY_DATABASES = [
  {
    databaseName: `${LEGACY_PRODUCT_SLUG}-idb`,
    storeName: `${LEGACY_PRODUCT_SLUG}-db-store`,
  },
] as const;

function openIndexedDB(
  databaseName: string,
  storeName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDatabaseBytes(
  databaseName: string,
  storeName: string,
): Promise<Uint8Array | null> {
  const db = await openIndexedDB(databaseName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(DB_KEY);

    request.onsuccess = () => {
      db.close();
      const result = request.result;
      resolve(result instanceof Uint8Array ? result : null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  const activeData = await readDatabaseBytes(IDB_NAME, DB_STORE_NAME);

  if (activeData) {
    return activeData;
  }

  for (const legacy of LEGACY_DATABASES) {
    const legacyData = await readDatabaseBytes(
      legacy.databaseName,
      legacy.storeName,
    );

    if (legacyData) {
      await saveDatabaseToIndexedDB(legacyData);
      return legacyData;
    }
  }

  return null;
}

export async function saveDatabaseToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openIndexedDB(IDB_NAME, DB_STORE_NAME);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DB_STORE_NAME);
    const request = store.put(data, DB_KEY);

    request.onsuccess = () => {
      db.close();
      resolve();
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function deleteDatabaseFromIndexedDB(): Promise<void> {
  const removeFromStore = async (databaseName: string, storeName: string) => {
    const db = await openIndexedDB(databaseName, storeName);

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(DB_KEY);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  };

  await removeFromStore(IDB_NAME, DB_STORE_NAME);

  for (const legacy of LEGACY_DATABASES) {
    await removeFromStore(legacy.databaseName, legacy.storeName);
  }
}

export async function hasDatabaseInIndexedDB(): Promise<boolean> {
  const data = await loadDatabaseFromIndexedDB();
  return data !== null && data.byteLength > 0;
}
