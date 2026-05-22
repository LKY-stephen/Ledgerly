import { describe, expect, it } from "vitest";
import { surfaceThemes } from "../../../packages/ui/src/tokens";

type RgbColor = {
  alpha: number;
  blue: number;
  green: number;
  red: number;
};

function parseColor(input: string): RgbColor {
  if (input.startsWith("#")) {
    const normalized = input.slice(1);
    const hex = normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

    return {
      alpha: 1,
      blue: Number.parseInt(hex.slice(4, 6), 16),
      green: Number.parseInt(hex.slice(2, 4), 16),
      red: Number.parseInt(hex.slice(0, 2), 16),
    };
  }

  const match = input.match(/^rgba?\(([^)]+)\)$/);

  if (!match) {
    throw new Error(`Unsupported color format: ${input}`);
  }

  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));

  return {
    alpha: parts[3] ?? 1,
    blue: parts[2] ?? 0,
    green: parts[1] ?? 0,
    red: parts[0] ?? 0,
  };
}

function blendColors(foreground: string, background: string) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  const alpha = fg.alpha + bg.alpha * (1 - fg.alpha);

  return {
    alpha,
    blue: Math.round((fg.blue * fg.alpha + bg.blue * bg.alpha * (1 - fg.alpha)) / alpha),
    green: Math.round((fg.green * fg.alpha + bg.green * bg.alpha * (1 - fg.alpha)) / alpha),
    red: Math.round((fg.red * fg.alpha + bg.red * bg.alpha * (1 - fg.alpha)) / alpha),
  };
}

function srgbToLinear(channel: number) {
  const normalized = channel / 255;

  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: RgbColor) {
  return (
    0.2126 * srgbToLinear(color.red) +
    0.7152 * srgbToLinear(color.green) +
    0.0722 * srgbToLinear(color.blue)
  );
}

function contrastRatio(foreground: string, background: string) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));

  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme contrast", () => {
  it("keeps light theme CTA and tab colors readable", () => {
    const light = surfaceThemes.light;
    const effectiveTabBar = blendColors(light.tabBar, light.shell);

    expect(contrastRatio(light.inkOnHot, light.hot)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.inkOnAcid, light.acid)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.inkOnPlum, light.system)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.ink, light.paperMuted)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(light.ink, light.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.tabActive, `rgb(${effectiveTabBar.red}, ${effectiveTabBar.green}, ${effectiveTabBar.blue})`)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.tabInactive, `rgb(${effectiveTabBar.red}, ${effectiveTabBar.green}, ${effectiveTabBar.blue})`)).toBeGreaterThanOrEqual(4.5);
  });

  it("preserves dark theme active and inactive tab readability", () => {
    const dark = surfaceThemes.dark;
    const effectiveTabBar = blendColors(dark.tabBar, dark.shell);

    expect(contrastRatio(dark.inkOnHot, dark.hot)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.inkOnAcid, dark.acid)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.inkOnPlum, dark.system)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.tabActive, `rgb(${effectiveTabBar.red}, ${effectiveTabBar.green}, ${effectiveTabBar.blue})`)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.tabInactive, `rgb(${effectiveTabBar.red}, ${effectiveTabBar.green}, ${effectiveTabBar.blue})`)).toBeGreaterThanOrEqual(4.5);
  });
});
