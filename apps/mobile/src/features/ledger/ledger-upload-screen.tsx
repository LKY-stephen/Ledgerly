import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import {
  importUploadCandidates,
  parseEvidence,
  pickDocumentUploadCandidates,
  pickPhotoUploadCandidates,
} from "./ledger-runtime";
import { useAppShell } from "../app-shell/provider";

export function LedgerUploadScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Select files or photos to create a local parse queue.");

  async function handleImport(source: "documents" | "photos"): Promise<void> {
    setIsBusy(true);
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

      const evidenceIds = await importUploadCandidates(candidates);
      await Promise.all(evidenceIds.map((evidenceId) => parseEvidence(evidenceId)));
      setStatus(`${evidenceIds.length} item(s) added to the local review queue.`);
      router.push("/ledger/parse");
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "Upload import failed.");
    } finally {
      setIsBusy(false);
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
            Upload receipts, PDFs, or Live Photos into the local vault. iOS development builds use
            Apple Vision OCR, while Android and Web stay on fallback parsing.
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
          <Text style={[styles.dropTitle, { color: palette.ink }]}>Send files into your local vault</Text>
          <Text style={[styles.dropSummary, { color: palette.inkMuted }]}>
            The queue writes into `entity-main`, stores renamed files locally, and prepares every
            item for review.
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
                <MaterialCommunityIcons color={palette.inkOnAccent} name="image-multiple-outline" size={18} />
                <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>
                  {isBusy ? "Importing..." : "Select Photos"}
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
                <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>Select Files</Text>
              </View>
            </Pressable>
          </View>

          <Text style={[styles.hint, { color: error ? "#BA1A1A" : palette.inkMuted }]}>
            {error ?? status}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/ledger/parse")}
          style={({ pressed }) => [
            styles.footerButton,
            {
              backgroundColor: pressed ? palette.heroEnd : palette.ink,
            },
          ]}
          testID="ledger-upload-continue-button"
        >
          <Text style={[styles.footerButtonLabel, { color: palette.inkOnAccent }]}>Review Queue</Text>
        </Pressable>
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
  footerButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
    marginTop: 4,
  },
  footerButtonLabel: {
    fontSize: 16,
    fontWeight: "700",
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
