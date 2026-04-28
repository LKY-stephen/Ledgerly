import { useRef } from "react";
import { Animated, PanResponder, type LayoutRectangle } from "react-native";

interface DragPhysicsOptions {
  onFling: (direction: "left" | "right" | "up") => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  flingThreshold?: number;
}

export function useDragPhysics({
  onFling,
  onDragStart,
  onDragEnd,
  flingThreshold = 120,
}: DragPhysicsOptions) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
      onPanResponderGrant: () => {
        onDragStart?.();
        Animated.spring(scale, {
          toValue: 1.05,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy, vx, vy } = gesture;

        if (Math.abs(dx) > flingThreshold || Math.abs(vx) > 1.5) {
          onFling(dx > 0 ? "right" : "left");
          Animated.timing(pan, {
            toValue: { x: dx > 0 ? 400 : -400, y: dy },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            scale.setValue(1);
            onDragEnd?.();
          });
          return;
        }

        if (dy < -flingThreshold || vy < -1.5) {
          onFling("up");
          Animated.timing(pan, {
            toValue: { x: dx, y: -400 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            scale.setValue(1);
            onDragEnd?.();
          });
          return;
        }

        Animated.parallel([
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start(() => onDragEnd?.());
      },
    }),
  ).current;

  const rotation = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ["-12deg", "0deg", "12deg"],
    extrapolate: "clamp",
  });

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate: rotation },
      { scale },
    ],
  };

  return { panHandlers: panResponder.panHandlers, animatedStyle };
}
