import {
  accessSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 8088;
const MAX_PORT_SEARCH_SPAN = 20;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const expoModulesCoreProtocolsDir = resolve(
  repoRoot,
  "node_modules/expo-modules-core/ios/Protocols",
);
const expoModulesCorePublicHeadersDir = resolve(
  appRoot,
  "ios/Pods/Headers/Public/ExpoModulesCore/ExpoModulesCore",
);
const expoModulesCoreUmbrellaHeaderPath = resolve(
  appRoot,
  "ios/Pods/Target Support Files/ExpoModulesCore/ExpoModulesCore-umbrella.h",
);
const podsProjectPath = resolve(appRoot, "ios/Pods/Pods.xcodeproj/project.pbxproj");
const expoModulesCoreAppContextFactoryPath = resolve(
  repoRoot,
  "node_modules/expo-modules-core/ios/Core/AppContextFactory.swift",
);
const expoModulesCoreAppContextFactoryRegistryPath = resolve(
  repoRoot,
  "node_modules/expo-modules-core/ios/Protocols/EXAppContextFactoryRegistry.m",
);
const staleExpoModulesCorePodsProjectFiles = [
  {
    path: resolve(repoRoot, "node_modules/expo-modules-core/ios/RCTComponentData+Privates.h"),
    name: "RCTComponentData+Privates.h",
  },
  {
    path: resolve(repoRoot, "node_modules/expo-modules-core/ios/RCTComponentData+Privates.m"),
    name: "RCTComponentData+Privates.m",
  },
  {
    path: resolve(repoRoot, "node_modules/expo-modules-core/ios/Core/Views/ComponentData.swift"),
    name: "ComponentData.swift",
  },
];
const requiredExpoModulesCorePodsProjectEntries = [
  {
    name: "AppContextFactory.swift",
    path: expoModulesCoreAppContextFactoryPath,
    replacements: [
      {
        current:
          '\t\t46EB2E0001AC70 /* AppContext.swift in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E000014E0 /* AppContext.swift */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };',
        next:
          '\t\t46EB2E0001AC70 /* AppContext.swift in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E000014E0 /* AppContext.swift */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };\n\t\t46EB2E0001AC75 /* AppContextFactory.swift in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E000014E5 /* AppContextFactory.swift */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };',
      },
      {
        current:
          '\t\t46EB2E000014E0 /* AppContext.swift */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.swift; path = AppContext.swift; sourceTree = "<group>"; };',
        next:
          '\t\t46EB2E000014E0 /* AppContext.swift */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.swift; path = AppContext.swift; sourceTree = "<group>"; };\n\t\t46EB2E000014E5 /* AppContextFactory.swift */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.swift; path = AppContextFactory.swift; sourceTree = "<group>"; };',
      },
      {
        current: '\t\t\t\t46EB2E000014E0 /* AppContext.swift */,',
        next:
          '\t\t\t\t46EB2E000014E0 /* AppContext.swift */,\n\t\t\t\t46EB2E000014E5 /* AppContextFactory.swift */,',
      },
      {
        current: '\t\t\t\t46EB2E0001AC70 /* AppContext.swift in Sources */,',
        next:
          '\t\t\t\t46EB2E0001AC70 /* AppContext.swift in Sources */,\n\t\t\t\t46EB2E0001AC75 /* AppContextFactory.swift in Sources */,',
      },
    ],
  },
  {
    name: "EXAppContextFactoryRegistry.m",
    path: expoModulesCoreAppContextFactoryRegistryPath,
    replacements: [
      {
        current:
          '\t\t46EB2E0001A8D0 /* EXAppDefines.m in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E00001EF0 /* EXAppDefines.m */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };',
        next:
          '\t\t46EB2E0001A8D0 /* EXAppDefines.m in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E00001EF0 /* EXAppDefines.m */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };\n\t\t46EB2E0001A8D5 /* EXAppContextFactoryRegistry.m in Sources */ = {isa = PBXBuildFile; fileRef = 46EB2E00001EF5 /* EXAppContextFactoryRegistry.m */; settings = {COMPILER_FLAGS = "-DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_TARGET_VERSION=83 -DUSE_HERMES -DRCT_NEW_ARCH_ENABLED"; }; };',
      },
      {
        current:
          '\t\t46EB2E00001EF0 /* EXAppDefines.m */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.c.objc; path = EXAppDefines.m; sourceTree = "<group>"; };',
        next:
          '\t\t46EB2E00001EF0 /* EXAppDefines.m */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.c.objc; path = EXAppDefines.m; sourceTree = "<group>"; };\n\t\t46EB2E00001EF5 /* EXAppContextFactoryRegistry.m */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.c.objc; path = Protocols/EXAppContextFactoryRegistry.m; sourceTree = "<group>"; };',
      },
      {
        current: '\t\t\t\t46EB2E00001EF0 /* EXAppDefines.m */,',
        next:
          '\t\t\t\t46EB2E00001EF0 /* EXAppDefines.m */,\n\t\t\t\t46EB2E00001EF5 /* EXAppContextFactoryRegistry.m */,',
      },
      {
        current: '\t\t\t\t46EB2E0001A8D0 /* EXAppDefines.m in Sources */,',
        next:
          '\t\t\t\t46EB2E0001A8D0 /* EXAppDefines.m in Sources */,\n\t\t\t\t46EB2E0001A8D5 /* EXAppContextFactoryRegistry.m in Sources */,',
      },
    ],
  },
];
const iosPodsDir = resolve(appRoot, "ios/Pods");

function parsePort(value) {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function simulatorExecutableExists() {
  try {
    accessSync(
      "/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app/Contents/MacOS/Simulator",
      fsConstants.X_OK,
    );
    return true;
  } catch {
    return false;
  }
}

function removeBrokenExpoModulesCorePublicHeaders() {
  if (!existsSync(expoModulesCorePublicHeadersDir)) {
    return [];
  }

  const removedHeaders = [];

  for (const entry of readdirSync(expoModulesCorePublicHeadersDir, { withFileTypes: true })) {
    if (!entry.isSymbolicLink() || !entry.name.endsWith(".h")) {
      continue;
    }

    const destinationPath = resolve(expoModulesCorePublicHeadersDir, entry.name);
    if (existsSync(destinationPath)) {
      continue;
    }

    rmSync(destinationPath, { force: true });
    removedHeaders.push(entry.name);
  }

  return removedHeaders;
}

function removeMissingExpoModulesCoreUmbrellaImports() {
  if (
    !existsSync(expoModulesCoreUmbrellaHeaderPath) ||
    !existsSync(expoModulesCorePublicHeadersDir) ||
    readdirSync(expoModulesCorePublicHeadersDir).length === 0
  ) {
    return [];
  }

  const original = readFileSync(expoModulesCoreUmbrellaHeaderPath, "utf8");
  const hasTrailingNewline = original.endsWith("\n");
  const removedHeaders = [];
  const filteredLines = [];

  for (const line of original.split(/\r?\n/)) {
    const match = line.match(/^#import "ExpoModulesCore\/([^"]+)"$/);
    if (!match) {
      filteredLines.push(line);
      continue;
    }

    const headerPath = resolve(expoModulesCorePublicHeadersDir, match[1]);
    if (existsSync(headerPath)) {
      filteredLines.push(line);
      continue;
    }

    removedHeaders.push(match[1]);
  }

  if (removedHeaders.length > 0) {
    const nextContents = `${filteredLines.join("\n")}${hasTrailingNewline ? "\n" : ""}`;
    writeFileSync(expoModulesCoreUmbrellaHeaderPath, nextContents);
  }

  return removedHeaders;
}

function ensureExpoModulesCorePodsProjectSources() {
  if (!existsSync(podsProjectPath)) {
    return { added: [], removed: [] };
  }

  const original = readFileSync(podsProjectPath, "utf8");
  let next = original;
  const removed = [];

  for (const staleFile of staleExpoModulesCorePodsProjectFiles) {
    if (existsSync(staleFile.path) || !next.includes(staleFile.name)) {
      continue;
    }

    const filtered = next
      .split("\n")
      .filter((line) => !line.includes(`/* ${staleFile.name}`))
      .join("\n");

    if (filtered !== next) {
      next = filtered;
      removed.push(staleFile.name);
    }
  }

  const added = [];
  for (const entry of requiredExpoModulesCorePodsProjectEntries) {
    if (!existsSync(entry.path) || next.includes(entry.name)) {
      continue;
    }

    for (const replacement of entry.replacements) {
      if (!next.includes(replacement.current)) {
        return { added: [], removed };
      }
      next = next.replace(replacement.current, replacement.next);
    }

    added.push(entry.name);
  }

  if (next === original) {
    return { added, removed };
  }

  writeFileSync(podsProjectPath, next);
  return { added, removed };
}

function ensureExpoModulesCorePublicHeaders() {
  if (!existsSync(iosPodsDir)) {
    return;
  }

  mkdirSync(expoModulesCorePublicHeadersDir, { recursive: true });

  const repairedHeaders = [];

  if (existsSync(expoModulesCoreProtocolsDir)) {
    for (const entry of readdirSync(expoModulesCoreProtocolsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".h")) {
        continue;
      }

      const sourcePath = resolve(expoModulesCoreProtocolsDir, entry.name);
      const destinationPath = resolve(expoModulesCorePublicHeadersDir, entry.name);
      const expectedLinkTarget = relative(expoModulesCorePublicHeadersDir, sourcePath);

      let alreadyCorrect = false;

      try {
        const stats = lstatSync(destinationPath);
        alreadyCorrect =
          stats.isSymbolicLink() && readlinkSync(destinationPath) === expectedLinkTarget;
      } catch {
        alreadyCorrect = false;
      }

      if (alreadyCorrect) {
        continue;
      }

      rmSync(destinationPath, { force: true, recursive: true });
      symlinkSync(expectedLinkTarget, destinationPath);
      repairedHeaders.push(entry.name);
    }
  }

  if (repairedHeaders.length > 0) {
    console.log(
      `Repaired ExpoModulesCore public headers: ${repairedHeaders.join(", ")}.`,
    );
  }

  const removedHeaders = removeBrokenExpoModulesCorePublicHeaders();
  if (removedHeaders.length > 0) {
    console.log(
      `Removed stale ExpoModulesCore public headers: ${removedHeaders.join(", ")}.`,
    );
  }

  const removedUmbrellaImports = removeMissingExpoModulesCoreUmbrellaImports();
  if (removedUmbrellaImports.length > 0) {
    console.log(
      `Removed stale ExpoModulesCore umbrella imports: ${removedUmbrellaImports.join(", ")}.`,
    );
  }

  const repairedSources = ensureExpoModulesCorePodsProjectSources();
  if (repairedSources.removed.length > 0) {
    console.log(
      `Removed stale ExpoModulesCore Pods project entries: ${repairedSources.removed.join(", ")}.`,
    );
  }
  if (repairedSources.added.length > 0) {
    console.log(
      `Repaired ExpoModulesCore Pods project sources: ${repairedSources.added.join(", ")}.`,
    );
  }
}

function ensureSimulatorServicesAvailable() {
  const simctl = spawnSync("xcrun", ["simctl", "list", "devices"], {
    encoding: "utf8",
  });

  if (simctl.status === 0) {
    return;
  }

  const xcodeSelect = spawnSync("xcode-select", ["-p"], { encoding: "utf8" });
  const selectedPath = xcodeSelect.status === 0 ? xcodeSelect.stdout.trim() : "unavailable";
  const simulatorPresent = simulatorExecutableExists() ? "yes" : "no";
  const stderr = `${simctl.stderr ?? ""}${simctl.stdout ?? ""}`.trim();
  const detail = stderr.split("\n").slice(0, 8).join("\n");

  console.error(
    [
      "iOS simulator services are unavailable on this machine.",
      `xcode-select: ${selectedPath}`,
      `Simulator executable present: ${simulatorPresent}`,
      "This command requires a working CoreSimulatorService before Expo can install the app.",
      "Try these host-level checks, then rerun `pnpm --filter @creator-cfo/mobile ios`:",
      "  1. Open Xcode once and let any first-launch setup finish.",
      "  2. Start Simulator.app manually.",
      "  3. Run `xcrun simctl list devices` and confirm it succeeds.",
      detail ? `simctl output:\n${detail}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  process.exit(simctl.status || 1);
}

function isMetroPortAvailable(port) {
  const lsof = spawnSync("lsof", [`-iTCP:${port}`, "-sTCP:LISTEN", "-n", "-P"], {
    encoding: "utf8",
  });

  if (lsof.status === 1) {
    return true;
  }

  if (lsof.status === 0) {
    return false;
  }

  if (lsof.error) {
    throw lsof.error;
  }

  throw new Error(
    `Unable to determine whether Metro port ${port} is available.\n${(lsof.stderr ?? lsof.stdout ?? "").trim()}`,
  );
}

function findAvailableMetroPort(startPort) {
  for (let offset = 0; offset < MAX_PORT_SEARCH_SPAN; offset += 1) {
    const port = startPort + offset;
    if (isMetroPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `Unable to find an available Metro port in the ${MAX_PORT_SEARCH_SPAN}-port range starting from ${startPort}. Set RCT_METRO_PORT to override.`,
  );
}

async function main() {
  const extraArgs = process.argv.slice(2);
  if (extraArgs.includes("--help") || extraArgs.includes("-h")) {
    const help = spawnSync("expo", ["run:ios", ...extraArgs], { stdio: "inherit" });
    process.exit(help.status ?? 1);
  }

  ensureExpoModulesCorePublicHeaders();
  ensureSimulatorServicesAvailable();

  const requestedPort = parsePort(process.env.RCT_METRO_PORT);
  const port = requestedPort ?? findAvailableMetroPort(DEFAULT_PORT);

  if (!requestedPort) {
    if (port === DEFAULT_PORT) {
      console.log(
        `Using Metro port ${port} for iOS runs. Set RCT_METRO_PORT to override.`,
      );
    } else {
      console.log(
        `Metro port ${DEFAULT_PORT} is busy. Using available port ${port} for iOS runs. Set RCT_METRO_PORT to override.`,
      );
    }
  }

  const result = spawnSync("expo", ["run:ios", "--port", String(port), ...extraArgs], {
    stdio: "inherit",
    env: {
      ...process.env,
      RCT_METRO_PORT: String(port),
    },
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

await main();
