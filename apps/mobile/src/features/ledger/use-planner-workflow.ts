import { useCallback, useState } from "react";

import { useAppShell } from "../app-shell/provider";
import type {
  LedgerReviewValues,
  ProposalApprovalOptions,
} from "./ledger-domain";
import {
  createEmptyReviewValues,
  getPreferredPlannerCandidateIndex,
} from "./ledger-domain";
import {
  approveWriteProposal,
  loadPlannerState,
  rejectWriteProposal,
  runPlanner,
  type PlannerResult,
} from "./ledger-runtime";

function getPreferredCandidateIndex(result: PlannerResult): number {
  return getPreferredPlannerCandidateIndex({
    candidateRecords: result.candidateRecords.map((candidate) => ({
      candidateId: candidate.candidateId,
      state: candidate.state,
    })),
    writeProposals: result.writeProposals.map((proposal) => ({
      candidateId: proposal.candidateId,
      state: proposal.state,
    })),
  });
}

export function usePlannerWorkflow(input: {
  batchId?: string | null;
  fileName: string;
  mimeType: string | null;
  model: string;
  parserKind?: string;
  profileInfo?: { name: string; email: string; phone: string };
  rawJson: unknown;
  rawText: string;
}) {
  const {
    aiProvider,
    bumpStorageRevision,
    copy,
    geminiApiKey,
    geminiAuthMode,
    inferApiKey,
    inferBaseUrl,
    inferModel,
    openAiApiKey,
  } = useAppShell();
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

  const hydratePlannerState = useCallback(async () => {
    if (!input.batchId) {
      return false;
    }

    const existing = await loadPlannerState(input.batchId);

    if (!existing) {
      return false;
    }

    setPlannerResult(existing);
    setSelectedCandidateIndex(getPreferredCandidateIndex(existing));
    return true;
  }, [input.batchId]);

  const startPlanner = useCallback(async () => {
    if (input.batchId) {
      const hydrated = await hydratePlannerState();

      if (hydrated) {
        return;
      }
    }

    setIsPlanning(true);
    setError(null);

    try {
      const result = await runPlanner({
        batchId: input.batchId ?? undefined,
        fileName: input.fileName,
        mimeType: input.mimeType,
        model: input.model,
        parserKind: input.parserKind,
        providerConfig: {
          aiProvider,
          geminiApiKey,
          geminiAuthMode,
          inferApiKey,
          inferBaseUrl,
          inferModel,
          openAiApiKey,
        },
        profileInfo: input.profileInfo,
        rawJson: input.rawJson,
        rawText: input.rawText,
      });

      setPlannerResult(result);
      setSelectedCandidateIndex(getPreferredCandidateIndex(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : parseCopy.plannerFailed);
    } finally {
      setIsPlanning(false);
    }
  }, [
    input.fileName,
    input.batchId,
    aiProvider,
    geminiApiKey,
    geminiAuthMode,
    inferApiKey,
    inferBaseUrl,
    inferModel,
    input.mimeType,
    input.model,
    openAiApiKey,
    input.rawJson,
    input.rawText,
    hydratePlannerState,
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
        setSelectedCandidateIndex(getPreferredCandidateIndex(result));

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
        setSelectedCandidateIndex(getPreferredCandidateIndex(result));

        if (
          result.batchState === "approved" ||
          result.batchState === "partially_approved" ||
          result.batchState === "rejected"
        ) {
          bumpStorageRevision();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : parseCopy.rejectionFailed,
        );
      } finally {
        setIsApproving(false);
      }
    },
    [bumpStorageRevision, parseCopy.rejectionFailed, plannerResult],
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
