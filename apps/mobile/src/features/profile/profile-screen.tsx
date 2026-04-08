import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionCard } from "@creator-cfo/ui";

import { localePreferenceOptions, themePreferenceOptions } from "../app-shell/copy";
import { useAppShell } from "../app-shell/provider";
import type { LocalePreference, ThemePreference } from "../app-shell/types";
import { pickAndImportDatabasePackageAsync } from "../../storage/database-import";

function PreferencePill(props: {
  active: boolean;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useAppShell>["palette"];
}) {
  const { active, label, onPress, palette } = props;
  const activeLabelColor = palette.name === "dark" ? palette.shell : palette.inkOnAccent;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.optionPill,
        {
          backgroundColor: active ? palette.accent : palette.paperMuted,
          borderColor: active ? palette.accent : palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.optionLabel,
          { color: active ? activeLabelColor : palette.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const {
    bumpStorageRevision,
    copy,
    localePreference,
    openAiApiKey,
    palette,
    parseApiBaseUrl,
    refreshStorageGateState,
    session,
    sessionDisplayName,
    setStorageSuspended,
    setLocalePreference,
    setOpenAiApiKey,
    setParseApiBaseUrl,
    setThemePreference,
    signOut,
    themePreference,
  } = useAppShell();
  const [apiKeyDraft, setApiKeyDraft] = useState(openAiApiKey);
  const [baseUrlDraft, setBaseUrlDraft] = useState(parseApiBaseUrl);
  const [databaseImportMessage, setDatabaseImportMessage] = useState<{
    tone: "error" | "success";
    value: string;
  } | null>(null);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);

  useEffect(() => {
    setApiKeyDraft(openAiApiKey);
  }, [openAiApiKey]);

  useEffect(() => {
    setBaseUrlDraft(parseApiBaseUrl);
  }, [parseApiBaseUrl]);

  const themeLabels: Record<ThemePreference, string> = {
    dark: copy.common.dark,
    light: copy.common.light,
    system: copy.common.system,
  };

  const localeLabels: Record<LocalePreference, string> = {
    en: copy.common.english,
    system: copy.common.system,
    "zh-CN": copy.common.zhCN,
  };

  const sessionKindLabel =
    session?.kind === "apple" ? "Apple ID" : session?.kind === "guest" ? copy.common.guest : "None";
  const destructiveLabelColor = palette.name === "dark" ? palette.shell : palette.inkOnAccent;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.tabs.profile}</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{copy.meScreen.title}</Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>
            {copy.meScreen.sessionDescription}
          </Text>
        </View>

        <SectionCard eyebrow={copy.common.theme} palette={palette} title={copy.common.theme}>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.themeDescription}
          </Text>
          <View style={styles.optionRow}>
            {themePreferenceOptions.map((option) => (
              <PreferencePill
                key={option}
                active={themePreference === option}
                label={themeLabels[option]}
                onPress={() => {
                  void setThemePreference(option);
                }}
                palette={palette}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow={copy.common.language} palette={palette} title={copy.common.language}>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.localeDescription}
          </Text>
          <View style={styles.optionRow}>
            {localePreferenceOptions.map((option) => (
              <PreferencePill
                key={option}
                active={localePreference === option}
                label={localeLabels[option]}
                onPress={() => {
                  void setLocalePreference(option);
                }}
                palette={palette}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow="AI Parse" palette={palette} title="Vercel Parse API">
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            Store your Vercel API URL and OpenAI API key locally on this device. Upload parsing will
            send the key only in the request header and will not save it to SQLite.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>Vercel API Base URL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setBaseUrlDraft}
              placeholder="https://your-project.vercel.app"
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              value={baseUrlDraft}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>OpenAI API Key</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setApiKeyDraft}
              placeholder="sk-..."
              placeholderTextColor={palette.inkMuted}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              value={apiKeyDraft}
            />
          </View>

          <View style={styles.optionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Promise.all([
                  setParseApiBaseUrl(baseUrlDraft),
                  setOpenAiApiKey(apiKeyDraft),
                ]);
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.ink,
                },
              ]}
            >
              <Text style={[styles.actionButtonLabel, { color: palette.inkOnAccent }]}>Save API Settings</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setApiKeyDraft("");
                setBaseUrlDraft("");
                void Promise.all([setOpenAiApiKey(""), setParseApiBaseUrl("")]);
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.secondaryActionLabel, { color: palette.ink }]}>Clear</Text>
            </Pressable>
          </View>
        </SectionCard>

        {Platform.OS !== "web" ? (
          <SectionCard eyebrow="Storage" palette={palette} title={copy.meScreen.databaseTitle}>
            <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
              {copy.meScreen.databaseDescription}
            </Text>

            {databaseImportMessage ? (
              <Text
                style={[
                  styles.databaseMessage,
                  {
                    color:
                      databaseImportMessage.tone === "error" ? palette.destructive : palette.accent,
                  },
                ]}
              >
                {databaseImportMessage.value}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isImportingDatabase}
              onPress={async () => {
                setIsImportingDatabase(true);
                setDatabaseImportMessage(null);
                setStorageSuspended(true);

                try {
                  await new Promise((resolve) => {
                    setTimeout(resolve, 0);
                  });
                  const result = await pickAndImportDatabasePackageAsync();

                  if (!result) {
                    return;
                  }

                  bumpStorageRevision();
                  await refreshStorageGateState();
                  setDatabaseImportMessage({
                    tone: "success",
                    value: `${copy.meScreen.databaseImportSuccess} ${result.importedDatabaseName} · ${result.checkedPathCount} path(s) checked.`,
                  });
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : copy.meScreen.databaseImportFailure;
                  setDatabaseImportMessage({
                    tone: "error",
                    value: `${copy.meScreen.databaseImportFailure} ${message}`,
                  });
                } finally {
                  setStorageSuspended(false);
                  setIsImportingDatabase(false);
                }
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.ink,
                  opacity: isImportingDatabase ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.actionButtonLabel, { color: palette.inkOnAccent }]}>
                {isImportingDatabase
                  ? copy.meScreen.databaseImportInProgress
                  : copy.meScreen.databaseImportAction}
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        <SectionCard eyebrow={copy.meScreen.sessionTitle} palette={palette} title={sessionDisplayName}>
          <Text style={[styles.sessionKind, { color: palette.accent }]}>{sessionKindLabel}</Text>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.logoutDescription}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
            style={[styles.logoutButton, { backgroundColor: palette.destructive }]}
          >
            <Text style={[styles.logoutLabel, { color: destructiveLabelColor }]}>
              {copy.common.signOut}
            </Text>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  databaseMessage: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  hero: {
    gap: 12,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  safeArea: {
    flex: 1,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  sessionKind: {
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
