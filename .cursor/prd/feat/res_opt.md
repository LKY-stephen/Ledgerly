# feat: 解析链路拆分为双接口（纯解析 + scheme 映射）

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/ledgerly-always.mdc`。

## 平台描述

本需求将现有解析流程拆分为两个独立接口：
1) **纯解析接口**：只负责从文件中提取原始结构化 JSON；
2) **映射接口**：接收 `scheme` + 原始 JSON，调用 OpenAI 做字段映射，返回映射后的 `scheme` JSON。

目标是降低接口职责耦合，让调试、复用和验收更清晰。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`（本需求聚焦 API/前端数据流，不调整本地存储结构）
- **须同步的工件**：
  - [ ] `packages/storage/src/contracts.ts`（默认无）
  - [ ] `docs/contracts/`（若已有 API 契约文档，需同步新增双接口约定）
  - [ ] `packages/schemas`（若存在 API DTO 类型，需同步）
  - [x] 自动化测试（双接口最少各 1 条主路径 + 1 条异常路径）
- **说明**：默认不改 DB 契约；若实现中新增 DTO 类型，请同步 schema 与文档。

## 术语定义

- `originData`：从文件内容解析出的原始 JSON 数据。
- `scheme`：客户端定义的字段模板 JSON（值可先为空字符串）。
- `mappedScheme`：OpenAI 基于 `scheme` 字段与 `originData` 内容映射后得到的结果 JSON。

> 注：沿用当前项目命名 `scheme`（非 `schema`）。

## 接口拆分设计

### 接口 1：纯解析文件内容接口

**职责**：只做文件解析，不做字段映射。

- 输入：文件（上传文件或文件引用）
- 输出（JSON）：

```json
{
  "originData": {}
}
```

- 约束：
  - 输出必须是合法 JSON。
  - 不返回 `scheme`。
  - 错误也统一 JSON 结构返回（例如包含 `error` 字段）。

### 接口 2：scheme 映射接口

**职责**：基于 `scheme` + `originData` 做字段映射。

- 输入（JSON）：

```json
{
  "scheme": {},
  "originData": {}
}
```

- 输出（JSON）：

```json
{
  "scheme": {}
}
```

其中返回的 `scheme` 为映射后的结果（即 `mappedScheme`）。

- 约束：
  - 输入和输出必须是合法 JSON。
  - 不重复返回原始文件，不依赖文件二次上传。
  - 映射失败时返回可识别错误 JSON。

## 页面联动（上传/解析测试页）

1. 上传后先调用**接口 1**，拿到 `originData`。
2. 客户端将当前编辑字段模板构造成 `scheme` JSON（每个字段默认 `''`）。
3. 调用**接口 2**，传入 `{ scheme, originData }`。
4. 用接口 2 返回的映射后 `scheme` 回填编辑表单。
5. 测试区域展示完整 `originData` JSON，便于人工核对。

## 范围边界

**包含**：双接口拆分、请求/响应 JSON 规范、页面调用链路调整、测试页数据展示。

**不包含**：
- 新 OCR/模型能力开发
- 本地数据库结构改造
- 文件存储链路重构
- 非本需求相关 UI 重构

## 验收标准

- [ ] 接口 1 可独立工作：输入文件后返回 `{ originData }` JSON
- [ ] 接口 2 可独立工作：输入 `{ scheme, originData }` 后返回映射后的 `{ scheme }` JSON
- [ ] 两个接口在成功与失败场景下均返回 JSON（无非 JSON 混合返回）
- [ ] 上传解析页已按「接口 1 → 接口 2」顺序调用
- [ ] 页面编辑区正确回填映射后的 `scheme`；测试区可完整展示 `originData`
- [ ] 自动化测试覆盖双接口主路径与至少一个异常分支
- [ ] `pnpm lint`、`pnpm typecheck`、`pnpm test` 通过

## 实现建议（给 Agent 的最小执行指引）

1. 先抽离现有解析逻辑，落成接口 1（仅返回 `originData`）。
2. 再实现接口 2（仅做 `scheme` 映射）。
3. 调整前端调用顺序与回填逻辑。
4. 最后补测试，确保 JSON 返回一致性与页面主路径可验收。

## 参考

- 参考 PRD 目录：`/Users/peanut-tomo/Desktop/Tomo-project/Ledgerly/prd`
- 契约真源：
  - `docs/contracts/`
  - `packages/storage/src/contracts.ts`
  - `packages/schemas/src/index.ts`

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
