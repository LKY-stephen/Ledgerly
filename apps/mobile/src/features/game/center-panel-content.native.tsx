import { LocalStorageProvider } from "../../storage/provider.native";
import { AgentProvider } from "../agent/agent-provider";
import { useWritableDatabase } from "../agent/use-writable-database.native";
import type { CardId } from "./game-context";
import { NewRecordPanel } from "./panels/new-record-panel";
import { ReportPanel } from "./panels/report-panel";
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
      return null;
    case "settings":
      return <ProfileScreen embedded />;
    default:
      return null;
  }
}
