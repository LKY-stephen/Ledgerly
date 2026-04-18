import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { useResponsive } from "../../hooks/use-responsive";
import {
  parseFile,
  pickDocumentUploadCandidates,
  pickPhotoUploadCandidates,
  takeCameraPhoto,
} from "./ledger-runtime";
import { formatUploadCandidateSize } from "./ledger-ui-copy";
import { useAppShell } from "../app-shell/provider";
import { getButtonColors, getFeedbackColors } from "../app-shell/theme-utils";

interface SelectedUploadCandidate {
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
  uri: string;
}

export function LedgerUploadScreen() {
  const router = useRouter();
  const { isExpanded, isMedium } = useResponsive();
  const isWide = isExpanded || isMedium;
  const { copy, palette, resolvedLocale } = useAppShell();
  const uploadCopy = copy.ledger.upload;
  const errorColors = getFeedbackColors(palette, "error");
  const primaryButton = getButtonColors(palette, "primary");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<"empty" | "idle">("idle");
  const [selectedCandidate, setSelectedCandidate] =
    useState<SelectedUploadCandidate | null>(null);

  async function handleImport(
    source: "camera" | "documents" | "photos",
  ): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const candidates =
        source === "camera"
          ? await takeCameraPhoto(resolvedLocale)
          : source === "photos"
            ? await pickPhotoUploadCandidates(resolvedLocale)
            : await pickDocumentUploadCandidates();

      if (!candidates.length) {
        setSelectedCandidate(null);
        setStatus("empty");
        return;
      }

      const first = candidates[0]!;
      setSelectedCandidate({
        kind: first.kind,
        mimeType: first.mimeType,
        originalFileName: first.originalFileName,
        sizeBytes: first.sizeBytes,
        uri: first.uri,
      });
      setStatus("idle");
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : uploadCopy.errorFallback,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleParseSelected(): Promise<void> {
    if (!selectedCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);

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
          model: result.model,
          parseError: result.error ?? "",
          parserKind: result.parserKind,
          rawJson: result.rawJson != null ? JSON.stringify(result.rawJson) : "",
          rawText: result.rawText,
        },
        pathname: "/ledger/parse",
      });
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : uploadCopy.errorFallback,
      );
    } finally {
      setIsBusy(false);
    }
  }

  const statusText =
    status === "empty"
      ? uploadCopy.emptySelection
      : isBusy && selectedCandidate
        ? `${uploadCopy.parsingStatusPrefix} ${selectedCandidate.originalFileName}...`
      : selectedCandidate
        ? uploadCopy.previewSummary
        : uploadCopy.hint;
  const previewMeta = selectedCandidate
    ? [
        selectedCandidate.mimeType?.trim() || "Unknown type",
        formatUploadCandidateSize(selectedCandidate.sizeBytes),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · ")
    : "";
  const showImagePreview =
    selectedCandidate != null &&
    (selectedCandidate.kind === "image" ||
      selectedCandidate.kind === "live_photo") &&
    Boolean(selectedCandidate.mimeType?.startsWith("image/"));

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
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/ledger");
            }
          }}
          palette={palette}
          rightAccessory={<CfoAvatar />}
          title={copy.common.appName}
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isWide && styles.containerWide,
        ]}
      >
        <View style={isWide ? styles.wideRow : null}>
          <View
            style={[
              styles.heroBlock,
              isWide && styles.heroBlockWide,
              {
                backgroundColor: palette.paper,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
              {uploadCopy.eyebrow}
            </Text>
            <Text
              style={[
                styles.heroTitle,
                isWide && styles.heroTitleWide,
                { color: palette.ink },
              ]}
            >
              {uploadCopy.title}
            </Text>
            <Text
              style={[
                styles.heroSummary,
                isWide && styles.heroSummaryWide,
                { color: palette.inkMuted },
              ]}
            >
              {uploadCopy.summary}
            </Text>
          </View>

          <View
            style={[
              styles.dropCard,
              isWide && styles.dropCardWide,
              {
                backgroundColor: palette.shellElevated,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.uploadGlyph,
                { backgroundColor: palette.accentSoft },
              ]}
            >
              <Feather color={palette.accent} name="upload-cloud" size={26} />
            </View>
            <Text style={[styles.dropTitle, { color: palette.ink }]}>
              {uploadCopy.uploadCardTitle}
            </Text>
            <Text style={[styles.dropSummary, { color: palette.inkMuted }]}>
              {uploadCopy.uploadCardSummary}
            </Text>

            {selectedCandidate ? (
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: palette.paper,
                    borderColor: palette.border,
                  },
                ]}
                testID="ledger-upload-preview-card"
              >
                <Text style={[styles.previewEyebrow, { color: palette.inkMuted }]}>
                  {uploadCopy.previewTitle}
                </Text>
                {showImagePreview ? (
                  <Image
                    source={{ uri: selectedCandidate.uri }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.previewIconWrap,
                      { backgroundColor: palette.accentSoft },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={palette.accent}
                      name={
                        selectedCandidate.kind === "live_photo"
                          ? "motion-play-outline"
                          : selectedCandidate.kind === "image"
                            ? "image-outline"
                            : "file-document-outline"
                      }
                      size={28}
                    />
                  </View>
                )}
                <Text style={[styles.previewFileName, { color: palette.ink }]}>
                  {selectedCandidate.originalFileName}
                </Text>
                {previewMeta ? (
                  <Text style={[styles.previewMeta, { color: palette.inkMuted }]}>
                    {previewMeta}
                  </Text>
                ) : null}

                <View style={[styles.buttonStack, isWide && styles.buttonStackWide]}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={handleParseSelected}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: isBusy
                          ? primaryButton.disabledBackground
                          : pressed
                            ? primaryButton.pressedBackground
                            : primaryButton.background,
                        opacity: isBusy ? 0.7 : 1,
                        shadowColor: palette.shadow,
                      },
                    ]}
                    testID="ledger-upload-parse-button"
                  >
                    <View style={styles.primaryButtonContent}>
                      <MaterialCommunityIcons
                        color={isBusy ? primaryButton.disabledText : primaryButton.text}
                        name="file-search-outline"
                        size={18}
                      />
                      <Text
                        style={[
                          styles.primaryButtonLabel,
                          {
                            color: isBusy
                              ? primaryButton.disabledText
                              : primaryButton.text,
                          },
                        ]}
                      >
                        {isBusy ? uploadCopy.parsing : uploadCopy.parseAction}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => {
                      setError(null);
                      setSelectedCandidate(null);
                      setStatus("idle");
                    }}
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
                      <MaterialCommunityIcons
                        color={palette.ink}
                        name="arrow-left"
                        size={18}
                      />
                      <Text
                        style={[styles.secondaryButtonLabel, { color: palette.ink }]}
                      >
                        {uploadCopy.backAction}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.buttonStack, isWide && styles.buttonStackWide]}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => handleImport("photos")}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: isBusy
                        ? primaryButton.disabledBackground
                        : pressed
                          ? primaryButton.pressedBackground
                          : primaryButton.background,
                      opacity: isBusy ? 0.7 : 1,
                      shadowColor: palette.shadow,
                    },
                  ]}
                  testID="ledger-upload-select-photos-button"
                >
                  <View style={styles.primaryButtonContent}>
                    <MaterialCommunityIcons
                      color={isBusy ? primaryButton.disabledText : primaryButton.text}
                      name="image-multiple-outline"
                      size={18}
                    />
                    <Text
                      style={[
                        styles.primaryButtonLabel,
                        { color: isBusy ? primaryButton.disabledText : primaryButton.text },
                      ]}
                    >
                      {isBusy ? uploadCopy.parsing : uploadCopy.selectPhotos}
                    </Text>
                  </View>
                </Pressable>

                {Platform.OS !== "web" && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => handleImport("camera")}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        backgroundColor: pressed ? palette.paperMuted : palette.paper,
                        borderColor: palette.border,
                        opacity: isBusy ? 0.7 : 1,
                      },
                    ]}
                    testID="ledger-upload-camera-button"
                  >
                    <View style={styles.primaryButtonContent}>
                      <MaterialCommunityIcons
                        color={palette.ink}
                        name="camera-outline"
                        size={18}
                      />
                      <Text
                        style={[styles.secondaryButtonLabel, { color: palette.ink }]}
                      >
                        {uploadCopy.takePhoto}
                      </Text>
                    </View>
                  </Pressable>
                )}

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
                    <MaterialCommunityIcons
                      color={palette.ink}
                      name="file-upload-outline"
                      size={18}
                    />
                    <Text
                      style={[styles.secondaryButtonLabel, { color: palette.ink }]}
                    >
                      {uploadCopy.selectFiles}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            <Text
              style={[
                styles.hint,
                { color: error ? errorColors.text : palette.inkMuted },
              ]}
            >
              {error ?? statusText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  buttonStack: {
    gap: 10,
    width: "100%",
  },
  buttonStackWide: {
    alignSelf: "center",
    maxWidth: 380,
  },
  container: {
    gap: 14,
    padding: 18,
    paddingBottom: 32,
  },
  containerWide: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  dropCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  dropCardWide: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  dropSummary: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  dropTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroBlock: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  heroBlockWide: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  heroSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroSummaryWide: {
    fontSize: 16,
    lineHeight: 26,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  heroTitleWide: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  previewCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
    width: "100%",
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  previewFileName: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  previewIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  previewImage: {
    borderRadius: 16,
    height: 180,
    width: "100%",
  },
  previewMeta: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  wideRow: {
    flex: 1,
    flexDirection: "row",
    gap: 32,
  },
  uploadGlyph: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
});
