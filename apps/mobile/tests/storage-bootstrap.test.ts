import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countStructuredTables: vi.fn(),
  getInfoAsync: vi.fn(),
  initializeActivePackageDatabase: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  openDatabaseAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  copyAsync: vi.fn(),
  getInfoAsync: mocks.getInfoAsync,
  makeDirectoryAsync: mocks.makeDirectoryAsync,
  writeAsStringAsync: mocks.writeAsStringAsync,
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: mocks.openDatabaseAsync,
}));

vi.mock("@creator-cfo/storage", () => ({
  createLocalStorageBootstrapManifest: () => ({ version: 5 }),
  getLocalStorageBootstrapPlan: () => ({
    databaseName: "creator-cfo-local.db",
    fileCollections: [{ slug: "evidence-objects" }, { slug: "evidence-manifests" }],
    fileVaultRoot: "creator-cfo-vault",
    overview: {
      collectionCount: 2,
    },
  }),
}));

vi.mock("@creator-cfo/schemas", () => ({
  supportedPlatforms: ["ios", "android", "web"],
}));

vi.mock("../src/storage/active-database.native", () => ({
  initializeActivePackageDatabase: mocks.initializeActivePackageDatabase,
}));

vi.mock("../src/storage/database", () => ({
  countStructuredTables: mocks.countStructuredTables,
}));

vi.mock("../src/storage/package-environment.native", () => ({
  getActiveDatabaseDirectory: () => "file:///documents/creator-cfo-vault",
  getActiveDatabasePath: () => "file:///documents/creator-cfo-vault/creator-cfo-local.db",
  getLegacyDatabasePath: () => "file:///legacy/creator-cfo-local.db",
}));

import {
  bootstrapLocalStorage,
  initializeEmptyActivePackage,
} from "../src/storage/bootstrap.native";
import { StorageSetupRequiredError } from "../src/storage/status";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getInfoAsync.mockResolvedValue({ exists: false, isDirectory: false });
  mocks.countStructuredTables.mockResolvedValue(15);
  mocks.initializeActivePackageDatabase.mockResolvedValue(undefined);
  mocks.openDatabaseAsync.mockResolvedValue({
    closeAsync: vi.fn(),
    getAllAsync: vi.fn(),
  });
});

describe("native storage bootstrap", () => {
  it("refuses to create an empty database implicitly when no active or legacy database exists", async () => {
    await expect(bootstrapLocalStorage()).rejects.toBeInstanceOf(StorageSetupRequiredError);
    expect(mocks.openDatabaseAsync).not.toHaveBeenCalled();
  });

  it("still initializes an empty active package when the user chooses that path explicitly", async () => {
    const status = await initializeEmptyActivePackage();

    expect(mocks.makeDirectoryAsync).toHaveBeenCalled();
    expect(mocks.openDatabaseAsync).toHaveBeenCalledWith(
      "creator-cfo-local.db",
      undefined,
      "file:///documents/creator-cfo-vault",
    );
    expect(status).toMatchObject({
      databaseName: "creator-cfo-local.db",
      fileCollectionCount: 2,
      fileVaultRoot: "creator-cfo-vault",
      status: "ready",
      structuredTableCount: 15,
    });
  });
});
