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
    paper: "#F4EFE6",
    paperMuted: "#E9E1D2",
    ink: "#0A0A0A",
    inkMuted: "#555555",
    inkOnAccent: "#0A0A0A",
    accent: "#FF2E63",
    accentSoft: "rgba(255, 46, 99, 0.15)",
    border: "#0A0A0A",
    divider: "rgba(10, 10, 10, 0.15)",
    shell: "#F4EFE6",
    shellMuted: "#E9E1D2",
    shellElevated: "#F4EFE6",
    tabBar: "#F4EFE6",
    tabActive: "#0A0A0A",
    tabInactive: "#767676",
    heroStart: "#0A0A0A",
    heroEnd: "#0A0A0A",
    shadow: "#0A0A0A",
    destructive: "#FF2E63",
    success: "#CAFF3C",
    statusBarStyle: "dark",
    appleButtonStyle: "black",

    gameFrameBorder: "#0A0A0A",
    gameGround: "#0A0A0A",
    gameSunColor: "transparent",
    gameSunGlow: "transparent",
    gameHackerEye: "transparent",
    gameGridOverlay: "transparent",
    gameSkyStart: "#F4EFE6",
    gameSkyEnd: "#E9E1D2",
    stickmanStroke: "#0A0A0A",
    stickmanGlow: "none",

    cardDiamond: "#FF2E63",
    cardClub: "#5B2CFF",
    cardSpade: "#7DC8FF",

    cardSurface: "#F4EFE6",
    cardBorder: "#0A0A0A",
    cardShadow: "#0A0A0A",
    panelSurface: "#F4EFE6",
    discardSurface: "#F4EFE6",

    chatAi: "#E9E1D2",
    chatUser: "rgba(255, 46, 99, 0.12)",

    cardRadius: 14,
    panelRadius: 6,
    showCat: true,
  },
  dark: {
    name: "dark",
    paper: "#0A0A0A",
    paperMuted: "#1A1A1A",
    ink: "#F4EFE6",
    inkMuted: "#AAAAAA",
    inkOnAccent: "#0A0A0A",
    accent: "#CAFF3C",
    accentSoft: "rgba(202, 255, 60, 0.15)",
    border: "#F4EFE6",
    divider: "rgba(244, 239, 230, 0.15)",
    shell: "#0A0A0A",
    shellMuted: "#1A1A1A",
    shellElevated: "#0A0A0A",
    tabBar: "#0A0A0A",
    tabActive: "#F4EFE6",
    tabInactive: "#888888",
    heroStart: "#0A0A0A",
    heroEnd: "#0A0A0A",
    shadow: "#F4EFE6",
    destructive: "#FF2E63",
    success: "#CAFF3C",
    statusBarStyle: "light",
    appleButtonStyle: "white",

    gameFrameBorder: "#F4EFE6",
    gameGround: "#F4EFE6",
    gameSunColor: "transparent",
    gameSunGlow: "transparent",
    gameHackerEye: "#CAFF3C",
    gameGridOverlay: "rgba(244, 239, 230, 0.04)",
    gameSkyStart: "#0A0A0A",
    gameSkyEnd: "#0A0A0A",
    stickmanStroke: "#F4EFE6",
    stickmanGlow: "drop-shadow(0 0 6px rgba(202, 255, 60, 0.4))",

    cardDiamond: "#CAFF3C",
    cardClub: "#5B2CFF",
    cardSpade: "#7DC8FF",

    cardSurface: "#1A1A1A",
    cardBorder: "#F4EFE6",
    cardShadow: "rgba(202, 255, 60, 0.3)",
    panelSurface: "#1A1A1A",
    discardSurface: "#1A1A1A",

    chatAi: "#1A1A1A",
    chatUser: "rgba(202, 255, 60, 0.12)",

    cardRadius: 14,
    panelRadius: 6,
    showCat: false,
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.light;
