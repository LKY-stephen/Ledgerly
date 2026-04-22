export interface LedgerlySdkConfig {
  defaultEntityId?: string;
  defaultCurrency?: string;
}

export interface RecordRow {
  recordId: string;
  entityId: string;
  recordStatus: string;
  sourceSystem: string;
  description: string;
  memo: string | null;
  occurredOn: string;
  currency: string;
  amountCents: number;
  sourceLabel: string;
  targetLabel: string;
  sourceCounterpartyId: string | null;
  targetCounterpartyId: string | null;
  recordKind: string;
  categoryCode: string | null;
  subcategoryCode: string | null;
  taxCategoryCode: string | null;
  taxLineCode: string | null;
  businessUseBps: number;
  createdAt: string;
  updatedAt: string;
}

export interface CounterpartyRow {
  counterpartyId: string;
  entityId: string;
  counterpartyType: string;
  displayName: string;
  rawReference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EntityRow {
  entityId: string;
  legalName: string;
  entityType: string;
  baseCurrency: string;
  defaultTimezone: string;
  createdAt: string;
}

export interface MonthlyMetrics {
  incomeCents: number;
  outflowCents: number;
  netCents: number;
}

export interface TrendPoint {
  date: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export interface ListRecordsFilter {
  entityId?: string;
  recordKind?: string;
  recordKinds?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRecordInput {
  amountCents: number;
  currency?: string;
  description: string;
  memo?: string;
  occurredOn: string;
  source: string;
  target: string;
  recordKind: "income" | "non_business_income" | "expense" | "personal_spending";
  entityId?: string;
  taxCategoryCode?: string;
  taxLineCode?: string;
}

export interface UpdateRecordInput {
  description?: string;
  memo?: string;
  amountCents?: number;
  occurredOn?: string;
  sourceLabel?: string;
  targetLabel?: string;
  recordKind?: string;
  recordStatus?: string;
  categoryCode?: string | null;
  taxCategoryCode?: string | null;
  taxLineCode?: string | null;
}

export interface CreateCounterpartyInput {
  entityId?: string;
  counterpartyType: string;
  displayName: string;
  rawReference?: string;
  notes?: string;
}

export interface ContextSnapshot {
  entityName: string;
  entityId: string;
  totalRecords: number;
  monthlyMetrics: MonthlyMetrics;
  recentRecords: RecordRow[];
  counterpartyCount: number;
}
