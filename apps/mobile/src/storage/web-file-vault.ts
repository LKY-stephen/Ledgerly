const VAULT_STORE_NAME = "creator-cfo-file-vault";
const IDB_NAME = "creator-cfo-vault-idb";
const IDB_VERSION = 1;

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
        db.createObjectStore(VAULT_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function writeVaultFile(relativePath: string, data: Blob | Uint8Array): Promise<void> {
  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.put(data, relativePath);

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

export async function readVaultFile(relativePath: string): Promise<Uint8Array | null> {
  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, "readonly");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.get(relativePath);

    request.onsuccess = () => {
      db.close();
      const result = request.result;

      if (result instanceof Uint8Array) {
        resolve(result);
      } else if (result instanceof Blob) {
        result.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
      } else {
        resolve(null);
      }
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function vaultFileExists(relativePath: string): Promise<boolean> {
  const data = await readVaultFile(relativePath);
  return data !== null;
}

export async function deleteVaultFile(relativePath: string): Promise<void> {
  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(VAULT_STORE_NAME, "readwrite");
    const store = transaction.objectStore(VAULT_STORE_NAME);
    const request = store.delete(relativePath);

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

export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as ArrayBufferView<ArrayBuffer>);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
