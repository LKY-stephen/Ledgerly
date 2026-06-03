import type { WorkflowCandidateRecord } from "./ledger-domain";
import type {
  LedgerPeriodSegmentId,
  LedgerScopeId,
  LedgerViewId,
} from "./ledger-reporting";

export const defaultReportView: LedgerViewId = "balance-sheet";
export const defaultReportScope: LedgerScopeId = "business";
export const reportRouteStorageKey = "@ledgerly/mobile/report_route_state";

export interface PersistedReportRouteState {
  lastNonProfitLossScope: LedgerScopeId;
  periodId: string | null;
  view: LedgerViewId;
}

export interface ResolvedReportRouteState {
  lastNonProfitLossScope: LedgerScopeId;
  periodId: string | null;
  scope: LedgerScopeId;
  view: LedgerViewId;
}

export interface ReportRouteLaunchOverride {
  periodId?: string | null;
  scope?: LedgerScopeId;
  view?: LedgerViewId;
}

const allowedScopes = new Set<LedgerScopeId>(["business", "personal"]);
const allowedViews = new Set<LedgerViewId>([
  "general-ledger",
  "balance-sheet",
  "profit-loss",
]);

export function createDefaultReportRouteState(): PersistedReportRouteState {
  return {
    lastNonProfitLossScope: defaultReportScope,
    periodId: null,
    view: defaultReportView,
  };
}


export function parsePersistedReportRouteState(
  rawValue: string | null | undefined,
): PersistedReportRouteState {
  if (!rawValue) {
    return createDefaultReportRouteState();
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedReportRouteState>;
    const view = allowedViews.has(parsed.view as LedgerViewId)
      ? (parsed.view as LedgerViewId)
      : defaultReportView;
    const lastNonProfitLossScope = allowedScopes.has(
      parsed.lastNonProfitLossScope as LedgerScopeId,
    )
      ? (parsed.lastNonProfitLossScope as LedgerScopeId)
      : defaultReportScope;
    const periodId =
      typeof parsed.periodId === "string" && parsed.periodId.trim().length > 0
        ? parsed.periodId.trim()
        : null;

    return {
      lastNonProfitLossScope,
      periodId,
      view,
    };
  } catch {
    return createDefaultReportRouteState();
  }
}

export function serializePersistedReportRouteState(
  state: PersistedReportRouteState,
): string {
  return JSON.stringify(state);
}

export function resolveReportRouteState(input: {
  launchOverride?: ReportRouteLaunchOverride | null;
  persisted: PersistedReportRouteState;
}): ResolvedReportRouteState {
  const overrideView = sanitizeView(input.launchOverride?.view);
  const overrideScope = sanitizeScope(input.launchOverride?.scope);
  const overridePeriodId = sanitizePeriodId(input.launchOverride?.periodId);
  const persistedView = sanitizeView(input.persisted.view) ?? defaultReportView;
  const persistedScope =
    sanitizeScope(input.persisted.lastNonProfitLossScope) ?? defaultReportScope;
  const nextView = overrideView ?? persistedView;
  const nextScope =
    nextView === "profit-loss"
      ? "business"
      : overrideScope ?? persistedScope;

  return {
    lastNonProfitLossScope: persistedScope,
    periodId: overridePeriodId ?? sanitizePeriodId(input.persisted.periodId),
    scope: nextScope,
    view: nextView,
  };
}

export function reduceReportRouteState(input: {
  nextPeriodId?: string | null;
  nextScope?: LedgerScopeId;
  nextView?: LedgerViewId;
  previous: PersistedReportRouteState;
}): PersistedReportRouteState {
  const nextView = sanitizeView(input.nextView) ?? input.previous.view;
  const candidateScope = sanitizeScope(input.nextScope);
  const nextScope =
    nextView === "profit-loss"
      ? "business"
      : candidateScope ?? input.previous.lastNonProfitLossScope;

  return {
    lastNonProfitLossScope:
      nextView === "profit-loss"
        ? input.previous.lastNonProfitLossScope
        : nextScope,
    periodId:
      input.nextPeriodId === undefined
        ? input.previous.periodId
        : sanitizePeriodId(input.nextPeriodId),
    view: nextView,
  };
}

export function getReportRouteLaunchOverrideFromCandidates(
  candidates: readonly Pick<
    WorkflowCandidateRecord,
    "reviewValues" | "payload" | "state"
  >[],
): ReportRouteLaunchOverride | null {
  const activeCandidates = candidates.filter(
    (candidate) =>
      candidate.state === "approved" || candidate.state === "persisted_final",
  );

  if (activeCandidates.length === 0) {
    return null;
  }

  const recordKinds = new Set<string>();
  let latestDate: string | null = null;

  for (const candidate of activeCandidates) {
    const recordKind = candidate.payload.recordKind;

    if (recordKind) {
      recordKinds.add(recordKind);
    }

    const dateValue = sanitizeOccurredOn(candidate.reviewValues.date ?? candidate.payload.date);

    if (dateValue && (!latestDate || dateValue > latestDate)) {
      latestDate = dateValue;
    }
  }

  return {
    periodId: latestDate ? buildMonthlyReportPeriodId(latestDate) : null,
    scope: deriveScopeForRecordKinds(recordKinds),
    view: deriveViewForRecordKinds(recordKinds),
  };
}

export function buildMonthlyReportPeriodId(occurredOn: string): string | null {
  const normalized = sanitizeOccurredOn(occurredOn);

  if (!normalized) {
    return null;
  }

  const year = normalized.slice(0, 4);
  const month = normalized.slice(5, 7);
  const segmentId = `m${month}` as LedgerPeriodSegmentId;

  return `${year}:${segmentId}`;
}

function deriveViewForRecordKinds(recordKinds: ReadonlySet<string>): LedgerViewId {
  if (recordKinds.size === 0) {
    return defaultReportView;
  }

  const normalized = [...recordKinds];
  const allBusinessProfitAndLoss = normalized.every(
    (kind) => kind === "income" || kind === "expense",
  );

  if (allBusinessProfitAndLoss) {
    return "profit-loss";
  }

  return "balance-sheet";
}

function deriveScopeForRecordKinds(
  recordKinds: ReadonlySet<string>,
): LedgerScopeId | undefined {
  if (recordKinds.size === 0) {
    return undefined;
  }

  const normalized = [...recordKinds];
  const allBusiness = normalized.every(
    (kind) => kind === "income" || kind === "expense",
  );
  const allPersonal = normalized.every(
    (kind) =>
      kind === "non_business_income" || kind === "personal_spending",
  );

  if (allBusiness) {
    return "business";
  }

  if (allPersonal) {
    return "personal";
  }

  return "business";
}

function sanitizeView(value: LedgerViewId | null | undefined): LedgerViewId | null {
  return value && allowedViews.has(value) ? value : null;
}

function sanitizeScope(
  value: LedgerScopeId | null | undefined,
): LedgerScopeId | null {
  return value && allowedScopes.has(value) ? value : null;
}

function sanitizePeriodId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeOccurredOn(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}
