import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

export function useCardFlip(isVisible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isVisible ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isVisible, progress]);

  const scaleX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 1],
  });

  const scaleY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 0.9, 1],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });

  if (Platform.OS === "web") {
    const rotateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ["-90deg", "0deg"],
    });
    return { transform: [{ rotateY }, { perspective: 800 } as any], opacity };
  }

  return { transform: [{ scaleX }, { scaleY }], opacity };
}
