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
      : palette.info;

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
  const isDestructive = tone === "destructive";
  const background = isDestructive
    ? palette.name === "dark"
      ? withAlpha(palette.destructive, 0.18)
      : palette.destructive
    : palette.accent;
  const border = isDestructive ? palette.destructive : palette.border;
  const text = isDestructive
    ? palette.name === "dark"
      ? palette.destructive
      : palette.paper
    : palette.inkOnAccent;
  const pressedBackground = isDestructive
    ? palette.name === "dark"
      ? withAlpha(palette.destructive, 0.28)
      : withAlpha(palette.destructive, 0.75)
    : palette.name === "dark"
      ? withAlpha(palette.accent, 0.76)
      : withAlpha(palette.accent, 0.78);

  return {
    background,
    border,
    disabledBackground: withAlpha(background, palette.name === "dark" ? 0.42 : 0.45),
    disabledText: withAlpha(text, 0.5),
    pressedBackground,
    text,
  };
}
