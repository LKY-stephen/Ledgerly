import { Redirect, Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";

import { LaunchScreen } from "../../src/features/app-shell/launch-screen";
import { AppIcon } from "../../src/components/app-icon";
import { useAppShell } from "../../src/features/app-shell/provider";
import { resolveProtectedRouteRedirect } from "../../src/features/app-shell/storage-entry";
import { DesktopSideNav } from "../../src/features/navigation/desktop-side-nav";
import { TabBarIcon } from "../../src/features/navigation/tab-bar-icon";
import { buildTabScreenSpecs } from "../../src/features/navigation/tab-config";
import { useResponsive } from "../../src/hooks/use-responsive";

export default function TabLayout() {
  const { copy, isHydrated, session, storageGateState } = useAppShell();
  const tabScreens = buildTabScreenSpecs(copy);
  const { isExpanded } = useResponsive();
  const showSidebar = Platform.OS === "web" && isExpanded;
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

  const tabBar = (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#F5F6F8",
        },
        tabBarActiveTintColor: "#002045",
        tabBarInactiveTintColor: "rgba(0, 32, 69, 0.4)",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 0,
          textTransform: "none",
        },
        tabBarIconStyle: {
          marginBottom: 1,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarStyle: showSidebar
          ? { display: "none" as const }
          : {
              backgroundColor: "#FFFFFF",
              borderTopColor: "rgba(0, 32, 69, 0.08)",
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderTopWidth: 1,
              elevation: 0,
              height: 82,
              paddingBottom: 12,
              paddingHorizontal: 12,
              paddingTop: 8,
              shadowColor: "rgba(0, 32, 69, 0.08)",
              shadowOffset: { height: -4, width: 0 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
            },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
        }}
      />
      {tabScreens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color }) => <AppIcon color={color} name={screen.icon} size={screen.iconSize} />,
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 10, fontWeight: "600", letterSpacing: 0.2, textTransform: "none" }}>
                {screen.title}
              </Text>
            ),
            tabBarButton: (props) => (
              <TabBarIcon
                {...props}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );

  if (showSidebar) {
    return (
      <View style={{ flex: 1, flexDirection: "row" }}>
        <DesktopSideNav />
        <View style={{ flex: 1 }}>{tabBar}</View>
      </View>
    );
  }

  return tabBar;
}
