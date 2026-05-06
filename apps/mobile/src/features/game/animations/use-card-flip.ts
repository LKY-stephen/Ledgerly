import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

export function useCardFlip(isVisible: boolean) {
  const slashOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      slashOpacity.setValue(0);
      panelProgress.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(slashOpacity, {
            toValue: 1,
            duration: 60,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(slashOpacity, {
            toValue: 0,
            duration: 120,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(panelProgress, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slashOpacity, panelProgress]);

  const rotation = panelProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: ["-8deg", "1deg", "0deg"],
  });

  const scale = panelProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const opacity = panelProgress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 1],
  });

  const panelStyle = Platform.OS === "web"
    ? { transform: [{ rotate: rotation }, { scale }], opacity }
    : { transform: [{ rotate: rotation }, { scale }], opacity };

  return { panelStyle, slashOpacity };
}
