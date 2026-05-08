import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

import type { StickmanSceneAnchorId } from "../game-ui";

export interface StickmanRoamAnchor {
  id: StickmanSceneAnchorId;
  pauseMs?: number;
  weight?: number;
  x: number;
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
  travelStyle: {
    transform: readonly [{ translateX: Animated.Value }];
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
  const travelX = useRef(new Animated.Value(initialX)).current;
  const currentXRef = useRef(initialX);
  const previousIdRef = useRef<StickmanSceneAnchorId | null>(anchors[0]?.id ?? null);
  const [activeAnchorId, setActiveAnchorId] =
    useState<StickmanSceneAnchorId | null>(anchors[0]?.id ?? null);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const [isWalking, setIsWalking] = useState(false);

  useEffect(() => {
    const listenerId = travelX.addListener(({ value }) => {
      currentXRef.current = value;
    });

    return () => {
      travelX.removeListener(listenerId);
    };
  }, [travelX]);

  useEffect(() => {
    if (!anchors.length) {
      return;
    }

    const boundedX = anchors.some(
      (anchor) => Math.abs(anchor.x - currentXRef.current) < 2,
    )
      ? currentXRef.current
      : anchors[0]?.x ?? 0;

    currentXRef.current = boundedX;
    travelX.setValue(boundedX);
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
  }, [anchors, travelX]);

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

      const distance = Math.abs(next.x - currentXRef.current);
      const duration = Math.max(
        880,
        Math.round(520 + distance * (7.5 - energy * 2.2) + (isPanelOpen ? 180 : 0)),
      );
      const pauseMs =
        next.pauseMs ??
        Math.max(260, Math.round(540 - energy * 180 + (isPanelOpen ? 160 : 0)));

      setFacing(next.x >= currentXRef.current ? "right" : "left");
      setIsWalking(distance > 8);
      setActiveAnchorId(null);

      Animated.timing(travelX, {
        toValue: next.x,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) {
          return;
        }

        currentXRef.current = next.x;
        setIsWalking(false);
        setActiveAnchorId(next.id);

        pauseTimer = setTimeout(moveToNext, pauseMs);
      });
    };

    pauseTimer = setTimeout(moveToNext, 280);

    return () => {
      cancelled = true;
      if (pauseTimer) {
        clearTimeout(pauseTimer);
      }
      travelX.stopAnimation((value) => {
        currentXRef.current = value;
      });
    };
  }, [anchors, energy, isPanelOpen, travelX]);

  return {
    activeAnchorId,
    facing,
    isWalking,
    travelStyle: {
      transform: [{ translateX: travelX }] as const,
    },
  };
}
