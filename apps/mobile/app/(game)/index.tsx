import { Redirect } from "expo-router";

import { LaunchScreen } from "../../src/features/app-shell/launch-screen";
import { useAppShell } from "../../src/features/app-shell/provider";
import { resolveProtectedRouteRedirect } from "../../src/features/app-shell/storage-entry";
import { GameShell } from "../../src/features/game/game-shell";

export default function GameEntry() {
  const { isHydrated, session, storageGateState } = useAppShell();

  const redirectHref = resolveProtectedRouteRedirect({
    isHydrated,
    session: Boolean(session),
    storageGateState,
  });

  if (!isHydrated || storageGateState.kind === "checking") {
    return <LaunchScreen />;
  }

  if (redirectHref) {
    return <Redirect href={redirectHref} />;
  }

  return <GameShell />;
}
