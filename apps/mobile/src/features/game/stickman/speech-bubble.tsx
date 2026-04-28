import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import type { SurfaceTokens } from "@ledgerly/ui";

interface Props {
  text: string;
  palette: SurfaceTokens;
}

export function SpeechBubble({ text, palette }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const isDark = palette.name === "dark";

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
          backgroundColor: isDark ? "#27272A" : "#fff",
          borderColor: palette.border,
          transform: [{ scale }],
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.ink }]}>{text}</Text>
      <View
        style={[
          styles.tail,
          {
            borderTopColor: palette.border,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    maxWidth: 200,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
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
