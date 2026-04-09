export type AiProvider = "openai" | "gemini";
export type ThemePreference = "system" | "light" | "dark";
export type LocalePreference = "system" | "en" | "zh-CN";
export type ResolvedLocale = "en" | "zh-CN";

export interface ProfileInfo {
  email: string;
  name: string;
  phone: string;
}

export interface GuestSession {
  kind: "guest";
  displayName: string;
  startedAt: string;
}

export interface AppleSession {
  kind: "apple";
  appleUserId: string;
  email: string | null;
  displayName: string | null;
  startedAt: string;
}

export type AppSession = GuestSession | AppleSession;

export interface PersistedAppState {
  aiProvider: AiProvider;
  geminiApiKey: string;
  localePreference: LocalePreference;
  openAiApiKey: string;
  profileInfo: ProfileInfo;
  session: AppSession | null;
  themePreference: ThemePreference;
}
