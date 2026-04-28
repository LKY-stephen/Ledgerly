import { describe, expect, it } from "vitest";
import { surfaceThemes } from "../../../packages/ui/src/tokens";

import {
  getButtonColors,
  getFeedbackColors,
  getNavigationTheme,
  withAlpha,
} from "../src/features/app-shell/theme-utils";

describe("theme utils", () => {
  it("builds rgba overlays from hex and rgb colors", () => {
    expect(withAlpha("#0f766e", 0.2)).toBe("rgba(15, 118, 110, 0.2)");
    expect(withAlpha("rgb(10, 20, 30)", 0.35)).toBe("rgba(10, 20, 30, 0.35)");
  });

  it("derives navigation colors from the active palette instead of fixed light values", () => {
    const lightTheme = getNavigationTheme(surfaceThemes.light);
    const darkTheme = getNavigationTheme(surfaceThemes.dark);

    expect(lightTheme.sceneBackground).toBe(surfaceThemes.light.shell);
    expect(lightTheme.tabBarBackground).toBe(surfaceThemes.light.tabBar);
    expect(darkTheme.sceneBackground).toBe(surfaceThemes.dark.shell);
    expect(darkTheme.activeTint).toBe(surfaceThemes.dark.tabActive);
    expect(darkTheme.tabIndicatorBackground).toBe(surfaceThemes.dark.paperMuted);
  });

  it("derives feedback banners from each palette tone", () => {
    const lightError = getFeedbackColors(surfaceThemes.light, "error");
    const darkSuccess = getFeedbackColors(surfaceThemes.dark, "success");

    expect(lightError.text).toBe(surfaceThemes.light.destructive);
    expect(lightError.background).toBe(surfaceThemes.light.paper);
    expect(darkSuccess.text).toBe(surfaceThemes.dark.success);
    expect(darkSuccess.border).toBe(surfaceThemes.dark.success);
  });

  it("keeps primary actions on accent surfaces in both themes", () => {
    const lightPrimary = getButtonColors(surfaceThemes.light);
    const darkPrimary = getButtonColors(surfaceThemes.dark);

    expect(lightPrimary.background).toBe(surfaceThemes.light.accent);
    expect(lightPrimary.text).toBe(surfaceThemes.light.inkOnAccent);
    expect(darkPrimary.background).toBe(surfaceThemes.dark.accent);
    expect(darkPrimary.text).toBe(surfaceThemes.dark.shell);
  });
});
