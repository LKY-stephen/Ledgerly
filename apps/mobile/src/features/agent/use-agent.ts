import { useCallback, useRef, useState } from "react";
import type { LedgerlySDK } from "@ledgerly/sdk";
import { AgentSession, type AgentMessage, type AgentConfig } from "@ledgerly/agent";

export function useAgent(config: AgentConfig | null, sdk: LedgerlySDK | null) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<AgentSession | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const initSession = useCallback(async () => {
    if (!sdk || !config) return;

    unsubscribeRef.current?.();
    const session = new AgentSession(sdk, config);
    unsubscribeRef.current = session.subscribe((nextMessages) => {
      setMessages(nextMessages);
    });
    await session.refreshContext();
    sessionRef.current = session;
  }, [sdk, config]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionRef.current || !text.trim() || isProcessing) return;

      setError(null);
      setIsProcessing(true);

      try {
        const response = await sessionRef.current.sendMessage(text.trim());
        return response;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to process message";
        setError(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing],
  );

  const clearChat = useCallback(() => {
    sessionRef.current?.clearHistory();
    setError(null);
  }, []);

  const refreshContext = useCallback(async () => {
    await sessionRef.current?.refreshContext();
  }, []);

  return {
    messages,
    isProcessing,
    error,
    sendMessage,
    clearChat,
    initSession,
    refreshContext,
  };
}
