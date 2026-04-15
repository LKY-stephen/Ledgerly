import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppShellProvider, useAppShell } from "../src/features/app-shell/provider";
import { WebLayoutContainer } from "../src/components/web-layout-container";

function RootNavigator() {
  const { palette } = useAppShell();

  return (
    <>
      <StatusBar style={palette.statusBarStyle} />
      <WebLayoutContainer>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: palette.shell,
            },
          }}
        />
      </WebLayoutContainer>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppShellProvider>
      <RootNavigator />
    </AppShellProvider>
  );
}
