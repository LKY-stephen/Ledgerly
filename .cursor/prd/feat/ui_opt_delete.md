# feat: UI 调整与模块删除

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。

## 平台描述

为多平台收入创作者提供统一财务控制台。本 feat 聚焦 UI 调整与模块精简，使界面与 Figma 设计稿一致，为后续接入真实数据预留布局。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：无变更
- **须同步的工件**：无
- **说明**：纯 UI 调整，无数据结构变更

## 需求描述

### 范围

本 feat 包含以下 UI 调整与模块删除：

1. **首页（Home）**
   - 按钮文案：`transfer funds` → `new records`
   - 删除：`download report` 按钮
   - 文案调整：`available capital` → `Monthly profit`

2. **模块删除**
   - 删除：Action Queue 模块（首页）
   - 删除：Parser Timeline（parsing review 页面）
   - 删除：底部提示文案模块（parsing review 页面，"Our..." 文案）
   - 删除：Recent Process（upload workspace 页面）
   - 删除：Classification Engine 模块（upload workspace 页面）

3. **功能文案调整**
   - Invoice 功能 → 改为 `Spending`

4. **底部导航栏（Tab Bar）**
   - 调整为：`Home` / `Ledger` / `Setting`
   - 删除：`Discover` tab

5. **头部头像（AppBar）**
   - 替换所有占位头像为统一 CFO 图标：`apps/mobile/assets/cfo_icon.png`
   - 原因：暂不实现登录功能

### 不包含

- 登录功能实现
- 数据逻辑变更
- 新增页面或功能

## 验收标准

- [ ] 首页按钮文案与删除项完成（transfer funds → new records；删除 download report）
- [ ] 首页文案调整完成（available capital → Monthly profit）
- [ ] Action Queue 模块删除
- [ ] Invoice 功能改名为 Spending
- [ ] Parsing review 页面：Parser Timeline 与底部文案模块删除
- [ ] Upload workspace 页面：Recent Process 与 Classification Engine 删除
- [ ] 底部导航栏调整为 Home / Ledger / Setting（删除 Discover）
- [ ] 所有 AppBar 头像替换为 CFO 图标
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

- 设计稿参考：Figma（需确认链接或版本）
- 图标资源已存在：`apps/mobile/assets/cfo_icon.png`
