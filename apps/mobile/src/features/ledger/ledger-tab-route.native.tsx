import { LocalStorageProvider } from "../../storage/provider.native";
import { LedgerScreen } from "./ledger-screen";

export function LedgerTabRoute() {
  return (
    <LocalStorageProvider>
      <LedgerScreen />
    </LocalStorageProvider>
  );
}
