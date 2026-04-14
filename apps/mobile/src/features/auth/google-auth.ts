import * as AuthSession from "expo-auth-session";

import {
  loadPersistedGeminiAuthMode,
  loadPersistedGoogleAccessToken,
  loadPersistedGoogleRefreshToken,
  loadPersistedGoogleTokenExpiresAt,
  persistGoogleTokens,
} from "../app-shell/storage";

/** Scopes used during the Google OAuth login consent screen. */
export const GOOGLE_SCOPES = [
  "openid",
  "profile",
  "email",
];

export const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export interface GoogleAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    email: string | null;
    displayName: string | null;
    googleUserId: string;
  };
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string,
  clientId: string,
): Promise<GoogleAuthResult> {
  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      code,
      clientId,
      redirectUri,
      extraParams: { code_verifier: codeVerifier },
    },
    GOOGLE_DISCOVERY,
  );

  const accessToken = tokenResponse.accessToken;
  const refreshToken = tokenResponse.refreshToken ?? "";
  const expiresIn = tokenResponse.expiresIn ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const user = await fetchGoogleUserInfo(accessToken);

  return { accessToken, refreshToken, expiresAt, user };
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleAuthResult["user"]> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { email: null, displayName: null, googleUserId: "" };
  }

  const data = (await response.json()) as {
    id?: string;
    email?: string;
    name?: string;
  };

  return {
    email: data.email ?? null,
    displayName: data.name ?? null,
    googleUserId: data.id ?? "",
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

export function isGoogleTokenExpired(expiresAt: string): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + 60_000;
}

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const authMode = await loadPersistedGeminiAuthMode();
  if (authMode !== "google_oauth") return null;

  const accessToken = await loadPersistedGoogleAccessToken();
  const expiresAt = await loadPersistedGoogleTokenExpiresAt();

  if (!accessToken) return null;

  if (!isGoogleTokenExpired(expiresAt)) {
    return accessToken;
  }

  const refreshToken = await loadPersistedGoogleRefreshToken();
  if (!refreshToken) return null;

  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    await persistGoogleTokens({
      accessToken: refreshed.accessToken,
      refreshToken,
      expiresAt: refreshed.expiresAt,
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}
