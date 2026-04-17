import { useEffect, useState } from "react";

import {
  buildForm1099NecSnapshot,
  type Form1099NecDatabaseSnapshot,
  type Form1099NecRecipientPreview,
} from "./form-1099-nec-model";
import { useWebDatabaseContext } from "../../storage/provider.web";
import type { WebSqliteDatabase } from "../../storage/web-sqlite";

interface EntityRow {
  legalName: string;
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
  const database = useWebDatabaseContext();
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

async function loadForm1099NecData(database: WebSqliteDatabase): Promise<{
  payerLegalName: string | null;
  recipients: readonly Form1099NecRecipientPreview[];
}> {
  const payerRow = await database.getFirstAsync<EntityRow>(
    `SELECT legal_name AS legalName
    FROM entities
    ORDER BY created_at ASC
    LIMIT 1;`,
  );

  // The full 1099-NEC query depends on columns not yet in the base schema.
  // Return entity name with empty recipients for now.
  return {
    payerLegalName: payerRow?.legalName ?? null,
    recipients: [],
  };
}
