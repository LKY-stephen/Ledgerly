import scheduleSELayoutJson from "./schedule-se-layout.2025.json";

import type { ParsedTaxFormLayoutAsset, ParsedTaxFormLayoutPage, TaxFormPage, TaxFormSlotHighlight } from "../tax-form-common/types";

export const scheduleSETemplateTaxYear = 2025;

const scheduleSELayout = scheduleSELayoutJson as unknown as ParsedTaxFormLayoutAsset;

export const scheduleSEPageAspectRatio =
  scheduleSELayout.pages[0]?.width && scheduleSELayout.pages[0]?.height
    ? scheduleSELayout.pages[0].width / scheduleSELayout.pages[0].height
    : 612 / 792;

const pageDimensionsByNumber = new Map(
  scheduleSELayout.pages.map((page) => [page.page_number, { height: page.height, width: page.width }]),
);

export function getScheduleSELayoutPage(pageNumber: TaxFormPage): ParsedTaxFormLayoutPage {
  const page = scheduleSELayout.pages.find((candidate) => candidate.page_number === pageNumber);

  if (!page) {
    throw new Error(`Missing parsed Schedule SE layout for page ${pageNumber}.`);
  }

  return page;
}

export const parsedScheduleSEHighlights: Record<string, TaxFormSlotHighlight> = {
  taxpayerName: rectToHighlight(1, { height: 24, left: 36.25, top: 84.0, width: 323.75 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  taxpayerSsn: rectToHighlight(1, { height: 24, left: 360.0, top: 84.0, width: 215.75 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  lineAMinisterCheckbox: rectToHighlight(1, { height: 8, left: 565.0, top: 157.998, width: 8 }, { bottom: 0.2, left: 0.2, right: 0.2, top: 0.2 }),
  line1FarmGroup: rectToHighlight(1, { height: 47, left: 489.0, top: 181.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line2ScheduleCNetProfit: rectToHighlight(1, { height: 13, left: 489.0, top: 241.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line3CombinedNetEarnings: rectToHighlight(1, { height: 13, left: 489.0, top: 264.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line4aNinetyTwoPointThirtyFivePercent: rectToHighlight(1, { height: 13, left: 489.0, top: 276.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line4bOptionalMethodsTotal: rectToHighlight(1, { height: 13, left: 489.0, top: 300.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line4cCombinedSelfEmploymentEarnings: rectToHighlight(1, { height: 13, left: 489.0, top: 313.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line5ChurchGroup: rectToHighlight(1, { height: 36, left: 489.0, top: 337.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line6CombinedSubjectEarnings: rectToHighlight(1, { height: 13, left: 489.0, top: 372.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line8WagesGroup: rectToHighlight(1, { height: 71, left: 489.0, top: 410.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line9RemainingSocialSecurityCap: rectToHighlight(1, { height: 13, left: 489.0, top: 480.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line10SocialSecurityTax: rectToHighlight(1, { height: 13, left: 489.0, top: 492.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line11MedicareTax: rectToHighlight(1, { height: 13, left: 489.0, top: 504.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line12SelfEmploymentTax: rectToHighlight(1, { height: 13, left: 489.0, top: 517.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line13HalfSelfEmploymentTaxDeduction: rectToHighlight(1, { height: 13, left: 489.0, top: 540.0, width: 87 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line15FarmOptionalMethod: rectToHighlight(2, { height: 24.001, left: 504.0, top: 95.999, width: 72.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line16RemainingOptionalMethodLimit: rectToHighlight(2, { height: 14, left: 504.0, top: 156.0, width: 72.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line17NonfarmOptionalMethod: rectToHighlight(2, { height: 24.001, left: 504.0, top: 168.0, width: 72.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
};

function rectToHighlight(
  pageNumber: TaxFormPage,
  rect: { height: number; left: number; top: number; width: number },
  insets?: Partial<Record<"bottom" | "left" | "right" | "top", number>>,
): TaxFormSlotHighlight {
  const dimensions = pageDimensionsByNumber.get(pageNumber);

  if (!dimensions) {
    throw new Error(`Missing page dimensions for Schedule SE page ${pageNumber}.`);
  }

  const leftInset = insets?.left ?? 0;
  const topInset = insets?.top ?? 0;
  const rightInset = insets?.right ?? 0;
  const bottomInset = insets?.bottom ?? 0;

  return {
    heightPct: ((rect.height - topInset - bottomInset) / dimensions.height) * 100,
    leftPct: ((rect.left + leftInset) / dimensions.width) * 100,
    topPct: ((rect.top + topInset) / dimensions.height) * 100,
    widthPct: ((rect.width - leftInset - rightInset) / dimensions.width) * 100,
  };
}
