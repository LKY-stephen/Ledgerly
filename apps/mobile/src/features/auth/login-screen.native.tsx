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
        <View style={styles.topBlock}>
          <Text style={[styles.brandTitle, { color: palette.ink }]}>
            {copy.common.appName}
          </Text>
          <Text style={[styles.brandSubtitle, { color: palette.inkMuted }]}>
            {copy.login.brandSubtitle}
          </Text>
        </View>

        <View
          style={[
            styles.logoCard,
            {
              backgroundColor: palette.paperMuted,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <LedgerlyIconMark size={164} />
        </View>

        <View style={styles.poemStack}>
          {poemLines.map((line) => (
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

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleGuestMode}
            style={({ pressed }) => [
              styles.guestButton,
              {
                backgroundColor: pressed
                  ? palette.paperMuted
                  : palette.paper,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.guestLabel, { color: palette.ink }]}>
              {copy.login.skip}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    width: "100%",
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 40,
  },
  caption: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    flexGrow: 1,
    gap: 20,
    padding: 24,
    paddingBottom: 36,
  },
  guestButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 52,
    justifyContent: "center",
  },
  guestLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  logoCard: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 248,
    padding: 24,
    width: "100%",
  },
  pillDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
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
    gap: 10,
    justifyContent: "center",
  },
  statusDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  topBlock: {
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  poemLine: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 31,
    textAlign: "center",
  },
  poemStack: {
    alignItems: "center",
    gap: 2,
  },
});
