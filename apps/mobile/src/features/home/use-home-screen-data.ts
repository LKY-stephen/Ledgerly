import { useEffect, useState } from "react";

import { useAppShell } from "../app-shell/provider";
import { loadHomeScreenSnapshot } from "../ledger/ledger-runtime";
import type { HomeSnapshot } from "./home-data";

const emptySnapshot: HomeSnapshot = {
  hasMore: false,
  metrics: {
    incomeCents: 0,
    netCents: 0,
    outflowCents: 0,
  },
  recentRecords: [],
  trend: [],
};

export function useHomeScreenData() {
  const { storageRevision } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);

  useEffect(() => {
    void refresh();
  }, [storageRevision]);

  async function refresh(): Promise<void> {
    setIsRefreshing(true);
    setError(null);

    try {
      const nextSnapshot = await loadHomeScreenSnapshot();
      setSnapshot(nextSnapshot);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Home data failed to load.");
    } finally {
      setIsLoaded(true);
      setIsRefreshing(false);
    }
  }

  async function loadMore(): Promise<void> {
    if (!snapshot.hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const nextSnapshot = await loadHomeScreenSnapshot({
        offset: snapshot.recentRecords.length,
      });
      setSnapshot((current) => ({
        ...nextSnapshot,
        recentRecords: [...current.recentRecords, ...nextSnapshot.recentRecords],
      }));
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "More home records failed to load.");
    } finally {
      setIsLoaded(true);
      setIsLoadingMore(false);
    }
  }

  return {
    error,
    isLoaded,
    isLoadingMore,
    isRefreshing,
    loadMore,
    refresh,
    snapshot,
  };
}
