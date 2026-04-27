import { Redirect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LedgerlyIconMark } from "../../components/ledgerly-icon-mark";
import { useResponsive } from "../../hooks/use-responsive";
import { LaunchScreen } from "../app-shell/launch-screen";
import { useAppShell } from "../app-shell/provider";
import { resolveEntryHref } from "../app-shell/storage-entry";

export function LoginScreen() {
  const router = useRouter();
  const { isExpanded, isMedium } = useResponsive();
  const {
    continueAsGuest,
    copy,
    isHydrated,
    palette,
    session,
    storageGateState,
  } = useAppShell();
  const isWide = isExpanded || isMedium;

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

  if (isWide) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.paper }]}>
        <View style={styles.splitLayout}>
          <View style={[styles.leftPanel, { backgroundColor: palette.paper }]}>
            <View
              style={[
                styles.messageBlock,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  shadowColor: palette.shadow,
                },
              ]}
            >
              <Text style={[styles.brandTitleWide, { color: palette.ink }]}>
                {copy.common.appName}
              </Text>
              <Text style={[styles.brandSubtitleWide, { color: palette.inkMuted }]}>
                {copy.login.brandSubtitle}
              </Text>
              <Text style={[styles.messageTitle, { color: palette.ink }]}>
                {poemLines[0]}
              </Text>
              <Text style={[styles.messageBody, { color: palette.ink }]}>
                {poemLines[1]}
              </Text>
              <Text style={[styles.messageBody, { color: palette.ink }]}>
                {poemLines[2]}
              </Text>
              <Text style={[styles.messageBody, { color: palette.ink }]}>
                {poemLines[3]}
              </Text>
              <View style={styles.privacyMetrics}>
                <View
                  style={[
                    styles.privacyChip,
                    { backgroundColor: palette.paper, borderColor: palette.border },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
                  <Text style={[styles.privacyChipLabel, { color: palette.inkMuted }]}>
                    {copy.login.privacyMetrics[0]}
                  </Text>
                </View>
                <View
                  style={[
                    styles.privacyChip,
                    { backgroundColor: palette.paper, borderColor: palette.border },
                  ]}
                >
                  <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
                  <Text style={[styles.privacyChipLabel, { color: palette.inkMuted }]}>
                    {copy.login.privacyMetrics[1]}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.rightPanel, { backgroundColor: palette.paperMuted }]}>
            <View style={styles.rightPanelInner}>
              <View
                style={[
                  styles.tryNowIconWrap,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                    shadowColor: palette.shadow,
                  }
                ]}
              >
                <LedgerlyIconMark
                  size={168}
                />
              </View>

              <View style={styles.actionsWide}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleGuestMode}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: pressed ? palette.paperMuted : palette.paper,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryLabel, { color: palette.ink }]}>
                    {copy.login.skip}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            styles.mobileLogoCard,
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
                styles.mobilePoemLine,
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
              styles.secondaryButton,
              {
                backgroundColor: pressed ? palette.paperMuted : palette.paper,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[styles.secondaryLabel, { color: palette.ink }]}
            >
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
    alignSelf: "stretch",
    gap: 12,
  },
  actionsWide: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 8,
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  brandSubtitleWide: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 40,
  },
  brandTitleWide: {
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    flexGrow: 1,
    gap: 20,
    padding: 24,
    paddingBottom: 36,
  },
  mobileLogoCard: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 248,
    padding: 24,
    width: "100%",
  },
  leftPanel: {
    flex: 55,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 40,
  },
  messageBlock: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    maxWidth: 560,
    paddingHorizontal: 28,
    paddingVertical: 30,
    width: "100%",
  },
  messageBody: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 31,
  },
  messageCaption: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  messageEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 31,
    marginTop: 8,
  },
  loginBody: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 36,
    textAlign: "center",
  },
  pillDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 52,
    justifyContent: "center",
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  privacyChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  privacyChipLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  privacyMetrics: {
    flexDirection: "row",
    gap: 12,
  },
  rightPanel: {
    flex: 45,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 40,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(0, 32, 69, 0.06)",
  },
  rightPanelInner: {
    alignItems: "center",
    gap: 28,
    maxWidth: 320,
    width: "100%",
  },
  safeArea: {
    flex: 1,
  },
  splitLayout: {
    flex: 1,
    flexDirection: "row",
  },
  statusDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
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
  tryNowIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    height: 260,
    justifyContent: "center",
    width: 260,
  },
  topBlock: {
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  mobilePoemLine: {
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
