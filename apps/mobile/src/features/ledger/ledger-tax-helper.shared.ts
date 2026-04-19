import type {
  TaxHelperDerivedField,
  TaxHelperEvidenceFileLink,
  TaxHelperSnapshot,
} from "@ledgerly/storage";

import type { ResolvedLocale } from "../app-shell/types";
import type { LedgerScopeId } from "./ledger-reporting";

export interface LedgerTaxHelperFieldGroup {
  fields: TaxHelperDerivedField[];
  formName: TaxHelperDerivedField["formName"];
}

export interface LedgerTaxHelperArchiveEvidenceFile {
  evidenceFileId: string;
  evidenceId: string;
  linkedRecordIds: string[];
  mimeType: string | null;
  originalFileName: string;
  relativePath: string;
  vaultCollection: string;
}

export interface LedgerTaxHelperArchiveManifest {
  archiveFileName: string;
  evidenceFiles: Array<{
    evidenceFileId: string;
    evidenceId: string;
    linkedRecordIds: string[];
    mimeType: string | null;
    originalFileName: string;
    relativePath: string;
    vaultCollection: string;
  }>;
  exportedAt: string;
  fieldCount: number;
  generatedFrom: Array<{
    fieldId: string;
    fieldName: string;
    formName: string;
    ledgerImpliedValue: string;
    recordIds: string[];
  }>;
  taxYear: number;
}

export interface LedgerTaxHelperLauncherState {
  canOpen: boolean;
  note: string;
}

export interface LedgerTaxHelperCopy {
  close: string;
  derivedRowsSummary: string;
  derivedRowsTitle: string;
  evidenceArchiveSummary: string;
  evidenceArchiveTitle: string;
  exportBuilding: string;
  exportErrorFallback: string;
  exportNoFiles: string;
  exportNoRecords: string;
  exportSaved: (count: number, destinationPath: string) => string;
  exportTrigger: string;
  fieldInfoText: string;
  launcherEyebrow: string;
  launcherSummary: string;
  launcherTitle: string;
  loadError: string;
  loadingYear: string;
  modalEyebrow: string;
  modalSummary: string;
  modalTitle: string;
  openHelper: string;
  webDisabledReason: string;
  yearTitle: string;
}

const formSortOrder: Record<TaxHelperDerivedField["formName"], number> = {
  "Form 1040": 3,
  "Schedule C": 1,
  "Schedule SE": 2,
};

const taxHelperCopyByLocale: Record<ResolvedLocale, LedgerTaxHelperCopy> = {
  en: {
    close: "Close",
    derivedRowsSummary:
      "Each row shows the form name, official field label, and the value currently implied by the local business ledger.",
    derivedRowsTitle: "Derived rows",
    evidenceArchiveSummary:
      "Export the linked evidence binaries for the records behind the currently derived rows. The archive includes a manifest for traceability.",
    evidenceArchiveTitle: "Evidence archive",
    exportBuilding: "Building archive...",
    exportErrorFallback:
      "Unable to export the evidence archive to the selected folder.",
    exportNoFiles: "No linked evidence files were found for the currently derived tax rows.",
    exportNoRecords: "No linked supporting records are available for export in this tax year yet.",
    exportSaved: (count, destinationPath) =>
      `Saved ${count} linked evidence file${count === 1 ? "" : "s"} to ${destinationPath}.`,
    exportTrigger: "Export evidence archive",
    fieldInfoText:
      "Form 1040 remains manual in this helper unless a future local carry-through implementation makes individual rows authoritative.",
    launcherEyebrow: "Tax Report Helper",
    launcherSummary:
      "Review currently supported Schedule C and Schedule SE rows, then export the linked evidence archive for one tax year.",
    launcherTitle: "Preview derived tax rows from the business ledger.",
    loadError: "Unable to load the tax report helper.",
    loadingYear: "Loading local tax support for the selected year...",
    modalEyebrow: "Business-only local tax support",
    modalSummary:
      "Only authoritative rows materialized by the current local tax logic appear here.",
    modalTitle: "Tax report helper",
    openHelper: "Open helper",
    webDisabledReason:
      "This helper depends on the native local database runtime and is not active in the static web preview.",
    yearTitle: "Tax year",
  },
  "zh-CN": {
    close: "关闭",
    derivedRowsSummary: "这里会展示表单名称、官方字段标签，以及当前本地经营账本推导出的值。",
    derivedRowsTitle: "推导行",
    evidenceArchiveSummary:
      "导出当前推导税务行背后关联记录的凭证文件。压缩包会包含一份用于追溯的 manifest。",
    evidenceArchiveTitle: "凭证归档",
    exportBuilding: "正在生成归档...",
    exportErrorFallback: "无法把凭证归档导出到所选文件夹。",
    exportNoFiles: "当前推导出的税务行还没有找到关联的凭证文件。",
    exportNoRecords: "当前税年还没有可导出的关联支撑记录。",
    exportSaved: (count, destinationPath) =>
      `已将 ${count} 个关联凭证文件保存到 ${destinationPath}。`,
    exportTrigger: "导出凭证归档",
    fieldInfoText: "除非后续本地贯通逻辑让单独字段具备权威性，否则 Form 1040 在这里仍保持手动填写。",
    launcherEyebrow: "税务辅助",
    launcherSummary: "查看当前已支持的 Schedule C / Schedule SE 推导行，并按税年导出关联凭证归档。",
    launcherTitle: "从经营账本预览推导出的税务行。",
    loadError: "无法加载税务辅助。",
    loadingYear: "正在加载所选税年的本地税务支持...",
    modalEyebrow: "仅经营视角可用的本地税务支持",
    modalSummary: "这里仅展示当前本地税务逻辑已经能权威推导出的行。",
    modalTitle: "税务辅助",
    openHelper: "打开辅助",
    webDisabledReason: "这个辅助依赖原生端本地数据库运行时，静态 Web 预览中暂不可用。",
    yearTitle: "税年",
  },
};

export function getLedgerTaxHelperCopy(locale: ResolvedLocale): LedgerTaxHelperCopy {
  return taxHelperCopyByLocale[locale];
}

export function buildLedgerTaxHelperArchiveFileName(
  taxYear: number,
  exportedAt: string,
): string {
  return `ledger-tax-helper-${taxYear}-${buildArchiveTimestamp(exportedAt)}.zip`;
}

export function groupTaxHelperFields(
  fields: readonly TaxHelperDerivedField[],
): LedgerTaxHelperFieldGroup[] {
  const groups = new Map<TaxHelperDerivedField["formName"], TaxHelperDerivedField[]>();

  for (const field of fields) {
    const existing = groups.get(field.formName) ?? [];
    existing.push(field);
    groups.set(field.formName, existing);
  }

  return [...groups.entries()]
    .sort((left, right) => formSortOrder[left[0]] - formSortOrder[right[0]])
    .map(([formName, groupedFields]) => ({
      fields: groupedFields,
      formName,
    }));
}

export function buildTaxHelperLauncherState(input: {
  latestYearLabel: string | null;
  locale?: ResolvedLocale;
  selectedScope: LedgerScopeId;
  yearCount: number;
}): LedgerTaxHelperLauncherState {
  const locale = input.locale ?? "en";

  if (input.selectedScope === "personal") {
    return {
      canOpen: false,
      note:
        locale === "zh-CN"
          ? "切回经营视角后，才能打开税务辅助。"
          : "Switch back to Business scope to open the tax report helper.",
    };
  }

  if (input.yearCount === 0) {
    return {
      canOpen: false,
      note:
        locale === "zh-CN"
          ? "新增已入账或已核对的经营记录后，才能解锁税务辅助。"
          : "Add posted or reconciled business records to unlock the tax report helper.",
    };
  }

  return {
    canOpen: true,
    note:
      locale === "zh-CN"
        ? `最新可用税年：${input.latestYearLabel ?? "暂无"}`
        : `Latest available tax year: ${input.latestYearLabel ?? "Unavailable"}`,
  };
}

export function coalesceEvidenceFileLinks(
  links: readonly TaxHelperEvidenceFileLink[],
): LedgerTaxHelperArchiveEvidenceFile[] {
  const grouped = new Map<string, LedgerTaxHelperArchiveEvidenceFile>();

  for (const link of links) {
    const existing = grouped.get(link.evidenceFileId);

    if (existing) {
      if (!existing.linkedRecordIds.includes(link.recordId)) {
        existing.linkedRecordIds.push(link.recordId);
      }
      continue;
    }

    grouped.set(link.evidenceFileId, {
      evidenceFileId: link.evidenceFileId,
      evidenceId: link.evidenceId,
      linkedRecordIds: [link.recordId],
      mimeType: link.mimeType,
      originalFileName: link.originalFileName,
      relativePath: link.relativePath,
      vaultCollection: link.vaultCollection,
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

export function buildLedgerTaxHelperArchiveManifest(input: {
  archiveFileName: string;
  derivedFields: readonly TaxHelperDerivedField[];
  evidenceFiles: readonly LedgerTaxHelperArchiveEvidenceFile[];
  exportedAt: string;
  taxYear: number;
}): LedgerTaxHelperArchiveManifest {
  return {
    archiveFileName: input.archiveFileName,
    evidenceFiles: input.evidenceFiles.map((file) => ({
      evidenceFileId: file.evidenceFileId,
      evidenceId: file.evidenceId,
      linkedRecordIds: [...file.linkedRecordIds],
      mimeType: file.mimeType,
      originalFileName: file.originalFileName,
      relativePath: file.relativePath,
      vaultCollection: file.vaultCollection,
    })),
    exportedAt: input.exportedAt,
    fieldCount: input.derivedFields.length,
    generatedFrom: input.derivedFields.map((field) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      formName: field.formName,
      ledgerImpliedValue: field.ledgerImpliedValue,
      recordIds: [...field.recordIds],
    })),
    taxYear: input.taxYear,
  };
}

export function buildArchiveTimestamp(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "unknown-time";
  }

  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

export function buildTaxHelperEmptyStateMessage(
  snapshot: TaxHelperSnapshot | null,
  selectedYear: number | null,
  locale: ResolvedLocale = "en",
): string {
  if (!snapshot || selectedYear === null) {
    return locale === "zh-CN"
      ? "请选择一个税年查看本地税务支持。"
      : "Select a tax year to review local tax support.";
  }

  if (snapshot.businessRecordCount === 0) {
    return locale === "zh-CN"
      ? `${selectedYear} 税年还没有已入账或已核对的经营记录。`
      : `No posted or reconciled business records are available for tax year ${selectedYear}.`;
  }

  if (snapshot.mappedRecordCount === 0) {
    return locale === "zh-CN"
      ? `${selectedYear} 税年已有经营活动，但还没有可用的本地权威税务映射。`
      : `Tax year ${selectedYear} has business activity, but no authoritative local tax mappings are ready yet.`;
  }

  if (snapshot.notices.length > 0) {
    return locale === "zh-CN"
      ? `${selectedYear} 税年仍存在待审边界，因此暂时还不能展示权威辅助行。`
      : `Tax year ${selectedYear} still has review boundaries, so no authoritative helper rows can be shown yet.`;
  }

  return locale === "zh-CN"
    ? `${selectedYear} 税年当前还没有可展示的权威辅助行。`
    : `No authoritative helper rows are currently available for tax year ${selectedYear}.`;
}

export function createStoredZipArchive(
  entries: ReadonlyArray<{ data: Uint8Array; name: string }>,
): Uint8Array {
  const normalizedEntries = entries.map((entry) => ({
    data: entry.data,
    nameBytes: new TextEncoder().encode(normalizeEntryName(entry.name)),
  }));
  const localFiles: Uint8Array[] = [];
  const centralDirectoryFiles: Uint8Array[] = [];
  let runningOffset = 0;

  for (const entry of normalizedEntries) {
    const crc = computeCrc32(entry.data);
    const dateParts = encodeZipDate(new Date());
    const localHeader = new Uint8Array(30 + entry.nameBytes.length + entry.data.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dateParts.time, true);
    localView.setUint16(12, dateParts.date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, entry.nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(entry.nameBytes, 30);
    localHeader.set(entry.data, 30 + entry.nameBytes.length);
    localFiles.push(localHeader);

    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dateParts.time, true);
    centralView.setUint16(14, dateParts.date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, entry.nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, runningOffset, true);
    centralHeader.set(entry.nameBytes, 46);
    centralDirectoryFiles.push(centralHeader);

    runningOffset += localHeader.length;
  }

  const centralDirectorySize = centralDirectoryFiles.reduce(
    (total, entry) => total + entry.length,
    0,
  );
  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, normalizedEntries.length, true);
  endView.setUint16(10, normalizedEntries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, runningOffset, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([
    ...localFiles,
    ...centralDirectoryFiles,
    endOfCentralDirectory,
  ]);
}

function normalizeEntryName(name: string): string {
  return name.trim().replace(/\\/g, "/").replace(/^\/+/, "");
}

function encodeZipDate(date: Date): { date: number; time: number } {
  const normalizedYear = Math.max(date.getUTCFullYear(), 1980);

  return {
    date:
      ((normalizedYear - 1980) << 9) |
      ((date.getUTCMonth() + 1) << 5) |
      date.getUTCDate(),
    time:
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      Math.floor(date.getUTCSeconds() / 2),
  };
}

function concatUint8Arrays(parts: readonly Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;

    for (let index = 0; index < 8; index += 1) {
      const needsPolynomial = crc & 1;
      crc >>>= 1;

      if (needsPolynomial) {
        crc ^= 0xedb88320;
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
