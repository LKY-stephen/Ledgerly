import { parsedScheduleCHighlights, scheduleCPageAspectRatio } from "./form-schedule-c-layout";

export const formScheduleCDisclaimerText =
  "the form is based on data provided in the database, it might be insufficient if some records are not provided, please take your own responsibility to ensure the completeness of tax information need to be reported";

export const formScheduleCPageAspectRatio = scheduleCPageAspectRatio;

export type FormScheduleCSlotSource = "database" | "calculated" | "manual";
export type FormScheduleCPage = 1 | 2;
export type FormScheduleCSlotId = string;
export type FormScheduleCSlotKind = "amount" | "checkbox" | "text";

export interface FormScheduleCDatabaseSnapshot {
  currency: string | null;
  grossReceiptsCents: number | null;
  incomeRecordCount: number;
  proprietorName: string | null;
}

export interface FormScheduleCSlotState {
  badge: string;
  canvasLabel: string;
  citation: string;
  fieldLabel: string;
  highlight: {
    heightPct: number;
    leftPct: number;
    topPct: number;
    widthPct: number;
  };
  id: FormScheduleCSlotId;
  instruction: string;
  kind: FormScheduleCSlotKind;
  page: FormScheduleCPage;
  previewValue: string | null;
  source: FormScheduleCSlotSource;
  sourceNote: string;
}

interface BaseSlotDefinition {
  badge: string;
  canvasLabel: string;
  citation: string;
  fieldLabel: string;
  highlight: FormScheduleCSlotState["highlight"];
  id: FormScheduleCSlotId;
  instruction: string;
  kind: FormScheduleCSlotKind;
  page: FormScheduleCPage;
}

const defaultNoInstructionNote =
  "No dedicated paragraph for this labeled line was found in the downloaded i1040sc page, so this slot stays tied to the official form label and current schema coverage.";

const calculatedSlotIds = new Set<FormScheduleCSlotId>([
  "line3Subtract2",
  "line5GrossProfit",
  "line7GrossIncome",
  "line27bTotalOtherExpenses",
  "line28TotalExpenses",
  "line29TentativeProfitLoss",
  "line31NetProfitLoss",
  "line40AddLines35To39",
  "line42CostOfGoodsSold",
  "line48TotalOtherExpenses",
]);

const page1ExpenseLeftRows = [
  {
    badge: "8",
    canvasLabel: "Advertising",
    citation: "i1040sc: Line 8",
    fieldLabel: "Line 8. Advertising",
    id: "line8Advertising",
    instruction: "Enter advertising and promotional costs paid for the business.",
  },
  {
    badge: "9",
    canvasLabel: "Car and truck expenses",
    citation: "i1040sc: Line 9",
    fieldLabel: "Line 9. Car and truck expenses",
    id: "line9CarAndTruckExpenses",
    instruction:
      "Enter car and truck expenses only if this business is allowed to claim them on Schedule C.",
  },
  {
    badge: "10",
    canvasLabel: "Commissions and fees",
    citation: "i1040sc: Line 10",
    fieldLabel: "Line 10. Commissions and fees",
    id: "line10CommissionsAndFees",
    instruction: "Enter commissions and fees paid for the business.",
  },
  {
    badge: "11",
    canvasLabel: "Contract labor",
    citation: "i1040sc: Line 11",
    fieldLabel: "Line 11. Contract labor",
    id: "line11ContractLabor",
    instruction: "Enter amounts paid to nonemployees for business services.",
  },
  {
    badge: "12",
    canvasLabel: "Depletion",
    citation: "i1040sc: Line 12",
    fieldLabel: "Line 12. Depletion",
    id: "line12Depletion",
    instruction: "Enter depletion only if this business has eligible depletion deductions.",
  },
  {
    badge: "13",
    canvasLabel: "Depreciation and section 179",
    citation: "i1040sc: Line 13",
    fieldLabel: "Line 13. Depreciation and section 179 expense deduction",
    id: "line13DepreciationAndSection179",
    instruction:
      "Enter depreciation or section 179 amounts that belong to this business and are supported by Form 4562 when required.",
  },
  {
    badge: "14",
    canvasLabel: "Employee benefit programs",
    citation: "i1040sc: Line 14",
    fieldLabel: "Line 14. Employee benefit programs",
    id: "line14EmployeeBenefitPrograms",
    instruction: "Enter eligible employee benefit program costs paid by the business.",
  },
  {
    badge: "15",
    canvasLabel: "Insurance",
    citation: "i1040sc: Line 15",
    fieldLabel: "Line 15. Insurance (other than health)",
    id: "line15InsuranceOtherThanHealth",
    instruction: "Enter business insurance costs other than health insurance.",
  },
  {
    badge: "16a",
    canvasLabel: "Interest mortgage",
    citation: "i1040sc: Line 16a",
    fieldLabel: "Line 16a. Mortgage interest",
    id: "line16aMortgageInterest",
    instruction: "Enter eligible mortgage interest paid to banks or similar institutions.",
  },
  {
    badge: "16b",
    canvasLabel: "Interest other",
    citation: "i1040sc: Line 16b",
    fieldLabel: "Line 16b. Other interest",
    id: "line16bOtherInterest",
    instruction: "Enter other business interest that belongs on Schedule C.",
  },
  {
    badge: "17",
    canvasLabel: "Legal and professional services",
    citation: "i1040sc: Line 17",
    fieldLabel: "Line 17. Legal and professional services",
    id: "line17LegalAndProfessionalServices",
    instruction: "Enter legal and professional fees paid for the business.",
  },
] as const;

const page1ExpenseRightRows = [
  {
    badge: "18",
    canvasLabel: "Office expense",
    citation: "i1040sc: Line 18",
    fieldLabel: "Line 18. Office expense",
    id: "line18OfficeExpense",
    instruction: "Enter office expenses that are not already included elsewhere.",
  },
  {
    badge: "19",
    canvasLabel: "Pension and profit-sharing",
    citation: "i1040sc: Line 19",
    fieldLabel: "Line 19. Pension and profit-sharing plans",
    id: "line19PensionAndProfitSharingPlans",
    instruction: "Enter eligible pension and profit-sharing plan contributions.",
  },
  {
    badge: "20a",
    canvasLabel: "Rent lease vehicles",
    citation: "i1040sc: Line 20a",
    fieldLabel: "Line 20a. Rent or lease - vehicles, machinery, and equipment",
    id: "line20aRentOrLeaseVehicles",
    instruction: "Enter rent or lease costs for vehicles, machinery, and equipment.",
  },
  {
    badge: "20b",
    canvasLabel: "Rent lease other",
    citation: "i1040sc: Line 20b",
    fieldLabel: "Line 20b. Rent or lease - other business property",
    id: "line20bRentOrLeaseOtherProperty",
    instruction: "Enter rent or lease costs for other business property.",
  },
  {
    badge: "21",
    canvasLabel: "Repairs and maintenance",
    citation: "i1040sc: Line 21",
    fieldLabel: "Line 21. Repairs and maintenance",
    id: "line21RepairsAndMaintenance",
    instruction: "Enter repair and maintenance costs that keep business property in working order.",
  },
  {
    badge: "22",
    canvasLabel: "Supplies",
    citation: "i1040sc: Line 22",
    fieldLabel: "Line 22. Supplies",
    id: "line22Supplies",
    instruction: "Enter supplies not included in Part III cost of goods sold.",
  },
  {
    badge: "23",
    canvasLabel: "Taxes and licenses",
    citation: "i1040sc: Line 23",
    fieldLabel: "Line 23. Taxes and licenses",
    id: "line23TaxesAndLicenses",
    instruction: "Enter business taxes and license fees that belong on Schedule C.",
  },
  {
    badge: "24a",
    canvasLabel: "Travel",
    citation: "i1040sc: Line 24a",
    fieldLabel: "Line 24a. Travel",
    id: "line24aTravel",
    instruction: "Enter deductible travel expenses for the business.",
  },
  {
    badge: "24b",
    canvasLabel: "Meals",
    citation: "i1040sc: Line 24b",
    fieldLabel: "Line 24b. Deductible meals",
    id: "line24bDeductibleMeals",
    instruction: "Enter deductible meal expenses after applying the required limitation.",
  },
  {
    badge: "25",
    canvasLabel: "Utilities",
    citation: "i1040sc: Line 25",
    fieldLabel: "Line 25. Utilities",
    id: "line25Utilities",
    instruction: "Enter business utility costs.",
  },
  {
    badge: "26",
    canvasLabel: "Wages",
    citation: "i1040sc: Line 26",
    fieldLabel: "Line 26. Wages",
    id: "line26WagesLessEmploymentCredits",
    instruction: "Enter wages paid to employees after any employment-credit adjustments.",
  },
  {
    badge: "27a",
    canvasLabel: "Other expenses",
    citation: "i1040sc: Line 27a",
    fieldLabel: "Line 27a. Other expenses",
    id: "line27aOtherExpenses",
    instruction: "Enter the total of other business expenses before carrying them to line 27b.",
  },
  {
    badge: "27b",
    canvasLabel: "Total other expenses",
    citation: "i1040sc: Line 27b",
    fieldLabel: "Line 27b. Total other expenses from Part V",
    id: "line27bTotalOtherExpenses",
    instruction: "Carry the Part V total to line 27b.",
  },
] as const;

const page2PartVRows = [
  { badge: "V1", canvasLabel: "Other expense row 1", fieldLabel: "Part V row 1", id: "line47OtherExpenseRow1" },
  { badge: "V2", canvasLabel: "Other expense row 2", fieldLabel: "Part V row 2", id: "line47OtherExpenseRow2" },
  { badge: "V3", canvasLabel: "Other expense row 3", fieldLabel: "Part V row 3", id: "line47OtherExpenseRow3" },
  { badge: "V4", canvasLabel: "Other expense row 4", fieldLabel: "Part V row 4", id: "line47OtherExpenseRow4" },
  { badge: "V5", canvasLabel: "Other expense row 5", fieldLabel: "Part V row 5", id: "line47OtherExpenseRow5" },
  { badge: "V6", canvasLabel: "Other expense row 6", fieldLabel: "Part V row 6", id: "line47OtherExpenseRow6" },
] as const;

const baseSlotDefinitions: BaseSlotDefinition[] = [
  textSlot({
    badge: "Name",
    canvasLabel: "Name of proprietor",
    citation: "Official form label only",
    fieldLabel: "Name of proprietor",
    id: "proprietorName",
    page: 1,
    topPct: 5.1,
    leftPct: 2.2,
    widthPct: 69.5,
    instruction: defaultNoInstructionNote,
  }),
  textSlot({
    badge: "SSN",
    canvasLabel: "Social security number",
    citation: "Official form label only",
    fieldLabel: "Social security number (SSN)",
    id: "proprietorSsn",
    page: 1,
    topPct: 5.1,
    leftPct: 77.4,
    widthPct: 19.4,
    instruction: defaultNoInstructionNote,
  }),
  textSlot({
    badge: "A",
    canvasLabel: "Line A business activity",
    citation: "i1040sc: Line A",
    fieldLabel: "Line A. Principal business or profession, including product or service",
    id: "lineABusinessActivity",
    page: 1,
    topPct: 10.8,
    leftPct: 12.0,
    widthPct: 60.5,
    instruction: "Describe the main business activity, product, or service for this Schedule C.",
  }),
  textSlot({
    badge: "B",
    canvasLabel: "Line B business code",
    citation: "i1040sc: Line B",
    fieldLabel: "Line B. Enter code from instructions",
    id: "lineBBusinessCode",
    page: 1,
    topPct: 10.8,
    leftPct: 81.0,
    widthPct: 15.0,
    instruction: "Enter the principal business or professional activity code from the Schedule C instructions.",
  }),
  textSlot({
    badge: "C",
    canvasLabel: "Line C business name",
    citation: "Official form label only",
    fieldLabel: "Line C. Business name, if any",
    id: "lineCBusinessName",
    page: 1,
    topPct: 14.5,
    leftPct: 12.0,
    widthPct: 60.5,
    instruction: defaultNoInstructionNote,
  }),
  textSlot({
    badge: "D",
    canvasLabel: "Line D employer ID",
    citation: "i1040sc: Line D",
    fieldLabel: "Line D. Employer ID number (EIN)",
    id: "lineDEin",
    page: 1,
    topPct: 14.5,
    leftPct: 81.0,
    widthPct: 15.0,
    instruction: "Enter the business EIN if one applies; otherwise leave blank.",
  }),
  textSlot({
    badge: "E1",
    canvasLabel: "Line E address",
    citation: "Official form label only",
    fieldLabel: "Line E. Business address",
    id: "lineEAddress",
    page: 1,
    topPct: 18.2,
    leftPct: 12.0,
    widthPct: 60.5,
    instruction: defaultNoInstructionNote,
  }),
  textSlot({
    badge: "E2",
    canvasLabel: "Line E city state ZIP",
    citation: "Official form label only",
    fieldLabel: "Line E. City, town or post office, state, and ZIP code",
    id: "lineECityStateZip",
    page: 1,
    topPct: 20.8,
    leftPct: 12.0,
    widthPct: 60.5,
    instruction: defaultNoInstructionNote,
  }),
  checkboxSlot({
    badge: "F1",
    canvasLabel: "Line F cash",
    citation: "i1040sc: Line F",
    fieldLabel: "Line F(1). Cash method",
    id: "lineFCashMethod",
    page: 1,
    topPct: 23.6,
    leftPct: 27.8,
    instruction: "Check this box if the business uses the cash method of accounting.",
  }),
  checkboxSlot({
    badge: "F2",
    canvasLabel: "Line F accrual",
    citation: "i1040sc: Line F",
    fieldLabel: "Line F(2). Accrual method",
    id: "lineFAccrualMethod",
    page: 1,
    topPct: 23.6,
    leftPct: 37.2,
    instruction: "Check this box if the business uses the accrual method of accounting.",
  }),
  checkboxSlot({
    badge: "F3",
    canvasLabel: "Line F other method checkbox",
    citation: "i1040sc: Line F",
    fieldLabel: "Line F(3). Other method checkbox",
    id: "lineFOtherMethodCheckbox",
    page: 1,
    topPct: 23.6,
    leftPct: 47.1,
    instruction: "Check this box only if the business uses another accounting method and describe it.",
  }),
  textSlot({
    badge: "F other",
    canvasLabel: "Line F other method description",
    citation: "i1040sc: Line F",
    fieldLabel: "Line F(3). Other accounting method description",
    id: "lineFOtherMethodText",
    page: 1,
    topPct: 23.3,
    leftPct: 51.0,
    widthPct: 19.0,
    instruction: "If you checked Other on line F, describe the accounting method here.",
  }),
  checkboxSlot({
    badge: "G yes",
    canvasLabel: "Line G yes",
    citation: "i1040sc: Line G",
    fieldLabel: "Line G. Material participation - Yes",
    id: "lineGMaterialParticipationYes",
    page: 1,
    topPct: 23.6,
    leftPct: 90.1,
    instruction: "Check Yes if you materially participated in the operation of this business in 2025.",
  }),
  checkboxSlot({
    badge: "G no",
    canvasLabel: "Line G no",
    citation: "i1040sc: Line G",
    fieldLabel: "Line G. Material participation - No",
    id: "lineGMaterialParticipationNo",
    page: 1,
    topPct: 23.6,
    leftPct: 95.0,
    instruction: "Check No if you did not materially participate in the operation of this business in 2025.",
  }),
  checkboxSlot({
    badge: "H",
    canvasLabel: "Line H start or acquire",
    citation: "i1040sc: Line H",
    fieldLabel: "Line H. Started or acquired this business during 2025",
    id: "lineHStartedOrAcquiredCheckbox",
    page: 1,
    topPct: 26.0,
    leftPct: 26.6,
    instruction: "Check this box if you started or acquired this business during 2025.",
  }),
  checkboxSlot({
    badge: "I yes",
    canvasLabel: "Line I yes",
    citation: "i1040sc: Line I",
    fieldLabel: "Line I. Required to file Form(s) 1099 - Yes",
    id: "lineIRequired1099Yes",
    page: 1,
    topPct: 26.0,
    leftPct: 90.1,
    instruction: "Check Yes if you made payments in 2025 that would require you to file Form(s) 1099.",
  }),
  checkboxSlot({
    badge: "I no",
    canvasLabel: "Line I no",
    citation: "i1040sc: Line I",
    fieldLabel: "Line I. Required to file Form(s) 1099 - No",
    id: "lineIRequired1099No",
    page: 1,
    topPct: 26.0,
    leftPct: 95.0,
    instruction: "Check No if you did not make payments that would require Form(s) 1099 filing.",
  }),
  checkboxSlot({
    badge: "J yes",
    canvasLabel: "Line J yes",
    citation: "i1040sc: Line J",
    fieldLabel: "Line J. Filed required Form(s) 1099 - Yes",
    id: "lineJFiled1099Yes",
    page: 1,
    topPct: 28.5,
    leftPct: 90.1,
    instruction: "Check Yes if you filed the required Form(s) 1099.",
  }),
  checkboxSlot({
    badge: "J no",
    canvasLabel: "Line J no",
    citation: "i1040sc: Line J",
    fieldLabel: "Line J. Filed required Form(s) 1099 - No",
    id: "lineJFiled1099No",
    page: 1,
    topPct: 28.5,
    leftPct: 95.0,
    instruction: "Check No if you were required to file Form(s) 1099 but did not file them.",
  }),
  amountSlot({
    badge: "1",
    canvasLabel: "Line 1 gross receipts or sales",
    citation: "i1040sc: Line 1",
    fieldLabel: "Line 1. Gross receipts or sales",
    id: "line1GrossReceiptsOrSales",
    page: 1,
    topPct: 34.5,
    leftPct: 89.0,
    instruction: "Enter gross receipts or sales before subtracting any returns, allowances, or cost of goods sold.",
  }),
  checkboxSlot({
    badge: "SE",
    canvasLabel: "Statutory employee checkbox",
    citation: "i1040sc: Line 1",
    fieldLabel: "Line 1 statutory employee checkbox",
    id: "line1StatutoryEmployeeCheckbox",
    page: 1,
    topPct: 33.7,
    leftPct: 82.2,
    instruction:
      "Check this box only if the income was reported to you on a Form W-2 and that form checked the statutory employee box.",
  }),
  amountSlot({
    badge: "2",
    canvasLabel: "Line 2 returns and allowances",
    citation: "i1040sc: Line 2",
    fieldLabel: "Line 2. Returns and allowances",
    id: "line2ReturnsAndAllowances",
    page: 1,
    topPct: 36.9,
    leftPct: 89.0,
    instruction: "Enter returns and allowances that reduce the line 1 gross receipts amount.",
  }),
  amountSlot({
    badge: "3",
    canvasLabel: "Line 3 subtract line 2 from line 1",
    citation: "i1040sc: Line 3",
    fieldLabel: "Line 3. Subtract line 2 from line 1",
    id: "line3Subtract2",
    page: 1,
    topPct: 39.3,
    leftPct: 89.0,
    instruction: "Calculate line 3 by subtracting line 2 from line 1.",
  }),
  amountSlot({
    badge: "4",
    canvasLabel: "Line 4 cost of goods sold",
    citation: "i1040sc: Line 4",
    fieldLabel: "Line 4. Cost of goods sold",
    id: "line4CostOfGoodsSold",
    page: 1,
    topPct: 41.7,
    leftPct: 89.0,
    instruction: "Enter the amount from line 42 if this business has cost of goods sold.",
  }),
  amountSlot({
    badge: "5",
    canvasLabel: "Line 5 gross profit",
    citation: "i1040sc: Line 5",
    fieldLabel: "Line 5. Gross profit",
    id: "line5GrossProfit",
    page: 1,
    topPct: 44.1,
    leftPct: 89.0,
    instruction: "Calculate line 5 by subtracting line 4 from line 3.",
  }),
  amountSlot({
    badge: "6",
    canvasLabel: "Line 6 other income",
    citation: "i1040sc: Line 6",
    fieldLabel: "Line 6. Other income",
    id: "line6OtherIncome",
    page: 1,
    topPct: 46.5,
    leftPct: 89.0,
    instruction: "Enter other income, including qualifying fuel-tax credits or refunds, when applicable.",
  }),
  amountSlot({
    badge: "7",
    canvasLabel: "Line 7 gross income",
    citation: "i1040sc: Line 7",
    fieldLabel: "Line 7. Gross income",
    id: "line7GrossIncome",
    page: 1,
    topPct: 48.9,
    leftPct: 89.0,
    instruction: "Calculate line 7 by adding lines 5 and 6.",
  }),
  ...page1ExpenseLeftRows.map((row, index) =>
    amountSlot({
      ...row,
      page: 1,
      topPct: 55.1 + index * 3.1,
      leftPct: 30.0,
    }),
  ),
  ...page1ExpenseRightRows.map((row, index) =>
    amountSlot({
      ...row,
      page: 1,
      topPct: 55.1 + index * 3.1,
      leftPct: 89.0,
    }),
  ),
  amountSlot({
    badge: "28",
    canvasLabel: "Line 28 total expenses",
    citation: "i1040sc: Line 28",
    fieldLabel: "Line 28. Total expenses",
    id: "line28TotalExpenses",
    page: 1,
    topPct: 92.1,
    leftPct: 89.0,
    instruction: "Add lines 8 through 27a to calculate total expenses.",
  }),
  amountSlot({
    badge: "29",
    canvasLabel: "Line 29 tentative profit or loss",
    citation: "i1040sc: Line 29",
    fieldLabel: "Line 29. Tentative profit or loss",
    id: "line29TentativeProfitLoss",
    page: 1,
    topPct: 95.0,
    leftPct: 89.0,
    instruction: "Subtract line 28 from line 7 to calculate tentative profit or loss.",
  }),
  textSlot({
    badge: "30a",
    canvasLabel: "Line 30 home office square footage a",
    citation: "i1040sc: Line 30",
    fieldLabel: "Line 30(a). Total square footage of your home",
    id: "line30HomeOfficeAreaA",
    page: 1,
    topPct: 92.8,
    leftPct: 43.3,
    widthPct: 8.0,
    instruction: "If you use the simplified method, enter the total square footage of your home here.",
  }),
  textSlot({
    badge: "30b",
    canvasLabel: "Line 30 home office square footage b",
    citation: "i1040sc: Line 30",
    fieldLabel: "Line 30(b). Square footage used regularly for business",
    id: "line30HomeOfficeAreaB",
    page: 1,
    topPct: 94.0,
    leftPct: 54.2,
    widthPct: 8.0,
    instruction: "If you use the simplified method, enter the square footage regularly used for business here.",
  }),
  amountSlot({
    badge: "30",
    canvasLabel: "Line 30 expenses for business use of home",
    citation: "i1040sc: Line 30",
    fieldLabel: "Line 30. Expenses for business use of your home",
    id: "line30ExpensesForBusinessUseOfHome",
    page: 1,
    topPct: 96.6,
    leftPct: 89.0,
    instruction: "Enter the allowable home-office amount here after completing the required supporting computation.",
  }),
  amountSlot({
    badge: "31",
    canvasLabel: "Line 31 net profit or loss",
    citation: "i1040sc: Line 31",
    fieldLabel: "Line 31. Net profit or loss",
    id: "line31NetProfitLoss",
    page: 1,
    topPct: 98.8,
    leftPct: 89.0,
    instruction: "Subtract line 30 from line 29 to calculate net profit or loss.",
  }),
  checkboxSlot({
    badge: "32a",
    canvasLabel: "Line 32a all investment at risk",
    citation: "i1040sc: Line 32",
    fieldLabel: "Line 32a. All investment is at risk",
    id: "line32aAllInvestmentAtRisk",
    page: 1,
    topPct: 97.2,
    leftPct: 91.4,
    instruction: "Check this box if all investment in this activity is at risk.",
  }),
  checkboxSlot({
    badge: "32b",
    canvasLabel: "Line 32b some investment not at risk",
    citation: "i1040sc: Line 32",
    fieldLabel: "Line 32b. Some investment is not at risk",
    id: "line32bSomeInvestmentNotAtRisk",
    page: 1,
    topPct: 98.8,
    leftPct: 91.4,
    instruction: "Check this box if some investment in this activity is not at risk.",
  }),
  checkboxSlot({
    badge: "33a",
    canvasLabel: "Line 33 cost method",
    citation: "i1040sc: Line 33",
    fieldLabel: "Line 33a. Cost method",
    id: "line33aCostMethod",
    page: 2,
    topPct: 8.9,
    leftPct: 30.3,
    instruction: "Check this box if you valued closing inventory at cost.",
  }),
  checkboxSlot({
    badge: "33b",
    canvasLabel: "Line 33 lower of cost or market",
    citation: "i1040sc: Line 33",
    fieldLabel: "Line 33b. Lower of cost or market",
    id: "line33bLowerOfCostOrMarket",
    page: 2,
    topPct: 8.9,
    leftPct: 46.8,
    instruction: "Check this box if you valued closing inventory at lower of cost or market.",
  }),
  checkboxSlot({
    badge: "33c",
    canvasLabel: "Line 33 other method",
    citation: "i1040sc: Line 33",
    fieldLabel: "Line 33c. Other method",
    id: "line33cOtherMethod",
    page: 2,
    topPct: 8.9,
    leftPct: 70.5,
    instruction: "Check this box if another inventory valuation method applies and attach the explanation when required.",
  }),
  checkboxSlot({
    badge: "34 yes",
    canvasLabel: "Line 34 yes",
    citation: "i1040sc: Line 34",
    fieldLabel: "Line 34. Change in quantities, costs, or valuations - Yes",
    id: "line34InventoryChangeYes",
    page: 2,
    topPct: 13.8,
    leftPct: 88.1,
    instruction: "Check Yes if there was any change in quantities, costs, or valuations between opening and closing inventory.",
  }),
  checkboxSlot({
    badge: "34 no",
    canvasLabel: "Line 34 no",
    citation: "i1040sc: Line 34",
    fieldLabel: "Line 34. Change in quantities, costs, or valuations - No",
    id: "line34InventoryChangeNo",
    page: 2,
    topPct: 13.8,
    leftPct: 95.6,
    instruction: "Check No if there was no change in quantities, costs, or valuations.",
  }),
  amountSlot({
    badge: "35",
    canvasLabel: "Line 35 inventory at beginning of year",
    citation: "i1040sc: Line 35",
    fieldLabel: "Line 35. Inventory at beginning of year",
    id: "line35InventoryAtBeginningOfYear",
    page: 2,
    topPct: 18.4,
    leftPct: 89.0,
    instruction: "Enter beginning inventory for the year; attach an explanation if it differs from last year's closing inventory.",
  }),
  amountSlot({
    badge: "36",
    canvasLabel: "Line 36 purchases",
    citation: "i1040sc: Line 36",
    fieldLabel: "Line 36. Purchases less cost of items withdrawn for personal use",
    id: "line36PurchasesLessWithdrawals",
    page: 2,
    topPct: 22.2,
    leftPct: 89.0,
    instruction: "Enter purchases for inventory items after subtracting items withdrawn for personal use.",
  }),
  amountSlot({
    badge: "37",
    canvasLabel: "Line 37 labor",
    citation: "i1040sc: Line 37",
    fieldLabel: "Line 37. Cost of labor",
    id: "line37CostOfLabor",
    page: 2,
    topPct: 26.0,
    leftPct: 89.0,
    instruction: "Enter cost of labor for production or inventory, excluding amounts paid to yourself.",
  }),
  amountSlot({
    badge: "38",
    canvasLabel: "Line 38 materials and supplies",
    citation: "i1040sc: Line 38",
    fieldLabel: "Line 38. Materials and supplies",
    id: "line38MaterialsAndSupplies",
    page: 2,
    topPct: 29.8,
    leftPct: 89.0,
    instruction: "Enter materials and supplies included in cost of goods sold.",
  }),
  amountSlot({
    badge: "39",
    canvasLabel: "Line 39 other costs",
    citation: "i1040sc: Line 39",
    fieldLabel: "Line 39. Other costs",
    id: "line39OtherCosts",
    page: 2,
    topPct: 33.6,
    leftPct: 89.0,
    instruction: "Enter other inventory-related costs that belong in Part III.",
  }),
  amountSlot({
    badge: "40",
    canvasLabel: "Line 40 add lines 35 to 39",
    citation: "i1040sc: Line 40",
    fieldLabel: "Line 40. Add lines 35 through 39",
    id: "line40AddLines35To39",
    page: 2,
    topPct: 37.4,
    leftPct: 89.0,
    instruction: "Add lines 35 through 39 to calculate line 40.",
  }),
  amountSlot({
    badge: "41",
    canvasLabel: "Line 41 inventory at end of year",
    citation: "i1040sc: Line 41",
    fieldLabel: "Line 41. Inventory at end of year",
    id: "line41InventoryAtEndOfYear",
    page: 2,
    topPct: 41.2,
    leftPct: 89.0,
    instruction: "Enter inventory at the end of the year.",
  }),
  amountSlot({
    badge: "42",
    canvasLabel: "Line 42 cost of goods sold",
    citation: "i1040sc: Line 42",
    fieldLabel: "Line 42. Cost of goods sold",
    id: "line42CostOfGoodsSold",
    page: 2,
    topPct: 45.0,
    leftPct: 89.0,
    instruction: "Subtract line 41 from line 40 to calculate cost of goods sold.",
  }),
  textSlot({
    badge: "43",
    canvasLabel: "Line 43 vehicle placed in service",
    citation: "i1040sc: Line 43",
    fieldLabel: "Line 43. Date vehicle placed in service for business purposes",
    id: "line43VehiclePlacedInServiceDate",
    page: 2,
    topPct: 57.0,
    leftPct: 79.0,
    widthPct: 16.0,
    instruction: "Enter the date you first placed the vehicle in service for business purposes.",
  }),
  textSlot({
    badge: "44a",
    canvasLabel: "Line 44a business miles",
    citation: "i1040sc: Line 44",
    fieldLabel: "Line 44a. Business miles",
    id: "line44aBusinessMiles",
    page: 2,
    topPct: 63.4,
    leftPct: 28.8,
    widthPct: 7.0,
    instruction: "Enter the total number of business miles driven during 2025.",
  }),
  textSlot({
    badge: "44b",
    canvasLabel: "Line 44b commuting miles",
    citation: "i1040sc: Line 44",
    fieldLabel: "Line 44b. Commuting miles",
    id: "line44bCommutingMiles",
    page: 2,
    topPct: 63.4,
    leftPct: 52.0,
    widthPct: 7.0,
    instruction: "Enter the total number of commuting miles driven during 2025.",
  }),
  textSlot({
    badge: "44c",
    canvasLabel: "Line 44c other miles",
    citation: "i1040sc: Line 44",
    fieldLabel: "Line 44c. Other miles",
    id: "line44cOtherMiles",
    page: 2,
    topPct: 63.4,
    leftPct: 74.8,
    widthPct: 7.0,
    instruction: "Enter the total number of other miles driven during 2025.",
  }),
  checkboxSlot({
    badge: "45 yes",
    canvasLabel: "Line 45 yes",
    citation: "i1040sc: Line 45",
    fieldLabel: "Line 45. Vehicle available for personal use during off-duty hours - Yes",
    id: "line45VehicleAvailableForPersonalUseYes",
    page: 2,
    topPct: 69.5,
    leftPct: 89.0,
    instruction: "Check Yes if the vehicle was available for personal use during off-duty hours.",
  }),
  checkboxSlot({
    badge: "45 no",
    canvasLabel: "Line 45 no",
    citation: "i1040sc: Line 45",
    fieldLabel: "Line 45. Vehicle available for personal use during off-duty hours - No",
    id: "line45VehicleAvailableForPersonalUseNo",
    page: 2,
    topPct: 69.5,
    leftPct: 95.2,
    instruction: "Check No if the vehicle was not available for personal use during off-duty hours.",
  }),
  checkboxSlot({
    badge: "46 yes",
    canvasLabel: "Line 46 yes",
    citation: "i1040sc: Line 46",
    fieldLabel: "Line 46. Another vehicle available for personal use - Yes",
    id: "line46AnotherVehicleAvailableYes",
    page: 2,
    topPct: 73.5,
    leftPct: 89.0,
    instruction: "Check Yes if you or your spouse had another vehicle available for personal use.",
  }),
  checkboxSlot({
    badge: "46 no",
    canvasLabel: "Line 46 no",
    citation: "i1040sc: Line 46",
    fieldLabel: "Line 46. Another vehicle available for personal use - No",
    id: "line46AnotherVehicleAvailableNo",
    page: 2,
    topPct: 73.5,
    leftPct: 95.2,
    instruction: "Check No if neither you nor your spouse had another vehicle available for personal use.",
  }),
  checkboxSlot({
    badge: "47a yes",
    canvasLabel: "Line 47a yes",
    citation: "i1040sc: Line 47a",
    fieldLabel: "Line 47a. Evidence to support deduction - Yes",
    id: "line47aEvidenceToSupportDeductionYes",
    page: 2,
    topPct: 77.6,
    leftPct: 89.0,
    instruction: "Check Yes if you have written or other evidence to support the deduction.",
  }),
  checkboxSlot({
    badge: "47a no",
    canvasLabel: "Line 47a no",
    citation: "i1040sc: Line 47a",
    fieldLabel: "Line 47a. Evidence to support deduction - No",
    id: "line47aEvidenceToSupportDeductionNo",
    page: 2,
    topPct: 77.6,
    leftPct: 95.2,
    instruction: "Check No if you do not have evidence to support the deduction.",
  }),
  checkboxSlot({
    badge: "47b yes",
    canvasLabel: "Line 47b yes",
    citation: "i1040sc: Line 47b",
    fieldLabel: "Line 47b. Evidence is written - Yes",
    id: "line47bEvidenceIsWrittenYes",
    page: 2,
    topPct: 81.6,
    leftPct: 89.0,
    instruction: "Check Yes if the supporting evidence is written.",
  }),
  checkboxSlot({
    badge: "47b no",
    canvasLabel: "Line 47b no",
    citation: "i1040sc: Line 47b",
    fieldLabel: "Line 47b. Evidence is written - No",
    id: "line47bEvidenceIsWrittenNo",
    page: 2,
    topPct: 81.6,
    leftPct: 95.2,
    instruction: "Check No if the supporting evidence is not written.",
  }),
  ...page2PartVRows.map((row, index) =>
    textSlot({
      badge: row.badge,
      canvasLabel: row.canvasLabel,
      citation: "Official form label only",
      fieldLabel: row.fieldLabel,
      id: row.id,
      page: 2,
      topPct: 87.1 + index * 3.3,
      leftPct: 5.5,
      widthPct: 91.5,
      instruction:
        "List one other ordinary and necessary business expense not already included on lines 8 through 27a, together with its amount.",
    }),
  ),
  amountSlot({
    badge: "48",
    canvasLabel: "Line 48 total other expenses",
    citation: "i1040sc: Line 48",
    fieldLabel: "Line 48. Total other expenses",
    id: "line48TotalOtherExpenses",
    page: 2,
    topPct: 98.2,
    leftPct: 89.0,
    instruction: "Add the Part V detail rows and enter the total here, then carry it to line 27b.",
  }),
];

export function createEmptyFormScheduleCSnapshot(): FormScheduleCDatabaseSnapshot {
  return {
    currency: null,
    grossReceiptsCents: null,
    incomeRecordCount: 0,
    proprietorName: null,
  };
}

export function buildFormScheduleCSnapshot(input: {
  currency: string | null;
  grossReceiptsCents: number | null;
  incomeRecordCount: number;
  proprietorName: string | null;
}): FormScheduleCDatabaseSnapshot {
  return {
    currency: input.currency,
    grossReceiptsCents: input.grossReceiptsCents,
    incomeRecordCount: input.incomeRecordCount,
    proprietorName: input.proprietorName,
  };
}

export function buildFormScheduleCSlots(
  snapshot: FormScheduleCDatabaseSnapshot,
  options?: {
    noInstructionNote?: string;
  },
): FormScheduleCSlotState[] {
  const noInstructionNote = options?.noInstructionNote ?? defaultNoInstructionNote;
  const currency = snapshot.currency ?? "USD";
  const hasIncomePreview =
    snapshot.grossReceiptsCents !== null && snapshot.incomeRecordCount > 0;

  return baseSlotDefinitions.map((definition) => {
    const normalizedDefinition = withInstructionFallback(withParsedHighlight(definition), noInstructionNote);

    if (definition.id === "proprietorName") {
      return {
        ...normalizedDefinition,
        previewValue: snapshot.proprietorName,
        source: snapshot.proprietorName ? "database" : "manual",
        sourceNote: snapshot.proprietorName
          ? "Preview comes from entities.legal_name."
          : "No proprietor legal name exists in the local entity table.",
      };
    }

    if (definition.id === "line1GrossReceiptsOrSales") {
      return {
        ...normalizedDefinition,
        previewValue: hasIncomePreview
          ? formatCurrencyLabel(snapshot.grossReceiptsCents ?? 0, currency)
          : null,
        source: hasIncomePreview ? "database" : "manual",
        sourceNote: hasIncomePreview
          ? "Preview is derived from posted or reconciled income-like record gross totals."
          : "No posted or reconciled income-like record totals are available for line 1 yet.",
      };
    }

    if (calculatedSlotIds.has(definition.id)) {
      return {
        ...normalizedDefinition,
        previewValue: null,
        source: "calculated",
        sourceNote: getCalculatedSourceNote(definition.id),
      };
    }

    return {
      ...normalizedDefinition,
      previewValue: null,
      source: "manual",
      sourceNote: getManualSourceNote(definition),
    };
  });
}

function withParsedHighlight(definition: BaseSlotDefinition): BaseSlotDefinition {
  const parsedHighlight = parsedScheduleCHighlights[definition.id];

  if (!parsedHighlight) {
    return definition;
  }

  return {
    ...definition,
    highlight: parsedHighlight,
  };
}

export function formatCurrencyLabel(amountCents: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    currency,
    minimumFractionDigits: 2,
    style: "currency",
  });

  return formatter.format(amountCents / 100);
}

function amountSlot(input: {
  badge: string;
  canvasLabel: string;
  citation: string;
  fieldLabel: string;
  id: FormScheduleCSlotId;
  instruction: string;
  page: FormScheduleCPage;
  leftPct: number;
  topPct: number;
}): BaseSlotDefinition {
  return {
    ...input,
    highlight: {
      heightPct: 2.3,
      leftPct: input.leftPct,
      topPct: input.topPct,
      widthPct: 8.7,
    },
    kind: "amount",
  };
}

function textSlot(input: {
  badge: string;
  canvasLabel: string;
  citation: string;
  fieldLabel: string;
  id: FormScheduleCSlotId;
  instruction: string;
  page: FormScheduleCPage;
  leftPct: number;
  topPct: number;
  widthPct: number;
}): BaseSlotDefinition {
  return {
    ...input,
    highlight: {
      heightPct: 2.1,
      leftPct: input.leftPct,
      topPct: input.topPct,
      widthPct: input.widthPct,
    },
    kind: "text",
  };
}

function checkboxSlot(input: {
  badge: string;
  canvasLabel: string;
  citation: string;
  fieldLabel: string;
  id: FormScheduleCSlotId;
  instruction: string;
  page: FormScheduleCPage;
  leftPct: number;
  topPct: number;
}): BaseSlotDefinition {
  return {
    ...input,
    highlight: {
      heightPct: 1.8,
      leftPct: input.leftPct,
      topPct: input.topPct,
      widthPct: 1.8,
    },
    kind: "checkbox",
  };
}

function withInstructionFallback(
  definition: BaseSlotDefinition,
  noInstructionNote: string,
): BaseSlotDefinition {
  if (definition.citation === "Official form label only") {
    return {
      ...definition,
      instruction: noInstructionNote,
    };
  }

  return definition;
}

function getCalculatedSourceNote(slotId: FormScheduleCSlotId): string {
  switch (slotId) {
    case "line3Subtract2":
      return "Calculated from line 1 minus line 2.";
    case "line5GrossProfit":
      return "Calculated from line 3 minus line 4.";
    case "line7GrossIncome":
      return "Calculated from line 5 plus line 6.";
    case "line27bTotalOtherExpenses":
      return "Calculated from the Part V other-expense detail rows.";
    case "line28TotalExpenses":
      return "Calculated by adding lines 8 through 27a.";
    case "line29TentativeProfitLoss":
      return "Calculated from line 7 minus line 28.";
    case "line31NetProfitLoss":
      return "Calculated from line 29 minus line 30.";
    case "line40AddLines35To39":
      return "Calculated by adding lines 35 through 39.";
    case "line42CostOfGoodsSold":
      return "Calculated from line 40 minus line 41.";
    case "line48TotalOtherExpenses":
      return "Calculated by adding the Part V rows and carrying the result to line 27b.";
    default:
      return "Calculated from other Schedule C inputs.";
  }
}

function getManualSourceNote(definition: BaseSlotDefinition): string {
  if (definition.kind === "checkbox") {
    return "Current local schema does not store this filing-control checkbox answer.";
  }

  if (definition.id.startsWith("line47OtherExpenseRow")) {
    return "Current local schema does not itemize Part V other-expense rows automatically.";
  }

  if (
    definition.id === "proprietorSsn" ||
    definition.id === "lineDEin" ||
    definition.id === "lineABusinessActivity" ||
    definition.id === "lineBBusinessCode" ||
    definition.id === "lineCBusinessName" ||
    definition.id === "lineEAddress" ||
    definition.id === "lineECityStateZip" ||
    definition.id === "lineFOtherMethodText" ||
    definition.id === "line43VehiclePlacedInServiceDate" ||
    definition.id === "line44aBusinessMiles" ||
    definition.id === "line44bCommutingMiles" ||
    definition.id === "line44cOtherMiles" ||
    definition.id === "line30HomeOfficeAreaA" ||
    definition.id === "line30HomeOfficeAreaB"
  ) {
    return "Current local schema does not store this taxpayer, business-detail, or substantiation field.";
  }

  if (definition.id.startsWith("line") && definition.kind === "amount") {
    return "Current local schema does not map records directly to this Schedule C line automatically. Review your books and enter this amount manually.";
  }

  return "Manual review is required because the current schema does not store this field directly.";
}
