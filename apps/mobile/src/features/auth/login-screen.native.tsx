import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LaunchScreen } from "../app-shell/launch-screen";
import { useAppShell } from "../app-shell/provider";
import { resolveEntryHref } from "../app-shell/storage-entry";

function isCancelledAppleRequest(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ERR_REQUEST_CANCELED"
  );
}

export function LoginScreen() {
  const router = useRouter();
  const {
    continueAsGuest,
    copy,
    isHydrated,
    palette,
    session,
    signInWithApple,
    storageGateState,
  } = useAppShell();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleMessageState, setAppleMessageState] = useState<
    "cancelled" | "hint" | "unavailable"
  >("hint");

  useEffect(() => {
    let isMounted = true;

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) {
          setAppleAvailable(available);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAppleAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleAppleSignIn = async () => {
    if (!appleAvailable) {
      setAppleMessageState("unavailable");
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      await signInWithApple({
        email: credential.email,
        familyName: credential.fullName?.familyName,
        givenName: credential.fullName?.givenName,
        user: credential.user,
      });

      router.replace("/");
    } catch (error) {
      setAppleMessageState(
        isCancelledAppleRequest(error) ? "cancelled" : "unavailable",
      );
    }
  };

  const appleMessage =
    appleMessageState === "cancelled"
      ? copy.login.appleCancelled
      : appleMessageState === "unavailable"
        ? copy.login.appleUnavailable
        : copy.login.appleHint;

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
            styles.heroArt,
            {
              backgroundColor: palette.heroEnd,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              { backgroundColor: palette.shellElevated },
            ]}
          />
          <View style={styles.heroDesk} />
          <View style={styles.heroLaptop}>
            <View
              style={[
                styles.heroLaptopScreen,
                { backgroundColor: palette.paper },
              ]}
            />
          </View>
          <View
            style={[
              styles.heroPill,
              styles.heroPillTop,
              { backgroundColor: palette.paper },
            ]}
          >
            <View
              style={[styles.pillDot, { backgroundColor: palette.accent }]}
            />
            <Text style={[styles.heroPillLabel, { color: palette.ink }]}>
              {copy.login.signals[0]}
            </Text>
          </View>
          <View
            style={[
              styles.heroPill,
              styles.heroPillMiddle,
              { backgroundColor: palette.paper },
            ]}
          >
            <View
              style={[styles.pillDot, { backgroundColor: palette.accent }]}
            />
            <Text style={[styles.heroPillLabel, { color: palette.ink }]}>
              {copy.login.signals[1]}
            </Text>
          </View>
          <View
            style={[
              styles.heroPill,
              styles.heroPillBottom,
              { backgroundColor: palette.paper },
            ]}
          >
            <View
              style={[styles.pillDot, { backgroundColor: palette.accent }]}
            />
            <Text style={[styles.heroPillLabel, { color: palette.ink }]}>
              {copy.login.signals[2]}
            </Text>
          </View>
        </View>

        <Text style={[styles.summary, { color: palette.inkMuted }]}>
          {copy.login.body}
        </Text>

        <View style={styles.actions}>
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonStyle={
                palette.appleButtonStyle === "black"
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              }
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              cornerRadius={999}
              onPress={handleAppleSignIn}
              style={styles.appleButton}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={handleAppleSignIn}
              style={({ pressed }) => [
                styles.fallbackAppleButton,
                {
                  backgroundColor: pressed ? palette.heroEnd : palette.ink,
                },
              ]}
            >
              <Text
                style={[
                  styles.fallbackAppleLabel,
                  { color: palette.inkOnAccent },
                ]}
              >
                {copy.login.appleButton}
              </Text>
            </Pressable>
          )}

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

        <View style={[styles.privacyCard, { borderTopColor: palette.divider }]}>
          <Text style={[styles.privacyEyebrow, { color: palette.accent }]}>
            {copy.login.privacyEyebrow}
          </Text>
          <Text style={[styles.privacySummary, { color: palette.inkMuted }]}>
            {copy.login.privacySummary}
          </Text>
          <View style={styles.privacyMetrics}>
            <Text style={[styles.privacyMetric, { color: palette.inkMuted }]}>
              {copy.login.privacyMetrics[0]}
            </Text>
            <Text style={[styles.privacyMetric, { color: palette.inkMuted }]}>
              {copy.login.privacyMetrics[1]}
            </Text>
          </View>
          <View
            style={[
              styles.statusPanel,
              {
                backgroundColor: palette.paperMuted,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: palette.accent }]}
            />
            <Text style={[styles.statusText, { color: palette.inkMuted }]}>
              {appleMessage}
            </Text>
          </View>
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
  appleButton: {
    height: 52,
    width: "100%",
  },
  brandSubtitle: {
    fontSize: 18,
    fontWeight: "600",
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
    gap: 22,
    padding: 24,
    paddingBottom: 36,
  },
  fallbackAppleButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
  },
  fallbackAppleLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  guestButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
  },
  guestLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  heroArt: {
    borderRadius: 34,
    height: 344,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  heroDesk: {
    backgroundColor: "rgba(255, 245, 230, 0.48)",
    bottom: 30,
    height: 18,
    left: 0,
    position: "absolute",
    right: 0,
  },
  heroGlow: {
    alignSelf: "center",
    borderRadius: 999,
    height: 120,
    marginTop: 18,
    opacity: 0.22,
    width: 120,
  },
  heroLaptop: {
    backgroundColor: "#d8d4cd",
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#8a939e",
    bottom: 58,
    height: 88,
    position: "absolute",
    right: 38,
    transform: [{ rotate: "-5deg" }],
    width: 118,
  },
  heroLaptopScreen: {
    borderRadius: 4,
    flex: 1,
    margin: 7,
  },
  heroPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  heroPillBottom: {
    bottom: 22,
    left: 22,
  },
  heroPillLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  heroPillMiddle: {
    bottom: 90,
    right: 18,
  },
  heroPillTop: {
    bottom: 116,
    left: 22,
  },
  pillDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  privacyCard: {
    borderTopWidth: 1,
    gap: 14,
    marginTop: 16,
    paddingTop: 26,
    width: "100%",
  },
  privacyEyebrow: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  privacyMetric: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  privacyMetrics: {
    flexDirection: "row",
    gap: 14,
  },
  privacySummary: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  safeArea: {
    flex: 1,
  },
  statusDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  statusPanel: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
  },
  topBlock: {
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
});
