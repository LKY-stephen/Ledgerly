import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { alanBlueSpriteSource } from "../src/features/game/stickman/alan-blue-sprite-manifest.generated";

const mobileRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ledgerlyRoot = path.resolve(mobileRoot, "../..");

export function resolveAlanBlueSourceDir() {
  if (existsSync(alanBlueSpriteSource.sourceDir)) {
    return alanBlueSpriteSource.sourceDir;
  }

  return path.resolve(ledgerlyRoot, alanBlueSpriteSource.relativeSourceDir);
}
