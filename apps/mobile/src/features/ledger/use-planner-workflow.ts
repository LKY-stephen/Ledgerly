import { useCallback, useState } from "react";

import { useAppShell } from "../app-shell/provider";
import type {
  LedgerReviewValues,
  ProposalApprovalOptions,
} from "./ledger-domain";
import { createEmptyReviewValues } from "./ledger-domain";
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
  parserKind?: string;
  profileInfo?: { name: string; email: string; phone: string };
  rawJson: unknown;
  rawText: string;
}) {
  const { bumpStorageRevision, copy } = useAppShell();
  const parseCopy = copy.ledger.parse;
  const [plannerResult, setPlannerResult] = useState<PlannerResult | null>(
    null,
  );
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const review =
    plannerResult?.candidateRecords[selectedCandidateIndex]?.reviewValues ??
    createEmptyReviewValues();

  const startPlanner = useCallback(async () => {
    setIsPlanning(true);
    setError(null);

    try {
      const result = await runPlanner({
        fileName: input.fileName,
        mimeType: input.mimeType,
        model: input.model,
        parserKind: input.parserKind,
        profileInfo: input.profileInfo,
        rawJson: input.rawJson,
        rawText: input.rawText,
      });

      setPlannerResult(result);
      setSelectedCandidateIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : parseCopy.plannerFailed);
    } finally {
      setIsPlanning(false);
    }
  }, [
    input.fileName,
    input.mimeType,
    input.model,
    input.rawJson,
    input.rawText,
    parseCopy.plannerFailed,
  ]);

  const approveProposal = useCallback(
    async (
      writeProposalId: string,
      options?: ProposalApprovalOptions,
    ) => {
      if (!plannerResult) return;

      setIsApproving(true);
      setError(null);

      try {
        const proposal = plannerResult.writeProposals.find(
          (item) => item.writeProposalId === writeProposalId,
        );
        const proposalReview = proposal?.candidateId
          ? plannerResult.candidateRecords.find(
              (candidate) => candidate.candidateId === proposal.candidateId,
            )?.reviewValues ?? review
          : review;
        const result = await approveWriteProposal(
          plannerResult.batchId,
          writeProposalId,
          proposalReview,
          options,
        );

        setPlannerResult(result);
        setSelectedCandidateIndex((current) =>
          result.candidateRecords.length === 0
            ? 0
            : Math.min(current, result.candidateRecords.length - 1),
        );

        if (
          result.batchState === "approved" ||
          result.batchState === "partially_approved"
        ) {
          bumpStorageRevision();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : parseCopy.approvalFailed);
      } finally {
        setIsApproving(false);
      }
    },
    [bumpStorageRevision, parseCopy.approvalFailed, plannerResult, review],
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
        setSelectedCandidateIndex((current) =>
          result.candidateRecords.length === 0
            ? 0
            : Math.min(current, result.candidateRecords.length - 1),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : parseCopy.rejectionFailed,
        );
      } finally {
        setIsApproving(false);
      }
    },
    [parseCopy.rejectionFailed, plannerResult],
  );

  const updateField = useCallback(
    (field: keyof LedgerReviewValues, value: string) => {
      setPlannerResult((current) => {
        if (!current) {
          return current;
        }

        const candidate = current.candidateRecords[selectedCandidateIndex];

        if (!candidate) {
          return current;
        }

        const nextReview = {
          ...candidate.reviewValues,
          [field]: value,
        };
        const candidateRecords = current.candidateRecords.map((item, index) =>
          index === selectedCandidateIndex
            ? {
                ...item,
                reviewValues: nextReview,
              }
            : item,
        );

        return {
          ...current,
          candidateRecords,
          reviewValues:
            candidateRecords[selectedCandidateIndex]?.reviewValues ??
            createEmptyReviewValues(),
        };
      });
    },
    [selectedCandidateIndex],
  );

  return {
    approveProposal,
    error,
    isApproving,
    isPlanning,
    plannerResult,
    rejectProposal,
    review,
    selectedCandidateIndex,
    selectCandidate: setSelectedCandidateIndex,
    startPlanner,
    updateField,
  };
}
