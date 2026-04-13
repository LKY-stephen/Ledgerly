import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionCard } from "@creator-cfo/ui";

import { pickAndImportDatabasePackageAsync } from "../../storage/database-import";
import {
  localePreferenceOptions,
  themePreferenceOptions,
} from "../app-shell/copy";
import { useAppShell } from "../app-shell/provider";
import type {
  AiProvider,
  LocalePreference,
  ProfileInfo,
  ThemePreference,
} from "../app-shell/types";

function PreferencePill(props: {
  active: boolean;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useAppShell>["palette"];
}) {
  const { active, label, onPress, palette } = props;
  const activeLabelColor =
    palette.name === "dark" ? palette.shell : palette.inkOnAccent;

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

function ApiKeyField(props: {
  hiddenAccessibilityLabel: string;
  isVisible: boolean;
  label: string;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  palette: ReturnType<typeof useAppShell>["palette"];
  placeholder: string;
  visibleAccessibilityLabel: string;
  testID: string;
  toggleTestID: string;
  value: string;
}) {
  const {
    hiddenAccessibilityLabel,
    isVisible,
    label,
    onChangeText,
    onToggleVisibility,
    palette,
    placeholder,
    testID,
    toggleTestID,
    value,
    visibleAccessibilityLabel,
  } = props;

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>{label}</Text>
      <View
        style={[
          styles.inputChrome,
          {
            backgroundColor: palette.paperMuted,
            borderColor: palette.border,
          },
        ]}
      >
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.inkMuted}
          secureTextEntry={!isVisible}
          style={[styles.keyInput, { color: palette.ink }]}
          testID={testID}
          value={value}
        />
        <Pressable
          accessibilityLabel={
            isVisible ? hiddenAccessibilityLabel : visibleAccessibilityLabel
          }
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleVisibility}
          style={styles.inputIconButton}
          testID={toggleTestID}
        >
          <Feather color={palette.inkMuted} name={isVisible ? "eye-off" : "eye"} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const {
    aiProvider,
    bumpStorageRevision,
    copy,
    geminiApiKey,
    localePreference,
    openAiApiKey,
    palette,
    parseApiBaseUrl,
    refreshStorageGateState,
    profileInfo,
    session,
    sessionDisplayName,
    setAiProvider,
    setGeminiApiKey,
    setStorageSuspended,
    setLocalePreference,
    setOpenAiApiKey,
    setParseApiBaseUrl,
    setProfileInfo,
    setThemePreference,
    signOut,
    themePreference,
  } = useAppShell();
  const [aiProviderDraft, setAiProviderDraft] = useState<AiProvider>(aiProvider);
  const [apiKeyDraft, setApiKeyDraft] = useState(openAiApiKey);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState(geminiApiKey);
  const [isOpenAiKeyVisible, setIsOpenAiKeyVisible] = useState(false);
  const [isGeminiKeyVisible, setIsGeminiKeyVisible] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState(parseApiBaseUrl);
  const [draftProfile, setDraftProfile] = useState<ProfileInfo>(profileInfo);
  const [databaseImportMessage, setDatabaseImportMessage] = useState<{
    tone: "error" | "success";
    value: string;
  } | null>(null);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);

  useEffect(() => {
    setAiProviderDraft(aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    setApiKeyDraft(openAiApiKey);
  }, [openAiApiKey]);

  useEffect(() => {
    setGeminiKeyDraft(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setBaseUrlDraft(parseApiBaseUrl);
  }, [parseApiBaseUrl]);

  useEffect(() => {
    setDraftProfile(profileInfo);
  }, [profileInfo]);
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
    session?.kind === "apple"
      ? copy.meScreen.sessionApple
      : session?.kind === "guest"
        ? copy.common.guest
        : copy.meScreen.sessionNone;
  const sessionTitle =
    session?.kind === "apple"
      ? (sessionDisplayName || (session.displayName ?? session.email ?? copy.meScreen.sessionApple))
      : session?.kind === "guest"
        ? copy.meScreen.sessionGuest
        : copy.meScreen.sessionNone;
  const destructiveLabelColor =
    palette.name === "dark" ? palette.shell : palette.inkOnAccent;

  const saveAiSettings = async () => {
    if (aiProviderDraft === "openai") {
      const normalized = apiKeyDraft.trim();

      if (!normalized) {
        Alert.alert(copy.meScreen.openAiKeyRequiredAlert);
        return;
      }

      await Promise.all([
        setParseApiBaseUrl(baseUrlDraft),
        setOpenAiApiKey(normalized),
        setAiProvider("openai"),
      ]);
      return;
    }

    const normalized = geminiKeyDraft.trim();

    if (!normalized) {
      Alert.alert(copy.meScreen.geminiKeyRequiredAlert);
      return;
    }

    await Promise.all([
      setParseApiBaseUrl(baseUrlDraft),
      setGeminiApiKey(normalized),
      setAiProvider("gemini"),
    ]);
  };

  const clearActiveApiKey = async () => {
    if (aiProviderDraft === "openai") {
      setApiKeyDraft("");
      await setOpenAiApiKey("");
      return;
    }

    setGeminiKeyDraft("");
    await setGeminiApiKey("");
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            {copy.tabs.profile}
          </Text>
          <Text style={[styles.title, { color: palette.ink }]}>
            {copy.meScreen.title}
          </Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>
            {copy.meScreen.sessionDescription}
          </Text>
        </View>

        <SectionCard
          eyebrow={copy.common.theme}
          palette={palette}
          title={copy.common.theme}
        >
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

        <SectionCard
          eyebrow={copy.common.language}
          palette={palette}
          title={copy.common.language}
        >
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

        <SectionCard
          eyebrow={copy.meScreen.profileEyebrow}
          palette={palette}
          title={copy.meScreen.profileTitle}
        >
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.profileDescription}
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
              {copy.meScreen.profileNameLabel}
            </Text>
            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={(value) =>
                setDraftProfile((previous) => ({ ...previous, name: value }))
              }
              placeholder={copy.meScreen.profileNamePlaceholder}
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              testID="profile-name-input"
              value={draftProfile.name}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
              {copy.meScreen.profileEmailLabel}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={(value) =>
                setDraftProfile((previous) => ({ ...previous, email: value }))
              }
              placeholder={copy.meScreen.profileEmailPlaceholder}
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              testID="profile-email-input"
              value={draftProfile.email}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
              {copy.meScreen.profilePhoneLabel}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
              onChangeText={(value) =>
                setDraftProfile((previous) => ({ ...previous, phone: value }))
              }
              placeholder={copy.meScreen.profilePhonePlaceholder}
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              testID="profile-phone-input"
              value={draftProfile.phone}
            />
          </View>

          <View style={styles.optionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void setProfileInfo(draftProfile);
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.ink,
                },
              ]}
              testID="profile-save-button"
            >
              <Text
                style={[
                  styles.actionButtonLabel,
                  { color: palette.inkOnAccent },
                ]}
              >
                {copy.meScreen.profileSave}
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard
          eyebrow={copy.meScreen.apiSectionEyebrow}
          palette={palette}
          title={copy.meScreen.apiSectionTitle}
        >
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.apiSectionDescription}
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
              {copy.meScreen.aiProviderLabel}
            </Text>
            <View style={styles.optionRow}>
              <PreferencePill
                active={aiProviderDraft === "openai"}
                label={copy.meScreen.aiProviderOpenAi}
                onPress={() => setAiProviderDraft("openai")}
                palette={palette}
              />
              <PreferencePill
                active={aiProviderDraft === "gemini"}
                label={copy.meScreen.aiProviderGemini}
                onPress={() => setAiProviderDraft("gemini")}
                palette={palette}
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
              {copy.meScreen.apiBaseUrlLabel}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setBaseUrlDraft}
              placeholder={copy.meScreen.apiBaseUrlPlaceholder}
              placeholderTextColor={palette.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  color: palette.ink,
                },
              ]}
              testID="profile-api-base-url-input"
              value={baseUrlDraft}
            />
          </View>

          {aiProviderDraft === "openai" ? (
            <ApiKeyField
              hiddenAccessibilityLabel={copy.meScreen.hideApiKey}
              isVisible={isOpenAiKeyVisible}
              label={copy.meScreen.apiKeyLabel}
              onChangeText={setApiKeyDraft}
              onToggleVisibility={() => {
                setIsOpenAiKeyVisible((current) => !current);
              }}
              palette={palette}
              placeholder={copy.meScreen.apiKeyPlaceholder}
              testID="profile-openai-key-input"
              toggleTestID="profile-openai-key-toggle"
              value={apiKeyDraft}
              visibleAccessibilityLabel={copy.meScreen.showApiKey}
            />
          ) : (
            <ApiKeyField
              hiddenAccessibilityLabel={copy.meScreen.hideApiKey}
              isVisible={isGeminiKeyVisible}
              label={copy.meScreen.apiGeminiKeyLabel}
              onChangeText={setGeminiKeyDraft}
              onToggleVisibility={() => {
                setIsGeminiKeyVisible((current) => !current);
              }}
              palette={palette}
              placeholder={copy.meScreen.apiGeminiKeyPlaceholder}
              testID="profile-gemini-key-input"
              toggleTestID="profile-gemini-key-toggle"
              value={geminiKeyDraft}
              visibleAccessibilityLabel={copy.meScreen.showApiKey}
            />
          )}

          <View style={styles.optionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void saveAiSettings();
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.ink,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionButtonLabel,
                  { color: palette.inkOnAccent },
                ]}
              >
                {copy.meScreen.apiSave}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void clearActiveApiKey();
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={[styles.secondaryActionLabel, { color: palette.ink }]}
              >
                {copy.meScreen.apiClear}
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        {Platform.OS !== "web" ? (
          <SectionCard
            eyebrow={copy.meScreen.storageEyebrow}
            palette={palette}
            title={copy.meScreen.databaseTitle}
          >
            <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
              {copy.meScreen.databaseDescription}
            </Text>

            {databaseImportMessage ? (
              <Text
                style={[
                  styles.databaseMessage,
                  {
                    color:
                      databaseImportMessage.tone === "error"
                        ? palette.destructive
                        : palette.accent,
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
                    value:
                      `${copy.meScreen.databaseImportSuccess} ${result.importedDatabaseName} · ` +
                      `${result.checkedPathCount} ${copy.meScreen.databaseImportCheckedSuffix}`,
                  });
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : copy.meScreen.databaseImportFailure;
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
              <Text
                style={[
                  styles.actionButtonLabel,
                  { color: palette.inkOnAccent },
                ]}
              >
                {isImportingDatabase
                  ? copy.meScreen.databaseImportInProgress
                  : copy.meScreen.databaseImportAction}
              </Text>
            </Pressable>
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow={copy.meScreen.sessionTitle}
          palette={palette}
          title={sessionTitle}
        >
          <Text style={[styles.sessionKind, { color: palette.accent }]}>
            {sessionKindLabel}
          </Text>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.logoutDescription}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
            style={[
              styles.logoutButton,
              { backgroundColor: palette.destructive },
            ]}
          >
            <Text
              style={[styles.logoutLabel, { color: destructiveLabelColor }]}
            >
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
    paddingBottom: 120,
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
  inputChrome: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputIconButton: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  keyInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 8,
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
