import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countStructuredTables: vi.fn(),
  deleteAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  initializeActivePackageDatabase: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  moveAsync: vi.fn(),
  openDatabaseAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  copyAsync: vi.fn(),
  deleteAsync: mocks.deleteAsync,
  getInfoAsync: mocks.getInfoAsync,
  makeDirectoryAsync: mocks.makeDirectoryAsync,
  moveAsync: mocks.moveAsync,
  readDirectoryAsync: mocks.readDirectoryAsync,
  writeAsStringAsync: mocks.writeAsStringAsync,
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: mocks.openDatabaseAsync,
}));

vi.mock("@ledgerly/storage", () => ({
  createLocalStorageBootstrapManifest: () => ({ version: 6 }),
  getLocalStorageBootstrapPlan: () => ({
    databaseName: "ledgerly-local.db",
    fileCollections: [{ slug: "evidence-objects" }, { slug: "evidence-manifests" }],
    fileVaultRoot: "ledgerly-vault",
    overview: {
      collectionCount: 2,
    },
  }),
}));

vi.mock("@ledgerly/schemas", () => ({
  supportedPlatforms: ["ios", "android", "web"],
}));

vi.mock("../src/storage/active-database.native", () => ({
  initializeActivePackageDatabase: mocks.initializeActivePackageDatabase,
}));

vi.mock("../src/storage/database", () => ({
  countStructuredTables: mocks.countStructuredTables,
}));

vi.mock("../src/storage/package-environment.native", () => ({
  getActiveDatabaseDirectory: () => "file:///documents/ledgerly-vault",
  getActiveDatabasePath: () => "file:///documents/ledgerly-vault/ledgerly-local.db",
  getActivePackageRootDirectory: () => "file:///documents/ledgerly-vault",
  getLegacyStandaloneDatabasePathCandidates: () => ["file:///legacy/ledgerly-local.db"],
  getPackageDatabasePathCandidates: (packageRoot: string) => [
    `${packageRoot}/ledgerly-local.db`,
    `${packageRoot}/${["creator", "cfo"].join("-")}-local.db`,
  ],
  getPackageRootDirectoryCandidates: () => [
    "file:///documents/ledgerly-vault",
    `file:///documents/${["creator", "cfo"].join("-")}-vault`,
  ],
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
  mocks.deleteAsync.mockResolvedValue(undefined);
  mocks.initializeActivePackageDatabase.mockResolvedValue(undefined);
  mocks.moveAsync.mockResolvedValue(undefined);
  mocks.openDatabaseAsync.mockResolvedValue({
    closeAsync: vi.fn(),
    getAllAsync: vi.fn(),
  });
  mocks.readDirectoryAsync.mockResolvedValue([]);
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
      "ledgerly-local.db",
      undefined,
      "file:///documents/ledgerly-vault",
    );
    expect(status).toMatchObject({
      databaseName: "ledgerly-local.db",
      fileCollectionCount: 2,
      fileVaultRoot: "ledgerly-vault",
      status: "ready",
      structuredTableCount: 15,
    });
  });
});
