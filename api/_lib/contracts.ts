import type { ParseEvidenceScheme, ParseOriginDataApiSuccess, ParseSourcePlatform } from "./types";

export const parseModel = process.env.OPENAI_PARSE_MODEL ?? "gpt-4o";
export const directUploadLimitBytes = 4 * 1024 * 1024;
export const remoteFileLimitBytes = 20 * 1024 * 1024;

const supportedParseMimeTypes = [
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export interface ParseRouteInput {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  sourcePlatform: ParseSourcePlatform;
}

export interface MapEvidenceSchemeRouteInput {
  originData: ParseOriginDataApiSuccess;
  scheme: ParseEvidenceScheme;
  source: {
    email: string;
    name: string;
    phone: string;
  };
}

export class RouteError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function createErrorResponse(error: RouteError): Response {
  return jsonResponse(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    error.status,
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    status,
  });
}

export function parseAuthorizationBearerToken(headerValue: string | null): string {
  const match = /^Bearer\s+(.+)$/i.exec(headerValue ?? "");
  const token = match?.[1]?.trim() ?? "";

  if (!token) {
    throw new RouteError(401, "missing_authorization", "Authorization: Bearer <OpenAI API key> is required.");
  }

  return token;
}

export function parseSourcePlatform(value: unknown): ParseSourcePlatform {
  if (value === "ios" || value === "android" || value === "web") {
    return value;
  }

  throw new RouteError(400, "invalid_source_platform", "sourcePlatform must be ios, android, or web.");
}

export function normalizeMimeType(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    throw new RouteError(400, "missing_mime_type", "mimeType is required.");
  }

  if (!supportedParseMimeTypes.includes(normalized as (typeof supportedParseMimeTypes)[number])) {
    throw new RouteError(
      415,
      "unsupported_mime_type",
      "Supported file types are PDF, JPG, JPEG, PNG, and HEIC.",
    );
  }

  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

export function normalizeFilename(value: unknown): string {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new RouteError(400, "missing_filename", "filename is required.");
  }

  return normalized;
}

export function parseOptionalScheme(value: unknown): ParseEvidenceScheme {
  if (value === undefined || value === null || value === "") {
    return {};
  }

  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new RouteError(400, "invalid_scheme", "scheme must be valid JSON.");
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RouteError(400, "invalid_scheme", "scheme must be a JSON object.");
  }

  return parsed as ParseEvidenceScheme;
}

export function parseRequiredJsonBody<T>(value: unknown, fieldName: string): T {
  if (value === undefined) {
    throw new RouteError(400, `missing_${fieldName}`, `${fieldName} is required.`);
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new RouteError(400, `invalid_${fieldName}`, `${fieldName} must be valid JSON.`);
    }
  }

  return value as T;
}

export function assertDirectUploadSize(sizeBytes: number): void {
  if (sizeBytes > directUploadLimitBytes) {
    throw new RouteError(
      413,
      "multipart_too_large",
      `Direct multipart upload is limited to ${Math.floor(directUploadLimitBytes / (1024 * 1024))} MB. Use fileUrl for larger files.`,
    );
  }
}

export function assertRemoteFileSize(sizeBytes: number): void {
  if (sizeBytes > remoteFileLimitBytes) {
    throw new RouteError(
      413,
      "remote_file_too_large",
      `Remote file parsing is limited to ${Math.floor(remoteFileLimitBytes / (1024 * 1024))} MB.`,
    );
  }
}
