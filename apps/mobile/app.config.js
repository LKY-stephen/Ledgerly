const fs = require("node:fs");
const path = require("node:path");

const appJson = require("./app.json");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadEnvIntoProcess() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const merged = {};

  for (const filePath of [
    path.join(repoRoot, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(__dirname, ".env"),
    path.join(__dirname, ".env.local"),
  ]) {
    Object.assign(merged, parseEnvFile(filePath));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

loadEnvIntoProcess();

module.exports = () => {
  const baseConfig = appJson.expo;

  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      openAiBaseUrl: process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? "",
      openAiModel: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "",
    },
  };
};
