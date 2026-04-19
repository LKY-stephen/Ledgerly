import { useEffect, useState } from "react";

import {
  loadScheduleSEPreview,
  type TaxQueryScope,
} from "@ledgerly/storage";

import {
  buildFormScheduleSESnapshot,
  createEmptyFormScheduleSESnapshot,
  type FormScheduleSEDatabaseSnapshot,
} from "./form-schedule-se-model";
import {
  createReadableStorageDatabaseFromWeb,
  useWebDatabaseContext,
} from "../../storage/provider.web";
import type { WebSqliteDatabase } from "../../storage/web-sqlite";

interface EntityIdRow {
  entityId: string;
}

export interface FormScheduleSERequirement {
  code: "entity_selection_required" | "manual_input_required" | "review_required";
  message: string;
}

export interface FormScheduleSEDataScope {
  entityId?: string | null;
  taxYear: number;
}

export interface UseFormScheduleSEResult {
  error: string | null;
  isLoaded: boolean;
  requirements: FormScheduleSERequirement[];
  snapshot: FormScheduleSEDatabaseSnapshot;
}

export function useFormScheduleSE(scope: FormScheduleSEDataScope): UseFormScheduleSEResult {
  const database = useWebDatabaseContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [requirements, setRequirements] = useState<FormScheduleSERequirement[]>([]);
  const [snapshot, setSnapshot] = useState<FormScheduleSEDatabaseSnapshot>(createEmptyFormScheduleSESnapshot());

  useEffect(() => {
    let isMounted = true;
    setError(null);
    setIsLoaded(false);
    setRequirements([]);
    setSnapshot(createEmptyFormScheduleSESnapshot());

    loadFormScheduleSEData(database, scope)
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

        setError(nextError instanceof Error ? nextError.message : "Unable to load Schedule SE preview.");
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

async function loadFormScheduleSEData(
  database: WebSqliteDatabase,
  scope: FormScheduleSEDataScope,
) : Promise<{ requirements: FormScheduleSERequirement[]; snapshot: FormScheduleSEDatabaseSnapshot }> {
  const storageDatabase = createReadableStorageDatabaseFromWeb(database);
  const { requirements: scopeRequirements, scope: resolvedScope } = await resolveTaxQueryScope(
    database,
    scope,
  );

  if (!resolvedScope) {
    return {
      requirements: scopeRequirements,
      snapshot: createEmptyFormScheduleSESnapshot(),
    };
  }

  const preview = await loadScheduleSEPreview(storageDatabase, resolvedScope);
  const requirements = [...scopeRequirements];

  if (preview.netProfitCents === null && preview.sourceNote.trim()) {
    requirements.push({
      code: preview.sourceNote.includes("review") ? "review_required" : "manual_input_required",
      message: preview.sourceNote,
    });
  }

  return {
    requirements,
    snapshot: buildFormScheduleSESnapshot({
      supportedScheduleCNetProfitPreview: preview.netProfitCents !== null ? preview : null,
    }),
  };
}

async function resolveTaxQueryScope(
  database: WebSqliteDatabase,
  scope: FormScheduleSEDataScope,
): Promise<{ requirements: FormScheduleSERequirement[]; scope: TaxQueryScope | null }> {
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
            "Multiple entities exist locally. Provide an explicit entityId before loading the Schedule SE preview.",
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
