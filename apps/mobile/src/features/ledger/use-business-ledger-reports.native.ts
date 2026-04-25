import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { LedgerlySDK } from "@ledgerly/sdk";

import { useAppShell } from "../app-shell/provider";
import { createWritableStorageDatabase } from "../../storage/storage-adapter";
import type { LedgerPeriodOption, LedgerScopeId } from "./ledger-reporting";
import {
  createBusinessLedgerReportsErrorMessage,
  createIdleBusinessLedgerReportsState,
  hasLedgerPeriodRange,
  loadBusinessLedgerReportSnapshot,
  type BusinessLedgerReportsState,
} from "./business-ledger-reports";

export function useBusinessLedgerReports(input: {
  reloadToken: string;
  selectedPeriod: LedgerPeriodOption;
  selectedScope: LedgerScopeId;
}): BusinessLedgerReportsState {
  const { resolvedLocale, storageRevision } = useAppShell();
  const database = useSQLiteContext();
  const [state, setState] = useState<BusinessLedgerReportsState>(() =>
    createIdleBusinessLedgerReportsState(),
  );

  useEffect(() => {
    if (
      input.selectedScope !== "business" ||
      !hasLedgerPeriodRange(input.selectedPeriod)
    ) {
      setState(createIdleBusinessLedgerReportsState());
      return;
    }

    let isMounted = true;

    setState({ status: "loading" });

    loadBusinessLedgerReportSnapshot({
      locale: resolvedLocale,
      period: input.selectedPeriod,
      sdk: new LedgerlySDK(createWritableStorageDatabase(database)),
    })
      .then((snapshot) => {
        if (isMounted) {
          setState({ snapshot, status: "ready" });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({
            error: createBusinessLedgerReportsErrorMessage(
              error,
              resolvedLocale,
            ),
            status: "error",
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    database,
    input.reloadToken,
    input.selectedPeriod.endDate,
    input.selectedPeriod.id,
    input.selectedPeriod.startDate,
    input.selectedScope,
    resolvedLocale,
    storageRevision,
  ]);

  return state;
}
