/**
 * Smoke test: PDF parse → planner full pipeline
 *
 * Usage:
 *   node tests/smoke/test-pdf-parse.mjs <openai-api-key> <pdf-file-path>
 *
 * Example:
 *   node tests/smoke/test-pdf-parse.mjs sk-proj-xxx /Users/you/Downloads/Receipt.pdf
 */

import { readFileSync } from "fs";
import { basename } from "path";

const apiKey = process.argv[2];
const filePath = process.argv[3];

if (!apiKey || !filePath) {
  console.error("Usage: node test-pdf-parse.mjs <openai-api-key> <pdf-file-path>");
  process.exit(1);
}

const model = process.env.OPENAI_MODEL ?? "gpt-4o";
const fileName = basename(filePath);
const fileBytes = readFileSync(filePath);
const base64 = fileBytes.toString("base64");
const mimeType = fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";

// ─── helpers (copied from remote-parse.ts) ───

function createInputFilePart() {
  if (mimeType === "application/pdf") {
    return { file_data: `data:${mimeType};base64,${base64}`, filename: fileName, type: "input_file" };
  }
  return { detail: "high", image_url: `data:${mimeType};base64,${base64}`, type: "input_image" };
}

function extractOutputText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  if (Array.isArray(payload.output_text)) {
    const joined = payload.output_text.filter((i) => typeof i === "string").join("\n").trim();
    if (joined) return joined;
  }
  const output = Array.isArray(payload.output) ? payload.output : [];
  const textParts = [];
  for (const item of output) {
    const content = item && typeof item === "object" && "content" in item && Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") { textParts.push(part.text); continue; }
      if (part && typeof part === "object" && "json" in part && part.json !== undefined) { textParts.push(JSON.stringify(part.json)); }
    }
  }
  return textParts.join("\n").trim();
}

function normalizeJsonText(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{"), last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1).trim();
  return trimmed;
}

function tryParseJson(text) {
  try { return JSON.parse(normalizeJsonText(text)); } catch { return null; }
}

// ─── prompts (copied from remote-parse.ts) ───

const parserSystemPrompt = [
  "你是 receipt parser。",
  "# receipt-parse",
  "- Only parse the file attached in the current request.",
  "- Return JSON only.",
  "- Do not treat prior parse results, prior uploads, or cached examples as truth.",
  "- Preserve ambiguous values in warnings instead of inventing bookkeeping facts.",
  "- The response is raw parse evidence, not final accounting truth.",
  "只返回 JSON。",
  "顶层必须只包含 parser、model、rawText、rawSummary、warnings、fields、candidates。",
  "fields 和 candidates 必须都包含 amountCents、category、date、description、notes、source、target、taxCategory。",
  "amountCents 必须是整数分，未知时返回 null。",
  "date 已知时必须是 YYYY-MM-DD，未知时返回 null。",
  "不要返回 markdown、解释、代码块或任何额外文本。",
].join("\n");

const plannerSystemPrompt = [
  "你是 upload workflow planner。",
  "# receipt-db-update-planner",
  "- You receive source profile info, evidence metadata, extracted fields, originData, and local readResults.",
  "- Return JSON only.",
  "- Produce planning output, not final bookkeeping writes.",
  "- Include classifiedFacts, businessEvents, readTasks, counterpartyResolutions, candidateRecords, writeProposals, summary, and warnings when possible.",
  "- Never assume parser output is final books truth without review.",
  "- Favor minimal reads and explicit approval-gated writes.",
  "只返回 JSON。",
  "顶层必须只包含 businessEvents、classifiedFacts、readTasks、counterpartyResolutions、candidateRecords、writeProposals、summary、warnings、duplicateHints。",
  "planner 只能生成工作流计划，不能把 parser JSON 当成最终账本真相。",
  "不要返回 markdown、解释或代码块。",
].join("\n");

// ─── API call ───

async function callOpenAi(input) {
  const isReasoning = model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
  const body = {
    input,
    max_output_tokens: 4000,
    model,
    ...(isReasoning ? { reasoning: { effort: "minimal" } } : {}),
    store: false,
  };
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error("OpenAI error:", resp.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }
  return data;
}

// ─── Step 1: Parse ───

console.log("═══════════════════════════════════");
console.log("Step 1: Parse PDF with OpenAI");
console.log("═══════════════════════════════════");
console.log(`File: ${fileName} (${fileBytes.length} bytes)`);
console.log(`Model: ${model}`);
console.log(`MIME: ${mimeType}`);
console.log(`FilePart type: ${createInputFilePart().type}`);
console.log();

const parsePayload = await callOpenAi([
  { role: "system", content: [{ text: parserSystemPrompt, type: "input_text" }] },
  {
    role: "user",
    content: [
      { text: `filename: ${fileName}\nmimeType: ${mimeType}\nsourcePlatform: web`, type: "input_text" },
      createInputFilePart(),
    ],
  },
]);

const parseOutputText = extractOutputText(parsePayload);
if (!parseOutputText) {
  console.error("FAIL: No output text from parser.");
  console.error("Full response:", JSON.stringify(parsePayload, null, 2).slice(0, 3000));
  process.exit(1);
}

const parsedJson = tryParseJson(parseOutputText);
if (!parsedJson) {
  console.error("FAIL: Could not parse JSON from output text.");
  console.error("Raw output:", parseOutputText.slice(0, 2000));
  process.exit(1);
}

console.log("PASS: Parser returned valid JSON");
console.log(JSON.stringify(parsedJson, null, 2));

// Validate required fields
const requiredParseFields = ["parser", "rawText", "rawSummary", "warnings", "fields", "candidates"];
const missingParse = requiredParseFields.filter((f) => !(f in parsedJson));
if (missingParse.length) {
  console.warn(`WARN: Missing parser fields: ${missingParse.join(", ")}`);
} else {
  console.log("PASS: All required parser fields present");
}

// ─── Step 2: Planner ───

console.log();
console.log("═══════════════════════════════════");
console.log("Step 2: Plan evidence DB updates");
console.log("═══════════════════════════════════");

const plannerUserPrompt = [
  `source: ${JSON.stringify({ email: "", name: "Test User", phone: "" })}`,
  `evidence: ${JSON.stringify({ evidenceId: "smoke-test", evidenceKind: "receipt", originalFileName: fileName, mimeType, filePath: "", parseStatus: "parsed", createdAt: new Date().toISOString(), capturedAmountCents: parsedJson.fields?.amountCents ?? 0, capturedDate: parsedJson.fields?.date ?? "", capturedDescription: parsedJson.fields?.description ?? "", capturedSource: parsedJson.fields?.source ?? "", capturedTarget: parsedJson.fields?.target ?? "" })}`,
  `extractedData: ${JSON.stringify({ fields: parsedJson.fields ?? {}, warnings: parsedJson.warnings ?? [] })}`,
  `readResults: {}`,
  `originData: ${JSON.stringify(parsedJson)}`,
].join("\n");

const planPayload = await callOpenAi([
  { role: "system", content: [{ text: plannerSystemPrompt, type: "input_text" }] },
  { role: "user", content: [{ text: plannerUserPrompt, type: "input_text" }] },
]);

const planOutputText = extractOutputText(planPayload);
if (!planOutputText) {
  console.error("FAIL: No output text from planner.");
  console.error("Full response:", JSON.stringify(planPayload, null, 2).slice(0, 3000));
  process.exit(1);
}

const planJson = tryParseJson(planOutputText);
if (!planJson) {
  console.error("FAIL: Could not parse planner JSON.");
  console.error("Raw output:", planOutputText.slice(0, 2000));
  process.exit(1);
}

console.log("PASS: Planner returned valid JSON");
console.log(JSON.stringify(planJson, null, 2));

const requiredPlanFields = ["businessEvents", "classifiedFacts", "readTasks", "counterpartyResolutions", "candidateRecords", "writeProposals", "summary", "warnings"];
const missingPlan = requiredPlanFields.filter((f) => !(f in planJson));
if (missingPlan.length) {
  console.warn(`WARN: Missing planner fields: ${missingPlan.join(", ")}`);
} else {
  console.log("PASS: All required planner fields present");
}

// ─── Summary ───

console.log();
console.log("═══════════════════════════════════");
console.log("Summary");
console.log("═══════════════════════════════════");
console.log(`Parser:  ${parsedJson.parser ?? "?"} / ${parsedJson.model ?? model}`);
console.log(`Amount:  ${parsedJson.fields?.amountCents ?? "null"} cents`);
console.log(`Date:    ${parsedJson.fields?.date ?? "null"}`);
console.log(`Source:  ${parsedJson.fields?.source ?? "null"}`);
console.log(`Target:  ${parsedJson.fields?.target ?? "null"}`);
console.log(`Desc:    ${parsedJson.fields?.description ?? "null"}`);
console.log(`Planner: ${planJson.candidateRecords?.length ?? 0} candidates, ${planJson.writeProposals?.length ?? 0} proposals`);
console.log(`Summary: ${planJson.summary ?? "none"}`);
console.log();
console.log("Full pipeline PASS");
