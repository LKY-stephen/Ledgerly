import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SectionCard } from "@creator-cfo/ui";

import { localePreferenceOptions, themePreferenceOptions } from "../app-shell/copy";
import { useAppShell } from "../app-shell/provider";
import type { LocalePreference, ThemePreference } from "../app-shell/types";

function PreferencePill(props: {
  active: boolean;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof useAppShell>["palette"];
}) {
  const { active, label, onPress, palette } = props;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.optionPill,
        {
          backgroundColor: active ? palette.accent : palette.paperMuted,
          borderColor: active ? palette.accent : palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.optionLabel,
          { color: active ? palette.inkOnAccent : palette.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const {
    copy,
    localePreference,
    palette,
    session,
    sessionDisplayName,
    setLocalePreference,
    setThemePreference,
    signOut,
    themePreference,
  } = useAppShell();

  const themeLabels: Record<ThemePreference, string> = {
    dark: copy.common.dark,
    light: copy.common.light,
    system: copy.common.system,
  };

  const localeLabels: Record<LocalePreference, string> = {
    en: copy.common.english,
    system: copy.common.system,
    "zh-CN": copy.common.zhCN,
  };

  const sessionKindLabel =
    session?.kind === "apple" ? "Apple ID" : session?.kind === "guest" ? copy.common.guest : "None";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.shell }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: palette.accent }]}>{copy.tabs.profile}</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{copy.meScreen.title}</Text>
          <Text style={[styles.summary, { color: palette.inkMuted }]}>
            {copy.meScreen.sessionDescription}
          </Text>
        </View>

        <SectionCard eyebrow={copy.common.theme} palette={palette} title={copy.common.theme}>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.themeDescription}
          </Text>
          <View style={styles.optionRow}>
            {themePreferenceOptions.map((option) => (
              <PreferencePill
                key={option}
                active={themePreference === option}
                label={themeLabels[option]}
                onPress={() => {
                  void setThemePreference(option);
                }}
                palette={palette}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow={copy.common.language} palette={palette} title={copy.common.language}>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.localeDescription}
          </Text>
          <View style={styles.optionRow}>
            {localePreferenceOptions.map((option) => (
              <PreferencePill
                key={option}
                active={localePreference === option}
                label={localeLabels[option]}
                onPress={() => {
                  void setLocalePreference(option);
                }}
                palette={palette}
              />
            ))}
          </View>
        </SectionCard>

        <SectionCard eyebrow={copy.meScreen.sessionTitle} palette={palette} title={sessionDisplayName}>
          <Text style={[styles.sessionKind, { color: palette.accent }]}>{sessionKindLabel}</Text>
          <Text style={[styles.sectionHint, { color: palette.inkMuted }]}>
            {copy.meScreen.logoutDescription}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
            style={[styles.logoutButton, { backgroundColor: palette.destructive }]}
          >
            <Text style={[styles.logoutLabel, { color: palette.inkOnAccent }]}>
              {copy.common.signOut}
            </Text>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hero: {
    gap: 12,
  },
  logoutButton: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 20,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  safeArea: {
    flex: 1,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  sessionKind: {
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
});
