import { describe, expect, it } from "vitest";

import {
  resolveEntryHref,
  resolveProtectedRouteRedirect,
} from "../src/features/app-shell/storage-entry";

describe("storage entry routing", () => {
  it("keeps the launch screen up while hydration or storage checking is incomplete", () => {
    expect(
      resolveEntryHref({
        isHydrated: false,
        session: true,
        storageGateState: { kind: "checking" },
      }),
    ).toBeNull();
    expect(
      resolveEntryHref({
        isHydrated: true,
        session: true,
        storageGateState: { kind: "checking" },
      }),
    ).toBeNull();
  });

  it("routes unauthenticated sessions to login", () => {
    expect(
      resolveEntryHref({
        isHydrated: true,
        session: false,
        storageGateState: { kind: "ready" },
      }),
    ).toBe("/login");
    expect(
      resolveProtectedRouteRedirect({
        isHydrated: true,
        session: false,
        storageGateState: { kind: "ready" },
      }),
    ).toBe("/login");
  });

  it("routes authenticated users to storage setup until storage is ready", () => {
    expect(
      resolveEntryHref({
        isHydrated: true,
        session: true,
        storageGateState: { kind: "missing" },
      }),
    ).toBe("/storage-setup");
    expect(
      resolveEntryHref({
        isHydrated: true,
        session: true,
        storageGateState: {
          kind: "recovery_required",
          message: "The active package could not be opened.",
        },
      }),
    ).toBe("/storage-setup");
    expect(
      resolveProtectedRouteRedirect({
        isHydrated: true,
        session: true,
        storageGateState: { kind: "missing" },
      }),
    ).toBe("/storage-setup");
  });

  it("allows authenticated users into tabs once storage is ready", () => {
    expect(
      resolveEntryHref({
        isHydrated: true,
        session: true,
        storageGateState: { kind: "ready" },
      }),
    ).toBe("/(tabs)");
    expect(
      resolveProtectedRouteRedirect({
        isHydrated: true,
        session: true,
        storageGateState: { kind: "ready" },
      }),
    ).toBeNull();
  });
});
