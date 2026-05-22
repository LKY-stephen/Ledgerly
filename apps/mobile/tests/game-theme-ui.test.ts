import { describe, expect, it } from "vitest";

import {
  getGameCardColors,
  getGameCardPresentation,
  gameSettingsCardLabel,
  getDockCardScale,
  getNextQuickTheme,
} from "../src/features/game/game-ui";
import { surfaceThemes } from "../../../packages/ui/src/tokens";

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

  it("uses dark ink on the hot report card", () => {
    expect(
      getGameCardColors("hot", surfaceThemes.dark).text,
    ).toBe(surfaceThemes.dark.inkOnHot);
  });

  it("uses semantic variants instead of legacy color names", () => {
    expect(getGameCardPresentation("new").variant).toBe("acid");
    expect(getGameCardPresentation("report").variant).toBe("hot");
  });
});
