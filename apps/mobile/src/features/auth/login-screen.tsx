import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LaunchScreen } from "../app-shell/launch-screen";
import { useAppShell } from "../app-shell/provider";

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
  const { continueAsGuest, copy, isHydrated, palette, session, signInWithApple } = useAppShell();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleMessage, setAppleMessage] = useState(copy.login.appleHint);

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

  if (!isHydrated) {
    return <LaunchScreen />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleGuestMode = async () => {
    await continueAsGuest();
    router.replace("/(tabs)");
  };

  const handleAppleSignIn = async () => {
    if (!appleAvailable) {
      setAppleMessage(copy.login.appleUnavailable);
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

      router.replace("/(tabs)");
    } catch (error) {
      setAppleMessage(
        isCancelledAppleRequest(error) ? copy.login.appleCancelled : copy.login.appleUnavailable,
      );
    }
  };

  return (
    <LinearGradient
      colors={[palette.heroStart, palette.heroEnd, palette.shell]}
      style={styles.gradient}
    >
      <View
        pointerEvents="none"
        style={[styles.backgroundOrbLarge, { backgroundColor: palette.accentSoft }]}
      />
      <View
        pointerEvents="none"
        style={[styles.backgroundOrbSmall, { backgroundColor: palette.paperMuted }]}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={[styles.brandMark, { backgroundColor: palette.accent }]} />
              <Text style={[styles.topBarTitle, { color: palette.inkOnAccent }]}>
                {copy.common.appName}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleGuestMode}
              style={[
                styles.skipButton,
                { backgroundColor: palette.accentSoft, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.skipLabel, { color: palette.inkOnAccent }]}>
                {copy.login.skip}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.heroHeader}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.login.eyebrow}</Text>
              <View style={styles.signalRow}>
                {copy.login.signals.map((signal) => (
                  <View
                    key={signal}
                    style={[
                      styles.signalPill,
                      { backgroundColor: palette.accentSoft, borderColor: palette.border },
                    ]}
                  >
                    <Text style={[styles.signalLabel, { color: palette.ink }]}>{signal}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={[styles.title, { color: palette.ink }]}>{copy.login.title}</Text>
            <Text style={[styles.summary, { color: palette.inkMuted }]}>{copy.login.body}</Text>

            <View style={styles.actions}>
              {appleAvailable ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonStyle={
                    palette.appleButtonStyle === "black"
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  cornerRadius={18}
                  onPress={handleAppleSignIn}
                  style={styles.appleButton}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAppleSignIn}
                  style={[
                    styles.fallbackAppleButton,
                    {
                      backgroundColor: palette.paperMuted,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.fallbackAppleLabel, { color: palette.ink }]}>
                    {copy.login.appleButton}
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={handleGuestMode}
                style={[
                  styles.guestButton,
                  { backgroundColor: palette.shellElevated, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.guestLabel, { color: palette.ink }]}>
                  {copy.login.skip}
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.statusPanel,
                { backgroundColor: palette.paperMuted, borderColor: palette.border },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.statusText, { color: palette.inkMuted }]}>{appleMessage}</Text>
            </View>
            <Text style={[styles.caption, { color: palette.inkMuted }]}>{copy.login.caption}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
  },
  appleButton: {
    height: 52,
    width: "100%",
  },
  backgroundOrbLarge: {
    position: "absolute",
    top: 100,
    right: -40,
    height: 220,
    width: 220,
    borderRadius: 999,
    opacity: 0.32,
  },
  backgroundOrbSmall: {
    position: "absolute",
    bottom: 120,
    left: -30,
    height: 160,
    width: 160,
    borderRadius: 999,
    opacity: 0.28,
  },
  brandMark: {
    height: 10,
    width: 10,
    borderRadius: 999,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
  },
  container: {
    flexGrow: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  fallbackAppleButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  fallbackAppleLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  gradient: {
    flex: 1,
  },
  guestButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 20,
  },
  guestLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 32,
    borderWidth: 1,
    gap: 20,
    marginTop: 32,
    padding: 24,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  heroHeader: {
    gap: 12,
  },
  safeArea: {
    flex: 1,
  },
  signalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  signalPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skipButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 460,
  },
  statusDot: {
    height: 8,
    width: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  statusPanel: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 42,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
