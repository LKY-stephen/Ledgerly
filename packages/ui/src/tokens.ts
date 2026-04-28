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

  // Game scene
  gameFrameBorder: string;
  gameGround: string;
  gameSunColor: string;
  gameSunGlow: string;
  gameHackerEye: string;
  gameGridOverlay: string;
  gameSkyStart: string;
  gameSkyEnd: string;
  stickmanStroke: string;
  stickmanGlow: string;

  // Card suits (shared across themes)
  cardDiamond: string;
  cardClub: string;
  cardSpade: string;

  // Card & panel surfaces
  cardSurface: string;
  cardBorder: string;
  cardShadow: string;
  panelSurface: string;
  discardSurface: string;

  // Chat bubbles
  chatAi: string;
  chatUser: string;

  // Shape tokens
  cardRadius: number;
  panelRadius: number;
  showCat: boolean;
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
    tabInactive: "#767676",
    heroStart: "#000000",
    heroEnd: "#000000",
    shadow: "transparent",
    destructive: "#FE2F2F",
    success: "#B1FFC5",
    statusBarStyle: "dark",
    appleButtonStyle: "black",

    // Game scene — Light "Routine"
    gameFrameBorder: "#000000",
    gameGround: "#111827",
    gameSunColor: "#FDE047",
    gameSunGlow: "rgba(253, 224, 71, 0.35)",
    gameHackerEye: "transparent",
    gameGridOverlay: "transparent",
    gameSkyStart: "#bbf7d0",
    gameSkyEnd: "#fde68a",
    stickmanStroke: "#111827",
    stickmanGlow: "none",

    cardDiamond: "#F59E0B",
    cardClub: "#8B5CF6",
    cardSpade: "#2563EB",

    cardSurface: "rgba(255, 255, 255, 0.98)",
    cardBorder: "#000000",
    cardShadow: "rgba(17, 24, 39, 0.95)",
    panelSurface: "#FFFFFF",
    discardSurface: "rgba(255, 255, 255, 0.78)",

    chatAi: "#DBEAFE",
    chatUser: "#DCFCE7",

    cardRadius: 22,
    panelRadius: 28,
    showCat: true,
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

    // Game scene — Dark "Hacker"
    gameFrameBorder: "#F4F4F5",
    gameGround: "#EF4444",
    gameSunColor: "transparent",
    gameSunGlow: "rgba(239, 68, 68, 0.8)",
    gameHackerEye: "#EF4444",
    gameGridOverlay: "rgba(244, 244, 245, 0.04)",
    gameSkyStart: "#050505",
    gameSkyEnd: "#050505",
    stickmanStroke: "#FFFFFF",
    stickmanGlow: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))",

    cardDiamond: "#F59E0B",
    cardClub: "#8B5CF6",
    cardSpade: "#2563EB",

    cardSurface: "#27272A",
    cardBorder: "#F4F4F5",
    cardShadow: "rgba(239, 68, 68, 0.3)",
    panelSurface: "#18181B",
    discardSurface: "rgba(24, 24, 27, 0.85)",

    chatAi: "#3F3F46",
    chatUser: "#7F1D1D",

    cardRadius: 10,
    panelRadius: 15,
    showCat: false,
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.dark;
