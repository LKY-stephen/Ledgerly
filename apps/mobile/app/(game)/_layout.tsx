import { Stack } from "expo-router";

import { useAppShell } from "../../src/features/app-shell/provider";
import { useWebLayoutFullWidth } from "../../src/components/web-layout-container";
import { GameProvider } from "../../src/features/game/game-context";

export default function GameLayout() {
  const { palette } = useAppShell();

  useWebLayoutFullWidth(true);

  return (
    <GameProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.paper },
        }}
      />
    </GameProvider>
  );
}
