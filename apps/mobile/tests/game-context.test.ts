import { describe, expect, it } from "vitest";

import {
  gameReducer,
  initialGameState,
} from "../src/features/game/game-context";

describe("game context reducer", () => {
  it("tracks completed card plays in the session only", () => {
    const discarded = gameReducer(initialGameState, {
      type: "DISCARD_CARD",
      card: "new",
    });
    const pocketed = gameReducer(discarded, {
      type: "POCKET_CARD",
      card: "report",
    });

    expect(discarded.cardsPlayedThisSession).toBe(1);
    expect(pocketed.cardsPlayedThisSession).toBe(2);
    expect(pocketed.activeCard).toBeNull();
  });

  it("allows the animation phase to return to idle after a completed card flow", () => {
    const afterCardPlay = gameReducer(initialGameState, {
      type: "DISCARD_CARD",
      card: "show",
    });
    const reset = gameReducer(afterCardPlay, {
      type: "SET_ANIMATION",
      phase: "idle",
    });

    expect(afterCardPlay.animationPhase).toBe("spikeThrow");
    expect(reset.animationPhase).toBe("idle");
    expect(reset.cardsPlayedThisSession).toBe(1);
  });
});
