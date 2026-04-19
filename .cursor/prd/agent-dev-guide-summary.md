# 《Ai Agent 友好型 开发指南》摘要（供 Agent 读取）

本文件是仓库内 Agent 工作流的**可检索摘要**，与根目录 `AGENTS.md`、`.cursor/context/` 下**当前快照**（`main.md`）及**按版本归档**的 `{version}_context.md` 一致处为准。完整论述以项目提供的 PDF（若存在）为准。

## 愿景

人负责**设计与契约**，AI 负责**在约束内实现**，**自动化检查**（lint、test、contract、build）收敛正确性，避免仅靠单次人工 review。

## 角色三角（与本仓库对齐）

| 角色 | 职责要点 |
|------|----------|
| **Harness** | PRD 拆成可验收项与证据字段；执行代码 review；审查结论（通过/有条件/打回）；无真实证据尤其无移动端真实点击验收时不标已通过；必要时可向用户索要测试材料文件路径；负责上下文爆炸时的结构化 handoff 与重开 agent。详见 `.cursor/agent/harness.md`。 |
| **Testor** | 验收条件、场景表、冒烟路径、测试报告与缺陷；移动端交互需求必须按 PRD 与测试用例在真实设备或模拟器逐项点击验收；缺少真实样本时可向用户索要测试材料文件路径。详见 `.cursor/agent/testor.md`。 |
| **Dev** | 契约优先、小步可验证闭环、不自封「完成」。详见 `.cursor/agent/dev.md`。 |

执行顺序与门禁：`.cursor/rules/work_flow.md`。

- 多 agent 接力或上下文过长时，先压缩成结构化 handoff，再继续派工；不要把整段长对话原样传递。

## 本仓库技术约束（当前阶段）

- **移动端**：Expo + React Native + Expo Router。
- **无独立后端**（除非某 PRD 明确添加）；数据本地优先：SQLite + 文件仓。
- **契约真源**：`docs/contracts/`、`packages/storage/src/contracts.ts`、`packages/schemas/src/index.ts`。
- **存储变更**：schema-first；契约变更必须同步文档与至少一处自动化测试。

## 交付前检查（与 AGENTS.md 一致）

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
pnpm smoke
```

- **`pnpm smoke`**：仓库根脚本，经 Turbo 在 `build` 之后执行各包 `smoke`（移动端当前等同跑 vitest）；与 **手工** 设备冒烟清单 **`tests/smoke/README.md`** 互补。

## Skill 选用（避免冲突）

- **默认（移动端）**：`.cursor/skills/project/expo`；按需 `create-expo-stack` / `ignite`，避免一次 `@` 过多 skill。
- **勿默认**启用 Next.js、FastAPI、Vinta 全栈等 skill，除非 **PRD 已明确** 该阶段；否则易与「无后端、本地优先」打架。
- **`cursorrules-collection`**：仅在为具体框架查片段时使用，勿当成本仓库默认全量规则。

## PRD 与上下文

- 新需求建议使用 `.cursor/prd/TEMPLATE.md`，并填写 **存储与契约影响**。
- 需求闭环后在 `.cursor/context/` **新建**版本化上下文文件，命名 `{semver}_context.md`（例如 `0.4.0_context.md`；次版本递增如 `0.3.0` → `0.4.0`），写入本版本的 `updated_at`、scope、决策与结构增量。**勿删、勿改写**已有 `*_context.md`。若仓库仍以 `main.md` 为**当前**真源，可同步更新其顶部版本号、日期与一行摘要，或注明「详见 `{semver}_context.md`」——以 `main.md` 内维护约定为准。

## Feat PRD 公用约定（单点引用）

各 `.cursor/prd/feat/*.md` **不必重复**写长段交付门禁、三角角色说明或 `{version}_context.md` / `main.md` 维护细则；在文档中保留 **一行引用**即可：

> **公用约定**：以本文 `.cursor/prd/agent-dev-guide-summary.md` 为准（愿景、角色与 `work_flow`、技术约束、交付前 `pnpm` 命令、PRD/上下文与版本化 `*_context.md`）。Cursor **始终应用**基线：`.cursor/rules/ledgerly-always.mdc`。结构参考 `.cursor/prd/TEMPLATE.md`。若仓库内有《Ai Agent 友好型 开发指南》PDF，可作人工补充，**勿假设** Agent 已完整读取 PDF。

feat 内只写**本需求独有**的内容：平台/场景一句话（可指向 README）、存储与契约影响、需求与验收、参考 Skill、以及必要的**额外**交付说明（若有）。
