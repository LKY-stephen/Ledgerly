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
    paper: "#FFFFFF",
    paperMuted: "#F0F0F0",
    ink: "#000000",
    inkMuted: "#555555",
    inkOnAccent: "#000000",
    accent: "#A0E9FF",
    accentSoft: "rgba(160, 233, 255, 0.18)",
    border: "#000000",
    divider: "rgba(0, 0, 0, 0.15)",
    shell: "#FFFFFF",
    shellMuted: "#F0F0F0",
    shellElevated: "#FFFFFF",
    tabBar: "#FFFFFF",
    tabActive: "#000000",
    tabInactive: "#888888",
    heroStart: "#000000",
    heroEnd: "#000000",
    shadow: "transparent",
    destructive: "#FE2F2F",
    success: "#B1FFC5",
    statusBarStyle: "dark",
    appleButtonStyle: "black",
  },
  dark: {
    name: "dark",
    paper: "#000000",
    paperMuted: "#1A1A1A",
    ink: "#FFFFFF",
    inkMuted: "#AAAAAA",
    inkOnAccent: "#000000",
    accent: "#A0E9FF",
    accentSoft: "rgba(160, 233, 255, 0.16)",
    border: "#FFFFFF",
    divider: "rgba(255, 255, 255, 0.15)",
    shell: "#000000",
    shellMuted: "#1A1A1A",
    shellElevated: "#000000",
    tabBar: "#000000",
    tabActive: "#FFFFFF",
    tabInactive: "#888888",
    heroStart: "#000000",
    heroEnd: "#000000",
    shadow: "transparent",
    destructive: "#FE2F2F",
    success: "#B1FFC5",
    statusBarStyle: "light",
    appleButtonStyle: "white",
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.dark;
