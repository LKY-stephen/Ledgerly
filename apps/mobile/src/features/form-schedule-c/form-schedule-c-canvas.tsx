import Svg, { G, Rect, Text as SvgText, TSpan } from "react-native-svg";

import type { SurfaceTokens } from "@creator-cfo/ui";

import {
  getScheduleCLayoutPage,
  type ScheduleCLayoutElement,
  type ScheduleCLayoutTextElement,
} from "./form-schedule-c-layout";
import type {
  FormScheduleCPage,
  FormScheduleCSlotId,
  FormScheduleCSlotState,
} from "./form-schedule-c-model";

const FORM_INK = "#111827";
const FORM_MUTED = "#4b5563";
const FORM_RULE = "#0f172a";
const FORM_SHEET = "#fffef9";
const CALCULATED_COLOR = "#2563eb";
const MIN_PARSED_TEXT_FONT_SIZE = 5.2;
const PARSED_TEXT_WIDTH_FACTOR = 0.4;
const PARSED_TEXT_MIN_WIDTH = 2.6;
const PARSED_TEXT_FONT_STEP = 0.25;
const SECTION_LABEL_BOX_MIN_WIDTH = 35;
const SECTION_LABEL_BOX_MAX_WIDTH = 37;
const SECTION_LABEL_BOX_MIN_HEIGHT = 11;
const SECTION_LABEL_BOX_MAX_HEIGHT = 13;

type SvgTextAnchor = "end" | "middle" | "start";
type SvgTextWeight = "400" | "500" | "600" | "700" | "800";

interface ManualTextBlock {
  fill: string;
  fontSize: number;
  fontWeight: SvgTextWeight;
  lineGap?: number;
  lines: string[];
  textAnchor?: SvgTextAnchor;
  x: number;
  y: number;
}

interface FormScheduleCCanvasProps {
  onSelectSlot: (slotId: FormScheduleCSlotId) => void;
  page: FormScheduleCPage;
  palette: SurfaceTokens;
  selectedSlotId: FormScheduleCSlotId;
  slots: readonly FormScheduleCSlotState[];
  width: number;
}

export function FormScheduleCCanvas(props: FormScheduleCCanvasProps) {
  const { onSelectSlot, page, palette, selectedSlotId, slots, width } = props;
  const pageLayout = getScheduleCLayoutPage(page);
  const pageSlots = slots.filter((slot) => slot.page === page);
  const height = Math.round((width * pageLayout.height) / pageLayout.width);

  return (
    <Svg height={height} viewBox={`0 0 ${pageLayout.width} ${pageLayout.height}`} width={width}>
      <Rect fill={FORM_SHEET} height={pageLayout.height} width={pageLayout.width} x={0} y={0} />
      {pageLayout.elements.map((element, index) => renderLayoutElement(element, index))}
      {pageSlots.map((slot) => {
        const rect = toRect(slot, pageLayout.width, pageLayout.height);
        const isSelected = slot.id === selectedSlotId;
        const accentColor = getSlotColor(slot, palette);
        const previewLines = getPreviewLines(slot, rect.width);
        const previewY = getPreviewY(slot, rect, previewLines.length);

        return (
          <G key={slot.id}>
            <Rect
              fill={getSlotFill(slot, palette)}
              height={rect.height}
              onPress={(event) => {
                onSelectSlot(slot.id);
                return event;
              }}
              rx={slot.kind === "checkbox" ? 2 : 3}
              stroke={accentColor}
              strokeWidth={isSelected ? 1.8 : 1.1}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
            {previewLines.length > 0 ? (
              <SvgTextBlock
                fill={slot.source === "manual" ? FORM_MUTED : FORM_INK}
                fontSize={slot.kind === "amount" ? 8.8 : 7.8}
                fontWeight="700"
                lines={previewLines}
                textAnchor={slot.kind === "amount" ? "end" : "start"}
                x={slot.kind === "amount" ? rect.x + rect.width - 4 : rect.x + 4}
                y={previewY}
              />
            ) : null}
            {isSelected ? (
              <Rect
                fill="none"
                height={Math.max(rect.height - 1.5, 1)}
                rx={slot.kind === "checkbox" ? 1.5 : 2.5}
                stroke="rgba(15, 23, 42, 0.35)"
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

function renderLayoutElement(element: ScheduleCLayoutElement, index: number) {
  if (element.type === "shape") {
    if (element.orientation === "box") {
      return (
        <Rect
          fill={isSectionLabelBox(element) ? FORM_RULE : "none"}
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
    if (!shouldRenderCell(element)) {
      return null;
    }

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

function renderParsedText(element: ScheduleCLayoutTextElement, index: number) {
  const normalizedText = element.text.replace(/\s+/g, " ").trim();
  const specialText = renderSpecialParsedText(element, normalizedText, index);

  if (specialText !== undefined) {
    return specialText;
  }

  const { fontSize, lines } = fitParsedTextBlock(element);

  return (
    <SvgTextBlock
      fill={element.sourceType === "paragraph" ? FORM_MUTED : FORM_INK}
      fontSize={fontSize}
      fontWeight={getTextWeight(element.sourceType)}
      key={`text-${index}`}
      lines={lines}
      x={element.left}
      y={element.top + fontSize}
    />
  );
}

function renderSpecialParsedText(
  element: ScheduleCLayoutTextElement,
  normalizedText: string,
  index: number,
) {
  switch (normalizedText) {
    case "Name of proprietor Social security number (SSN)":
      return renderManualTextGroup(index, [
        {
          fill: FORM_INK,
          fontSize: 8,
          fontWeight: "700",
          lines: ["Name of proprietor"],
          x: 36,
          y: element.top + 8,
        },
        {
          fill: FORM_INK,
          fontSize: 8,
          fontWeight: "700",
          lines: ["Social security number (SSN)"],
          x: 489.5,
          y: element.top + 8,
        },
      ]);
    case "A Principal business or profession, including product or service (see instructions) B Enter code from instructions":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["A Principal business or profession, including product or service (see instructions)"],
          x: 36,
          y: element.top + 8,
        },
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["B Enter code from instructions"],
          x: 448,
          y: element.top + 8,
        },
      ]);
    case "C Business name. If no separate business name, leave blank. D Employer ID number (EIN) (see instr.)":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["C Business name. If no separate business name, leave blank."],
          x: 36,
          y: element.top + 8,
        },
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["D Employer ID number (EIN) (see instr.)"],
          x: 448,
          y: element.top + 8,
        },
      ]);
    case "Schedule C (Form 1040) 2025 Page 2":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 7,
          fontWeight: "500",
          lines: ["Schedule C (Form 1040) 2025"],
          x: 36,
          y: element.top + 7,
        },
        {
          fill: FORM_MUTED,
          fontSize: 7,
          fontWeight: "500",
          lines: ["Page 2"],
          textAnchor: "end",
          x: 576,
          y: element.top + 7,
        },
      ]);
    case "Part I":
    case "Part II":
    case "Part V":
      return renderSectionLabel(index, element, normalizedText);
    case "Part III Cost of Goods Sold (see instructions)":
      return renderManualTextGroup(index, [
        getSectionLabelBlock(element, "Part III"),
        {
          fill: FORM_INK,
          fontSize: 10,
          fontWeight: "700",
          lines: ["Cost of Goods Sold (see instructions)"],
          x: 80,
          y: element.top + 10,
        },
      ]);
    case "Part IV Information on Your Vehicle. Complete this part only if you are claiming car or truck expenses on line 9 andare not required to file Form 4562 for this business. See the instructions for line 13 to find out if you must fileForm 4562.":
      return renderManualTextGroup(index, [
        getSectionLabelBlock(element, "Part IV"),
        {
          fill: FORM_INK,
          fontSize: 9.2,
          fontWeight: "700",
          lineGap: 10.4,
          lines: [
            "Information on Your Vehicle. Complete this part only if you are claiming car or truck",
            "expenses on line 9 and are not required to file Form 4562 for this business. See the",
            "instructions for line 13 to find out if you must file Form 4562.",
          ],
          x: 80,
          y: element.top + 9.6,
        },
      ]);
    case "a Business b Commuting (see instructions) c Other":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["a Business"],
          x: 50.4,
          y: element.top + 8,
        },
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["b Commuting (see instructions)"],
          x: 194,
          y: element.top + 8,
        },
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["c Other"],
          x: 418,
          y: element.top + 8,
        },
      ]);
    case "• If a profit, enter on both Schedule 1 (Form 1040), line 3, and on Schedule SE, line 2. (If you":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 7.2,
          fontWeight: "500",
          lineGap: 8.2,
          lines: [
            "• If a profit, enter on both Schedule 1 (Form 1040), line 3, and on Schedule SE, line 2.",
            "(If you checked the box on line 1, see instructions.) Estates and trusts, enter on Form 1041, line 3.",
          ],
          x: 64.8,
          y: element.top + 7.2,
        },
      ]);
    case "checked the box on line 1, see instructions.) Estates and trusts, enter on Form 1041, line 3. }":
    case "} 32a":
      return null;
    case "All investment is at risk. 32b":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["32a All investment is at risk."],
          x: 457.5,
          y: element.top + 8,
        },
      ]);
    case "Some investment is not at risk.":
      return renderManualTextGroup(index, [
        {
          fill: FORM_MUTED,
          fontSize: 8,
          fontWeight: "500",
          lines: ["32b Some investment is not at risk."],
          x: 457.5,
          y: element.top + 8,
        },
      ]);
    default:
      return undefined;
  }
}

function renderManualTextGroup(index: number, blocks: ManualTextBlock[]) {
  return (
    <G key={`text-${index}`}>
      {blocks.map((block, blockIndex) => (
        <SvgTextBlock
          fill={block.fill}
          fontSize={block.fontSize}
          fontWeight={block.fontWeight}
          key={`text-${index}-${blockIndex}`}
          lineGap={block.lineGap}
          lines={block.lines}
          textAnchor={block.textAnchor}
          x={block.x}
          y={block.y}
        />
      ))}
    </G>
  );
}

function renderSectionLabel(index: number, element: ScheduleCLayoutTextElement, label: string) {
  return renderManualTextGroup(index, [getSectionLabelBlock(element, label)]);
}

function getSectionLabelBlock(element: ScheduleCLayoutTextElement, label: string): ManualTextBlock {
  return {
    fill: FORM_SHEET,
    fontSize: 8.2,
    fontWeight: "700",
    lines: [label],
    textAnchor: "middle",
    x: 54,
    y: element.top + 8.8,
  };
}

function shouldRenderCell(element: Extract<ScheduleCLayoutElement, { type: "cell" }>) {
  // The parser emits a few merged container cells that become visually noisy when
  // drawn on top of the already parsed rule lines. Keep the smaller field cells.
  return !(element.width > 150 || element.height > 50);
}

function isSectionLabelBox(element: Extract<ScheduleCLayoutElement, { type: "shape" }>) {
  return (
    element.orientation === "box" &&
    element.width >= SECTION_LABEL_BOX_MIN_WIDTH &&
    element.width <= SECTION_LABEL_BOX_MAX_WIDTH &&
    element.height >= SECTION_LABEL_BOX_MIN_HEIGHT &&
    element.height <= SECTION_LABEL_BOX_MAX_HEIGHT
  );
}

function fitParsedTextBlock(element: ScheduleCLayoutTextElement) {
  let fontSize = clamp(element.fontSize, 6.2, 13.8);
  const normalizedText = element.text.replace(/\s+/g, " ").trim();

  while (fontSize >= MIN_PARSED_TEXT_FONT_SIZE) {
    const wrapped = wrapTextToFit(
      normalizedText,
      estimateMaxCharsPerLine(element.width, fontSize),
      estimateMaxLines(element.height, fontSize),
    );

    if (wrapped.fits) {
      return {
        fontSize,
        lines: wrapped.lines,
      };
    }

    fontSize = Number((fontSize - PARSED_TEXT_FONT_STEP).toFixed(2));
  }

  return {
    fontSize: MIN_PARSED_TEXT_FONT_SIZE,
    lines: forceWrapText(
      normalizedText,
      estimateMaxCharsPerLine(element.width, MIN_PARSED_TEXT_FONT_SIZE),
      estimateMaxLines(element.height, MIN_PARSED_TEXT_FONT_SIZE),
    ),
  };
}

function SvgTextBlock(props: {
  fill: string;
  fontSize: number;
  fontWeight: SvgTextWeight;
  lineGap?: number;
  lines: string[];
  textAnchor?: SvgTextAnchor;
  x: number;
  y: number;
}) {
  const { fill, fontSize, fontWeight, lineGap = fontSize + 1.8, lines, textAnchor = "start", x, y } = props;

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
        <TSpan dy={index === 0 ? 0 : lineGap} key={`${x}-${y}-${index}`} x={x}>
          {line}
        </TSpan>
      ))}
    </SvgText>
  );
}

function toRect(slot: FormScheduleCSlotState, pageWidth: number, pageHeight: number): SlotRect {
  return {
    height: (slot.highlight.heightPct / 100) * pageHeight,
    width: (slot.highlight.widthPct / 100) * pageWidth,
    x: (slot.highlight.leftPct / 100) * pageWidth,
    y: (slot.highlight.topPct / 100) * pageHeight,
  };
}

function getPreviewLines(slot: FormScheduleCSlotState, rectWidth: number): string[] {
  if (!slot.previewValue || slot.kind === "checkbox") {
    return [];
  }

  const maxChars =
    slot.kind === "amount" ? Math.max(8, Math.floor(rectWidth / 5.4)) : Math.max(10, Math.floor(rectWidth / 5.8));

  return forceWrapText(slot.previewValue, maxChars, slot.kind === "amount" ? 2 : 3);
}

function getPreviewY(slot: FormScheduleCSlotState, rect: SlotRect, lineCount: number): number {
  if (slot.kind === "amount") {
    return rect.y + rect.height - 3.5 - (lineCount - 1) * 10.2;
  }

  return rect.y + rect.height - 3 - (lineCount - 1) * 9.2;
}

function getSlotColor(slot: FormScheduleCSlotState, palette: SurfaceTokens): string {
  if (slot.source === "database") {
    return palette.accent;
  }

  if (slot.source === "calculated") {
    return CALCULATED_COLOR;
  }

  return palette.destructive;
}

function getSlotFill(slot: FormScheduleCSlotState, palette: SurfaceTokens): string {
  if (slot.source === "database") {
    return `${palette.accent}14`;
  }

  if (slot.source === "calculated") {
    return `${CALCULATED_COLOR}12`;
  }

  return `${palette.destructive}12`;
}

function getTextWeight(sourceType: ScheduleCLayoutTextElement["sourceType"]) {
  switch (sourceType) {
    case "heading":
      return "700";
    case "caption":
      return "700";
    case "list item":
      return "500";
    case "paragraph":
    default:
      return "500";
  }
}

function estimateMaxCharsPerLine(width: number, fontSize: number) {
  return Math.max(4, Math.floor(width / Math.max(fontSize * PARSED_TEXT_WIDTH_FACTOR, PARSED_TEXT_MIN_WIDTH)));
}

function estimateMaxLines(height: number, fontSize: number) {
  return Math.max(1, Math.round((height + 2) / (fontSize + 1.8)));
}

function wrapTextToFit(
  value: string,
  maxCharsPerLine: number,
  maxLines: number,
): { fits: boolean; lines: string[] } {
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { fits: true, lines: [] };
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      const chunks = chunkWord(word, maxCharsPerLine);

      for (const chunk of chunks) {
        if (current) {
          lines.push(current);
          current = "";
        }

        lines.push(chunk);

        if (lines.length > maxLines) {
          return { fits: false, lines: lines.slice(0, maxLines) };
        }
      }

      continue;
    }

    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length >= maxLines) {
      return { fits: false, lines };
    }
  }

  if (current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return { fits: false, lines: lines.slice(0, maxLines) };
  }

  return { fits: true, lines };
}

function forceWrapText(value: string, maxCharsPerLine: number, maxLines: number): string[] {
  const fitAttempt = wrapTextToFit(value, maxCharsPerLine, maxLines);

  if (fitAttempt.fits) {
    return fitAttempt.lines;
  }

  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (lines.length === maxLines - 1) {
      current = current ? `${current} ${word}` : word;
      continue;
    }

    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(...chunkWord(word, maxCharsPerLine));
      current = "";
    }

    if (lines.length >= maxLines - 1) {
      current = words.slice(words.indexOf(word)).join(" ");
      break;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function chunkWord(value: string, size: number): string[] {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

interface SlotRect {
  height: number;
  width: number;
  x: number;
  y: number;
}
