import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Expo app config", () => {
  it("declares an explicit ios buildNumber and matches the native build when ios sources exist", () => {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const infoPlistPath = path.resolve(__dirname, "..", "ios", "Ledgerly", "Info.plist");

    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8")) as {
      expo?: { ios?: { buildNumber?: string } };
    };
    const configuredBuildNumber = appJson.expo?.ios?.buildNumber;

    expect(configuredBuildNumber).toBe("1");

    // The generated native iOS folder is ignored in CI, so only compare against
    // Info.plist when the local checkout currently has prebuilt native sources.
    if (!fs.existsSync(infoPlistPath)) {
      return;
    }

    const infoPlist = fs.readFileSync(infoPlistPath, "utf8");
    const nativeBuildNumber = infoPlist.match(
      /<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/,
    )?.[1];

    expect(configuredBuildNumber).toBe(nativeBuildNumber);
  });
});
