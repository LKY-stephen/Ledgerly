export function formatUploadCandidateSize(sizeBytes: number | null): string | null {
  if (!sizeBytes || sizeBytes <= 0) {
    return null;
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function describeUploadCandidate(candidate: {
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
}): {
  detailLines: string[];
  iconName: "file-document-outline" | "image-outline" | "motion-play-outline";
  title: string;
} {
  const mimeLabel = candidate.mimeType?.trim() || "Unknown type";
  const sizeLabel = formatUploadCandidateSize(candidate.sizeBytes);

  if (candidate.kind === "live_photo") {
    return {
      detailLines: [`Type: ${mimeLabel}`, ...(sizeLabel ? [`Size: ${sizeLabel}`] : [])],
      iconName: "motion-play-outline",
      title: "Live photo preview",
    };
  }

  if (candidate.kind === "image") {
    return {
      detailLines: [`Type: ${mimeLabel}`, ...(sizeLabel ? [`Size: ${sizeLabel}`] : [])],
      iconName: "image-outline",
      title: "Image preview",
    };
  }

  return {
    detailLines: [`Type: ${mimeLabel}`, ...(sizeLabel ? [`Size: ${sizeLabel}`] : [])],
    iconName: "file-document-outline",
    title: "Document preview",
  };
}

interface ProposalUiCopy {
  approveLabel: string;
  detailLines: string[];
  rejectLabel: string;
  summary: string | null;
  title: string;
}

export function formatProposalType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getProposalUiCopy(
  proposalType: string,
  payload: Record<string, unknown> | null | undefined,
): ProposalUiCopy {
  const values = payload ?? {};

  if (proposalType === "resolve_duplicate_receipt") {
    const overlapCount = readFirstNumber(
      values.overlapEntryCount,
      values.overlappingEntryCount,
      values.duplicateEntryCount,
      values.overlapCount,
    );
    const relatedReceiptLabel = readFirstString(
      values.relatedEvidenceFileName,
      values.relatedEvidenceLabel,
      values.conflictLabel,
      values.duplicateReceiptLabel,
      values.duplicateEvidenceId,
    );

    return {
      approveLabel: "Merge Receipt",
      detailLines: [
        ...(relatedReceiptLabel ? [`Conflict: ${relatedReceiptLabel}`] : []),
        ...(overlapCount !== null ? [`Overlapping entries: ${overlapCount}`] : []),
      ],
      rejectLabel: "Keep Separate",
      summary:
        overlapCount !== null
          ? `This upload appears to overlap ${overlapCount} receipt ${overlapCount === 1 ? "entry" : "entries"}.`
          : "This upload appears to duplicate an existing receipt review.",
      title: "Duplicate receipt decision",
    };
  }

  if (proposalType === "merge_counterparty") {
    const parsedParty = readFirstString(
      values.parsedDisplayName,
      values.displayName,
      values.proposedDisplayName,
      values.newCounterpartyName,
    );
    const existingParty = readFirstString(
      values.existingDisplayName,
      values.keepDisplayName,
      values.matchedDisplayName,
      values.existingCounterpartyName,
    );

    return {
      approveLabel: "Merge Counterparty",
      detailLines: [
        ...(parsedParty ? [`Parsed party: ${parsedParty}`] : []),
        ...(existingParty ? [`Keep existing: ${existingParty}`] : []),
      ],
      rejectLabel: "Keep New Counterparty",
      summary: existingParty
        ? `Use ${existingParty} instead of creating a duplicate local counterparty.`
        : "A likely existing local counterparty was found for this parsed party.",
      title: "Counterparty merge decision",
    };
  }

  return {
    approveLabel: "Approve",
    detailLines: [],
    rejectLabel: "Reject",
    summary: null,
    title: formatProposalType(proposalType),
  };
}

function readFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value);
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return Math.round(parsed);
      }
    }
  }

  return null;
}

function readFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
