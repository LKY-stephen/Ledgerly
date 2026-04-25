import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.doUnmock("react");
  vi.doUnmock("@ledgerly/sdk");
  vi.doUnmock("expo-sqlite");
});

describe("useBusinessLedgerReports hooks", () => {
  it("loads business reports through the native hook path", async () => {
    const snapshot = { kind: "snapshot" };
    const harness = await loadNativeHarness({
      hasRange: true,
      loadResult: snapshot,
      selectedScope: "business",
    });

    const state = harness.useBusinessLedgerReports({
      reloadToken: "steady",
      selectedPeriod: createPeriod(),
      selectedScope: "business",
    });

    expect(state).toEqual({ status: "idle" });
    expect(harness.setState).toHaveBeenNthCalledWith(1, { status: "loading" });
    expect(harness.createWritableStorageDatabase).toHaveBeenCalledWith("native-db");
    expect(harness.loadBusinessLedgerReportSnapshot).toHaveBeenCalledWith({
      locale: "en",
      period: createPeriod(),
      sdk: expect.any(Object),
    });

    await Promise.resolve();
    expect(harness.setState).toHaveBeenLastCalledWith({
      snapshot,
      status: "ready",
    });
  });

  it("keeps the native hook idle outside the business scope", async () => {
    const harness = await loadNativeHarness({
      hasRange: true,
      loadResult: { kind: "unused" },
      selectedScope: "personal",
    });

    harness.useBusinessLedgerReports({
      reloadToken: "steady",
      selectedPeriod: createPeriod(),
      selectedScope: "personal",
    });

    expect(harness.setState).toHaveBeenCalledWith({ status: "idle" });
    expect(harness.loadBusinessLedgerReportSnapshot).not.toHaveBeenCalled();
  });

  it("loads business reports through the web hook path", async () => {
    const snapshot = { kind: "web-snapshot" };
    const harness = await loadWebHarness({
      hasRange: true,
      loadResult: snapshot,
    });

    const state = harness.useBusinessLedgerReports({
      reloadToken: "steady",
      selectedPeriod: createPeriod(),
      selectedScope: "business",
    });

    expect(state).toEqual({ status: "idle" });
    expect(harness.setState).toHaveBeenNthCalledWith(1, { status: "loading" });
    expect(harness.createWritableStorageDatabaseFromWeb).toHaveBeenCalledWith("web-db");
    expect(harness.loadBusinessLedgerReportSnapshot).toHaveBeenCalledWith({
      locale: "en",
      period: createPeriod(),
      sdk: expect.any(Object),
    });

    await Promise.resolve();
    expect(harness.setState).toHaveBeenLastCalledWith({
      snapshot,
      status: "ready",
    });
  });
});

async function loadNativeHarness(input: {
  hasRange: boolean;
  loadResult: unknown;
  selectedScope: "business" | "personal";
}) {
  const setState = vi.fn();
  const createWritableStorageDatabase = vi.fn(() => "native-writable-db");
  const loadBusinessLedgerReportSnapshot = vi
    .fn()
    .mockResolvedValue(input.loadResult);

  vi.doMock("react", async () => {
    const actual = await vi.importActual("react");
    return {
      ...actual,
      useEffect: (effect: () => void | (() => void)) => {
        effect();
      },
      useState: (initializer: unknown) => [
        typeof initializer === "function"
          ? (initializer as () => unknown)()
          : initializer,
        setState,
      ],
    };
  });
  vi.doMock("@ledgerly/sdk", () => ({
    LedgerlySDK: vi.fn().mockImplementation(() => ({ kind: "sdk" })),
  }));
  vi.doMock("expo-sqlite", () => ({
    useSQLiteContext: () => "native-db",
  }));
  vi.doMock("../src/features/app-shell/provider", () => ({
    useAppShell: () => ({ resolvedLocale: "en", storageRevision: 1 }),
  }));
  vi.doMock("../src/storage/storage-adapter", () => ({
    createWritableStorageDatabase,
  }));
  vi.doMock("../src/features/ledger/business-ledger-reports", () => ({
    createBusinessLedgerReportsErrorMessage: vi.fn(() => "Business reports failed to load."),
    createIdleBusinessLedgerReportsState: vi.fn(() => ({ status: "idle" })),
    hasLedgerPeriodRange: vi.fn(() => input.hasRange),
    loadBusinessLedgerReportSnapshot,
  }));

  const mod = await import("../src/features/ledger/use-business-ledger-reports.native");
  return {
    createWritableStorageDatabase,
    loadBusinessLedgerReportSnapshot,
    setState,
    useBusinessLedgerReports: mod.useBusinessLedgerReports,
  };
}

async function loadWebHarness(input: {
  hasRange: boolean;
  loadResult: unknown;
}) {
  const setState = vi.fn();
  const createWritableStorageDatabaseFromWeb = vi.fn(() => "web-writable-db");
  const loadBusinessLedgerReportSnapshot = vi
    .fn()
    .mockResolvedValue(input.loadResult);

  vi.doMock("react", async () => {
    const actual = await vi.importActual("react");
    return {
      ...actual,
      useEffect: (effect: () => void | (() => void)) => {
        effect();
      },
      useState: (initializer: unknown) => [
        typeof initializer === "function"
          ? (initializer as () => unknown)()
          : initializer,
        setState,
      ],
    };
  });
  vi.doMock("@ledgerly/sdk", () => ({
    LedgerlySDK: vi.fn().mockImplementation(() => ({ kind: "sdk" })),
  }));
  vi.doMock("../src/features/app-shell/provider", () => ({
    useAppShell: () => ({ resolvedLocale: "en", storageRevision: 1 }),
  }));
  vi.doMock("../src/storage/provider.web", () => ({
    createWritableStorageDatabaseFromWeb,
    useWebDatabaseContext: () => "web-db",
  }));
  vi.doMock("../src/features/ledger/business-ledger-reports", () => ({
    createBusinessLedgerReportsErrorMessage: vi.fn(() => "Business reports failed to load."),
    createIdleBusinessLedgerReportsState: vi.fn(() => ({ status: "idle" })),
    hasLedgerPeriodRange: vi.fn(() => input.hasRange),
    loadBusinessLedgerReportSnapshot,
  }));

  const mod = await import("../src/features/ledger/use-business-ledger-reports.web");
  return {
    createWritableStorageDatabaseFromWeb,
    loadBusinessLedgerReportSnapshot,
    setState,
    useBusinessLedgerReports: mod.useBusinessLedgerReports,
  };
}

function createPeriod() {
  return {
    endDate: "2026-04-30",
    id: "2026:m04",
    label: "Apr 2026",
    segmentId: "m04" as const,
    startDate: "2026-04-01",
    summary: "Apr 01, 2026 - Apr 30, 2026",
    year: 2026,
  };
}
