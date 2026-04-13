#!/usr/bin/env node

const userAgent = process.env.npm_config_user_agent ?? "";

if (userAgent.startsWith("pnpm/")) {
  process.exit(0);
}

const manager = userAgent.split("/")[0] || "unknown";

console.error(
  [
    "This repository is pnpm-only.",
    `Detected package manager: ${manager}.`,
    "Use `pnpm install` from the repository root.",
    "If you already ran npm, recover with:",
    "  rm -rf node_modules package-lock.json",
    "  pnpm install",
  ].join("\n"),
);

process.exit(1);
