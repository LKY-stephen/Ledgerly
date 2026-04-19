import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildDeviceStateStorageKey,
  buildLegacyDeviceStateStorageKeys,
} from "@ledgerly/storage";

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
  parseApiBaseUrl: "@ledgerly/mobile/parse_api_base_url",
  profileEmail: buildDeviceStateStorageKey("profile_email"),
  profileName: buildDeviceStateStorageKey("profile_name"),
  profilePhone: buildDeviceStateStorageKey("profile_phone"),
  session: buildDeviceStateStorageKey("auth_session"),
  themePreference: buildDeviceStateStorageKey("theme_preference"),
} as const;

const LEGACY_STORAGE_KEYS = {
  aiProvider: buildLegacyDeviceStateStorageKeys("ai_provider"),
  geminiApiKey: buildLegacyDeviceStateStorageKeys("gemini_api_key"),
  geminiAuthMode: buildLegacyDeviceStateStorageKeys("gemini_auth_mode"),
  googleAccessToken: buildLegacyDeviceStateStorageKeys("google_access_token"),
  googleRefreshToken: buildLegacyDeviceStateStorageKeys("google_refresh_token"),
  googleTokenExpiresAt: buildLegacyDeviceStateStorageKeys("google_token_expires_at"),
  inferApiKey: buildLegacyDeviceStateStorageKeys("infer_api_key"),
  inferBaseUrl: buildLegacyDeviceStateStorageKeys("infer_base_url"),
  inferModel: buildLegacyDeviceStateStorageKeys("infer_model"),
  localePreference: buildLegacyDeviceStateStorageKeys("locale_preference"),
  openAiApiKey: buildLegacyDeviceStateStorageKeys("openai_api_key"),
  parseApiBaseUrl: [
    `${buildLegacyDeviceStateStorageKeys("theme_preference")[0].replace(/\/theme_preference$/, "")}/parse_api_base_url`,
  ],
  profileEmail: buildLegacyDeviceStateStorageKeys("profile_email"),
  profileName: buildLegacyDeviceStateStorageKeys("profile_name"),
  profilePhone: buildLegacyDeviceStateStorageKeys("profile_phone"),
  session: buildLegacyDeviceStateStorageKeys("auth_session"),
  themePreference: buildLegacyDeviceStateStorageKeys("theme_preference"),
} as const satisfies Record<keyof typeof STORAGE_KEYS, readonly string[]>;

type StorageKeyName = keyof typeof STORAGE_KEYS;

const defaultAiProvider: AiProvider = "infer";

const ALL_STORAGE_KEYS = [
  ...new Set(
    Object.values(STORAGE_KEYS).flatMap((key) => [key]).concat(
      Object.values(LEGACY_STORAGE_KEYS).flatMap((keys) => [...keys]),
    ),
  ),
];

const defaultProfileInfo: ProfileInfo = {
  email: "",
  name: "",
  phone: "",
};

const runtimeOverrides: Partial<PersistedAppState> = {};

function hasRuntimeOverride<Key extends keyof PersistedAppState>(key: Key): boolean {
  return Object.prototype.hasOwnProperty.call(runtimeOverrides, key);
}

function resolveStoredValue(
  values: Record<string, string | null | undefined>,
  keyName: StorageKeyName,
): string | null {
  const primaryKey = STORAGE_KEYS[keyName];

  if (Object.prototype.hasOwnProperty.call(values, primaryKey)) {
    return values[primaryKey] ?? null;
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS[keyName]) {
    if (Object.prototype.hasOwnProperty.call(values, legacyKey)) {
      return values[legacyKey] ?? null;
    }
  }

  return null;
}

async function readStoredValue(keyName: StorageKeyName): Promise<string | null> {
  const primaryValue = await AsyncStorage.getItem(STORAGE_KEYS[keyName]);

  if (primaryValue !== null) {
    return primaryValue;
  }

  for (const legacyKey of LEGACY_STORAGE_KEYS[keyName]) {
    const legacyValue = await AsyncStorage.getItem(legacyKey);

    if (legacyValue !== null) {
      return legacyValue;
    }
  }

  return null;
}

async function removeLegacyStorageKeys(keyName: StorageKeyName): Promise<void> {
  const legacyKeys = LEGACY_STORAGE_KEYS[keyName];

  if (legacyKeys.length === 0) {
    return;
  }

  await removeStorageKeys(legacyKeys);
}

async function removeStorageKeys(keys: readonly string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  if (typeof AsyncStorage.multiRemove === "function") {
    await AsyncStorage.multiRemove([...keys]);
    return;
  }

  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
}

async function persistStringValue(
  keyName: StorageKeyName,
  value: string | null,
): Promise<void> {
  if (value && value.length > 0) {
    await AsyncStorage.setItem(STORAGE_KEYS[keyName], value);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS[keyName]);
  }

  await removeLegacyStorageKeys(keyName);
}

export async function loadPersistedAppState(): Promise<PersistedAppState> {
  const entries = await AsyncStorage.multiGet(ALL_STORAGE_KEYS);
  const values = Object.fromEntries(entries);

  const rawAiProvider = String(resolveStoredValue(values, "aiProvider") ?? "").trim();
  const rawGeminiAuthMode = String(resolveStoredValue(values, "geminiAuthMode") ?? "").trim();
  const persistedState: PersistedAppState = {
    aiProvider:
      rawAiProvider === "gemini"
        ? "gemini"
        : rawAiProvider === "openai"
          ? "openai"
          : defaultAiProvider,
    geminiApiKey: String(resolveStoredValue(values, "geminiApiKey") ?? "").trim(),
    geminiAuthMode: rawGeminiAuthMode === "google_oauth" ? "google_oauth" : "api_key",
    googleAccessToken: String(resolveStoredValue(values, "googleAccessToken") ?? "").trim(),
    googleRefreshToken: String(resolveStoredValue(values, "googleRefreshToken") ?? "").trim(),
    googleTokenExpiresAt: String(resolveStoredValue(values, "googleTokenExpiresAt") ?? "").trim(),
    inferApiKey: String(resolveStoredValue(values, "inferApiKey") ?? "").trim(),
    inferBaseUrl: String(resolveStoredValue(values, "inferBaseUrl") ?? "").trim().replace(/\/+$/g, ""),
    inferModel: String(resolveStoredValue(values, "inferModel") ?? "").trim(),
    localePreference: coerceLocalePreference(resolveStoredValue(values, "localePreference")),
    openAiApiKey: String(resolveStoredValue(values, "openAiApiKey") ?? "").trim(),
    parseApiBaseUrl: String(resolveStoredValue(values, "parseApiBaseUrl") ?? "")
      .trim()
      .replace(/\/+$/g, ""),
    profileInfo: {
      email: String(resolveStoredValue(values, "profileEmail") ?? "").trim(),
      name: String(resolveStoredValue(values, "profileName") ?? "").trim(),
      phone: String(resolveStoredValue(values, "profilePhone") ?? "").trim(),
    },
    session: parseSession(resolveStoredValue(values, "session")),
    themePreference: coerceThemePreference(resolveStoredValue(values, "themePreference")),
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
  await persistStringValue("themePreference", value);
}

export async function persistLocalePreference(
  value: PersistedAppState["localePreference"],
) {
  runtimeOverrides.localePreference = value;
  await persistStringValue("localePreference", value);
}

export async function persistSession(session: AppSession | null) {
  runtimeOverrides.session = session;
  if (session) {
    await persistStringValue("session", JSON.stringify(session));
    return;
  }

  await persistStringValue("session", null);
}

export async function persistAiProvider(value: AiProvider) {
  runtimeOverrides.aiProvider = value;
  await persistStringValue("aiProvider", value);
}

export async function persistGeminiApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.geminiApiKey = normalized;
  await persistStringValue("geminiApiKey", normalized || null);
}

export async function persistOpenAiApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.openAiApiKey = normalized;
  await persistStringValue("openAiApiKey", normalized || null);
}

export async function persistParseApiBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/g, "");
  runtimeOverrides.parseApiBaseUrl = normalized;
  await persistStringValue("parseApiBaseUrl", normalized || null);
}

export async function persistProfileInfo(value: ProfileInfo) {
  const normalized = normalizeProfileInfo(value);
  runtimeOverrides.profileInfo = normalized;

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.profileName, normalized.name],
    [STORAGE_KEYS.profileEmail, normalized.email],
    [STORAGE_KEYS.profilePhone, normalized.phone],
  ]);
  await removeStorageKeys([
    ...LEGACY_STORAGE_KEYS.profileName,
    ...LEGACY_STORAGE_KEYS.profileEmail,
    ...LEGACY_STORAGE_KEYS.profilePhone,
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
    ...LEGACY_STORAGE_KEYS.profileName,
    ...LEGACY_STORAGE_KEYS.profileEmail,
    ...LEGACY_STORAGE_KEYS.profilePhone,
  ]);
  const values = Object.fromEntries(entries);

  return {
    email: String(resolveStoredValue(values, "profileEmail") ?? "").trim(),
    name: String(resolveStoredValue(values, "profileName") ?? "").trim(),
    phone: String(resolveStoredValue(values, "profilePhone") ?? "").trim(),
  };
}

export async function loadPersistedAiProvider(): Promise<AiProvider> {
  if (hasRuntimeOverride("aiProvider")) {
    return runtimeOverrides.aiProvider ?? defaultAiProvider;
  }

  const raw = String((await readStoredValue("aiProvider")) ?? "").trim();
  if (raw === "gemini") return "gemini";
  if (raw === "openai") return "openai";
  return defaultAiProvider;
}

export async function loadPersistedGeminiApiKey(): Promise<string> {
  if (hasRuntimeOverride("geminiApiKey")) {
    return runtimeOverrides.geminiApiKey ?? "";
  }

  return String((await readStoredValue("geminiApiKey")) ?? "").trim();
}

export async function loadPersistedOpenAiApiKey(): Promise<string> {
  if (hasRuntimeOverride("openAiApiKey")) {
    return runtimeOverrides.openAiApiKey ?? "";
  }

  return String(
    (await readStoredValue("openAiApiKey")) ?? "",
  ).trim();
}

export async function persistInferApiKey(value: string) {
  const normalized = value.trim();
  runtimeOverrides.inferApiKey = normalized;
  await persistStringValue("inferApiKey", normalized || null);
}

export async function loadPersistedInferApiKey(): Promise<string> {
  if (hasRuntimeOverride("inferApiKey")) {
    return runtimeOverrides.inferApiKey ?? "";
  }

  const stored = String((await readStoredValue("inferApiKey")) ?? "").trim();

  if (stored) return stored;

  return (process.env.EXPO_PUBLIC_INFER_API_KEY ?? "").trim();
}

export async function persistInferBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/g, "");
  runtimeOverrides.inferBaseUrl = normalized;
  await persistStringValue("inferBaseUrl", normalized || null);
}

export async function loadPersistedInferBaseUrl(): Promise<string> {
  if (hasRuntimeOverride("inferBaseUrl")) {
    return runtimeOverrides.inferBaseUrl ?? "";
  }

  const stored = String((await readStoredValue("inferBaseUrl")) ?? "")
    .trim()
    .replace(/\/+$/g, "");

  if (stored) return stored;

  return (process.env.EXPO_PUBLIC_INFER_BASE_URL ?? "").trim().replace(/\/+$/g, "");
}

export async function persistInferModel(value: string) {
  const normalized = value.trim();
  runtimeOverrides.inferModel = normalized;
  await persistStringValue("inferModel", normalized || null);
}

export async function loadPersistedInferModel(): Promise<string> {
  if (hasRuntimeOverride("inferModel")) {
    return runtimeOverrides.inferModel ?? "";
  }

  const stored = String((await readStoredValue("inferModel")) ?? "").trim();

  if (stored) return stored;

  return (process.env.EXPO_PUBLIC_INFER_MODEL ?? "").trim();
}

export async function persistGeminiAuthMode(value: GeminiAuthMode) {
  runtimeOverrides.geminiAuthMode = value;
  await persistStringValue("geminiAuthMode", value);
}

export async function loadPersistedGeminiAuthMode(): Promise<GeminiAuthMode> {
  if (hasRuntimeOverride("geminiAuthMode")) {
    return runtimeOverrides.geminiAuthMode ?? "api_key";
  }

  const raw = String((await readStoredValue("geminiAuthMode")) ?? "").trim();
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
  await removeStorageKeys([
    ...LEGACY_STORAGE_KEYS.googleAccessToken,
    ...LEGACY_STORAGE_KEYS.googleRefreshToken,
    ...LEGACY_STORAGE_KEYS.googleTokenExpiresAt,
  ]);
}

export async function loadPersistedGoogleAccessToken(): Promise<string> {
  if (hasRuntimeOverride("googleAccessToken")) {
    return runtimeOverrides.googleAccessToken ?? "";
  }

  return String((await readStoredValue("googleAccessToken")) ?? "").trim();
}

export async function loadPersistedGoogleRefreshToken(): Promise<string> {
  if (hasRuntimeOverride("googleRefreshToken")) {
    return runtimeOverrides.googleRefreshToken ?? "";
  }

  return String((await readStoredValue("googleRefreshToken")) ?? "").trim();
}

export async function loadPersistedGoogleTokenExpiresAt(): Promise<string> {
  if (hasRuntimeOverride("googleTokenExpiresAt")) {
    return runtimeOverrides.googleTokenExpiresAt ?? "";
  }

  return String((await readStoredValue("googleTokenExpiresAt")) ?? "").trim();
}

export async function clearGoogleTokens() {
  runtimeOverrides.googleAccessToken = "";
  runtimeOverrides.googleRefreshToken = "";
  runtimeOverrides.googleTokenExpiresAt = "";
  runtimeOverrides.geminiAuthMode = "api_key";

  await removeStorageKeys([
    STORAGE_KEYS.googleAccessToken,
    STORAGE_KEYS.googleRefreshToken,
    STORAGE_KEYS.googleTokenExpiresAt,
    ...LEGACY_STORAGE_KEYS.googleAccessToken,
    ...LEGACY_STORAGE_KEYS.googleRefreshToken,
    ...LEGACY_STORAGE_KEYS.googleTokenExpiresAt,
  ]);
  await persistStringValue("geminiAuthMode", "api_key");
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
