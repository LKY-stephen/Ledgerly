import type {
  CandidateRecordState,
  WorkflowWriteProposalPayload,
  WorkflowWriteProposalState,
} from "@ledgerly/schemas";

import { getAppCopy } from "../app-shell/copy";
import type { ResolvedLocale } from "../app-shell/types";

export function formatLedgerParseProposalType(
  proposalType: WorkflowWriteProposalPayload["proposalType"],
  locale: ResolvedLocale,
): string {
  const copy = getAppCopy(locale).ledger.parse;

  switch (proposalType) {
    case "create_counterparty":
      return copy.proposalTypeCreateCounterparty;
    case "merge_counterparty":
      return copy.proposalTypeMergeCounterparty;
    case "persist_candidate_record":
      return copy.proposalTypePersistCandidateRecord;
    case "resolve_duplicate_receipt":
      return copy.proposalTypeResolveDuplicateReceipt;
    case "update_candidate_record":
      return copy.proposalTypeUpdateCandidateRecord;
    case "update_workflow_state":
      return copy.proposalTypeUpdateWorkflowState;
    default:
      return proposalType;
  }
}

export function formatLedgerParseWorkflowState(
  state: WorkflowWriteProposalState,
  locale: ResolvedLocale,
): string {
  const copy = getAppCopy(locale).ledger.parse;

  switch (state) {
    case "approved":
      return copy.proposalStateApproved;
    case "blocked":
      return copy.proposalStateBlocked;
    case "executed":
      return copy.proposalStateExecuted;
    case "failed":
      return copy.proposalStateFailed;
    case "pending_approval":
      return copy.proposalStatePendingApproval;
    case "rejected":
      return copy.proposalStateRejected;
    default:
      return state;
  }
}

export function formatLedgerParseCandidateState(
  state: CandidateRecordState,
  locale: ResolvedLocale,
): string {
  const copy = getAppCopy(locale).ledger.parse;

  switch (state) {
    case "approved":
      return copy.reviewStateApproved;
    case "candidate":
      return copy.reviewStateCandidate;
    case "duplicate":
      return copy.reviewStateDuplicate;
    case "failed":
      return copy.reviewStateFailed;
    case "needs_review":
      return copy.reviewStateNeedsReview;
    case "persisted_draft":
      return copy.reviewStatePersistedDraft;
    case "persisted_final":
      return copy.reviewStatePersistedFinal;
    case "proposed_write_pending":
      return copy.reviewStateProposedWritePending;
    case "rejected":
      return copy.reviewStateRejected;
    case "validated":
      return copy.reviewStateValidated;
    default:
      return state;
  }
}
