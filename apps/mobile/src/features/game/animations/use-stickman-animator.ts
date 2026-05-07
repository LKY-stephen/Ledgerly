import { useEffect, useRef, useState } from "react";

import {
  poses,
  type Point,
  type StickmanPose,
  type StickmanPoseId,
} from "../stickman/stickman-poses";

function mix(a: number, b: number, progress: number) {
  return a + (b - a) * progress;
}

function mixPoint(from: Point, to: Point, progress: number): Point {
  return {
    x: mix(from.x, to.x, progress),
    y: mix(from.y, to.y, progress),
  };
}

function interpolatePose(
  from: StickmanPose,
  to: StickmanPose,
  progress: number,
): StickmanPose {
  return {
    head: {
      cx: mix(from.head.cx, to.head.cx, progress),
      cy: mix(from.head.cy, to.head.cy, progress),
      r: mix(from.head.r, to.head.r, progress),
    },
    neck: mixPoint(from.neck, to.neck, progress),
    hip: mixPoint(from.hip, to.hip, progress),
    armL: [
      mixPoint(from.armL[0], to.armL[0], progress),
      mixPoint(from.armL[1], to.armL[1], progress),
      mixPoint(from.armL[2], to.armL[2], progress),
    ],
    armR: [
      mixPoint(from.armR[0], to.armR[0], progress),
      mixPoint(from.armR[1], to.armR[1], progress),
      mixPoint(from.armR[2], to.armR[2], progress),
    ],
    legL: [
      mixPoint(from.legL[0], to.legL[0], progress),
      mixPoint(from.legL[1], to.legL[1], progress),
      mixPoint(from.legL[2], to.legL[2], progress),
    ],
    legR: [
      mixPoint(from.legR[0], to.legR[0], progress),
      mixPoint(from.legR[1], to.legR[1], progress),
      mixPoint(from.legR[2], to.legR[2], progress),
    ],
  };
}

function easeInOutCubic(progress: number) {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function useStickmanAnimator(
  poseId: StickmanPoseId,
  durationMs = 220,
) {
  const [pose, setPose] = useState<StickmanPose>(poses[poseId] ?? poses.idle);
  const poseRef = useRef(pose);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    poseRef.current = pose;
  }, [pose]);

  useEffect(() => {
    const targetPose = poses[poseId] ?? poses.idle;
    const fromPose = poseRef.current;
    const start = performance.now();

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    const step = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeInOutCubic(progress);
      const nextPose = interpolatePose(fromPose, targetPose, eased);

      poseRef.current = nextPose;
      setPose(nextPose);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [durationMs, poseId]);

  return pose;
}
