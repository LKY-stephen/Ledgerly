import { Redirect } from "expo-router";

import { LaunchScreen } from "../src/features/app-shell/launch-screen";
import { useAppShell } from "../src/features/app-shell/provider";
import { resolveEntryHref } from "../src/features/app-shell/storage-entry";

export default function IndexScreen() {
  const { isHydrated, session, storageGateState } = useAppShell();

  const href = resolveEntryHref({
    isHydrated,
    session: Boolean(session),
    storageGateState,
  });

  if (!isHydrated || href === null) {
    return <LaunchScreen />;
  }

  return <Redirect href={href} />;
}
