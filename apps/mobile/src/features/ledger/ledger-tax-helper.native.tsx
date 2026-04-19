import { Directory, File } from "expo-file-system";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  loadTaxHelperEvidenceFileLinks,
  loadTaxHelperSnapshot,
  type TaxHelperSnapshot,
} from "@ledgerly/storage";

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
} from "../app-shell/theme-utils";
import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { getActivePackageRootDirectory } from "../../storage/package-environment.native";
import { buildPackageAbsolutePath } from "../../storage/package-paths";
import { createReadableStorageDatabase } from "../../storage/storage-adapter";

interface LedgerTaxHelperProps {
  selectedScope: LedgerScopeId;
  yearOptions: readonly LedgerYearOption[];
}

type ExportState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

type WritableFileHandle = InstanceType<typeof File> & {
  bytes(): Promise<Uint8Array>;
  uri: string;
  write(
    content: string | Uint8Array,
    options?: { append?: boolean; encoding?: "utf8" | "base64" },
  ): void;
};

export function LedgerTaxHelper(props: LedgerTaxHelperProps) {
  const { selectedScope, yearOptions } = props;
  const { palette, resolvedLocale } = useAppShell();
  const primaryButton = getButtonColors(palette, "primary");
  const errorColors = getFeedbackColors(palette, "error");
  const successColors = getFeedbackColors(palette, "success");
  const warningColors = getFeedbackColors(palette, "warning");
  const database = useSQLiteContext();
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
  const canOpen = launcherState.canOpen;

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
    if (isVisible && !canOpen) {
      setIsVisible(false);
      setExportState({ kind: "idle" });
    }
  }, [canOpen, isVisible]);

  useEffect(() => {
    if (!isVisible || !canOpen || selectedYear === null) {
      return;
    }

    let isMounted = true;
    setError(null);
    setIsLoaded(false);
    setSnapshot(null);
    setExportState({ kind: "idle" });

    loadTaxHelperSnapshot(createReadableStorageDatabase(database), {
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
  }, [canOpen, database, helperCopy.loadError, isVisible, selectedYear]);

  const fieldGroups = useMemo(
    () => groupTaxHelperFields(snapshot?.derivedFields ?? []),
    [snapshot?.derivedFields],
  );

  const openHelper = () => {
    if (!canOpen) {
      return;
    }

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
        createReadableStorageDatabase(database),
        {
          recordIds: snapshot.exportableRecordIds,
          taxYear: selectedYear,
        },
      );
      const evidenceFiles = coalesceEvidenceFileLinks(evidenceLinks);

      if (!evidenceFiles.length) {
        throw new Error(helperCopy.exportNoFiles);
      }

      const packageRoot = getActivePackageRootDirectory();
      const exportedAt = new Date().toISOString();
      const archiveFileName = buildLedgerTaxHelperArchiveFileName(
        selectedYear,
        exportedAt,
      );
      const destinationDirectory = await pickExportDirectoryAsync();

      if (!destinationDirectory) {
        setExportState({ kind: "idle" });
        return;
      }

      const archiveFile = asWritableFileHandle(
        new File(destinationDirectory, archiveFileName),
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
          const absolutePath = buildPackageAbsolutePath(
            packageRoot,
            file.relativePath,
          );

          try {
            return {
              data: await asWritableFileHandle(new File(absolutePath)).bytes(),
              name: file.relativePath,
            };
          } catch (nextError) {
            throw new Error(
              resolvedLocale === "zh-CN"
                ? `无法读取关联凭证文件 ${file.relativePath}: ${nextError instanceof Error ? nextError.message : "未知错误"}`
                : `Unable to read linked evidence file ${file.relativePath}: ${
                    nextError instanceof Error
                      ? nextError.message
                      : "unknown error"
                  }`,
            );
          }
        }),
      ]);

      archiveFile.write(createStoredZipArchive(archiveEntries));

      setExportState({
        kind: "success",
        message: helperCopy.exportSaved(
          evidenceFiles.length,
          archiveFile.uri,
        ),
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

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.paper, borderColor: palette.border },
        ]}
      >
        <View style={styles.cardCopy}>
          <Text style={[styles.cardEyebrow, { color: palette.accent }]}>
            {helperCopy.launcherEyebrow}
          </Text>
          <Text style={[styles.cardTitle, { color: palette.ink }]}>
            {helperCopy.launcherTitle}
          </Text>
          <Text style={[styles.cardSummary, { color: palette.inkMuted }]}>
            {helperCopy.launcherSummary}
          </Text>
          <Text style={[styles.cardNote, { color: palette.inkMuted }]}>
            {launcherState.note}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!canOpen}
          onPress={openHelper}
          style={({ pressed }) => [
            styles.openButton,
            {
              backgroundColor: !canOpen
                ? primaryButton.disabledBackground
                : pressed
                  ? primaryButton.pressedBackground
                  : primaryButton.background,
            },
            !canOpen ? styles.openButtonDisabled : null,
            pressed && canOpen ? styles.openButtonPressed : null,
          ]}
          testID="ledger-tax-helper-button"
        >
          <Text
            style={[
              styles.openButtonLabel,
              { color: !canOpen ? primaryButton.disabledText : primaryButton.text },
            ]}
          >
            {helperCopy.openHelper}
          </Text>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closeHelper}
        visible={isVisible}
      >
        <SafeAreaProvider>
        <SafeAreaView
          edges={["top", "left", "right"]}
          style={[styles.modalScreen, { backgroundColor: palette.shell }]}
        >
          <View
            style={[
              styles.modalHeaderBar,
              { borderBottomColor: palette.divider },
            ]}
          >
            <BackHeaderBar onBack={closeHelper} palette={palette} rightAccessory={<CfoAvatar />} title={helperCopy.modalTitle} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalIntro}>
              <Text style={[styles.modalEyebrow, { color: palette.accent }]}>
                {helperCopy.modalEyebrow}
              </Text>
              <Text style={[styles.modalSummary, { color: palette.inkMuted }]}>
                {helperCopy.modalSummary}
              </Text>
            </View>
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: palette.paper, borderColor: palette.border },
              ]}
            >
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
                        pressed ? styles.openButtonPressed : null,
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

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: palette.paper, borderColor: palette.border },
              ]}
            >
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
              ) : fieldGroups.length === 0 ? (
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
                              style={[styles.fieldTuple, { color: palette.inkMuted }]}
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
            </View>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: palette.paper, borderColor: palette.border },
              ]}
            >
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
                  !snapshot?.exportableRecordIds.length ||
                  exportState.kind === "running" ||
                  !isLoaded ||
                  Boolean(error)
                    ? styles.openButtonDisabled
                    : null,
                  pressed &&
                  snapshot?.exportableRecordIds.length &&
                  exportState.kind !== "running" &&
                  isLoaded &&
                  !error
                    ? styles.openButtonPressed
                    : null,
                ]}
                testID="ledger-tax-helper-export-button"
              >
                <Text
                  style={[
                    styles.openButtonLabel,
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
          </ScrollView>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function asWritableFileHandle(
  file: InstanceType<typeof File>,
): WritableFileHandle {
  return file as WritableFileHandle;
}

async function pickExportDirectoryAsync(): Promise<InstanceType<typeof Directory> | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isDirectoryPickerCancelledError(error)) {
      return null;
    }

    throw error;
  }
}

function isDirectoryPickerCancelledError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("cancel") || message.includes("cancelled") || message.includes("canceled");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F4F9FF",
    borderColor: "rgba(0, 32, 69, 0.12)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 16,
    marginTop: 24,
    padding: 20,
  },
  cardCopy: {
    gap: 8,
  },
  cardEyebrow: {
    color: "#0F5B99",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardNote: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 13,
    lineHeight: 19,
  },
  cardSummary: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 14,
    lineHeight: 21,
  },
  cardTitle: {
    color: "#002045",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 21,
  },
  exportButton: {
    alignItems: "center",
    backgroundColor: "#002045",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  fieldCopy: {
    flex: 1,
    gap: 4,
  },
  fieldName: {
    color: "#002045",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  fieldRow: {
    alignItems: "center",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  fieldTuple: {
    color: "rgba(0, 32, 69, 0.6)",
    fontSize: 12,
    lineHeight: 17,
  },
  fieldValue: {
    color: "#0F5B99",
    fontSize: 15,
    fontWeight: "800",
  },
  formGroup: {
    gap: 10,
  },
  formTitle: {
    color: "#002045",
    fontSize: 16,
    fontWeight: "800",
  },
  infoText: {
    color: "rgba(0, 32, 69, 0.64)",
    fontSize: 13,
    lineHeight: 19,
  },
  modalContent: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  modalEyebrow: {
    color: "#0F5B99",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modalHeaderBar: {
    borderBottomColor: "rgba(0, 32, 69, 0.12)",
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalIntro: {
    gap: 8,
  },
  modalScreen: {
    backgroundColor: "#EEF5FB",
    flex: 1,
  },
  modalSummary: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 14,
    lineHeight: 21,
  },
  noticeStack: {
    gap: 8,
  },
  noticeText: {
    color: "#9A3412",
    fontSize: 13,
    lineHeight: 19,
  },
  openButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#002045",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  openButtonDisabled: {
    backgroundColor: "rgba(0, 32, 69, 0.2)",
  },
  openButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  openButtonPressed: {
    opacity: 0.88,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionSummary: {
    color: "rgba(0, 32, 69, 0.68)",
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: "#002045",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
  },
  stateText: {
    color: "rgba(0, 32, 69, 0.72)",
    fontSize: 14,
    lineHeight: 21,
  },
  successText: {
    color: "#0F766E",
    fontSize: 13,
    lineHeight: 19,
  },
  yearButton: {
    borderColor: "rgba(0, 32, 69, 0.12)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  yearButtonLabel: {
    color: "#002045",
    fontSize: 13,
    fontWeight: "700",
  },
  yearButtonLabelSelected: {
    color: "#FFFFFF",
  },
  yearButtonSelected: {
    backgroundColor: "#0F5B99",
    borderColor: "#0F5B99",
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
