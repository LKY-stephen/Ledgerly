import { describe, expect, it } from "vitest";
import type {
  TaxHelperDerivedField,
  TaxHelperEvidenceFileLink,
} from "@ledgerly/storage";

import {
  buildTaxHelperEmptyStateMessage,
  buildLedgerTaxHelperArchiveFileName,
  buildTaxHelperLauncherState,
  buildArchiveTimestamp,
  buildLedgerTaxHelperArchiveManifest,
  coalesceEvidenceFileLinks,
  createStoredZipArchive,
  getLedgerTaxHelperCopy,
  groupTaxHelperFields,
} from "../src/features/ledger/ledger-tax-helper.shared";

const sampleFields: TaxHelperDerivedField[] = [
  {
    fieldId: "schedule-c-line1",
    fieldName: "Line 1. Gross receipts or sales",
    formName: "Schedule C",
    ledgerImpliedValue: "$2,500.00",
    recordIds: ["record-income"],
    sourceNote: "Line 1 source",
  },
  {
    fieldId: "schedule-se-line2",
    fieldName: "Line 2. Net profit or (loss) from Schedule C",
    formName: "Schedule SE",
    ledgerImpliedValue: "$1,875.00",
    recordIds: ["record-income", "record-expense"],
    sourceNote: "Line 2 source",
  },
];

const sampleEvidenceLinks: TaxHelperEvidenceFileLink[] = [
  {
    evidenceFileId: "file-income",
    evidenceId: "evidence-income",
    mimeType: "application/pdf",
    originalFileName: "income.pdf",
    recordId: "record-income",
    relativePath: "evidence-objects/entity-main/uploads/2026/01/income.pdf",
    vaultCollection: "evidence-objects",
  },
  {
    evidenceFileId: "file-income",
    evidenceId: "evidence-income",
    mimeType: "application/pdf",
    originalFileName: "income.pdf",
    recordId: "record-expense",
    relativePath: "evidence-objects/entity-main/uploads/2026/01/income.pdf",
    vaultCollection: "evidence-objects",
  },
  {
    evidenceFileId: "file-expense",
    evidenceId: "evidence-expense",
    mimeType: "application/pdf",
    originalFileName: "expense.pdf",
    recordId: "record-expense",
    relativePath: "evidence-objects/entity-main/uploads/2026/02/expense.pdf",
    vaultCollection: "evidence-objects",
  },
];

describe("ledger tax helper shared utilities", () => {
  it("groups tax helper rows by form in display order", () => {
    expect(groupTaxHelperFields(sampleFields)).toEqual([
      {
        fields: [sampleFields[0]],
        formName: "Schedule C",
      },
      {
        fields: [sampleFields[1]],
        formName: "Schedule SE",
      },
    ]);
  });

  it("builds launcher and empty-state messages for the helper control flow", () => {
    expect(
      buildTaxHelperLauncherState({
        latestYearLabel: "2026",
        selectedScope: "business",
        yearCount: 2,
      }),
    ).toEqual({
      canOpen: true,
      note: "Latest available tax year: 2026",
    });
    expect(
      buildTaxHelperLauncherState({
        latestYearLabel: null,
        selectedScope: "personal",
        yearCount: 1,
      }),
    ).toEqual({
      canOpen: false,
      note: "Switch back to Business scope to open the tax report helper.",
    });
    expect(
      buildTaxHelperEmptyStateMessage(
        {
          businessRecordCount: 2,
          derivedFields: [],
          exportableRecordIds: [],
          mappedRecordCount: 0,
          notices: [],
        },
        2026,
      ),
    ).toBe(
      "Tax year 2026 has business activity, but no authoritative local tax mappings are ready yet.",
    );
    expect(
      buildTaxHelperLauncherState({
        latestYearLabel: "2026",
        locale: "zh-CN",
        selectedScope: "business",
        yearCount: 2,
      }),
    ).toEqual({
      canOpen: true,
      note: "最新可用税年：2026",
    });
    expect(
      buildTaxHelperLauncherState({
        latestYearLabel: null,
        locale: "zh-CN",
        selectedScope: "personal",
        yearCount: 1,
      }),
    ).toEqual({
      canOpen: false,
      note: "切回经营视角后，才能打开税务辅助。",
    });
    expect(
      buildTaxHelperEmptyStateMessage(
        {
          businessRecordCount: 2,
          derivedFields: [],
          exportableRecordIds: [],
          mappedRecordCount: 0,
          notices: [],
        },
        2026,
        "zh-CN",
      ),
    ).toBe("2026 税年已有经营活动，但还没有可用的本地权威税务映射。");
  });

  it("coalesces evidence links and builds a manifest", () => {
    const evidenceFiles = coalesceEvidenceFileLinks(sampleEvidenceLinks);

    expect(evidenceFiles).toEqual([
      {
        evidenceFileId: "file-income",
        evidenceId: "evidence-income",
        linkedRecordIds: ["record-income", "record-expense"],
        mimeType: "application/pdf",
        originalFileName: "income.pdf",
        relativePath: "evidence-objects/entity-main/uploads/2026/01/income.pdf",
        vaultCollection: "evidence-objects",
      },
      {
        evidenceFileId: "file-expense",
        evidenceId: "evidence-expense",
        linkedRecordIds: ["record-expense"],
        mimeType: "application/pdf",
        originalFileName: "expense.pdf",
        relativePath: "evidence-objects/entity-main/uploads/2026/02/expense.pdf",
        vaultCollection: "evidence-objects",
      },
    ]);

    expect(
      buildLedgerTaxHelperArchiveManifest({
        archiveFileName: "helper.zip",
        derivedFields: sampleFields,
        evidenceFiles,
        exportedAt: "2026-04-06T08:52:00.000Z",
        taxYear: 2026,
      }),
    ).toMatchObject({
      archiveFileName: "helper.zip",
      exportedAt: "2026-04-06T08:52:00.000Z",
      fieldCount: 2,
      taxYear: 2026,
    });
    expect(
      buildLedgerTaxHelperArchiveFileName(
        2026,
        "2026-04-06T08:52:00.000Z",
      ),
    ).toBe("ledger-tax-helper-2026-20260406-085200.zip");
    expect(buildArchiveTimestamp("2026-04-06T08:52:00.000Z")).toBe("20260406-085200");
  });

  it("creates a stored zip archive with the expected entry names", () => {
    const archive = createStoredZipArchive([
      {
        data: new TextEncoder().encode("{\"ok\":true}"),
        name: "manifest.json",
      },
      {
        data: new Uint8Array([1, 2, 3, 4]),
        name: "evidence-objects/entity-main/uploads/2026/01/income.pdf",
      },
    ]);

    expect(listStoredZipEntryNames(archive)).toEqual([
      "manifest.json",
      "evidence-objects/entity-main/uploads/2026/01/income.pdf",
    ]);
  });

  it("formats the export success message with the chosen destination path", () => {
    expect(
      getLedgerTaxHelperCopy("en").exportSaved(
        2,
        "file:///exports/ledger-tax-helper-2026.zip",
      ),
    ).toBe(
      "Saved 2 linked evidence files to file:///exports/ledger-tax-helper-2026.zip.",
    );
    expect(
      getLedgerTaxHelperCopy("zh-CN").exportSaved(
        1,
        "file:///导出/ledger-tax-helper-2026.zip",
      ),
    ).toBe(
      "已将 1 个关联凭证文件保存到 file:///导出/ledger-tax-helper-2026.zip。",
    );
  });
});

function listStoredZipEntryNames(bytes: Uint8Array): string[] {
  const names: string[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;

  while (offset + 4 <= bytes.length) {
    const signature = view.getUint32(offset, true);

    if (signature === 0x04034b50) {
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);
      const fileNameStart = offset + 30;
      const fileNameEnd = fileNameStart + fileNameLength;

      names.push(decoder.decode(bytes.subarray(fileNameStart, fileNameEnd)));
      offset = fileNameEnd + extraFieldLength + compressedSize;
      continue;
    }

    if (signature === 0x02014b50 || signature === 0x06054b50) {
      break;
    }

    throw new Error(`Unexpected zip signature ${signature.toString(16)} at offset ${offset}.`);
  }

  return names;
}
