import { useCallback, useState } from "react";

import type { LedgerReviewValues } from "./ledger-domain";
import {
  approveWriteProposal,
  rejectWriteProposal,
  runPlanner,
  type PlannerResult,
} from "./ledger-runtime";

export function usePlannerWorkflow(input: {
  fileName: string;
  mimeType: string | null;
  model: string;
  rawJson: unknown;
  rawText: string;
}) {
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(null);
  const [review, setReview] = useState<LedgerReviewValues>({
    amount: "",
    category: "expense",
    date: "",
    description: "",
    notes: "",
    source: "",
    target: "",
    taxCategory: "",
  });
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPlanner = useCallback(async () => {
    setIsPlanning(true);
    setError(null);

    try {
      const result = await runPlanner({
        fileName: input.fileName,
        mimeType: input.mimeType,
        model: input.model,
        rawJson: input.rawJson,
        rawText: input.rawText,
      });

      setPlannerResult(result);
      setReview(result.reviewValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planner failed");
    } finally {
      setIsPlanning(false);
    }
  }, [input.fileName, input.mimeType, input.model, input.rawJson, input.rawText]);

  const approveProposal = useCallback(
    async (writeProposalId: string) => {
      if (!plannerResult) return;

      setIsApproving(true);
      setError(null);

      try {
        const result = await approveWriteProposal(
          plannerResult.batchId,
          writeProposalId,
          review,
        );

        setPlannerResult(result);

        if (result.reviewValues) {
          setReview(result.reviewValues);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approval failed");
      } finally {
        setIsApproving(false);
      }
    },
    [plannerResult, review],
  );

  const rejectProposal = useCallback(
    async (writeProposalId: string) => {
      if (!plannerResult) return;

      setIsApproving(true);
      setError(null);

      try {
        const result = await rejectWriteProposal(
          plannerResult.batchId,
          writeProposalId,
        );

        setPlannerResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rejection failed");
      } finally {
        setIsApproving(false);
      }
    },
    [plannerResult],
  );

  const updateField = useCallback(
    (field: keyof LedgerReviewValues, value: string) => {
      setReview((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return {
    approveProposal,
    error,
    isApproving,
    isPlanning,
    plannerResult,
    rejectProposal,
    review,
    startPlanner,
    updateField,
  };
}
