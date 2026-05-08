import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransientWebSqliteDatabase: vi.fn(),
  getActiveWebDatabase: vi.fn(),
  initializeLocalDatabase: vi.fn(),
  openWebSqliteDatabase: vi.fn(),
  saveDatabaseToIndexedDB: vi.fn(),
  validateDatabasePackageOrThrow: vi.fn(),
  writeVaultFile: vi.fn(),
}));

const tempDatabaseState = vi.hoisted(() => ({
  evidenceFileRows: [] as Array<{ relativePath: string }>,
  evidenceRows: [] as Array<{ filePath: string }>,
}));

vi.mock("@ledgerly/storage", () => ({
  createReadableStorageDatabase: (input: unknown) => input,
  getLocalStorageBootstrapPlan: () => ({
    databaseName: "ledgerly-local.db",
    fileCollections: [{ slug: "evidence-objects" }, { slug: "evidence-manifests" }],
    fileVaultRoot: "ledgerly-vault",
  }),
  legacyFileVaultRootDirectories: ["creator-cfo-vault"],
  legacyStructuredStoreDatabaseNames: ["creator-cfo-local.db"],
}));

vi.mock("../src/storage/web-sqlite", () => ({
  createTransientWebSqliteDatabase: mocks.createTransientWebSqliteDatabase,
  getActiveWebDatabase: mocks.getActiveWebDatabase,
  openWebSqliteDatabase: mocks.openWebSqliteDatabase,
}));

vi.mock("../src/storage/web-persistence", () => ({
  saveDatabaseToIndexedDB: mocks.saveDatabaseToIndexedDB,
}));

vi.mock("../src/storage/web-file-vault", () => ({
  writeVaultFile: mocks.writeVaultFile,
}));

vi.mock("../src/storage/database", () => ({
  initializeLocalDatabase: mocks.initializeLocalDatabase,
}));

vi.mock("../src/storage/storage-package-integrity", () => ({
  validateDatabasePackageOrThrow: mocks.validateDatabasePackageOrThrow,
}));

import {
  importDatabasePackageFromBrowserFiles,
  importDatabasePackageFromBrowserFile,
  importDatabasePackageFromDirectoryHandle,
} from "../src/storage/database-import.web";

class MockFileHandle {
  constructor(
    public name: string,
    private readonly data: Uint8Array,
  ) {}

  async getFile() {
    return {
      arrayBuffer: async () => this.data.buffer.slice(0),
      name: this.name,
    } as File;
  }
}

class MockDirectoryHandle {
  constructor(
    public name: string,
    private readonly directories: Record<string, MockDirectoryHandle> = {},
    private readonly files: Record<string, MockFileHandle> = {},
  ) {}

  async getDirectoryHandle(name: string) {
    const handle = this.directories[name];

    if (!handle) {
      throw new Error(`Missing directory: ${name}`);
    }

    return handle as unknown as FileSystemDirectoryHandle;
  }

  async getFileHandle(name: string) {
    const handle = this.files[name];

    if (!handle) {
      throw new Error(`Missing file: ${name}`);
    }

    return handle as unknown as FileSystemFileHandle;
  }
}

function createMockTransientDatabase() {
  return {
    close: vi.fn(),
    getAllAsync: vi.fn(async (source: string) => {
      if (source.includes("FROM evidence_files")) {
        return tempDatabaseState.evidenceFileRows;
      }

      if (source.includes("FROM evidences")) {
        return tempDatabaseState.evidenceRows;
      }

      return [];
    }),
    getFirstAsync: vi.fn(async () => null),
  };
}

function listRequiredPaths() {
  const relativePaths = new Set<string>();

  for (const row of tempDatabaseState.evidenceFileRows) {
    relativePaths.add(row.relativePath);
  }

  for (const row of tempDatabaseState.evidenceRows) {
    relativePaths.add(row.filePath);
  }

  return [...relativePaths];
}

beforeEach(() => {
  vi.clearAllMocks();
  tempDatabaseState.evidenceFileRows = [];
  tempDatabaseState.evidenceRows = [];

  mocks.createTransientWebSqliteDatabase.mockImplementation(async () => createMockTransientDatabase());
  mocks.getActiveWebDatabase.mockReturnValue(null);
  mocks.openWebSqliteDatabase.mockResolvedValue({
    close: vi.fn(),
    execAsync: vi.fn(),
    exportDatabase: vi.fn(() => new Uint8Array([9, 9, 9])),
    getAllAsync: vi.fn(),
    getFirstAsync: vi.fn(),
    runAsync: vi.fn(),
  });
  mocks.saveDatabaseToIndexedDB.mockResolvedValue(undefined);
  mocks.writeVaultFile.mockResolvedValue(undefined);
  mocks.initializeLocalDatabase.mockResolvedValue(undefined);
  mocks.validateDatabasePackageOrThrow.mockImplementation(async (input) => {
    const requiredPaths = listRequiredPaths();

    for (const relativePath of requiredPaths) {
      const exists = await input.pathExists(`${input.packageRoot}/${relativePath}`);

      if (!exists) {
        throw new Error(`The database package is missing required evidence at ${relativePath}.`);
      }
    }

    return {
      checkedPathCount: requiredPaths.length,
      requiredTableCount: 8,
      tableCompatibility: "current",
    };
  });
});

describe("web database import", () => {
  it("imports a selected local package in the browser and hydrates required vault files", async () => {
    const databaseBytes = new Uint8Array([1, 2, 3, 4]);
    const evidenceBytes = new Uint8Array([5, 6, 7]);
    const activeDb = {
      close: vi.fn(),
      exportDatabase: vi.fn(() => new Uint8Array([8, 8, 8])),
    };

    tempDatabaseState.evidenceRows = [
      { filePath: "evidence-objects/entity-main/uploads/2025/04/receipt.pdf" },
    ];
    mocks.getActiveWebDatabase.mockReturnValue(activeDb);

    const packageRoot = new MockDirectoryHandle(
      "ledgerly-vault",
      {
        "evidence-objects": new MockDirectoryHandle("evidence-objects", {
          "entity-main": new MockDirectoryHandle("entity-main", {
            "uploads": new MockDirectoryHandle("uploads", {
              "2025": new MockDirectoryHandle("2025", {
                "04": new MockDirectoryHandle(
                  "04",
                  {},
                  {
                    "receipt.pdf": new MockFileHandle("receipt.pdf", evidenceBytes),
                  },
                ),
              }),
            }),
          }),
        }),
      },
      {
        "ledgerly-local.db": new MockFileHandle("ledgerly-local.db", databaseBytes),
      },
    );
    const selectedParent = new MockDirectoryHandle("selected-parent", {
      "ledgerly-vault": packageRoot,
    });

    const result = await importDatabasePackageFromDirectoryHandle(selectedParent);

    expect(result).toEqual({
      checkedPathCount: 1,
      importedDatabaseName: "ledgerly-local.db",
      sourcePackageRoot: "browser://ledgerly-vault",
    });
    expect(activeDb.close).toHaveBeenCalledWith({ persist: false });
    expect(mocks.saveDatabaseToIndexedDB).toHaveBeenCalledWith(databaseBytes);
    expect(mocks.writeVaultFile).toHaveBeenCalledWith(
      "evidence-objects/entity-main/uploads/2025/04/receipt.pdf",
      evidenceBytes,
    );
    expect(mocks.initializeLocalDatabase).toHaveBeenCalledTimes(1);
  });

  it("imports a folder-uploaded local package from browser file input fallback", async () => {
    const databaseBytes = new Uint8Array([7, 7, 7]);
    const evidenceBytes = new Uint8Array([6, 6, 6]);

    tempDatabaseState.evidenceRows = [
      { filePath: "evidence-objects/entity-main/uploads/2025/04/receipt.pdf" },
    ];

    const result = await importDatabasePackageFromBrowserFiles([
      {
        arrayBuffer: async () => databaseBytes.buffer.slice(0),
        name: "ledgerly-local.db",
        webkitRelativePath: "selected-parent/ledgerly-vault/ledgerly-local.db",
      },
      {
        arrayBuffer: async () => evidenceBytes.buffer.slice(0),
        name: "receipt.pdf",
        webkitRelativePath:
          "selected-parent/ledgerly-vault/evidence-objects/entity-main/uploads/2025/04/receipt.pdf",
      },
    ]);

    expect(result).toEqual({
      checkedPathCount: 1,
      importedDatabaseName: "ledgerly-local.db",
      sourcePackageRoot: "browser-upload/selected-parent/ledgerly-vault",
    });
    expect(mocks.saveDatabaseToIndexedDB).toHaveBeenCalledWith(databaseBytes);
    expect(mocks.writeVaultFile).toHaveBeenCalledWith(
      "evidence-objects/entity-main/uploads/2025/04/receipt.pdf",
      evidenceBytes,
    );
  });

  it("fails before activation when required sibling evidence is missing from the selected package", async () => {
    const databaseBytes = new Uint8Array([1, 2, 3]);

    tempDatabaseState.evidenceRows = [
      { filePath: "evidence-objects/entity-main/uploads/2025/04/missing.pdf" },
    ];

    const packageRoot = new MockDirectoryHandle(
      "ledgerly-vault",
      {},
      {
        "ledgerly-local.db": new MockFileHandle("ledgerly-local.db", databaseBytes),
      },
    );

    await expect(importDatabasePackageFromDirectoryHandle(packageRoot)).rejects.toThrow(
      "The database package is missing required evidence at evidence-objects/entity-main/uploads/2025/04/missing.pdf.",
    );
    expect(mocks.saveDatabaseToIndexedDB).not.toHaveBeenCalled();
    expect(mocks.writeVaultFile).not.toHaveBeenCalled();
  });

  it("allows a bare local sqlite file when the imported database does not reference sibling evidence", async () => {
    const databaseBytes = new Uint8Array([3, 2, 1]);

    const result = await importDatabasePackageFromBrowserFile({
      arrayBuffer: async () => databaseBytes.buffer.slice(0),
      name: "ledgerly-local.db",
    });

    expect(result).toEqual({
      checkedPathCount: 0,
      importedDatabaseName: "ledgerly-local.db",
      sourcePackageRoot: "browser-upload",
    });
    expect(mocks.saveDatabaseToIndexedDB).toHaveBeenCalledWith(databaseBytes);
    expect(mocks.writeVaultFile).not.toHaveBeenCalled();
  });

  it("rejects a bare local sqlite file when the database references sibling evidence", async () => {
    tempDatabaseState.evidenceRows = [
      { filePath: "evidence-objects/entity-main/uploads/2025/04/receipt.pdf" },
    ];

    await expect(
      importDatabasePackageFromBrowserFile({
        arrayBuffer: async () => new Uint8Array([4, 4, 4]).buffer.slice(0),
        name: "ledgerly-local.db",
      }),
    ).rejects.toThrow("Choose the ledgerly-vault folder");
    expect(mocks.saveDatabaseToIndexedDB).not.toHaveBeenCalled();
  });
});
