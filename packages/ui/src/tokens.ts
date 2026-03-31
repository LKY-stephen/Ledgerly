export type AppThemeName = "light" | "dark";

export interface SurfaceTokens {
  name: AppThemeName;
  paper: string;
  paperMuted: string;
  ink: string;
  inkMuted: string;
  inkOnAccent: string;
  accent: string;
  accentSoft: string;
  border: string;
  divider: string;
  shell: string;
  shellMuted: string;
  shellElevated: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  heroStart: string;
  heroEnd: string;
  shadow: string;
  destructive: string;
  success: string;
  statusBarStyle: "light" | "dark";
  appleButtonStyle: "white" | "black";
}

export const surfaceThemes = {
  light: {
    name: "light",
    paper: "#ffffff",
    paperMuted: "#e7f0ea",
    ink: "#14213d",
    inkMuted: "#475569",
    inkOnAccent: "#f7fffd",
    accent: "#0f766e",
    accentSoft: "#d8f3ee",
    border: "rgba(15, 118, 110, 0.24)",
    divider: "rgba(20, 33, 61, 0.12)",
    shell: "#f2f7f4",
    shellMuted: "#dbe9e3",
    shellElevated: "#ffffff",
    tabBar: "#ffffff",
    tabActive: "#0f766e",
    tabInactive: "#425466",
    heroStart: "#0f766e",
    heroEnd: "#11334f",
    shadow: "rgba(17, 51, 79, 0.12)",
    destructive: "#b93808",
    success: "#0f766e",
    statusBarStyle: "dark",
    appleButtonStyle: "black",
  },
  dark: {
    name: "dark",
    paper: "#102824",
    paperMuted: "#173631",
    ink: "#f5f8fb",
    inkMuted: "#a9bbc5",
    inkOnAccent: "#f5fffd",
    accent: "#6ee7d2",
    accentSoft: "rgba(110, 231, 210, 0.16)",
    border: "rgba(110, 231, 210, 0.18)",
    divider: "rgba(169, 187, 197, 0.16)",
    shell: "#071816",
    shellMuted: "#0d2421",
    shellElevated: "#0f211f",
    tabBar: "rgba(12, 31, 28, 0.94)",
    tabActive: "#6ee7d2",
    tabInactive: "#8aa1ac",
    heroStart: "#173d3a",
    heroEnd: "#102b43",
    shadow: "rgba(0, 0, 0, 0.22)",
    destructive: "#fb923c",
    success: "#6ee7d2",
    statusBarStyle: "light",
    appleButtonStyle: "white",
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.dark;
