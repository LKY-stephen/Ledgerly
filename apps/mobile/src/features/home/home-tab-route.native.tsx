import { LocalStorageProvider } from "../../storage/provider.native";
import { AgentProvider } from "../agent/agent-provider";
import { useWritableDatabase } from "../agent/use-writable-database.native";
import { HomeScreen } from "./home-screen";

function HomeWithAgent() {
  const db = useWritableDatabase();
  return (
    <AgentProvider database={db}>
      <HomeScreen />
    </AgentProvider>
  );
}

export function HomeTabRoute() {
  return (
    <LocalStorageProvider>
      <HomeWithAgent />
    </LocalStorageProvider>
  );
}
