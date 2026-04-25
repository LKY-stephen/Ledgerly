import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AgentMessage } from "@ledgerly/agent";
import { useAppShell } from "../app-shell/provider";
import { withAlpha } from "../app-shell/theme-utils";

interface AgentChatProps {
  messages: AgentMessage[];
  isProcessing: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onClear: () => void;
  onAttachFile?: () => void;
  locale: "en" | "zh-CN";
}

function formatToolCallSummary(msg: AgentMessage, locale: string): string | null {
  if (!msg.toolCalls?.length) return null;

  const names = msg.toolCalls.map((tc) => tc.name.replace(/_/g, " "));
  const prefix = locale === "zh-CN" ? "调用工具: " : "Using: ";
  return prefix + names.join(", ");
}

function ChatBubble({
  message,
  palette,
  locale,
}: {
  message: AgentMessage;
  palette: ReturnType<typeof useAppShell>["palette"];
  locale: string;
}) {
  if (message.role === "tool") return null;

  const isUser = message.role === "user";
  const toolSummary = !isUser ? formatToolCallSummary(message, locale) : null;
  const hasContent = !!message.content?.trim();

  if (!hasContent && !toolSummary) return null;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: palette.accent }]
            : [styles.bubbleAssistant, { backgroundColor: palette.paper }],
        ]}
      >
        {toolSummary ? (
          <Text style={[styles.toolLabel, { color: palette.inkMuted }]}>{toolSummary}</Text>
        ) : null}
        {hasContent ? (
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#FFFFFF" : palette.ink },
            ]}
            selectable
          >
            {message.content}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function AgentChat({
  messages,
  isProcessing,
  error,
  onSend,
  onClear,
  onAttachFile,
  locale,
}: AgentChatProps) {
  const { palette } = useAppShell();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || (m.role === "assistant" && (m.content?.trim() || m.toolCalls?.length)),
  );

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [visibleMessages.length, isProcessing]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isProcessing) return;
    setInput("");
    onSend(text);
    if (Platform.OS !== "web") Keyboard.dismiss();
  };

  const placeholder = locale === "zh-CN" ? "输入消息管理你的账本..." : "Ask about your ledger...";
  const emptyTitle = locale === "zh-CN" ? "Ledgerly 助手" : "Ledgerly Assistant";
  const emptyHint =
    locale === "zh-CN"
      ? "试试: \"本月收入多少？\" 或 \"新增一笔支出\""
      : 'Try: "What\'s my income this month?" or "Add a new expense"';

  return (
    <View style={[styles.container, { backgroundColor: palette.shell }]}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles-outline" size={20} color={palette.accent} />
          <Text style={[styles.headerTitle, { color: palette.ink }]}>
            {locale === "zh-CN" ? "AI 助手" : "AI Assistant"}
          </Text>
        </View>
        {visibleMessages.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={palette.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
      >
        {visibleMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="sparkles-outline"
              size={36}
              color={palette.inkMuted}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>{emptyTitle}</Text>
            <Text style={[styles.emptyHint, { color: palette.inkMuted }]}>{emptyHint}</Text>
          </View>
        ) : (
          visibleMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} palette={palette} locale={locale} />
          ))
        )}

        {isProcessing ? (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: palette.paper }]}>
              <ActivityIndicator size="small" color={palette.inkMuted} />
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: withAlpha(palette.destructive, 0.1) }]}>
              <Text style={[styles.bubbleText, { color: palette.destructive }]}>{error}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.inputRow, { borderTopColor: palette.border, backgroundColor: palette.shell }]}>
        {onAttachFile ? (
          <Pressable
            onPress={onAttachFile}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.attachButton,
              {
                backgroundColor: pressed ? withAlpha(palette.accent, 0.15) : "transparent",
                opacity: isProcessing ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="attach" size={22} color={palette.accent} />
          </Pressable>
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: palette.paper,
              color: palette.ink,
              borderColor: palette.border,
            },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={palette.inkMuted}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          blurOnSubmit={Platform.OS !== "web"}
          editable={!isProcessing}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || isProcessing}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                !input.trim() || isProcessing
                  ? palette.paperMuted
                  : pressed
                    ? withAlpha(palette.accent, 0.8)
                    : palette.accent,
            },
          ]}
        >
          <Ionicons
            name="send"
            size={18}
            color={!input.trim() || isProcessing ? palette.inkMuted : "#FFFFFF"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowAssistant: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  toolLabel: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
