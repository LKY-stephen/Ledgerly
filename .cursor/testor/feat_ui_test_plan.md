# Test Plan: `feat_ui` (Expo Router Pure UI, Figma-Aligned)

## 1. 需求理解摘要

本 feat 目标是在 **既有 Expo Router 路由骨架**上完成 5 块“纯 UI 与交互”，并与给定 Figma 节点对齐：

- 登录页（`/login`）
- 首页 Tab（`/(tabs)` -> `/(tabs)/index`）
- Ledger Tab（`/(tabs)/ledger`）
- Ledger -> 上传（新增子页或 modal，纯 UI）
- Ledger 上传 -> 解析（新增子页或 modal，纯 UI）

关键约束：

- **不引入后端**；列表与表单数据一律 **mock/hardcoded**。
- **不扩展存储/契约**：不新增 SQLite 表、不新增 file-vault collection、不修改 `packages/storage` / `docs/contracts` / `packages/schemas`。
- 交付需保证导航路径可走完、交互有 press feedback、既有登录与 Tab 不回归。
- 交付需补充“路由入口 + 设计稿链接表”的说明文档（位置由 Dev 选择，但必须可追溯）。

Figma 真源（node-id）：

- Login: `2320-3`
- Ledger: `2330-6`
- Ledger Upload: `2330-9`
- Ledger Parse: `2330-18`
- Home: `2330-12`

## 2. 测试范围与不测项

### In Scope (本次必须覆盖)

- 路由可达性：冷启动登录 gate、游客入口进入 Tab、Tab 切换稳定、Ledger -> Upload -> Parse 导航可走完并可返回。
- 展示态：空态/加载态/错误态（若设计稿或实现包含）至少有一种明确呈现，不出现红屏。
- 交互态：主要按钮、列表 item、上传入口控件存在 press feedback，禁用态（若存在）可区分。
- 主题/语言回归（抽样）：切换 light/dark + 语言后关键控件仍清晰可读（不要求新增功能，但不能被本 feat 破坏）。
- Figma 对齐：布局结构、间距层级、主按钮/卡片/列表结构“无明显偏差”（像素级容差由 Harness 最终裁决）。

### Out of Scope (明确不测 / 不阻塞)

- 真实文件选择、真实上传、OCR/解析算法、任何真实业务规则引擎。
- 真实本地持久化写入（除现有 app shell/session/主题等既有行为）。
- Apple 登录真实成功链路在无 iOS/Apple 能力的环境中不强制要求（但必须 **优雅降级**，游客可继续）。
- 与后端同步、账号系统、网络请求稳定性（本阶段无后端）。

## 3. 可执行验收条件 (可观察、可复现)

以下每条都应能通过“看到什么 + 点击什么 + 到达什么”来验证。

### A. 设计对齐 (Figma)

- A1. 登录页框架、主按钮、次要入口（游客/暂不登录）与对应 Figma node（2320-3）结构一致，无明显错位或字体层级混乱。
- A2. 首页、Ledger、上传、解析屏分别与对应 node（2330-12 / 2330-6 / 2330-9 / 2330-18）主要结构一致：标题层级、卡片/列表结构、关键 CTA 存在且位置合理。
- A3. Pressed/disabled/error 等状态若设计稿给出：实现存在且可区分；若未给出：实现沿用现有 UI 组件默认状态，但不得出现“不可读/不可点但看不出来”的情况。

### B. 导航与交互

- B1. 冷启动在未登录时进入登录页；若已存在 session，则进入 `/(tabs)`。
- B2. 登录页点击“暂不登录/游客入口”能进入 `/(tabs)`，无卡死。
- B3. Tab 存在并可切换（首页/记账/发现/我的），切换无红屏；选中态有可见反馈。
- B4. Ledger 页存在“上传入口”并可进入上传页（路由新增或 modal 均可）；上传页存在继续/下一步入口能进入解析页。
- B5. 解析页存在“返回 Ledger”或等价回退路径；返回后仍在可交互状态。

### C. 回归与稳定性

- C1. 既有 Discover/ Profile 页仍可进入（抽样验证）。
- C2. 主题/语言切换后：登录页 CTA、Tab label/icon、首页关键卡片、Ledger 列表文字在 light/dark 下均可读，不出现浅底浅字。
- C3. 不新增/不修改任何 storage contract：`pnpm contract:check` 通过。

### D. 工程门禁

- D1. `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` / `pnpm contract:check` / `pnpm smoke` 通过（以仓库脚本为准）。

## 4. 场景表 (正常 / 异常 / 边界)

说明：这里的“异常/边界”重点是 UI 与导航层，不要求真实上传/解析。

| 场景 ID | 类型 | 前置条件 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| S1 | 正常 | 无 session | 启动 -> `/login` -> 点“暂不登录” | 进入 `/(tabs)`，Tab 可切换 |
| S2 | 正常 | 有 session | 启动 | 直接进入 `/(tabs)`，不闪回登录 |
| S3 | 正常 | 进入 Ledger | Tab -> Ledger -> 点上传入口 | 到达 Upload 屏（或 modal），无红屏 |
| S4 | 正常 | 在 Upload | 点“下一步/继续” | 到达 Parse 屏，展示解析进度/结果 mock |
| S5 | 正常 | 在 Parse | 点返回/完成 | 回到 Ledger（或回退链路正确） |
| S6 | 异常 | iOS 不可用 AppleAuth 或非 iOS | 登录页点击 Apple 登录按钮 | UI 不崩溃；显示不可用提示；仍可游客进入 |
| S7 | 边界 | 快速连点 | 在任一 CTA 连点 5 次 | 不崩溃，不产生重复叠加导航（或能被去抖/幂等处理） |
| S8 | 边界 | 小屏幕 | iPhone SE / 小尺寸 Android | 关键 CTA 不被遮挡；可滚动；SafeArea 正确 |
| S9 | 边界 | 深色主题 | Profile 切换 dark | 关键文字与 CTA 在 dark 下可读；Tab active/inactive 区分明确 |
| S10 | 边界 | 语言切换 | Profile 切换语言 | 文案切换后布局不溢出；标题不被截断到不可读 |
| S11 | 异常 | 解析页 mock “失败态”(若实现) | 在 Parse 切到失败态 | 给出可理解的失败提示与返回路径 |
| S12 | 回归 | Discover/News | Tab -> Discover -> 打开一条详情 | 既有路由仍可进入，返回正常 |

## 5. 冒烟路径 (Smoke)

### 自动化 (CI / Agent 优先)

在仓库根目录：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
pnpm smoke
```

备注：`pnpm smoke` 当前会通过 Turbo 执行各 workspace 的 `smoke`；移动端包映射为 Vitest（见 `tests/smoke/README.md`）。

### 手工 (设备/模拟器最短主路径)

1. `pnpm --filter @creator-cfo/mobile start` 启动 Expo。
2. 冷启动确认进入登录页；点击“暂不登录”进入 Tab。
3. 依次切换 4 个 Tab，确认无红屏，选中态可见。
4. 进入 Ledger，点击上传入口 -> 上传页 -> 继续 -> 解析页 -> 返回 Ledger。
5. 在 Profile 切换 light/dark（以及语言如实现支持），抽样验证登录页 CTA、Tab label/icon、Ledger 文案仍清晰可读。

## 6. 建议自动化检查与手工验证清单

### 建议新增/更新的自动化测试 (Dev 可实现)

1. `apps/mobile/tests/feat-ui-routes.test.ts`
   - 断言新路由文件存在（Upload/Parse 的 route module 可被 import）。
   - 断言核心屏幕组件可渲染（不抛错）。

2. `apps/mobile/tests/feat-ui-navigation.test.tsx` (若已有 test utils 支持)
   - 模拟“游客进入 Tab -> 进入 Ledger -> 打开 Upload -> 进入 Parse -> 返回”的导航序列（至少覆盖到 route-level render）。

3. 视觉/结构快照 (可选)
   - 对 Upload/Parse 屏的关键结构做快照或结构断言（比如标题、主 CTA、状态区块存在）。

4. 回归测试补点
   - 若修改了共享组件（`@creator-cfo/ui` 或 tab bar icon），补充对应的现有测试或新增 1 条最小断言。

### 手工验证清单 (复测时最小集)

- 路由入口对照文档存在：能从文档查到“路由 -> 屏幕 -> Figma node-id”。
- Upload/Parse 是纯 UI：不要求真实选择文件，但至少要有“选择文件”占位、说明文案、进度/结果 mock。
- Press 反馈：主要 CTA、列表行、返回按钮都有可见反馈。
- 无无意的契约变更：本 PR 不应触及 `packages/storage/src/contracts.ts` 与 `docs/contracts/`。

## 关键测试风险

- **Figma 对齐的客观标准**：若未定义像素容差，容易在验收时争议；建议 Harness 明确“关键帧截图对比”或容差口径。
- **AppleAuth 环境差异**：非 iOS/模拟器环境可能 `isAvailableAsync` 为 false；测试应聚焦“不崩溃 + 有提示 + 游客可继续”，而不是强行要求登录成功。
- **新增路由命名不一致**：Upload/Parse 的路由路径若未在 PRD 或 README 明确，后续验收复测成本高；建议 Dev 在说明文档里固定路径并写上 node-id。
- **主题/语言导致布局溢出**：新屏如果标题较长、字号较大，容易在小屏出现截断；需至少做一次小屏抽样验证。

## 给 Dev 的可测性建议

- 新增 Upload/Parse 屏时尽量做成“可独立渲染的纯组件”，避免强耦合真实文件系统或数据库，这样测试可以直接 render + 断言结构。
- 为每个新屏加 `testID` 或可稳定定位的标题文本，便于 Vitest/未来 E2E 验证。
- 在导航触发处（Ledger -> Upload -> Parse）避免隐式 side effects；如果需要 mock 状态切换，用显式 `useState`/参数传递，便于测试复现。

