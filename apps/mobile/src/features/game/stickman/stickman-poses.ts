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
    head: { cx: 50, cy: 20, r: 14 },
    neck: { x: 50, y: 34 },
    hip,
    armL: [shoulder, { x: 28, y: 56 }, { x: 20, y: 68 }],
    armR: [shoulder, { x: 72, y: 32 }, { x: 82, y: 18 }], // arm raised high
    legL: [hip, { x: 40, y: 102 }, { x: 36, y: 126 }],
    legR: [hip, { x: 60, y: 100 }, { x: 64, y: 124 }],
  },

  spike_air: {
    head: { cx: 50, cy: 14, r: 14 },
    neck: { x: 50, y: 28 },
    hip: { x: 50, y: 72 },
    armL: [{ x: 50, y: 38 }, { x: 24, y: 44 }, { x: 14, y: 52 }],
    armR: [{ x: 50, y: 38 }, { x: 76, y: 30 }, { x: 88, y: 22 }], // spiking
    legL: [{ x: 50, y: 72 }, { x: 36, y: 92 }, { x: 28, y: 108 }],
    legR: [{ x: 50, y: 72 }, { x: 64, y: 88 }, { x: 72, y: 104 }],
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
    head: { cx: 50, cy: 22, r: 14 },
    neck: { x: 50, y: 36 },
    hip,
    armL: [shoulder, { x: 36, y: 68 }, { x: 42, y: 82 }], // hand in pocket area
    armR: [shoulder, { x: 64, y: 68 }, { x: 58, y: 82 }], // hand in pocket area
    legL: [hip, { x: 38, y: 105 }, { x: 32, y: 128 }],
    legR: [hip, { x: 62, y: 105 }, { x: 68, y: 128 }],
  },
};
