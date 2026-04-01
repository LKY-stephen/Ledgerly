import form1040LayoutJson from "./form-1040-layout.2025.json";

import type { ParsedTaxFormLayoutAsset, ParsedTaxFormLayoutPage, TaxFormPage, TaxFormSlotHighlight } from "../tax-form-common/types";

const form1040Layout = form1040LayoutJson as unknown as ParsedTaxFormLayoutAsset;

export const form1040PageAspectRatio =
  form1040Layout.pages[0]?.width && form1040Layout.pages[0]?.height
    ? form1040Layout.pages[0].width / form1040Layout.pages[0].height
    : 612 / 792;

const pageDimensionsByNumber = new Map(
  form1040Layout.pages.map((page) => [page.page_number, { height: page.height, width: page.width }]),
);

export function getForm1040LayoutPage(pageNumber: TaxFormPage): ParsedTaxFormLayoutPage {
  const page = form1040Layout.pages.find((candidate) => candidate.page_number === pageNumber);

  if (!page) {
    throw new Error(`Missing parsed Form 1040 layout for page ${pageNumber}.`);
  }

  return page;
}

export const parsedForm1040Highlights: Record<string, TaxFormSlotHighlight> = {
  taxpayerIdentityGroup: rectToHighlight(1, { height: 24.0, left: 36.0, top: 84.0, width: 540.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  spouseIdentityGroup: rectToHighlight(1, { height: 24.0, left: 36.0, top: 108.0, width: 540.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  addressGroup: rectToHighlight(1, { height: 49.0, left: 36.0, top: 132.0, width: 420.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  foreignAddressGroup: rectToHighlight(1, { height: 24.0, left: 36.0, top: 181.0, width: 420.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  presidentialElectionGroup: rectToHighlight(1, { height: 48.0, left: 470.0, top: 156.0, width: 106.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  filingStatusGroup: rectToHighlight(1, { height: 80.0, left: 36.0, top: 194.0, width: 540.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  digitalAssetsGroup: rectToHighlight(1, { height: 16.0, left: 36.0, top: 278.0, width: 540.0 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  dependentsGroup: rectToHighlight(1, { height: 126.0, left: 36.0, top: 298.0, width: 540.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  livedApartStatusGroup: rectToHighlight(1, { height: 14.0, left: 108.0, top: 423.0, width: 468.0 }, { bottom: 0.6, left: 0.6, right: 0.6, top: 0.6 }),
  line1IncomeGroup: rectToHighlight(1, { height: 109.0, left: 92.0, top: 451.0, width: 484.0 }, { bottom: 1, left: 1, right: 1, top: 1 }),
  line2InterestGroup: rectToHighlight(1, { height: 13.0, left: 96.0, top: 571.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line3DividendGroup: rectToHighlight(1, { height: 13.0, left: 96.0, top: 583.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line4IraGroup: rectToHighlight(1, { height: 24.0, left: 96.0, top: 607.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line5PensionsGroup: rectToHighlight(1, { height: 24.0, left: 96.0, top: 631.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line6SocialSecurityGroup: rectToHighlight(1, { height: 36.0, left: 96.0, top: 655.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line7CapitalGainGroup: rectToHighlight(1, { height: 24.0, left: 96.0, top: 691.0, width: 480.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line8AdditionalIncome: rectToHighlight(1, { height: 13.0, left: 92.0, top: 715.0, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line9TotalIncome: rectToHighlight(1, { height: 13.0, left: 92.0, top: 727.0, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line10AdjustmentsToIncome: rectToHighlight(1, { height: 13.0, left: 92.0, top: 739.0, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line11aAdjustedGrossIncome: rectToHighlight(1, { height: 13.0, left: 92.0, top: 751.0, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line11bAdjustedGrossIncomeCarryover: rectToHighlight(2, { height: 13.0, left: 92.0, top: 37.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  standardDeductionFlagsGroup: rectToHighlight(2, { height: 49.0, left: 92.0, top: 49.0, width: 230.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line12eStandardDeduction: rectToHighlight(2, { height: 13.0, left: 92.0, top: 97.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line13DeductionsGroup: rectToHighlight(2, { height: 24.0, left: 92.0, top: 109.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line14TotalDeductions: rectToHighlight(2, { height: 13.0, left: 92.0, top: 133.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line15TaxableIncome: rectToHighlight(2, { height: 13.0, left: 92.0, top: 145.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line16TaxGroup: rectToHighlight(2, { height: 13.0, left: 92.0, top: 157.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line17Schedule2Taxes: rectToHighlight(2, { height: 13.0, left: 92.0, top: 169.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line18TaxBeforeCredits: rectToHighlight(2, { height: 13.0, left: 92.0, top: 181.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line19ChildTaxCredit: rectToHighlight(2, { height: 13.0, left: 92.0, top: 193.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line20Schedule3Credits: rectToHighlight(2, { height: 13.0, left: 92.0, top: 205.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line21TotalCredits: rectToHighlight(2, { height: 13.0, left: 92.0, top: 217.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line22TaxAfterCredits: rectToHighlight(2, { height: 13.0, left: 92.0, top: 229.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line23OtherTaxes: rectToHighlight(2, { height: 13.0, left: 92.0, top: 241.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line24TotalTax: rectToHighlight(2, { height: 13.0, left: 92.0, top: 253.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line25WithholdingGroup: rectToHighlight(2, { height: 48.0, left: 92.0, top: 265.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line26EstimatedPaymentsGroup: rectToHighlight(2, { height: 31.0, left: 92.0, top: 325.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line27EicGroup: rectToHighlight(2, { height: 36.0, left: 92.0, top: 361.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line28ActcGroup: rectToHighlight(2, { height: 22.0, left: 92.0, top: 399.3, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line29AmericanOpportunity: rectToHighlight(2, { height: 13.0, left: 92.0, top: 421.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line30AdoptionCredit: rectToHighlight(2, { height: 13.0, left: 92.0, top: 433.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line31Schedule3Refundables: rectToHighlight(2, { height: 13.0, left: 92.0, top: 445.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line32OtherPaymentsTotal: rectToHighlight(2, { height: 13.0, left: 92.0, top: 457.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line33TotalPayments: rectToHighlight(2, { height: 13.0, left: 92.0, top: 469.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line34Overpayment: rectToHighlight(2, { height: 13.0, left: 36.0, top: 481.7, width: 540.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line35RefundDirectDepositGroup: rectToHighlight(2, { height: 36.0, left: 92.0, top: 493.9, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line36EstimatedTaxCarryover: rectToHighlight(2, { height: 13.0, left: 92.0, top: 529.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line37AmountOwed: rectToHighlight(2, { height: 22.0, left: 92.0, top: 543.3, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  line38EstimatedTaxPenalty: rectToHighlight(2, { height: 13.0, left: 92.0, top: 565.4, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  thirdPartyDesigneeGroup: rectToHighlight(2, { height: 36.0, left: 92.0, top: 577.1, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  signatureGroup: rectToHighlight(2, { height: 94.0, left: 92.0, top: 613.0, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
  paidPreparerGroup: rectToHighlight(2, { height: 30.0, left: 92.0, top: 709.3, width: 484.0 }, { bottom: 0.8, left: 0.8, right: 0.8, top: 0.8 }),
};

function rectToHighlight(
  pageNumber: TaxFormPage,
  rect: { height: number; left: number; top: number; width: number },
  insets?: Partial<Record<"bottom" | "left" | "right" | "top", number>>,
): TaxFormSlotHighlight {
  const dimensions = pageDimensionsByNumber.get(pageNumber);

  if (!dimensions) {
    throw new Error(`Missing page dimensions for Form 1040 page ${pageNumber}.`);
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
