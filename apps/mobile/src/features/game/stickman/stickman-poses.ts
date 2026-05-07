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

export const poses = {
  idle: {
    head: { cx: 50, cy: 22, r: 14 },
    neck: { x: 50, y: 36 },
    hip,
    armL: [shoulder, { x: 32, y: 62 }, { x: 26, y: 76 }],
    armR: [shoulder, { x: 68, y: 62 }, { x: 74, y: 76 }],
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },

  idle_breathe: {
    head: { cx: 50, cy: 23, r: 14 },
    neck: { x: 50, y: 37 },
    hip: { x: 50, y: 86 },
    armL: [shoulder, { x: 34, y: 64 }, { x: 28, y: 78 }],
    armR: [shoulder, { x: 66, y: 60 }, { x: 72, y: 74 }],
    legL: [{ x: 50, y: 86 }, { x: 39, y: 106 }, { x: 34, y: 128 }],
    legR: [{ x: 50, y: 86 }, { x: 61, y: 105 }, { x: 66, y: 128 }],
  },

  idle_shift: {
    head: { cx: 48, cy: 22, r: 14 },
    neck: { x: 48, y: 36 },
    hip: { x: 52, y: 85 },
    armL: [{ x: 48, y: 48 }, { x: 34, y: 62 }, { x: 28, y: 78 }],
    armR: [{ x: 48, y: 48 }, { x: 62, y: 60 }, { x: 72, y: 76 }],
    legL: [{ x: 52, y: 85 }, { x: 46, y: 106 }, { x: 44, y: 128 }],
    legR: [{ x: 52, y: 85 }, { x: 63, y: 103 }, { x: 71, y: 126 }],
  },

  walk_a: {
    head: { cx: 52, cy: 21, r: 14 },
    neck: { x: 51, y: 35 },
    hip: { x: 49, y: 84 },
    armL: [{ x: 50, y: 48 }, { x: 64, y: 58 }, { x: 73, y: 74 }],
    armR: [{ x: 50, y: 48 }, { x: 38, y: 62 }, { x: 28, y: 78 }],
    legL: [{ x: 49, y: 84 }, { x: 62, y: 100 }, { x: 72, y: 127 }],
    legR: [{ x: 49, y: 84 }, { x: 39, y: 108 }, { x: 32, y: 127 }],
  },

  walk_b: {
    head: { cx: 50, cy: 23, r: 14 },
    neck: { x: 50, y: 37 },
    hip: { x: 50, y: 86 },
    armL: [{ x: 50, y: 48 }, { x: 60, y: 62 }, { x: 66, y: 76 }],
    armR: [{ x: 50, y: 48 }, { x: 40, y: 60 }, { x: 34, y: 74 }],
    legL: [{ x: 50, y: 86 }, { x: 54, y: 108 }, { x: 60, y: 128 }],
    legR: [{ x: 50, y: 86 }, { x: 42, y: 102 }, { x: 34, y: 125 }],
  },

  walk_c: {
    head: { cx: 48, cy: 21, r: 14 },
    neck: { x: 49, y: 35 },
    hip: { x: 51, y: 84 },
    armL: [{ x: 50, y: 48 }, { x: 36, y: 60 }, { x: 26, y: 76 }],
    armR: [{ x: 50, y: 48 }, { x: 62, y: 58 }, { x: 72, y: 74 }],
    legL: [{ x: 51, y: 84 }, { x: 40, y: 107 }, { x: 30, y: 127 }],
    legR: [{ x: 51, y: 84 }, { x: 62, y: 101 }, { x: 70, y: 126 }],
  },

  walk_d: {
    head: { cx: 50, cy: 23, r: 14 },
    neck: { x: 50, y: 37 },
    hip: { x: 50, y: 86 },
    armL: [{ x: 50, y: 48 }, { x: 40, y: 60 }, { x: 34, y: 74 }],
    armR: [{ x: 50, y: 48 }, { x: 60, y: 62 }, { x: 66, y: 76 }],
    legL: [{ x: 50, y: 86 }, { x: 44, y: 102 }, { x: 36, y: 125 }],
    legR: [{ x: 50, y: 86 }, { x: 56, y: 109 }, { x: 64, y: 128 }],
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
} satisfies Record<string, StickmanPose>;

export type StickmanPoseId = keyof typeof poses;
