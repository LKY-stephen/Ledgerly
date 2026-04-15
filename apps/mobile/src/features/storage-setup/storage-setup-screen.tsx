import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { pickAndImportDatabasePackageAsync } from "../../storage/database-import";
import { useResponsive } from "../../hooks/use-responsive";
import { LaunchScreen } from "../app-shell/launch-screen";
import { useAppShell } from "../app-shell/provider";

export function StorageSetupScreen() {
  const router = useRouter();
  const { isExpanded } = useResponsive();
  const {
    bumpStorageRevision,
    copy,
    initializeEmptyStorage,
    isHydrated,
    palette,
    refreshStorageGateState,
    session,
    setStorageSuspended,
    storageGateState,
  } = useAppShell();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  if (!isHydrated || storageGateState.kind === "checking") {
    return <LaunchScreen />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (storageGateState.kind === "ready") {
    return <Redirect href="/(tabs)" />;
  }

  const screenCopy =
    storageGateState.kind === "recovery_required"
      ? {
          summary: copy.storageSetup.recoverySummary,
          title: copy.storageSetup.recoveryTitle,
        }
      : {
          summary: copy.storageSetup.missingSummary,
          title: copy.storageSetup.missingTitle,
        };

  const isBusy = isImporting || isInitializing;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={[styles.container, isExpanded ? styles.containerWide : null]}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.storageSetup.eyebrow}</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{screenCopy.title}</Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>{screenCopy.summary}</Text>
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          {storageGateState.kind === "recovery_required" ? (
            <View
              style={[
                styles.warningPanel,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.warningTitle, { color: palette.destructive }]}>
                {copy.storageSetup.recoveryTitle}
              </Text>
              <Text style={[styles.warningSummary, { color: palette.inkMuted }]}>
                {storageGateState.message}
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <Text style={[styles.errorMessage, { color: palette.destructive }]}>{errorMessage}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={async () => {
              setIsImporting(true);
              setErrorMessage(null);
              setStorageSuspended(true);

              try {
                const result = await pickAndImportDatabasePackageAsync();

                if (!result) {
                  return;
                }

                bumpStorageRevision();
                const nextStorageGateState = await refreshStorageGateState();

                if (nextStorageGateState.kind !== "ready") {
                  throw new Error("The imported database could not be activated.");
                }

                router.replace("/(tabs)");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error ? error.message : copy.meScreen.databaseImportFailure,
                );
              } finally {
                setStorageSuspended(false);
                setIsImporting(false);
              }
            }}
            style={[
              styles.primaryAction,
              {
                backgroundColor: palette.ink,
                opacity: isBusy ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryActionLabel, { color: palette.inkOnAccent }]}>
              {isImporting ? copy.storageSetup.importInProgress : copy.storageSetup.importAction}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={async () => {
              setIsInitializing(true);
              setErrorMessage(null);

              try {
                await initializeEmptyStorage();
                router.replace("/(tabs)");
              } catch (error) {
                setErrorMessage(
                  error instanceof Error ? error.message : copy.storageSetup.initializeInProgress,
                );
              } finally {
                setIsInitializing(false);
              }
            }}
            style={[
              styles.secondaryAction,
              {
                backgroundColor: palette.paperMuted,
                borderColor: palette.border,
                opacity: isBusy ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryActionLabel, { color: palette.ink }]}>
              {isInitializing
                ? copy.storageSetup.initializeInProgress
                : copy.storageSetup.initializeAction}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 20,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 36,
  },
  containerWide: {
    alignSelf: "center",
    maxWidth: 560,
    width: "100%",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  hero: {
    gap: 12,
  },
  panel: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryActionLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryActionLabel: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  warningPanel: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  warningSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
});
