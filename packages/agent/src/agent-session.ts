import type { LedgerlySDK, ContextSnapshot } from "@ledgerly/sdk";
import type {
  AgentConfig,
  AgentMessage,
  ToolCallRequest,
  ToolCallResult,
} from "./types";
import { ledgerTools, executeTool } from "./tools";

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function buildSystemPrompt(snapshot: ContextSnapshot | null, locale?: string): string {
  const lang = locale === "zh-CN" ? "zh-CN" : "en";
  const base =
    lang === "zh-CN"
      ? [
          "你是 Ledgerly 账本助手，帮助用户管理个人/商业财务记录。",
          "你可以查看、新增、修改、删除账本记录，查看月度数据和趋势。",
          "金额单位为美分(cents)，展示时请转换为美元格式。",
          "日期格式为 YYYY-MM-DD。",
          "回答时简洁友好，必要时调用工具获取数据后再回答。",
          "当用户只是想快速记账而没有说明付款方或收款方时，可以使用工具的默认 source/target 占位值完成记账，不要因此卡住。",
          "如果用户要删除记录，先确认再操作。",
          `今天是 ${new Date().toISOString().slice(0, 10)}。`,
        ]
      : [
          "You are the Ledgerly assistant, helping users manage their personal/business financial records.",
          "You can view, create, update, and delete ledger records, view monthly metrics and trends.",
          "Amounts are in cents — display them as dollars (e.g. 1500 cents = $15.00).",
          "Dates are in YYYY-MM-DD format.",
          "Be concise and helpful. Call tools to get data before answering when needed.",
          "If the user wants a quick entry and does not specify payer/payee details, you may rely on the tool defaults for source/target instead of blocking the entry.",
          "If the user asks to delete a record, confirm before proceeding.",
          `Today is ${new Date().toISOString().slice(0, 10)}.`,
        ];

  if (snapshot) {
    const ctx =
      lang === "zh-CN"
        ? [
            "",
            "## 当前账本状态",
            `- 账本主体: ${snapshot.entityName}`,
            `- 总记录数: ${snapshot.totalRecords}`,
            `- 本月收入: ${formatAmount(snapshot.monthlyMetrics.incomeCents)}`,
            `- 本月支出: ${formatAmount(snapshot.monthlyMetrics.outflowCents)}`,
            `- 本月净利润: ${formatAmount(snapshot.monthlyMetrics.netCents)}`,
            `- 交易对手数: ${snapshot.counterpartyCount}`,
          ]
        : [
            "",
            "## Current Ledger State",
            `- Entity: ${snapshot.entityName}`,
            `- Total records: ${snapshot.totalRecords}`,
            `- This month's income: ${formatAmount(snapshot.monthlyMetrics.incomeCents)}`,
            `- This month's expenses: ${formatAmount(snapshot.monthlyMetrics.outflowCents)}`,
            `- This month's net: ${formatAmount(snapshot.monthlyMetrics.netCents)}`,
            `- Counterparties: ${snapshot.counterpartyCount}`,
          ];

    if (snapshot.recentRecords.length > 0) {
      ctx.push(
        "",
        lang === "zh-CN" ? "## 最近交易记录" : "## Recent Records",
      );
      for (const r of snapshot.recentRecords.slice(0, 5)) {
        ctx.push(
          `- [${r.occurredOn}] ${r.description}: ${formatAmount(r.amountCents)} (${r.recordKind})`,
        );
      }
    }

    base.push(...ctx);
  }

  const capabilities =
    lang === "zh-CN"
      ? [
          "",
          "## 报表生成",
          "你可以生成三种财务报表：",
          "- get_profit_and_loss: 损益表（收入 vs 支出，按交易对手分组）",
          "- get_balance_sheet: 资产负债表（期初余额 + 本期变动 = 期末余额）",
          "- get_general_ledger: 总账（所有借贷分录明细）",
          "生成报表前先确认用户需要的日期范围。",
          "",
          "## 税务辅助",
          "使用 get_tax_summary 获取指定年份的 Schedule C / Schedule SE 税务数据。",
          "",
          "## 含税记录",
          "创建费用记录时，根据描述分配对应税务行号：",
          "- line8: 广告, line10: 佣金, line11: 外包劳务",
          "- line15: 保险, line17: 法律/专业服务, line18: 办公用品",
          "- line20a: 租赁(车辆设备), line20b: 租赁(房产), line21: 维修",
          "- line22: 物资, line23: 税费/许可证, line24a: 差旅, line25: 水电费",
          "- line27a: 其他费用（默认）",
          "收入记录使用 line1（营业收入）。",
          "",
          "## 文件上传",
          "当用户上传收据或文件时，你会收到解析后的数据。",
          "审查提取的信息，与用户确认，然后使用正确的税务分类创建记录。",
        ]
      : [
          "",
          "## Financial Reports",
          "You can generate three types of financial reports:",
          "- get_profit_and_loss: Revenue vs expenses with counterparty breakdown",
          "- get_balance_sheet: Opening balance + period movements = closing balance",
          "- get_general_ledger: All posting entries with debit/credit details",
          "Always ask the user for a date range before generating reports.",
          "",
          "## Tax Helper",
          "Use get_tax_summary to provide Schedule C and Schedule SE data for a given tax year.",
          "",
          "## Tax-Ready Records",
          "When creating expense records, assign appropriate tax line codes based on the description:",
          "- line8: Advertising, line10: Commissions, line11: Contract labor",
          "- line15: Insurance, line17: Legal/professional, line18: Office expense",
          "- line20a: Rent (vehicles/equipment), line20b: Rent (property), line21: Repairs",
          "- line22: Supplies, line23: Taxes/licenses, line24a: Travel, line25: Utilities",
          "- line27a: Other expenses (default for uncategorized)",
          "Income records use line1 (gross receipts).",
          "",
          "## File Uploads",
          "When the user uploads a receipt or document, you will receive the parsed data.",
          "Review the extracted information, confirm with the user, then create records with appropriate tax categorization.",
        ];

  base.push(...capabilities);

  return base.join("\n");
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: string;
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiChoice {
  message: OpenAiMessage;
  finish_reason: string;
}

interface OpenAiResponse {
  choices: OpenAiChoice[];
}

function buildOpenAiTools() {
  return ledgerTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export class AgentSession {
  private sdk: LedgerlySDK;
  private config: AgentConfig;
  private messages: AgentMessage[] = [];
  private contextSnapshot: ContextSnapshot | null = null;
  private abortController: AbortController | null = null;
  private listeners = new Set<(messages: AgentMessage[]) => void>();

  constructor(sdk: LedgerlySDK, config: AgentConfig) {
    this.sdk = sdk;
    this.config = config;
  }

  getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  subscribe(listener: (messages: AgentMessage[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getMessages());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async refreshContext(): Promise<void> {
    this.contextSnapshot = await this.sdk.getContextSnapshot();
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  async sendMessage(userText: string): Promise<AgentMessage> {
    const userMsg: AgentMessage = {
      id: generateId(),
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.notify();

    return this.processWithModel();
  }

  private async processWithModel(): Promise<AgentMessage> {
    this.abortController = new AbortController();

    const systemPrompt = buildSystemPrompt(this.contextSnapshot, this.config.locale);
    const openAiMessages: OpenAiMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of this.messages) {
      if (msg.role === "user") {
        openAiMessages.push({ role: "user", content: msg.content });
      } else if (msg.role === "assistant") {
        const assistantMsg: OpenAiMessage = {
          role: "assistant",
          content: msg.content || null,
        };
        if (msg.toolCalls?.length) {
          assistantMsg.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          }));
        }
        openAiMessages.push(assistantMsg);
      } else if (msg.role === "tool" && msg.toolResults) {
        for (const tr of msg.toolResults) {
          openAiMessages.push({
            role: "tool",
            content: JSON.stringify(tr.result),
            tool_call_id: tr.id,
          });
        }
      }
    }

    const response = await this.callModel(openAiMessages);
    const choice = response.choices[0];

    if (!choice) {
      const errMsg: AgentMessage = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I could not get a response. Please try again.",
        timestamp: Date.now(),
      };
      this.messages.push(errMsg);
      this.notify();
      return errMsg;
    }

    if (choice.message.tool_calls?.length) {
      const toolCalls: ToolCallRequest[] = choice.message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeParse(tc.function.arguments),
      }));

      const assistantMsg: AgentMessage = {
        id: generateId(),
        role: "assistant",
        content: choice.message.content ?? "",
        toolCalls,
        timestamp: Date.now(),
      };
      this.messages.push(assistantMsg);
      this.notify();

      const toolResults: ToolCallResult[] = [];
      for (const tc of toolCalls) {
        const result = await executeTool(this.sdk, tc.name, tc.arguments);
        toolResults.push({ id: tc.id, name: tc.name, result });
      }

      const toolMsg: AgentMessage = {
        id: generateId(),
        role: "tool",
        content: "",
        toolResults,
        timestamp: Date.now(),
      };
      this.messages.push(toolMsg);
      this.notify();
      await this.refreshContext();

      return this.processWithModel();
    }

    const assistantMsg: AgentMessage = {
      id: generateId(),
      role: "assistant",
      content: choice.message.content ?? "",
      timestamp: Date.now(),
    };
    this.messages.push(assistantMsg);
    this.notify();
    return assistantMsg;
  }

  private async callModel(messages: OpenAiMessage[]): Promise<OpenAiResponse> {
    const { provider, apiKey, baseUrl, model } = this.config;

    let url: string;
    let headers: Record<string, string>;
    let body: Record<string, unknown>;

    if (provider === "gemini") {
      const geminiBase = baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
      url = `${geminiBase}/openai/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: model ?? "gemini-2.5-flash",
        messages,
        tools: buildOpenAiTools(),
      };
    } else if (provider === "infer") {
      url = `${baseUrl ?? "https://api.infer.ai/v1"}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: model ?? "gpt-4o",
        messages,
        tools: buildOpenAiTools(),
      };
    } else {
      url = `${baseUrl ?? "https://api.openai.com/v1"}/chat/completions`;
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      body = {
        model: model ?? "gpt-4o",
        messages,
        tools: buildOpenAiTools(),
      };
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`AI API error ${resp.status}: ${text.slice(0, 200)}`);
    }

    return resp.json() as Promise<OpenAiResponse>;
  }

  clearHistory(): void {
    this.messages = [];
    this.notify();
  }

  restoreMessages(messages: AgentMessage[]): void {
    this.messages = messages;
    this.notify();
  }

  private notify(): void {
    const nextMessages = this.getMessages();
    for (const listener of this.listeners) {
      listener(nextMessages);
    }
  }
}

function safeParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
