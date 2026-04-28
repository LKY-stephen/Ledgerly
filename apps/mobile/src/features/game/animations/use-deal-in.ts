import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function useDealIn(cardCount: number, delayPerCard = 120) {
  const anims = useRef(
    Array.from({ length: cardCount }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const sequence = anims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * delayPerCard),
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(sequence).start();
  }, [anims, delayPerCard]);

  return anims.map((anim) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [80, 0],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        }),
      },
    ],
  }));
}
