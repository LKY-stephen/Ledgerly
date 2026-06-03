import { LedgerScreen } from "../../src/features/ledger/ledger-screen";
import { LocalStorageProvider } from "../../src/storage/provider";

export default function LedgerReportRoute() {
  return (
    <LocalStorageProvider>
      <LedgerScreen />
    </LocalStorageProvider>
  );
}
