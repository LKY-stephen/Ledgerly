const VAULT_STORE_NAME = "ledgerly-file-vault";
const IDB_NAME = "ledgerly-vault-idb";
const IDB_VERSION = 1;
const LEGACY_PRODUCT_SLUG = ["creator", "cfo"].join("-");
const LEGACY_VAULT_DATABASES = [
  {
    databaseName: `${LEGACY_PRODUCT_SLUG}-vault-idb`,
    storeName: `${LEGACY_PRODUCT_SLUG}-file-vault`,
  },
] as const;

function openVaultDB(
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

async function readVaultEntry(
  databaseName: string,
  storeName: string,
  relativePath: string,
): Promise<Blob | Uint8Array | null> {
  const db = await openVaultDB(databaseName, storeName);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(relativePath);

    request.onsuccess = () => {
      db.close();
      const result = request.result;
      resolve(result instanceof Uint8Array || result instanceof Blob ? result : null);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function writeVaultFile(relativePath: string, data: Blob | Uint8Array): Promise<void> {
  const db = await openVaultDB(IDB_NAME, VAULT_STORE_NAME);

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
  const activeResult = await readVaultEntry(IDB_NAME, VAULT_STORE_NAME, relativePath);

  if (activeResult instanceof Uint8Array) {
    return activeResult;
  }

  if (activeResult instanceof Blob) {
    return new Uint8Array(await activeResult.arrayBuffer());
  }

  for (const legacy of LEGACY_VAULT_DATABASES) {
    const legacyResult = await readVaultEntry(
      legacy.databaseName,
      legacy.storeName,
      relativePath,
    );

    if (legacyResult instanceof Uint8Array) {
      await writeVaultFile(relativePath, legacyResult);
      return legacyResult;
    }

    if (legacyResult instanceof Blob) {
      const data = new Uint8Array(await legacyResult.arrayBuffer());
      await writeVaultFile(relativePath, data);
      return data;
    }
  }

  return null;
}

export async function vaultFileExists(relativePath: string): Promise<boolean> {
  const data = await readVaultFile(relativePath);
  return data !== null;
}

export async function deleteVaultFile(relativePath: string): Promise<void> {
  const removeFromStore = async (databaseName: string, storeName: string) => {
    const db = await openVaultDB(databaseName, storeName);

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
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
  };

  await removeFromStore(IDB_NAME, VAULT_STORE_NAME);

  for (const legacy of LEGACY_VAULT_DATABASES) {
    await removeFromStore(legacy.databaseName, legacy.storeName);
  }
}

export async function computeSha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as ArrayBufferView<ArrayBuffer>);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
