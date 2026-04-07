import * as DocumentPicker from "expo-document-picker";
import { Directory, File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  createLocalStorageBootstrapManifest,
  getLocalStorageBootstrapPlan,
} from "@creator-cfo/storage";

import {
  getCacheDirectoryOrThrow,
  getActiveDatabasePath,
  getDocumentDirectoryOrThrow,
  getActivePackageRootDirectory,
  getPackageBackupDirectory,
} from "./package-environment.native";
import { validateDatabasePackageDirectoryOrThrow } from "./package-integrity.native";
import {
  getBaseName,
  getParentDirectory,
  isPathWithinDirectory,
  joinPathSegments,
  trimTrailingSlashes,
} from "./package-paths";
import { getSQLiteDatabase, resetLocalStorageRuntime } from "./runtime";

export interface DatabaseImportResult {
  checkedPathCount: number;
  importedDatabaseName: string;
  sourcePackageRoot: string;
}

type PickedDirectoryHandle = InstanceType<typeof Directory> & {
  uri: string;
  name: string;
  exists: boolean;
  create(options?: { idempotent?: boolean; intermediates?: boolean; overwrite?: boolean }): void;
  list(): Array<InstanceType<typeof Directory> | InstanceType<typeof File>>;
  copy(destination: PickedDirectoryHandle | PickedFileHandle): void;
};

type PickedFileHandle = InstanceType<typeof File> & {
  uri: string;
  name: string;
  exists: boolean;
  bytes(): Promise<Uint8Array>;
  copy(destination: PickedDirectoryHandle | PickedFileHandle): void;
  write(content: string | Uint8Array, options?: { append?: boolean; encoding?: "utf8" | "base64" }): void;
};

const IOS_PACKAGE_STAGING_GUIDANCE =
  "On iPhone and iPad, choose the creator-cfo-vault folder, or a folder that contains creator-cfo-vault, in the folder picker. Do not pick creator-cfo-local.db directly.";
const IOS_DIRECTORY_IMPORT_STAGE_NAME = "creator-cfo-directory-import-stage";

export async function pickAndImportDatabasePackageAsync(): Promise<DatabaseImportResult | null> {
  if (Platform.OS === "ios") {
    return pickAndImportDatabasePackageDirectoryAsync();
  }

  const result = await DocumentPicker.getDocumentAsync({
    // Preserve the picked package root when iOS grants a provider URL instead of a sandbox copy.
    copyToCacheDirectory: false,
    multiple: false,
    type: ["application/vnd.sqlite3", "application/x-sqlite3", "application/octet-stream", "*/*"],
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const selectedAsset = result.assets[0];

  return importDatabasePackageFromFileUri({
    displayName: selectedAsset.name || getBaseName(selectedAsset.uri),
    selectedDatabaseUri: selectedAsset.uri,
  });
}

async function pickAndImportDatabasePackageDirectoryAsync(): Promise<DatabaseImportResult | null> {
  try {
    const selectedDirectory = asPickedDirectoryHandle(await Directory.pickDirectoryAsync());
    const packageRootDirectory = resolveSelectedPackageRootDirectoryOrThrow(selectedDirectory);
    const storagePlan = getLocalStorageBootstrapPlan();
    const stagedPackageRoot = await stageSelectedIosPackageDirectoryAsync(packageRootDirectory);
    const selectedDatabaseUri = createPickedFileHandle(stagedPackageRoot, storagePlan.databaseName).uri;
    const resolvedPackageRoot = trimTrailingSlashes(packageRootDirectory.uri);

    console.info(
      `[database import] selected iOS package directory ${selectedDirectory.uri}, resolved package root ${resolvedPackageRoot}, staged package root ${trimTrailingSlashes(stagedPackageRoot.uri)}`,
    );

    try {
      const result = await importDatabasePackageFromFileUri({
        displayName: storagePlan.databaseName,
        selectedDatabaseUri,
      });

      return {
        ...result,
        sourcePackageRoot: resolvedPackageRoot,
      };
    } finally {
      await removeIfExists(createPickedDirectoryHandle(getCacheDirectoryOrThrow(), IOS_DIRECTORY_IMPORT_STAGE_NAME).uri);
    }
  } catch (error) {
    if (isDirectoryPickerCancelledError(error)) {
      return null;
    }

    throw error;
  }
}

export async function importDatabasePackageFromFileUri(input: {
  displayName: string;
  selectedDatabaseUri: string;
}): Promise<DatabaseImportResult> {
  const storagePlan = getLocalStorageBootstrapPlan();
  const activePackageRoot = getActivePackageRootDirectory();
  const backupPackageRoot = getPackageBackupDirectory();
  const sourcePackageRoot = getParentDirectory(input.selectedDatabaseUri);
  const selectedDatabaseName = getBaseName(input.selectedDatabaseUri);
  const selectedFromExternalIosLocation = shouldGuideIosPackageStaging(input.selectedDatabaseUri);

  console.info(
    `[database import] starting import for ${input.displayName} from ${input.selectedDatabaseUri}`,
  );

  if (sourcePackageRoot === activePackageRoot) {
    const validation = await validateDatabasePackageDirectoryOrThrow({
      databaseDirectory: activePackageRoot,
      databaseName: storagePlan.databaseName,
    });

    await resetLocalStorageRuntime();
    await getSQLiteDatabase();
    console.info(
      `[database import] validated already-staged package at ${activePackageRoot} (${validation.checkedPathCount} path(s) checked)`,
    );

    return {
      checkedPathCount: validation.checkedPathCount,
      importedDatabaseName: input.displayName,
      sourcePackageRoot,
    };
  }

  const sourceValidation = await validateSourcePackageOrThrow({
    databaseDirectory: sourcePackageRoot,
    databaseName: selectedDatabaseName,
    selectedDatabaseUri: input.selectedDatabaseUri,
    selectedFromExternalIosLocation,
  });

  await resetLocalStorageRuntime();
  await removeIfExists(backupPackageRoot);

  const activePackageInfo = await FileSystem.getInfoAsync(activePackageRoot);

  if (activePackageInfo.exists) {
    await FileSystem.moveAsync({
      from: activePackageRoot,
      to: backupPackageRoot,
    });
  }

  try {
    await FileSystem.makeDirectoryAsync(activePackageRoot, { intermediates: true });
    await copySelectedPackageIntoActiveRoot({
      activePackageRoot,
      fileCollectionSlugs: storagePlan.fileCollections.map((collection) => collection.slug),
      selectedDatabaseUri: input.selectedDatabaseUri,
      selectedFromExternalIosLocation,
      sourcePackageRoot,
    });

    await FileSystem.writeAsStringAsync(
      joinPathSegments(activePackageRoot, "bootstrap-manifest.json"),
      JSON.stringify(createLocalStorageBootstrapManifest(), null, 2),
    );

    await validateDatabasePackageDirectoryOrThrow({
      databaseDirectory: activePackageRoot,
      databaseName: storagePlan.databaseName,
    });
    await getSQLiteDatabase();
    console.info(
      `[database import] imported database package into ${activePackageRoot} (${sourceValidation.checkedPathCount} path(s) checked at source)`,
    );

    return {
      checkedPathCount: sourceValidation.checkedPathCount,
      importedDatabaseName: input.displayName,
      sourcePackageRoot,
    };
  } catch (error) {
    await resetLocalStorageRuntime();
    await removeIfExists(activePackageRoot);

    const backupInfo = await FileSystem.getInfoAsync(backupPackageRoot);

    if (backupInfo.exists) {
      await FileSystem.moveAsync({
        from: backupPackageRoot,
        to: activePackageRoot,
      });
    }

    console.error(
      `[database import] failed for ${input.displayName} from ${input.selectedDatabaseUri}: ${formatImportErrorMessage(error)}`,
    );

    throw error;
  }
}

async function validateSourcePackageOrThrow(input: {
  databaseDirectory: string;
  databaseName: string;
  selectedDatabaseUri: string;
  selectedFromExternalIosLocation: boolean;
}) {
  try {
    return await validateDatabasePackageDirectoryOrThrow({
      databaseDirectory: input.databaseDirectory,
      databaseName: input.databaseName,
    });
  } catch (error) {
    const wrappedError = wrapSourceAccessError(
      error,
      input.selectedDatabaseUri,
      input.selectedFromExternalIosLocation,
    );
    console.error(
      `[database import] source validation failed for ${input.selectedDatabaseUri}: ${wrappedError.message}`,
    );
    throw wrappedError;
  }
}

async function copySelectedPackageIntoActiveRoot(input: {
  activePackageRoot: string;
  fileCollectionSlugs: string[];
  selectedDatabaseUri: string;
  selectedFromExternalIosLocation: boolean;
  sourcePackageRoot: string;
}) {
  try {
    await FileSystem.copyAsync({
      from: input.selectedDatabaseUri,
      to: getActiveDatabasePath(),
    });

    for (const slug of input.fileCollectionSlugs) {
      await copyDirectoryIfExists(
        joinPathSegments(input.sourcePackageRoot, slug),
        joinPathSegments(input.activePackageRoot, slug),
      );
    }
  } catch (error) {
    throw wrapSourceAccessError(error, input.selectedDatabaseUri, input.selectedFromExternalIosLocation);
  }
}

async function copyDirectoryIfExists(sourceDirectory: string, targetDirectory: string): Promise<void> {
  const sourceInfo = await FileSystem.getInfoAsync(sourceDirectory);

  if (!sourceInfo.exists) {
    return;
  }

  await copyDirectoryRecursive(sourceDirectory, targetDirectory);
}

async function copyDirectoryRecursive(sourceDirectory: string, targetDirectory: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
  const entries = await FileSystem.readDirectoryAsync(sourceDirectory);

  for (const entry of entries) {
    const sourcePath = joinPathSegments(sourceDirectory, entry);
    const targetPath = joinPathSegments(targetDirectory, entry);
    const sourceInfo = await FileSystem.getInfoAsync(sourcePath);

    if (sourceInfo.isDirectory) {
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    await FileSystem.copyAsync({
      from: sourcePath,
      to: targetPath,
    });
  }
}

async function removeIfExists(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);

  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(path, { idempotent: true });
}

function shouldGuideIosPackageStaging(selectedDatabaseUri: string): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }

  return !isPathWithinDirectory(selectedDatabaseUri, getDocumentDirectoryOrThrow());
}

function wrapSourceAccessError(
  error: unknown,
  selectedDatabaseUri: string,
  selectedFromExternalIosLocation: boolean,
): Error {
  const normalizedError =
    error instanceof Error ? error : new Error(typeof error === "string" ? error : "Database import failed.");

  if (!selectedFromExternalIosLocation || normalizedError.message.includes(IOS_PACKAGE_STAGING_GUIDANCE)) {
    return normalizedError;
  }

  return new Error(
    `${normalizedError.message} ${IOS_PACKAGE_STAGING_GUIDANCE} Selected file: ${decodeURIComponent(selectedDatabaseUri)}`,
  );
}

function formatImportErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveSelectedPackageRootDirectoryOrThrow(
  selectedDirectory: PickedDirectoryHandle,
): PickedDirectoryHandle {
  const storagePlan = getLocalStorageBootstrapPlan();
  const directDatabase = createPickedFileHandle(selectedDirectory, storagePlan.databaseName);

  if (directDatabase.exists) {
    return selectedDirectory;
  }

  const nestedPackageRoot = createPickedDirectoryHandle(selectedDirectory, storagePlan.fileVaultRoot);
  const nestedDatabase = createPickedFileHandle(nestedPackageRoot, storagePlan.databaseName);

  if (nestedPackageRoot.exists && nestedDatabase.exists) {
    return nestedPackageRoot;
  }

  throw new Error(
    `The selected folder must be creator-cfo-vault or a folder that contains creator-cfo-vault/${storagePlan.databaseName}.`,
  );
}

async function stageSelectedIosPackageDirectoryAsync(
  sourcePackageRoot: PickedDirectoryHandle,
): Promise<PickedDirectoryHandle> {
  const stagingParent = createPickedDirectoryHandle(
    getCacheDirectoryOrThrow(),
    IOS_DIRECTORY_IMPORT_STAGE_NAME,
  );
  const stagedPackageRoot = createPickedDirectoryHandle(stagingParent, sourcePackageRoot.name);

  await removeIfExists(stagingParent.uri);
  stagingParent.create({ idempotent: true, intermediates: true });
  stagedPackageRoot.create({ idempotent: true, intermediates: true });
  await copyPickedDirectoryIntoLocalSandboxAsync(sourcePackageRoot, stagedPackageRoot);

  return stagedPackageRoot;
}

async function copyPickedDirectoryIntoLocalSandboxAsync(
  sourceDirectory: PickedDirectoryHandle,
  targetDirectory: PickedDirectoryHandle,
): Promise<void> {
  for (const entry of sourceDirectory.list()) {
    if (entry instanceof Directory) {
      const sourceChildDirectory = asPickedDirectoryHandle(entry);
      const targetChildDirectory = createPickedDirectoryHandle(targetDirectory, sourceChildDirectory.name);
      targetChildDirectory.create({ idempotent: true, intermediates: true });
      await copyPickedDirectoryIntoLocalSandboxAsync(sourceChildDirectory, targetChildDirectory);
      continue;
    }

    if (entry instanceof File) {
      const sourceChildFile = asPickedFileHandle(entry);
      const targetChildFile = createPickedFileHandle(targetDirectory, sourceChildFile.name);
      targetChildFile.write(await sourceChildFile.bytes());
      continue;
    }

    throw new Error(`Unsupported file-system entry returned while importing ${sourceDirectory.uri}.`);
  }
}

function asPickedDirectoryHandle(directory: InstanceType<typeof Directory>): PickedDirectoryHandle {
  return directory as PickedDirectoryHandle;
}

function asPickedFileHandle(file: InstanceType<typeof File>): PickedFileHandle {
  return file as PickedFileHandle;
}

function createPickedDirectoryHandle(
  ...parts: Array<string | PickedDirectoryHandle | PickedFileHandle>
): PickedDirectoryHandle {
  return asPickedDirectoryHandle(new Directory(...(parts as Array<string | Directory | File>)));
}

function createPickedFileHandle(
  ...parts: Array<string | PickedDirectoryHandle | PickedFileHandle>
): PickedFileHandle {
  return asPickedFileHandle(new File(...(parts as Array<string | Directory | File>)));
}

function isDirectoryPickerCancelledError(error: unknown): boolean {
  return error instanceof Error && /file picking was cancelled by the user/i.test(error.message);
}
