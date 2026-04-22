import { getLocales } from "expo-localization";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { Platform, useColorScheme } from "react-native";
import { surfaceThemes } from "@ledgerly/ui";

import {
  initializeEmptyStorageFromSetup,
  inspectStorageGateState,
  type StorageGateState,
} from "../../storage/startup";
import { getAppCopy } from "./copy";
import {
  createAppleSession,
  createGuestSession,
  getSessionDisplayName,
  resolveLocale,
  resolveThemeName,
} from "./model";
import {
  clearGoogleTokens,
  loadPersistedAppState,
  persistAiProvider,
  persistGeminiApiKey,
  persistGeminiAuthMode,
  persistGoogleTokens,
  persistInferApiKey,
  persistInferBaseUrl,
  persistInferModel,
  persistLocalePreference,
  persistOpenAiApiKey,
  persistParseApiBaseUrl,
  persistProfileInfo,
  persistSession,
  persistThemePreference,
} from "./storage";
import type {
  AiProvider,
  AppSession,
  GeminiAuthMode,
  LocalePreference,
  PersistedAppState,
  ProfileInfo,
  ResolvedLocale,
  ThemePreference,
} from "./types";

interface AppShellContextValue {
  aiProvider: AiProvider;
  bumpStorageRevision: () => void;
  continueAsGuest: () => Promise<void>;
  copy: ReturnType<typeof getAppCopy>;
  disconnectGoogleOAuth: () => Promise<void>;
  initializeEmptyStorage: () => Promise<void>;
  geminiApiKey: string;
  geminiAuthMode: GeminiAuthMode;
  inferApiKey: string;
  inferBaseUrl: string;
  inferModel: string;
  isStorageSuspended: boolean;
  isHydrated: boolean;
  localePreference: LocalePreference;
  openAiApiKey: string;
  palette: (typeof surfaceThemes)[keyof typeof surfaceThemes];
  parseApiBaseUrl: string;
  profileInfo: ProfileInfo;
  resolvedLocale: ResolvedLocale;
  session: AppSession | null;
  sessionDisplayName: string;
  refreshStorageGateState: () => Promise<StorageGateState>;
  setAiProvider: (value: AiProvider) => Promise<void>;
  setGeminiApiKey: (value: string) => Promise<void>;
  setGeminiAuthMode: (value: GeminiAuthMode) => Promise<void>;
  setInferApiKey: (value: string) => Promise<void>;
  setInferBaseUrl: (value: string) => Promise<void>;
  setInferModel: (value: string) => Promise<void>;
  setStorageSuspended: (value: boolean) => void;
  setLocalePreference: (value: LocalePreference) => Promise<void>;
  setOpenAiApiKey: (value: string) => Promise<void>;
  setParseApiBaseUrl: (value: string) => Promise<void>;
  setProfileInfo: (value: ProfileInfo) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithApple: (input: {
    email?: string | null;
    familyName?: string | null;
    givenName?: string | null;
    user: string;
  }) => Promise<void>;
  connectGeminiWithGoogle: (input: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    email?: string | null;
    displayName?: string | null;
  }) => Promise<void>;
  storageGateState: StorageGateState | { kind: "checking" };
  storageRevision: number;
  themePreference: ThemePreference;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

const defaultAiProvider: AiProvider = "openai";

const initialState: PersistedAppState = {
  aiProvider: defaultAiProvider,
  geminiApiKey: "",
  geminiAuthMode: "api_key",
  googleAccessToken: "",
  googleRefreshToken: "",
  googleTokenExpiresAt: "",
  inferApiKey: (process.env.EXPO_PUBLIC_INFER_API_KEY ?? "").trim(),
  inferBaseUrl: (process.env.EXPO_PUBLIC_INFER_BASE_URL ?? "").trim().replace(/\/+$/g, ""),
  inferModel: (process.env.EXPO_PUBLIC_INFER_MODEL ?? "").trim(),
  localePreference: "system",
  openAiApiKey: "",
  parseApiBaseUrl: "",
  profileInfo: {
    email: "",
    name: "",
    phone: "",
  },
  session: null,
  themePreference: "system",
};

export function AppShellProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const deviceLanguageTag = getLocales()[0]?.languageTag;
  const [state, setState] = useState<PersistedAppState>(initialState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStorageSuspended, setStorageSuspended] = useState(false);
  const [storageRevision, setStorageRevision] = useState(0);
  const [storageGateState, setStorageGateState] = useState<StorageGateState | { kind: "checking" }>(
    Platform.OS === "web" ? { kind: "ready" } : { kind: "checking" },
  );

  useEffect(() => {
    let isMounted = true;

    loadPersistedAppState()
      .then((persistedState) => {
        if (isMounted) {
          setState(persistedState);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timeout = setTimeout(() => {
      setStorageGateState((current) =>
        current.kind === "checking"
          ? { kind: "recovery_required", message: "Storage inspection timed out." }
          : current,
      );
    }, 10_000);

    void refreshStorageGateState().finally(() => clearTimeout(timeout));
  }, [isHydrated]);

  const resolvedTheme = resolveThemeName(state.themePreference, systemTheme);
  const resolvedLocale = resolveLocale(
    state.localePreference,
    deviceLanguageTag,
  );
  const palette = surfaceThemes[resolvedTheme];
  const copy = getAppCopy(resolvedLocale);

  const refreshStorageGateState = async (): Promise<StorageGateState> => {
    if (Platform.OS === "web") {
      const readyState: StorageGateState = { kind: "ready" };
      setStorageGateState(readyState);
      return readyState;
    }

    setStorageGateState({ kind: "checking" });

    try {
      const nextState = await inspectStorageGateState();
      setStorageGateState(nextState);
      return nextState;
    } catch (error) {
      const fallback: StorageGateState = {
        kind: "recovery_required",
        message: error instanceof Error ? error.message : "Storage inspection failed.",
      };
      setStorageGateState(fallback);
      return fallback;
    }
  };

  const setThemePreference = async (value: ThemePreference) => {
    setState((current) => ({ ...current, themePreference: value }));
    await persistThemePreference(value);
  };

  const setLocalePreference = async (value: LocalePreference) => {
    setState((current) => ({ ...current, localePreference: value }));
    await persistLocalePreference(value);
  };

  const setAiProvider = async (value: AiProvider) => {
    setState((current) => ({ ...current, aiProvider: value }));
    await persistAiProvider(value);
  };

  const setGeminiApiKey = async (value: string) => {
    const normalized = value.trim();
    setState((current) => ({ ...current, geminiApiKey: normalized }));
    await persistGeminiApiKey(normalized);
  };

  const setOpenAiApiKey = async (value: string) => {
    const normalized = value.trim();
    setState((current) => ({ ...current, openAiApiKey: normalized }));
    await persistOpenAiApiKey(normalized);
  };

  const setParseApiBaseUrl = async (value: string) => {
    const normalized = value.trim().replace(/\/+$/g, "");
    setState((current) => ({ ...current, parseApiBaseUrl: normalized }));
    await persistParseApiBaseUrl(normalized);
  };

  const setInferApiKey = async (value: string) => {
    const normalized = value.trim();
    setState((current) => ({ ...current, inferApiKey: normalized }));
    await persistInferApiKey(normalized);
  };

  const setInferBaseUrl = async (value: string) => {
    const normalized = value.trim().replace(/\/+$/g, "");
    setState((current) => ({ ...current, inferBaseUrl: normalized }));
    await persistInferBaseUrl(normalized);
  };

  const setInferModel = async (value: string) => {
    const normalized = value.trim();
    setState((current) => ({ ...current, inferModel: normalized }));
    await persistInferModel(normalized);
  };

  const setProfileInfo = async (value: ProfileInfo) => {
    setState((current) => ({ ...current, profileInfo: value }));
    await persistProfileInfo(value);
  };
  const setGeminiAuthMode = async (value: GeminiAuthMode) => {
    setState((current) => ({ ...current, geminiAuthMode: value }));
    await persistGeminiAuthMode(value);
  };

  const setSession = async (session: AppSession | null) => {
    setState((current) => ({ ...current, session }));
    await persistSession(session);
  };

  const contextValue: AppShellContextValue = {
    aiProvider: state.aiProvider,
    bumpStorageRevision: () => {
      setStorageRevision((current) => current + 1);
    },
    continueAsGuest: async () => {
      await setSession(createGuestSession());
    },
    copy,
    disconnectGoogleOAuth: async () => {
      setState((current) => ({
        ...current,
        geminiAuthMode: "api_key",
        googleAccessToken: "",
        googleRefreshToken: "",
        googleTokenExpiresAt: "",
      }));
      await clearGoogleTokens();
    },
    initializeEmptyStorage: async () => {
      await initializeEmptyStorageFromSetup();
      setStorageRevision((current) => current + 1);
      await refreshStorageGateState();
    },
    geminiApiKey: state.geminiApiKey,
    geminiAuthMode: state.geminiAuthMode,
    inferApiKey: state.inferApiKey,
    inferBaseUrl: state.inferBaseUrl,
    inferModel: state.inferModel,
    isStorageSuspended,
    isHydrated,
    localePreference: state.localePreference,
    openAiApiKey: state.openAiApiKey,
    palette,
    parseApiBaseUrl: state.parseApiBaseUrl,
    profileInfo: state.profileInfo,
    resolvedLocale,
    session: state.session,
    sessionDisplayName: getSessionDisplayName(state.session),
    refreshStorageGateState,
    setAiProvider,
    setGeminiApiKey,
    setGeminiAuthMode,
    setInferApiKey,
    setInferBaseUrl,
    setInferModel,
    setStorageSuspended,
    setLocalePreference,
    setOpenAiApiKey,
    setParseApiBaseUrl,
    setProfileInfo,
    setThemePreference,
    signOut: async () => {
      await setSession(null);
    },
    signInWithApple: async (input) => {
      await setSession(createAppleSession(input));
    },
    connectGeminiWithGoogle: async (input) => {
      await setAiProvider("gemini");
      await setGeminiAuthMode("google_oauth");
      await persistGoogleTokens({
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      });
      setState((current) => ({
        ...current,
        googleAccessToken: input.accessToken,
        googleRefreshToken: input.refreshToken,
        googleTokenExpiresAt: input.expiresAt,
      }));
      if (input.email || input.displayName) {
        await setProfileInfo({
          email: input.email ?? state.profileInfo.email,
          name: input.displayName ?? state.profileInfo.name,
          phone: state.profileInfo.phone,
        });
      }
    },
    storageGateState,
    storageRevision,
    themePreference: state.themePreference,
  };

  return (
    <AppShellContext.Provider value={contextValue}>
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used inside AppShellProvider.");
  }

  return context;
}
