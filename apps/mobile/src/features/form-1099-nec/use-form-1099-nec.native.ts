import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

import {
  buildForm1099NecSnapshot,
  formatCurrencyLabel,
  type Form1099NecDatabaseSnapshot,
  type Form1099NecRecipientPreview,
} from "./form-1099-nec-model";

interface EntityRow {
  legalName: string;
}

interface RecipientRow {
  counterpartyId: string;
  currency: string | null;
  displayName: string | null;
  grossAmountCents: number;
  legalName: string;
  recordCount: number;
  taxIdMasked: string | null;
  withholdingAmountCents: number;
}

export interface UseForm1099NecResult {
  error: string | null;
  isLoaded: boolean;
  recipients: readonly Form1099NecRecipientPreview[];
  selectRecipient: (recipientId: string) => void;
  selectedRecipientId: string | null;
  snapshot: Form1099NecDatabaseSnapshot;
}

export function useForm1099Nec(): UseForm1099NecResult {
  const database = useSQLiteContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [payerLegalName, setPayerLegalName] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<readonly Form1099NecRecipientPreview[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadForm1099NecData(database)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setPayerLegalName(result.payerLegalName);
        setRecipients(result.recipients);
        setSelectedRecipientId(result.recipients[0]?.counterpartyId ?? null);
        setIsLoaded(true);
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load Form 1099-NEC preview.");
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [database]);

  const selectedRecipient =
    recipients.find((recipient) => recipient.counterpartyId === selectedRecipientId) ?? null;
  const snapshot = buildForm1099NecSnapshot({ payerLegalName, recipient: selectedRecipient });

  return {
    error,
    isLoaded,
    recipients,
    selectRecipient: setSelectedRecipientId,
    selectedRecipientId,
    snapshot,
  };
}

async function loadForm1099NecData(database: ReturnType<typeof useSQLiteContext>): Promise<{
  payerLegalName: string | null;
  recipients: readonly Form1099NecRecipientPreview[];
}> {
  const payerRow = await database.getFirstAsync<EntityRow>(
    `SELECT legal_name AS legalName
    FROM entities
    ORDER BY created_at ASC
    LIMIT 1;`,
  );
  const recipientRows = await database.getAllAsync<RecipientRow>(
    `SELECT
      c.counterparty_id AS counterpartyId,
      COALESCE(MAX(r.currency), 'USD') AS currency,
      c.display_name AS displayName,
      COALESCE(
        SUM(
          CASE
            WHEN r.record_status IN ('posted', 'reconciled') THEN r.gross_amount_cents
            ELSE 0
          END
        ),
        0
      ) AS grossAmountCents,
      c.legal_name AS legalName,
      COUNT(r.record_id) AS recordCount,
      c.tax_id_masked AS taxIdMasked,
      COALESCE(
        SUM(
          CASE
            WHEN r.record_status IN ('posted', 'reconciled') THEN r.withholding_amount_cents
            ELSE 0
          END
        ),
        0
      ) AS withholdingAmountCents
    FROM counterparties c
    LEFT JOIN records r ON r.counterparty_id = c.counterparty_id
    GROUP BY
      c.counterparty_id,
      c.display_name,
      c.legal_name,
      c.tax_id_masked,
      c.created_at
    ORDER BY recordCount DESC, grossAmountCents DESC, c.created_at ASC;`,
  );

  return {
    payerLegalName: payerRow?.legalName ?? null,
    recipients: recipientRows.map((row) => ({
      counterpartyId: row.counterpartyId,
      currency: row.currency,
      grossAmountCents: row.grossAmountCents,
      grossAmountLabel:
        row.recordCount > 0
          ? formatCurrencyLabel(row.grossAmountCents, row.currency ?? "USD")
          : "No linked record totals",
      label: row.displayName ?? row.legalName,
      legalName: row.legalName,
      recordCount: row.recordCount,
      taxIdMasked: row.taxIdMasked,
      withholdingAmountCents: row.withholdingAmountCents,
    })),
  };
}
