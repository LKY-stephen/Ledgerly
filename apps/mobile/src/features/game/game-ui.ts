import type { SurfaceTokens } from "@ledgerly/ui";

export const gameHomeButtonLabel = "HOME";
export const gameSettingsCardLabel = "SETTINGS";

export type GameCardVariant = "black" | "white" | "flash";

export function getNextQuickTheme(currentTheme: "light" | "dark"): "light" | "dark" {
  return currentTheme === "dark" ? "light" : "dark";
}

export function getGameCardColors(variant: GameCardVariant, palette: SurfaceTokens) {
  switch (variant) {
    case "black":
      return { bg: palette.ink, text: palette.paper };
    case "white":
      return { bg: palette.paper, text: palette.ink };
    case "flash":
      return {
        bg: palette.accent,
        text: palette.name === "dark" ? "#000000" : palette.ink,
      };
  }
}

export function getDockCardScale(input: {
  isActive: boolean;
  pressed: boolean;
}): number {
  const { isActive, pressed } = input;

  if (pressed && isActive) {
    return 0.88;
  }

  if (pressed) {
    return 0.94;
  }

  if (isActive) {
    return 0.9;
  }

  return 1;
}
