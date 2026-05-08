import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import type { SurfaceTokens } from "@ledgerly/ui";

interface Props {
  palette: SurfaceTokens;
  interactionCount: number;
}

function Tail({ alertFrame, stroke }: { alertFrame: boolean; stroke: string }) {
  return (
    <Path
      d={alertFrame ? "M 20 41 C 10 35, 6 26, 10 14" : "M 19 40 C 8 34, 6 26, 11 18"}
      fill="none"
      stroke={stroke}
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function CatSvg({ palette, interactionCount }: Props) {
  const [blinkClosed, setBlinkClosed] = useState(false);
  const [alertFrame, setAlertFrame] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleBlink = () => {
      blinkTimerRef.current = setTimeout(() => {
        setBlinkClosed(true);
        blinkTimerRef.current = setTimeout(() => {
          setBlinkClosed(false);
          scheduleBlink();
        }, 100);
      }, 2600 + Math.random() * 2200);
    };

    scheduleBlink();

    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (interactionCount === 0) {
      return;
    }

    setAlertFrame(true);

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }

    alertTimerRef.current = setTimeout(() => {
      setAlertFrame(false);
    }, 650);

    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, [interactionCount]);

  const stroke = palette.stickmanStroke;
  const fill = palette.paper;
  const bodyFill = palette.paperMuted;
  const sw = 3.5;

  return (
    <View style={styles.root}>
      <Svg width={94} height={74} viewBox="0 0 100 78">
        <Ellipse cx={42} cy={56} rx={30} ry={13} fill="rgba(10,10,10,0.06)" />
        <G transform={alertFrame ? "translate(0 -2)" : "translate(0 0)"}>
          <Ellipse cx={41} cy={48} rx={29} ry={14} fill={bodyFill} stroke={stroke} strokeWidth={sw} />
          <Circle cx={72} cy={31} r={16} fill={fill} stroke={stroke} strokeWidth={sw} />
          <Path d="M 59 20 L 61 8 L 68 18 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M 72 18 L 78 8 L 83 18 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M 57 21 L 60 10 L 65 19 Z" fill={stroke} opacity={0.85} />
          <Path d="M 71 20 L 75 10 L 79 19 Z" fill={stroke} opacity={0.85} />
          <Path d="M 53 46 Q 61 50 67 46" fill="none" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" />
          {blinkClosed ? (
            <>
              <Line x1={67} y1={31} x2={69.5} y2={31} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
              <Line x1={77} y1={31} x2={79.5} y2={31} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
            </>
          ) : (
            <>
              <Circle cx={67} cy={31} r={1.8} fill={stroke} />
              <Circle cx={77} cy={31} r={1.8} fill={stroke} />
            </>
          )}
          <Path
            d={alertFrame ? "M 19 42 C 11 38, 10 27, 16 18" : "M 18 42 C 9 37, 8 27, 13 20"}
            fill="none"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1={28} y1={61} x2={28} y2={70} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={47} y1={61} x2={47} y2={70} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={65} y1={61} x2={65} y2={70} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={61} y1={35} x2={52} y2={32} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={61} y1={37} x2={52} y2={38} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={83} y1={35} x2={91} y2={33} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <Line x1={83} y1={37} x2={91} y2={39} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
          <Tail alertFrame={alertFrame} stroke={stroke} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
  },
});
