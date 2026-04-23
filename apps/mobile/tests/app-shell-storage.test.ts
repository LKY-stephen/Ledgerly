import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const originalOpenAiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const originalGeminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const originalInferApiKey = process.env.EXPO_PUBLIC_INFER_API_KEY;
const originalInferBaseUrl = process.env.EXPO_PUBLIC_INFER_BASE_URL;
const originalInferModel = process.env.EXPO_PUBLIC_INFER_MODEL;

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

beforeEach(() => {
  restoreEnvValue("EXPO_PUBLIC_OPENAI_API_KEY", originalOpenAiApiKey);
  restoreEnvValue("EXPO_PUBLIC_GEMINI_API_KEY", originalGeminiApiKey);
  restoreEnvValue("EXPO_PUBLIC_INFER_API_KEY", originalInferApiKey);
  restoreEnvValue("EXPO_PUBLIC_INFER_BASE_URL", originalInferBaseUrl);
  restoreEnvValue("EXPO_PUBLIC_INFER_MODEL", originalInferModel);
});

afterEach(() => {
  asyncStorageState.clear();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("app-shell storage runtime overrides", () => {
  it("defaults the AI provider to openai when nothing is persisted", async () => {
    const storage = await import("../src/features/app-shell/storage");

    await expect(storage.loadPersistedAiProvider()).resolves.toBe("openai");
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

  it("keeps env-backed AI keys when hydrating app state with no stored values", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-openai-env";
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "AIza-env";
    process.env.EXPO_PUBLIC_INFER_API_KEY = "sk-infer-env";
    process.env.EXPO_PUBLIC_INFER_BASE_URL = "https://infer.example/v1/";
    process.env.EXPO_PUBLIC_INFER_MODEL = "gpt-env";

    const storage = await import("../src/features/app-shell/storage");
    const state = await storage.loadPersistedAppState();

    expect(state.openAiApiKey).toBe("sk-openai-env");
    expect(state.geminiApiKey).toBe("AIza-env");
    expect(state.inferApiKey).toBe("sk-infer-env");
    expect(state.inferBaseUrl).toBe("https://infer.example/v1");
    expect(state.inferModel).toBe("gpt-env");
  });

  it("prefers stored AI keys over env fallbacks when hydrating app state", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "sk-openai-env";
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = "AIza-env";
    process.env.EXPO_PUBLIC_INFER_API_KEY = "sk-infer-env";
    process.env.EXPO_PUBLIC_INFER_BASE_URL = "https://infer.example/v1";
    process.env.EXPO_PUBLIC_INFER_MODEL = "gpt-env";

    asyncStorageState.methods.setItem("@ledgerly/mobile/openai_api_key", "sk-openai-stored");
    asyncStorageState.methods.setItem("@ledgerly/mobile/gemini_api_key", "AIza-stored");
    asyncStorageState.methods.setItem("@ledgerly/mobile/infer_api_key", "sk-infer-stored");
    asyncStorageState.methods.setItem("@ledgerly/mobile/infer_base_url", "https://stored.example/v1/");
    asyncStorageState.methods.setItem("@ledgerly/mobile/infer_model", "gpt-stored");

    const storage = await import("../src/features/app-shell/storage");
    const state = await storage.loadPersistedAppState();

    expect(state.openAiApiKey).toBe("sk-openai-stored");
    expect(state.geminiApiKey).toBe("AIza-stored");
    expect(state.inferApiKey).toBe("sk-infer-stored");
    expect(state.inferBaseUrl).toBe("https://stored.example/v1");
    expect(state.inferModel).toBe("gpt-stored");
  });
});
