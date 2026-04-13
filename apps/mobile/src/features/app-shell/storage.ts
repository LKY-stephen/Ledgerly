import AsyncStorage from "@react-native-async-storage/async-storage";
import { buildDeviceStateStorageKey } from "@creator-cfo/storage";

import { coerceLocalePreference, coerceThemePreference, parseSession } from "./model";
import type { AiProvider, AppSession, PersistedAppState, ProfileInfo } from "./types";

const STORAGE_KEYS = {
  aiProvider: buildDeviceStateStorageKey("ai_provider"),
  geminiApiKey: buildDeviceStateStorageKey("gemini_api_key"),
  localePreference: buildDeviceStateStorageKey("locale_preference"),
  openAiApiKey: buildDeviceStateStorageKey("openai_api_key"),
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

  const persistedState: PersistedAppState = {
    aiProvider: rawAiProvider === "gemini" ? "gemini" : "openai",
    geminiApiKey: String(values[STORAGE_KEYS.geminiApiKey] ?? "").trim(),
    localePreference: coerceLocalePreference(values[STORAGE_KEYS.localePreference]),
    openAiApiKey: String(values[STORAGE_KEYS.openAiApiKey] ?? "").trim(),
    profileInfo: {
      email: String(values[STORAGE_KEYS.profileEmail] ?? "").trim(),
      name: String(values[STORAGE_KEYS.profileName] ?? "").trim(),
      phone: String(values[STORAGE_KEYS.profilePhone] ?? "").trim(),
    },
    session: parseSession(values[STORAGE_KEYS.session]),
    themePreference: coerceThemePreference(values[STORAGE_KEYS.themePreference]),
  };

  return {
    ...persistedState,
    ...runtimeOverrides,
    profileInfo: runtimeOverrides.profileInfo ?? persistedState.profileInfo,
  };
}

export async function persistThemePreference(value: PersistedAppState["themePreference"]) {
  runtimeOverrides.themePreference = value;
  await AsyncStorage.setItem(STORAGE_KEYS.themePreference, value);
}

export async function persistLocalePreference(value: PersistedAppState["localePreference"]) {
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
  return raw === "gemini" ? "gemini" : "openai";
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

  return String((await AsyncStorage.getItem(STORAGE_KEYS.openAiApiKey)) ?? "").trim();
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
