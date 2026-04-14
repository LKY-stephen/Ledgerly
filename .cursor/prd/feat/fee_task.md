# feat：1040 + Schedule C + Schedule SE 税务数据解析逻辑梳理（fee_task）

| 字段 | 值 |
|------|-----|
| **feat id** | `fee_task` |
| **类型** | 技术调研 / 文档输出（**不涉及代码实现**） |
| **依赖** | 已有 `form-schedule-c` 模型与 `form-1099-nec` 模型可作为参考 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线：`.cursor/rules/creator-cfo-always.mdc`。结构参考 `.cursor/prd/TEMPLATE.md`。

## 平台描述

为多平台收入创作者提供统一财务控制台，把收入归集、开票、成本记录、税务预估、现金流判断和 stablecoin 收款整合到一起。本 feat 的目标是**产出一份技术分析文档**，梳理 IRS Form 1040、Schedule C、Schedule SE 三张表的数据解析逻辑与流程设计，为后续代码实现提供蓝图。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`（本 feat 仅产出文档，不改代码或契约）
- **须同步的工件**：无
- **说明**：纯文档交付，不涉及存储、schema 或代码变更。

## 需求描述

### 已有参考基础

仓库中已建立的税表处理模式（Schedule C 与 1099-NEC）可作为分析起点：

| 组件 | 位置 | 作用 |
|------|------|------|
| IRS PDF 布局 JSON | `schedule-c-layout.2025.json` / `form-1099-nec-layout.2025.json` | 从 IRS 官方 PDF 提取的页面元素坐标 |
| Slot 模型 | `form-schedule-c-model.ts` / `form-1099-nec-model.ts` | 每个表单字段的 id、类型、引用来源、填充逻辑 |
| 数据快照 | `FormScheduleCDatabaseSnapshot` | 从本地 DB 可自动填充的数据子集 |
| 构建函数 | `buildFormScheduleCSlots(snapshot)` | 根据 DB 快照生成带 `source` 标注的完整 slot 列表 |

### 交付目标 1：梳理 1040 + Schedule C + SE 的数据解析逻辑

以文档形式回答以下问题：

1. **Form 1040 主表**中与自雇创作者相关的关键行有哪些？各行的数据来源是什么（手动输入 / 附表带入 / 计算得出）？
2. **Schedule C**（已有模型）的每一行数据来源分类（database / calculated / manual）梳理——当前模型已覆盖哪些、缺失哪些？
3. **Schedule SE** 的各行字段定义、计算规则、数据来源是什么？
4. 三张表之间的**数据流转关系**：
   - Schedule C Line 31 → 1040 Schedule 1 Line 3（经营净利润）
   - Schedule C Line 31 → Schedule SE Line 2（自雇收入基数）
   - Schedule SE Line 12 → 1040 Schedule 2 Line 4（自雇税）
   - Schedule SE Line 13 → 1040 Schedule 1 Line 15（SE 税可扣除部分）
   - 1099-NEC Box 1 → Schedule C Line 1（非雇员报酬进总收入）

### 交付目标 2：数据解析的完整流程设计

以文档形式描述端到端管线，回答原始问题——"是否需要从官网先获取税收模板相关字段，然后再解析用户上传的税收票据，最后根据票据来解析"：

```
Phase 1  模板获取
         ↓  IRS 官网获取 PDF → 提取布局字段 → layout JSON
Phase 2  字段注册
         ↓  对照 IRS instructions → 定义 slot（字段 id、类型、计算规则）
Phase 3  用户票据解析
         ↓  用户上传 PDF/图片 → 识别文档类型 → OCR/结构化提取 → 匹配 slot
Phase 4  交叉验证
         ↓  跨表数据流校验 → 自动计算行 → 标记缺失与不一致
```

需要在文档中阐明：
- 每个 Phase 的**输入、输出、工具/技术选项**
- Phase 之间的**依赖关系与执行顺序**
- 当前仓库已完成了哪些 Phase 的哪些部分（Schedule C 的 Phase 1–2 基本完成）

### 交付目标 3：用户上传票据的 1040 规范识别方案

以文档形式回答——"如何识别用户上传的票据是否符合 1040 规范"：

1. **文档类型识别**：如何判断上传的文件是 1040 / Schedule C / Schedule SE / 1099-NEC / 其他？
   - 方案对比：PDF 元数据标题匹配 vs 布局指纹比对 vs OCR 关键文本检测
   - 各方案的优缺点与适用场景
2. **税年识别**：同一表单不同年份布局可能变化，如何做年份路由？
3. **合规校验规则**：提取完数据后，如何判断是否满足 1040 规范的必填字段要求？缺失项如何提示用户？

### 范围边界

- **包含**：1040 主表（自雇相关行）、Schedule C、Schedule SE 三张表的字段定义、计算规则、跨表映射、解析流程设计、票据识别方案。
- **不包含**：W-2 处理、Schedule A / D / E 等其他附表、实际 OCR 引擎选型与集成代码、后端 API 设计、任何代码实现与 schema 变更。

## 交付物清单

| # | 交付物 | 形式 | 位置建议 |
|---|--------|------|----------|
| 1 | 1040 + Schedule C + Schedule SE 数据解析逻辑文档 | Markdown | `docs/tax-parsing-logic.md` |
| 2 | 三表跨字段映射表 | Markdown 表格（含在上述文档中） | 同上 |
| 3 | 端到端解析流程设计（Phase 1–4） | 流程图 + 文字描述 | 同上 |
| 4 | 用户票据 1040 规范识别方案 | 方案对比 + 推荐 | 同上 |

## 验收标准（可勾选、可举证）

- [ ] **文档存在**：`docs/tax-parsing-logic.md`（或等价路径）已创建，内容完整。
- [ ] **1040 关键行**：文档列出了 1040 主表中与自雇创作者相关的所有关键行及其数据来源。
- [ ] **Schedule SE 字段**：文档列出了 Schedule SE 全部行的字段定义与计算规则。
- [ ] **跨表映射**：文档包含 Schedule C ↔ 1040、Schedule C ↔ Schedule SE、Schedule SE ↔ 1040 的完整字段映射表，与 IRS 2025 instructions 一致。
- [ ] **流程管线**：文档描述了从 IRS 模板获取到用户票据解析的完整 Phase 1–4 管线，每个 Phase 标注了输入/输出/技术选项。
- [ ] **已有覆盖标注**：文档标明了当前仓库 Schedule C 和 1099-NEC 模型已完成的部分，以及 1040 和 SE 待实现的增量。
- [ ] **识别方案**：文档包含至少两种文档类型识别方案的对比，列出优缺点，并给出推荐方案。
- [ ] **无代码变更**：本 feat 不产生任何代码、schema 或契约变更。

## 参考 Skill

- 无（本 feat 为纯文档输出）

## 外部参考（非真源）

以下项目仅用于产品交互、业务流程、计算口径与异常处理的启发式参考，不作为本仓库契约、数据结构或实现真源：

- `GnuCash`：<https://github.com/gnucash/gnucash>
  - 重点参考：复式记账、金额汇总、余额计算、会计口径一致性
- `Akaunting`：<https://github.com/akaunting/akaunting>
  - 重点参考：中小企业记账产品的信息架构、表单流程、报表与业务模块组织

使用边界：
- 不直接迁移其数据库结构、包结构、后端实现
- 本仓库仍以 `docs/contracts/`、`packages/storage/src/contracts.ts`、`packages/schemas/src/index.ts` 为真源
- 若外部参考与当前 PRD 冲突，以当前 PRD 与本仓库契约为准

## 公用约定（勿在本文件重复展开）

> 角色三角、工作流与交付前 `pnpm` 命令见 `.cursor/prd/agent-dev-guide-summary.md`；需求闭环后按该摘要在 `.cursor/context/` **新建** `{semver}_context.md` 并按需同步 `main.md`。

### 本 feat 补充交付说明

- 本 feat 为**纯文档交付**，不触发 `pnpm lint / typecheck / test / build` 等代码门禁。
- 产出的文档将作为后续代码实现 feat 的输入蓝图。
- 文档内容需引用 IRS 官方 instructions 作为数据来源依据（如 `i1040`、`i1040sc`、`i1040sse`）。
- **Harness** 验收须确认文档与 IRS 2025 版本表单的一致性。
