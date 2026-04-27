import Svg, { G, Rect, Text as SvgText, TSpan } from "react-native-svg";

import type { SurfaceTokens } from "@ledgerly/ui";

import {
  getForm1099NecLayoutPage,
  type Form1099NecLayoutElement,
  type Form1099NecLayoutTextElement,
} from "./form-1099-nec-layout";
import type { Form1099NecSlotId, Form1099NecSlotState } from "./form-1099-nec-model";

const FORM_RED = "#FE2F2F";
const FORM_RED_DARK = "#CC0000";
const FORM_SHEET = "#FFFFFF";
const FORM_INK = "#000000";
const FORM_MUTED = "#555555";

const amountSlotIds = new Set<Form1099NecSlotId>(["box1", "box3", "box4", "box5", "box7"]);
const checkboxSlotIds = new Set<Form1099NecSlotId>([
  "box2",
  "correctedCheckbox",
  "secondTinNotice",
  "voidCheckbox",
]);
const hiddenCanvasSlotIds = new Set<Form1099NecSlotId>([
  "payerStreetAddress",
  "payerCityStateZip",
  "payerTelephone",
]);

interface SlotRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface Form1099NecCanvasProps {
  onSelectSlot: (slotId: Form1099NecSlotId) => void;
  palette: SurfaceTokens;
  selectedSlotId: Form1099NecSlotId;
  slots: readonly Form1099NecSlotState[];
  width: number;
}

export function Form1099NecCanvas(props: Form1099NecCanvasProps) {
  const { onSelectSlot, palette, selectedSlotId, slots, width } = props;
  const pageLayout = getForm1099NecLayoutPage();
  const height = Math.round((width * pageLayout.height) / pageLayout.width);

  return (
    <Svg height={height} viewBox={`0 0 ${pageLayout.width} ${pageLayout.height}`} width={width}>
      <Rect fill={FORM_SHEET} height={pageLayout.height} width={pageLayout.width} x={0} y={0} />
      {pageLayout.elements.map((element, index) => renderLayoutElement(element, index))}
      {slots
        .filter((slot) => !hiddenCanvasSlotIds.has(slot.id))
        .map((slot) => {
        const rect = toRect(slot, pageLayout.width, pageLayout.height);
        const isSelected = slot.id === selectedSlotId;
        const isCheckbox = checkboxSlotIds.has(slot.id);
        const isAmount = amountSlotIds.has(slot.id);
        const accentColor = slot.source === "database" ? palette.accent : palette.destructive;
        const previewLines = getPreviewLines(slot, rect.width, isAmount);
        const previewY = getPreviewY(rect, previewLines.length, isAmount);

        return (
          <G key={slot.id}>
            <Rect
              fill={getSlotFill(slot, palette)}
              height={rect.height}
              onPress={(event) => {
                onSelectSlot(slot.id);
                return event;
              }}
              rx={isCheckbox ? 2 : 3}
              stroke={accentColor}
              strokeWidth={isSelected ? 1.7 : 1.05}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
            {previewLines.length > 0 ? (
              <SvgTextBlock
                fill={slot.source === "database" ? FORM_INK : FORM_MUTED}
                fontSize={getPreviewFontSize(rect.height, isAmount)}
                fontWeight="800"
                lines={previewLines}
                textAnchor={isAmount ? "end" : "start"}
                x={isAmount ? rect.x + rect.width - 3 : rect.x + 3}
                y={previewY}
              />
            ) : null}
            {isSelected ? (
              <Rect
                fill="none"
                height={Math.max(rect.height - 1.5, 1)}
                rx={isCheckbox ? 1.5 : 2.5}
                stroke="rgba(0, 0, 0, 0.4)"
                strokeWidth={0.8}
                width={Math.max(rect.width - 1.5, 1)}
                x={rect.x + 0.75}
                y={rect.y + 0.75}
              />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}

function renderLayoutElement(element: Form1099NecLayoutElement, index: number) {
  if (element.type === "shape") {
    if (element.orientation === "box") {
      return (
        <Rect
          fill="none"
          height={element.height}
          key={`shape-box-${index}`}
          stroke={FORM_RED}
          strokeWidth={0.6}
          width={element.width}
          x={element.left}
          y={element.top}
        />
      );
    }

    return (
      <Rect
        fill={FORM_RED}
        height={element.height}
        key={`shape-rule-${index}`}
        width={element.width}
        x={element.left}
        y={element.top}
      />
    );
  }

  if (element.type === "cell") {
    return (
      <Rect
        fill="none"
        height={element.height}
        key={`cell-${index}`}
        stroke={FORM_RED}
        strokeWidth={0.55}
        width={element.width}
        x={element.left}
        y={element.top}
      />
    );
  }

  if (element.type === "text") {
    return renderParsedText(element, index);
  }

  return null;
}

function renderParsedText(element: Form1099NecLayoutTextElement, index: number) {
  const fontSize = clamp(element.fontSize, 6.1, 13.6);
  const maxCharsPerLine = Math.max(4, Math.floor(element.width / Math.max(fontSize * 0.55, 3)));
  const maxLines = Math.max(1, Math.round((element.height + 2) / (fontSize + 1.6)));
  const lines = wrapText(element.text.replace(/\s+/g, " ").trim(), maxCharsPerLine, maxLines);

  return (
    <SvgTextBlock
      fill={element.sourceType === "paragraph" ? FORM_RED_DARK : FORM_RED}
      fontSize={fontSize}
      fontWeight={getTextWeight(element.sourceType)}
      key={`text-${index}`}
      lines={lines}
      x={element.left}
      y={element.top + fontSize}
    />
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
        <TSpan dy={index === 0 ? 0 : fontSize + 1.6} key={`${x}-${y}-${index}`} x={x}>
          {line}
        </TSpan>
      ))}
    </SvgText>
  );
}

function toRect(slot: Form1099NecSlotState, pageWidth: number, pageHeight: number): SlotRect {
  return {
    height: (slot.highlight.heightPct / 100) * pageHeight,
    width: (slot.highlight.widthPct / 100) * pageWidth,
    x: (slot.highlight.leftPct / 100) * pageWidth,
    y: (slot.highlight.topPct / 100) * pageHeight,
  };
}

function getPreviewLines(slot: Form1099NecSlotState, rectWidth: number, isAmount: boolean): string[] {
  if (!slot.previewValue || checkboxSlotIds.has(slot.id)) {
    return [];
  }

  const maxChars = isAmount
    ? Math.max(8, Math.floor(rectWidth / 5.2))
    : Math.max(10, Math.floor(rectWidth / 5.8));

  return wrapText(slot.previewValue, maxChars, isAmount ? 2 : 3);
}

function getPreviewY(rect: SlotRect, lineCount: number, isAmount: boolean): number {
  if (isAmount) {
    return rect.y + rect.height - 2.5 - (lineCount - 1) * 8.8;
  }

  return rect.y + rect.height - 2.5 - (lineCount - 1) * 8.4;
}

function getPreviewFontSize(rectHeight: number, isAmount: boolean) {
  if (rectHeight < 12.5) {
    return isAmount ? 6.4 : 6.1;
  }

  if (rectHeight < 18) {
    return isAmount ? 7.3 : 6.8;
  }

  return isAmount ? 8.4 : 7.4;
}

function getSlotFill(slot: Form1099NecSlotState, palette: SurfaceTokens): string {
  return slot.source === "database" ? `${palette.accent}14` : `${palette.destructive}12`;
}

function getTextWeight(sourceType: Form1099NecLayoutTextElement["sourceType"]) {
  switch (sourceType) {
    case "heading":
      return "800";
    case "caption":
      return "800";
    case "list item":
      return "500";
    case "paragraph":
    default:
      return "500";
  }
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
