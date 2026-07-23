import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { alanBlueAtlasSources } from "./alan-blue-sprite-assets.generated";
import {
  getAlanMotionTiming,
  getAlanSpriteSequence,
  type StickmanSpriteActionId,
} from "./alan-stickman-actions";

const AnimatedImage = Animated.createAnimatedComponent(Image);

interface Props {
  actionId: StickmanSpriteActionId;
  energy: number;
  facing: "left" | "right";
  height: number;
  isReducedMotionEnabled: boolean;
}

export function AlanStickmanSprite({
  actionId,
  energy,
  facing,
  height,
  isReducedMotionEnabled,
}: Props) {
  const sequence = getAlanSpriteSequence(actionId);
  const timing = getAlanMotionTiming(actionId, {
    energy,
    isReducedMotionEnabled,
    spriteHeight: height,
  });
  const frameProgress = useSharedValue(sequence.reducedMotionFrame);
  const frameHeight = height;
  const frameWidth =
    height * (sequence.frameSize.width / sequence.frameSize.height);
  const atlasWidth = frameWidth * sequence.columns;
  const atlasHeight = frameHeight * sequence.rows;
  const frameCount = sequence.frameCount;
  const columns = sequence.columns;
  const reducedMotionFrame = timing.reducedMotionFrame;

  useEffect(() => {
    cancelAnimation(frameProgress);

    if (!timing.shouldAnimate) {
      frameProgress.value = reducedMotionFrame;
      return;
    }

    frameProgress.value = 0;

    const targetFrame =
      timing.loop === "loop" ? frameCount : Math.max(0, frameCount - 0.01);
    const animation = withTiming(targetFrame, {
      duration: timing.durationMs,
      easing: Easing.linear,
    });

    frameProgress.value =
      timing.loop === "loop" ? withRepeat(animation, -1, false) : animation;

    return () => {
      cancelAnimation(frameProgress);
    };
  }, [
    columns,
    frameCount,
    frameProgress,
    reducedMotionFrame,
    timing.durationMs,
    timing.loop,
    timing.shouldAnimate,
  ]);

  const atlasStyle = useAnimatedStyle(() => {
    const frameIndex = Math.max(
      0,
      Math.min(frameCount - 1, Math.floor(frameProgress.value)),
    );
    const atlasX = (frameIndex % columns) * frameWidth;
    const atlasY = Math.floor(frameIndex / columns) * frameHeight;

    return {
      transform: [
        { translateX: -atlasX },
        { translateY: -atlasY },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.window,
        {
          height: frameHeight,
          transform: [{ scaleX: facing === "right" ? -1 : 1 }],
          width: frameWidth,
        },
      ]}
    >
      <AnimatedImage
        resizeMode="stretch"
        source={alanBlueAtlasSources[actionId]}
        style={[
          styles.atlas,
          {
            height: atlasHeight,
            width: atlasWidth,
          },
          atlasStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  atlas: {
    left: 0,
    position: "absolute",
    top: 0,
  },
  window: {
    overflow: "hidden",
  },
});
