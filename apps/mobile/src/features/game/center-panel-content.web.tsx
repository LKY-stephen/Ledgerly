import { LocalStorageProvider } from "../../storage/provider.web";
import { AgentProvider } from "../agent/agent-provider";
import { useWritableDatabase } from "../agent/use-writable-database.web";
import type { CardId } from "./game-context";
import { NewRecordPanel } from "./panels/new-record-panel";
import { ReportPanel } from "./panels/report-panel";
import { ShowLedgerPanel } from "./panels/show-ledger-panel";
import { ProfileScreen } from "../profile/profile-screen";

function WithAgent({ children }: { children: React.ReactNode }) {
  const db = useWritableDatabase();
  return <AgentProvider database={db}>{children}</AgentProvider>;
}

interface Props {
  card: CardId;
}

export function CenterPanelContent({ card }: Props) {
  switch (card) {
    case "show":
      return (
        <LocalStorageProvider>
          <WithAgent>
            <ReportPanel variant="request" />
          </WithAgent>
        </LocalStorageProvider>
      );
    case "new":
      return (
        <LocalStorageProvider>
          <NewRecordPanel />
        </LocalStorageProvider>
      );
    case "report":
      return (
        <LocalStorageProvider>
          <ShowLedgerPanel />
        </LocalStorageProvider>
      );
    case "settings":
      return <ProfileScreen embedded />;
    default:
      return null;
  }
}
