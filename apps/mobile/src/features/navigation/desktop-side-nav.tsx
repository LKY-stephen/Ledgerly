import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "../../components/app-icon";
import { CfoAvatar } from "../../components/cfo-avatar";
import { SIDEBAR_WIDTH } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import { getNavigationTheme } from "../app-shell/theme-utils";
import { buildTabScreenSpecs } from "./tab-config";

const routeMap: Record<string, string> = {
  index: "/(tabs)",
  ledger: "/(tabs)/ledger",
  profile: "/(tabs)/profile",
};

export function DesktopSideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { copy, palette } = useAppShell();
  const tabs = buildTabScreenSpecs(copy);
  const navigationTheme = getNavigationTheme(palette);

  const activeTab = pathname.startsWith("/ledger")
    ? "ledger"
    : pathname.startsWith("/profile")
      ? "profile"
      : "index";

  return (
    <View style={[styles.container, { backgroundColor: palette.paper, borderRightColor: palette.border }]}>
      <View style={styles.brand}>
        <CfoAvatar size={32} />
        <Text style={[styles.brandLabel, { color: palette.ink }]}>{copy.common.appName}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: navigationTheme.sidebarDivider }]} />

      <View style={styles.navItems}>
        {tabs.map((tab) => {
          const isActive = tab.name === activeTab;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => router.push(routeMap[tab.name] as never)}
              style={({ pressed }) => [
                styles.navItem,
                {
                  backgroundColor: isActive
                    ? navigationTheme.tabIndicatorBackground
                    : pressed
                      ? navigationTheme.pressedBackground
                      : "transparent",
                },
              ]}
            >
              <AppIcon
                color={isActive ? palette.ink : palette.inkMuted}
                name={tab.icon as AppIconName}
                size={20}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? palette.ink : palette.inkMuted },
                  isActive ? styles.navLabelActive : null,
                ]}
              >
                {tab.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 8,
  },
  brandLabel: {
    fontSize: 18,
    fontWeight: "800",
  },
  container: {
    borderRightWidth: 2,
    paddingBottom: 24,
    width: SIDEBAR_WIDTH,
  },
  divider: {
    height: 2,
    marginHorizontal: 18,
    marginVertical: 12,
  },
  navItem: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navItems: {
    gap: 4,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  navLabelActive: {
    fontWeight: "800",
  },
});
