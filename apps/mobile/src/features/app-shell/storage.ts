import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildDeviceStateStorageKey } from "@creator-cfo/storage";

import {
  coerceLocalePreference,
  coerceThemePreference,
  parseSession,
} from "./model";
import type {
  AiProvider,
  AppSession,
  GeminiAuthMode,
  PersistedAppState,
  ProfileInfo,
} from "./types";

const STORAGE_KEYS = {
  aiProvider: buildDeviceStateStorageKey("ai_provider"),
  geminiApiKey: buildDeviceStateStorageKey("gemini_api_key"),
  geminiAuthMode: buildDeviceStateStorageKey("gemini_auth_mode"),
  googleAccessToken: buildDeviceStateStorageKey("google_access_token"),
  googleRefreshToken: buildDeviceStateStorageKey("google_refresh_token"),
  googleTokenExpiresAt: buildDeviceStateStorageKey("google_token_expires_at"),
  inferApiKey: buildDeviceStateStorageKey("infer_api_key"),
  inferBaseUrl: buildDeviceStateStorageKey("infer_base_url"),
  inferModel: buildDeviceStateStorageKey("infer_model"),
  localePreference: buildDeviceStateStorageKey("locale_preference"),
  openAiApiKey: buildDeviceStateStorageKey("openai_api_key"),
  parseApiBaseUrl: "@creator-cfo/mobile/parse_api_base_url",
  profileEmail: buildDeviceStateStorageKey("profile_email"),
  profileName: buildDeviceStateStorageKey("profile_name"),
  profilePhone: buildDeviceStateStorageKey("profile_phone"),
  session: buildDeviceStateStorageKey("auth_session"),
  themePreference: buildDeviceStateStorageKey("theme_preference"),
} as const;

const defaultProfileInfo: ProfileInfo = {
  email: "",
  name: "",
  phone: "",
};

const runtimeOverrides: Partial<PersistedAppState> = {};

function hasRuntimeOverride<Key extends keyof PersistedAppState>(key: Key): boolean {
  return Object.prototype.hasOwnProperty.call(runtimeOverrides, key);
}

export async function loadPersistedAppState(): Promise<PersistedAppState> {
  const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
  const values = Object.fromEntries(entries);

  const rawAiProvider = String(values[STORAGE_KEYS.aiProvider] ?? "").trim();
  const rawGeminiAuthMode = String(values[STORAGE_KEYS.geminiAuthMode] ?? "").trim();
  const persistedState: PersistedAppState = {
    aiProvider: rawAiProvider === "gemini" ? "gemini" : rawAiProvider === "infer" ? "infer" : "openai",
    geminiApiKey: String(values[STORAGE_KEYS.geminiApiKey] ?? "").trim(),
    geminiAuthMode: rawGeminiAuthMode === "google_oauth" ? "google_oauth" : "api_key",
    googleAccessToken: String(values[STORAGE_KEYS.googleAccessToken] ?? "").trim(),
    googleRefreshToken: String(values[STORAGE_KEYS.googleRefreshToken] ?? "").trim(),
    googleTokenExpiresAt: String(values[STORAGE_KEYS.googleTokenExpiresAt] ?? "").trim(),
    inferApiKey: String(values[STORAGE_KEYS.inferApiKey] ?? "").trim(),
    inferBaseUrl: String(values[STORAGE_KEYS.inferBaseUrl] ?? "").trim().replace(/\/+$/g, ""),
    inferModel: String(values[STORAGE_KEYS.inferModel] ?? "").trim(),
    localePreference: coerceLocalePreference(
      values[STORAGE_KEYS.localePreference],
    ),
    openAiApiKey: String(values[STORAGE_KEYS.openAiApiKey] ?? "").trim(),
    parseApiBaseUrl: String(values[STORAGE_KEYS.parseApiBaseUrl] ?? "")
      .trim()
      .replace(/\/+$/g, ""),
    profileInfo: {
      email: String(values[STORAGE_KEYS.profileEmail] ?? "").trim(),
      name: String(values[STORAGE_KEYS.profileName] ?? "").trim(),
      phone: String(values[STORAGE_KEYS.profilePhone] ?? "").trim(),
    },
    session: parseSession(values[STORAGE_KEYS.session]),
    themePreference: coerceThemePreference(
      values[STORAGE_KEYS.themePreference],
    ),
  };

  return {
    ...persistedState,
    ...runtimeOverrides,
    profileInfo: runtimeOverrides.profileInfo ?? persistedState.profileInfo,
  };
}

export async function persistThemePreference(
  value: PersistedAppState["themePreference"],
) {
  runtimeOverrides.themePreference = value;
  await AsyncStorage.setItem(STORAGE_KEYS.themePreference, value);
}

export async function persistLocalePreference(
  value: PersistedAppState["localePreference"],
) {
  runtimeOverrides.localePreference = value;
  await AsyncStorage.setItem(STORAGE_KEYS.localePreference, value);
}

export async function persistSession(session: AppSession | null) {
  runtimeOverrides.session = session;
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.session);
}

export async function persistAiProvider(value: AiProvider) {
  runtimeOverrides.aiProvider = value;
  await AsyncStorage.setItem(STORAGE_KEYS.aiProvider, value);
}

export async function persistGeminiApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.geminiApiKey = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.geminiApiKey, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.geminiApiKey);
}

export async function persistOpenAiApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.openAiApiKey = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.openAiApiKey, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.openAiApiKey);
}

export async function persistParseApiBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/g, "");
  runtimeOverrides.parseApiBaseUrl = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.parseApiBaseUrl, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.parseApiBaseUrl);
}

export async function persistProfileInfo(value: ProfileInfo) {
  const normalized = normalizeProfileInfo(value);
  runtimeOverrides.profileInfo = normalized;

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.profileName, normalized.name],
    [STORAGE_KEYS.profileEmail, normalized.email],
    [STORAGE_KEYS.profilePhone, normalized.phone],
  ]);
}

export async function loadPersistedProfileInfo(): Promise<ProfileInfo> {
  if (runtimeOverrides.profileInfo) {
    return runtimeOverrides.profileInfo;
  }

  const entries = await AsyncStorage.multiGet([
    STORAGE_KEYS.profileName,
    STORAGE_KEYS.profileEmail,
    STORAGE_KEYS.profilePhone,
  ]);
  const values = Object.fromEntries(entries);

  return {
    email: String(values[STORAGE_KEYS.profileEmail] ?? "").trim(),
    name: String(values[STORAGE_KEYS.profileName] ?? "").trim(),
    phone: String(values[STORAGE_KEYS.profilePhone] ?? "").trim(),
  };
}

export async function loadPersistedAiProvider(): Promise<AiProvider> {
  if (hasRuntimeOverride("aiProvider")) {
    return runtimeOverrides.aiProvider ?? "openai";
  }

  const raw = String((await AsyncStorage.getItem(STORAGE_KEYS.aiProvider)) ?? "").trim();
  if (raw === "gemini") return "gemini";
  if (raw === "infer") return "infer";
  return "openai";
}

export async function loadPersistedGeminiApiKey(): Promise<string> {
  if (hasRuntimeOverride("geminiApiKey")) {
    return runtimeOverrides.geminiApiKey ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.geminiApiKey)) ?? "").trim();
}

export async function loadPersistedOpenAiApiKey(): Promise<string> {
  if (hasRuntimeOverride("openAiApiKey")) {
    return runtimeOverrides.openAiApiKey ?? "";
  }

  return String(
    (await AsyncStorage.getItem(STORAGE_KEYS.openAiApiKey)) ?? "",
  ).trim();
}

export async function persistInferApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.inferApiKey = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.inferApiKey, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.inferApiKey);
}

export async function loadPersistedInferApiKey(): Promise<string> {
  if (hasRuntimeOverride("inferApiKey")) {
    return runtimeOverrides.inferApiKey ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.inferApiKey)) ?? "").trim();
}

export async function persistInferBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/g, "");
  runtimeOverrides.inferBaseUrl = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.inferBaseUrl, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.inferBaseUrl);
}

export async function loadPersistedInferBaseUrl(): Promise<string> {
  if (hasRuntimeOverride("inferBaseUrl")) {
    return runtimeOverrides.inferBaseUrl ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.inferBaseUrl)) ?? "")
    .trim()
    .replace(/\/+$/g, "");
}

export async function persistInferModel(value: string) {
  const normalized = value.trim();
  runtimeOverrides.inferModel = normalized;

  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEYS.inferModel, normalized);
    return;
  }

  await AsyncStorage.removeItem(STORAGE_KEYS.inferModel);
}

export async function loadPersistedInferModel(): Promise<string> {
  if (hasRuntimeOverride("inferModel")) {
    return runtimeOverrides.inferModel ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.inferModel)) ?? "").trim();
}

export async function persistGeminiAuthMode(value: GeminiAuthMode) {
  runtimeOverrides.geminiAuthMode = value;
  await AsyncStorage.setItem(STORAGE_KEYS.geminiAuthMode, value);
}

export async function loadPersistedGeminiAuthMode(): Promise<GeminiAuthMode> {
  if (hasRuntimeOverride("geminiAuthMode")) {
    return runtimeOverrides.geminiAuthMode ?? "api_key";
  }

  const raw = String((await AsyncStorage.getItem(STORAGE_KEYS.geminiAuthMode)) ?? "").trim();
  return raw === "google_oauth" ? "google_oauth" : "api_key";
}

export async function persistGoogleTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}) {
  runtimeOverrides.googleAccessToken = tokens.accessToken;
  runtimeOverrides.googleRefreshToken = tokens.refreshToken;
  runtimeOverrides.googleTokenExpiresAt = tokens.expiresAt;

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.googleAccessToken, tokens.accessToken],
    [STORAGE_KEYS.googleRefreshToken, tokens.refreshToken],
    [STORAGE_KEYS.googleTokenExpiresAt, tokens.expiresAt],
  ]);
}

export async function loadPersistedGoogleAccessToken(): Promise<string> {
  if (hasRuntimeOverride("googleAccessToken")) {
    return runtimeOverrides.googleAccessToken ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.googleAccessToken)) ?? "").trim();
}

export async function loadPersistedGoogleRefreshToken(): Promise<string> {
  if (hasRuntimeOverride("googleRefreshToken")) {
    return runtimeOverrides.googleRefreshToken ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.googleRefreshToken)) ?? "").trim();
}

export async function loadPersistedGoogleTokenExpiresAt(): Promise<string> {
  if (hasRuntimeOverride("googleTokenExpiresAt")) {
    return runtimeOverrides.googleTokenExpiresAt ?? "";
  }

  return String((await AsyncStorage.getItem(STORAGE_KEYS.googleTokenExpiresAt)) ?? "").trim();
}

export async function clearGoogleTokens() {
  runtimeOverrides.googleAccessToken = "";
  runtimeOverrides.googleRefreshToken = "";
  runtimeOverrides.googleTokenExpiresAt = "";
  runtimeOverrides.geminiAuthMode = "api_key";

  await AsyncStorage.multiRemove([
    STORAGE_KEYS.googleAccessToken,
    STORAGE_KEYS.googleRefreshToken,
    STORAGE_KEYS.googleTokenExpiresAt,
  ]);
  await AsyncStorage.setItem(STORAGE_KEYS.geminiAuthMode, "api_key");
}

function normalizeProfileInfo(value: ProfileInfo): ProfileInfo {
  if (!value) {
    return defaultProfileInfo;
  }

  return {
    email: String(value.email ?? "").trim(),
    name: String(value.name ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
  };
}
