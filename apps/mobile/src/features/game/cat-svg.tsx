import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path } from "react-native-svg";
import type { SurfaceTokens } from "@ledgerly/ui";

interface Props {
  palette: SurfaceTokens;
}

export function CatSvg({ palette }: Props) {
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2500 + Math.random() * 2000),
        Animated.timing(blink, {
          toValue: 0,
          duration: 80,
          useNativeDriver: false,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: 80,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  const stroke = palette.stickmanStroke;
  const fill = palette.paper;
  const sw = 3.5;

  return (
    <View style={styles.root}>
      <Svg width={70} height={50} viewBox="0 0 90 60">
        {/* Body */}
        <Ellipse cx={45} cy={40} rx={28} ry={14} fill={fill} stroke={stroke} strokeWidth={sw} />
        {/* Head */}
        <Circle cx={68} cy={28} r={14} fill={fill} stroke={stroke} strokeWidth={sw} />
        {/* Ears */}
        <Path d="M58 18 L 60 8 L 66 18 Z" fill={stroke} />
        <Path d="M70 18 L 75 8 L 78 18 Z" fill={stroke} />
        {/* Eyes */}
        <Circle cx={64} cy={28} r={1.8} fill={stroke} />
        <Circle cx={74} cy={28} r={1.8} fill={stroke} />
        {/* Tail */}
        <Path
          d="M18 38 Q 5 30 8 18"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Legs */}
        <Line x1={32} y1={52} x2={32} y2={60} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <Line x1={58} y1={52} x2={58} y2={60} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
  },
});
