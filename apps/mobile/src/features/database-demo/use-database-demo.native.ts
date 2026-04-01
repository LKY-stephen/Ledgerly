import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  buildDatabaseDemoFieldUpdate,
  createEmptyDatabaseDemoSnapshot,
  databaseDemoEditableFields,
  databaseDemoReceiptClassificationOptions,
  type DatabaseDemoEditableField,
  type DatabaseDemoEditableFieldOption,
  type DatabaseDemoReceiptClassification,
  type DatabaseDemoReceiptClassificationOption,
  type DatabaseDemoSnapshot,
} from "./demo-data";
import {
  createDatabaseDemoRecord,
  loadDatabaseDemoEditableRecord,
  loadDatabaseDemoSnapshot,
  updateDatabaseDemoRecordField,
} from "./database-demo-data-access";
import { createWritableStorageDatabase } from "../../storage/storage-adapter";

type DemoDatabase = ReturnType<typeof useSQLiteContext>;

export interface UseDatabaseDemoResult {
  createRecord: () => Promise<void>;
  deleteRecord: () => Promise<void>;
  editableFields: readonly DatabaseDemoEditableFieldOption[];
  error: string | null;
  isBusy: boolean;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  receiptClassifications: readonly DatabaseDemoReceiptClassificationOption[];
  selectClassification: (classification: DatabaseDemoReceiptClassification) => void;
  selectField: (field: DatabaseDemoEditableField) => void;
  selectRecord: (recordId: string) => Promise<void>;
  selectedClassification: DatabaseDemoReceiptClassification;
  selectedField: DatabaseDemoEditableField;
  selectedRecordId: string | null;
  snapshot: DatabaseDemoSnapshot;
  updateSelectedRecord: () => Promise<void>;
}

export function useDatabaseDemo(): UseDatabaseDemoResult {
  const database = useSQLiteContext();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedClassification, setSelectedClassification] =
    useState<DatabaseDemoReceiptClassification>(
      databaseDemoReceiptClassificationOptions[0]?.value ?? "income",
    );
  const [selectedField, setSelectedField] = useState<DatabaseDemoEditableField>(
    databaseDemoEditableFields[0]?.value ?? "description",
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DatabaseDemoSnapshot>(createEmptyDatabaseDemoSnapshot);

  useEffect(() => {
    let isMounted = true;

    loadSnapshot(database, null)
      .then((result) => {
        if (isMounted) {
          setSnapshot(result.snapshot);
          setSelectedRecordId(result.selectedRecordId);
          setIsLoaded(true);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(nextError));
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database]);

  async function runAction(action: () => Promise<string | null>): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const preferredSelectedRecordId = await action();
      const result = await loadSnapshot(database, preferredSelectedRecordId);
      setSnapshot(result.snapshot);
      setSelectedRecordId(result.selectedRecordId);
    } catch (nextError: unknown) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsBusy(false);
      setIsLoaded(true);
    }
  }

  async function refresh(): Promise<void> {
    await runAction(async () => selectedRecordId);
  }

  async function createRecord(): Promise<void> {
    await runAction(async () => {
      let createdRecordId: string | null = null;

      await database.withTransactionAsync(async () => {
        createdRecordId = await createDatabaseDemoRecord(
          createWritableStorageDatabase(database),
          selectedClassification,
        );
      });

      return createdRecordId;
    });
  }

  async function updateSelectedRecord(): Promise<void> {
    await runAction(async () => {
      if (!selectedRecordId) {
        return null;
      }

      await database.withTransactionAsync(async () => {
        const readableDatabase = createWritableStorageDatabase(database);
        const existingRecord = await loadDatabaseDemoEditableRecord(readableDatabase, selectedRecordId);

        if (!existingRecord) {
          return;
        }

        const update = buildDatabaseDemoFieldUpdate(existingRecord, selectedField);
        await updateDatabaseDemoRecordField(
          readableDatabase,
          existingRecord.recordId,
          update,
        );
      });

      return selectedRecordId;
    });
  }

  async function deleteRecord(): Promise<void> {
    await runAction(async () => {
      if (!selectedRecordId) {
        return null;
      }

      await database.runAsync("DELETE FROM records WHERE record_id = ?;", selectedRecordId);
      return null;
    });
  }

  async function selectRecord(recordId: string): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const result = await loadSnapshot(database, recordId);
      setSnapshot(result.snapshot);
      setSelectedRecordId(result.selectedRecordId);
    } catch (nextError: unknown) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsBusy(false);
      setIsLoaded(true);
    }
  }

  return {
    createRecord,
    deleteRecord,
    editableFields: databaseDemoEditableFields,
    error,
    isBusy,
    isLoaded,
    refresh,
    receiptClassifications: databaseDemoReceiptClassificationOptions,
    selectClassification: setSelectedClassification,
    selectField: setSelectedField,
    selectRecord,
    selectedClassification,
    selectedField,
    selectedRecordId,
    snapshot,
    updateSelectedRecord,
  };
}

async function loadSnapshot(database: DemoDatabase, preferredSelectedRecordId: string | null) {
  return loadDatabaseDemoSnapshot(createWritableStorageDatabase(database), preferredSelectedRecordId);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Database demo action failed.";
}
