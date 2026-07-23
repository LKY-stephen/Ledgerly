import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { surfaceTokens } from "@ledgerly/ui";

import type { StickmanSceneAnchorId } from "../game-ui";

export interface StickmanRoamAnchor {
  facing?: "left" | "right";
  id: StickmanSceneAnchorId;
  pauseMs?: number;
  weight?: number;
  x: number;
  y?: number;
}

interface Options {
  anchors: readonly StickmanRoamAnchor[];
  energy: number;
  isPanelOpen: boolean;
}

interface StickmanRoamResult {
  activeAnchorId: StickmanSceneAnchorId | null;
  facing: "left" | "right";
  isWalking: boolean;
  travelAnchorId: StickmanSceneAnchorId | null;
  travelStyle: {
    transform: readonly [
      { translateX: Animated.Value },
      { translateY: Animated.Value },
    ];
  };
}

function pickNextAnchor(
  anchors: readonly StickmanRoamAnchor[],
  previousId: StickmanSceneAnchorId | null,
): StickmanRoamAnchor | null {
  const eligible = anchors.filter((anchor) => anchor.id !== previousId);
  const pool = eligible.length ? eligible : anchors;

  if (!pool.length) {
    return null;
  }

  const totalWeight = pool.reduce(
    (sum, anchor) => sum + (anchor.weight ?? 1),
    0,
  );

  let remaining = Math.random() * totalWeight;
  for (const anchor of pool) {
    remaining -= anchor.weight ?? 1;
    if (remaining <= 0) {
      return anchor;
    }
  }

  return pool[pool.length - 1] ?? null;
}

export function useStickmanRoam({
  anchors,
  energy,
  isPanelOpen,
}: Options): StickmanRoamResult {
  const initialX = anchors[0]?.x ?? 0;
  const initialY = anchors[0]?.y ?? 0;
  const travelX = useRef(new Animated.Value(initialX)).current;
  const travelY = useRef(new Animated.Value(initialY)).current;
  const currentXRef = useRef(initialX);
  const currentYRef = useRef(initialY);
  const previousIdRef = useRef<StickmanSceneAnchorId | null>(anchors[0]?.id ?? null);
  const [activeAnchorId, setActiveAnchorId] =
    useState<StickmanSceneAnchorId | null>(anchors[0]?.id ?? null);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);
  const [travelAnchorId, setTravelAnchorId] =
    useState<StickmanSceneAnchorId | null>(null);

  useEffect(() => {
    const xListenerId = travelX.addListener(({ value }) => {
      currentXRef.current = value;
    });
    const yListenerId = travelY.addListener(({ value }) => {
      currentYRef.current = value;
    });

    return () => {
      travelX.removeListener(xListenerId);
      travelY.removeListener(yListenerId);
    };
  }, [travelX, travelY]);

  useEffect(() => {
    if (!anchors.length) {
      return;
    }

    const boundedAnchor = anchors.find(
      (anchor) =>
        Math.abs(anchor.x - currentXRef.current) < 2 &&
        Math.abs((anchor.y ?? 0) - currentYRef.current) < 2,
    );
    const boundedX = boundedAnchor ? currentXRef.current : anchors[0]?.x ?? 0;
    const boundedY = boundedAnchor ? currentYRef.current : anchors[0]?.y ?? 0;

    currentXRef.current = boundedX;
    currentYRef.current = boundedY;
    travelX.setValue(boundedX);
    travelY.setValue(boundedY);
    setTravelAnchorId(null);
    setActiveAnchorId((previous) =>
      previous && anchors.some((anchor) => anchor.id === previous)
        ? previous
        : anchors[0]?.id ?? null,
    );
    previousIdRef.current =
      previousIdRef.current &&
      anchors.some((anchor) => anchor.id === previousIdRef.current)
        ? previousIdRef.current
        : anchors[0]?.id ?? null;
  }, [anchors, travelX, travelY]);

  useEffect(() => {
    if (!anchors.length) {
      return;
    }

    let cancelled = false;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;
    const moveToNext = () => {
      const next = pickNextAnchor(anchors, previousIdRef.current);
      if (!next || cancelled) {
        return;
      }

      previousIdRef.current = next.id;

      const nextY = next.y ?? 0;
      const deltaX = next.x - currentXRef.current;
      const deltaY = nextY - currentYRef.current;
      const distance = Math.hypot(deltaX, deltaY);
      const duration = Math.max(
        880,
        Math.round(520 + distance * (7.5 - energy * 2.2) + (isPanelOpen ? 180 : 0)),
      );
      const pauseMs =
        next.pauseMs ??
          Math.max(260, Math.round(540 - energy * 180 + (isPanelOpen ? 160 : 0)));

      setFacing(next.facing ?? (deltaX >= 0 ? "right" : "left"));
      setIsWalking(distance > 8);
      setTravelAnchorId(next.id);
      setActiveAnchorId(null);

      Animated.parallel([
        Animated.timing(travelX, {
          toValue: next.x,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(travelY, {
          toValue: nextY,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }

        currentXRef.current = next.x;
        currentYRef.current = nextY;
        setIsWalking(false);
        setTravelAnchorId(null);
        setActiveAnchorId(next.id);

        pauseTimer = setTimeout(moveToNext, pauseMs);
      });
    };

    pauseTimer = setTimeout(moveToNext, surfaceTokens.motion.base);

    return () => {
      cancelled = true;
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }
      travelX.stopAnimation((value) => {
        currentXRef.current = value;
      });
      travelY.stopAnimation((value) => {
        currentYRef.current = value;
      });
    };
  }, [anchors, energy, isPanelOpen, travelX, travelY]);

  return {
    activeAnchorId,
    facing,
    isWalking,
    travelAnchorId,
    travelStyle: {
      transform: [{ translateX: travelX }, { translateY: travelY }] as const,
    },
  };
}
