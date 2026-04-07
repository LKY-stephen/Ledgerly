import {
  createErrorResponse,
  jsonResponse,
  RouteError,
} from "./_lib/contracts";
import { mapEvidenceSchemeWithOpenAI } from "./_lib/openai";
import { parseSchemeMappingRequest } from "./_lib/parse-request";

export async function POST(request: Request) {
  try {
    const input = await parseSchemeMappingRequest(request);
    const scheme = await mapEvidenceSchemeWithOpenAI(input);

    return jsonResponse({ scheme });
  } catch (error) {
    if (error instanceof RouteError) {
      return createErrorResponse(error);
    }

    return createErrorResponse(
      new RouteError(
        500,
        "unexpected_map_error",
        error instanceof Error ? error.message : "Unexpected scheme mapping failure.",
      ),
    );
  }
}
