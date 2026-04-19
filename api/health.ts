import { jsonResponse, parseModel } from "./_lib/contracts";

export async function GET() {
  return jsonResponse({
    hasOpenAiRuntime: typeof fetch === "function" && typeof Request === "function",
    model: parseModel,
    parser: "openai_gpt",
    requiresUserApiKey: true,
    service: "ledgerly-parse-api",
    status: "ok",
    version: 1,
  });
}
