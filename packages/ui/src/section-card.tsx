import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SectionCardProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  footer?: ReactNode;
}

export function SectionCard({
  children,
  eyebrow,
  footer,
  title,
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#fffaf2",
    borderWidth: 1,
    borderColor: "rgba(15, 118, 110, 0.16)",
  },
  content: {
    gap: 12,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  footer: {
    paddingTop: 8,
  },
  title: {
    color: "#14213d",
    fontSize: 20,
    fontWeight: "700",
  },
});
