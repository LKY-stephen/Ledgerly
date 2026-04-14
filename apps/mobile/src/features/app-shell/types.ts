export type AiProvider = "openai" | "gemini" | "infer";
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

export interface GoogleSession {
  kind: "google";
  googleUserId: string;
  email: string | null;
  displayName: string | null;
  startedAt: string;
}

export type AppSession = GuestSession | AppleSession | GoogleSession;

export type GeminiAuthMode = "api_key" | "google_oauth";

export interface PersistedAppState {
  aiProvider: AiProvider;
  geminiApiKey: string;
  geminiAuthMode: GeminiAuthMode;
  googleAccessToken: string;
  googleRefreshToken: string;
  googleTokenExpiresAt: string;
  inferApiKey: string;
  inferBaseUrl: string;
  inferModel: string;
  localePreference: LocalePreference;
  openAiApiKey: string;
  parseApiBaseUrl: string;
  profileInfo: ProfileInfo;
  session: AppSession | null;
  themePreference: ThemePreference;
}
