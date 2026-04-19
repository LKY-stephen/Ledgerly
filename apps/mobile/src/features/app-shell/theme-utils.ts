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
    pressedBackground: withAlpha(palette.ink, palette.name === "dark" ? 0.08 : 0.03),
    sceneBackground: palette.shell,
    sidebarDivider: withAlpha(palette.ink, palette.name === "dark" ? 0.12 : 0.08),
    tabBarBackground: palette.tabBar,
    tabBarBorder: withAlpha(palette.tabActive, palette.name === "dark" ? 0.2 : 0.12),
    tabIndicatorBackground: withAlpha(palette.tabActive, palette.name === "dark" ? 0.16 : 0.08),
    tabIndicatorBorder: withAlpha(palette.tabActive, palette.name === "dark" ? 0.28 : 0.14),
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
    background: withAlpha(baseColor, palette.name === "dark" ? 0.18 : 0.12),
    border: withAlpha(baseColor, palette.name === "dark" ? 0.34 : 0.22),
    text: baseColor,
  };
}

export function getButtonColors(
  palette: SurfaceTokens,
  tone: ButtonTone = "primary",
) {
  const background = tone === "destructive" ? palette.destructive : palette.accent;
  const text = palette.name === "dark" ? palette.shell : palette.inkOnAccent;

  return {
    background,
    border: withAlpha(background, palette.name === "dark" ? 0.3 : 0.18),
    disabledBackground: withAlpha(background, palette.name === "dark" ? 0.38 : 0.28),
    disabledText: withAlpha(text, palette.name === "dark" ? 0.74 : 0.72),
    pressedBackground: withAlpha(background, palette.name === "dark" ? 0.82 : 0.88),
    text,
  };
}
