import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import type { StickmanPose } from "../stickman/stickman-poses";
import { poses } from "../stickman/stickman-poses";
import type { StickmanMood } from "../game-context";

function flattenPose(pose: StickmanPose): number[] {
  return [
    pose.head.cx, pose.head.cy, pose.head.r,
    pose.neck.x, pose.neck.y,
    pose.hip.x, pose.hip.y,
    ...pose.armL.flatMap((p) => [p.x, p.y]),
    ...pose.armR.flatMap((p) => [p.x, p.y]),
    ...pose.legL.flatMap((p) => [p.x, p.y]),
    ...pose.legR.flatMap((p) => [p.x, p.y]),
  ];
}

function unflattenPose(values: number[]): StickmanPose {
  let i = 0;
  const next = () => values[i++];
  return {
    head: { cx: next(), cy: next(), r: next() },
    neck: { x: next(), y: next() },
    hip: { x: next(), y: next() },
    armL: [
      { x: next(), y: next() },
      { x: next(), y: next() },
      { x: next(), y: next() },
    ],
    armR: [
      { x: next(), y: next() },
      { x: next(), y: next() },
      { x: next(), y: next() },
    ],
    legL: [
      { x: next(), y: next() },
      { x: next(), y: next() },
      { x: next(), y: next() },
    ],
    legR: [
      { x: next(), y: next() },
      { x: next(), y: next() },
      { x: next(), y: next() },
    ],
  };
}

export function useStickmanAnimator(mood: StickmanMood) {
  const targetPose = poses[mood] ?? poses.idle;
  const flatTarget = flattenPose(targetPose);
  const animValues = useRef(flatTarget.map((v) => new Animated.Value(v))).current;
  const currentPose = useRef(targetPose);

  useEffect(() => {
    const nextFlat = flattenPose(poses[mood] ?? poses.idle);
    const anims = animValues.map((av, i) =>
      Animated.timing(av, {
        toValue: nextFlat[i],
        duration: 350,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    Animated.parallel(anims).start();

    const listenerId = animValues.map((av, i) =>
      av.addListener(({ value }) => {
        const flat = animValues.map((a) => (a as any)._value ?? 0);
        flat[i] = value;
        currentPose.current = unflattenPose(flat);
      }),
    );

    return () => {
      animValues.forEach((av, i) => av.removeListener(listenerId[i]));
    };
  }, [mood, animValues]);

  return { animValues, currentPose };
}
