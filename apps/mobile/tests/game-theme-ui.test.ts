import { describe, expect, it } from "vitest";

import {
  getGameCardColors,
  gameSettingsCardLabel,
  getDockCardScale,
  getNextQuickTheme,
} from "../src/features/game/game-ui";

describe("game theme and settings helpers", () => {
  it("keeps the settings card label stable", () => {
    expect(gameSettingsCardLabel).toBe("SETTINGS");
  });

  it("toggles between light and dark themes", () => {
    expect(getNextQuickTheme("light")).toBe("dark");
    expect(getNextQuickTheme("dark")).toBe("light");
  });

  it("preserves the selected-card shrink behavior", () => {
    expect(getDockCardScale({ isActive: true, pressed: false })).toBe(0.9);
  });

  it("uses black text for the ledger flash card in dark mode", () => {
    expect(
      getGameCardColors("flash", {
        accent: "#ffcc00",
        ink: "#f4efe6",
        name: "dark",
        paper: "#111111",
      } as never).text,
    ).toBe("#000000");
  });
});
