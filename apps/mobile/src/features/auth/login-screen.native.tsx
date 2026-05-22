import { Redirect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LedgerlyIconMark } from "../../components/ledgerly-icon-mark";
import { LaunchScreen } from "../app-shell/launch-screen";
import { useAppShell } from "../app-shell/provider";
import { resolveEntryHref } from "../app-shell/storage-entry";

export function LoginScreen() {
  const router = useRouter();
  const {
    continueAsGuest,
    copy,
    isHydrated,
    palette,
    session,
    storageGateState,
  } = useAppShell();

  const redirectHref = resolveEntryHref({
    isHydrated,
    session: Boolean(session),
    storageGateState,
  });

  if (!isHydrated || (session && redirectHref === null)) {
    return <LaunchScreen />;
  }

  if (session && redirectHref) {
    return <Redirect href={redirectHref} />;
  }

  const handleGuestMode = async () => {
    await continueAsGuest();
    router.replace("/");
  };
  const poemLines = copy.login.poemLines;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.paperMuted,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <View style={styles.topBlock}>
            <Text style={[styles.brandTitle, { color: palette.ink }]}>
              {copy.common.appName}
            </Text>
            <Text style={[styles.brandSubtitle, { color: palette.inkMuted }]}>
              {copy.login.brandSubtitle}
            </Text>
          </View>

          <LedgerlyIconMark size={148} />

          <View style={styles.poemStack}>
            {poemLines.slice(0, 2).map((line) => (
              <Text
                key={line}
                style={[
                  styles.poemLine,
                  { color: palette.ink },
                ]}
              >
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <Text style={[styles.actionTitle, { color: palette.ink }]}>
            {copy.login.skip}
          </Text>
          <Text style={[styles.actionSummary, { color: palette.inkMuted }]}>
            {poemLines.slice(2).join(" ")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleGuestMode}
            style={({ pressed }) => [
              styles.guestButton,
              {
                backgroundColor: pressed ? palette.paperMuted : palette.ink,
                borderColor: palette.ink,
              },
            ]}
          >
            <Text style={[styles.guestLabel, { color: palette.inkOnAccent }]}>
              {copy.login.skip}
            </Text>
          </Pressable>
        </View>

        <View style={styles.signalRow}>
          {copy.login.signals.map((signal) => (
            <View
              key={signal}
              style={[
                styles.signalChip,
                { backgroundColor: palette.paperMuted, borderColor: palette.border },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.signalChipLabel, { color: palette.inkMuted }]}>
                {signal}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 20,
    width: "100%",
  },
  actionSummary: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  container: {
    alignItems: "center",
    flexGrow: 1,
    gap: 18,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 28,
  },
  guestButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 54,
    justifyContent: "center",
    width: "100%",
  },
  guestLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  heroCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    width: "100%",
  },
  privacyMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
  },
  signalChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  signalChipLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  statusDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  topBlock: {
    alignItems: "center",
    gap: 8,
  },
  poemLine: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 28,
    textAlign: "center",
  },
  poemStack: {
    alignItems: "center",
    gap: 4,
  },
});
