import { afterEach, describe, expect, it, vi } from "vitest";
import type { LedgerlySDK } from "@ledgerly/sdk";
import { AgentSession } from "../src/agent-session";

describe("AgentSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("streams message updates through the quick-add record flow and fills default parties", async () => {
    const createdRecord = {
      amountCents: 1800,
      businessUseBps: 10000,
      categoryCode: null,
      createdAt: "2026-04-22T10:00:00.000Z",
      currency: "USD",
      description: "Team lunch",
      entityId: "entity-main",
      memo: null,
      occurredOn: "2026-04-22",
      recordId: "rec-team-lunch",
      recordKind: "expense",
      recordStatus: "posted",
      sourceCounterpartyId: null,
      sourceLabel: "Business checking",
      sourceSystem: "agent",
      subcategoryCode: null,
      targetCounterpartyId: null,
      targetLabel: "Unspecified vendor",
      taxCategoryCode: "schedule-c-other-expense",
      taxLineCode: "line27a",
      updatedAt: "2026-04-22T10:00:00.000Z",
    };

    const getContextSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        counterpartyCount: 0,
        entityId: "entity-main",
        entityName: "Ledgerly Main Entity",
        monthlyMetrics: {
          incomeCents: 0,
          netCents: 0,
          outflowCents: 0,
        },
        recentRecords: [],
        totalRecords: 0,
      })
      .mockResolvedValueOnce({
        counterpartyCount: 0,
        entityId: "entity-main",
        entityName: "Ledgerly Main Entity",
        monthlyMetrics: {
          incomeCents: 0,
          netCents: -1800,
          outflowCents: 1800,
        },
        recentRecords: [
          {
            amountCents: 1800,
            businessUseBps: 10000,
            categoryCode: null,
            createdAt: "2026-04-22T10:00:00.000Z",
            currency: "USD",
            description: "Team lunch",
            entityId: "entity-main",
            memo: null,
            occurredOn: "2026-04-22",
            recordId: "rec-team-lunch",
            recordKind: "expense",
            recordStatus: "posted",
            sourceCounterpartyId: null,
            sourceLabel: "Business checking",
            sourceSystem: "agent",
            subcategoryCode: null,
            targetCounterpartyId: null,
            targetLabel: "Unspecified vendor",
            taxCategoryCode: "schedule-c-other-expense",
            taxLineCode: "line27a",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
        ],
        totalRecords: 1,
      });

    const createRecord = vi.fn(async (input) => ({
      ...createdRecord,
      ...input,
    }));

    const sdk = {
      createRecord,
      getContextSnapshot,
    } as unknown as LedgerlySDK;

    const session = new AgentSession(sdk, {
      apiKey: "sk-test",
      locale: "en",
      provider: "openai",
    });

    await session.refreshContext();

    const historyLengths: number[] = [];
    session.subscribe((messages) => {
      historyLengths.push(messages.length);
    });

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: "tool_calls",
                  message: {
                    content: "",
                    role: "assistant",
                    tool_calls: [
                      {
                        id: "call_create_record",
                        type: "function",
                        function: {
                          name: "create_record",
                          arguments: JSON.stringify({
                            amountCents: "1800",
                            description: "Team lunch",
                            occurredOn: "2026-04-22",
                            recordKind: "expense",
                          }),
                        },
                      },
                    ],
                  },
                },
              ],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    content: "Recorded the lunch expense and updated your ledger totals.",
                    role: "assistant",
                  },
                },
              ],
            }),
            {
              headers: { "content-type": "application/json" },
              status: 200,
            },
          ),
        ),
    );

    const finalMessage = await session.sendMessage("Record a lunch expense for $18 today.");

    expect(createRecord).toHaveBeenCalledWith({
      amountCents: 1800,
      currency: undefined,
      description: "Team lunch",
      memo: undefined,
      occurredOn: "2026-04-22",
      recordKind: "expense",
      source: "Business checking",
      target: "Unspecified vendor",
    });
    expect(getContextSnapshot).toHaveBeenCalledTimes(2);
    expect(historyLengths).toEqual([0, 1, 2, 3, 4]);
    expect(finalMessage.content).toBe(
      "Recorded the lunch expense and updated your ledger totals.",
    );
  });
});
