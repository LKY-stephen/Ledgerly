import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type PropsWithChildren,
} from "react";

export type CardId = "new" | "report" | "show" | "settings";

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
  | "pocketDone"
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
  cardsPlayedThisSession: number;
}

type GameAction =
  | { type: "ACTIVATE_CARD"; card: CardId }
  | { type: "DEACTIVATE_CARD" }
  | { type: "DISCARD_CARD"; card: CardId }
  | { type: "POCKET_CARD"; card: CardId }
  | { type: "SET_MOOD"; mood: StickmanMood }
  | { type: "SET_SPEECH"; text: string | null }
  | { type: "SET_ANIMATION"; phase: AnimationPhase }
  | { type: "CLEAR_DISCARD" };

export const initialGameState: GameState = {
  activeCard: null,
  stickmanMood: "idle",
  speechBubble: null,
  discardPile: [],
  animationPhase: "idle",
  cardsPlayedThisSession: 0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
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
        cardsPlayedThisSession: state.cardsPlayedThisSession + 1,
      };
    case "POCKET_CARD":
      return {
        ...state,
        activeCard: null,
        animationPhase: "pocketShrink",
        cardsPlayedThisSession: state.cardsPlayedThisSession + 1,
      };
    case "SET_MOOD":
      return state.stickmanMood === action.mood
        ? state
        : { ...state, stickmanMood: action.mood };
    case "SET_SPEECH":
      return state.speechBubble === action.text
        ? state
        : { ...state, speechBubble: action.text };
    case "SET_ANIMATION":
      return state.animationPhase === action.phase
        ? state
        : { ...state, animationPhase: action.phase };
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
  pocketCard: (card: CardId) => void;
  setMood: (mood: StickmanMood) => void;
  setSpeech: (text: string | null) => void;
  setAnimation: (phase: AnimationPhase) => void;
  clearDiscard: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const activateCard = useCallback(
    (card: CardId) => dispatch({ type: "ACTIVATE_CARD", card }),
    [],
  );
  const deactivateCard = useCallback(
    () => dispatch({ type: "DEACTIVATE_CARD" }),
    [],
  );
  const discardCard = useCallback(
    (card: CardId) => dispatch({ type: "DISCARD_CARD", card }),
    [],
  );
  const pocketCard = useCallback(
    (card: CardId) => dispatch({ type: "POCKET_CARD", card }),
    [],
  );
  const setMood = useCallback(
    (mood: StickmanMood) => dispatch({ type: "SET_MOOD", mood }),
    [],
  );
  const setSpeech = useCallback(
    (text: string | null) => dispatch({ type: "SET_SPEECH", text }),
    [],
  );
  const setAnimation = useCallback(
    (phase: AnimationPhase) => dispatch({ type: "SET_ANIMATION", phase }),
    [],
  );
  const clearDiscard = useCallback(
    () => dispatch({ type: "CLEAR_DISCARD" }),
    [],
  );

  const value: GameContextValue = {
    state,
    activateCard,
    deactivateCard,
    discardCard,
    pocketCard,
    setMood,
    setSpeech,
    setAnimation,
    clearDiscard,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider.");
  return ctx;
}
