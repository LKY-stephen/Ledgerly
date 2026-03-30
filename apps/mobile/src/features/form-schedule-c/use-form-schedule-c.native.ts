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

interface PartVOtherExpenseRow {
  amountCents: number;
  businessUseBps: number;
  category: string | null;
  currency: string | null;
  description: string;
  memo: string | null;
  subcategory: string | null;
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
      partVOtherExpenseAmountCents: null,
      partVOtherExpenseCurrency: null,
      partVOtherExpenseLabel: null,
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
  const partVOtherExpenseRow = await database.getFirstAsync<PartVOtherExpenseRow>(
    `SELECT
      description,
      memo,
      category_code AS category,
      subcategory_code AS subcategory,
      currency,
      primary_amount_cents AS amountCents,
      business_use_bps AS businessUseBps
    FROM records
    WHERE record_status IN ('posted', 'reconciled')
      AND record_kind IN ('expense', 'asset_purchase', 'reimbursable_expense')
      AND COALESCE(tax_line_code, '') = ''
      AND COALESCE(tax_category_code, '') = ''
      AND ABS(primary_amount_cents) > 0
    ORDER BY COALESCE(cash_on, recognition_on) DESC, created_at DESC, record_id DESC
    LIMIT 1;`,
  );
  const partVOtherExpenseCandidateLabel = formatPartVOtherExpenseLabel(partVOtherExpenseRow);
  const partVOtherExpenseAmountCentsRaw =
    partVOtherExpenseRow && partVOtherExpenseCandidateLabel
      ? Math.round(
          (Math.abs(partVOtherExpenseRow.amountCents) *
            Math.max(partVOtherExpenseRow.businessUseBps ?? 10000, 0)) /
            10000,
        )
      : null;
  const partVOtherExpenseAmountCents =
    partVOtherExpenseAmountCentsRaw && partVOtherExpenseAmountCentsRaw > 0
      ? partVOtherExpenseAmountCentsRaw
      : null;
  const partVOtherExpenseLabel =
    partVOtherExpenseAmountCents !== null ? partVOtherExpenseCandidateLabel : null;

  return buildFormScheduleCSnapshot({
    currency: incomeTotalsRow?.currency ?? null,
    grossReceiptsCents:
      (incomeTotalsRow?.incomeRecordCount ?? 0) > 0 ? incomeTotalsRow?.grossReceiptsCents ?? 0 : null,
    incomeRecordCount: incomeTotalsRow?.incomeRecordCount ?? 0,
    partVOtherExpenseAmountCents,
    partVOtherExpenseCurrency: partVOtherExpenseRow?.currency ?? null,
    partVOtherExpenseLabel,
    proprietorName: proprietorRow?.legalName ?? null,
  });
}

function formatPartVOtherExpenseLabel(row: PartVOtherExpenseRow | null) {
  if (!row) {
    return null;
  }

  const candidateValues = [row.description, row.memo, row.subcategory, row.category];

  for (const candidate of candidateValues) {
    const normalizedCandidate = candidate?.trim();

    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
}
