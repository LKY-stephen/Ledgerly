import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { surfaceTokens, type SurfaceTokens } from "./tokens";

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  footer?: ReactNode;
  palette?: SurfaceTokens;
  variant?: "default" | "hero" | "compact";
}

export function SectionCard({
  children,
  eyebrow,
  footer,
  palette = surfaceTokens,
  title,
  variant = "default",
}: SectionCardProps) {
  const isCompact = variant === "compact";
  const isHero = variant === "hero";

  return (
    <View
      style={[
        styles.card,
        isCompact ? styles.cardCompact : null,
        isHero ? styles.cardHero : null,
        {
          backgroundColor: palette.cardSurface,
          borderColor: palette.cardBorder,
          shadowColor: palette.cardShadow,
        },
      ]}
    >
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow}</Text>
      ) : null}
      {title ? (
        <Text
          style={[
            styles.title,
            isCompact ? styles.titleCompact : null,
            isHero ? styles.titleHero : null,
            { color: palette.ink },
          ]}
        >
          {title}
        </Text>
      ) : null}
      <View style={[styles.content, isCompact ? styles.contentCompact : null]}>{children}</View>
      {footer ? <View style={[styles.footer, isCompact ? styles.footerCompact : null]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: surfaceTokens.spacing.sm,
    padding: surfaceTokens.spacing.lg,
    borderRadius: surfaceTokens.radius.panel,
    borderWidth: surfaceTokens.stroke.hair,
    shadowOffset: { width: 0, height: surfaceTokens.stroke.shadowOffset },
    shadowOpacity: 0.18,
    shadowRadius: 0,
  },
  cardCompact: {
    gap: surfaceTokens.spacing.xs,
    padding: surfaceTokens.spacing.md,
  },
  cardHero: {
    gap: surfaceTokens.spacing.md,
    padding: surfaceTokens.spacing.xl,
  },
  content: {
    gap: surfaceTokens.spacing.sm,
  },
  contentCompact: {
    gap: surfaceTokens.spacing.xs,
  },
  eyebrow: {
    ...surfaceTokens.type.meta,
  },
  footer: {
    paddingTop: surfaceTokens.spacing.xs,
  },
  footerCompact: {
    paddingTop: surfaceTokens.spacing.xxs,
  },
  title: {
    ...surfaceTokens.type.heading,
  },
  titleCompact: {
    fontSize: surfaceTokens.type.subheading.fontSize,
    lineHeight: surfaceTokens.type.subheading.lineHeight,
    letterSpacing: surfaceTokens.type.subheading.letterSpacing,
  },
  titleHero: {
    fontSize: surfaceTokens.type.display.fontSize,
    lineHeight: surfaceTokens.type.display.lineHeight,
    letterSpacing: surfaceTokens.type.display.letterSpacing,
  },
});
