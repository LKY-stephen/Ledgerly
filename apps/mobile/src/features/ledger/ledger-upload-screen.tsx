import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import {
  parseFile,
  pickDocumentUploadCandidates,
  pickPhotoUploadCandidates,
} from "./ledger-runtime";
import { describeUploadCandidate } from "./ledger-ui-copy";
import { useAppShell } from "../app-shell/provider";

type UploadCandidate = Awaited<ReturnType<typeof pickDocumentUploadCandidates>>[number];

export function LedgerUploadScreen() {
  const router = useRouter();
  const { aiProvider, copy, palette } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<UploadCandidate | null>(null);
  const providerLabel = aiProvider === "gemini" ? "Gemini" : "OpenAI";
  const [status, setStatus] = useState(`Select files or photos to upload for ${providerLabel} parsing.`);
  const isBusy = isSelecting || isParsing;
  const preview = selectedCandidate ? describeUploadCandidate(selectedCandidate) : null;
  const isImagePreview =
    selectedCandidate?.kind === "image" || selectedCandidate?.kind === "live_photo" ||
    selectedCandidate?.mimeType?.startsWith("image/") === true;

  async function handleImport(source: "documents" | "photos"): Promise<void> {
    setIsSelecting(true);
    setError(null);

    try {
      const candidates =
        source === "photos"
          ? await pickPhotoUploadCandidates()
          : await pickDocumentUploadCandidates();

      if (!candidates.length) {
        setStatus("No files were selected.");
        return;
      }

      const first = candidates[0] as UploadCandidate;
      setSelectedCandidate(first);
      setStatus(`Selected ${first.originalFileName}. Review the preview before parsing.`);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Upload import failed.");
    } finally {
      setIsSelecting(false);
    }
  }

  function handleBackToPicker(): void {
    if (isParsing) {
      return;
    }

    setSelectedCandidate(null);
    setError(null);
    setStatus(`Select files or photos to upload for ${providerLabel} parsing.`);
  }

  async function handleParseSelection(): Promise<void> {
    if (!selectedCandidate || isParsing) {
      return;
    }

    setIsParsing(true);
    setError(null);
    setStatus(`Parsing ${selectedCandidate.originalFileName}...`);

    try {
      const result = await parseFile(
        selectedCandidate.uri,
        selectedCandidate.originalFileName,
        selectedCandidate.mimeType,
      );

      router.push({
        params: {
          fileName: selectedCandidate.originalFileName,
          mimeType: selectedCandidate.mimeType ?? "",
          rawJson: result.rawJson != null ? JSON.stringify(result.rawJson) : "",
          rawText: result.rawText,
          model: result.model,
          parseError: result.error ?? "",
          parserKind: result.parserKind ?? "",
        },
        pathname: "/ledger/parse",
      });
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Parsing failed.");
      setStatus(`Unable to parse ${selectedCandidate.originalFileName}. Review the error and try again.`);
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: palette.shell }]}
      testID="ledger-upload-screen"
    >
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: palette.shell,
            borderBottomColor: palette.divider,
          },
        ]}
      >
        <BackHeaderBar
          onBack={() => router.back()}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>Upload center</Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>{copy.ledger.upload.title}</Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>
            Upload receipts, PDFs, or photos. Review the selected file first, then send it to {providerLabel}
            for parsing and continue into record mapping.
          </Text>
        </View>

        <View
          style={[
            styles.dropCard,
            {
              backgroundColor: palette.shellElevated,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <View style={[styles.uploadGlyph, { backgroundColor: palette.accentSoft }]}>
            <Feather color={palette.accent} name="upload-cloud" size={26} />
          </View>
          <Text style={[styles.dropTitle, { color: palette.ink }]}>
            {selectedCandidate ? (isParsing ? "Parsing in progress" : preview?.title) : "Upload & Parse"}
          </Text>
          <Text style={[styles.dropSummary, { color: palette.inkMuted }]}>
            {selectedCandidate
              ? `Confirm the selected file before sending it to ${providerLabel}.`
              : `Select a file, review the preview, and then parse it with ${providerLabel}.`}
          </Text>

          {selectedCandidate ? (
            <View style={styles.previewStack}>
              {isImagePreview ? (
                <Image
                  source={{ uri: selectedCandidate.uri }}
                  style={[styles.previewImage, { borderColor: palette.border }]}
                  testID="ledger-upload-image-preview"
                />
              ) : (
                <View
                  style={[
                    styles.documentPreviewCard,
                    {
                      backgroundColor: palette.paper,
                      borderColor: palette.border,
                    },
                  ]}
                  testID="ledger-upload-document-preview"
                >
                  <MaterialCommunityIcons color={palette.accent} name={preview?.iconName ?? "file-document-outline"} size={28} />
                  <View style={styles.documentPreviewBody}>
                    <Text numberOfLines={1} style={[styles.documentPreviewName, { color: palette.ink }]}>
                      {selectedCandidate.originalFileName}
                    </Text>
                    <Text style={[styles.documentPreviewMeta, { color: palette.inkMuted }]}>
                      {selectedCandidate.mimeType ?? "Unknown document type"}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.metadataCard, { backgroundColor: palette.paper, borderColor: palette.border }]}>
                <Text numberOfLines={1} style={[styles.previewFileName, { color: palette.ink }]}>
                  {selectedCandidate.originalFileName}
                </Text>
                {preview?.detailLines.map((line) => (
                  <Text key={line} style={[styles.previewMetaLine, { color: palette.inkMuted }]}>
                    {line}
                  </Text>
                ))}
              </View>

              {isParsing ? (
                <View style={styles.parsingState} testID="ledger-upload-parsing-state">
                  <ActivityIndicator color={palette.accent} size="large" />
                  <Text style={[styles.parsingTitle, { color: palette.ink }]}>Parsing {selectedCandidate.originalFileName}</Text>
                  <Text style={[styles.parsingSummary, { color: palette.inkMuted }]}>
                    The upload is locked while the loading circle is active.
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonStack}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={handleParseSelection}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: pressed ? palette.heroEnd : palette.ink,
                        opacity: isBusy ? 0.7 : 1,
                        shadowColor: palette.shadow,
                      },
                    ]}
                    testID="ledger-upload-parse-button"
                  >
                    <View style={styles.primaryButtonContent}>
                      <MaterialCommunityIcons color={palette.inkOnAccent} name="progress-upload" size={18} />
                      <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>Parse</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={handleBackToPicker}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: pressed ? palette.paperMuted : palette.paper,
                        borderColor: palette.border,
                        opacity: isBusy ? 0.7 : 1,
                      },
                    ]}
                    testID="ledger-upload-back-button"
                  >
                    <View style={styles.primaryButtonContent}>
                      <MaterialCommunityIcons color={palette.ink} name="arrow-left" size={18} />
                      <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>Back</Text>
                    </View>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.buttonStack}>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => handleImport("photos")}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: pressed ? palette.heroEnd : palette.ink,
                    opacity: isBusy ? 0.7 : 1,
                    shadowColor: palette.shadow,
                  },
                ]}
                testID="ledger-upload-select-photos-button"
              >
                <View style={styles.primaryButtonContent}>
                  <MaterialCommunityIcons color={palette.inkOnAccent} name="image-multiple-outline" size={18} />
                  <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>
                    {isSelecting ? "Opening..." : "Select Photos"}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => handleImport("documents")}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: pressed ? palette.paperMuted : palette.paper,
                    borderColor: palette.border,
                    opacity: isBusy ? 0.7 : 1,
                  },
                ]}
                testID="ledger-upload-select-button"
              >
                <View style={styles.primaryButtonContent}>
                  <MaterialCommunityIcons color={palette.ink} name="file-upload-outline" size={18} />
                  <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>
                    {isSelecting ? "Opening..." : "Select Files"}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          <Text style={[styles.hint, { color: error ? "#BA1A1A" : palette.inkMuted }]}>
            {error ?? status}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  buttonStack: {
    gap: 12,
    width: "100%",
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 34,
  },
  documentPreviewBody: {
    flex: 1,
    gap: 2,
  },
  documentPreviewCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  documentPreviewMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  documentPreviewName: {
    fontSize: 15,
    fontWeight: "700",
  },
  dropCard: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 26,
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  dropSummary: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  dropTitle: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroBlock: {
    gap: 10,
  },
  heroSummary: {
    fontSize: 18,
    lineHeight: 28,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.1,
    lineHeight: 46,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  metadataCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  parsingState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  parsingSummary: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  parsingTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: "100%",
  },
  primaryButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  previewFileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewImage: {
    borderRadius: 20,
    borderWidth: 1,
    height: 220,
    width: "100%",
  },
  previewMetaLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewStack: {
    gap: 12,
    width: "100%",
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  uploadGlyph: {
    alignItems: "center",
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
});
