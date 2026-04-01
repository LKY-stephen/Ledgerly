export type TaxFormPage = 1 | 2;
export type TaxFormSlotId = string;
export type TaxFormSlotKind = "amount" | "checkbox" | "text";
export type TaxFormSlotSource = "database" | "calculated" | "manual";

export interface TaxFormSlotHighlight {
  heightPct: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
}

export interface TaxFormSlotState {
  badge: string;
  citation: string;
  contextLines?: string[];
  fieldLabel: string;
  highlight: TaxFormSlotHighlight;
  id: TaxFormSlotId;
  instruction: string;
  kind: TaxFormSlotKind;
  page: TaxFormPage;
  previewValue: string | null;
  source: TaxFormSlotSource;
  sourceNote: string;
}

export interface ParsedTaxFormShapeElement {
  bbox: [number, number, number, number];
  height: number;
  left: number;
  orientation: "box" | "horizontal-rule" | "vertical-rule";
  page_number: TaxFormPage;
  source_type: "image";
  top: number;
  type: "shape";
  width: number;
}

export interface ParsedTaxFormCellElement {
  bbox: [number, number, number, number];
  column_number?: number;
  height: number;
  left: number;
  page_number: TaxFormPage;
  row_number?: number;
  source_type: "table";
  top: number;
  type: "cell";
  width: number;
}

export interface ParsedTaxFormTableElement {
  bbox: [number, number, number, number];
  columns?: number;
  height: number;
  left: number;
  page_number: TaxFormPage;
  rows?: number;
  source_type: "table";
  top: number;
  type: "table";
  width: number;
}

export interface ParsedTaxFormTextElement {
  bbox: [number, number, number, number];
  font: string;
  font_size: number;
  height: number;
  left: number;
  page_number: TaxFormPage;
  source_type: "caption" | "heading" | "list item" | "paragraph";
  text: string;
  top: number;
  type: "text";
  width: number;
}

export type ParsedTaxFormLayoutElement =
  | ParsedTaxFormCellElement
  | ParsedTaxFormShapeElement
  | ParsedTaxFormTableElement
  | ParsedTaxFormTextElement;

export interface ParsedTaxFormLayoutPage {
  elements: ParsedTaxFormLayoutElement[];
  height: number;
  page_number: TaxFormPage;
  width: number;
}

export interface ParsedTaxFormLayoutAsset {
  number_of_pages: number;
  pages: ParsedTaxFormLayoutPage[];
  source_pdf: string;
}

export interface ExtractedTaxFormExcludedField {
  fieldName: string;
  height: number;
  page: TaxFormPage;
  reason: string;
  width: number;
}

export interface ExtractedTaxFormFieldAssetEntry {
  badge: string;
  contextLines: string[];
  fieldLabel: string;
  fieldName: string;
  height: number;
  highlight: TaxFormSlotHighlight;
  id: string;
  index: number;
  kind: TaxFormSlotKind;
  left: number;
  page: TaxFormPage;
  top: number;
  widgetType: "checkbox" | "text";
  width: number;
}

export interface ExtractedTaxFormFieldAsset {
  excludedFields: ExtractedTaxFormExcludedField[];
  fields: ExtractedTaxFormFieldAssetEntry[];
  numberOfFields: number;
  numberOfPages: number;
  sourceLayout: string;
  sourcePdf: string;
}

export function formatCurrencyLabel(amountCents: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-US", {
    currency,
    minimumFractionDigits: 2,
    style: "currency",
  });

  return formatter.format(amountCents / 100);
}
