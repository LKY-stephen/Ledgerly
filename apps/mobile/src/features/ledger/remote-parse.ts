import {
  getReceiptParseRecords,
  normalizeReceiptParsePayload,
  normalizeReceiptPlannerPayload,
  type JsonValue,
  type ReceiptParsePayload,
  type ReceiptPlannerPayload,
} from "@ledgerly/schemas";

import { loadPersistedAiProvider, loadPersistedGeminiApiKey, loadPersistedGeminiAuthMode, loadPersistedInferApiKey, loadPersistedInferBaseUrl, loadPersistedInferModel, loadPersistedOpenAiApiKey } from "../app-shell/storage";
import type { AiProvider, GeminiAuthMode } from "../app-shell/types";
import { getValidGoogleAccessToken } from "../auth/google-token-runtime";
import { receiptDbUpdatePlannerSkill, receiptParseSkill } from "./prompt-skills";

async function resolveAvailableProvider(): Promise<AiProvider> {
  const openAiKey = await loadPersistedOpenAiApiKey();
  if (openAiKey) return "openai";

  const inferKey = await loadPersistedInferApiKey();
  const inferUrl = await loadPersistedInferBaseUrl();
  if (inferKey && inferUrl) return "infer";

  const geminiKey = await loadPersistedGeminiApiKey();
  if (geminiKey) return "gemini";

  const authMode = await loadPersistedGeminiAuthMode();
  if (authMode === "google_oauth") return "gemini";

  throw new ParseEvidenceClientError(
    "No AI provider configured. Please set an API key in .env or Settings.",
    "missing_config",
  );
}

export interface ParseResult {
  rawJson: ReceiptParsePayload | null;
  rawText: string;
  model: string;
  parserKind: string;
  error: string | null;
}

export class ParseEvidenceClientError extends Error {
  constructor(
    message: string,
    public readonly code: "gemini_error" | "infer_error" | "invalid_planner_response" | "missing_config" | "network" | "openai_error",
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
  const aiProvider = await resolveAvailableProvider();

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
      { candidateIndex: 0, role: "source", displayName: "Business Card", confidence: "medium", status: "proposed_new", matchedCounterpartyIds: [] },
      { candidateIndex: 0, role: "target", displayName: "Vendor Inc", confidence: "high", status: "proposed_new", matchedCounterpartyIds: [] },
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
      { proposalType: "create_counterparty", role: "source", values: { candidateIndex: 0, displayName: "Business Card", role: "source" } },
      { proposalType: "create_counterparty", role: "target", values: { candidateIndex: 0, displayName: "Vendor Inc", role: "target" } },
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
    "If parsedData.records contains multiple detected receipts or transactions, preserve that ordering when building candidateRecords and candidate-scoped write proposals.",
    "You MUST return a JSON object with EXACTLY these top-level keys:",
    "  businessEvents: string[]",
    "  classifiedFacts: Array<{field: string, value: any, confidence: 'high'|'medium'|'low', status: 'confirmed'|'conflicting'|'missing'|'uncertain', reason: string}>",
    "  readTasks: Array<{readTaskId: string, taskType: 'counterparty_lookup'|'duplicate_lookup', rationale: string, status: 'pending'}>",
    "  counterpartyResolutions: Array<{candidateIndex?: number, role: 'source'|'target', displayName: string, confidence: 'high'|'medium'|'low', status: 'matched'|'proposed_new'|'ambiguous', matchedCounterpartyIds: string[]}>",
    "  candidateRecords: Array<{evidenceId: string, amountCents: number, currency: string, date: string, description: string, recordKind: 'expense'|'income'|'personal_spending', sourceLabel: string, targetLabel: string}>",
    "  writeProposals: Array<{proposalType: 'create_counterparty'|'persist_candidate_record', role?: 'source'|'target', values: object, reviewFields?: string[]}>",
    "  duplicateHints: string[]",
    "  summary: string",
    "  warnings: string[]",
    "",
    "IMPORTANT: readTasks MUST include at least one counterparty_lookup and one duplicate_lookup task.",
    "IMPORTANT: candidateRecords MUST have at least one record. Use the evidenceId from the input.",
    "IMPORTANT: writeProposals MUST include at least one persist_candidate_record proposal.",
    "IMPORTANT: Every persist_candidate_record proposal MUST include values.candidateIndex that points to the matching candidateRecords entry.",
    "IMPORTANT: If you emit candidate-specific create_counterparty proposals, include values.candidateIndex there too.",
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
  const rawFields =
    raw.fields && typeof raw.fields === "object" && !Array.isArray(raw.fields)
      ? (raw.fields as Record<string, unknown>)
      : {};

  // Try to extract amounts — look for common keys
  const rawAmount =
    partial.amountCents ??
    partial.amount_cents ??
    raw.amount_paid ??
    raw.total ??
    raw.amountCents ??
    rawFields.amountCents;
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
      const sources = [partial, raw, rawFields];

      for (const source of sources) {
        const v = source[key];

        if (typeof v === "string" && v.trim()) {
          return v.trim();
        }
      }
    }
    return null;
  };

  const description = getString(["description", "item_description", "service", "items"]) ?? "Unknown";
  const date = getString(["date", "invoice_date", "payment_date", "occurred_on"]);
  const source = getString(["source", "sourceLabel", "payer", "from", "payment_method"]);
  const target = getString(["target", "targetLabel", "vendor", "merchant", "company", "to", "billed_to"]);
  const summary = typeof partial.summary === "string" ? partial.summary : `Fallback planner for ${description}`;
  const parsePayload = normalizeReceiptParsePayload(raw as JsonValue, {
    defaultParser: "openai_gpt",
  });
  const parseRecords = parsePayload ? getReceiptParseRecords(parsePayload) : [];
  const candidateRecords = (parseRecords.length ? parseRecords : [null]).map((parseRecord, index) => {
    const fields = parseRecord?.fields;
    const candidateAmount =
      fields?.amountCents ??
      (index === 0 ? amountCents : null);
    const candidateDescription =
      fields?.description ??
      description;
    const candidateDate =
      fields?.date ??
      date;
    const candidateSource =
      fields?.source ??
      source;
    const candidateTarget =
      fields?.target ??
      target;

    return {
      amountCents: candidateAmount,
      currency: "USD",
      date: candidateDate,
      description: candidateDescription,
      evidenceId: input.evidenceId,
      recordKind: "expense" as const,
      sourceLabel: candidateSource,
      targetLabel: candidateTarget,
      taxCategoryCode: fields?.taxCategory ?? null,
    };
  });
  const counterpartyResolutions = candidateRecords.flatMap((candidate, index) => ([
    {
      candidateIndex: index,
      confidence: "medium" as const,
      displayName: candidate.sourceLabel ?? "",
      matchedDisplayNames: [],
      matchedCounterpartyIds: [],
      role: "source" as const,
      status: "proposed_new" as const,
    },
    {
      candidateIndex: index,
      confidence: "medium" as const,
      displayName: candidate.targetLabel ?? "",
      matchedDisplayNames: [],
      matchedCounterpartyIds: [],
      role: "target" as const,
      status: "proposed_new" as const,
    },
  ]));

  return {
    businessEvents: Array.isArray(partial.businessEvents)
      ? (partial.businessEvents as string[]).filter((e) => typeof e === "string")
      : [summary],
    candidateRecords,
    classifiedFacts: [
      { field: "amountCents", value: amountCents as never, confidence: amountCents ? "high" : "low", status: amountCents ? "confirmed" : "missing", reason: "Extracted from document" },
      { field: "date", value: (date ?? null) as never, confidence: date ? "high" : "low", status: date ? "confirmed" : "missing", reason: "Extracted from document" },
      { field: "description", value: description as never, confidence: "high", status: "confirmed", reason: "Extracted from document" },
      { field: "source", value: (source ?? null) as never, confidence: source ? "medium" : "low", status: source ? "uncertain" : "missing", reason: "Extracted from document" },
      { field: "target", value: (target ?? null) as never, confidence: target ? "high" : "low", status: target ? "confirmed" : "missing", reason: "Extracted from document" },
    ],
    counterpartyResolutions,
    duplicateHints: [],
    readTasks: [
      { readTaskId: "read-fallback-1", rationale: "Look up source counterparty", status: "pending", taskType: "counterparty_lookup" },
      { readTaskId: "read-fallback-2", rationale: "Check for duplicate records", status: "pending", taskType: "duplicate_lookup" },
    ],
    summary,
    warnings: ["Planner response did not match expected schema. Fallback values were used — please review all fields."],
    writeProposals: candidateRecords.map((_, index) => ({
      proposalType: "persist_candidate_record" as const,
      reviewFields: ["amount", "date", "source", "target"] as const,
      values: { candidateIndex: index },
    })),
  };
}

interface GeminiSettings {
  authMode: GeminiAuthMode;
  baseUrl: string;
  geminiApiKey: string;
  googleAccessToken: string;
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

interface ProviderCallResult {
  model: string;
  payload: Record<string, unknown>;
}

class ProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: AiProvider,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
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
const defaultLocalCorsProxyUrl = "http://127.0.0.1:19007";
const runtimeModelOverrides: Partial<Record<AiProvider, string>> = {};
const parseSystemPrompt = [
  "你是 receipt parser。",
  receiptParseSkill,
  "The top-level object must contain parser, model, rawText, rawSummary, warnings, records, fields, and candidates.",
  "records must be a non-empty array ordered by the file's natural reading order.",
  "Each records[i].fields and records[i].candidates must include amountCents, category, date, description, notes, source, target, and taxCategory.",
  "Top-level fields and candidates must mirror the first record for legacy compatibility.",
  "amountCents must be an integer in cents or null.",
  "date must be YYYY-MM-DD when known or null.",
  "Return JSON only. No markdown, no code blocks, no explanations.",
].join("\n");

const openAiFallbackModelMap: Record<string, string[]> = {
  "gpt-4.1": ["gpt-4o"],
  "gpt-4.1-mini": ["gpt-4o-mini"],
  "gpt-4o": ["gpt-4.1"],
  "gpt-4o-mini": ["gpt-4.1-mini"],
  "gpt-5": ["gpt-5-mini", "gpt-4.1"],
  "gpt-5-mini": ["gpt-4.1-mini", "gpt-4o-mini"],
  "o1": ["o4-mini", "gpt-4.1"],
  "o3": ["o4-mini", "gpt-4.1"],
  "o4-mini": ["gpt-4.1-mini"],
};

const geminiFallbackModelMap: Record<string, string[]> = {
  "gemini-2.5-flash": ["gemini-3-flash-preview", "gemini-2.5-flash-lite"],
  "gemini-2.5-flash-lite": ["gemini-2.5-flash", "gemini-3-flash-preview"],
  "gemini-2.5-pro": ["gemini-3-pro-preview", "gemini-2.5-flash"],
  "gemini-3-flash-preview": ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  "gemini-3-pro-preview": ["gemini-2.5-pro", "gemini-3-flash-preview"],
};

export function resetRemoteParseRuntimeStateForTests() {
  delete runtimeModelOverrides.openai;
  delete runtimeModelOverrides.gemini;
  delete runtimeModelOverrides.infer;
}

export function buildFallbackModelListForTests(provider: AiProvider, model: string): string[] {
  return getFallbackModels(provider, model);
}

export async function parseFileWithOpenAi(input: {
  fileName: string;
  fileUri: string;
  mimeType: string | null;
}): Promise<ParseResult> {
  try {
    const aiProvider = await resolveAvailableProvider();
    const mimeType = input.mimeType ?? inferMimeType(input.fileName);
    const base64 = await readNativeFileAsBase64(input.fileUri);

    if (aiProvider === "gemini") {
      return await callGeminiParseApi(base64, input.fileName, mimeType);
    }

    const settings = aiProvider === "infer"
      ? await loadRequiredInferSettings()
      : await loadRequiredOpenAiSettings();
    const filePart = createInputFilePart({ base64, fileName: input.fileName, mimeType });
    return await callOpenAiParseApi(settings, filePart, input.fileName, mimeType, aiProvider);
  } catch (error) {
    const aiProvider = await loadPersistedAiProvider().catch(() => "openai" as AiProvider);
    return {
      rawJson: null,
      rawText: "",
      model: "",
      parserKind: aiProvider === "gemini" ? "gemini" : aiProvider === "infer" ? "infer" : "openai_gpt",
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
    const aiProvider = await resolveAvailableProvider();
    const mimeType = input.mimeType ?? input.blob.type ?? inferMimeType(input.fileName);
    const base64 = await blobToBase64(input.blob);

    if (aiProvider === "gemini") {
      return await callGeminiParseApi(base64, input.fileName, mimeType);
    }

    const settings = aiProvider === "infer"
      ? await loadRequiredInferSettings()
      : await loadRequiredOpenAiSettings();
    const filePart = createInputFilePart({ base64, fileName: input.fileName, mimeType });
    return await callOpenAiParseApi(settings, filePart, input.fileName, mimeType, aiProvider);
  } catch (error) {
    const aiProvider = await loadPersistedAiProvider().catch(() => "openai" as AiProvider);
    return {
      rawJson: null,
      rawText: "",
      model: "",
      parserKind: aiProvider === "gemini" ? "gemini" : aiProvider === "infer" ? "infer" : "openai_gpt",
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

async function callOpenAiParseApi(
  settings: OpenAiSettings,
  filePart: OpenAiFilePart,
  fileName: string,
  mimeType: string,
  provider: AiProvider = "openai",
): Promise<ParseResult> {
  const input = [
    {
      content: [
        {
          text: parseSystemPrompt,
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

  const { model: activeModel, payload } = await callOpenAi(settings, input, provider);
  const outputText = extractOpenAiOutputText(payload);

  if (!outputText) {
    return {
      rawJson: null,
      rawText: "",
      model: activeModel,
      parserKind: "openai_gpt",
      error: `OpenAI returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
    };
  }

  const parsed = tryParseStructuredOutput(outputText);

  if (parsed === null) {
    return {
      rawJson: null,
      rawText: outputText,
      model: activeModel,
      parserKind: "openai_gpt",
      error: "OpenAI response is not valid JSON",
    };
  }

  const parsePayload = normalizeReceiptParsePayload(parsed as JsonValue, {
    defaultModel: activeModel,
    defaultParser: "openai_gpt",
  });

  if (!parsePayload) {
    return {
      rawJson: null,
      rawText: outputText,
      model: activeModel,
      parserKind: "openai_gpt",
      error: "OpenAI parser output must include parser, model, rawText, rawSummary, warnings, and at least one record with fields and candidates.",
    };
  }

  return {
    rawJson: parsePayload,
    rawText: parsePayload.rawText,
    model: parsePayload.model ?? activeModel,
    parserKind: "openai_gpt",
    error: null,
  };
}

async function callGeminiParseApi(
  base64: string,
  fileName: string,
  mimeType: string,
): Promise<ParseResult> {
  const settings = await loadRequiredGeminiSettings();
  const userText = `filename: ${fileName}\nmimeType: ${mimeType}`;

  const { model: activeModel, payload } = await callGemini(settings, parseSystemPrompt, [
    { text: userText },
    { inlineData: { data: base64, mimeType } },
  ]);

  const outputText = extractGeminiOutputText(payload);

  if (!outputText) {
    return {
      rawJson: null,
      rawText: "",
      model: activeModel,
      parserKind: "gemini",
      error: `Gemini returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
    };
  }

  const parsed = tryParseStructuredOutput(outputText);

  if (parsed === null) {
    return {
      rawJson: null,
      rawText: outputText,
      model: activeModel,
      parserKind: "gemini",
      error: "Gemini response is not valid JSON",
    };
  }

  const parsePayload = normalizeReceiptParsePayload(parsed as JsonValue, {
    defaultModel: activeModel,
    defaultParser: "gemini",
  });

  if (!parsePayload) {
    return {
      rawJson: null,
      rawText: outputText,
      model: activeModel,
      parserKind: "gemini",
      error: "Gemini parser output must include parser, model, rawText, rawSummary, warnings, and at least one record with fields and candidates.",
    };
  }

  return {
    rawJson: parsePayload,
    rawText: parsePayload.rawText,
    model: parsePayload.model ?? activeModel,
    parserKind: "gemini",
    error: null,
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

async function loadRequiredInferSettings(): Promise<OpenAiSettings> {
  const inferApiKey = (await loadPersistedInferApiKey().catch(() => "")).trim();
  const inferBaseUrl = (await loadPersistedInferBaseUrl().catch(() => "")).trim();
  const inferModel = (await loadPersistedInferModel().catch(() => "")).trim();

  if (!inferBaseUrl) {
    throw new ParseEvidenceClientError(
      "Missing Infer Base URL. Add it from Settings.",
      "missing_config",
    );
  }

  if (!inferApiKey) {
    throw new ParseEvidenceClientError(
      "Missing Infer API Key. Add it from Settings.",
      "missing_config",
    );
  }

  const model =
    runtimeModelOverrides.infer ??
    (inferModel || ((process.env.EXPO_PUBLIC_INFER_MODEL ?? "").trim() || defaultOpenAiModel));

  return {
    baseUrl: normalizeBaseUrl(inferBaseUrl),
    model,
    openAiApiKey: inferApiKey,
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
  if (runtimeModelOverrides.openai) {
    return runtimeModelOverrides.openai;
  }

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
    const { payload } = await callGemini(settings, systemPrompt, [{ text: userPrompt }]);
    const text = extractGeminiOutputText(payload);
    if (!text) {
      throw new ParseEvidenceClientError(
        `Gemini planner returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
        "gemini_error",
      );
    }
    return text;
  }

  const settings = aiProvider === "infer"
    ? await loadRequiredInferSettings()
    : await loadRequiredOpenAiSettings();
  const errorCode = aiProvider === "infer" ? "infer_error" as const : "openai_error" as const;
  const apiInput = [
    { content: [{ text: systemPrompt, type: "input_text" }], role: "system" },
    { content: [{ text: userPrompt, type: "input_text" }], role: "user" },
  ];
  const { payload } = await callOpenAi(settings, apiInput, aiProvider);
  const text = extractOpenAiOutputText(payload);
  if (!text) {
    throw new ParseEvidenceClientError(
      `Planner returned no text. Keys: [${Object.keys(payload).join(", ")}]`,
      errorCode,
    );
  }
  return text;
}

async function loadRequiredGeminiSettings(): Promise<GeminiSettings> {
  const authMode = await loadPersistedGeminiAuthMode();
  const baseUrl = normalizeBaseUrl(
    (process.env.EXPO_PUBLIC_GEMINI_BASE_URL ?? "").trim() || defaultGeminiBaseUrl,
  );
  const configuredModel = (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "").trim() || defaultGeminiModel;
  const model = runtimeModelOverrides.gemini ?? configuredModel;

  if (authMode === "google_oauth") {
    const googleAccessToken = await getValidGoogleAccessToken();
    if (!googleAccessToken) {
      throw new ParseEvidenceClientError(
        "Google sign-in session expired. Please sign in again from Settings.",
        "missing_config",
      );
    }
    return { authMode, baseUrl, geminiApiKey: "", googleAccessToken, model };
  }

  const persistedApiKey = await loadPersistedGeminiApiKey().catch(() => "");
  const geminiApiKey = persistedApiKey || (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "").trim();

  if (!geminiApiKey) {
    throw new ParseEvidenceClientError(
      "Missing Gemini API key. Add it from Settings or EXPO_PUBLIC_GEMINI_API_KEY.",
      "missing_config",
    );
  }

  return { authMode, baseUrl, geminiApiKey, googleAccessToken: "", model };
}

async function callGemini(
  settings: GeminiSettings,
  systemText: string,
  userParts: GeminiPart[],
): Promise<ProviderCallResult> {
  const candidateModels = getFallbackModels("gemini", settings.model);
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const payload = await performGeminiRequest(settings, systemText, userParts, model);
      if (model !== settings.model) {
        runtimeModelOverrides.gemini = model;
      }
      return { model, payload };
    } catch (error) {
      lastError = error;

      if (isHighDemandModelError(error) && model !== candidateModels[candidateModels.length - 1]) {
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
}

async function performGeminiRequest(
  settings: GeminiSettings,
  systemText: string,
  userParts: GeminiPart[],
  model: string,
): Promise<Record<string, unknown>> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), openAiRequestTimeoutMs);

  try {
    const url =
      settings.authMode === "google_oauth"
        ? `${settings.baseUrl}/models/${model}:generateContent`
        : `${settings.baseUrl}/models/${model}:generateContent?key=${settings.geminiApiKey}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.authMode === "google_oauth") {
      headers["Authorization"] = `Bearer ${settings.googleAccessToken}`;
    }

    const response = await fetch(url, {
      body: JSON.stringify({
        contents: [{ parts: userParts, role: "user" }],
        generationConfig: { maxOutputTokens: 4000 },
        systemInstruction: { parts: [{ text: systemText }] },
      }),
      cache: "no-store",
      headers,
      method: "POST",
      signal: controller?.signal,
    });

    const payload = await parseProviderJsonResponse(response, "gemini");

    if (!response.ok) {
      const errDetail = payload?.error as { message?: string } | undefined;
      throw new ProviderRequestError(
        errDetail?.message ?? `Gemini request failed: ${response.status}`,
        "gemini",
        response.status,
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

async function callOpenAi(settings: OpenAiSettings, input: unknown, provider: AiProvider = "openai"): Promise<ProviderCallResult> {
  const candidateModels = getFallbackModels(provider, settings.model);
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const payload = await performOpenAiRequest(settings, input, model, provider);
      if (model !== settings.model) {
        runtimeModelOverrides[provider] = model;
      }
      return { model, payload };
    } catch (error) {
      lastError = error;

      if (isHighDemandModelError(error) && model !== candidateModels[candidateModels.length - 1]) {
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("OpenAI request failed");
}

async function performOpenAiRequest(
  settings: OpenAiSettings,
  input: unknown,
  model: string,
  provider: AiProvider,
): Promise<Record<string, unknown>> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => controller?.abort(), openAiRequestTimeoutMs);

  try {
    const targetUrl = `${settings.baseUrl}/responses`;
    const requestBody = JSON.stringify({
      input,
      max_output_tokens: 4_000,
      model,
      ...(isReasoningModel(model) ? { reasoning: { effort: "minimal" } } : {}),
      store: false,
    });

    const useProxy = isWebRuntime() && !isFirstPartyApiHost(settings.baseUrl);
    const proxyUrl =
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? (process.env.EXPO_PUBLIC_CORS_PROXY_URL ?? defaultLocalCorsProxyUrl).trim()
        : "/api/cors-proxy";
    const fetchUrl = useProxy ? proxyUrl : targetUrl;
    const fetchHeaders: Record<string, string> = {
      Authorization: `Bearer ${settings.openAiApiKey}`,
      "Content-Type": "application/json",
      ...(useProxy ? { "x-proxy-target": targetUrl } : {}),
    };

    const response = await fetch(fetchUrl, {
      body: requestBody,
      cache: "no-store",
      headers: fetchHeaders,
      method: "POST",
      signal: controller?.signal,
    });

    const payload = await parseProviderJsonResponse(response, provider);

    if (!response.ok) {
      const errMsg = (payload?.error as { message?: string })?.message;
      throw new ProviderRequestError(
        errMsg ?? `${getProviderDisplayName(provider)} request failed: ${response.status}`,
        provider,
        response.status,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isWebRuntime(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getFallbackModels(provider: AiProvider, model: string): string[] {
  if (provider === "infer") {
    return [model];
  }

  const envCandidates = splitCommaSeparatedModels(
    provider === "openai"
      ? process.env.EXPO_PUBLIC_OPENAI_FALLBACK_MODELS ?? ""
      : process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS ?? "",
  );
  const normalizedEnvCandidates = provider === "gemini"
    ? filterAllowedGeminiFallbackModels(envCandidates)
    : envCandidates;
  const mappedCandidates = provider === "openai"
    ? openAiFallbackModelMap[model] ?? []
    : filterAllowedGeminiFallbackModels(geminiFallbackModelMap[model] ?? []);

  return Array.from(new Set([model, ...normalizedEnvCandidates, ...mappedCandidates].filter((candidate) => candidate.trim())));
}

function splitCommaSeparatedModels(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function filterAllowedGeminiFallbackModels(models: string[]): string[] {
  return models.filter((model) =>
    model.startsWith("gemini-2.5-") ||
    model.startsWith("gemini-3-") ||
    model.startsWith("gemini-3.1-"),
  );
}

function isHighDemandModelError(error: unknown): boolean {
  if (!(error instanceof ProviderRequestError)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const status = error.status;

  if (status === 503 || status === 529) {
    return true;
  }

  if (status === 429) {
    return /(high demand|overloaded|currently overloaded|too busy|capacity|temporarily unavailable|try again later|service unavailable)/i.test(message);
  }

  return /(experiencing high demand|high demand|overloaded|currently overloaded|temporarily unavailable|service unavailable|server overloaded|model is overloaded|try again later)/i.test(message);
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fileSystemModule = require("expo-file-system/legacy") as {
    EncodingType: { Base64: string };
    readAsStringAsync: (
      targetUri: string,
      options: { encoding: string },
    ) => Promise<string>;
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const constantsModule = require("expo-constants") as {
    default: Record<string, unknown>;
  };
  const constants = constantsModule.default;
  const expoConfigExtra = (constants as {
    expoConfig?: { extra?: { openAiBaseUrl?: unknown; openAiModel?: unknown } };
  }).expoConfig?.extra;

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

const firstPartyApiHosts = ["api.openai.com", "generativelanguage.googleapis.com"];

function isFirstPartyApiHost(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return firstPartyApiHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function getProviderDisplayName(provider: AiProvider): string {
  if (provider === "infer") return "Infer";
  if (provider === "gemini") return "Gemini";
  return "OpenAI";
}

async function parseProviderJsonResponse(
  response: Response,
  provider: AiProvider,
): Promise<Record<string, unknown>> {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const snippet = trimmed.replace(/\s+/g, " ").slice(0, 160);
    throw new ProviderRequestError(
      `${getProviderDisplayName(provider)} returned a non-JSON response${snippet ? `: ${snippet}` : ""}`,
      provider,
      response.status,
    );
  }
}
