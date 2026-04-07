import type { JsonValue, ParseOriginDataApiSuccess } from "./types";
import { normalizeReceiptParsePayload } from "../../packages/schemas/src/index";
import {
  assertDirectUploadSize,
  assertRemoteFileSize,
  normalizeFilename,
  normalizeMimeType,
  parseOptionalScheme,
  parseRequiredJsonBody,
  parseSourcePlatform,
  RouteError,
  type MapEvidenceSchemeRouteInput,
  type ParseRouteInput,
} from "./contracts";

export async function parseFileInputRequest(request: Request): Promise<ParseRouteInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartFileRequest(request);
  }

  if (contentType.includes("application/json")) {
    return parseJsonFileRequest(request);
  }

  throw new RouteError(
    415,
    "unsupported_content_type",
    "Use multipart/form-data with a file field or JSON with fileUrl.",
  );
}

export async function parseSchemeMappingRequest(request: Request): Promise<MapEvidenceSchemeRouteInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new RouteError(415, "unsupported_content_type", "Use application/json with scheme and originData.");
  }

  const body = (await request.json()) as {
    originData?: unknown;
    scheme?: unknown;
    source?: unknown;
  };

  return {
    originData: parseReceiptParsePayload(body.originData),
    scheme: parseOptionalScheme(body.scheme),
    source: parseMappingSource(body.source),
  };
}

async function parseMultipartFileRequest(request: Request): Promise<ParseRouteInput> {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new RouteError(400, "missing_file", "multipart/form-data requires a file field.");
  }

  assertDirectUploadSize(file.size);

  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    filename: normalizeFilename(formData.get("filename") ?? file.name),
    mimeType: normalizeMimeType(formData.get("mimeType") ?? file.type),
    sourcePlatform: parseSourcePlatform(formData.get("sourcePlatform")),
  };
}

async function parseJsonFileRequest(request: Request): Promise<ParseRouteInput> {
  const body = (await request.json()) as {
    fileUrl?: unknown;
    filename?: unknown;
    mimeType?: unknown;
    sourcePlatform?: unknown;
  };
  const fileUrl = String(body.fileUrl ?? "").trim();

  if (!fileUrl) {
    throw new RouteError(400, "missing_file_url", "fileUrl is required for JSON parse requests.");
  }

  const url = new URL(fileUrl);

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new RouteError(400, "invalid_file_url", "fileUrl must start with https:// or http://.");
  }

  if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new RouteError(400, "invalid_file_url", "Production fileUrl values must use https://.");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new RouteError(400, "file_url_fetch_failed", `Unable to fetch fileUrl: ${response.status}.`);
  }

  const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);

  if (Number.isFinite(contentLength)) {
    assertRemoteFileSize(contentLength);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  assertRemoteFileSize(bytes.byteLength);

  return {
    bytes,
    filename: normalizeFilename(body.filename),
    mimeType: normalizeMimeType(body.mimeType ?? response.headers.get("content-type")),
    sourcePlatform: parseSourcePlatform(body.sourcePlatform),
  };
}

function parseMappingSource(value: unknown): {
  email: string;
  name: string;
  phone: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      email: "",
      name: "",
      phone: "",
    };
  }

  const source = value as {
    email?: unknown;
    name?: unknown;
    phone?: unknown;
  };

  return {
    email: String(source.email ?? "").trim(),
    name: String(source.name ?? "").trim(),
    phone: String(source.phone ?? "").trim(),
  };
}

function parseReceiptParsePayload(value: unknown): ParseOriginDataApiSuccess {
  const parsed = parseRequiredJsonBody<unknown>(value, "originData");
  const payload = normalizeReceiptParsePayload(parsed as JsonValue);

  if (!payload) {
    throw new RouteError(
      400,
      "invalid_originData",
      "originData must match the validated parser DTO.",
    );
  }

  return payload;
}
