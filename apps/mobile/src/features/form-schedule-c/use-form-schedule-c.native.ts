import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  buildFormScheduleCSnapshot,
  type FormScheduleCDatabaseSnapshot,
} from "./form-schedule-c-model";

interface EntityRow {
  legalName: string;
}

interface IncomeTotalsRow {
  currency: string | null;
  grossReceiptsCents: number;
  incomeRecordCount: number;
}

export interface UseFormScheduleCResult {
  error: string | null;
  isLoaded: boolean;
  snapshot: FormScheduleCDatabaseSnapshot;
}

export function useFormScheduleC(): UseFormScheduleCResult {
  const database = useSQLiteContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<FormScheduleCDatabaseSnapshot>(
    buildFormScheduleCSnapshot({
      currency: null,
      grossReceiptsCents: null,
      incomeRecordCount: 0,
      proprietorName: null,
    }),
  );

  useEffect(() => {
    let isMounted = true;

    loadFormScheduleCData(database)
      .then((nextSnapshot) => {
        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
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
  }, [database]);

  return {
    error,
    isLoaded,
    snapshot,
  };
}

async function loadFormScheduleCData(
  database: ReturnType<typeof useSQLiteContext>,
): Promise<FormScheduleCDatabaseSnapshot> {
  const proprietorRow = await database.getFirstAsync<EntityRow>(
    `SELECT legal_name AS legalName
    FROM entities
    ORDER BY created_at ASC
    LIMIT 1;`,
  );
  const incomeTotalsRow = await database.getFirstAsync<IncomeTotalsRow>(
    `SELECT
      COALESCE(MAX(currency), 'USD') AS currency,
      COALESCE(
        SUM(
          CASE
            WHEN record_status IN ('posted', 'reconciled')
             AND record_kind IN ('income', 'invoice_payment', 'platform_payout')
            THEN gross_amount_cents
            ELSE 0
          END
        ),
        0
      ) AS grossReceiptsCents,
      COALESCE(
        SUM(
          CASE
            WHEN record_status IN ('posted', 'reconciled')
             AND record_kind IN ('income', 'invoice_payment', 'platform_payout')
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS incomeRecordCount
    FROM records;`,
  );

  return buildFormScheduleCSnapshot({
    currency: incomeTotalsRow?.currency ?? null,
    grossReceiptsCents:
      (incomeTotalsRow?.incomeRecordCount ?? 0) > 0 ? incomeTotalsRow?.grossReceiptsCents ?? 0 : null,
    incomeRecordCount: incomeTotalsRow?.incomeRecordCount ?? 0,
    proprietorName: proprietorRow?.legalName ?? null,
  });
}
