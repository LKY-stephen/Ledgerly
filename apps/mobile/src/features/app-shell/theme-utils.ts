import type { SurfaceTokens } from "@ledgerly/ui";

type FeedbackTone = "error" | "success" | "warning";
type ButtonTone = "primary" | "destructive";

export function withAlpha(color: string, alpha: number) {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  if (color.startsWith("#")) {
    const normalized = color.slice(1);
    const hex = normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
  }

  const rgbMatch = color.match(/^rgb\(([^)]+)\)$/);

  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${clampedAlpha})`;
  }

  const rgbaMatch = color.match(/^rgba\(([^)]+)\)$/);

  if (rgbaMatch) {
    const [red = "0", green = "0", blue = "0"] = rgbaMatch[1].split(",").map((part) => part.trim());
    return `rgba(${red}, ${green}, ${blue}, ${clampedAlpha})`;
  }

  return color;
}

export function getNavigationTheme(palette: SurfaceTokens) {
  return {
    activeTint: palette.tabActive,
    inactiveTint: palette.tabInactive,
    pressedBackground: withAlpha(palette.ink, 0.08),
    sceneBackground: palette.shell,
    sidebarDivider: palette.border,
    tabBarBackground: palette.tabBar,
    tabBarBorder: palette.border,
    tabIndicatorBackground: palette.paperMuted,
    tabIndicatorBorder: palette.border,
  };
}

export function getFeedbackColors(
  palette: SurfaceTokens,
  tone: FeedbackTone,
) {
  const baseColor = tone === "error"
    ? palette.destructive
    : tone === "success"
      ? palette.success
      : palette.accent;

  return {
    background: palette.paper,
    border: baseColor,
    text: baseColor,
  };
}

export function getButtonColors(
  palette: SurfaceTokens,
  tone: ButtonTone = "primary",
) {
  const background = tone === "destructive" ? palette.destructive : palette.accent;
  const text = palette.inkOnAccent;

  return {
    background,
    border: palette.border,
    disabledBackground: withAlpha(background, 0.35),
    disabledText: withAlpha(text, 0.5),
    pressedBackground: withAlpha(background, 0.75),
    text,
  };
}
