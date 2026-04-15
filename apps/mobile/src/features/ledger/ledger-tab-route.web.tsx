import { LocalStorageProvider } from "../../storage/provider.web";
import { LedgerScreen } from "./ledger-screen";

export function LedgerTabRoute() {
  return (
    <LocalStorageProvider>
      <LedgerScreen />
    </LocalStorageProvider>
  );
}
