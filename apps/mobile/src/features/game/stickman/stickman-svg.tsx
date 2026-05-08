import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";

import type { StickmanPose, Point } from "./stickman-poses";
import { useStickmanAnimator } from "../animations/use-stickman-animator";
import type { StickmanMood } from "../game-context";
import type { StickmanPoseId } from "./stickman-poses";

interface Props {
  facing: "left" | "right";
  isWalking: boolean;
  poseId: StickmanPoseId;
  mood: StickmanMood;
  height: number;
  stroke: string;
  accent: string;
  accentSoft: string;
  energy: number;
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

function renderExpression(pose: StickmanPose, mood: StickmanMood, stroke: string) {
  const headCenterX = pose.head.cx;
  const headCenterY = pose.head.cy;
  const eyeY = headCenterY - 1;
  const leftEyeX = headCenterX - 4.5;
  const rightEyeX = headCenterX + 4.5;

  const eyes =
    mood === "spike_prep" || mood === "think" ? (
      <>
        <Line
          x1={leftEyeX - 1.8}
          y1={eyeY + 0.4}
          x2={leftEyeX + 1.8}
          y2={eyeY - 0.9}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Line
          x1={rightEyeX - 1.8}
          y1={eyeY - 0.9}
          x2={rightEyeX + 1.8}
          y2={eyeY + 0.4}
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </>
    ) : (
      <>
        <Circle cx={leftEyeX} cy={eyeY} r={1.5} fill={stroke} />
        <Circle cx={rightEyeX} cy={eyeY} r={1.5} fill={stroke} />
      </>
    );

  let mouth = `M ${headCenterX - 5} ${headCenterY + 6} Q ${headCenterX} ${headCenterY + 6} ${headCenterX + 5} ${headCenterY + 6}`;

  if (mood === "got_it" || mood === "pocket") {
    mouth = `M ${headCenterX - 5} ${headCenterY + 5} Q ${headCenterX} ${headCenterY + 8} ${headCenterX + 5} ${headCenterY + 5}`;
  } else if (mood === "think") {
    mouth = `M ${headCenterX - 3.5} ${headCenterY + 6.5} Q ${headCenterX} ${headCenterY + 8} ${headCenterX + 2} ${headCenterY + 5.5}`;
  } else if (mood === "spike_air") {
    mouth = `M ${headCenterX - 2} ${headCenterY + 6} Q ${headCenterX} ${headCenterY + 10} ${headCenterX + 2} ${headCenterY + 6}`;
  }

  return (
    <>
      {eyes}
      <Path d={mouth} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
    </>
  );
}

function renderFigure(
  pose: StickmanPose,
  mood: StickmanMood,
  stroke: string,
  width: number,
) {
  return (
    <>
      <Circle
        cx={pose.head.cx}
        cy={pose.head.cy}
        r={pose.head.r}
        stroke={stroke}
        strokeWidth={width}
        fill="none"
      />
      <Line
        x1={pose.neck.x}
        y1={pose.neck.y}
        x2={pose.hip.x}
        y2={pose.hip.y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
      {limb(pose.armL, stroke, width)}
      {limb(pose.armR, stroke, width)}
      {limb(pose.legL, stroke, width)}
      {limb(pose.legR, stroke, width)}
      {renderExpression(pose, mood, stroke)}
    </>
  );
}

export function StickmanSvg({
  facing,
  isWalking,
  poseId,
  mood,
  height,
  stroke,
  accent,
  accentSoft,
  energy,
}: Props) {
  const animatedPose = useStickmanAnimator(poseId, isWalking ? 180 : 240);
  const aspect = 100 / 140;
  const w = height * aspect;
  const sw = 5.25 + energy * 0.5;
  const auraOpacity = 0.12 + energy * 0.18;
  const facingTransform =
    facing === "left" ? undefined : "translate(100 0) scale(-1 1)";

  return (
    <Svg width={w} height={height} viewBox="0 0 100 140">
      <Ellipse
        cx={50}
        cy={132}
        rx={20 + energy * 4}
        ry={4.5 + energy * 1.5}
        fill={accentSoft}
      />
      {energy > 0.2 ? (
        <G opacity={auraOpacity}>
          <Line x1={17} y1={40} x2={9} y2={34} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <Line x1={84} y1={44} x2={93} y2={38} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <Line x1={30} y1={124} x2={22} y2={130} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <Line x1={70} y1={124} x2={78} y2={130} stroke={accent} strokeWidth={3} strokeLinecap="round" />
          {energy > 0.65 ? (
            <>
              <Line x1={50} y1={8} x2={50} y2={0} stroke={accent} strokeWidth={3} strokeLinecap="round" />
              <Line x1={39} y1={12} x2={33} y2={4} stroke={accent} strokeWidth={3} strokeLinecap="round" />
              <Line x1={61} y1={12} x2={67} y2={4} stroke={accent} strokeWidth={3} strokeLinecap="round" />
            </>
          ) : null}
        </G>
      ) : null}
      <G transform={facingTransform}>
        <G opacity={0.14 + energy * 0.14} transform="translate(2 3)">
          {renderFigure(animatedPose, mood, accent, sw + 1.4)}
        </G>
        {renderFigure(animatedPose, mood, stroke, sw)}
      </G>
    </Svg>
  );
}
