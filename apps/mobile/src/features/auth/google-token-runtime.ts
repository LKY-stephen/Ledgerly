import {
  loadPersistedGeminiAuthMode,
  loadPersistedGoogleAccessToken,
  loadPersistedGoogleRefreshToken,
  loadPersistedGoogleTokenExpiresAt,
  persistGoogleTokens,
} from "../app-shell/storage";

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
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
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() <= Date.now() + 60_000;
}

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const authMode = await loadPersistedGeminiAuthMode();

  if (authMode !== "google_oauth") {
    return null;
  }

  const accessToken = await loadPersistedGoogleAccessToken();
  const expiresAt = await loadPersistedGoogleTokenExpiresAt();

  if (!accessToken) {
    return null;
  }

  if (!isGoogleTokenExpired(expiresAt)) {
    return accessToken;
  }

  const refreshToken = await loadPersistedGoogleRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    await persistGoogleTokens({
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
      refreshToken,
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}
