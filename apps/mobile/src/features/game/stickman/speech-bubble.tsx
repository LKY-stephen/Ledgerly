import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

interface Props {
  text: string;
  palette: SurfaceTokens;
}

export function SpeechBubble({ text, palette }: Props) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          backgroundColor: palette.paper,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.ink }]}>{text}</Text>
      <View
        style={[
          styles.tail,
          { borderTopColor: palette.border },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 3,
    maxWidth: 200,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tail: {
    position: "absolute",
    bottom: -8,
    left: "50%",
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
