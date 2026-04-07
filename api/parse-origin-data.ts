import {
  createErrorResponse,
  jsonResponse,
  parseAuthorizationBearerToken,
  RouteError,
} from "./_lib/contracts";
import { parseOriginDataWithOpenAI } from "./_lib/openai";
import { parseFileInputRequest } from "./_lib/parse-request";

export async function POST(request: Request) {
  try {
    const apiKey = parseAuthorizationBearerToken(request.headers.get("authorization"));
    const file = await parseFileInputRequest(request);
    const originData = await parseOriginDataWithOpenAI(file, apiKey);

    return jsonResponse(originData);
  } catch (error) {
    if (error instanceof RouteError) {
      return createErrorResponse(error);
    }

    return createErrorResponse(
      new RouteError(
        500,
        "unexpected_parse_error",
        error instanceof Error ? error.message : "Unexpected parse failure.",
      ),
    );
  }
}
