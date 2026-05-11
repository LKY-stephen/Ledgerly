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
  info: string;
  system: string;
  highlight: string;
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
    inkMuted: "rgba(10, 10, 10, 0.55)",
    inkOnAccent: "#0A0A0A",
    accent: "#FF2E63",
    accentSoft: "rgba(255, 46, 99, 0.12)",
    info: "#7DC8FF",
    system: "#5B2CFF",
    highlight: "#FFC83C",
    border: "#0A0A0A",
    divider: "rgba(10, 10, 10, 0.12)",
    shell: "#F4EFE6",
    shellMuted: "#E9E1D2",
    shellElevated: "#F4EFE6",
    tabBar: "#F4EFE6",
    tabActive: "#0A0A0A",
    tabInactive: "rgba(10, 10, 10, 0.55)",
    heroStart: "#0A0A0A",
    heroEnd: "#0A0A0A",
    shadow: "#0A0A0A",
    destructive: "#FF2E63",
    success: "#CAFF3C",
    statusBarStyle: "dark",
    appleButtonStyle: "black",

    gameFrameBorder: "#0A0A0A",
    gameGround: "#0A0A0A",
    gameSunColor: "#FFC83C",
    gameSunGlow: "#FFC83C",
    gameHackerEye: "transparent",
    gameGridOverlay: "transparent",
    gameSkyStart: "#F4EFE6",
    gameSkyEnd: "#E9E1D2",
    stickmanStroke: "#0A0A0A",
    stickmanGlow: "none",

    cardDiamond: "#0A0A0A",
    cardClub: "#7DC8FF",
    cardSpade: "#FF2E63",

    cardSurface: "#F4EFE6",
    cardBorder: "#0A0A0A",
    cardShadow: "#0A0A0A",
    panelSurface: "#F4EFE6",
    discardSurface: "#E9E1D2",

    chatAi: "#F4EFE6",
    chatUser: "#FF2E63",

    cardRadius: 16,
    panelRadius: 10,
    showCat: true,
  },
  dark: {
    name: "dark",
    paper: "#0A0A0A",
    paperMuted: "#161616",
    ink: "#F4EFE6",
    inkMuted: "rgba(244, 239, 230, 0.55)",
    inkOnAccent: "#0A0A0A",
    accent: "#FF2E63",
    accentSoft: "rgba(255, 46, 99, 0.14)",
    info: "#7DC8FF",
    system: "#5B2CFF",
    highlight: "#FFC83C",
    border: "#F4EFE6",
    divider: "rgba(244, 239, 230, 0.16)",
    shell: "#0A0A0A",
    shellMuted: "#161616",
    shellElevated: "#161616",
    tabBar: "#0A0A0A",
    tabActive: "#F4EFE6",
    tabInactive: "rgba(244, 239, 230, 0.72)",
    heroStart: "#0A0A0A",
    heroEnd: "#0A0A0A",
    shadow: "#F4EFE6",
    destructive: "#FF2E63",
    success: "#CAFF3C",
    statusBarStyle: "light",
    appleButtonStyle: "white",

    gameFrameBorder: "#F4EFE6",
    gameGround: "#F4EFE6",
    gameSunColor: "#FF2E63",
    gameSunGlow: "#FF2E63",
    gameHackerEye: "#FF2E63",
    gameGridOverlay: "rgba(244, 239, 230, 0.04)",
    gameSkyStart: "#0A0A0A",
    gameSkyEnd: "#0A0A0A",
    stickmanStroke: "#F4EFE6",
    stickmanGlow: "drop-shadow(0 0 6px rgba(255, 46, 99, 0.35))",

    cardDiamond: "#0A0A0A",
    cardClub: "#7DC8FF",
    cardSpade: "#7DC8FF",

    cardSurface: "#161616",
    cardBorder: "#F4EFE6",
    cardShadow: "rgba(244, 239, 230, 0.22)",
    panelSurface: "#161616",
    discardSurface: "#161616",

    chatAi: "rgba(255,255,255,0.08)",
    chatUser: "#FF2E63",

    cardRadius: 16,
    panelRadius: 10,
    showCat: false,
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.light;
