import { useEffect, useState } from "react";

import {
  createEmptyLedgerSnapshot,
  loadLedgerSnapshot,
  type LedgerPeriodSegmentId,
  type LedgerScopeId,
  type LedgerScreenSnapshot,
  type LedgerViewId,
} from "./ledger-reporting";
import {
  defaultReportView,
  resolveReportRouteState,
  reduceReportRouteState,
  type ReportRouteLaunchOverride,
} from "./report-route-state";
import {
  loadPersistedReportRouteState,
  persistReportRouteState,
} from "./report-route-cache.web";
import {
  buildLedgerPeriodIdForSegment,
  buildLedgerPeriodIdForYear,
} from "./ledger-screen-state";
import { useAppShell } from "../app-shell/provider";
import {
  createReadableStorageDatabaseFromWeb,
  useWebDatabaseContext,
} from "../../storage/provider.web";

export interface UseLedgerScreenResult {
  error: string | null;
  isLoaded: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  selectPeriodId: (periodId: string) => void;
  selectPeriodSegment: (segmentId: LedgerPeriodSegmentId) => void;
  selectScope: (scopeId: LedgerScopeId) => void;
  selectView: (view: LedgerViewId) => void;
  selectYear: (yearId: string) => void;
  selectedPeriodId: string;
  selectedSegmentId: LedgerPeriodSegmentId;
  selectedScope: LedgerScopeId;
  selectedView: LedgerViewId;
  selectedYearId: string;
  snapshot: LedgerScreenSnapshot;
}

export function useLedgerScreen(
  launchOverride?: ReportRouteLaunchOverride | null,
): UseLedgerScreenResult {
  const { resolvedLocale, storageRevision } = useAppShell();
  const database = useWebDatabaseContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<LedgerScopeId>("business");
  const [lastNonProfitLossScope, setLastNonProfitLossScope] =
    useState<LedgerScopeId>("business");
  const [selectedView, setSelectedView] = useState<LedgerViewId>(defaultReportView);
  const [snapshot, setSnapshot] = useState<LedgerScreenSnapshot>(() =>
    createEmptyLedgerSnapshot(resolvedLocale),
  );
  const [hasHydratedRouteState, setHasHydratedRouteState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadPersistedReportRouteState()
      .then((persisted) => {
        if (!isMounted) {
          return;
        }

        const resolved = resolveReportRouteState({
          launchOverride,
          persisted,
        });

        setSelectedPeriodId(resolved.periodId);
        setSelectedScope(resolved.scope);
        setLastNonProfitLossScope(resolved.lastNonProfitLossScope);
        setSelectedView(resolved.view);
      })
      .finally(() => {
        if (isMounted) {
          setHasHydratedRouteState(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [launchOverride]);

  useEffect(() => {
    setSelectedPeriodId(null);
  }, [storageRevision]);

  useEffect(() => {
    if (!hasHydratedRouteState) {
      return;
    }

    void persistReportRouteState(
      reduceReportRouteState({
        nextPeriodId: selectedPeriodId,
        nextScope: selectedScope,
        nextView: selectedView,
        previous: {
          lastNonProfitLossScope,
          periodId: selectedPeriodId,
          view: selectedView,
        },
      }),
    );
  }, [
    hasHydratedRouteState,
    lastNonProfitLossScope,
    selectedPeriodId,
    selectedScope,
    selectedView,
  ]);

  useEffect(() => {
    let isMounted = true;

    setIsRefreshing(true);
    setError(null);

    const readableDb = createReadableStorageDatabaseFromWeb(database);

    loadLedgerSnapshot(readableDb, {
      forceDefaultSelection: false,
      locale: resolvedLocale,
      preferredPeriodId: selectedPeriodId,
      scopeId: selectedScope,
    })
      .then((nextSnapshot) => {
        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);

        if (nextSnapshot.selectedPeriod.id !== selectedPeriodId) {
          setSelectedPeriodId(nextSnapshot.selectedPeriod.id);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : resolvedLocale === "zh-CN"
                ? "记账数据加载失败。"
                : "Ledger data failed to load.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
          setIsRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [database, refreshNonce, resolvedLocale, selectedPeriodId, selectedScope, storageRevision]);

  return {
    error,
    isLoaded,
    isRefreshing,
    refresh: async () => {
      setRefreshNonce((current) => current + 1);
    },
    selectPeriodId: (periodId) => {
      setSelectedPeriodId(periodId);
    },
    selectPeriodSegment: (segmentId) => {
      setSelectedPeriodId(buildLedgerPeriodIdForSegment(snapshot.selectedPeriod.year, segmentId));
    },
    selectScope: (scopeId) => {
      setSelectedScope(scopeId);

      if (selectedView !== "profit-loss") {
        setLastNonProfitLossScope(scopeId);
      }
    },
    selectView: (view) => {
      if (view === "profit-loss") {
        setSelectedView("profit-loss");
        setSelectedScope("business");
        return;
      }

      setSelectedView(view);

      if (selectedView === "profit-loss") {
        setSelectedScope(lastNonProfitLossScope);
      }
    },
    selectYear: (yearId) => {
      const nextPeriodId = buildLedgerPeriodIdForYear(yearId, snapshot.selectedPeriod.segmentId);

      if (!nextPeriodId) {
        return;
      }

      setSelectedPeriodId(nextPeriodId);
    },
    selectedPeriodId: selectedPeriodId ?? snapshot.selectedPeriod.id,
    selectedSegmentId: snapshot.selectedPeriod.segmentId,
    selectedScope,
    selectedView,
    selectedYearId: String(snapshot.selectedPeriod.year),
    snapshot,
  };
}
