import type { LedgerlySDK } from "@ledgerly/sdk";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
}

export interface ToolPropertySchema {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  name: string;
  result: unknown;
  error?: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCallRequest[];
  toolResults?: ToolCallResult[];
  timestamp: number;
}

export type AiProviderKind = "openai" | "gemini" | "infer";

export interface AgentConfig {
  provider: AiProviderKind;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  locale?: "en" | "zh-CN";
}

export interface AgentSessionState {
  messages: AgentMessage[];
  isProcessing: boolean;
  contextSnapshot: string | null;
}

export type ToolExecutor = (
  sdk: LedgerlySDK,
  args: Record<string, unknown>,
) => Promise<unknown>;
