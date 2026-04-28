import Svg, { Circle, Line, G } from "react-native-svg";

import { poses, type StickmanPose, type Point } from "./stickman-poses";
import type { StickmanMood } from "../game-context";

interface Props {
  mood: StickmanMood;
  height: number;
  stroke: string;
  glowFilter: string;
}

function limb(points: [Point, Point, Point], stroke: string, width: number) {
  return (
    <>
      <Line
        x1={points[0].x}
        y1={points[0].y}
        x2={points[1].x}
        y2={points[1].y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <Line
        x1={points[1].x}
        y1={points[1].y}
        x2={points[2].x}
        y2={points[2].y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
    </>
  );
}

export function StickmanSvg({ mood, height, stroke }: Props) {
  const pose: StickmanPose = poses[mood] ?? poses.idle;
  const aspect = 100 / 140;
  const w = height * aspect;
  const sw = 3.5;

  return (
    <Svg width={w} height={height} viewBox="0 0 100 140">
      <G>
        {/* Head */}
        <Circle
          cx={pose.head.cx}
          cy={pose.head.cy}
          r={pose.head.r}
          stroke={stroke}
          strokeWidth={sw}
          fill="none"
        />

        {/* Neck → Hip (torso) */}
        <Line
          x1={pose.neck.x}
          y1={pose.neck.y}
          x2={pose.hip.x}
          y2={pose.hip.y}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* Arms */}
        {limb(pose.armL, stroke, sw)}
        {limb(pose.armR, stroke, sw)}

        {/* Legs */}
        {limb(pose.legL, stroke, sw)}
        {limb(pose.legR, stroke, sw)}
      </G>
    </Svg>
  );
}
