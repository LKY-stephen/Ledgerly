import { Feather } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
import { SectionCard } from "@ledgerly/ui";

import { startNewLedger } from "../database-demo/seed-database-demo";
import { pickAndImportDatabasePackageAsync } from "../../storage/database-import";
import { useResponsive } from "../../hooks/use-responsive";
import {
  localePreferenceOptions,
  themePreferenceOptions,
} from "../app-shell/copy";
import { useAppShell } from "../app-shell/provider";
import { getButtonColors, getFeedbackColors } from "../app-shell/theme-utils";
import type {
  AiProvider,
  LocalePreference,
  ProfileInfo,
  ThemePreference,
} from "../app-shell/types";
import {
  exchangeCodeForTokens,
  GOOGLE_SCOPES,
} from "../auth/google-auth";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

function shouldRenderAiParseSection() {
  return false;
}

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
  const { isExpanded } = useResponsive();
  const {
    aiProvider,
    bumpStorageRevision,
    connectGeminiWithGoogle,
    copy,
    disconnectGoogleOAuth,
    geminiApiKey,
    geminiAuthMode,
    inferApiKey,
    inferBaseUrl,
    inferModel,
    localePreference,
    openAiApiKey,
    palette,
    refreshStorageGateState,
    profileInfo,
    session,
    sessionDisplayName,
    setAiProvider,
    setGeminiApiKey,
    setInferApiKey,
    setInferBaseUrl,
    setInferModel,
    setStorageSuspended,
    setLocalePreference,
    setOpenAiApiKey,
    setProfileInfo,
    setThemePreference,
    signOut,
    themePreference,
  } = useAppShell();
  const [aiProviderDraft, setAiProviderDraft] = useState<AiProvider>(aiProvider);
  const [apiKeyDraft, setApiKeyDraft] = useState(openAiApiKey);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState(geminiApiKey);
  const [inferKeyDraft, setInferKeyDraft] = useState(inferApiKey);
  const [inferBaseUrlDraft, setInferBaseUrlDraft] = useState(inferBaseUrl);
  const [inferModelDraft, setInferModelDraft] = useState(inferModel);
  const [isOpenAiKeyVisible, setIsOpenAiKeyVisible] = useState(false);
  const [isGeminiKeyVisible, setIsGeminiKeyVisible] = useState(false);
  const [isInferKeyVisible, setIsInferKeyVisible] = useState(false);
  const [draftProfile, setDraftProfile] = useState<ProfileInfo>(profileInfo);
  const [databaseImportMessage, setDatabaseImportMessage] = useState<{
    tone: "error" | "success";
    value: string;
  } | null>(null);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isSeedingDemoLedger, setIsSeedingDemoLedger] = useState(false);

  const googleClientIdIos = (Constants.expoConfig?.extra?.googleClientIdIos as string) ?? "";
  const googleClientIdWeb = (Constants.expoConfig?.extra?.googleClientIdWeb as string) ?? "";

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: googleClientIdIos,
    webClientId: googleClientIdWeb,
    scopes: GOOGLE_SCOPES,
    extraParams: { access_type: "offline" },
  });

  useEffect(() => {
    if (googleResponse?.type !== "success") return;
    const { code } = googleResponse.params;
    if (!code || !googleRequest?.codeVerifier || !googleRequest?.redirectUri) return;

    const clientId = Platform.OS === "ios" ? googleClientIdIos : googleClientIdWeb;

    setIsGoogleConnecting(true);
    exchangeCodeForTokens(code, googleRequest.redirectUri, googleRequest.codeVerifier, clientId)
      .then((result) =>
        connectGeminiWithGoogle({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: result.expiresAt,
          email: result.user.email,
          displayName: result.user.displayName,
        }),
      )
      .then(() => {
        setAiProviderDraft("gemini");
      })
      .catch(() => {
        Alert.alert(copy.login.googleUnavailable);
      })
      .finally(() => {
        setIsGoogleConnecting(false);
      });
  }, [
    connectGeminiWithGoogle,
    copy.login.googleUnavailable,
    googleClientIdIos,
    googleClientIdWeb,
    googleRequest,
    googleResponse,
  ]);

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
    setInferKeyDraft(inferApiKey);
  }, [inferApiKey]);

  useEffect(() => {
    setInferBaseUrlDraft(inferBaseUrl);
  }, [inferBaseUrl]);

  useEffect(() => {
    setInferModelDraft(inferModel);
  }, [inferModel]);


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

  const isGeminiOAuth = aiProviderDraft === "gemini" && geminiAuthMode === "google_oauth";

  const sessionKindLabel =
    session?.kind === "apple"
      ? copy.meScreen.sessionApple
      : session?.kind === "google"
        ? copy.meScreen.sessionGoogle
        : session?.kind === "guest"
          ? copy.common.guest
          : copy.meScreen.sessionNone;
  const sessionTitle =
    session?.kind === "apple"
      ? (sessionDisplayName || (session.displayName ?? session.email ?? copy.meScreen.sessionApple))
      : session?.kind === "google"
        ? (sessionDisplayName || (session.displayName ?? session.email ?? copy.meScreen.sessionGoogle))
        : session?.kind === "guest"
          ? copy.meScreen.sessionGuest
          : copy.meScreen.sessionNone;
  const destructiveLabelColor =
    palette.name === "dark" ? palette.shell : palette.inkOnAccent;
  const primaryButton = getButtonColors(palette, "primary");
  const destructiveButton = getButtonColors(palette, "destructive");
  const successFeedback = getFeedbackColors(palette, "success");
  const errorFeedback = getFeedbackColors(palette, "error");

  const saveAiSettings = async () => {
    if (aiProviderDraft === "openai") {
      const normalized = apiKeyDraft.trim();

      if (!normalized) {
        Alert.alert(copy.meScreen.openAiKeyRequiredAlert);
        return;
      }

      await Promise.all([
        setOpenAiApiKey(normalized),
        setAiProvider("openai"),
      ]);
      return;
    }

    if (aiProviderDraft === "infer") {
      const normalizedBaseUrl = inferBaseUrlDraft.trim();
      const normalizedKey = inferKeyDraft.trim();

      if (!normalizedBaseUrl) {
        Alert.alert(copy.meScreen.inferBaseUrlRequiredAlert);
        return;
      }

      if (!normalizedKey) {
        Alert.alert(copy.meScreen.inferKeyRequiredAlert);
        return;
      }

      await Promise.all([
        setInferBaseUrl(normalizedBaseUrl),
        setInferApiKey(normalizedKey),
        setInferModel(inferModelDraft.trim()),
        setAiProvider("infer"),
      ]);
      return;
    }

    if (isGeminiOAuth) {
      await setAiProvider("gemini");
      return;
    }

    const normalized = geminiKeyDraft.trim();

    if (!normalized) {
      Alert.alert(copy.meScreen.geminiKeyRequiredAlert);
      return;
    }

    await Promise.all([
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

    if (aiProviderDraft === "infer") {
      setInferKeyDraft("");
      setInferBaseUrlDraft("");
      setInferModelDraft("");
      await Promise.all([setInferApiKey(""), setInferBaseUrl(""), setInferModel("")]);
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
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.paper, borderColor: palette.border },
          ]}
        >
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

        <View style={isExpanded ? styles.wideBody : undefined}>
        <View style={isExpanded ? styles.wideLeft : undefined}>
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
                  backgroundColor: primaryButton.background,
                  borderColor: primaryButton.border,
                },
              ]}
              testID="profile-save-button"
            >
              <Text
                style={[
                  styles.actionButtonLabel,
                  { color: primaryButton.text },
                ]}
              >
                {copy.meScreen.profileSave}
              </Text>
            </Pressable>
          </View>
        </SectionCard>
        </View>

        <View style={isExpanded ? styles.wideRight : undefined}>
        {shouldRenderAiParseSection() ? (
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
                <PreferencePill
                  active={aiProviderDraft === "infer"}
                  label={copy.meScreen.aiProviderInfer}
                  onPress={() => setAiProviderDraft("infer")}
                  palette={palette}
                />
              </View>
            </View>

            {aiProviderDraft === "openai" && (
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
            )}

            {aiProviderDraft === "gemini" && isGeminiOAuth && (
              <View style={styles.fieldBlock}>
                <View style={styles.oauthStatusRow}>
                  <View style={[styles.oauthDot, { backgroundColor: palette.accent }]} />
                  <Text style={[styles.oauthStatusText, { color: palette.accent }]}>
                    {copy.meScreen.geminiOAuthConnected}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void disconnectGoogleOAuth();
                  }}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: palette.paperMuted,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryActionLabel, { color: palette.ink }]}>
                    {copy.meScreen.geminiOAuthDisconnect}
                  </Text>
                </Pressable>
              </View>
            )}

            {aiProviderDraft === "gemini" && !isGeminiOAuth && (
              <View style={styles.fieldBlock}>
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
                <View style={styles.oauthDivider}>
                  <View style={[styles.oauthDividerLine, { backgroundColor: palette.border }]} />
                  <Text style={[styles.oauthDividerText, { color: palette.inkMuted }]}>
                    {copy.meScreen.geminiOAuthOrLabel}
                  </Text>
                  <View style={[styles.oauthDividerLine, { backgroundColor: palette.border }]} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={!googleRequest || isGoogleConnecting}
                  onPress={() => {
                    void promptGoogleAsync();
                  }}
                  style={[
                    styles.googleConnectButton,
                    {
                      backgroundColor: palette.paperMuted,
                      borderColor: palette.border,
                      opacity: !googleRequest || isGoogleConnecting ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.googleConnectLabel, { color: palette.ink }]}>
                    {isGoogleConnecting ? copy.meScreen.geminiOAuthConnecting : copy.login.googleButton}
                  </Text>
                </Pressable>
                <Text style={[styles.googleConnectHint, { color: palette.inkMuted }]}>
                  {copy.login.googleHint}
                </Text>
              </View>
            )}

            {aiProviderDraft === "infer" && (
              <>
                <View style={styles.fieldBlock}>
                  <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
                    {copy.meScreen.apiInferBaseUrlLabel}
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setInferBaseUrlDraft}
                    placeholder={copy.meScreen.apiInferBaseUrlPlaceholder}
                    placeholderTextColor={palette.inkMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.paperMuted,
                        borderColor: palette.border,
                        color: palette.ink,
                      },
                    ]}
                    testID="profile-infer-base-url-input"
                    value={inferBaseUrlDraft}
                  />
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={[styles.fieldLabel, { color: palette.inkMuted }]}>
                    {copy.meScreen.apiInferModelLabel}
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setInferModelDraft}
                    placeholder={copy.meScreen.apiInferModelPlaceholder}
                    placeholderTextColor={palette.inkMuted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: palette.paperMuted,
                        borderColor: palette.border,
                        color: palette.ink,
                      },
                    ]}
                    testID="profile-infer-model-input"
                    value={inferModelDraft}
                  />
                </View>
                <ApiKeyField
                  hiddenAccessibilityLabel={copy.meScreen.hideApiKey}
                  isVisible={isInferKeyVisible}
                  label={copy.meScreen.apiInferKeyLabel}
                  onChangeText={setInferKeyDraft}
                  onToggleVisibility={() => {
                    setIsInferKeyVisible((current) => !current);
                  }}
                  palette={palette}
                  placeholder={copy.meScreen.apiInferKeyPlaceholder}
                  testID="profile-infer-key-input"
                  toggleTestID="profile-infer-key-toggle"
                  value={inferKeyDraft}
                  visibleAccessibilityLabel={copy.meScreen.showApiKey}
                />
              </>
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
                    backgroundColor: primaryButton.background,
                    borderColor: primaryButton.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionButtonLabel,
                    { color: primaryButton.text },
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
        ) : null}

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
                        ? errorFeedback.text
                        : successFeedback.text,
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
                  backgroundColor: isImportingDatabase
                    ? primaryButton.disabledBackground
                    : primaryButton.background,
                  borderColor: primaryButton.border,
                  opacity: isImportingDatabase ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionButtonLabel,
                  {
                    color: isImportingDatabase
                      ? primaryButton.disabledText
                      : primaryButton.text,
                  },
                ]}
              >
                {isImportingDatabase
                  ? copy.meScreen.databaseImportInProgress
                  : copy.meScreen.databaseImportAction}
              </Text>
            </Pressable>

            <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
              {copy.meScreen.databaseDemoDescription}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={isSeedingDemoLedger}
              onPress={async () => {
                setIsSeedingDemoLedger(true);
                setDatabaseImportMessage(null);
                setStorageSuspended(true);

                try {
                  await startNewLedger();
                  bumpStorageRevision();
                  setDatabaseImportMessage({
                    tone: "success",
                    value: copy.meScreen.databaseDemoSuccess,
                  });
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : copy.meScreen.databaseDemoFailure;
                  setDatabaseImportMessage({
                    tone: "error",
                    value: `${copy.meScreen.databaseDemoFailure} ${message}`,
                  });
                } finally {
                  setStorageSuspended(false);
                  setIsSeedingDemoLedger(false);
                }
              }}
              style={[
                styles.actionButton,
                {
                  backgroundColor: palette.paperMuted,
                  borderColor: palette.border,
                  opacity: isSeedingDemoLedger ? 0.7 : 1,
                },
              ]}
              testID="profile-start-new-ledger-button"
            >
              <Text style={[styles.secondaryActionLabel, { color: palette.ink }]}>
                {isSeedingDemoLedger
                  ? copy.meScreen.databaseDemoInProgress
                  : copy.meScreen.databaseDemoAction}
              </Text>
            </Pressable>
          </SectionCard>

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
              {
                backgroundColor: destructiveButton.background,
                borderColor: destructiveButton.border,
              },
            ]}
          >
            <Text
              style={[styles.logoutLabel, { color: destructiveLabelColor }]}
            >
              {copy.common.signOut}
            </Text>
          </Pressable>
        </SectionCard>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    gap: 14,
    padding: 18,
    paddingBottom: 168,
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
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  inputChrome: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 44,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
  },
  logoutButton: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
  },
  googleConnectButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  googleConnectHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  googleConnectLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  oauthDivider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginVertical: 4,
  },
  oauthDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  oauthDividerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  oauthDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  oauthStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  oauthStatusText: {
    fontSize: 14,
    fontWeight: "700",
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
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  wideBody: {
    flexDirection: "row",
    gap: 18,
  },
  wideLeft: {
    flex: 1,
    gap: 14,
  },
  wideRight: {
    flex: 1,
    gap: 14,
  },
});
