import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import {
  parseFile,
  pickDocumentUploadCandidates,
  pickPhotoUploadCandidates,
  takeCameraPhoto,
} from "./ledger-runtime";
import { useAppShell } from "../app-shell/provider";

export function LedgerUploadScreen() {
  const router = useRouter();
  const { copy, palette, resolvedLocale } = useAppShell();
  const uploadCopy = copy.ledger.upload;
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<{
    fileName?: string;
    kind: "empty" | "idle" | "parsing";
  }>({
    kind: "idle",
  });

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
        setStatus({ kind: "empty" });
        return;
      }

      const first = candidates[0]!;
      setStatus({ fileName: first.originalFileName, kind: "parsing" });

      const result = await parseFile(
        first.uri,
        first.originalFileName,
        first.mimeType,
      );

      router.push({
        params: {
          fileName: first.originalFileName,
          rawJson: result.rawJson != null ? JSON.stringify(result.rawJson) : "",
          rawText: result.rawText,
          model: result.model,
          parseError: result.error ?? "",
          parserKind: result.parserKind,
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
    status.kind === "empty"
      ? uploadCopy.emptySelection
      : status.kind === "parsing" && status.fileName
        ? `${uploadCopy.parsingStatusPrefix} ${status.fileName}...`
        : uploadCopy.hint;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: "#F5F6F8" }]}
      testID="ledger-upload-screen"
    >
      <View
        style={[
          styles.appBar,
          {
            backgroundColor: "#F5F6F8",
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
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
            {uploadCopy.eyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>
            {uploadCopy.title}
          </Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>
            {uploadCopy.summary}
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
                <MaterialCommunityIcons
                  color={palette.inkOnAccent}
                  name="image-multiple-outline"
                  size={18}
                />
                <Text
                  style={[
                    styles.primaryButtonLabel,
                    { color: palette.inkOnAccent },
                  ]}
                >
                  {isBusy ? uploadCopy.parsing : uploadCopy.selectPhotos}
                </Text>
              </View>
            </Pressable>

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

          <Text
            style={[
              styles.hint,
              { color: error ? "#BA1A1A" : palette.inkMuted },
            ]}
          >
            {error ?? statusText}
          </Text>
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
  container: {
    gap: 14,
    padding: 18,
    paddingBottom: 32,
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
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(0, 32, 69, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  heroSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
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
    height: 44,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  uploadGlyph: {
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
});
