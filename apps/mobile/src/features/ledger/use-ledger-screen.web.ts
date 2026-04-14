import { useEffect, useState } from "react";
import { createReadableStorageDatabase } from "@creator-cfo/storage";

import {
  createEmptyLedgerSnapshot,
  loadLedgerSnapshot,
  type LedgerPeriodSegmentId,
  type LedgerScopeId,
  type LedgerScreenSnapshot,
  type LedgerViewId,
} from "./ledger-reporting";
import {
  buildLedgerPeriodIdForSegment,
  buildLedgerPeriodIdForYear,
} from "./ledger-screen-state";
import { useAppShell } from "../app-shell/provider";

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

const emptyDatabase = createReadableStorageDatabase({
  async getAllAsync<Row>() {
    return [] as Row[];
  },
  async getFirstAsync<Row>() {
    return {
      maxOccurredOn: null,
      minOccurredOn: null,
    } as Row;
  },
});

export function useLedgerScreen(): UseLedgerScreenResult {
  const { resolvedLocale, storageRevision } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<LedgerScopeId>("business");
  const [selectedView, setSelectedView] = useState<LedgerViewId>("general-ledger");
  const [snapshot, setSnapshot] = useState<LedgerScreenSnapshot>(() =>
    createEmptyLedgerSnapshot(resolvedLocale),
  );

  useEffect(() => {
    setSelectedPeriodId(null);
  }, [storageRevision]);

  useEffect(() => {
    let isMounted = true;

    setIsRefreshing(true);
    setError(null);

    loadLedgerSnapshot(emptyDatabase, {
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
  }, [refreshNonce, resolvedLocale, selectedPeriodId, selectedScope, storageRevision]);

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
    selectScope: setSelectedScope,
    selectView: setSelectedView,
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
