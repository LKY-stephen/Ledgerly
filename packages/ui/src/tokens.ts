import type { TextStyle } from "react-native";

export type AppThemeName = "light" | "dark";

export interface TypeRoleTokens {
  fontSize: number;
  fontWeight: NonNullable<TextStyle["fontWeight"]>;
  letterSpacing: number;
  lineHeight: number;
  textTransform?: NonNullable<TextStyle["textTransform"]>;
}

export interface TypographyTokens {
  display: TypeRoleTokens;
  heading: TypeRoleTokens;
  subheading: TypeRoleTokens;
  label: TypeRoleTokens;
  meta: TypeRoleTokens;
  mono: TypeRoleTokens;
  button: TypeRoleTokens;
}

export interface SpacingTokens {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export type MotionCurveName =
  | "enter"
  | "exit"
  | "overshoot"
  | "ambient"
  | "steady";

export interface MotionTokens {
  fast: number;
  base: number;
  dramatic: number;
  linger: number;
  curveEnter: MotionCurveName;
  curveExit: MotionCurveName;
  curveOvershoot: MotionCurveName;
  nearbyLift: number;
  nearbyRotateDeg: number;
  nearbyScale: number;
  slashAngleDeg: number;
}

export interface StrokeTokens {
  hair: number;
  base: number;
  bold: number;
  shadowOffset: number;
}

export interface RadiusTokens {
  card: number;
  cardMini: number;
  panel: number;
  pill: number;
  bubble: number;
}

export interface SceneTokens {
  halftone: string;
  groundShadow: string;
  emptyDiscardOutline: string;
  emptyDiscardFill: string;
}

export interface SuitTokens {
  diamond: string;
  heart: string;
  club: string;
  spade: string;
}

export interface SurfaceTokens {
  name: AppThemeName;
  paper: string;
  paperMuted: string;
  ink: string;
  inkMuted: string;
  inkOnAccent: string;
  inkOnHot: string;
  inkOnAcid: string;
  inkOnPlum: string;
  accent: string;
  accentSoft: string;
  hot: string;
  hotSoft: string;
  acid: string;
  acidSoft: string;
  info: string;
  infoSoft: string;
  system: string;
  systemSoft: string;
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

  // Scene
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

  // Card suits
  cardDiamond: string;
  cardHeart: string;
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

  // Compatibility shape tokens
  cardRadius: number;
  panelRadius: number;
  showCat: boolean;

  // Deepened token groups
  type: TypographyTokens;
  spacing: SpacingTokens;
  motion: MotionTokens;
  stroke: StrokeTokens;
  radius: RadiusTokens;
  scene: SceneTokens;
  suits: SuitTokens;
}

const baseType: TypographyTokens = {
  button: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  display: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 32,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 24,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  meta: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    lineHeight: 12,
    textTransform: "uppercase",
  },
  mono: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  subheading: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 20,
    textTransform: "uppercase",
  },
};

const baseSpacing: SpacingTokens = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

const baseMotion: MotionTokens = {
  base: 280,
  curveEnter: "enter",
  curveExit: "exit",
  curveOvershoot: "overshoot",
  dramatic: 420,
  fast: 180,
  linger: 560,
  nearbyLift: -6,
  nearbyRotateDeg: 2,
  nearbyScale: 1.04,
  slashAngleDeg: -14,
};

const baseStroke: StrokeTokens = {
  base: 3,
  bold: 4,
  hair: 2,
  shadowOffset: 4,
};

const baseRadius: RadiusTokens = {
  bubble: 8,
  card: 12,
  cardMini: 10,
  panel: 18,
  pill: 999,
};

export const surfaceThemes = {
  light: {
    name: "light",
    paper: "#F4EFE6",
    paperMuted: "#E9E1D2",
    ink: "#0A0A0A",
    inkMuted: "rgba(10, 10, 10, 0.58)",
    inkOnAccent: "#0A0A0A",
    inkOnHot: "#0A0A0A",
    inkOnAcid: "#0A0A0A",
    inkOnPlum: "#F4EFE6",
    accent: "#2F6F3E",
    accentSoft: "#DDECD8",
    hot: "#FF2E63",
    hotSoft: "rgba(255, 46, 99, 0.14)",
    acid: "#CAFF3C",
    acidSoft: "rgba(202, 255, 60, 0.16)",
    info: "#7DC8FF",
    infoSoft: "rgba(125, 200, 255, 0.16)",
    system: "#5B2CFF",
    systemSoft: "rgba(91, 44, 255, 0.16)",
    highlight: "#FFC83C",
    border: "#0A0A0A",
    divider: "rgba(10, 10, 10, 0.14)",
    shell: "#F4EFE6",
    shellMuted: "#E9E1D2",
    shellElevated: "#F8F3EB",
    tabBar: "#E9E1D2",
    tabActive: "#0A0A0A",
    tabInactive: "rgba(10, 10, 10, 0.62)",
    heroStart: "#FFF4DE",
    heroEnd: "#F4EFE6",
    shadow: "#0A0A0A",
    destructive: "#FF2E63",
    success: "#2F6F3E",
    statusBarStyle: "dark",
    appleButtonStyle: "black",

    gameFrameBorder: "#0A0A0A",
    gameGround: "#0A0A0A",
    gameSunColor: "#FFC83C",
    gameSunGlow: "#FFC83C",
    gameHackerEye: "transparent",
    gameGridOverlay: "transparent",
    gameSkyStart: "#FFF4DE",
    gameSkyEnd: "#E9E1D2",
    stickmanStroke: "#0A0A0A",
    stickmanGlow: "none",

    cardDiamond: "#5B2CFF",
    cardHeart: "#FF2E63",
    cardClub: "#7DC8FF",
    cardSpade: "#2F6F3E",

    cardSurface: "#F4EFE6",
    cardBorder: "#0A0A0A",
    cardShadow: "#0A0A0A",
    panelSurface: "#F8F3EB",
    discardSurface: "#E9E1D2",

    chatAi: "#F4EFE6",
    chatUser: "#CAFF3C",

    cardRadius: 12,
    panelRadius: 18,
    showCat: true,

    type: baseType,
    spacing: baseSpacing,
    motion: baseMotion,
    stroke: baseStroke,
    radius: baseRadius,
    scene: {
      emptyDiscardFill: "rgba(10, 10, 10, 0.02)",
      emptyDiscardOutline: "rgba(10, 10, 10, 0.38)",
      groundShadow: "rgba(10, 10, 10, 0.14)",
      halftone: "rgba(10, 10, 10, 0.06)",
    },
    suits: {
      diamond: "#5B2CFF",
      heart: "#FF2E63",
      club: "#7DC8FF",
      spade: "#2F6F3E",
    },
  },
  dark: {
    name: "dark",
    paper: "#0A0A0A",
    paperMuted: "#161616",
    ink: "#F4EFE6",
    inkMuted: "rgba(244, 239, 230, 0.62)",
    inkOnAccent: "#0A0A0A",
    inkOnHot: "#0A0A0A",
    inkOnAcid: "#0A0A0A",
    inkOnPlum: "#F4EFE6",
    accent: "#CAFF3C",
    accentSoft: "rgba(202, 255, 60, 0.18)",
    hot: "#FF4D7E",
    hotSoft: "rgba(255, 77, 126, 0.18)",
    acid: "#CAFF3C",
    acidSoft: "rgba(202, 255, 60, 0.18)",
    info: "#7DC8FF",
    infoSoft: "rgba(125, 200, 255, 0.2)",
    system: "#5B2CFF",
    systemSoft: "rgba(91, 44, 255, 0.2)",
    highlight: "#FFC83C",
    border: "#F4EFE6",
    divider: "rgba(244, 239, 230, 0.16)",
    shell: "#0A0A0A",
    shellMuted: "#111111",
    shellElevated: "#161616",
    tabBar: "#111111",
    tabActive: "#F4EFE6",
    tabInactive: "rgba(244, 239, 230, 0.72)",
    heroStart: "#1B1024",
    heroEnd: "#0A0A0A",
    shadow: "#F4EFE6",
    destructive: "#FF4D7E",
    success: "#CAFF3C",
    statusBarStyle: "light",
    appleButtonStyle: "white",

    gameFrameBorder: "#F4EFE6",
    gameGround: "#F4EFE6",
    gameSunColor: "#FF4D7E",
    gameSunGlow: "#FF4D7E",
    gameHackerEye: "#FF4D7E",
    gameGridOverlay: "rgba(244, 239, 230, 0.08)",
    gameSkyStart: "#211433",
    gameSkyEnd: "#0A0A0A",
    stickmanStroke: "#F4EFE6",
    stickmanGlow: "none",

    cardDiamond: "#5B2CFF",
    cardHeart: "#FF4D7E",
    cardClub: "#7DC8FF",
    cardSpade: "#CAFF3C",

    cardSurface: "#161616",
    cardBorder: "#F4EFE6",
    cardShadow: "rgba(244, 239, 230, 0.24)",
    panelSurface: "#161616",
    discardSurface: "#111111",

    chatAi: "rgba(255,255,255,0.08)",
    chatUser: "#CAFF3C",

    cardRadius: 12,
    panelRadius: 18,
    showCat: true,

    type: baseType,
    spacing: baseSpacing,
    motion: baseMotion,
    stroke: baseStroke,
    radius: baseRadius,
    scene: {
      emptyDiscardFill: "rgba(244, 239, 230, 0.03)",
      emptyDiscardOutline: "rgba(244, 239, 230, 0.42)",
      groundShadow: "rgba(244, 239, 230, 0.2)",
      halftone: "rgba(244, 239, 230, 0.08)",
    },
    suits: {
      diamond: "#5B2CFF",
      heart: "#FF4D7E",
      club: "#7DC8FF",
      spade: "#CAFF3C",
    },
  },
} as const satisfies Record<AppThemeName, SurfaceTokens>;

export const surfaceTokens = surfaceThemes.light;
