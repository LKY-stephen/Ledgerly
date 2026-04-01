import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  loadEntityLegalName,
  loadScheduleCAggregation,
  type TaxQueryScope,
} from "@creator-cfo/storage";

import {
  buildFormScheduleCSnapshot,
  createEmptyFormScheduleCSnapshot,
  type FormScheduleCDatabaseSnapshot,
} from "./form-schedule-c-model";
import { createReadableStorageDatabase } from "../../storage/storage-adapter";

interface EntityIdRow {
  entityId: string;
}

export interface FormScheduleCRequirement {
  code: "entity_selection_required" | "review_required";
  message: string;
}

export interface FormScheduleCDataScope {
  entityId?: string | null;
  taxYear: number;
}

export interface UseFormScheduleCResult {
  error: string | null;
  isLoaded: boolean;
  requirements: FormScheduleCRequirement[];
  snapshot: FormScheduleCDatabaseSnapshot;
}

export function useFormScheduleC(scope: FormScheduleCDataScope): UseFormScheduleCResult {
  const database = useSQLiteContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [requirements, setRequirements] = useState<FormScheduleCRequirement[]>([]);
  const [snapshot, setSnapshot] = useState<FormScheduleCDatabaseSnapshot>(createEmptyFormScheduleCSnapshot());

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setIsLoaded(false);
    setRequirements([]);
    setSnapshot(createEmptyFormScheduleCSnapshot());

    loadFormScheduleCData(database, scope)
      .then((nextSnapshot) => {
        if (!isMounted) {
          return;
        }

        setError(null);
        setRequirements(nextSnapshot.requirements);
        setSnapshot(nextSnapshot.snapshot);
        setIsLoaded(true);
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load Schedule C preview.");
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [database, scope.entityId, scope.taxYear]);

  return {
    error,
    isLoaded,
    requirements,
    snapshot,
  };
}

async function loadFormScheduleCData(
  database: ReturnType<typeof useSQLiteContext>,
  scope: FormScheduleCDataScope,
) : Promise<{ requirements: FormScheduleCRequirement[]; snapshot: FormScheduleCDatabaseSnapshot }> {
  const storageDatabase = createReadableStorageDatabase(database);
  const { requirements: scopeRequirements, scope: resolvedScope } = await resolveTaxQueryScope(
    database,
    scope,
  );

  if (!resolvedScope) {
    return {
      requirements: scopeRequirements,
      snapshot: createEmptyFormScheduleCSnapshot(),
    };
  }

  const proprietorName = await loadEntityLegalName(storageDatabase, resolvedScope.entityId);
  const aggregation = await loadScheduleCAggregation(storageDatabase, resolvedScope);
  const hasScheduleCData =
    Object.keys(aggregation.lineAmounts).length > 0 ||
    Object.keys(aggregation.lineReviewNotes).length > 0 ||
    aggregation.partVRows.length > 0 ||
    aggregation.partVReviewNote !== null;

  const snapshot = buildFormScheduleCSnapshot({
    currency: hasScheduleCData ? "USD" : null,
    lineAmounts: aggregation.lineAmounts,
    lineReviewNotes: aggregation.lineReviewNotes,
    partVReviewNote: aggregation.partVReviewNote,
    partVRows: aggregation.partVRows,
    proprietorName,
  });

  const requirements = [...scopeRequirements];
  for (const note of Object.values(aggregation.lineReviewNotes)) {
    if (note) {
      requirements.push({
        code: "review_required",
        message: note,
      });
    }
  }
  if (aggregation.partVReviewNote) {
    requirements.push({
      code: "review_required",
      message: aggregation.partVReviewNote,
    });
  }

  return {
    requirements,
    snapshot,
  };
}

async function resolveTaxQueryScope(
  database: ReturnType<typeof useSQLiteContext>,
  scope: FormScheduleCDataScope,
): Promise<{ requirements: FormScheduleCRequirement[]; scope: TaxQueryScope | null }> {
  const normalizedEntityId = scope.entityId?.trim();

  if (normalizedEntityId) {
    return {
      requirements: [],
      scope: {
        entityId: normalizedEntityId,
        taxYear: scope.taxYear,
      },
    };
  }

  const entityRows = await database.getAllAsync<EntityIdRow>(
    `SELECT entity_id AS entityId
    FROM entities
    ORDER BY created_at ASC
    LIMIT 2;`,
  );

  if (entityRows.length === 1) {
    return {
      requirements: [],
      scope: {
        entityId: entityRows[0].entityId,
        taxYear: scope.taxYear,
      },
    };
  }

  if (entityRows.length > 1) {
    return {
      requirements: [
        {
          code: "entity_selection_required",
          message:
            "Multiple entities exist locally. Provide an explicit entityId before loading the Schedule C preview.",
        },
      ],
      scope: null,
    };
  }

  return {
    requirements: [],
    scope: null,
  };
}
