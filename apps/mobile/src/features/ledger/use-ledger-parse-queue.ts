import { useEffect, useState } from "react";

import { useAppShell } from "../app-shell/provider";
import {
  createEmptyReviewValues,
  deriveReviewValues,
  type EvidenceQueueItem,
  type LedgerReviewValues,
} from "./ledger-domain";
import {
  confirmEvidenceReview,
  loadParseQueue,
  parseEvidence,
  retryEvidenceParsing,
} from "./ledger-runtime";

export function useLedgerParseQueue() {
  const { storageRevision } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queue, setQueue] = useState<EvidenceQueueItem[]>([]);
  const [review, setReview] = useState<LedgerReviewValues>(createEmptyReviewValues);

  const currentItem = queue[0] ?? null;

  useEffect(() => {
    void refresh();
  }, [storageRevision]);

  useEffect(() => {
    if (currentItem) {
      setReview(deriveReviewValues(currentItem));
    } else {
      setReview(createEmptyReviewValues());
    }
  }, [currentItem?.evidenceId]);

  useEffect(() => {
    if (!currentItem || currentItem.parseStatus !== "pending" || currentItem.extractedData?.rawText || isParsing) {
      return;
    }

    setIsParsing(true);
    setError(null);

    parseEvidence(currentItem.evidenceId)
      .then(() => refresh())
      .catch((nextError: unknown) => {
        setError(nextError instanceof Error ? nextError.message : "Parsing failed.");
      })
      .finally(() => {
        setIsParsing(false);
      });
  }, [currentItem?.evidenceId, currentItem?.parseStatus, currentItem?.extractedData?.rawText, isParsing]);

  async function refresh(): Promise<void> {
    setError(null);

    try {
      const nextQueue = await loadParseQueue();
      setQueue(nextQueue);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Parse queue failed to load.");
    } finally {
      setIsLoaded(true);
    }
  }

  async function retry(): Promise<void> {
    if (!currentItem) {
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      await retryEvidenceParsing(currentItem.evidenceId);
      await refresh();
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Evidence retry failed.");
    } finally {
      setIsParsing(false);
    }
  }

  async function submit(): Promise<boolean> {
    if (!currentItem) {
      return true;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await confirmEvidenceReview(currentItem.evidenceId, review);
      await refresh();
      return true;
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Evidence submission failed.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof LedgerReviewValues>(field: K, value: LedgerReviewValues[K]) {
    setReview((current) => ({ ...current, [field]: value }));
  }

  return {
    currentItem,
    error,
    isLoaded,
    isParsing,
    isSubmitting,
    queue,
    refresh,
    retry,
    review,
    submit,
    updateField,
  };
}
