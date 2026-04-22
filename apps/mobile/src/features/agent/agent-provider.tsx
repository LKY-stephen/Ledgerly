import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";
import { LedgerlySDK } from "@ledgerly/sdk";
import type { WritableStorageDatabase } from "@ledgerly/storage";
import type { AgentConfig, AgentMessage } from "@ledgerly/agent";
import type { AiProvider } from "../app-shell/types";
import { useAppShell } from "../app-shell/provider";
import { useAgent } from "./use-agent";

interface AgentContextValue {
  messages: AgentMessage[];
  isProcessing: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<AgentMessage | undefined>;
  clearChat: () => void;
  refreshContext: () => Promise<void>;
  isConfigured: boolean;
  isReady: boolean;
}

const AgentContext = createContext<AgentContextValue | null>(null);

interface AgentProviderProps extends PropsWithChildren {
  database: WritableStorageDatabase | null;
}

export function AgentProvider({ children, database }: AgentProviderProps) {
  const {
    openAiApiKey,
    geminiApiKey,
    inferApiKey,
    inferBaseUrl,
    inferModel,
    resolvedLocale,
  } = useAppShell();

  const sdk = useMemo(() => {
    if (!database) return null;
    return new LedgerlySDK(database);
  }, [database]);

  const agentConfig: AgentConfig | null = useMemo(() => {
    const candidates: Array<{
      provider: AiProvider;
      apiKey: string;
      baseUrl?: string;
      model?: string;
    }> = [
      {
        provider: "openai",
        apiKey: openAiApiKey,
        baseUrl:
          (process.env.EXPO_PUBLIC_OPENAI_BASE_URL ?? "").trim().replace(/\/+$/g, "") || undefined,
        model: (process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "").trim() || undefined,
      },
      {
        provider: "infer",
        apiKey: inferApiKey,
        baseUrl: inferBaseUrl || undefined,
        model: inferModel || undefined,
      },
      {
        provider: "gemini",
        apiKey: geminiApiKey,
        baseUrl:
          (process.env.EXPO_PUBLIC_GEMINI_BASE_URL ?? "").trim().replace(/\/+$/g, "") || undefined,
        model: (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "").trim() || undefined,
      },
    ];

    const match = candidates.find((c) => c.apiKey);
    if (!match) return null;

    return {
      provider: match.provider,
      apiKey: match.apiKey,
      baseUrl: match.baseUrl,
      model: match.model,
      locale: resolvedLocale === "zh-CN" ? "zh-CN" : "en",
    };
  }, [
    openAiApiKey,
    inferApiKey,
    inferBaseUrl,
    inferModel,
    geminiApiKey,
    resolvedLocale,
  ]);

  const agent = useAgent(agentConfig, sdk);

  useEffect(() => {
    if (sdk && agentConfig) {
      void sdk.ensureDefaultEntity().then(() => agent.initSession());
    }
  }, [sdk, agentConfig, agent.initSession]);

  const contextValue: AgentContextValue = useMemo(
    () => ({
      messages: agent.messages,
      isProcessing: agent.isProcessing,
      error: agent.error,
      sendMessage: agent.sendMessage,
      clearChat: agent.clearChat,
      refreshContext: agent.refreshContext,
      isConfigured: !!agentConfig,
      isReady: !!sdk && !!agentConfig,
    }),
    [agent.messages, agent.isProcessing, agent.error, agent.sendMessage, agent.clearChat, agent.refreshContext, sdk, agentConfig],
  );

  return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
}

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used inside AgentProvider.");
  }
  return context;
}
