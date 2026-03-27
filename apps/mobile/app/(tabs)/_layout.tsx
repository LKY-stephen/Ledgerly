import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";

import { LaunchScreen } from "../../src/features/app-shell/launch-screen";
import { AppIcon } from "../../src/components/app-icon";
import { useAppShell } from "../../src/features/app-shell/provider";
import { TabBarIcon } from "../../src/features/navigation/tab-bar-icon";
import { buildTabScreenSpecs } from "../../src/features/navigation/tab-config";

export default function TabLayout() {
  const { copy, isHydrated, palette, session } = useAppShell();
  const tabScreens = buildTabScreenSpecs(copy);

  if (!isHydrated) {
    return <LaunchScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: palette.shell,
        },
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.border,
          height: 78,
          paddingTop: 6,
        },
      }}
    >
      {tabScreens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ color }) => <AppIcon color={color} name={screen.icon} />,
            tabBarLabel: ({ color }) => (
              <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{screen.title}</Text>
            ),
            tabBarButton: (props) => (
              <TabBarIcon
                {...props}
                palette={palette}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
