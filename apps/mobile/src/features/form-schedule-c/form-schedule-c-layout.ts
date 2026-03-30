import scheduleCLayoutJson from "./schedule-c-layout.2025.json";

export const scheduleCTemplateTaxYear = 2025;

export interface ScheduleCLayoutShapeElement {
  height: number;
  left: number;
  orientation: "box" | "horizontal-rule" | "vertical-rule";
  top: number;
  type: "shape";
  width: number;
}

export interface ScheduleCLayoutCellElement {
  columnNumber?: number;
  height: number;
  left: number;
  rowNumber?: number;
  top: number;
  type: "cell";
  width: number;
}

export interface ScheduleCLayoutTableElement {
  columns?: number;
  height: number;
  left: number;
  rows?: number;
  top: number;
  type: "table";
  width: number;
}

export interface ScheduleCLayoutTextElement {
  fontSize: number;
  height: number;
  left: number;
  sourceType: "caption" | "heading" | "list item" | "paragraph";
  text: string;
  top: number;
  type: "text";
  width: number;
}

export type ScheduleCLayoutElement =
  | ScheduleCLayoutCellElement
  | ScheduleCLayoutShapeElement
  | ScheduleCLayoutTableElement
  | ScheduleCLayoutTextElement;

export interface ScheduleCLayoutPage {
  elements: ScheduleCLayoutElement[];
  height: number;
  pageNumber: 1 | 2;
  width: number;
}

export interface ScheduleCLayoutAsset {
  numberOfPages: number;
  pages: ScheduleCLayoutPage[];
  sourcePdf: string;
  title: string;
}

export interface ScheduleCSlotHighlight {
  heightPct: number;
  leftPct: number;
  topPct: number;
  widthPct: number;
}

const scheduleCLayout = scheduleCLayoutJson as ScheduleCLayoutAsset;

export const scheduleCPageAspectRatio =
  scheduleCLayout.pages[0]?.width && scheduleCLayout.pages[0]?.height
    ? scheduleCLayout.pages[0].width / scheduleCLayout.pages[0].height
    : 612 / 792;

const pageDimensionsByNumber = new Map(
  scheduleCLayout.pages.map((page) => [page.pageNumber, { height: page.height, width: page.width }]),
);

export function getScheduleCLayoutPage(pageNumber: 1 | 2): ScheduleCLayoutPage {
  const page = scheduleCLayout.pages.find((candidate) => candidate.pageNumber === pageNumber);

  if (!page) {
    throw new Error(`Missing parsed Schedule C layout for page ${pageNumber}.`);
  }

  return page;
}

export function getScheduleCCanvasGroupId(slotId: string) {
  return scheduleCCanvasGroupIds[slotId] ?? slotId;
}

const scheduleCCanvasGroupIds: Record<string, string> = {
};

export const parsedScheduleCHighlights: Record<string, ScheduleCSlotHighlight> = {
  proprietorName: rectToHighlight(1, { height: 12.1, left: 123.0, top: 95.0, width: 322.55 }, {
    bottom: 0.35,
    left: 0.6,
    right: 0.6,
    top: 0.35,
  }),
  proprietorSsn: rectToHighlight(1, { height: 11.5, left: 492.0, top: 95.75, width: 83.75 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineABusinessActivity: rectToHighlight(1, { height: 11.0, left: 212.0, top: 120.0, width: 234.15 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineBBusinessCode: rectToHighlight(1, { height: 11.2, left: 446.15, top: 120.736, width: 130.85 }, {
    bottom: 0.6,
    left: 1,
    right: 1,
    top: 0.6,
  }),
  lineCBusinessName: rectToHighlight(1, { height: 10.5, left: 198.0, top: 144.0, width: 248.4 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineDEin: rectToHighlight(1, { height: 11.7, left: 446.15, top: 144.0, width: 130.1 }, {
    bottom: 0.6,
    left: 1,
    right: 1,
    top: 0.6,
  }),
  lineEAddress: rectToHighlight(1, { height: 10.0, left: 230.15, top: 157.25, width: 216.5 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineECityStateZip: rectToHighlight(1, { height: 10.0, left: 230.15, top: 169.25, width: 346.1 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineFCashMethod: checkboxHighlight(1, [168.55, 600.751, 177.05, 609.251]),
  lineFAccrualMethod: checkboxHighlight(1, [233.35, 600.751, 241.85, 609.251]),
  lineFOtherMethodCheckbox: checkboxHighlight(1, [305.35, 600.751, 313.85, 609.251]),
  lineFOtherMethodText: rectToHighlight(1, { height: 10.0, left: 374.15, top: 181.8, width: 202.1 }, {
    bottom: 0.5,
    left: 1,
    right: 1,
    top: 0.5,
  }),
  lineGMaterialParticipationYes: checkboxHighlight(1, [514.15, 589.752, 522.65, 598.252]),
  lineGMaterialParticipationNo: checkboxHighlight(1, [550.15, 589.752, 558.65, 598.252]),
  lineHStartedOrAcquiredCheckbox: checkboxHighlight(1, [514.15, 577.75, 522.65, 586.25]),
  lineIRequired1099Yes: checkboxHighlight(1, [514.15, 565.751, 522.65, 574.251]),
  lineIRequired1099No: checkboxHighlight(1, [550.15, 565.751, 558.65, 574.251]),
  lineJFiled1099Yes: checkboxHighlight(1, [514.15, 553.752, 522.65, 562.252]),
  lineJFiled1099No: checkboxHighlight(1, [550.15, 553.752, 558.65, 562.252]),
  line1GrossReceiptsOrSales: amountHighlight(1, [475.2, 516.001, 575.875, 540.0]),
  line1StatutoryEmployeeCheckbox: checkboxHighlight(1, [433.749, 517.752, 442.249, 526.252]),
  line2ReturnsAndAllowances: amountHighlight(1, [475.2, 504.0, 575.875, 516.001]),
  line3Subtract2: amountHighlight(1, [475.2, 492.001, 575.875, 504.0]),
  line4CostOfGoodsSold: amountHighlight(1, [475.2, 480.001, 575.875, 492.001]),
  line5GrossProfit: amountHighlight(1, [475.2, 468.0, 575.875, 480.001]),
  line6OtherIncome: amountHighlight(1, [475.2, 456.001, 575.875, 468.0]),
  line7GrossIncome: amountHighlight(1, [475.2, 443.999, 575.875, 456.001]),
  line8Advertising: amountHighlight(1, [194.4, 420.001, 295.2, 432.0]),
  line9CarAndTruckExpenses: amountHighlight(1, [194.4, 396.0, 295.2, 420.001]),
  line10CommissionsAndFees: amountHighlight(1, [194.4, 384.001, 295.2, 396.0]),
  line11ContractLabor: amountHighlight(1, [194.4, 372.001, 295.2, 384.001]),
  line12Depletion: amountHighlight(1, [194.4, 360.0, 295.2, 372.001]),
  line13DepreciationAndSection179: amountHighlight(1, [194.4, 324.0, 295.2, 360.0]),
  line14EmployeeBenefitPrograms: amountHighlight(1, [194.4, 300.001, 295.2, 324.0]),
  line15InsuranceOtherThanHealth: amountHighlight(1, [194.4, 288.0, 295.2, 300.001]),
  line16aMortgageInterest: amountHighlight(1, [194.4, 264.001, 295.2, 288.0]),
  line16bOtherInterest: amountHighlight(1, [194.4, 252.0, 295.2, 264.001]),
  line17LegalAndProfessionalServices: amountHighlight(1, [194.4, 240.001, 295.2, 252.0]),
  line18OfficeExpense: amountHighlight(1, [475.2, 420.001, 575.875, 432.0]),
  line19PensionAndProfitSharingPlans: amountHighlight(1, [475.2, 408.001, 575.875, 420.001]),
  line20aRentOrLeaseVehicles: amountHighlight(1, [475.2, 384.001, 575.875, 408.001]),
  line20bRentOrLeaseOtherProperty: amountHighlight(1, [475.2, 372.001, 575.875, 384.001]),
  line21RepairsAndMaintenance: amountHighlight(1, [475.2, 360.0, 575.875, 372.001]),
  line22Supplies: amountHighlight(1, [475.2, 348.001, 575.875, 360.0]),
  line23TaxesAndLicenses: amountHighlight(1, [475.2, 336.001, 575.875, 348.001]),
  line24aTravel: amountHighlight(1, [475.2, 312.001, 575.875, 336.001]),
  line24bDeductibleMeals: amountHighlight(1, [475.2, 300.001, 575.875, 312.001]),
  line25Utilities: amountHighlight(1, [475.2, 288.0, 575.875, 300.001]),
  line26WagesLessEmploymentCredits: amountHighlight(1, [475.2, 276.001, 575.875, 288.0]),
  line27aOtherExpenses: amountHighlight(1, [475.2, 252.0, 575.875, 276.001]),
  line27bTotalOtherExpenses: amountHighlight(1, [475.2, 240.001, 575.875, 252.0]),
  line28TotalExpenses: amountHighlight(1, [475.2, 228.001, 575.875, 240.001]),
  line29TentativeProfitLoss: amountHighlight(1, [475.2, 216.0, 575.875, 228.001], {
    bottom: 2,
    left: 5,
    right: 5,
    top: 2,
  }),
  line30HomeOfficeAreaA: rectToHighlight(1, { height: 8.8, left: 356.0, top: 596.95, width: 86.8 }, {
    bottom: 0.35,
    left: 0.6,
    right: 0.6,
    top: 0.35,
  }),
  line30HomeOfficeAreaB: rectToHighlight(1, { height: 8.8, left: 241.0, top: 605.75, width: 122.4 }, {
    bottom: 0.35,
    left: 0.6,
    right: 0.6,
    top: 0.35,
  }),
  line30ExpensesForBusinessUseOfHome: rectToHighlight(1, { height: 59.999, left: 475.2, top: 576.0, width: 100.675 }, {
    bottom: 1.2,
    left: 3.2,
    right: 3.2,
    top: 1.2,
  }),
  line31NetProfitLoss: amountHighlight(1, [475.2, 120.0, 575.875, 156.001], { bottom: 2, left: 3, right: 3, top: 2 }),
  line32aAllInvestmentAtRisk: checkboxHighlight(1, [474.95, 73.749, 483.45, 82.249]),
  line32bSomeInvestmentNotAtRisk: checkboxHighlight(1, [474.95, 61.25, 483.45, 69.75]),
  line33aCostMethod: checkboxHighlight(2, [186.95, 697.252, 195.45, 705.752]),
  line33bLowerOfCostOrMarket: checkboxHighlight(2, [258.95, 697.252, 267.45, 705.752]),
  line33cOtherMethod: checkboxHighlight(2, [395.75, 697.252, 404.25, 705.752]),
  line34InventoryChangeYes: checkboxHighlight(2, [482.15, 674.251, 490.65, 682.751]),
  line34InventoryChangeNo: checkboxHighlight(2, [539.75, 674.251, 548.25, 682.751]),
  line35InventoryAtBeginningOfYear: amountHighlight(2, [468.0, 648.0, 575.875, 659.999]),
  line36PurchasesLessWithdrawals: amountHighlight(2, [468.0, 624.001, 575.875, 648.0]),
  line37CostOfLabor: amountHighlight(2, [468.0, 600.0, 575.875, 624.001]),
  line38MaterialsAndSupplies: amountHighlight(2, [468.0, 576.0, 575.875, 600.0]),
  line39OtherCosts: amountHighlight(2, [468.0, 552.001, 575.875, 576.0]),
  line40AddLines35To39: amountHighlight(2, [468.0, 528.0, 575.875, 552.001]),
  line41InventoryAtEndOfYear: amountHighlight(2, [468.0, 504.0, 575.875, 528.0]),
  line42CostOfGoodsSold: amountHighlight(2, [468.0, 479.999, 575.875, 504.0]),
  line43VehiclePlacedInServiceDate: rectToHighlight(2, { height: 14.2, left: 379.15, top: 357.45, width: 93.0 }, {
    bottom: 0.2,
    left: 0.5,
    right: 0.5,
    top: 0.2,
  }),
  line44aBusinessMiles: rectToHighlight(2, { height: 15.6, left: 107.0, top: 404.35, width: 88.0 }, {
    bottom: 0.25,
    left: 0.35,
    right: 0.35,
    top: 0.25,
  }),
  line44bCommutingMiles: rectToHighlight(2, { height: 15.6, left: 338.2, top: 404.35, width: 81.0 }, {
    bottom: 0.25,
    left: 0.35,
    right: 0.35,
    top: 0.25,
  }),
  line44cOtherMiles: rectToHighlight(2, { height: 15.6, left: 476.0, top: 404.35, width: 94.0 }, {
    bottom: 0.25,
    left: 0.35,
    right: 0.35,
    top: 0.25,
  }),
  line45VehicleAvailableForPersonalUseYes: checkboxHighlight(2, [489.35, 349.529, 498.294, 358.473]),
  line45VehicleAvailableForPersonalUseNo: checkboxHighlight(2, [539.75, 349.529, 548.694, 358.473]),
  line46AnotherVehicleAvailableYes: checkboxHighlight(2, [489.35, 325.528, 498.294, 334.472]),
  line46AnotherVehicleAvailableNo: checkboxHighlight(2, [539.75, 325.528, 548.694, 334.472]),
  line47aEvidenceToSupportDeductionYes: checkboxHighlight(2, [489.35, 301.529, 498.295, 310.474]),
  line47aEvidenceToSupportDeductionNo: checkboxHighlight(2, [539.75, 301.53, 548.694, 310.474]),
  line47bEvidenceIsWrittenYes: checkboxHighlight(2, [489.35, 277.528, 498.295, 286.473]),
  line47bEvidenceIsWrittenNo: checkboxHighlight(2, [539.75, 277.529, 548.694, 286.473]),
  line47OtherExpenseRow1: rectToHighlight(2, { height: 24.003, left: 36.25, top: 527.999, width: 425.25 }, {
    bottom: 1.5,
    left: 1.5,
    right: 1.5,
    top: 1.5,
  }),
  line47OtherExpenseAmount: rectToHighlight(2, { height: 24.003, left: 468.0, top: 527.999, width: 107.75 }, {
    bottom: 1.5,
    left: 3,
    right: 3,
    top: 1.5,
  }),
  line48TotalOtherExpenses: amountHighlight(2, [468.0, 36.0, 575.75, 47.995]),
};

export const parsedScheduleCOverlayHighlightOverrides: Record<string, ScheduleCSlotHighlight[]> = {
  line43VehiclePlacedInServiceDate: [
    rectToHighlight(2, { height: 14.2, left: 374.15, top: 357.45, width: 29.3 }, {
      bottom: 0.25,
      left: 0.45,
      right: 0.45,
      top: 0.25,
    }),
    rectToHighlight(2, { height: 14.2, left: 402.95, top: 357.45, width: 36.5 }, {
      bottom: 0.25,
      left: 0.45,
      right: 0.45,
      top: 0.25,
    }),
    rectToHighlight(2, { height: 14.2, left: 438.95, top: 357.45, width: 36.5 }, {
      bottom: 0.25,
      left: 0.45,
      right: 0.45,
      top: 0.25,
    }),
  ],
};

interface BboxInsets {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

function amountHighlight(
  pageNumber: 1 | 2,
  bbox: [number, number, number, number],
  insets: BboxInsets = { bottom: 1.5, left: 3, right: 3, top: 1.5 },
) {
  return bboxToHighlight(pageNumber, bbox, insets);
}

function checkboxHighlight(pageNumber: 1 | 2, bbox: [number, number, number, number]) {
  return bboxToHighlight(pageNumber, bbox, { bottom: 0.35, left: 0.35, right: 0.35, top: 0.35 });
}

function rectToHighlight(
  pageNumber: 1 | 2,
  rect: { height: number; left: number; top: number; width: number },
  insets: BboxInsets,
) {
  const dimensions = pageDimensionsByNumber.get(pageNumber);

  if (!dimensions) {
    throw new Error(`Missing Schedule C page dimensions for page ${pageNumber}.`);
  }

  return {
    heightPct: roundPct(((rect.height - insets.top - insets.bottom) / dimensions.height) * 100),
    leftPct: roundPct(((rect.left + insets.left) / dimensions.width) * 100),
    topPct: roundPct((((rect.top + insets.top) / dimensions.height) * 100)),
    widthPct: roundPct(((rect.width - insets.left - insets.right) / dimensions.width) * 100),
  };
}

function bboxToHighlight(
  pageNumber: 1 | 2,
  bbox: [number, number, number, number],
  insets: BboxInsets,
): ScheduleCSlotHighlight {
  const dimensions = pageDimensionsByNumber.get(pageNumber);

  if (!dimensions) {
    throw new Error(`Missing Schedule C page dimensions for page ${pageNumber}.`);
  }

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
