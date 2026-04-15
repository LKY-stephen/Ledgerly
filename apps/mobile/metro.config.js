const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch all packages
config.watchFolders = [monorepoRoot];

// Monorepo: resolve node_modules from both project and root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Avoid Metro cache collisions in monorepo
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, "node_modules", ".cache", "metro") }),
];

module.exports = config;
