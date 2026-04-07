import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { surfaceThemes } from "@creator-cfo/ui";

import { getAppCopy } from "./copy";
import {
  createAppleSession,
  createGuestSession,
  getSessionDisplayName,
  resolveLocale,
  resolveThemeName,
} from "./model";
import {
  loadPersistedAppState,
  persistLocalePreference,
  persistOpenAiApiKey,
  persistParseApiBaseUrl,
  persistSession,
  persistThemePreference,
} from "./storage";
import type {
  AppSession,
  LocalePreference,
  PersistedAppState,
  ThemePreference,
} from "./types";

interface AppShellContextValue {
  bumpStorageRevision: () => void;
  continueAsGuest: () => Promise<void>;
  copy: ReturnType<typeof getAppCopy>;
  isStorageSuspended: boolean;
  isHydrated: boolean;
  localePreference: LocalePreference;
  openAiApiKey: string;
  palette: (typeof surfaceThemes)[keyof typeof surfaceThemes];
  parseApiBaseUrl: string;
  session: AppSession | null;
  sessionDisplayName: string;
  setStorageSuspended: (value: boolean) => void;
  setLocalePreference: (value: LocalePreference) => Promise<void>;
  setOpenAiApiKey: (value: string) => Promise<void>;
  setParseApiBaseUrl: (value: string) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithApple: (input: {
    email?: string | null;
    familyName?: string | null;
    givenName?: string | null;
    user: string;
  }) => Promise<void>;
  storageRevision: number;
  themePreference: ThemePreference;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

const initialState: PersistedAppState = {
  localePreference: "system",
  openAiApiKey: "",
  parseApiBaseUrl: "",
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

  const resolvedTheme = resolveThemeName(state.themePreference, systemTheme);
  const resolvedLocale = resolveLocale(state.localePreference, deviceLanguageTag);
  const palette = surfaceThemes[resolvedTheme];
  const copy = getAppCopy(resolvedLocale);

  const setThemePreference = async (value: ThemePreference) => {
    setState((current) => ({ ...current, themePreference: value }));
    await persistThemePreference(value);
  };

  const setLocalePreference = async (value: LocalePreference) => {
    setState((current) => ({ ...current, localePreference: value }));
    await persistLocalePreference(value);
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

  const setSession = async (session: AppSession | null) => {
    setState((current) => ({ ...current, session }));
    await persistSession(session);
  };

  const contextValue: AppShellContextValue = {
    bumpStorageRevision: () => {
      setStorageRevision((current) => current + 1);
    },
    continueAsGuest: async () => {
      await setSession(createGuestSession());
    },
    copy,
    isStorageSuspended,
    isHydrated,
    localePreference: state.localePreference,
    openAiApiKey: state.openAiApiKey,
    palette,
    parseApiBaseUrl: state.parseApiBaseUrl,
    session: state.session,
    sessionDisplayName: getSessionDisplayName(state.session),
    setStorageSuspended,
    setLocalePreference,
    setOpenAiApiKey,
    setParseApiBaseUrl,
    setThemePreference,
    signOut: async () => {
      await setSession(null);
    },
    signInWithApple: async (input) => {
      await setSession(createAppleSession(input));
    },
    storageRevision,
    themePreference: state.themePreference,
  };

  return <AppShellContext.Provider value={contextValue}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used inside AppShellProvider.");
  }

  return context;
}
