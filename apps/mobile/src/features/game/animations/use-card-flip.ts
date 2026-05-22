import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import { surfaceTokens } from "@ledgerly/ui";

export function useCardFlip(isVisible: boolean) {
  const slashOpacity = useRef(new Animated.Value(0)).current;
  const slashSlide = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      slashOpacity.setValue(0);
      slashSlide.setValue(0);
      panelProgress.setValue(0);

      Animated.parallel([
        // Slash: smooth slide-through with fade
        Animated.timing(slashSlide, {
          toValue: 1,
          duration: surfaceTokens.motion.base,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(slashOpacity, {
            toValue: 1,
            duration: surfaceTokens.motion.fast,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(60),
          Animated.timing(slashOpacity, {
            toValue: 0,
            duration: surfaceTokens.motion.fast,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Panel: spring in with slight delay so slash leads
        Animated.sequence([
          Animated.delay(40),
          Animated.spring(panelProgress, {
            toValue: 1,
            friction: 8,
            tension: 70,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      Animated.timing(panelProgress, {
        toValue: 0,
        duration: surfaceTokens.motion.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slashOpacity, slashSlide, panelProgress]);

  // Slash stripe slide: translateX from -120 to +60 (slides through)
  const slashTranslateX = slashSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 60],
  });

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

  return { panelStyle, slashOpacity, slashTranslateX };
}
