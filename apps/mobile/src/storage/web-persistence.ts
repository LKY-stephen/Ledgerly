const DB_STORE_NAME = "creator-cfo-db-store";
const DB_KEY = "active-database";
const IDB_NAME = "creator-cfo-idb";
const IDB_VERSION = 1;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDatabaseFromIndexedDB(): Promise<Uint8Array | null> {
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readonly");
    const store = transaction.objectStore(DB_STORE_NAME);
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

export async function saveDatabaseToIndexedDB(data: Uint8Array): Promise<void> {
  const db = await openIndexedDB();

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
  const db = await openIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(DB_STORE_NAME);
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
}

export async function hasDatabaseInIndexedDB(): Promise<boolean> {
  const data = await loadDatabaseFromIndexedDB();
  return data !== null && data.byteLength > 0;
}
