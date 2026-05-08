import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function usePocketAnimation(shouldPocket: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shouldPocket) {
      scale.setValue(1);
      translateY.setValue(0);
      opacity.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 250,
          easing: Easing.in(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 200,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shouldPocket, scale, translateY, opacity]);

  return {
    transform: [{ scale }, { translateY }],
    opacity,
  };
}
