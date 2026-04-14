# CreatorCFO Mobile App Next Slice PRD

- Version: v1
- Date: 2026-03-30
- Product surface: `apps/mobile`
- Scope: 本地优先阶段，不引入后端

## 1. 背景

当前仓库已经完成了移动端产品骨架：

- 登录页
- 四 Tab 壳层
- 本地主题、语言、会话
- SQLite / File Vault / AsyncStorage 契约

但业务体验仍然处于骨架阶段，核心问题是：

- 首页还不是财务驾驶舱
- Ledger 还不是工作区
- Discover 还没有真正承接智能能力

因此下一阶段的目标，不是扩新技术栈，而是把现有移动端壳层推进成第一批可用的 CreatorCFO 业务体验。

---

## 2. 产品目标

### 2.1 本阶段目标

在不引入后端的前提下，让用户可以在移动端完成一个最小但完整的创作者财务使用闭环：

1. 看到自己的财务总览
2. 查看和整理收入 / 费用 / 发票
3. 进入税务准备助手
4. 理解今天需要处理什么

### 2.2 本阶段不做

1. 远程同步
2. 多设备协同
3. 真实平台 API 接入
4. 复杂税务计算引擎
5. 正式税表提交

---

## 3. 目标用户

### 3.1 核心用户

美国市场的创作者与自雇用户：

- YouTube creator
- Newsletter writer
- Podcaster
- Sponsor-driven creator
- Freelancer / solo operator

### 3.2 典型特征

- 收入来源多
- 财务工作分散
- 需要随手查看与记录
- 希望税务准备更清晰

---

## 4. 核心用户任务

本阶段优先支持 4 个任务：

1. **每日查看**
- 今天我的财务状态如何？

2. **记录整理**
- 哪些收入 / 费用 / 发票需要我处理？

3. **税务准备**
- 我离 tax-ready 还差什么？

4. **本地资料管理**
- 我有哪些票据、导出和资料存在设备上？

---

## 5. 页面级需求

## 5.1 Login

### 目标

在最小阻力下建立本地会话。

### 必要功能

1. Apple 登录
2. 游客进入
3. Apple 不可用时的 graceful fallback
4. 登录状态提示

### 验收标准

1. 用户可通过 Apple 登录进入主壳层
2. 用户可通过游客模式进入主壳层
3. 不支持 Apple 的环境能看到明确提示

---

## 5.2 Home

### 目标

成为财务驾驶舱首页。

### 必要功能

1. 显示可支配现金
2. 显示本月收入
3. 显示税务预留
4. 显示待处理事项
5. 显示关键风险提醒

### 建议信息块

1. `cash available after reserve`
2. `month revenue`
3. `tax reserve`
4. `open reviews`
5. `today’s queue`

### 验收标准

1. 用户进入首页后可在 5 秒内看懂当前财务状态
2. 首页至少包含一个可继续处理的动作入口

---

## 5.3 Ledger

### 目标

成为收入、费用、发票和待处理记录的主工作区。

### 必要功能

1. segmented tabs
- income
- expenses
- invoices

2. 列表展示
- source
- type
- amount
- status

3. quick actions
- attach receipt
- mark paid
- review

### 验收标准

1. 用户可在 Ledger 中区分收入、费用和发票
2. 用户可看到状态差异，例如 overdue / pending / cleared
3. 页面不是静态说明页，而是记录工作页

---

## 5.4 Discover

### 目标

成为 Tax Assistant 和扩展工具的入口页。

### 必要功能

1. Tax Assistant Hero
2. 功能入口卡片
- eligibility check
- 1099 income inbox
- template vault
- export kits

3. 智能建议入口

### 验收标准

1. 用户可从 Discover 明确进入 Tax Assistant
2. Discover 的定位是工具页而不是资讯页

---

## 5.5 Profile

### 目标

保持极简且稳定的偏好页。

### 必要功能

1. theme preference
2. language preference
3. session card
4. sign out

### 可选增强

1. local vault management
2. export history
3. reset local state

---

## 6. Tax Assistant 需求拆分

Tax Assistant 是当前产品最具差异化潜力的模块，建议作为 Discover 的主入口。

## 6.1 Phase 1

### 功能

1. Tax Assistant Home
2. Eligibility Check
3. 1099 Income Inbox
4. Readiness Summary

### 价值

让用户从“我是不是走 Schedule C”到“我还缺什么”形成最小闭环。

## 6.2 Phase 2

### 功能

1. Schedule C expense mapping
2. AI explanation chips
3. export summary

### 价值

让税务准备从“看状态”进化到“可导出、可继续处理”。

## 6.3 Phase 3

### 功能

1. receipt / evidence attach from file vault
2. year-end readiness package
3. local checklist persistence

### 价值

将 local-first 的优势真正转化为税务准备资产。

---

## 7. 数据与本地契约拆分建议

根据当前 `packages/storage`，下一步应优先让现有表真正被 UI 使用。

## 7.1 立即可用的表

1. `income_snapshots`
2. `invoice_records`
3. `expense_records`
4. `tax_forecasts`
5. `cash_flow_snapshots`

## 7.2 对应 UI 映射

1. `income_snapshots`
- Home revenue cards
- Ledger income list

2. `invoice_records`
- Ledger invoice tab
- Home overdue reminders

3. `expense_records`
- Ledger expense tab
- Tax Assistant mapping basis

4. `tax_forecasts`
- Home reserve card
- Discover / Tax Assistant summary

5. `cash_flow_snapshots`
- Home cash hero
- runway / obligation signal

---

## 8. 开发拆分建议

## 8.1 Slice A：Home 产品化

### 范围

1. 重做 Home 内容结构
2. 接入 cash / revenue / reserve / open tasks mock data
3. 增加 task cards

### 输出

- 一个真正可用的首页

## 8.2 Slice B：Ledger 产品化

### 范围

1. 增加 segmented control
2. 增加 income / expense / invoice 列表结构
3. 增加状态标签与 quick actions

### 输出

- 一个真正可用的记录工作区

## 8.3 Slice C：Discover -> Tax Assistant

### 范围

1. 重做 Discover 信息架构
2. 把 Tax Assistant 作为主入口
3. 增加 readiness / eligibility card

### 输出

- 一个有产品价值的 Discover 页面

## 8.4 Slice D：Tax Assistant 子流程

### 范围

1. `/discover/tax-assistant`
2. `/discover/tax-assistant/eligibility`
3. `/discover/tax-assistant/income-inbox`
4. `/discover/tax-assistant/readiness`

### 输出

- 第一版税务助手流程

---

## 9. 测试与验收建议

## 9.1 体验验收

1. 用户能否看懂首页
2. 用户能否完成一条 Ledger 操作
3. 用户能否从 Discover 找到 Tax Assistant
4. 用户能否理解 Tax Assistant 的输出不是正式报税

## 9.2 技术验收

1. 不引入后端依赖
2. 保持现有本地契约不破坏
3. 新页面至少有一项自动化测试
4. 新增文案继续支持中英双语

## 9.3 风险点

1. 页面仍停留在说明态
2. 数据表存在但 UI 不消费
3. Tax Assistant 被做成孤立聊天页
4. UX 继续围绕“展示产品架构”而不是“帮助用户工作”

---

## 10. 结论

当前仓库的最优推进方式，不是扩基础设施，而是：

**把现有移动端壳层变成真实工作流。**

优先级建议：

1. Home
2. Ledger
3. Discover / Tax Assistant
4. Profile 小修

这条路线与当前仓库最匹配，且能最快形成真正可演示、可验证、可继续开发的移动端产品。

