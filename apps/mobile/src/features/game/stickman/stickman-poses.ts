/**
 * Stickman pose definitions.
 *
 * Each pose is a set of control points for the SVG stickman.
 * Coordinates are relative to a 100×140 viewBox.
 *
 * Body parts:
 *   head   — circle center (cx, cy) + radius
 *   neck   — line from head bottom to torso top
 *   torso  — line from neck to hip
 *   armL   — [shoulder, elbow, hand]
 *   armR   — [shoulder, elbow, hand]
 *   legL   — [hip, knee, foot]
 *   legR   — [hip, knee, foot]
 */

export interface Point {
  x: number;
  y: number;
}

export interface StickmanPose {
  head: { cx: number; cy: number; r: number };
  neck: Point;
  hip: Point;
  armL: [Point, Point, Point];
  armR: [Point, Point, Point];
  legL: [Point, Point, Point];
  legR: [Point, Point, Point];
}

const shoulder = { x: 50, y: 48 };
const hip = { x: 50, y: 85 };

export const poses: Record<string, StickmanPose> = {
  idle: {
    head: { cx: 50, cy: 22, r: 14 },
    neck: { x: 50, y: 36 },
    hip,
    armL: [shoulder, { x: 32, y: 62 }, { x: 26, y: 76 }],
    armR: [shoulder, { x: 68, y: 62 }, { x: 74, y: 76 }],
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },

  think: {
    head: { cx: 52, cy: 22, r: 14 },
    neck: { x: 52, y: 36 },
    hip,
    armL: [shoulder, { x: 30, y: 58 }, { x: 24, y: 72 }],
    armR: [shoulder, { x: 62, y: 42 }, { x: 58, y: 26 }], // hand near chin
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },

  spike_prep: {
    // Anticipation squat — body low, knees bent, arms back
    head: { cx: 50, cy: 38, r: 14 },
    neck: { x: 50, y: 52 },
    hip: { x: 50, y: 90 },
    armL: [{ x: 50, y: 58 }, { x: 28, y: 68 }, { x: 18, y: 58 }],
    armR: [{ x: 50, y: 58 }, { x: 72, y: 68 }, { x: 82, y: 58 }],
    legL: [{ x: 50, y: 90 }, { x: 34, y: 108 }, { x: 30, y: 128 }],
    legR: [{ x: 50, y: 90 }, { x: 66, y: 108 }, { x: 70, y: 128 }],
  },

  spike_air: {
    // Airborne — body extended up, arms spiking
    head: { cx: 50, cy: 10, r: 14 },
    neck: { x: 50, y: 24 },
    hip: { x: 50, y: 68 },
    armL: [{ x: 50, y: 34 }, { x: 22, y: 40 }, { x: 10, y: 50 }],
    armR: [{ x: 50, y: 34 }, { x: 78, y: 24 }, { x: 90, y: 14 }],
    legL: [{ x: 50, y: 68 }, { x: 34, y: 88 }, { x: 26, y: 104 }],
    legR: [{ x: 50, y: 68 }, { x: 66, y: 84 }, { x: 74, y: 100 }],
  },

  got_it: {
    head: { cx: 50, cy: 22, r: 14 },
    neck: { x: 50, y: 36 },
    hip,
    armL: [shoulder, { x: 28, y: 52 }, { x: 18, y: 44 }], // thumbs up
    armR: [shoulder, { x: 72, y: 52 }, { x: 82, y: 44 }], // thumbs up
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },

  pocket: {
    // Tucking card into chest — arms crossed inward, slight lean forward
    head: { cx: 50, cy: 20, r: 14 },
    neck: { x: 50, y: 34 },
    hip,
    armL: [shoulder, { x: 40, y: 62 }, { x: 46, y: 72 }],
    armR: [shoulder, { x: 60, y: 62 }, { x: 54, y: 72 }],
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },
};
