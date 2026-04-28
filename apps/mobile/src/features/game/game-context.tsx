import { createContext, useContext, useReducer, type PropsWithChildren } from "react";

export type CardId = "new" | "report" | "show";

export type StickmanMood =
  | "idle"
  | "think"
  | "spike_prep"
  | "spike_air"
  | "got_it"
  | "pocket";

export type AnimationPhase =
  | "idle"
  | "flipIn"
  | "flipOut"
  | "spikeThrow"
  | "pocketShrink"
  | "dragging";

export interface DiscardEntry {
  card: CardId;
  timestamp: number;
}

export interface GameState {
  activeCard: CardId | null;
  stickmanMood: StickmanMood;
  speechBubble: string | null;
  discardPile: DiscardEntry[];
  animationPhase: AnimationPhase;
}

type GameAction =
  | { type: "ACTIVATE_CARD"; card: CardId }
  | { type: "DEACTIVATE_CARD" }
  | { type: "DISCARD_CARD"; card: CardId }
  | { type: "SET_MOOD"; mood: StickmanMood }
  | { type: "SET_SPEECH"; text: string | null }
  | { type: "SET_ANIMATION"; phase: AnimationPhase }
  | { type: "CLEAR_DISCARD" };

const initialState: GameState = {
  activeCard: null,
  stickmanMood: "idle",
  speechBubble: null,
  discardPile: [],
  animationPhase: "idle",
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ACTIVATE_CARD":
      return { ...state, activeCard: action.card, animationPhase: "flipIn" };
    case "DEACTIVATE_CARD":
      return { ...state, activeCard: null, animationPhase: "flipOut" };
    case "DISCARD_CARD":
      return {
        ...state,
        activeCard: null,
        discardPile: [
          ...state.discardPile,
          { card: action.card, timestamp: Date.now() },
        ],
        animationPhase: "spikeThrow",
      };
    case "SET_MOOD":
      return { ...state, stickmanMood: action.mood };
    case "SET_SPEECH":
      return { ...state, speechBubble: action.text };
    case "SET_ANIMATION":
      return { ...state, animationPhase: action.phase };
    case "CLEAR_DISCARD":
      return { ...state, discardPile: [] };
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  activateCard: (card: CardId) => void;
  deactivateCard: () => void;
  discardCard: (card: CardId) => void;
  setMood: (mood: StickmanMood) => void;
  setSpeech: (text: string | null) => void;
  setAnimation: (phase: AnimationPhase) => void;
  clearDiscard: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const value: GameContextValue = {
    state,
    activateCard: (card) => dispatch({ type: "ACTIVATE_CARD", card }),
    deactivateCard: () => dispatch({ type: "DEACTIVATE_CARD" }),
    discardCard: (card) => dispatch({ type: "DISCARD_CARD", card }),
    setMood: (mood) => dispatch({ type: "SET_MOOD", mood }),
    setSpeech: (text) => dispatch({ type: "SET_SPEECH", text }),
    setAnimation: (phase) => dispatch({ type: "SET_ANIMATION", phase }),
    clearDiscard: () => dispatch({ type: "CLEAR_DISCARD" }),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider.");
  return ctx;
}
