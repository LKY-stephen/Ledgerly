import {
  normalizeReceiptParsePayload,
  projectReceiptParsePayloadToLegacyScheme,
} from "../../packages/schemas/src/index";
import { RouteError, parseModel, type MapEvidenceSchemeRouteInput, type ParseRouteInput } from "./contracts";
import type {
  JsonValue,
  ParseEvidenceScheme,
  ParseOriginDataApiSuccess,
} from "./types";

const parsePrompt = [
  "你是 receipt parser。",
  "Only parse the file attached in the current request.",
  "Return JSON only.",
  "Do not treat prior parse results, prior uploads, or cached examples as truth.",
  "The top-level object must contain parser, model, rawText, rawSummary, warnings, fields, and candidates.",
  "fields and candidates must both include amountCents, category, date, description, notes, source, target, and taxCategory.",
  "amountCents must be an integer in cents or null.",
  "date must be YYYY-MM-DD when known or null.",
].join(" ");

export async function parseOriginDataWithOpenAI(
  input: ParseRouteInput,
  apiKey: string,
): Promise<ParseOriginDataApiSuccess> {
  const filePart = createInputFilePart(input);
  const payload = await callOpenAI(
    [
      {
        content: [
          {
            text: parsePrompt,
            type: "input_text",
          },
        ],
        role: "system",
      },
      {
        content: [
          {
            text: buildParseUserPrompt(input),
            type: "input_text",
          },
          filePart,
        ],
        role: "user",
      },
    ],
    apiKey,
  );
  const outputText = extractOutputText(payload);

  if (!outputText) {
    logOpenAIFailure("invalid_openai_response", payload);
    throw new RouteError(502, "invalid_openai_response", "OpenAI returned no parseable output text.");
  }

  const parsedOutput = tryParseStructuredOutput(outputText);

  if (parsedOutput === null) {
    logOpenAIFailure("invalid_openai_json", payload, outputText);
    throw new RouteError(502, "invalid_openai_json", "OpenAI returned invalid JSON for parser output.");
  }

  const parsePayload = normalizeReceiptParsePayload(parsedOutput, {
    defaultModel: parseModel,
    defaultParser: "openai_gpt",
  });

  if (!parsePayload) {
    logOpenAIFailure("invalid_openai_json", payload, outputText);
    throw new RouteError(
      502,
      "invalid_openai_json",
      "OpenAI parser output must include parser, model, rawText, rawSummary, warnings, fields, and candidates.",
    );
  }

  return parsePayload;
}

export async function mapEvidenceSchemeWithOpenAI(
  input: MapEvidenceSchemeRouteInput,
): Promise<ParseEvidenceScheme> {
  return projectReceiptParsePayloadToLegacyScheme({
    payload: input.originData,
    template: input.scheme,
  });
}

function createInputFilePart(input: ParseRouteInput) {
  const base64 = Buffer.from(input.bytes).toString("base64");

  if (input.mimeType === "application/pdf") {
    return {
      file_data: `data:${input.mimeType};base64,${base64}`,
      filename: input.filename,
      type: "input_file",
    };
  }

  return {
    detail: "high",
    image_url: `data:${input.mimeType};base64,${base64}`,
    type: "input_image",
  };
}

function buildParseUserPrompt(input: ParseRouteInput): string {
  return [`filename: ${input.filename}`, `mimeType: ${input.mimeType}`, `sourcePlatform: ${input.sourcePlatform}`].join("\n");
}

async function callOpenAI(input: unknown, apiKey: string): Promise<Record<string, unknown>> {
  const isReasoning = parseModel.toLowerCase().startsWith("o1") || parseModel.toLowerCase().startsWith("o3") || parseModel.toLowerCase().startsWith("o4");
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input,
      max_output_tokens: 4_000,
      model: parseModel,
      ...(isReasoning ? { reasoning: { effort: "minimal" } } : {}),
      store: false,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const providerMessage = extractProviderMessage(payload);
    throw new RouteError(
      response.status === 401 ? 401 : 502,
      response.status === 401 ? "invalid_openai_key" : "openai_request_failed",
      providerMessage ?? "OpenAI request failed.",
    );
  }

  return payload;
}

function extractProviderMessage(payload: Record<string, unknown>): string | null {
  const error = payload.error;

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return null;
}

function extractOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (Array.isArray(payload.output_text)) {
    const joined = payload.output_text.filter((item): item is string => typeof item === "string").join("\n").trim();

    if (joined) {
      return joined;
    }
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
        continue;
      }

      if (part && typeof part === "object" && "json" in part && part.json !== undefined) {
        textParts.push(JSON.stringify(part.json));
      }
    }
  }

  return textParts.join("\n").trim();
}

function tryParseStructuredOutput(outputText: string): JsonValue | null {
  const candidates = [normalizeJsonText(outputText), ...extractBalancedJsonCandidates(outputText)];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const normalized = candidate.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);

    try {
      return JSON.parse(normalized) as JsonValue;
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeJsonText(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function extractBalancedJsonCandidates(value: string): string[] {
  return [...extractBalancedCandidates(value, "{", "}"), ...extractBalancedCandidates(value, "[", "]")];
}

function extractBalancedCandidates(value: string, open: "{" | "[", close: "}" | "]"): string[] {
  const candidates: string[] = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (!character) {
      continue;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (character === "\\") {
        isEscaped = true;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === open) {
      if (depth === 0) {
        startIndex = index;
      }

      depth += 1;
      continue;
    }

    if (character === close) {
      if (depth === 0) {
        continue;
      }

      depth -= 1;

      if (depth === 0 && startIndex >= 0) {
        candidates.push(value.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return candidates.reverse();
}

function logOpenAIFailure(code: "invalid_openai_json" | "invalid_openai_response", payload: Record<string, unknown>, outputText?: string) {
  const debugSummary = {
    code,
    model: typeof payload.model === "string" ? payload.model : null,
    outputTextPreview: outputText ? outputText.slice(0, 1200) : null,
    outputTextType: Array.isArray(payload.output_text) ? "array" : typeof payload.output_text,
    outputTypes: summarizeOutputTypes(payload),
  };

  console.error("parse api OpenAI parse failure", JSON.stringify(debugSummary));
}

function summarizeOutputTypes(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];

  return output.map((item) => {
    const record = asUnknownObject(item);
    const content = record && Array.isArray(record.content) ? record.content : [];

    return content.map((part) => {
      const partRecord = asUnknownObject(part);

      return {
        hasJson: partRecord?.json !== undefined,
        hasText: typeof partRecord?.text === "string",
        type: typeof partRecord?.type === "string" ? partRecord.type : "unknown",
      };
    });
  });
}

function asUnknownObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
