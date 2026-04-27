import {
  loadTaxHelperEvidenceFileLinks,
  loadTaxHelperSnapshot,
  type TaxHelperSnapshot,
} from "@ledgerly/storage";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { LedgerScopeId, LedgerYearOption } from "./ledger-reporting";
import {
  buildTaxHelperEmptyStateMessage,
  buildTaxHelperLauncherState,
  buildLedgerTaxHelperArchiveFileName,
  buildLedgerTaxHelperArchiveManifest,
  coalesceEvidenceFileLinks,
  createStoredZipArchive,
  getLedgerTaxHelperCopy,
  groupTaxHelperFields,
} from "./ledger-tax-helper.shared";
import { defaultEntityId } from "./ledger-domain";
import { useAppShell } from "../app-shell/provider";
import {
  getButtonColors,
  getFeedbackColors,
  withAlpha,
} from "../app-shell/theme-utils";
import {
  createReadableStorageDatabaseFromWeb,
  useWebDatabaseContext,
} from "../../storage/provider.web";
import { readVaultFile } from "../../storage/web-file-vault";

interface LedgerTaxHelperProps {
  selectedScope: LedgerScopeId;
  yearOptions: readonly LedgerYearOption[];
}

type ExportState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

export function LedgerTaxHelper(props: LedgerTaxHelperProps) {
  const { selectedScope, yearOptions } = props;
  const database = useWebDatabaseContext();
  const { palette, resolvedLocale } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");
  const errorColors = getFeedbackColors(palette, "error");
  const successColors = getFeedbackColors(palette, "success");
  const warningColors = getFeedbackColors(palette, "warning");
  const [isVisible, setIsVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(
    yearOptions[0]?.year ?? null,
  );
  const [snapshot, setSnapshot] = useState<TaxHelperSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const helperCopy = useMemo(
    () => getLedgerTaxHelperCopy(resolvedLocale),
    [resolvedLocale],
  );
  const launcherState = useMemo(
    () =>
      buildTaxHelperLauncherState({
        latestYearLabel: yearOptions[0]?.label ?? null,
        locale: resolvedLocale,
        selectedScope,
        yearCount: yearOptions.length,
      }),
    [resolvedLocale, selectedScope, yearOptions],
  );

  useEffect(() => {
    const latestYear = yearOptions[0]?.year ?? null;

    if (!latestYear) {
      setSelectedYear(null);
      return;
    }

    setSelectedYear((current) => {
      if (
        current !== null &&
        yearOptions.some((option) => option.year === current)
      ) {
        return current;
      }

      return latestYear;
    });
  }, [yearOptions]);

  useEffect(() => {
    if (!isVisible || selectedYear === null || yearOptions.length === 0) {
      return;
    }

    let isMounted = true;
    setError(null);
    setIsLoaded(false);
    setSnapshot(null);
    setExportState({ kind: "idle" });

    loadTaxHelperSnapshot(createReadableStorageDatabaseFromWeb(database), {
      entityId: defaultEntityId,
      taxYear: selectedYear,
    })
      .then((nextSnapshot) => {
        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
        setIsLoaded(true);
      })
      .catch((nextError: unknown) => {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error ? nextError.message : helperCopy.loadError,
        );
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [database, helperCopy.loadError, isVisible, selectedYear, yearOptions.length]);

  const fieldGroups = useMemo(
    () => groupTaxHelperFields(snapshot?.derivedFields ?? []),
    [snapshot?.derivedFields],
  );

  const openHelper = () => {
    setExportState({ kind: "idle" });
    setIsVisible(true);
  };

  const closeHelper = () => {
    setIsVisible(false);
    setExportState({ kind: "idle" });
  };

  const exportArchive = async () => {
    if (!snapshot || selectedYear === null || exportState.kind === "running") {
      return;
    }

    setExportState({ kind: "running" });

    try {
      if (!snapshot.exportableRecordIds.length) {
        throw new Error(helperCopy.exportNoRecords);
      }

      const evidenceLinks = await loadTaxHelperEvidenceFileLinks(
        createReadableStorageDatabaseFromWeb(database),
        {
          recordIds: snapshot.exportableRecordIds,
          taxYear: selectedYear,
        },
      );
      const evidenceFiles = coalesceEvidenceFileLinks(evidenceLinks);

      if (!evidenceFiles.length) {
        throw new Error(helperCopy.exportNoFiles);
      }

      const exportedAt = new Date().toISOString();
      const archiveFileName = buildLedgerTaxHelperArchiveFileName(
        selectedYear,
        exportedAt,
      );
      const archiveEntries = await Promise.all([
        Promise.resolve({
          data: new TextEncoder().encode(
            JSON.stringify(
              buildLedgerTaxHelperArchiveManifest({
                archiveFileName,
                derivedFields: snapshot.derivedFields,
                evidenceFiles,
                exportedAt,
                taxYear: selectedYear,
              }),
              null,
              2,
            ),
          ),
          name: "manifest.json",
        }),
        ...evidenceFiles.map(async (file) => {
          const data = await readVaultFile(file.relativePath);

          if (!data) {
            throw new Error(
              resolvedLocale === "zh-CN"
                ? `无法读取关联凭证文件 ${file.relativePath}。`
                : `Unable to read linked evidence file ${file.relativePath}.`,
            );
          }

          return {
            data,
            name: file.relativePath,
          };
        }),
      ]);

      const archiveBytes = createStoredZipArchive(archiveEntries);
      const archiveBuffer = new Uint8Array(archiveBytes.byteLength);
      archiveBuffer.set(archiveBytes);
      const blob = new Blob([archiveBuffer as unknown as BlobPart], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = archiveFileName;
      anchor.click();
      URL.revokeObjectURL(url);

      setExportState({
        kind: "success",
        message: helperCopy.exportSaved(evidenceFiles.length, archiveFileName),
      });
    } catch (nextError) {
      setExportState({
        kind: "error",
        message:
          nextError instanceof Error
            ? nextError.message
            : helperCopy.exportErrorFallback,
      });
    }
  };

  if (selectedScope === "personal") {
    return null;
  }

  const showYearSelector = yearOptions.length > 0;
  const showRows = showYearSelector && selectedYear !== null;

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.paper, borderColor: palette.border },
        ]}
      >
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>
            {helperCopy.launcherEyebrow}
          </Text>
          <Text style={[styles.title, { color: palette.ink }]}>
            {helperCopy.launcherTitle}
          </Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>
            {helperCopy.launcherSummary}
          </Text>
          <Text style={[styles.note, { color: palette.inkMuted }]}>
            {launcherState.note}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openHelper}
          style={[
            styles.button,
            { backgroundColor: primaryButton.background },
          ]}
          testID="ledger-tax-helper-button"
        >
          <Text
            style={[
              styles.buttonLabel,
              { color: primaryButton.text },
            ]}
          >
            {helperCopy.openHelper}
          </Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeHelper}
        transparent
        visible={isVisible}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              backgroundColor: withAlpha(
                palette.ink,
                palette.name === "dark" ? 0.52 : 0.28,
              ),
            },
          ]}
        >
          <Pressable onPress={closeHelper} style={StyleSheet.absoluteFillObject} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.paper, borderColor: palette.border },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <Text style={[styles.modalEyebrow, { color: palette.accent }]}>
                {helperCopy.modalEyebrow}
              </Text>
              <Text style={[styles.modalTitle, { color: palette.ink }]}>
                {helperCopy.modalTitle}
              </Text>
              <Text style={[styles.modalSummary, { color: palette.inkMuted }]}>
                {helperCopy.modalSummary}
              </Text>

              {!showYearSelector ? (
                <Text style={[styles.stateText, { color: palette.inkMuted }]}>
                  {launcherState.note}
                </Text>
              ) : (
                <>
                  <View style={styles.sectionStack}>
                    <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                      {helperCopy.yearTitle}
                    </Text>
                    <View style={styles.yearRow}>
                      {yearOptions.map((option) => {
                        const isSelected = option.year === selectedYear;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            key={option.id}
                            onPress={() => {
                              setSelectedYear(option.year);
                              setExportState({ kind: "idle" });
                            }}
                            style={({ pressed }) => [
                              styles.yearButton,
                              {
                                backgroundColor: isSelected
                                  ? primaryButton.background
                                  : palette.shellElevated,
                                borderColor: isSelected
                                  ? primaryButton.border
                                  : palette.border,
                              },
                              pressed ? styles.buttonPressed : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.yearButtonLabel,
                                {
                                  color: isSelected
                                    ? primaryButton.text
                                    : palette.ink,
                                },
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.sectionStack}>
                    <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                      {helperCopy.derivedRowsTitle}
                    </Text>
                    <Text style={[styles.sectionSummary, { color: palette.inkMuted }]}>
                      {helperCopy.derivedRowsSummary}
                    </Text>

                    {!isLoaded ? (
                      <Text style={[styles.stateText, { color: palette.inkMuted }]}>
                        {helperCopy.loadingYear}
                      </Text>
                    ) : error ? (
                      <Text style={[styles.errorText, { color: errorColors.text }]}>
                        {error}
                      </Text>
                    ) : !showRows || fieldGroups.length === 0 ? (
                      <Text style={[styles.stateText, { color: palette.inkMuted }]}>
                        {buildTaxHelperEmptyStateMessage(
                          snapshot,
                          selectedYear,
                          resolvedLocale,
                        )}
                      </Text>
                    ) : (
                      <>
                        {fieldGroups.map((group) => (
                          <View key={group.formName} style={styles.formGroup}>
                            <Text style={[styles.formTitle, { color: palette.ink }]}>
                              {group.formName}
                            </Text>
                            {group.fields.map((field) => (
                              <View
                                key={field.fieldId}
                                style={[
                                  styles.fieldRow,
                                  {
                                    backgroundColor: palette.shellElevated,
                                    borderColor: palette.border,
                                  },
                                ]}
                              >
                                <View style={styles.fieldCopy}>
                                  <Text style={[styles.fieldName, { color: palette.ink }]}>
                                    {field.fieldName}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.fieldTuple,
                                      { color: palette.inkMuted },
                                    ]}
                                  >
                                    {field.formName} / {field.fieldName}
                                  </Text>
                                </View>
                                <Text style={[styles.fieldValue, { color: palette.accent }]}>
                                  {field.ledgerImpliedValue}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ))}

                        <Text style={[styles.infoText, { color: palette.inkMuted }]}>
                          {helperCopy.fieldInfoText}
                        </Text>
                      </>
                    )}
                  </View>

                  {snapshot?.notices.length ? (
                    <View style={styles.noticeStack}>
                      {snapshot.notices.map((note) => (
                        <Text
                          key={note}
                          style={[styles.noticeText, { color: warningColors.text }]}
                        >
                          {note}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.sectionStack}>
                    <Text style={[styles.sectionTitle, { color: palette.ink }]}>
                      {helperCopy.evidenceArchiveTitle}
                    </Text>
                    <Text style={[styles.sectionSummary, { color: palette.inkMuted }]}>
                      {helperCopy.evidenceArchiveSummary}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        !snapshot?.exportableRecordIds.length ||
                        exportState.kind === "running" ||
                        !isLoaded ||
                        Boolean(error)
                      }
                      onPress={() => {
                        void exportArchive();
                      }}
                      style={({ pressed }) => [
                        styles.exportButton,
                        {
                          backgroundColor:
                            !snapshot?.exportableRecordIds.length ||
                            exportState.kind === "running" ||
                            !isLoaded ||
                            Boolean(error)
                              ? primaryButton.disabledBackground
                              : pressed
                                ? primaryButton.pressedBackground
                                : primaryButton.background,
                        },
                        pressed ? styles.buttonPressed : null,
                      ]}
                      testID="ledger-tax-helper-export-button"
                    >
                      <Text
                        style={[
                          styles.buttonLabel,
                          {
                            color:
                              !snapshot?.exportableRecordIds.length ||
                              exportState.kind === "running" ||
                              !isLoaded ||
                              Boolean(error)
                                ? primaryButton.disabledText
                                : primaryButton.text,
                          },
                        ]}
                      >
                        {exportState.kind === "running"
                          ? helperCopy.exportBuilding
                          : helperCopy.exportTrigger}
                      </Text>
                    </Pressable>
                    {exportState.kind === "success" ? (
                      <Text style={[styles.successText, { color: successColors.text }]}>
                        {exportState.message}
                      </Text>
                    ) : null}
                    {exportState.kind === "error" ? (
                      <Text style={[styles.errorText, { color: errorColors.text }]}>
                        {exportState.message}
                      </Text>
                    ) : null}
                  </View>
                </>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={closeHelper}
                style={[
                  styles.modalButton,
                  { backgroundColor: primaryButton.background },
                ]}
                testID="ledger-tax-helper-web-close-button"
              >
                <Text
                  style={[
                    styles.modalButtonLabel,
                    { color: primaryButton.text },
                  ]}
                >
                  {helperCopy.close}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  card: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 16,
    marginTop: 24,
    padding: 20,
  },
  copy: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
  },
  exportButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
  },
  fieldCopy: {
    flex: 1,
    gap: 4,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  fieldRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  fieldTuple: {
    fontSize: 12,
    lineHeight: 17,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  formGroup: {
    gap: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  modalBackdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalCard: {
    borderRadius: 12,
    borderWidth: 2,
    gap: 16,
    maxHeight: "88%",
    maxWidth: 560,
    padding: 20,
    width: "100%",
  },
  modalScroll: {
    maxHeight: "100%",
    width: "100%",
  },
  modalScrollContent: {
    gap: 16,
  },
  modalEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modalSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  noticeStack: {
    gap: 8,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionStack: {
    gap: 12,
  },
  sectionSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 21,
  },
  successText: {
    fontSize: 13,
    lineHeight: 19,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  yearButton: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  yearButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
