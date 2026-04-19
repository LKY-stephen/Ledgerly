import { afterEach, describe, expect, it, vi } from "vitest";

const asyncStorageState = vi.hoisted(() => {
  const values = new Map<string, string>();
  let pendingWrites: Array<() => void> = [];
  let pauseWrites = false;

  return {
    clear() {
      values.clear();
      pendingWrites = [];
      pauseWrites = false;
    },
    flushWrites() {
      const writes = pendingWrites;
      pendingWrites = [];
      pauseWrites = false;
      for (const apply of writes) {
        apply();
      }
    },
    pauseWrites() {
      pauseWrites = true;
    },
    methods: {
      getItem: vi.fn(async (key: string) => values.get(key) ?? null),
      multiGet: vi.fn(async (keys: readonly string[]) => keys.map((key) => [key, values.get(key) ?? null])),
      multiSet: vi.fn(async (entries: readonly (readonly [string, string])[]) => {
        for (const [key, value] of entries) {
          values.set(key, value);
        }
      }),
      removeItem: vi.fn((key: string) => {
        if (!pauseWrites) {
          values.delete(key);
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          pendingWrites.push(() => {
            values.delete(key);
            resolve();
          });
        });
      }),
      setItem: vi.fn((key: string, value: string) => {
        if (!pauseWrites) {
          values.set(key, value);
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          pendingWrites.push(() => {
            values.set(key, value);
            resolve();
          });
        });
      }),
    },
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageState.methods,
}));

afterEach(() => {
  asyncStorageState.clear();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("app-shell storage runtime overrides", () => {
  it("defaults the AI provider to infer when nothing is persisted", async () => {
    const storage = await import("../src/features/app-shell/storage");

    await expect(storage.loadPersistedAiProvider()).resolves.toBe("infer");
  });

  it("returns the latest OpenAI API key before the async storage write finishes", async () => {
    const storage = await import("../src/features/app-shell/storage");

    asyncStorageState.pauseWrites();

    const persistPromise = storage.persistOpenAiApiKey("sk-live");

    await expect(storage.loadPersistedOpenAiApiKey()).resolves.toBe("sk-live");

    asyncStorageState.flushWrites();
    await persistPromise;
  });

  it("returns the latest Gemini API key before the async storage write finishes", async () => {
    const storage = await import("../src/features/app-shell/storage");

    asyncStorageState.pauseWrites();

    const persistPromise = storage.persistGeminiApiKey("AIza-live");

    await expect(storage.loadPersistedGeminiApiKey()).resolves.toBe("AIza-live");

    asyncStorageState.flushWrites();
    await persistPromise;
  });

  it("returns the latest AI provider before the async storage write finishes", async () => {
    const storage = await import("../src/features/app-shell/storage");

    asyncStorageState.pauseWrites();

    const persistPromise = storage.persistAiProvider("gemini");

    await expect(storage.loadPersistedAiProvider()).resolves.toBe("gemini");

    asyncStorageState.flushWrites();
    await persistPromise;
  });
});
