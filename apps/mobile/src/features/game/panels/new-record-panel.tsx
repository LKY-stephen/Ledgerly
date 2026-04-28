import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAppShell } from "../../app-shell/provider";
import { getButtonColors } from "../../app-shell/theme-utils";
import { AgentChat } from "../../agent/agent-chat";
import { useAgentContext } from "../../agent/agent-provider";
import { pickDocumentUploadCandidates } from "../../ledger/ledger-runtime";
import {
  parseFileWithOpenAiFromBlob,
  type ParseResult,
} from "../../ledger/remote-parse";
import { getReceiptParseRecords } from "@ledgerly/schemas";

export function NewRecordPanel() {
  const router = useRouter();
  const { palette, resolvedLocale } = useAppShell();
  const agent = useAgentContext();
  const primaryButton = getButtonColors(palette, "primary");
  const locale = resolvedLocale === "zh-CN" ? "zh-CN" : "en";

  const handleAttachFile = async () => {
    try {
      const candidates = await pickDocumentUploadCandidates();
      if (candidates.length === 0) return;

      const file = candidates[0];
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const result: ParseResult = await parseFileWithOpenAiFromBlob({
        fileName: file.originalFileName,
        blob,
        mimeType: file.mimeType,
      });

      if (result.error || !result.rawJson) {
        await agent.sendMessage(
          `[Uploaded: ${file.originalFileName}]\nParse error: ${result.error ?? "Failed to parse file."}`,
        );
        return;
      }

      const records = getReceiptParseRecords(result.rawJson);
      const lines: string[] = [`[Uploaded: ${file.originalFileName}]`, "Parsed receipt data:"];

      for (const rec of records) {
        const f = rec.fields;
        if (f.amountCents != null) lines.push(`- Amount: $${(Math.abs(f.amountCents) / 100).toFixed(2)}`);
        if (f.target) lines.push(`- Vendor/Payee: ${f.target}`);
        if (f.source) lines.push(`- Payer/Source: ${f.source}`);
        if (f.date) lines.push(`- Date: ${f.date}`);
        if (f.description) lines.push(`- Description: ${f.description}`);
        if (records.length > 1) lines.push("---");
      }

      lines.push("", "Please create this record.");
      await agent.sendMessage(lines.join("\n"));
      await agent.refreshContext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed";
      await agent.sendMessage(`File upload error: ${msg}`);
    }
  };

  const handleUploadNav = () => {
    router.push("/ledger/upload" as never);
  };

  return (
    <View style={styles.root}>
      <View style={styles.actions}>
        <Pressable
          onPress={handleUploadNav}
          style={[
            styles.actionBtn,
            {
              backgroundColor: primaryButton.background,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.actionBtnText, { color: primaryButton.text }]}>
            {locale === "zh-CN" ? "上传文件" : "Upload File"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.chatArea}>
        <AgentChat
          messages={agent.messages}
          isProcessing={agent.isProcessing}
          error={agent.error}
          onSend={agent.sendMessage}
          onClear={agent.clearChat}
          onAttachFile={handleAttachFile}
          locale={locale}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chatArea: {
    flex: 1,
  },
});
