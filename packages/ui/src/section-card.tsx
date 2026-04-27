import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { surfaceTokens, type SurfaceTokens } from "./tokens";

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  footer?: ReactNode;
  palette?: SurfaceTokens;
}

export function SectionCard({
  children,
  eyebrow,
  footer,
  palette = surfaceTokens,
  title,
}: SectionCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: palette.paper, borderColor: palette.border }]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text>
      ) : null}
      {title ? <Text style={[styles.title, { color: palette.ink }]}>{title}</Text> : null}
      <View style={styles.content}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  content: {
    gap: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
});
