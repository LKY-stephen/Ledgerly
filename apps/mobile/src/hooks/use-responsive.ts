import { useMemo } from "react";
import { Platform, useWindowDimensions } from "react-native";

type Breakpoint = "compact" | "medium" | "expanded";

/** Width of the desktop sidebar in px. */
export const SIDEBAR_WIDTH = 220;

export interface ResponsiveInfo {
  breakpoint: Breakpoint;
  columns: 1 | 2 | 3;
  /** Max width for the outer layout shell (includes sidebar on expanded). */
  contentMaxWidth: number;
  isCompact: boolean;
  isExpanded: boolean;
  isMedium: boolean;
  windowWidth: number;
}

const COMPACT_MAX = 600;
const MEDIUM_MAX = 1024;

const compactInfo: ResponsiveInfo = {
  breakpoint: "compact",
  columns: 1,
  contentMaxWidth: 480,
  isCompact: true,
  isExpanded: false,
  isMedium: false,
  windowWidth: 0,
};

export function useResponsive(): ResponsiveInfo {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    if (Platform.OS !== "web") {
      return { ...compactInfo, windowWidth: width };
    }

    if (width < COMPACT_MAX) {
      return {
        breakpoint: "compact" as const,
        columns: 1 as const,
        contentMaxWidth: 480,
        isCompact: true,
        isExpanded: false,
        isMedium: false,
        windowWidth: width,
      };
    }

    if (width < MEDIUM_MAX) {
      return {
        breakpoint: "medium" as const,
        columns: 2 as const,
        contentMaxWidth: 720,
        isCompact: false,
        isExpanded: false,
        isMedium: true,
        windowWidth: width,
      };
    }

    return {
      breakpoint: "expanded" as const,
      columns: 3 as const,
      contentMaxWidth: 1080 + SIDEBAR_WIDTH,
      isCompact: false,
      isExpanded: true,
      isMedium: false,
      windowWidth: width,
    };
  }, [width]);
}
