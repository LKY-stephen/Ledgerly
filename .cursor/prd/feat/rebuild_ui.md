# feat: UI 重构

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。

## 平台描述

为多平台收入创作者提供统一财务控制台。本 feat 聚焦 UI 重构，使界面与 Figma 设计稿一致，为后续接入真实数据预留布局。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：无变更
- **须同步的工件**：无
- **说明**：纯 UI 重构，无数据结构变更

## 需求描述

### 范围

本 feat 包含以下 UI 重构与交互调整：

1. **Home 页面重构**
   - 头部：保持不变
   - "New Records" 按钮：左侧新增 Add SVG 图标
   - 内容区：按 Figma 设计稿完全重构
   - 设计稿：[Home 页面](https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2351-1607&t=W7EHxMr19dfYkO1G-11)

2. **Ledger 模块重构**
   - 头部：保持不变
   - 内容区：按 Figma 设计稿重新调整
   - 设计稿：[Ledger 页面](https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2353-2019&t=W7EHxMr19dfYkO1G-11)

3. **Parsing Review 页面增强**
   - 新增两个数据源字段：
     - 资金流向（Fund Flow）
     - 摘要（Summary / Description）
   - 交互：数据解析字段可编辑
   - 编辑后：弹出确认对话框（"是否确认编辑？"）

4. **底部导航栏图标替换**
   - 替换 Home / Ledger / Setting 三个 tab 的图标
   - 图标来源：`apps/mobile/assets/` 目录下的 3 个关闭状态 tab 图标
   - 当前图标文件：`home_tab_home.svg`、`home_tab_ledger.svg` 等（需确认完整列表）

### 不包含

- 登录功能
- 数据逻辑变更
- 新增页面

## 验收标准

- [ ] Home 页面重构完成（头部保持，"New Records" 按钮新增 Add 图标，内容按设计稿重构）
- [ ] Ledger 模块重构完成（头部保持，内容按设计稿调整）
- [ ] Parsing Review 页面新增资金流向与摘要字段
- [ ] Parsing Review 页面数据解析字段可编辑，编辑后弹出确认对话框
- [ ] 底部导航栏三个 tab 图标替换完成
- [ ] 所有页面与设计稿视觉一致
- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] 移动端冒烟测试通过（`pnpm smoke`）

## 参考 Skill

- `.cursor/skills/project/expo`（RN/Expo 优先）

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

## 补充交付说明

**设计稿与资源：**
- Home 页面设计稿：[Figma 链接](https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2351-1607&t=ZWPErgb1gs5d01dF-11)
- Ledger 页面设计稿：[Figma 链接](https://www.figma.com/design/NablSExvqVtmfxZYLMstlg/yijie-shao-s-team-library?node-id=2353-2019&t=ZWPErgb1gs5d01dF-11)
- Tab 图标资源位置：`apps/mobile/assets/`（需确认具体文件名）

**实现建议：**
- 优先完成 Home 与 Ledger 重构，再处理 Parsing Review 增强
- 编辑确认对话框可复用现有 Modal 组件
