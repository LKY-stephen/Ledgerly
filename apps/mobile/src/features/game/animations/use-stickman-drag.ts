import { useEffect, useRef } from "react";
import { Animated, PanResponder } from "react-native";

interface StickmanDragOptions {
  enabled: boolean;
  onDragEnd?: () => void;
  onDragStart?: () => void;
}

const dragThreshold = 6;

export function useStickmanDrag({
  enabled,
  onDragEnd,
  onDragStart,
}: StickmanDragOptions) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const enabledRef = useRef(enabled);
  const onDragEndRef = useRef(onDragEnd);
  const onDragStartRef = useRef(onDragStart);

  useEffect(() => {
    enabledRef.current = enabled;
    onDragEndRef.current = onDragEnd;
    onDragStartRef.current = onDragStart;
  }, [enabled, onDragEnd, onDragStart]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
  }, [enabled, pan, scale]);

  const resetDrag = () => {
    Animated.parallel([
      Animated.spring(pan, {
        friction: 6,
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        friction: 6,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(() => onDragEndRef.current?.());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabledRef.current &&
        (Math.abs(gesture.dx) > dragThreshold ||
          Math.abs(gesture.dy) > dragThreshold),
      onPanResponderGrant: () => {
        onDragStartRef.current?.();
        Animated.spring(scale, {
          friction: 8,
          toValue: 1.05,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: resetDrag,
      onPanResponderTerminate: resetDrag,
      onStartShouldSetPanResponder: () => false,
    }),
  ).current;

  return {
    dragHandlers: enabled ? panResponder.panHandlers : {},
    dragStyle: {
      transform: [
        { translateX: pan.x },
        { translateY: pan.y },
        { scale },
      ],
    },
  };
}
