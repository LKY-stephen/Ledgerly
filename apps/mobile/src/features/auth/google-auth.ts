import * as AuthSession from "expo-auth-session";

export {
  getValidGoogleAccessToken,
  isGoogleTokenExpired,
  refreshGoogleAccessToken,
} from "./google-token-runtime";

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
