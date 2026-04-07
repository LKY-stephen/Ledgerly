export function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/g, "");
}

export function trimLeadingSlashes(value: string): string {
  return value.replace(/^\/+/g, "");
}

export function joinPathSegments(base: string, segment: string): string {
  return `${trimTrailingSlashes(base)}/${trimLeadingSlashes(segment)}`;
}

export function getParentDirectory(path: string): string {
  const trimmed = trimTrailingSlashes(path);
  const separatorIndex = trimmed.lastIndexOf("/");

  if (separatorIndex <= "file://".length) {
    throw new Error("The selected database file must live inside an accessible directory.");
  }

  return trimmed.slice(0, separatorIndex);
}

export function getBaseName(path: string): string {
  const trimmed = trimTrailingSlashes(path);
  const separatorIndex = trimmed.lastIndexOf("/");
  return separatorIndex >= 0 ? trimmed.slice(separatorIndex + 1) : trimmed;
}

export function normalizePackageRelativePath(relativePath: string): string {
  const trimmed = relativePath.trim().replace(/\\/g, "/");

  if (!trimmed) {
    throw new Error("Evidence path cannot be empty.");
  }

  if (/^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    throw new Error(`Evidence path must stay package-relative: ${relativePath}`);
  }

  const segments = trimmed.split("/").filter(Boolean);

  if (!segments.length) {
    throw new Error("Evidence path must contain at least one path segment.");
  }

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error(`Evidence path cannot escape the active package: ${relativePath}`);
    }
  }

  return segments.join("/");
}

export function buildPackageAbsolutePath(packageRoot: string, relativePath: string): string {
  return joinPathSegments(packageRoot, normalizePackageRelativePath(relativePath));
}

export function isPathWithinDirectory(path: string, directory: string): boolean {
  const normalizedPath = trimTrailingSlashes(path);
  const normalizedDirectory = trimTrailingSlashes(directory);

  return (
    normalizedPath === normalizedDirectory || normalizedPath.startsWith(`${normalizedDirectory}/`)
  );
}
