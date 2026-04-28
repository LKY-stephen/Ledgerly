import { LocalStorageProvider } from "../../storage/provider.web";
import { AgentProvider } from "../agent/agent-provider";
import { useWritableDatabase } from "../agent/use-writable-database.web";
import type { CardId } from "./game-context";
import { ShowLedgerPanel } from "./panels/show-ledger-panel";
import { NewRecordPanel } from "./panels/new-record-panel";
import { ReportPanel } from "./panels/report-panel";

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
          <ShowLedgerPanel />
        </LocalStorageProvider>
      );
    case "new":
      return (
        <LocalStorageProvider>
          <WithAgent>
            <NewRecordPanel />
          </WithAgent>
        </LocalStorageProvider>
      );
    case "report":
      return (
        <LocalStorageProvider>
          <WithAgent>
            <ReportPanel />
          </WithAgent>
        </LocalStorageProvider>
      );
    default:
      return null;
  }
}
