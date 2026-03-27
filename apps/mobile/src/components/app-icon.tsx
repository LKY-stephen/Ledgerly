import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export type AppIconName =
  | "home"
  | "ledger"
  | "discover"
  | "profile"
  | "modules"
  | "platforms"
  | "bootstrap"
  | "vault"
  | "device"
  | "workflow";

interface AppIconProps {
  color: string;
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
}

export function AppIcon({ color, name, size = 22, strokeWidth = 1.8 }: AppIconProps) {
  const commonStrokeProps = {
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth,
  };

  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      {name === "home" ? (
        <>
          <Path {...commonStrokeProps} d="M4.5 10.5 12 4l7.5 6.5" />
          <Path {...commonStrokeProps} d="M6.5 9.8V19h11V9.8" />
          <Path {...commonStrokeProps} d="M10 19v-4.5h4V19" />
        </>
      ) : null}

      {name === "ledger" ? (
        <>
          <Rect {...commonStrokeProps} height="14" rx="2.5" width="15" x="4.5" y="5" />
          <Path {...commonStrokeProps} d="M8 9h8" />
          <Path {...commonStrokeProps} d="M8 13h5.5" />
          <Path {...commonStrokeProps} d="M8 17h3.5" />
        </>
      ) : null}

      {name === "discover" ? (
        <>
          <Circle {...commonStrokeProps} cx="11" cy="11" r="5.5" />
          <Path {...commonStrokeProps} d="m15.2 15.2 3.8 3.8" />
          <Path {...commonStrokeProps} d="M11 8.8v4.4" />
          <Path {...commonStrokeProps} d="M8.8 11H13" />
        </>
      ) : null}

      {name === "profile" ? (
        <>
          <Circle {...commonStrokeProps} cx="12" cy="8.2" r="3.2" />
          <Path {...commonStrokeProps} d="M5.5 19c1.4-3 4-4.5 6.5-4.5s5.1 1.5 6.5 4.5" />
        </>
      ) : null}

      {name === "modules" ? (
        <>
          <Rect {...commonStrokeProps} height="5.8" rx="1.2" width="5.8" x="4" y="4" />
          <Rect {...commonStrokeProps} height="5.8" rx="1.2" width="5.8" x="14.2" y="4" />
          <Rect {...commonStrokeProps} height="5.8" rx="1.2" width="5.8" x="4" y="14.2" />
          <Rect {...commonStrokeProps} height="5.8" rx="1.2" width="5.8" x="14.2" y="14.2" />
        </>
      ) : null}

      {name === "platforms" ? (
        <>
          <Ellipse {...commonStrokeProps} cx="12" cy="12" rx="7" ry="4.5" />
          <Path {...commonStrokeProps} d="M5 12c0 4.1 3.1 7.5 7 7.5S19 16.1 19 12" />
          <Path {...commonStrokeProps} d="M12 4.5c2.1 2 3.3 4.7 3.3 7.5S14.1 17.5 12 19.5" />
          <Path {...commonStrokeProps} d="M12 4.5c-2.1 2-3.3 4.7-3.3 7.5s1.2 5.5 3.3 7.5" />
        </>
      ) : null}

      {name === "bootstrap" ? (
        <>
          <Path {...commonStrokeProps} d="M12 4.2v5.3" />
          <Path {...commonStrokeProps} d="m9.6 7.3 2.4 2.2 2.4-2.2" />
          <Rect {...commonStrokeProps} height="9.4" rx="2.2" width="13" x="5.5" y="10.4" />
          <Path {...commonStrokeProps} d="M9 15.2h6" />
        </>
      ) : null}

      {name === "vault" ? (
        <>
          <Path {...commonStrokeProps} d="M4.8 8.2h14.4l-1 9.1a1.9 1.9 0 0 1-1.9 1.7H7.7a1.9 1.9 0 0 1-1.9-1.7Z" />
          <Path {...commonStrokeProps} d="M8.2 8.2 9.7 5h4.6l1.5 3.2" />
          <Path {...commonStrokeProps} d="M9 12.2h6" />
        </>
      ) : null}

      {name === "device" ? (
        <>
          <Rect {...commonStrokeProps} height="14.6" rx="2.5" width="9.6" x="7.2" y="4.7" />
          <Path {...commonStrokeProps} d="M10 7.6h4" />
          <Circle fill={color} cx="12" cy="16.6" r="0.85" />
        </>
      ) : null}

      {name === "workflow" ? (
        <>
          <Circle {...commonStrokeProps} cx="7" cy="7" r="2" />
          <Circle {...commonStrokeProps} cx="17" cy="12" r="2" />
          <Circle {...commonStrokeProps} cx="7" cy="17" r="2" />
          <Path {...commonStrokeProps} d="M8.8 8.1 15 10.9" />
          <Path {...commonStrokeProps} d="M8.8 15.9 15 13.1" />
        </>
      ) : null}
    </Svg>
  );
}
