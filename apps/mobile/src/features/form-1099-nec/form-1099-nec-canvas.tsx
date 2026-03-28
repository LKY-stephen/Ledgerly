import Svg, { G, Line, Rect, Text as SvgText, TSpan } from "react-native-svg";

import type { SurfaceTokens } from "@creator-cfo/ui";

import type { Form1099NecSlotId, Form1099NecSlotState } from "./form-1099-nec-model";

const CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 720;
const FORM_RED = "#df1f28";
const FORM_RED_SOFT = "rgba(223, 31, 40, 0.18)";
const FORM_INK = "#18222f";
const FORM_MUTED = "#4a5563";
const FORM_SHEET = "#fffdfa";

export const form1099NecCanvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

interface SlotRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

const slotRects: Record<Form1099NecSlotId, SlotRect> = {
  accountNumber: { height: 46, width: 390, x: 52, y: 400 },
  box1: { height: 44, width: 284, x: 596, y: 168 },
  box2: { height: 52, width: 284, x: 596, y: 220 },
  box3: { height: 48, width: 284, x: 596, y: 280 },
  box4: { height: 48, width: 284, x: 596, y: 340 },
  box5: { height: 46, width: 232, x: 52, y: 458 },
  box6: { height: 46, width: 302, x: 286, y: 458 },
  box7: { height: 46, width: 284, x: 596, y: 458 },
  correctedCheckbox: { height: 26, width: 128, x: 410, y: 24 },
  payerCityStateZip: { height: 20, width: 388, x: 52, y: 140 },
  payerName: { height: 36, width: 536, x: 52, y: 76 },
  payerStreetAddress: { height: 28, width: 536, x: 52, y: 114 },
  payerTelephone: { height: 20, width: 148, x: 440, y: 140 },
  payerTin: { height: 44, width: 230, x: 52, y: 168 },
  recipientCityStateZip: { height: 48, width: 536, x: 52, y: 340 },
  recipientName: { height: 52, width: 536, x: 52, y: 220 },
  recipientStreetAddress: { height: 48, width: 536, x: 52, y: 280 },
  recipientTin: { height: 44, width: 304, x: 284, y: 168 },
  secondTinNotice: { height: 46, width: 142, x: 446, y: 400 },
  voidCheckbox: { height: 26, width: 94, x: 304, y: 24 },
};

interface Form1099NecCanvasProps {
  onSelectSlot: (slotId: Form1099NecSlotId) => void;
  palette: SurfaceTokens;
  selectedSlotId: Form1099NecSlotId;
  slots: readonly Form1099NecSlotState[];
  width: number;
}

export function Form1099NecCanvas(props: Form1099NecCanvasProps) {
  const { onSelectSlot, palette, selectedSlotId, slots, width } = props;
  const height = width / form1099NecCanvasAspectRatio;

  return (
    <Svg height={height} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} width={width}>
      <Rect fill={FORM_SHEET} height={CANVAS_HEIGHT} rx={26} width={CANVAS_WIDTH} x={0} y={0} />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={18}
        fontWeight="700"
        lines={["VOID"]}
        x={334}
        y={42}
      />
      <Rect height={18} rx={2} stroke={FORM_RED} strokeWidth={2} width={18} x={306} y={28} />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={18}
        fontWeight="700"
        lines={["CORRECTED"]}
        x={442}
        y={42}
      />
      <Rect height={18} rx={2} stroke={FORM_RED} strokeWidth={2} width={18} x={414} y={28} />

      <Rect fill="none" height={496} stroke={FORM_RED} strokeWidth={2.4} width={836} x={48} y={72} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={592} x2={592} y1={72} y2={512} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={720} x2={720} y1={72} y2={164} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={290} x2={290} y1={164} y2={216} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={452} x2={452} y1={396} y2={454} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={286} x2={286} y1={454} y2={512} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={592} x2={592} y1={454} y2={512} />

      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={164} y2={164} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={216} y2={216} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={276} y2={276} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={336} y2={336} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={396} y2={396} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={454} y2={454} />
      <Line stroke={FORM_RED} strokeWidth={2.1} x1={48} x2={884} y1={512} y2={512} />
      <Line stroke={FORM_RED} strokeWidth={1.6} x1={48} x2={592} y1={112} y2={112} />
      <Line stroke={FORM_RED} strokeWidth={1.6} x1={48} x2={592} y1={138} y2={138} />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={[
          "PAYER'S name, street address, city or town, state or province, country, ZIP",
          "or foreign postal code, and telephone no.",
        ]}
        x={58}
        y={90}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={12}
        fontWeight="700"
        lines={["OMB No. 1545-0116"]}
        x={604}
        y={94}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={16}
        fontWeight="800"
        lines={["Form 1099-NEC"]}
        x={732}
        y={100}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={11}
        fontWeight="700"
        lines={["(Rev. Apr 2025)"]}
        x={732}
        y={124}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={12}
        fontWeight="700"
        lines={["For calendar year"]}
        x={732}
        y={148}
      />

      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["PAYER'S TIN"]} x={58} y={184} />
      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["RECIPIENT'S TIN"]} x={300} y={184} />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={["1  Nonemployee compensation"]}
        x={604}
        y={184}
      />

      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["RECIPIENT'S name"]} x={58} y={238} />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={[
          "2  Payer made direct sales totaling $5,000 or more of",
          "consumer products to recipient for resale",
        ]}
        x={604}
        y={236}
      />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={["Street address (including apt. no.)"]}
        x={58}
        y={298}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={["3  Excess golden parachute payments"]}
        x={604}
        y={300}
      />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={["City or town, state or province, country, and ZIP or foreign postal code"]}
        x={58}
        y={358}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={10}
        fontWeight="700"
        lines={["4  Federal income tax withheld"]}
        x={604}
        y={360}
      />

      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["Account number (see instructions)"]} x={58} y={418} />
      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["2nd TIN not."]} x={468} y={418} />

      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["5  State tax withheld"]} x={58} y={476} />
      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["6  State/Payer's state no."]} x={300} y={476} />
      <SvgTextBlock fill={FORM_RED} fontSize={10} fontWeight="700" lines={["7  State income"]} x={604} y={476} />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={11}
        fontWeight="700"
        lines={["Form 1099-NEC  (Rev. 4-2025)", "Cat. No. 72590N"]}
        x={52}
        y={532}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={11}
        fontWeight="700"
        lines={["www.irs.gov/Form1099NEC", "Department of the Treasury - Internal Revenue Service"]}
        x={430}
        y={532}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={15}
        fontWeight="800"
        lines={["Do Not Cut or Separate Forms on This Page"]}
        x={52}
        y={560}
      />

      <SvgTextBlock
        fill={FORM_RED}
        fontSize={14}
        fontWeight="800"
        lines={["Nonemployee", "Compensation"]}
        x={916}
        y={124}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={22}
        fontWeight="800"
        lines={["Copy A"]}
        x={990}
        y={200}
      />
      <SvgTextBlock
        fill={FORM_RED}
        fontSize={11}
        fontWeight="700"
        lines={[
          "For Internal Revenue",
          "Service Center",
          "",
          "File with Form 1096.",
          "For filing information,",
          "see the current",
          "Instructions for",
          "Certain Information",
          "Returns.",
        ]}
        x={930}
        y={234}
      />

      {slots.map((slot) => {
        const rect = slotRects[slot.id];
        const isSelected = slot.id === selectedSlotId;
        const accentColor = slot.source === "database" ? palette.accent : palette.destructive;
        const fillColor =
          slot.source === "database" ? "rgba(15, 118, 110, 0.12)" : "rgba(194, 65, 12, 0.1)";
        const previewLines = getPreviewLines(slot);
        const isAmountBox = slot.id === "box1" || slot.id === "box4" || slot.id === "box5" || slot.id === "box7";

        return (
          <G key={slot.id}>
            <Rect
              fill={fillColor}
              height={rect.height}
              onPress={(event) => {
                onSelectSlot(slot.id);
                return event;
              }}
              rx={slot.id === "voidCheckbox" || slot.id === "correctedCheckbox" ? 6 : 8}
              stroke={accentColor}
              strokeWidth={isSelected ? 4 : 2.4}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
            {previewLines.length > 0 ? (
              <SvgTextBlock
                fill={slot.source === "database" ? FORM_INK : FORM_MUTED}
                fontSize={isAmountBox ? 15 : 14}
                fontWeight="700"
                lines={previewLines}
                textAnchor={isAmountBox ? "end" : "start"}
                x={isAmountBox ? rect.x + rect.width - 10 : rect.x + 10}
                y={getPreviewY(rect, previewLines.length)}
              />
            ) : null}
            {isSelected ? (
              <Rect
                fill="none"
                height={rect.height - 6}
                pointerEvents="none"
                rx={slot.id === "voidCheckbox" || slot.id === "correctedCheckbox" ? 4 : 6}
                stroke={FORM_RED_SOFT}
                strokeWidth={1.6}
                width={rect.width - 6}
                x={rect.x + 3}
                y={rect.y + 3}
              />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

function SvgTextBlock(props: {
  fill: string;
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700" | "800";
  lines: string[];
  textAnchor?: "end" | "middle" | "start";
  x: number;
  y: number;
}) {
  const { fill, fontSize, fontWeight, lines, textAnchor = "start", x, y } = props;

  return (
    <SvgText
      fill={fill}
      fontSize={fontSize}
      fontWeight={fontWeight}
      textAnchor={textAnchor}
      x={x}
      y={y}
    >
      {lines.map((line, index) => (
        <TSpan dy={index === 0 ? 0 : fontSize + 4} key={`${x}-${y}-${index}`} x={x}>
          {line}
        </TSpan>
      ))}
    </SvgText>
  );
}

function getPreviewLines(slot: Form1099NecSlotState): string[] {
  if (!slot.previewValue) {
    return [];
  }

  const maxChars =
    slot.id === "payerName" || slot.id === "recipientName"
      ? 30
      : slot.id === "payerStreetAddress" ||
          slot.id === "payerCityStateZip" ||
          slot.id === "recipientStreetAddress" ||
          slot.id === "recipientCityStateZip"
        ? 42
        : slot.id === "box1" || slot.id === "box4" || slot.id === "box5" || slot.id === "box7"
          ? 18
          : 22;

  return wrapText(slot.previewValue, maxChars, 3);
}

function getPreviewY(rect: SlotRect, lineCount: number): number {
  const lineHeight = 18;
  const paddingBottom = 10;
  return rect.y + rect.height - paddingBottom - (lineCount - 1) * lineHeight;
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxCharsPerLine));
      current = word.slice(maxCharsPerLine);
    }

    if (lines.length === maxLines) {
      return trimLastLine(lines);
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return trimLastLine(lines.slice(0, maxLines));
  }

  return lines;
}

function trimLastLine(lines: string[]): string[] {
  const nextLines = [...lines];
  const lastLine = nextLines[nextLines.length - 1] ?? "";
  nextLines[nextLines.length - 1] =
    lastLine.length > 2 ? `${lastLine.slice(0, Math.max(lastLine.length - 1, 1))}…` : `${lastLine}…`;
  return nextLines;
}
