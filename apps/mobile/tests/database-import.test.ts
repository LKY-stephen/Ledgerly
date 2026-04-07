import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createManifest: vi.fn(() => ({ version: 4 })),
  getDocumentAsync: vi.fn(),
  pickDirectoryAsync: vi.fn(),
  getInfoAsync: vi.fn(),
  copyAsync: vi.fn(),
  moveAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
  validateDatabasePackageDirectoryOrThrow: vi.fn(),
  getSQLiteDatabase: vi.fn(),
  resetLocalStorageRuntime: vi.fn(),
  platform: { OS: "android" as "android" | "ios" },
}));

const fileSystemState = vi.hoisted(() => {
  const directories = new Set<string>();
  const files = new Set<string>();

  function normalizePath(path: string): string {
    return path.replace(/\/+$/g, "");
  }

  function getUri(value: string | { uri: string }): string {
    return typeof value === "string" ? value : value.uri;
  }

  function joinParts(parts: Array<string | { uri: string }>): string {
    if (!parts.length) {
      throw new Error("A mock path requires at least one segment.");
    }

    return parts.reduce<string>((current, value, index) => {
      const segment = normalizePath(getUri(value));

      if (index === 0) {
        return segment;
      }

      return `${current}/${segment.replace(/^\/+/g, "")}`;
    }, "");
  }

  function getBaseName(path: string): string {
    const normalized = normalizePath(path);
    const separatorIndex = normalized.lastIndexOf("/");
    return separatorIndex >= 0 ? normalized.slice(separatorIndex + 1) : normalized;
  }

  function exists(path: string): boolean {
    const normalized = normalizePath(path);
    return directories.has(normalized) || files.has(normalized);
  }

  function seedDirectory(path: string) {
    directories.add(normalizePath(path));
  }

  function seedFile(path: string) {
    files.add(normalizePath(path));
  }

  function removeTree(path: string) {
    const normalized = normalizePath(path);

    directories.forEach((entry) => {
      if (entry === normalized || entry.startsWith(`${normalized}/`)) {
        directories.delete(entry);
      }
    });
    files.forEach((entry) => {
      if (entry === normalized || entry.startsWith(`${normalized}/`)) {
        files.delete(entry);
      }
    });
  }

  function copyTree(from: string, to: string) {
    const normalizedFrom = normalizePath(from);
    const normalizedTo = normalizePath(to);
    const directoryEntries = [...directories].filter(
      (entry) => entry === normalizedFrom || entry.startsWith(`${normalizedFrom}/`),
    );
    const fileEntries = [...files].filter(
      (entry) => entry === normalizedFrom || entry.startsWith(`${normalizedFrom}/`),
    );

    for (const entry of directoryEntries) {
      directories.add(normalizedTo + entry.slice(normalizedFrom.length));
    }

    for (const entry of fileEntries) {
      files.add(normalizedTo + entry.slice(normalizedFrom.length));
    }
  }

  function moveTree(from: string, to: string) {
    const normalizedFrom = normalizePath(from);
    const normalizedTo = normalizePath(to);
    const directoryEntries = [...directories].filter(
      (entry) => entry === normalizedFrom || entry.startsWith(`${normalizedFrom}/`),
    );
    const fileEntries = [...files].filter(
      (entry) => entry === normalizedFrom || entry.startsWith(`${normalizedFrom}/`),
    );

    for (const entry of directoryEntries) {
      directories.delete(entry);
      directories.add(normalizedTo + entry.slice(normalizedFrom.length));
    }

    for (const entry of fileEntries) {
      files.delete(entry);
      files.add(normalizedTo + entry.slice(normalizedFrom.length));
    }
  }

  function listChildren(path: string) {
    const normalized = normalizePath(path);
    const childNames = new Set<string>();

    for (const entry of [...directories, ...files]) {
      if (!entry.startsWith(`${normalized}/`)) {
        continue;
      }

      const remainder = entry.slice(normalized.length + 1);
      const firstSegment = remainder.split("/")[0];

      if (firstSegment) {
        childNames.add(firstSegment);
      }
    }

    return [...childNames];
  }

  function resolveCopyDestination(
    sourcePath: string,
    destination: { uri: string },
    sourceIsDirectory: boolean,
  ): string {
    const normalizedSource = normalizePath(sourcePath);
    const normalizedDestination = normalizePath(destination.uri);

    if (!sourceIsDirectory) {
      return directories.has(normalizedDestination)
        ? `${normalizedDestination}/${getBaseName(normalizedSource)}`
        : normalizedDestination;
    }

    return directories.has(normalizedDestination)
      ? `${normalizedDestination}/${getBaseName(normalizedSource)}`
      : normalizedDestination;
  }

  class MockDirectory {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = joinParts(parts);
    }

    get exists() {
      return directories.has(this.uri);
    }

    get name() {
      return getBaseName(this.uri);
    }

    create() {
      directories.add(this.uri);
    }

    list() {
      return listChildren(this.uri).map((entry) => {
        const childPath = joinParts([this, entry]);
        return directories.has(childPath) ? new MockDirectory(childPath) : new MockFile(childPath);
      });
    }

    copy(destination: { uri: string }) {
      if (!directories.has(this.uri)) {
        throw new Error(`Cannot copy missing directory ${this.uri}`);
      }

      copyTree(this.uri, resolveCopyDestination(this.uri, destination, true));
    }

    delete() {
      removeTree(this.uri);
    }
  }

  class MockFile {
    uri: string;

    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = joinParts(parts);
    }

    get exists() {
      return files.has(this.uri);
    }

    get name() {
      return getBaseName(this.uri);
    }

    async bytes() {
      if (!files.has(this.uri)) {
        throw new Error(`Cannot read missing file ${this.uri}`);
      }

      return new Uint8Array();
    }

    write(contents: Uint8Array) {
      void contents;
      files.add(this.uri);
    }

    copy(destination: { uri: string }) {
      if (!files.has(this.uri)) {
        throw new Error(`Cannot copy missing file ${this.uri}`);
      }

      files.add(resolveCopyDestination(this.uri, destination, false));
    }
  }

  return {
    directories,
    files,
    exists,
    listChildren,
    MockDirectory,
    MockFile,
    moveTree,
    removeTree,
    seedDirectory,
    seedFile,
  };
});

vi.mock("expo-document-picker", () => ({
  getDocumentAsync: mocks.getDocumentAsync,
}));

vi.mock("expo-file-system", () => ({
  Directory: Object.assign(fileSystemState.MockDirectory, {
    pickDirectoryAsync: mocks.pickDirectoryAsync,
  }),
  File: fileSystemState.MockFile,
}));

vi.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache",
  copyAsync: mocks.copyAsync,
  deleteAsync: mocks.deleteAsync,
  documentDirectory: "file:///documents",
  getInfoAsync: mocks.getInfoAsync,
  makeDirectoryAsync: mocks.makeDirectoryAsync,
  readDirectoryAsync: mocks.readDirectoryAsync,
  writeAsStringAsync: mocks.writeAsStringAsync,
  moveAsync: mocks.moveAsync,
}));

vi.mock("react-native", () => ({
  Platform: mocks.platform,
}));

vi.mock("@creator-cfo/storage", () => ({
  createLocalStorageBootstrapManifest: mocks.createManifest,
  getLocalStorageBootstrapPlan: () => ({
    databaseName: "creator-cfo-local.db",
    fileCollections: [{ slug: "evidence-objects" }, { slug: "evidence-manifests" }],
    fileVaultRoot: "creator-cfo-vault",
  }),
}));

vi.mock("../src/storage/package-environment.native", () => ({
  getCacheDirectoryOrThrow: () => "file:///cache",
  getActiveDatabasePath: () => "file:///active/creator-cfo-local.db",
  getActivePackageRootDirectory: () => "file:///active",
  getDocumentDirectoryOrThrow: () => "file:///documents",
  getPackageBackupDirectory: () => "file:///active-backup",
}));

vi.mock("../src/storage/package-integrity.native", () => ({
  validateDatabasePackageDirectoryOrThrow: mocks.validateDatabasePackageDirectoryOrThrow,
}));

vi.mock("../src/storage/runtime", () => ({
  getSQLiteDatabase: mocks.getSQLiteDatabase,
  resetLocalStorageRuntime: mocks.resetLocalStorageRuntime,
}));

import {
  importDatabasePackageFromFileUri,
  pickAndImportDatabasePackageAsync,
} from "../src/storage/database-import.native";

const { directories, files, seedDirectory, seedFile } = fileSystemState;

beforeEach(() => {
  fileSystemState.directories.clear();
  fileSystemState.files.clear();
  vi.clearAllMocks();
  mocks.platform.OS = "android";

  mocks.getInfoAsync.mockImplementation(async (path: string) => ({
    exists: fileSystemState.exists(path),
    isDirectory: fileSystemState.directories.has(path.replace(/\/+$/g, "")),
  }));

  mocks.makeDirectoryAsync.mockImplementation(async (path: string) => {
    fileSystemState.seedDirectory(path);
  });

  mocks.pickDirectoryAsync.mockResolvedValue(new fileSystemState.MockDirectory("file:///selected-package"));

  mocks.copyAsync.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    if (!fileSystemState.exists(from) || fileSystemState.directories.has(from)) {
      throw new Error(`Cannot copy missing file ${from}`);
    }

    fileSystemState.seedFile(to);
  });

  mocks.moveAsync.mockImplementation(async ({ from, to }: { from: string; to: string }) => {
    if (!fileSystemState.exists(from)) {
      throw new Error(`Cannot move missing path ${from}`);
    }

    fileSystemState.moveTree(from, to);
  });

  mocks.deleteAsync.mockImplementation(async (path: string) => {
    fileSystemState.removeTree(path);
  });

  mocks.writeAsStringAsync.mockImplementation(async (path: string) => {
    fileSystemState.seedFile(path);
  });

  mocks.readDirectoryAsync.mockImplementation(async (path: string) => fileSystemState.listChildren(path));
});

describe("database import", () => {
  it("returns null when the picker is canceled", async () => {
    mocks.getDocumentAsync.mockResolvedValue({
      assets: null,
      canceled: true,
    });

    await expect(pickAndImportDatabasePackageAsync()).resolves.toBeNull();
    expect(mocks.validateDatabasePackageDirectoryOrThrow).not.toHaveBeenCalled();
  });

  it("imports a validated database package into the active package root", async () => {
    seedDirectory("file:///active");
    seedFile("file:///active/creator-cfo-local.db");
    seedDirectory("file:///source");
    seedDirectory("file:///source/evidence-objects");
    seedDirectory("file:///source/evidence-objects/entity-main");
    seedFile("file:///source/creator-cfo-local.db");
    seedFile("file:///source/evidence-objects/entity-main/receipt.pdf");

    mocks.validateDatabasePackageDirectoryOrThrow
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 })
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 });

    const result = await importDatabasePackageFromFileUri({
      displayName: "source.db",
      selectedDatabaseUri: "file:///source/creator-cfo-local.db",
    });

    expect(result).toEqual({
      checkedPathCount: 1,
      importedDatabaseName: "source.db",
      sourcePackageRoot: "file:///source",
    });
    expect(mocks.resetLocalStorageRuntime).toHaveBeenCalledTimes(1);
    expect(mocks.getSQLiteDatabase).toHaveBeenCalledTimes(1);
    expect(files.has("file:///active/creator-cfo-local.db")).toBe(true);
    expect(files.has("file:///active/bootstrap-manifest.json")).toBe(true);
    expect(files.has("file:///active/evidence-objects/entity-main/receipt.pdf")).toBe(true);
  });

  it("restores the previous active package when validation of the imported package fails", async () => {
    seedDirectory("file:///active");
    seedFile("file:///active/creator-cfo-local.db");
    seedDirectory("file:///source");
    seedDirectory("file:///source/evidence-objects");
    seedFile("file:///source/creator-cfo-local.db");
    seedFile("file:///source/evidence-objects/receipt.pdf");

    mocks.validateDatabasePackageDirectoryOrThrow
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 })
      .mockRejectedValueOnce(new Error("Imported package integrity failed."));

    await expect(
      importDatabasePackageFromFileUri({
        displayName: "broken.db",
        selectedDatabaseUri: "file:///source/creator-cfo-local.db",
      }),
    ).rejects.toThrow("Imported package integrity failed.");

    expect(mocks.resetLocalStorageRuntime).toHaveBeenCalledTimes(2);
    expect(files.has("file:///active/creator-cfo-local.db")).toBe(true);
    expect(files.has("file:///active-backup/creator-cfo-local.db")).toBe(false);
  });

  it("adds iOS staging guidance when a picked file cannot expose sibling package files", async () => {
    mocks.platform.OS = "ios";
    mocks.validateDatabasePackageDirectoryOrThrow.mockRejectedValueOnce(
      new Error(
        "The database package is missing required evidence at evidence-objects/entity-main/uploads/2025/02/mock.pdf.",
      ),
    );

    await expect(
      importDatabasePackageFromFileUri({
        displayName: "creator-cfo-local.db",
        selectedDatabaseUri:
          "file:///Users/test/Library/Developer/CoreSimulator/Devices/booted/File%20Provider%20Storage/package-b-mixed/creator-cfo-vault/creator-cfo-local.db",
      }),
    ).rejects.toThrow(
      "On iPhone and iPad, choose the creator-cfo-vault folder, or a folder that contains creator-cfo-vault, in the folder picker. Do not pick creator-cfo-local.db directly.",
    );
  });

  it("imports a picked package folder on iOS without opening the document picker", async () => {
    mocks.platform.OS = "ios";
    seedDirectory("file:///selected-package");
    seedDirectory("file:///selected-package/evidence-objects");
    seedDirectory("file:///selected-package/evidence-objects/entity-main");
    seedFile("file:///selected-package/creator-cfo-local.db");
    seedFile("file:///selected-package/evidence-objects/entity-main/receipt.pdf");

    mocks.validateDatabasePackageDirectoryOrThrow
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 })
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 });

    const result = await pickAndImportDatabasePackageAsync();

    expect(mocks.getDocumentAsync).not.toHaveBeenCalled();
    expect(mocks.pickDirectoryAsync).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      checkedPathCount: 1,
      importedDatabaseName: "creator-cfo-local.db",
      sourcePackageRoot: "file:///selected-package",
    });
    expect(mocks.validateDatabasePackageDirectoryOrThrow).toHaveBeenNthCalledWith(1, {
      databaseDirectory: "file:///cache/creator-cfo-directory-import-stage/selected-package",
      databaseName: "creator-cfo-local.db",
    });
    expect(files.has("file:///active/creator-cfo-local.db")).toBe(true);
    expect(directories.has("file:///cache/creator-cfo-directory-import-stage")).toBe(false);
  });

  it("imports a parent folder that contains creator-cfo-vault on iOS", async () => {
    mocks.platform.OS = "ios";
    mocks.pickDirectoryAsync.mockResolvedValue(
      new fileSystemState.MockDirectory("file:///selected-parent"),
    );
    seedDirectory("file:///selected-parent");
    seedDirectory("file:///selected-parent/creator-cfo-vault");
    seedDirectory("file:///selected-parent/creator-cfo-vault/evidence-objects");
    seedDirectory("file:///selected-parent/creator-cfo-vault/evidence-objects/entity-main");
    seedFile("file:///selected-parent/creator-cfo-vault/creator-cfo-local.db");
    seedFile("file:///selected-parent/creator-cfo-vault/evidence-objects/entity-main/receipt.pdf");

    mocks.validateDatabasePackageDirectoryOrThrow
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 })
      .mockResolvedValueOnce({ checkedPathCount: 1, requiredTableCount: 8 });

    const result = await pickAndImportDatabasePackageAsync();

    expect(result).toEqual({
      checkedPathCount: 1,
      importedDatabaseName: "creator-cfo-local.db",
      sourcePackageRoot: "file:///selected-parent/creator-cfo-vault",
    });
    expect(mocks.validateDatabasePackageDirectoryOrThrow).toHaveBeenNthCalledWith(1, {
      databaseDirectory: "file:///cache/creator-cfo-directory-import-stage/creator-cfo-vault",
      databaseName: "creator-cfo-local.db",
    });
  });

  it("returns null when the iOS folder picker is canceled", async () => {
    mocks.platform.OS = "ios";
    mocks.pickDirectoryAsync.mockRejectedValueOnce(new Error("File picking was cancelled by the user"));

    await expect(pickAndImportDatabasePackageAsync()).resolves.toBeNull();
    expect(mocks.getDocumentAsync).not.toHaveBeenCalled();
  });

  it("shows folder-picker guidance on iOS when the selected folder is not a package root", async () => {
    mocks.platform.OS = "ios";
    mocks.pickDirectoryAsync.mockResolvedValue(
      new fileSystemState.MockDirectory("file:///selected-empty-folder"),
    );
    seedDirectory("file:///selected-empty-folder");

    await expect(pickAndImportDatabasePackageAsync()).rejects.toThrow(
      "The selected folder must be creator-cfo-vault or a folder that contains creator-cfo-vault/creator-cfo-local.db.",
    );
  });
});
