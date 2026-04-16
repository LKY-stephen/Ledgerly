import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LaunchScreen } from "../../src/features/app-shell/launch-screen";
import { AppIcon } from "../../src/components/app-icon";
import { useAppShell } from "../../src/features/app-shell/provider";
import { TabBarIcon } from "../../src/features/navigation/tab-bar-icon";
import { buildTabScreenSpecs } from "../../src/features/navigation/tab-config";

export default function TabLayout() {
  const { copy, isHydrated, session } = useAppShell();
  const insets = useSafeAreaInsets();
  const tabScreens = buildTabScreenSpecs(copy);
  const tabBarBottomOffset = 12;
  const tabBarHorizontalInset = 16;
  const tabBarHeight = 68 + Math.max(insets.bottom, 16);
  const sceneBottomClearance = tabBarHeight + tabBarBottomOffset + 8;

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
          backgroundColor: "#F9F9F7",
          paddingBottom: sceneBottomClearance,
        },
        tabBarActiveTintColor: "#002045",
        tabBarInactiveTintColor: "rgba(0, 32, 69, 0.4)",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 0.5,
          marginTop: 0,
          textTransform: "uppercase",
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarItemStyle: {
          paddingTop: 0,
        },
        tabBarStyle: {
          backgroundColor: "rgba(249, 249, 247, 0.8)",
          bottom: tabBarBottomOffset,
          borderTopColor: "transparent",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          left: tabBarHorizontalInset,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingHorizontal: 24,
          paddingTop: 12,
          position: "absolute",
          right: tabBarHorizontalInset,
          shadowColor: "rgba(0, 0, 0, 0.04)",
          shadowOffset: { height: -8, width: 0 },
          shadowOpacity: 1,
          shadowRadius: 32,
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
              <Text style={{ color, fontSize: 10, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase" }}>
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
}
