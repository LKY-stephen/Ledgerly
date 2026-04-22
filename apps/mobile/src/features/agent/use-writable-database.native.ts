import { useMemo } from "react";
import { useSQLiteContext } from "expo-sqlite";
import type { WritableStorageDatabase } from "@ledgerly/storage";
import { createWritableStorageDatabase } from "../../storage/storage-adapter";

export function useWritableDatabase(): WritableStorageDatabase | null {
  const database = useSQLiteContext();
  return useMemo(() => createWritableStorageDatabase(database), [database]);
}
