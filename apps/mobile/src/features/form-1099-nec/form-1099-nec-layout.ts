import form1099NecLayoutJson from "./form-1099-nec-layout.2025.json";

export interface Form1099NecLayoutShapeElement {
  height: number;
  left: number;
  orientation: "box" | "horizontal-rule" | "vertical-rule";
  top: number;
  type: "shape";
  width: number;
}

export interface Form1099NecLayoutCellElement {
  columnNumber?: number;
  height: number;
  left: number;
  rowNumber?: number;
  top: number;
  type: "cell";
  width: number;
}

export interface Form1099NecLayoutTableElement {
  columns?: number;
  height: number;
  left: number;
  rows?: number;
  top: number;
  type: "table";
  width: number;
}

export interface Form1099NecLayoutTextElement {
  fontSize: number;
  height: number;
  left: number;
  sourceType: "caption" | "heading" | "list item" | "paragraph";
  text: string;
  top: number;
  type: "text";
  width: number;
}

export type Form1099NecLayoutElement =
  | Form1099NecLayoutCellElement
  | Form1099NecLayoutShapeElement
  | Form1099NecLayoutTableElement
  | Form1099NecLayoutTextElement;

export interface Form1099NecLayoutPage {
  elements: Form1099NecLayoutElement[];
  height: number;
  pageNumber: number;
  width: number;
}

export interface Form1099NecLayoutAsset {
  page: Form1099NecLayoutPage;
  sourcePdf: string;
  title: string;
}

export interface Form1099NecSlotHighlight {
  heightPct: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
}

const form1099NecLayout = form1099NecLayoutJson as Form1099NecLayoutAsset;
const form1099NecLayoutTextElements = form1099NecLayout.page.elements.filter(
  (element): element is Form1099NecLayoutTextElement => element.type === "text",
);

export const form1099NecLayoutAspectRatio =
  form1099NecLayout.page.width && form1099NecLayout.page.height
    ? form1099NecLayout.page.width / form1099NecLayout.page.height
    : 612 / 792.008;

export function getForm1099NecLayoutPage(): Form1099NecLayoutPage {
  return form1099NecLayout.page;
}

export const parsedForm1099NecHighlights: Record<string, Form1099NecSlotHighlight> = {
  voidCheckbox: checkboxHighlight([186.95, 757.258, 197.45, 767.758]),
  correctedCheckbox: checkboxHighlight([244.55, 757.258, 255.05, 767.758]),
  payerTin: labeledTextFieldHighlight([50.4, 660.07, 172.8, 684.071], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 10,
  }),
  payerName: labeledTextFieldHighlight(
    [50.4, 684.071, 295.138, 756.008],
    {
      bottom: 2,
      left: 2.5,
      right: 2.5,
      top: 18,
    },
    2,
    17,
  ),
  recipientTin: labeledTextFieldHighlight([172.8, 660.07, 295.138, 684.071], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 10,
  }),
  recipientName: labeledTextFieldHighlight([50.4, 624.07, 295.138, 660.07], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 10,
  }),
  recipientStreetAddress: labeledTextFieldHighlight([50.4, 600.069, 295.138, 624.07], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 10,
  }),
  recipientCityStateZip: labeledTextFieldHighlight([50.4, 576.071, 295.138, 600.069], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 10,
  }),
  secondTinNotice: checkboxHighlight([268.149, 553.76, 276.649, 562.26]),
  accountNumber: labeledTextFieldHighlight([50.4, 552.007, 252.0, 576.071], {
    bottom: 2,
    left: 2.5,
    right: 2.5,
    top: 11,
  }),
  box1: amountHighlight([395.625, 660.07, 496.737, 684.071]),
  box2: checkboxHighlight([485.55, 643.757, 494.05, 652.257]),
  box3: amountHighlight([395.625, 611.946, 496.737, 636.07]),
  box4: amountHighlight([395.625, 588.008, 496.737, 611.946]),
  box5: amountHighlight([295.138, 552.007, 374.338, 564.009]),
  box6: textFieldHighlight([374.338, 552.007, 496.737, 564.009], {
    bottom: 2,
    left: 3.5,
    right: 3.5,
    top: 2,
  }),
  box7: amountHighlight([496.737, 552.007, 575.813, 564.009]),
};

interface BboxInsets {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface LayoutRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

function amountHighlight(
  bbox: [number, number, number, number],
  insets: BboxInsets = { bottom: 2, left: 4, right: 4, top: 2 },
) {
  return bboxToHighlight(bbox, insets);
}

function checkboxHighlight(bbox: [number, number, number, number]) {
  return bboxToHighlight(bbox, { bottom: 0.65, left: 0.65, right: 0.65, top: 0.65 });
}

function labeledTextFieldHighlight(
  bbox: [number, number, number, number],
  insets: BboxInsets,
  gap = 2,
  maxHeight: number | null = null,
) {
  const layoutRect = bboxToLayoutRect(bbox);
  const labelBottom = findLabelBottom(layoutRect);
  const resolvedTopInset =
    labelBottom === null ? insets.top : Math.max(insets.top, labelBottom + gap - layoutRect.top);
  const maxTopInset = Math.max(layoutRect.bottom - layoutRect.top - insets.bottom - 8, insets.top);
  const topInset = Math.min(resolvedTopInset, maxTopInset);
  const height = layoutRect.bottom - layoutRect.top;
  const bottomInset =
    maxHeight === null
      ? insets.bottom
      : Math.max(insets.bottom, height - topInset - maxHeight);

  return bboxToHighlight(bbox, {
    ...insets,
    bottom: bottomInset,
    top: topInset,
  });
}

function textFieldHighlight(
  bbox: [number, number, number, number],
  insets: BboxInsets,
) {
  return bboxToHighlight(bbox, insets);
}

function findLabelBottom(rect: LayoutRect): number | null {
  let labelBottom: number | null = null;

  for (const element of form1099NecLayoutTextElements) {
    const elementBottom = element.top + element.height;

    if (
      element.left >= rect.left - 1 &&
      element.top >= rect.top - 1 &&
      element.left + element.width <= rect.right + 1 &&
      elementBottom <= rect.bottom + 1
    ) {
      labelBottom = labelBottom === null ? elementBottom : Math.max(labelBottom, elementBottom);
    }
  }

  return labelBottom;
}

function bboxToLayoutRect(bbox: [number, number, number, number]): LayoutRect {
  const [x0, y0, x1, y1] = bbox;
  const height = form1099NecLayout.page.height;

  return {
    bottom: height - y0,
    left: x0,
    right: x1,
    top: height - y1,
  };
}

function bboxToHighlight(
  bbox: [number, number, number, number],
  insets: BboxInsets,
): Form1099NecSlotHighlight {
  const dimensions = form1099NecLayout.page;
  const [x0, y0, x1, y1] = bbox;
  const left = x0 + insets.left;
  const right = x1 - insets.right;
  const bottom = y0 + insets.bottom;
  const top = y1 - insets.top;

  return {
    heightPct: roundPct(((top - bottom) / dimensions.height) * 100),
    leftPct: roundPct((left / dimensions.width) * 100),
    topPct: roundPct(((dimensions.height - top) / dimensions.height) * 100),
    widthPct: roundPct(((right - left) / dimensions.width) * 100),
  };
}

function roundPct(value: number) {
  return Number(value.toFixed(4));
}
