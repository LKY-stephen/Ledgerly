import Svg, { G, Rect, Text as SvgText, TSpan } from "react-native-svg";

import type { SurfaceTokens } from "@ledgerly/ui";

import type {
  ParsedTaxFormLayoutElement,
  ParsedTaxFormLayoutPage,
  ParsedTaxFormTextElement,
  TaxFormPage,
  TaxFormSlotId,
  TaxFormSlotState,
  TaxFormSlotSource,
} from "./types";

const FORM_INK = "#111827";
const FORM_MUTED = "#4b5563";
const FORM_RULE = "#0f172a";
const FORM_SHEET = "#fffef9";
const FORM_FONT_FAMILY = "Helvetica";
const CALCULATED_COLOR = "#2563eb";

interface ParsedFormCanvasProps {
  getLayoutPage: (page: TaxFormPage) => ParsedTaxFormLayoutPage;
  onSelectSlot: (slotId: TaxFormSlotId) => void;
  page: TaxFormPage;
  palette: SurfaceTokens;
  selectedSlotId: TaxFormSlotId;
  slots: readonly TaxFormSlotState[];
  width: number;
}

interface SlotRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function ParsedFormCanvas(props: ParsedFormCanvasProps) {
  const { getLayoutPage, onSelectSlot, page, palette, selectedSlotId, slots, width } = props;
  const pageLayout = getLayoutPage(page);
  const pageSlots = slots.filter((slot) => slot.page === page);
  const height = Math.round((width * pageLayout.height) / pageLayout.width);

  return (
    <Svg height={height} viewBox={`0 0 ${pageLayout.width} ${pageLayout.height}`} width={width}>
      <Rect fill={FORM_SHEET} height={pageLayout.height} width={pageLayout.width} x={0} y={0} />
      {pageLayout.elements.map((element, index) => renderLayoutElement(element, index))}
      {pageSlots.map((slot) => {
        const rect = toRect(slot, pageLayout.width, pageLayout.height);
        const isSelected = slot.id === selectedSlotId;
        const isCheckbox = slot.kind === "checkbox";
        const isAmount = slot.kind === "amount";
        const accentColor = getSlotColor(slot.source, palette);
        const previewLines = getPreviewLines(slot, rect.width, isAmount);
        const previewY = getPreviewY(rect, previewLines.length, isAmount);

        return (
          <G key={slot.id}>
            <Rect
              fill={getSlotFill(slot.source, palette)}
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
                fill={slot.source === "manual" ? FORM_MUTED : FORM_INK}
                fontSize={getPreviewFontSize(rect.height, isAmount)}
                fontWeight="700"
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
                stroke="rgba(24, 34, 47, 0.28)"
                strokeWidth={0.7}
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

function renderLayoutElement(element: ParsedTaxFormLayoutElement, index: number) {
  if (element.type === "shape") {
    if (element.orientation === "box") {
      return (
        <Rect
          fill="none"
          height={element.height}
          key={`shape-box-${index}`}
          stroke={FORM_RULE}
          strokeWidth={0.6}
          width={element.width}
          x={element.left}
          y={element.top}
        />
      );
    }

    return (
      <Rect
        fill={FORM_RULE}
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
        stroke={FORM_RULE}
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

function renderParsedText(element: ParsedTaxFormTextElement, index: number) {
  const fontSize = clamp(element.font_size, 6, 13.6);
  const maxCharsPerLine = Math.max(4, Math.floor(element.width / Math.max(fontSize * 0.55, 3)));
  const maxLines = Math.max(1, Math.round((element.height + 2) / (fontSize + 1.6)));
  const lines = wrapText(normalizeText(element.text), maxCharsPerLine, maxLines);

  return (
    <SvgTextBlock
      fill={element.source_type === "paragraph" ? FORM_MUTED : FORM_INK}
      fontFamily={FORM_FONT_FAMILY}
      fontSize={fontSize}
      fontWeight={getTextWeight(element.source_type)}
      key={`text-${index}`}
      lines={lines}
      x={element.left}
      y={element.top + fontSize}
    />
  );
}

function SvgTextBlock(props: {
  fill: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700" | "800";
  lines: string[];
  textAnchor?: "end" | "middle" | "start";
  x: number;
  y: number;
}) {
  const { fill, fontFamily = FORM_FONT_FAMILY, fontSize, fontWeight, lines, textAnchor = "start", x, y } = props;

  return (
    <SvgText
      fill={fill}
      fontFamily={fontFamily}
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

function toRect(slot: TaxFormSlotState, pageWidth: number, pageHeight: number): SlotRect {
  return {
    height: (slot.highlight.heightPct / 100) * pageHeight,
    width: (slot.highlight.widthPct / 100) * pageWidth,
    x: (slot.highlight.leftPct / 100) * pageWidth,
    y: (slot.highlight.topPct / 100) * pageHeight,
  };
}

function getPreviewLines(slot: TaxFormSlotState, rectWidth: number, isAmount: boolean): string[] {
  if (!slot.previewValue || slot.kind === "checkbox") {
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

function getSlotFill(source: TaxFormSlotSource, palette: SurfaceTokens): string {
  if (source === "database") {
    return `${palette.accent}14`;
  }

  if (source === "calculated") {
    return `${CALCULATED_COLOR}12`;
  }

  return `${palette.destructive}12`;
}

function getSlotColor(source: TaxFormSlotSource, palette: SurfaceTokens) {
  if (source === "database") {
    return palette.accent;
  }

  if (source === "calculated") {
    return CALCULATED_COLOR;
  }

  return palette.destructive;
}

function getTextWeight(sourceType: ParsedTaxFormTextElement["source_type"]) {
  switch (sourceType) {
    case "heading":
      return "700";
    case "caption":
      return "600";
    case "list item":
      return "500";
    default:
      return "500";
  }
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number) {
  if (!text) {
    return [];
  }

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const [index, word] of words.entries()) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxCharsPerLine || currentLine.length === 0) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);

    if (lines.length === maxLines - 1) {
      const remaining = [word, ...words.slice(index + 1)].join(" ");
      lines.push(trimWithEllipsis(remaining, maxCharsPerLine));
      return lines;
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, maxLines);
}

function trimWithEllipsis(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(maxChars - 1, 1)).trimEnd()}…`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
