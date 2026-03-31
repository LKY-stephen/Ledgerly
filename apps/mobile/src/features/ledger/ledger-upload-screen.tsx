import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { useAppShell } from "../app-shell/provider";
import { uploadSourceCards } from "./ledger-mocks";

export function LedgerUploadScreen() {
  const router = useRouter();
  const { copy, palette } = useAppShell();

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
          rightAccessory={
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: palette.heroEnd,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[styles.avatarLabel, { color: palette.inkOnAccent }]}>YC</Text>
            </View>
          }
          title={copy.common.appName}
        />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBlock}>
          <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>Upload center</Text>
          <Text style={[styles.heroTitle, { color: palette.ink }]}>{copy.ledger.upload.title}</Text>
          <Text style={[styles.heroSummary, { color: palette.inkMuted }]}>{copy.ledger.upload.summary}</Text>
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
          <Text style={[styles.dropTitle, { color: palette.ink }]}>Drop files or Browse</Text>
          <Text style={[styles.dropSummary, { color: palette.inkMuted }]}>
            Support for PDF, JPG, PNG, and HEIC is mocked in this UI-only phase.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/ledger/parse")}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? palette.heroEnd : palette.ink,
                shadowColor: palette.shadow,
              },
            ]}
            testID="ledger-upload-select-button"
          >
            <View style={styles.primaryButtonContent}>
              <MaterialCommunityIcons color={palette.inkOnAccent} name="file-upload-outline" size={18} />
              <Text style={[styles.primaryButtonLabel, { color: palette.inkOnAccent }]}>Select Files</Text>
            </View>
          </Pressable>
          <Text style={[styles.hint, { color: palette.inkMuted }]}>{copy.ledger.upload.hint}</Text>
        </View>

        <View
          style={[
            styles.engineCard,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.engineEyebrow, { color: palette.inkMuted }]}>Classification engine</Text>
          {uploadSourceCards.map((card) => (
            <View key={card.id} style={[styles.engineRow, { borderTopColor: palette.divider }]}>
              <Text style={[styles.engineTitle, { color: palette.ink }]}>{card.title}</Text>
              <Text style={[styles.engineSummary, { color: palette.inkMuted }]}>{card.summary}</Text>
            </View>
          ))}
          <View style={[styles.readyRow, { borderTopColor: palette.divider }]}>
            <View style={[styles.readyDot, { backgroundColor: palette.accent }]} />
            <Text style={[styles.readyText, { color: palette.inkMuted }]}>
              AI status: ready. Documents are processed in real-time with 99.8% extraction accuracy.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.recentCard,
            {
              backgroundColor: palette.shellElevated,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: palette.ink }]}>Recent Processing</Text>
            <Text style={[styles.recentLink, { color: palette.inkMuted }]}>Archive</Text>
          </View>
          <Text style={[styles.recentSubtitle, { color: palette.inkMuted }]}>
            Activity from the last 24 hours
          </Text>

          {[
            { id: "receipt", name: "Receipt_Adobe_CreativeCloud_Oct.pdf", status: "Uploaded 2m ago" },
            { id: "settlement", name: "YT_Partner_Payment_Sept.pdf", status: "Uploaded 4h ago" },
          ].map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push("/ledger/parse")}
              style={({ pressed }) => [
                styles.recentRow,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={[styles.recentBadge, { backgroundColor: palette.accentSoft }]}>
                <Ionicons color={palette.accent} name="document-text-outline" size={18} />
              </View>
              <View style={styles.recentCopy}>
                <Text numberOfLines={1} style={[styles.recentFileName, { color: palette.ink }]}>
                  {item.name}
                </Text>
                <Text style={[styles.recentStatus, { color: palette.inkMuted }]}>{item.status}</Text>
              </View>
            </Pressable>
          ))}
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
          <Text style={[styles.footerButtonLabel, { color: palette.inkOnAccent }]}>
            {copy.ledger.upload.continue}
          </Text>
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
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: "700",
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
  engineCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  engineEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  engineRow: {
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  engineSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  engineTitle: {
    fontSize: 16,
    fontWeight: "700",
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
    minWidth: 150,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
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
  readyDot: {
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  readyRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
  },
  readyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  recentBadge: {
    alignItems: "center",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  recentCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  recentCopy: {
    flex: 1,
    gap: 3,
  },
  recentFileName: {
    fontSize: 15,
    fontWeight: "700",
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recentLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  recentRow: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  recentStatus: {
    fontSize: 13,
  },
  recentSubtitle: {
    fontSize: 14,
  },
  recentTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  safeArea: {
    flex: 1,
  },
  uploadGlyph: {
    alignItems: "center",
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
});
