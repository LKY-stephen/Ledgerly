import { useEffect, useState } from "react";

import { useAppShell } from "../app-shell/provider";
import {
  createEmptyReviewValues,
  deriveReviewValues,
  type EvidenceQueueItem,
  type LedgerReviewValues,
} from "./ledger-domain";
import {
  clearFailedEvidence,
  confirmEvidenceReview,
  loadParseQueue,
  parseEvidence,
  retryEvidenceParsing,
} from "./ledger-runtime";

export function useLedgerParseQueue() {
  const { resolvedLocale, storageRevision } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearingBatchId, setClearingBatchId] = useState<string | null>(null);
  const [retryingEvidenceId, setRetryingEvidenceId] = useState<string | null>(
    null,
  );
  const [queue, setQueue] = useState<EvidenceQueueItem[]>([]);
  const [review, setReview] = useState<LedgerReviewValues>(
    createEmptyReviewValues,
  );

  const currentItem =
    queue.find((item) => item.displayState === "ready_for_review") ?? null;
  const workerItem =
    queue.find(
      (item) =>
        item.displayState === "queued" || item.displayState === "recovering",
    ) ?? null;

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
    if (
      !workerItem ||
      isParsing
    ) {
      return;
    }

    setIsParsing(true);
    setError(null);

    parseEvidence(workerItem.evidenceId)
      .then(() => refresh())
      .catch((nextError: unknown) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : resolvedLocale === "zh-CN"
              ? "解析失败。"
              : "Parsing failed.",
        );
      })
      .finally(() => {
        setIsParsing(false);
      });
  }, [
    workerItem?.evidenceId,
    isParsing,
  ]);

  async function refresh(): Promise<void> {
    setError(null);

    try {
      const nextQueue = await loadParseQueue();
      setQueue(nextQueue);
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : resolvedLocale === "zh-CN"
            ? "解析队列加载失败。"
            : "Parse queue failed to load.",
      );
    } finally {
      setIsLoaded(true);
    }
  }

  async function retry(
    item: EvidenceQueueItem | null = currentItem ?? workerItem ?? null,
  ): Promise<void> {
    if (!item) {
      return;
    }

    setRetryingEvidenceId(item.evidenceId);
    setError(null);

    try {
      await retryEvidenceParsing(item.evidenceId);
      await refresh();
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : resolvedLocale === "zh-CN"
            ? "重试凭证解析失败。"
            : "Evidence retry failed.",
      );
    } finally {
      setRetryingEvidenceId(null);
    }
  }

  async function clear(item: EvidenceQueueItem): Promise<void> {
    if (item.displayState !== "failed") {
      return;
    }

    setClearingBatchId(item.batchId);
    setError(null);

    try {
      await clearFailedEvidence(item.evidenceId);
      await refresh();
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : resolvedLocale === "zh-CN"
            ? "清除失败任务失败。"
            : "Clearing failed task failed.",
      );
    } finally {
      setClearingBatchId(null);
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
      setError(
        nextError instanceof Error
          ? nextError.message
          : resolvedLocale === "zh-CN"
            ? "提交凭证失败。"
            : "Evidence submission failed.",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof LedgerReviewValues>(
    field: K,
    value: LedgerReviewValues[K],
  ) {
    setReview((current) => ({ ...current, [field]: value }));
  }

  return {
    clear,
    currentItem,
    error,
    clearingBatchId,
    isLoaded,
    isParsing,
    isSubmitting,
    queue,
    refresh,
    retry,
    retryingEvidenceId,
    review,
    submit,
    updateField,
  };
}
