import { describe, expect, it, vi } from "vitest";
import type { LedgerlySDK } from "@ledgerly/sdk";
import { executeTool, ledgerTools } from "../src/tools";

describe("agent tool exposure for new SDK surfaces", () => {
  it("registers the new storage, workflow, and tax drill-down tools", () => {
    const toolNames = ledgerTools.map((tool) => tool.name);

    expect(toolNames).toEqual(
      expect.arrayContaining([
        "get_storage_overview",
        "search_records_by_date_range",
        "list_evidences",
        "get_evidence",
        "list_evidence_files",
        "list_upload_batches",
        "get_upload_batch",
        "list_extraction_runs",
        "list_planner_runs",
        "list_planner_read_tasks",
        "list_candidate_records",
        "list_workflow_write_proposals",
        "list_workflow_audit_events",
        "get_schedule_c_aggregation",
        "get_schedule_se_preview",
        "get_tax_helper_evidence_file_links",
      ]),
    );
  });

  it("dispatches the new tool executors to the corresponding SDK methods", async () => {
    const methods = {
      getStorageOverview: vi.fn(() => ({ tableCount: 15 })),
      searchRecordsByDateRange: vi.fn().mockResolvedValue([{ recordId: "rec-1" }]),
      listEvidences: vi.fn().mockResolvedValue([{ evidenceId: "evidence-1" }]),
      getEvidence: vi.fn().mockResolvedValue({ evidenceId: "evidence-1" }),
      listEvidenceFiles: vi.fn().mockResolvedValue([{ evidenceFileId: "file-1" }]),
      listUploadBatches: vi.fn().mockResolvedValue([{ batchId: "batch-1" }]),
      getUploadBatch: vi.fn().mockResolvedValue({ batchId: "batch-1" }),
      listExtractionRuns: vi.fn().mockResolvedValue([{ extractionRunId: "extract-1" }]),
      listPlannerRuns: vi.fn().mockResolvedValue([{ plannerRunId: "planner-1" }]),
      listPlannerReadTasks: vi.fn().mockResolvedValue([{ readTaskId: "task-1" }]),
      listCandidateRecords: vi.fn().mockResolvedValue([{ candidateId: "candidate-1" }]),
      listWorkflowWriteProposals: vi.fn().mockResolvedValue([{ writeProposalId: "proposal-1" }]),
      listWorkflowAuditEvents: vi.fn().mockResolvedValue([{ eventId: "event-1" }]),
      getScheduleCAggregation: vi.fn().mockResolvedValue({ lineAmounts: {} }),
      getScheduleSEPreview: vi.fn().mockResolvedValue({ netProfitCents: 1234 }),
      getTaxHelperEvidenceFileLinks: vi.fn().mockResolvedValue([{ evidenceFileId: "file-1" }]),
    };
    const sdk = methods as unknown as LedgerlySDK;

    await expect(executeTool(sdk, "get_storage_overview", {})).resolves.toEqual({
      tableCount: 15,
    });
    expect(methods.getStorageOverview).toHaveBeenCalledTimes(1);

    await executeTool(sdk, "search_records_by_date_range", {
      endDate: "2026-03-31",
      recordKinds: "income,expense",
      recordStatuses: "posted,reconciled",
      startDate: "2026-01-01",
    });
    expect(methods.searchRecordsByDateRange).toHaveBeenCalledWith({
      endExclusiveOn: undefined,
      endOn: "2026-03-31",
      limit: undefined,
      recordKinds: ["income", "expense"],
      recordStatuses: ["posted", "reconciled"],
      startOn: "2026-01-01",
    });

    await executeTool(sdk, "list_evidences", { limit: "5", parseStatus: "parsed" });
    expect(methods.listEvidences).toHaveBeenCalledWith({
      limit: 5,
      parseStatus: "parsed",
    });

    await executeTool(sdk, "get_evidence", { evidenceId: "evidence-1" });
    expect(methods.getEvidence).toHaveBeenCalledWith("evidence-1");

    await executeTool(sdk, "list_evidence_files", { evidenceId: "evidence-1" });
    expect(methods.listEvidenceFiles).toHaveBeenCalledWith("evidence-1");

    await executeTool(sdk, "list_upload_batches", { limit: "3", state: "review_required" });
    expect(methods.listUploadBatches).toHaveBeenCalledWith({
      limit: 3,
      states: ["review_required"],
    });

    await executeTool(sdk, "get_upload_batch", { batchId: "batch-1" });
    expect(methods.getUploadBatch).toHaveBeenCalledWith("batch-1");

    await executeTool(sdk, "list_extraction_runs", { evidenceId: "evidence-1" });
    expect(methods.listExtractionRuns).toHaveBeenCalledWith({
      batchId: undefined,
      evidenceId: "evidence-1",
    });

    await executeTool(sdk, "list_planner_runs", { batchId: "batch-1" });
    expect(methods.listPlannerRuns).toHaveBeenCalledWith({
      batchId: "batch-1",
      evidenceId: undefined,
    });

    await executeTool(sdk, "list_planner_read_tasks", { plannerRunId: "planner-1" });
    expect(methods.listPlannerReadTasks).toHaveBeenCalledWith("planner-1");

    await executeTool(sdk, "list_candidate_records", {
      plannerRunId: "planner-1",
      states: "needs_review,approved",
    });
    expect(methods.listCandidateRecords).toHaveBeenCalledWith({
      batchId: undefined,
      evidenceId: undefined,
      plannerRunId: "planner-1",
      states: ["needs_review", "approved"],
    });

    await executeTool(sdk, "list_workflow_write_proposals", {
      plannerRunId: "planner-1",
      proposalType: "create_counterparty",
      states: "pending_approval,blocked",
    });
    expect(methods.listWorkflowWriteProposals).toHaveBeenCalledWith({
      candidateId: undefined,
      plannerRunId: "planner-1",
      proposalType: "create_counterparty",
      states: ["pending_approval", "blocked"],
    });

    await executeTool(sdk, "list_workflow_audit_events", {
      batchId: "batch-1",
      limit: "2",
    });
    expect(methods.listWorkflowAuditEvents).toHaveBeenCalledWith({
      batchId: "batch-1",
      candidateId: undefined,
      limit: 2,
      plannerRunId: undefined,
      writeProposalId: undefined,
    });

    await executeTool(sdk, "get_schedule_c_aggregation", { taxYear: "2026" });
    expect(methods.getScheduleCAggregation).toHaveBeenCalledWith(2026);

    await executeTool(sdk, "get_schedule_se_preview", { taxYear: "2026" });
    expect(methods.getScheduleSEPreview).toHaveBeenCalledWith(2026);

    await executeTool(sdk, "get_tax_helper_evidence_file_links", {
      recordIds: "income-jan,expense-feb",
      taxYear: "2026",
    });
    expect(methods.getTaxHelperEvidenceFileLinks).toHaveBeenCalledWith(2026, [
      "income-jan",
      "expense-feb",
    ]);
  });
});
