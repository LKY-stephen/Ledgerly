import type { JsonValue, ReceiptPlannerPayload } from "@creator-cfo/schemas";

import { loadPersistedAiProvider, loadPersistedGeminiApiKey, loadPersistedOpenAiApiKey } from "../app-shell/storage";
import type { AiProvider } from "../app-shell/types";

export interface ParseResult {
  rawJson: unknown;
  rawText: string;
  model: string;
  parserKind: string;
  error: string | null;
}

export class ParseEvidenceClientError extends Error {
  constructor(
    message: string,
    public readonly code: "gemini_error" | "invalid_planner_response" | "missing_config" | "network" | "openai_error",
  ) {
    super(message);
    this.name = "ParseEvidenceClientError";
  }
}

export async function planEvidenceDbUpdates(input: {
  evidenceId: string;
  fileName: string;
  mimeType: string | null;
  profileInfo?: { name: string; email: string; phone: string };
  rawJson: unknown;
}): Promise<ReceiptPlannerPayload> {
  const { normalizeReceiptPlannerPayload } = require("@creator-cfo/schemas") as typeof import("@creator-cfo/schemas");
  const { receiptDbUpdatePlannerSkill } = require("./prompt-skills") as typeof import("./prompt-skills");

  const aiProvider = await loadPersistedAiProvider();

  const exampleOutput = JSON.stringify({
    businessEvents: ["Receipt payment for subscription service"],
    classifiedFacts: [
      { field: "amountCents", value: 9900, confidence: "high", status: "confirmed", reason: "Explicit amount on receipt" },
      { field: "date", value: "2026-04-01", confidence: "high", status: "confirmed", reason: "Date on receipt" },
      { field: "description", value: "Service subscription", confidence: "high", status: "confirmed", reason: "Item description" },
      { field: "source", value: "Business Card", confidence: "medium", status: "uncertain", reason: "Payment method inferred" },
      { field: "target", value: "Vendor Inc", confidence: "high", status: "confirmed", reason: "Vendor name on receipt" },
    ],
    readTasks: [
      { readTaskId: "read-1", taskType: "counterparty_lookup", rationale: "Look up source counterparty", status: "pending" },
      { readTaskId: "read-2", taskType: "duplicate_lookup", rationale: "Check for duplicate records", status: "pending" },
    ],
    counterpartyResolutions: [
      { role: "source", displayName: "Business Card", confidence: "medium", status: "proposed_new", matchedCounterpartyIds: [] },
      { role: "target", displayName: "Vendor Inc", confidence: "high", status: "proposed_new", matchedCounterpartyIds: [] },
    ],
    candidateRecords: [
      {
        evidenceId: "EVIDENCE_ID",
        amountCents: 9900,
        currency: "USD",
        date: "2026-04-01",
        description: "Service subscription",
        recordKind: "expense",
        sourceLabel: "Business Card",
        targetLabel: "Vendor Inc",
      },
    ],
    writeProposals: [
      { proposalType: "create_counterparty", role: "source", values: { displayName: "Business Card", role: "source" } },
      { proposalType: "create_counterparty", role: "target", values: { displayName: "Vendor Inc", role: "target" } },
      { proposalType: "persist_candidate_record", values: { candidateIndex: 0 }, reviewFields: ["amount", "date", "source", "target"] },
    ],
    duplicateHints: [],
    summary: "One expense record from receipt.",
    warnings: [],
  });

  const systemPrompt = [
    receiptDbUpdatePlannerSkill,
    "",
    "You receive evidence metadata and the raw parsed JSON from a receipt or document.",
    "You MUST return a JSON object with EXACTLY these top-level keys:",
    "  businessEvents: string[]",
    "  classifiedFacts: Array<{field: string, value: any, confidence: 'high'|'medium'|'low', status: 'confirmed'|'conflicting'|'missing'|'uncertain', reason: string}>",
    "  readTasks: Array<{readTaskId: string, taskType: 'counterparty_lookup'|'duplicate_lookup', rationale: string, status: 'pending'}>",
    "  counterpartyResolutions: Array<{role: 'source'|'target', displayName: string, confidence: 'high'|'medium'|'low', status: 'matched'|'proposed_new'|'ambiguous', matchedCounterpartyIds: string[]}>",
    "  candidateRecords: Array<{evidenceId: string, amountCents: number, currency: string, date: string, description: string, recordKind: 'expense'|'income'|'personal_spending', sourceLabel: string, targetLabel: string}>",
    "  writeProposals: Array<{proposalType: 'create_counterparty'|'persist_candidate_record', role?: 'source'|'target', values: object, reviewFields?: string[]}>",
    "  duplicateHints: string[]",
    "  summary: string",
    "  warnings: string[]",
    "",
    "IMPORTANT: readTasks MUST include at least one counterparty_lookup and one duplicate_lookup task.",
    "IMPORTANT: candidateRecords MUST have at least one record. Use the evidenceId from the input.",
    "IMPORTANT: writeProposals MUST include at least one persist_candidate_record proposal.",
    "IMPORTANT: amountCents must be in cents (e.g. $99.00 = 9900). Convert dollar amounts by multiplying by 100.",
    "",
    "Example output:",
    exampleOutput,
    "",
    "When sourceProfileInfo is provided in the user prompt, use it to determine which party in the transaction is the current user/entity.",
    "The profile owner is typically the payer (source) for expenses, or the payee (target) for income.",
    "Map sourceLabel / targetLabel accordingly based on the transaction direction and profile identity.",
    "If sourceProfileInfo is null, proceed without assuming source identity — flag in warnings if ambiguous.",
    "",
    "Return JSON only. No markdown, no code blocks, no explanations.",
  ].join("\n");

  const hasProfileInfo = input.profileInfo &&
    (input.profileInfo.name || input.profileInfo.email || input.profileInfo.phone);

  const userPrompt = JSON.stringify({
    evidenceId: input.evidenceId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    parsedData: input.rawJson,
    sourceProfileInfo: hasProfileInfo ? input.profileInfo : null,
  });

  const outputText = await callAiText(aiProvider, systemPrompt, userPrompt);

  const parsed = tryParseStructuredOutput(outputText);

  if (!parsed) {
    throw new ParseEvidenceClientError(
      "Planner response is not valid JSON",
      "invalid_planner_response",
    );
  }

  const normalized = normalizeReceiptPlannerPayload(parsed as JsonValue);

  if (!normalized) {
    // Fallback: build a minimal valid payload from whatever we got + the original rawJson
    return buildFallbackPlannerPayload(parsed as Record<string, unknown>, input);
  }

  return normalized;
}

function buildFallbackPlannerPayload(
  partial: Record<string, unknown>,
  input: { evidenceId: string; rawJson: unknown },
): ReceiptPlannerPayload {
  const raw = (input.rawJson && typeof input.rawJson === "object" ? input.rawJson : {}) as Record<string, unknown>;

  // Try to extract amounts — look for common keys
  const rawAmount = partial.amountCents ?? partial.amount_cents ?? raw.amount_paid ?? raw.total ?? raw.amountCents;
  let amountCents: number | null = null;
  if (typeof rawAmount === "number") {
    amountCents = rawAmount > 500 ? rawAmount : Math.round(rawAmount * 100);
  } else if (typeof rawAmount === "string") {
    const cleaned = rawAmount.replace(/[^0-9.]/g, "");
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) {
      amountCents = Math.round(parsed * 100);
    }
  }

  const getString = (keys: string[]): string | null => {
    for (const key of keys) {
      const v = partial[key] ?? raw[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  const description = getString(["description", "item_description", "service", "items"]) ?? "Unknown";
  const date = getString(["date", "invoice_date", "payment_date", "occurred_on"]);
  const source = getString(["source", "sourceLabel", "payer", "from", "payment_method"]);
  const target = getString(["target", "targetLabel", "vendor", "merchant", "company", "to", "billed_to"]);
  const summary = typeof partial.summary === "string" ? partial.summary : `Fallback planner for ${description}`;

  return {
    businessEvents: Array.isArray(partial.businessEvents)
      ? (partial.businessEvents as string[]).filter((e) => typeof e === "string")
      : [summary],
    candidateRecords: [
      {
        amountCents,
        currency: "USD",
        date,
        description,
        evidenceId: input.evidenceId,
        recordKind: "expense",
        sourceLabel: source,
        targetLabel: target,
      },
    ],
    classifiedFacts: [
      { field: "amountCents", value: amountCents as never, confidence: amountCents ? "high" : "low", status: amountCents ? "confirmed" : "missing", reason: "Extracted from document" },
      { field: "date", value: (date ?? null) as never, confidence: date ? "high" : "low", status: date ? "confirmed" : "missing", reason: "Extracted from document" },
      { field: "description", value: description as never, confidence: "high", status: "confirmed", reason: "Extracted from document" },
      { field: "source", value: (source ?? null) as never, confidence: source ? "medium" : "low", status: source ? "uncertain" : "missing", reason: "Extracted from document" },
      { field: "target", value: (target ?? null) as never, confidence: target ? "high" : "low", status: target ? "confirmed" : "missing", reason: "Extracted from document" },
    ],
    counterpartyResolutions: [
      { confidence: "medium", displayName: source ?? "", matchedCounterpartyIds: [], role: "source", status: "proposed_new" },
      { confidence: "medium", displayName: target ?? "", matchedCounterpartyIds: [], role: "target", status: "proposed_new" },
    ],
    duplicateHints: [],
    readTasks: [
      { readTaskId: "read-fallback-1", rationale: "Look up source counterparty", status: "pending", taskType: "counterparty_lookup" },
      { readTaskId: "read-fallback-2", rationale: "Check for duplicate records", status: "pending", taskType: "duplicate_lookup" },
    ],
    summary,
    warnings: ["Planner response did not match expected schema. Fallback values were used — please review all fields."],
    writeProposals: [
      { proposalType: "create_counterparty", role: "source", values: { displayName: source ?? "", role: "source" } },
      { proposalType: "create_counterparty", role: "target", values: { displayName: target ?? "", role: "target" } },
      { proposalType: "persist_candidate_record", reviewFields: ["amount", "date", "source", "target"], values: { candidateIndex: 0 } },
    ],
  };
}

interface GeminiSettings {
  baseUrl: string;
  geminiApiKey: string;
  model: string;
}

interface GeminiPart {
  inlineData?: { data: string; mimeType: string };
  text?: string;
}

interface OpenAiSettings {
  baseUrl: string;
  model: string;
  openAiApiKey: string;
}

interface OpenAiFilePart {
  detail?: "high";
  file_data?: string;
  filename?: string;
  image_url?: string;
  type: "input_file" | "input_image";
}

const openAiRequestTimeoutMs = 60_000;
const defaultOpenAiBaseUrl = "https://api.openai.com/v1";
const defaultOpenAiModel = "gpt-4o";
const defaultGeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const defaultGeminiModel = "gemini-2.5-flash";

export async function parseFileWithOpenAi(input: {
  fileName: string;
  fileUri: string;
  mimeType: string | null;
}): Promise<ParseResult> {
  try {
    const aiProvider = await loadPersistedAiProvider();
    const mimeType = input.mimeType ?? inferMimeType(input.fileName);
    const base64 = await readNativeFileAsBase64(input.fileUri);

    if (aiProvider === "gemini") {
      return await callGeminiParseApi(base64, input.fileName, mimeType);
    }

    const settings = await loadRequiredOpenAiSettings();
    const filePart = createInputFilePart({ base64, fileName: input.fileName, mimeType });
    return await callOpenAiParseApi(settings, filePart, input.fileName, mimeType);
  } catch (error) {
    const aiProvider = await loadPersistedAiProvider().catch(() => "openai" as AiProvider);
    return {
      rawJson: null,
      rawText: "",
      model: "",
      parserKind: aiProvider === "gemini" ? "gemini" : "openai_gpt",
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

export async function parseFileWithOpenAiFromBlob(input: {
  fileName: string;
  blob: Blob;
  mimeType: string | null;
}): Promise<ParseResult> {
  try {
    const aiProvider = await loadPersistedAiProvider();
    const mimeType = input.mimeType ?? input.blob.type ?? inferMimeType(input.fileName);
    const base64 = await blobToBase64(input.blob);

    if (aiProvider === "gemini") {
      return await callGeminiParseApi(base64, input.fileName, mimeType);
    }

    const settings = await loadRequiredOpenAiSettings();
    const filePart = createInputFilePart({ base64, fileName: input.fileName, mimeType });
    return await callOpenAiParseApi(settings, filePart, input.fileName, mimeType);
  } catch (error) {
    const aiProvider = await loadPersistedAiProvider().catch(() => "openai" as AiProvider);
    return {
      rawJson: null,
      rawText: "",
      model: "",
      parserKind: aiProvider === "gemini" ? "gemini" : "openai_gpt",
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

async function callOpenAiParseApi(
  settings: OpenAiSettings,
  filePart: OpenAiFilePart,
  fileName: string,
  mimeType: string,
): Promise<ParseResult> {
  const input = [
    {
      content: [
        {
          text: [
            "You are a document parser. Extract ALL structured data from the uploaded file.",
            "Return a single JSON object containing every piece of data you can find.",
            "Do not return markdown, explanations, or code blocks — only raw JSON.",
          ].join("\n"),
          type: "input_text",
        },
      ],
      role: "system",
    },
    {
      content: [
        { text: `filename: ${fileName}\nmimeType: ${mimeType}`, type: "input_text" },
        filePart,
      ],
      role: "user",
    },
  ];

  const payload = await callOpenAi(settings, input);
  const outputText = extractOpenAiOutputText(payload);

  if (!outputText) {
    return {
      rawJson: null,
      rawText: "",
      model: settings.model,
      parserKind: "openai_gpt",
      error: `OpenAI returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
    };
  }

  const parsed = tryParseStructuredOutput(outputText);

  return {
    rawJson: parsed,
    rawText: outputText,
    model: settings.model,
    parserKind: "openai_gpt",
    error: parsed === null ? "OpenAI response is not valid JSON" : null,
  };
}

async function callGeminiParseApi(
  base64: string,
  fileName: string,
  mimeType: string,
): Promise<ParseResult> {
  const settings = await loadRequiredGeminiSettings();
  const systemText = [
    "You are a document parser. Extract ALL structured data from the uploaded file.",
    "Return a single JSON object containing every piece of data you can find.",
    "Do not return markdown, explanations, or code blocks — only raw JSON.",
  ].join("\n");

  const userText = `filename: ${fileName}\nmimeType: ${mimeType}`;

  const payload = await callGemini(settings, systemText, [
    { text: userText },
    { inlineData: { data: base64, mimeType } },
  ]);

  const outputText = extractGeminiOutputText(payload);

  if (!outputText) {
    return {
      rawJson: null,
      rawText: "",
      model: settings.model,
      parserKind: "gemini",
      error: `Gemini returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
    };
  }

  const parsed = tryParseStructuredOutput(outputText);

  return {
    rawJson: parsed,
    rawText: outputText,
    model: settings.model,
    parserKind: "gemini",
    error: parsed === null ? "Gemini response is not valid JSON" : null,
  };
}

async function loadRequiredOpenAiSettings(): Promise<OpenAiSettings> {
  const persistedApiKey = await loadPersistedOpenAiApiKey().catch(() => "");
  const openAiApiKey = persistedApiKey || (process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "").trim();

  if (!openAiApiKey) {
    throw new ParseEvidenceClientError(
      "Missing OpenAI API key. Add it from Settings or EXPO_PUBLIC_OPENAI_API_KEY.",
      "missing_config",
    );
  }

  return {
    baseUrl: normalizeBaseUrl(await resolveOpenAiBaseUrl()),
    model: await resolveOpenAiModel(),
    openAiApiKey,
  };
}

async function resolveOpenAiBaseUrl(): Promise<string> {
  const envBaseUrl = (process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? "").trim();
  if (envBaseUrl) return envBaseUrl;

  try {
    const runtimeExtra = await readExpoExtra();
    const runtimeBaseUrl = runtimeExtra?.openAiBaseUrl ?? "";
    return typeof runtimeBaseUrl === "string" && runtimeBaseUrl.trim()
      ? runtimeBaseUrl.trim()
      : defaultOpenAiBaseUrl;
  } catch {
    return defaultOpenAiBaseUrl;
  }
}

async function resolveOpenAiModel(): Promise<string> {
  const envModel = (process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "").trim();
  if (envModel) return envModel;

  try {
    const runtimeExtra = await readExpoExtra();
    const runtimeModel = runtimeExtra?.openAiModel ?? "";
    return typeof runtimeModel === "string" && runtimeModel.trim()
      ? runtimeModel.trim()
      : defaultOpenAiModel;
  } catch {
    return defaultOpenAiModel;
  }
}

async function callAiText(
  aiProvider: AiProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (aiProvider === "gemini") {
    const settings = await loadRequiredGeminiSettings();
    const payload = await callGemini(settings, systemPrompt, [{ text: userPrompt }]);
    const text = extractGeminiOutputText(payload);
    if (!text) {
      throw new ParseEvidenceClientError(
        `Gemini planner returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
        "gemini_error",
      );
    }
    return text;
  }

  const settings = await loadRequiredOpenAiSettings();
  const apiInput = [
    { content: [{ text: systemPrompt, type: "input_text" }], role: "system" },
    { content: [{ text: userPrompt, type: "input_text" }], role: "user" },
  ];
  const payload = await callOpenAi(settings, apiInput);
  const text = extractOpenAiOutputText(payload);
  if (!text) {
    throw new ParseEvidenceClientError(
      `Planner returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
      "openai_error",
    );
  }
  return text;
}

async function loadRequiredGeminiSettings(): Promise<GeminiSettings> {
  const persistedApiKey = await loadPersistedGeminiApiKey().catch(() => "");
  const geminiApiKey = persistedApiKey || (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "").trim();

  if (!geminiApiKey) {
    throw new ParseEvidenceClientError(
      "Missing Gemini API key. Add it from Settings or EXPO_PUBLIC_GEMINI_API_KEY.",
      "missing_config",
    );
  }

  const baseUrl = normalizeBaseUrl(
    (process.env.EXPO_PUBLIC_GEMINI_BASE_URL ?? "").trim() || defaultGeminiBaseUrl,
  );
  const model = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "").trim() || defaultGeminiModel;

  return { baseUrl, geminiApiKey, model };
}

async function callGemini(
  settings: GeminiSettings,
  systemText: string,
  userParts: GeminiPart[],
): Promise<Record<string, unknown>> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), openAiRequestTimeoutMs);

  try {
    const url = `${settings.baseUrl}/models/${settings.model}:generateContent?key=${settings.geminiApiKey}`;
    const response = await fetch(url, {
      body: JSON.stringify({
        contents: [{ parts: userParts, role: "user" }],
        generationConfig: { maxOutputTokens: 4000 },
        systemInstruction: { parts: [{ text: systemText }] },
      }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller?.signal,
    });

    const payload = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errDetail = payload?.error as { message?: string } | undefined;
      throw new ParseEvidenceClientError(
        errDetail?.message ?? `Gemini request failed: ${response.status}`,
        "gemini_error",
      );
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractGeminiOutputText(payload: Record<string, unknown>): string {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const parts: string[] = [];

  for (const candidate of candidates) {
    const content = candidate?.content as { parts?: Array<{ text?: string }> } | undefined;
    if (!content?.parts) continue;
    for (const part of content.parts) {
      if (typeof part.text === "string") {
        parts.push(part.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function callOpenAi(settings: OpenAiSettings, input: unknown): Promise<Record<string, unknown>> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), openAiRequestTimeoutMs);

  try {
    const response = await fetch(`${settings.baseUrl}/responses`, {
      body: JSON.stringify({
        input,
        max_output_tokens: 4_000,
        model: settings.model,
        ...(isReasoningModel(settings.model) ? { reasoning: { effort: "minimal" } } : {}),
        store: false,
      }),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${settings.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller?.signal,
    });

    const payload = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errMsg = (payload?.error as { message?: string })?.message;
      throw new Error(errMsg ?? `OpenAI request failed: ${response.status}`);
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

function createInputFilePart(input: {
  base64: string;
  fileName: string;
  mimeType: string;
}): OpenAiFilePart {
  if (input.mimeType === "application/pdf") {
    return {
      file_data: `data:${input.mimeType};base64,${input.base64}`,
      filename: input.fileName,
      type: "input_file",
    };
  }

  return {
    detail: "high",
    image_url: `data:${input.mimeType};base64,${input.base64}`,
    type: "input_image",
  };
}

function extractOpenAiOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const textParts: string[] = [];

  for (const item of output) {
    const content =
      item && typeof item === "object" && "content" in item && Array.isArray(item.content)
        ? item.content
        : [];

    for (const part of content) {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        textParts.push(part.text);
      } else if (part && typeof part === "object" && "json" in part && part.json !== undefined) {
        textParts.push(JSON.stringify(part.json));
      }
    }
  }

  return textParts.join("\n").trim();
}

function tryParseStructuredOutput(outputText: string): unknown | null {
  const trimmed = outputText.trim();
  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const jsonText = fencedMatch?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

async function readNativeFileAsBase64(uri: string): Promise<string> {
  // Use require() instead of dynamic import() to avoid Metro code-splitting
  // which fails on native with "global location variable is not defined".
  const fileSystemModule = require("expo-file-system/legacy") as {
    EncodingType: { Base64: string };
    readAsStringAsync: (uri: string, options: { encoding: string }) => Promise<string>;
  };
  return fileSystemModule.readAsStringAsync(uri, {
    encoding: fileSystemModule.EncodingType.Base64,
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  const bufferCtor = (globalThis as {
    Buffer?: { from(input: Uint8Array): { toString(encoding: "base64"): string } };
  }).Buffer;

  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function readExpoExtra(): Promise<{ openAiBaseUrl?: unknown; openAiModel?: unknown } | null> {
  // Use require() instead of dynamic import() to avoid Metro code-splitting
  // which fails on native with "global location variable is not defined".
  const constantsModule = require("expo-constants") as { default: Record<string, unknown> };
  const constants = constantsModule.default;
  const expoConfigExtra = constants?.expoConfig?.extra;

  if (expoConfigExtra && typeof expoConfigExtra === "object") {
    return expoConfigExtra as { openAiBaseUrl?: unknown; openAiModel?: unknown };
  }

  const manifest2Extra = (constants as {
    manifest2?: { extra?: { expoClient?: { extra?: { openAiBaseUrl?: unknown; openAiModel?: unknown } } } };
  }).manifest2?.extra?.expoClient?.extra;

  if (manifest2Extra && typeof manifest2Extra === "object") {
    return manifest2Extra;
  }

  const manifestExtra = (constants as {
    manifest?: { extra?: { openAiBaseUrl?: unknown; openAiModel?: unknown } };
  }).manifest?.extra;

  if (manifestExtra && typeof manifestExtra === "object") {
    return manifestExtra;
  }

  return null;
}

function inferMimeType(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".heic") || normalized.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/g, "");
}

function isReasoningModel(model: string): boolean {
  const name = model.toLowerCase();
  return name.startsWith("o1") || name.startsWith("o3") || name.startsWith("o4");
}
