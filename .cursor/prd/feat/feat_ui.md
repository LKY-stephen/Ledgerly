# feat：整体 UI 架构与多屏纯 UI（Figma 对齐）

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准（角色三角、`pnpm` 门禁、完结后版本化上下文）；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/creator-cfo-always.mdc`。

## 一句话摘要

在 **Expo Router 现有路由骨架**上，完成登录、首页、Ledger 及 Ledger 子流程（上传、解析）的 **纯 UI 与交互**；列表与表单数据 **一律 mock 或硬编码**，不引入后端、不扩展业务数据契约。

## 平台描述

- 为多平台收入创作者提供统一财务控制台（收入归集、开票、成本、税务预估、现金流、stablecoin 收款等方向的聚合产品）。
- 本 feat 聚焦 **视觉与交互与 Figma 一致**，为后续接真实数据预留布局与状态占位。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`（本 feat 不向 SQLite / 文件仓写入业务数据；若仅内存或组件内 state 展示 mock，不视为契约变更）。
- **须同步的工件**：
  - [ ] `packages/storage/src/contracts.ts` — **本 feat 默认不勾选**
  - [ ] `docs/contracts/` — **本 feat 默认不勾选**
  - [ ] `packages/schemas` — **本 feat 默认不勾选**
  - [ ] 自动化测试 — **建议**：至少一处与新增/变更 UI 相关的快照或组件测试（或更新既有 smoke 路径说明），由 Dev/Testor 按实际改动勾选。
- **说明**：若后续将「上传 / 解析」与本地文件仓或 DB 打通，须 **另开 feat** 并按 schema-first 更新契约与文档。

## 范围边界

| 包含 | 不包含 |
|------|--------|
| 下列各屏的布局、样式、空态/加载态等 **展示层** | 真实接口、同步、业务规则引擎 |
| 按钮、Tab、列表、表单项的 **可点区域与导航**（含占位跳转） | 解析算法、发票 OCR、真实文件解析 |
| **Figma MCP**（或设计链接）对照下的像素级/规范级校准（Harness 定义容差） | 与设计稿无关的全局主题大改（若与 `.cursor/prd/feat/login_and_tab.md` 冲突，需 Harness 裁决优先级） |

## 需求描述

### 实现落点（与代码对齐的预期）

实现时以当前工程为准；若路由已存在，则在对应 **Screen 组件**内完成 UI，避免在 `app/` 路由文件堆业务 UI。

| 用户可见模块 | 预期路由 / 入口（以仓库实际为准） | 交付物 |
|--------------|-----------------------------------|--------|
| 登录页 | `app/login.tsx` → `LoginScreen` | 与设计稿一致的布局、主按钮、次要入口（如「暂不登录」若设计稿有） |
| 首页（Tab 首页） | `app/(tabs)/index.tsx` 等 | 首页信息架构与组件占位，数据 mock |
| Ledger | `app/(tabs)/ledger.tsx` → `LedgerScreen` | 列表/空态等 UI，数据 mock |
| Ledger → 上传 | 由 Ledger 内导航进入的子页或 modal（若尚无路由，由 Dev 在 `(tabs)` 或 `app/` 下 **新增路由** 并在此 PRD 更新一行路由路径） | 上传入口、说明文案、选择文件等 **纯 UI** |
| Ledger 上传 → 解析 | 上传后的下一屏（同上） | 解析进度/结果 **展示** UI，mock 解析结果 |

### 设计与对接

- 使用 **Figma MCP**（若环境已启用）读取节点规格，与下列链接对照；无法使用 MCP 时，以链接 + 导出标注为人工补充依据。
- 各屏应对齐 **对应 node** 的框架、间距、字体层级、主色/中性色；交互状态（pressed、disabled、error）以设计稿为准，无设计时由 Harness 确认是否沿用组件库默认。

## 设计稿（真源链接）

> 下列 URL 中 `node-id` 为 Figma 节点；开发时建议记录 **文件 key + node-id** 便于 MCP 拉取。

| 屏幕 | Figma 链接 |
|------|------------|
| 登录页 | `https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2320-3&t=u8F9DNB17FY0a65J-11` |
| Ledger | `https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2330-6&t=u8F9DNB17FY0a65J-11` |
| Ledger → 上传 | `https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2330-9&t=u8F9DNB17FY0a65J-11` |
| Ledger 上传 → 解析 | `https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2330-18&t=u8F9DNB17FY0a65J-11` |
| 首页 | `https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2330-12&t=u8F9DNB17FY0a65J-11` |

## 验收标准（可验证）

- [ ] **设计对齐**：上述五块屏幕的主要框架、主按钮、列表/卡片结构与 Figma **无明显偏差**（Harness 可定义「关键帧截图对比」或允许像素容差）。
- [ ] **交互**：可点击元素有反馈（如 press 态）；Tab/返回/上传→解析 **导航路径可走完**（数据为 mock 即可）。
- [ ] **回归**：既有登录等流程 **不因本 feat 破坏**（路由仍可进入、无运行时红屏）；若修改共享组件，相关 Tab 需手测或自动化覆盖。
- [ ] **工程**：通过 `AGENTS.md` 与摘要中的交付前检查（`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke`）；本 feat **未引入**未文档化的存储契约变更。
- [ ] **文档**：`apps/mobile` 下 README（或本 feat 指定的说明位置）**补充或更新**「本批屏幕的路由入口 + 设计稿链接表」，便于后续接数据与验收复测。

## 参考 Skill

- `.cursor/skills/project/expo`（RN / Expo / Expo Router 实现时优先）
- `.cursor/skills/project`（按需）

## 本 feat 补充交付说明

- **Figma**：优先用 Figma MCP 拉取节点尺寸与样式；PR 或 Harness 证据中建议附 **对照说明**（哪一屏对应哪一 node-id）。
- **与 `login_and_tab.md`**：若底部 Tab 数量、主题 Token 与本文设计稿不一致，以 **Harness 书面裁决**为准再开发。
- **README**：「规范、清晰」指 **路由—屏幕—设计稿** 可追踪，非强制新增独立长篇文档。
