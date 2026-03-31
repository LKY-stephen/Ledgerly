import { describe, expect, it } from "vitest";

import {
  getLedgerCardsForFilter,
  ledgerFilters,
  parseCategoryOptions,
  parseProgressSteps,
  uploadSourceCards,
} from "../src/features/ledger/ledger-mocks";

describe("ledger ui mocks", () => {
  it("keeps the ledger tab filters and cards wired for the upload/parse flow", () => {
    expect(ledgerFilters.map((filter) => filter.id)).toEqual(["income", "expenses", "invoices"]);
    expect(getLedgerCardsForFilter("income")).toHaveLength(5);
    expect(getLedgerCardsForFilter("expenses")).toHaveLength(2);
    expect(getLedgerCardsForFilter("invoices")).toHaveLength(1);
  });

  it("defines stable upload and parse sections for the pure-ui subflow", () => {
    expect(uploadSourceCards).toHaveLength(3);
    expect(parseProgressSteps).toHaveLength(3);
    expect(parseCategoryOptions.map((option) => option.id)).toEqual(["income", "expense", "invoice"]);
  });
});
