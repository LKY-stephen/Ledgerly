import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import {
  getCharacterMotionProfile,
  type CharacterType,
} from "../game-ui";

interface Options {
  character: CharacterType;
  energy: number;
  isPanelOpen: boolean;
  reactionKey: number;
  boostKey?: number;
}

export function useCharacterMotion({
  character,
  energy,
  isPanelOpen,
  reactionKey,
  boostKey = 0,
}: Options) {
  const ambient = useRef(new Animated.Value(0)).current;
  const reaction = useRef(new Animated.Value(0)).current;
  const boost = useRef(new Animated.Value(0)).current;
  const previousReactionKey = useRef(reactionKey);
  const previousBoostKey = useRef(boostKey);
  const profile = getCharacterMotionProfile({ character, energy, isPanelOpen });

  useEffect(() => {
    ambient.stopAnimation();
    ambient.setValue(0);

    const loop = Animated.loop(
      Animated.timing(ambient, {
        toValue: 1,
        duration: profile.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [ambient, profile.duration]);

  useEffect(() => {
    if (reactionKey === 0 || reactionKey === previousReactionKey.current) {
      previousReactionKey.current = reactionKey;
      return;
    }

    previousReactionKey.current = reactionKey;
    reaction.stopAnimation();
    reaction.setValue(0);

    Animated.sequence([
      Animated.spring(reaction, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.timing(reaction, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reaction, reactionKey]);

  useEffect(() => {
    if (boostKey === 0 || boostKey === previousBoostKey.current) {
      previousBoostKey.current = boostKey;
      return;
    }

    previousBoostKey.current = boostKey;
    boost.stopAnimation();
    boost.setValue(0);

    Animated.sequence([
      Animated.timing(boost, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(boost, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [boost, boostKey]);

  const ambientX = ambient.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange:
      character === "stickman"
        ? [-profile.rangeX, profile.rangeX * 0.2, profile.rangeX, -profile.rangeX * 0.15, -profile.rangeX]
        : [-profile.rangeX * 0.7, profile.rangeX * 0.3, profile.rangeX, -profile.rangeX * 0.5, -profile.rangeX * 0.7],
  });
  const ambientY = ambient.interpolate({
    inputRange: [0, 0.2, 0.45, 0.7, 1],
    outputRange:
      character === "stickman"
        ? [0, -profile.lift, -profile.lift * 0.2, -profile.lift * 0.85, 0]
        : [0, -profile.lift * 0.4, -profile.lift, -profile.lift * 0.3, 0],
  });
  const ambientRotate = ambient.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange:
      character === "stickman"
        ? [
            `${-profile.tilt}deg`,
            `${profile.tilt * 0.45}deg`,
            `${profile.tilt}deg`,
            `${-profile.tilt * 0.3}deg`,
            `${-profile.tilt}deg`,
          ]
        : [
            `${-profile.tilt * 0.5}deg`,
            `${profile.tilt * 0.3}deg`,
            `${profile.tilt}deg`,
            `${-profile.tilt}deg`,
            `${-profile.tilt * 0.5}deg`,
          ],
  });
  const ambientScale = ambient.interpolate({
    inputRange: [0, 0.35, 0.65, 1],
    outputRange:
      character === "stickman"
        ? [1, 1.02 + energy * 0.025, 0.995, 1]
        : [1, 1.015, 0.995, 1],
  });
  const reactionY = reaction.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, -profile.reactionJump, 0],
  });
  const reactionRotate = reaction.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [
      "0deg",
      `${-profile.reactionTwist}deg`,
      `${profile.reactionTwist}deg`,
      "0deg",
    ],
  });
  const boostScale = boost.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.04 + energy * 0.04, 1],
  });
  const boostY = boost.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -(4 + energy * 8), 0],
  });

  return {
    transform: [
      { translateX: ambientX },
      { translateY: Animated.add(ambientY, Animated.add(reactionY, boostY)) },
      { rotate: ambientRotate },
      { rotate: reactionRotate },
      { scale: Animated.multiply(ambientScale, boostScale) },
    ] as const,
  };
}
