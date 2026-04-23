import {
  createReadableStorageDatabase,
  getLocalStorageBootstrapPlan,
  legacyFileVaultRootDirectories,
  legacyStructuredStoreDatabaseNames,
} from "@ledgerly/storage";

import { initializeLocalDatabase } from "./database";
import { normalizePackageRelativePath } from "./package-paths";
import { validateDatabasePackageOrThrow } from "./storage-package-integrity";
import { saveDatabaseToIndexedDB } from "./web-persistence";
import { writeVaultFile } from "./web-file-vault";
import {
  createTransientWebSqliteDatabase,
  getActiveWebDatabase,
  openWebSqliteDatabase,
  type WebSqliteDatabase,
} from "./web-sqlite";

export interface DatabaseImportResult {
  checkedPathCount: number;
  importedDatabaseName: string;
  sourcePackageRoot: string;
}

type BrowserDirectoryHandle = Pick<
  FileSystemDirectoryHandle,
  "getDirectoryHandle" | "getFileHandle" | "name"
>;
type BrowserFileHandle = Pick<FileSystemFileHandle, "getFile" | "name">;
type BrowserImportFile = Pick<File, "arrayBuffer" | "name"> & {
  webkitRelativePath?: string;
};

interface PreparedImportPayload {
  checkedPathCount: number;
  databaseBytes: Uint8Array;
  importedDatabaseName: string;
  requiredFiles: Array<{ data: Uint8Array; relativePath: string }>;
  sourcePackageRoot: string;
}

interface BrowserUploadedPackageSnapshot {
  databaseFile: BrowserImportFile;
  filesByRelativePath: Map<string, BrowserImportFile>;
  sourcePackageRoot: string;
}

const storagePlan = getLocalStorageBootstrapPlan();
const packageRootDirectoryNames = [storagePlan.fileVaultRoot, ...legacyFileVaultRootDirectories];
const databaseNameCandidates = [storagePlan.databaseName, ...legacyStructuredStoreDatabaseNames];

const WEB_FOLDER_PICKER_GUIDANCE =
  "This database references sibling evidence files. Choose the ledgerly-vault folder, or a folder that contains it, so the browser can load the package locally.";
const WEB_INVALID_PACKAGE_SELECTION =
  "The selected folder must be ledgerly-vault or a folder that contains a valid Ledgerly database package.";

export async function pickAndImportDatabasePackageAsync(): Promise<DatabaseImportResult | null> {
  if (canUseDirectoryPicker()) {
    try {
      const selectedDirectory = await getBrowserWindow().showDirectoryPicker();
      return importDatabasePackageFromDirectoryHandle(selectedDirectory);
    } catch (error) {
      if (isDirectoryPickerCancelledError(error)) {
        return null;
      }

      throw error;
    }
  }

  return pickAndImportDatabaseFileAsync();
}

export async function importDatabasePackageFromDirectoryHandle(
  selectedDirectory: BrowserDirectoryHandle,
): Promise<DatabaseImportResult> {
  const packageRoot = await resolveSelectedPackageRootDirectoryOrThrow(selectedDirectory);
  const databaseFile = await resolvePackageDatabaseFileOrThrow(packageRoot);
  const databaseBytes = await readBrowserFileBytes(await databaseFile.getFile());
  const requiredRelativePaths = await validateWebImportDatabaseOrThrow({
    databaseBytes,
    packageRoot,
    packageRootLabel: packageRoot.name,
  });
  const requiredFiles = await readRequiredPackageFiles(packageRoot, requiredRelativePaths);

  return activatePreparedImport({
    checkedPathCount: requiredRelativePaths.length,
    databaseBytes,
    importedDatabaseName: databaseFile.name,
    requiredFiles,
    sourcePackageRoot: `browser://${packageRoot.name}`,
  });
}

export async function importDatabasePackageFromBrowserFile(
  file: BrowserImportFile,
): Promise<DatabaseImportResult> {
  const databaseBytes = await readBrowserFileBytes(file);
  const requiredRelativePaths = await validateWebImportDatabaseOrThrow({
    databaseBytes,
    packageRoot: null,
    packageRootLabel: "browser-upload",
  });

  return activatePreparedImport({
    checkedPathCount: requiredRelativePaths.length,
    databaseBytes,
    importedDatabaseName: file.name,
    requiredFiles: [],
    sourcePackageRoot: "browser-upload",
  });
}

export async function importDatabasePackageFromBrowserFiles(
  files: BrowserImportFile[],
): Promise<DatabaseImportResult> {
  const uploadedPackage = resolveUploadedPackageSnapshotOrThrow(files);
  const databaseBytes = await readBrowserFileBytes(uploadedPackage.databaseFile);
  const requiredRelativePaths = await validateWebImportDatabaseOrThrow({
    databaseBytes,
    packageRoot: null,
    packageRootLabel: uploadedPackage.sourcePackageRoot,
    pathExists: async (absolutePath: string) => {
      const relativePath = extractPackageRelativePath(absolutePath, uploadedPackage.sourcePackageRoot);
      return uploadedPackage.filesByRelativePath.has(relativePath);
    },
  });
  const requiredFiles = await readRequiredUploadedPackageFiles(
    uploadedPackage.filesByRelativePath,
    requiredRelativePaths,
  );

  return activatePreparedImport({
    checkedPathCount: requiredRelativePaths.length,
    databaseBytes,
    importedDatabaseName: uploadedPackage.databaseFile.name,
    requiredFiles,
    sourcePackageRoot: uploadedPackage.sourcePackageRoot,
  });
}

export function exportDatabaseToFile(): void {
  const db = getActiveWebDatabase();

  if (!db) {
    throw new Error("No active database to export.");
  }

  const data = db.exportDatabase();
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ledgerly-local.db";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function pickAndImportDatabaseFileAsync(): Promise<DatabaseImportResult | null> {
  return new Promise<DatabaseImportResult | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    enableDirectorySelectionOnFileInput(input);

    input.addEventListener("change", async () => {
      const files = Array.from(input.files ?? []) as BrowserImportFile[];

      if (!files.length) {
        resolve(null);
        return;
      }

      try {
        resolve(await importDatabaseSelectionFromFallbackInput(files));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to import database file."),
        );
      }
    });

    input.addEventListener("cancel", () => {
      resolve(null);
    });

    input.click();
  });
}

async function importDatabaseSelectionFromFallbackInput(
  files: BrowserImportFile[],
): Promise<DatabaseImportResult> {
  const shouldTreatAsPackageUpload =
    files.some((file) => Boolean(file.webkitRelativePath && file.webkitRelativePath.includes("/")));

  if (shouldTreatAsPackageUpload) {
    return importDatabasePackageFromBrowserFiles(files);
  }

  return importDatabasePackageFromBrowserFile(files[0]);
}

async function activatePreparedImport(
  prepared: PreparedImportPayload,
): Promise<DatabaseImportResult> {
  const activeDb = getActiveWebDatabase();
  const previousDatabaseBytes = activeDb ? activeDb.exportDatabase() : null;

  if (activeDb) {
    activeDb.close({ persist: false });
  }

  try {
    await saveDatabaseToIndexedDB(prepared.databaseBytes);

    for (const file of prepared.requiredFiles) {
      await writeVaultFile(file.relativePath, file.data);
    }

    const db = await openWebSqliteDatabase();
    await initializeLocalDatabase(db);

    return {
      checkedPathCount: prepared.checkedPathCount,
      importedDatabaseName: prepared.importedDatabaseName,
      sourcePackageRoot: prepared.sourcePackageRoot,
    };
  } catch (error) {
    if (previousDatabaseBytes) {
      await saveDatabaseToIndexedDB(previousDatabaseBytes).catch(() => undefined);
    }

    throw error;
  }
}

async function validateWebImportDatabaseOrThrow(input: {
  databaseBytes: Uint8Array;
  packageRoot: BrowserDirectoryHandle | null;
  packageRootLabel: string;
  pathExists?: (absolutePath: string) => Promise<boolean>;
}): Promise<string[]> {
  const database = await createTransientWebSqliteDatabase(input.databaseBytes);

  try {
    const requiredRelativePaths = await loadRequiredPackageRelativePaths(database);

    try {
      await validateDatabasePackageOrThrow({
        database: createReadableStorageDatabase({
          getAllAsync: <Row>(source: string, ...params: unknown[]) =>
            database.getAllAsync<Row>(source, ...(params as [])),
          getFirstAsync: <Row>(source: string, ...params: unknown[]) =>
            database.getFirstAsync<Row>(source, ...(params as [])),
        }),
        packageRoot: input.packageRootLabel,
        pathExists: async (absolutePath: string) => {
          if (input.pathExists) {
            return input.pathExists(absolutePath);
          }

          if (!input.packageRoot) {
            return false;
          }

          return pathExistsInSelectedPackage(input.packageRoot, input.packageRootLabel, absolutePath);
        },
        tableCompatibility: "current_or_legacy",
      });
    } catch (error) {
      if (!input.packageRoot && requiredRelativePaths.length > 0) {
        throw appendGuidanceToError(error, WEB_FOLDER_PICKER_GUIDANCE);
      }

      throw error;
    }

    return requiredRelativePaths;
  } finally {
    database.close({ persist: false });
  }
}

async function loadRequiredPackageRelativePaths(database: Pick<WebSqliteDatabase, "getAllAsync">) {
  const evidenceFiles = await database.getAllAsync<{ relativePath: string }>(
    `SELECT relative_path AS relativePath
     FROM evidence_files
     WHERE LENGTH(TRIM(COALESCE(relative_path, ''))) > 0
     ORDER BY relative_path ASC;`,
  );
  const evidenceRows = await database.getAllAsync<{ filePath: string }>(
    `SELECT file_path AS filePath
     FROM evidences
     WHERE LENGTH(TRIM(COALESCE(file_path, ''))) > 0
     ORDER BY file_path ASC;`,
  );
  const relativePaths = new Set<string>();

  for (const row of evidenceFiles) {
    relativePaths.add(normalizePackageRelativePath(row.relativePath));
  }

  for (const row of evidenceRows) {
    relativePaths.add(normalizePackageRelativePath(row.filePath));
  }

  return [...relativePaths].sort((left, right) => left.localeCompare(right));
}

async function readRequiredPackageFiles(
  packageRoot: BrowserDirectoryHandle,
  relativePaths: string[],
): Promise<Array<{ data: Uint8Array; relativePath: string }>> {
  const requiredFiles: Array<{ data: Uint8Array; relativePath: string }> = [];

  for (const relativePath of relativePaths) {
    const fileHandle = await resolvePackageFileByRelativePathOrThrow(packageRoot, relativePath);
    const file = await fileHandle.getFile();
    requiredFiles.push({
      data: await readBrowserFileBytes(file),
      relativePath,
    });
  }

  return requiredFiles;
}

async function readRequiredUploadedPackageFiles(
  filesByRelativePath: Map<string, BrowserImportFile>,
  relativePaths: string[],
): Promise<Array<{ data: Uint8Array; relativePath: string }>> {
  const requiredFiles: Array<{ data: Uint8Array; relativePath: string }> = [];

  for (const relativePath of relativePaths) {
    const file = filesByRelativePath.get(relativePath);

    if (!file) {
      throw new Error(`The database package is missing required evidence at ${relativePath}.`);
    }

    requiredFiles.push({
      data: await readBrowserFileBytes(file),
      relativePath,
    });
  }

  return requiredFiles;
}

function resolveUploadedPackageSnapshotOrThrow(
  files: BrowserImportFile[],
): BrowserUploadedPackageSnapshot {
  const uploadedEntries = files.map((file) => ({
    file,
    selectionPath: normalizeSelectionPath(file.webkitRelativePath || file.name),
  }));
  const candidateRoots = new Set<string>();

  for (const entry of uploadedEntries) {
    const segments = entry.selectionPath.split("/");

    for (let index = 0; index < segments.length; index += 1) {
      if (!packageRootDirectoryNames.includes(segments[index])) {
        continue;
      }

      candidateRoots.add(segments.slice(0, index + 1).join("/"));
    }
  }

  for (const candidateRoot of candidateRoots) {
    const filesByRelativePath = new Map<string, BrowserImportFile>();
    let databaseFile: BrowserImportFile | null = null;

    for (const entry of uploadedEntries) {
      const relativePath = extractPackageRelativePath(entry.selectionPath, candidateRoot);

      if (!relativePath) {
        continue;
      }

      filesByRelativePath.set(relativePath, entry.file);

      if (!databaseFile && databaseNameCandidates.includes(relativePath)) {
        databaseFile = entry.file;
      }
    }

    if (databaseFile) {
      return {
        databaseFile,
        filesByRelativePath,
        sourcePackageRoot: `browser-upload/${candidateRoot}`,
      };
    }
  }

  throw new Error(WEB_INVALID_PACKAGE_SELECTION);
}

async function pathExistsInSelectedPackage(
  packageRoot: BrowserDirectoryHandle,
  packageRootLabel: string,
  absolutePath: string,
) {
  const normalizedAbsolutePath = absolutePath.trim();
  const prefix = `${packageRootLabel}/`;
  const relativePath = normalizedAbsolutePath.startsWith(prefix)
    ? normalizedAbsolutePath.slice(prefix.length)
    : normalizedAbsolutePath;

  if (!relativePath) {
    return true;
  }

  try {
    await resolvePackageFileByRelativePathOrThrow(packageRoot, relativePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSelectedPackageRootDirectoryOrThrow(
  selectedDirectory: BrowserDirectoryHandle,
): Promise<BrowserDirectoryHandle> {
  if (packageRootDirectoryNames.includes(selectedDirectory.name)) {
    return selectedDirectory;
  }

  for (const candidate of packageRootDirectoryNames) {
    const nestedDirectory = await getDirectoryHandleIfExists(selectedDirectory, candidate);

    if (nestedDirectory) {
      return nestedDirectory;
    }
  }

  throw new Error(WEB_INVALID_PACKAGE_SELECTION);
}

async function resolvePackageDatabaseFileOrThrow(
  packageRoot: BrowserDirectoryHandle,
): Promise<BrowserFileHandle> {
  for (const databaseName of databaseNameCandidates) {
    const fileHandle = await getFileHandleIfExists(packageRoot, databaseName);

    if (fileHandle) {
      return fileHandle;
    }
  }

  throw new Error(WEB_INVALID_PACKAGE_SELECTION);
}

async function resolvePackageFileByRelativePathOrThrow(
  packageRoot: BrowserDirectoryHandle,
  relativePath: string,
): Promise<BrowserFileHandle> {
  const normalizedPath = normalizePackageRelativePath(relativePath);
  const segments = normalizedPath.split("/");
  let currentDirectory = packageRoot;

  for (let index = 0; index < segments.length - 1; index += 1) {
    currentDirectory = await currentDirectory.getDirectoryHandle(segments[index]);
  }

  return currentDirectory.getFileHandle(segments[segments.length - 1]);
}

async function getDirectoryHandleIfExists(
  parent: BrowserDirectoryHandle,
  name: string,
): Promise<BrowserDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function getFileHandleIfExists(
  parent: BrowserDirectoryHandle,
  name: string,
): Promise<BrowserFileHandle | null> {
  try {
    return await parent.getFileHandle(name);
  } catch {
    return null;
  }
}

async function readBrowserFileBytes(file: BrowserImportFile): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

function appendGuidanceToError(error: unknown, guidance: string) {
  if (!(error instanceof Error)) {
    return new Error(guidance);
  }

  if (error.message.includes(guidance)) {
    return error;
  }

  return new Error(`${error.message} ${guidance}`);
}

function enableDirectorySelectionOnFileInput(input: HTMLInputElement) {
  input.setAttribute("webkitdirectory", "");
  input.setAttribute("directory", "");

  const directoryCapableInput = input as HTMLInputElement & {
    directory?: boolean;
    webkitdirectory?: boolean;
  };

  directoryCapableInput.webkitdirectory = true;
  directoryCapableInput.directory = true;
}

function canUseDirectoryPicker() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function getBrowserWindow() {
  return window as unknown as Window & {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  };
}

function isDirectoryPickerCancelledError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.message.toLowerCase().includes("abort");
}

function normalizeSelectionPath(path: string) {
  const trimmed = path.trim().replace(/\\/g, "/");
  const segments = trimmed.split("/").filter(Boolean);

  if (!segments.length) {
    throw new Error(WEB_INVALID_PACKAGE_SELECTION);
  }

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error(WEB_INVALID_PACKAGE_SELECTION);
    }
  }

  return segments.join("/");
}

function extractPackageRelativePath(path: string, packageRootPrefix: string) {
  const normalizedPath = normalizeSelectionPath(path);
  const normalizedPrefix = normalizeSelectionPath(packageRootPrefix);

  if (normalizedPath === normalizedPrefix) {
    return "";
  }

  const prefixWithSlash = `${normalizedPrefix}/`;

  if (!normalizedPath.startsWith(prefixWithSlash)) {
    return "";
  }

  return normalizedPath.slice(prefixWithSlash.length);
}
