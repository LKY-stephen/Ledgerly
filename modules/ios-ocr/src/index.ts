import { requireNativeModule } from "expo-modules-core";

import type { IOSOcrResult } from "./types";

const IOSOcrModule = requireNativeModule("IOSOcr");

export async function recognizeTextFromImage(
  uri: string
): Promise<IOSOcrResult> {
  return IOSOcrModule.recognizeTextFromImage(uri);
}

export type { IOSOcrResult };
