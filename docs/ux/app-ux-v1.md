# CreatorCFO APP UX v1

- Version: v1
- Date: 2026-03-30
- Scope: `apps/mobile` 当前移动端、本地优先阶段

## 1. 文档目的

这份文档用于明确 CreatorCFO 在当前仓库阶段的 **移动端产品体验方向**，帮助团队把现有的 Expo 壳层推进成真正可用的创作者财务 APP，而不是继续停留在占位页面和结构说明阶段。

---

## 2. 基于仓库的现状判断

## 2.1 当前已经存在的产品基础

从仓库可确认，当前产品已经具备以下基础：

1. 移动端优先架构
- `Expo + React Native + Expo Router`

2. 本地优先策略
- SQLite 存结构化数据
- File Vault 存文件资料
- AsyncStorage 存主题、语言、会话

3. 已确定的信息架构
- `Login`
- `Home`
- `Ledger`
- `Discover`
- `Profile`

4. 已确定的体验原则
- calm
- local-first
- creator finance
- theme / locale aware

## 2.2 当前体验问题

虽然架构壳层已经存在，但业务体验仍然偏“说明型页面”，而不是“工作流页面”。

当前主要问题：

1. `Home` 更像产品说明页
- 展示模块、契约、状态说明较多
- 没有真正承担“财务总览”角色

2. `Ledger` 还是占位态
- 缺少真实收入、费用、发票、待处理项的核心视图

3. `Discover` 价值还不够清晰
- 目前偏“轻量扩展页”
- 需要成为 Tax Assistant、模板、智能工具的承接页

4. 还没有形成清晰的主循环
- 用户今天打开 APP 后
- 不知道应该先看什么
- 也没有明确的“下一步动作”

---

## 3. UX 北极星

CreatorCFO APP 不应该做成：

- 普通消费记账 App
- 银行 App
- 通用会计软件移动端
- 信息密集但缺乏引导的财务工具

CreatorCFO APP 应该是：

**一个给创作者使用的、安静但强控制感的财务工作台**

用户打开 APP 后，应该能快速回答这四个问题：

1. 我这个月赚了多少钱？
2. 我还有哪些钱没收清 / 没对上？
3. 我应该留多少税？
4. 我今天最需要处理什么？

---

## 4. UX 原则

## 4.1 首页必须承担决策，不承担介绍

首页不应该再以“模块说明”作为主信息结构。  
首页应该成为：

- 财务状态总览
- 待处理事项入口
- 风险提醒入口

## 4.2 每个 Tab 只服务一个主任务

- `Home`：看状态、看信号、看任务
- `Ledger`：看记录、改记录、补记录
- `Discover`：进入 Tax Assistant 与扩展工具
- `Profile`：管理主题、语言、会话、本地数据

## 4.3 AI 必须是“解释层”，不是“替代层”

Tax Assistant / Ask CFO 不应该变成一个孤立聊天框。  
更适合的做法是：

- 出现在 `Discover`
- 在收入、费用、税务页面提供上下文入口
- 解释“为什么”
- 告诉用户“下一步做什么”

## 4.4 local-first 必须体现在交互上

既然当前仓库明确是本地优先阶段，交互设计也要体现：

- 启动快
- 不依赖远端返回才能进入主流程
- 强调“设备上的财务工作台”
- 文件、资料、状态都可被本地管理

---

## 5. 初版 APP 信息架构建议

## 5.1 Login

### 目标

让用户以最低摩擦进入产品。

### UX 重点

- Apple 登录
- 游客模式
- 明确“本地优先”的产品气质
- 不做复杂 onboarding

---

## 5.2 Home

### 角色

财务驾驶舱首页。

### 应显示的信息

1. 可支配现金
- `cash available after reserve`

2. 本月收入
- `month revenue`

3. 税务预留
- `tax reserve target`

4. 今日待处理事项
- 例如：
  - review payout variance
  - mark invoice paid
  - upload receipt

5. 风险提醒
- overdue invoice
- missing receipt
- tax reserve drift

### UX 目标

用户在 5 秒内知道：

- 我现在财务状态如何
- 今天有什么要处理

---

## 5.3 Ledger

### 角色

核心记录工作区。

### 应覆盖的对象

1. 收入记录
2. 费用记录
3. 发票 / 应收
4. 待确认记录

### 主要任务

- 查看流水
- 筛选
- 修正记录
- 补凭证
- 管理 invoice 状态

### UX 目标

让 Ledger 成为“工作区”，而不是“静态列表”。

---

## 5.4 Discover

### 角色

智能入口与扩展页。

### 建议承载的能力

1. `Tax Assistant`
2. 1099 / Schedule C readiness
3. 模板资料库
4. 导出工具
5. 智能建议

### UX 目标

不是资讯流，也不是推荐流。  
而是工具入口页。

---

## 5.5 Profile

### 角色

偏好与会话控制页。

### 保持当前结构即可

1. Theme
2. Language
3. Session
4. Sign out

### 后续可增加

- Local vault management
- Export history
- Local data reset

---

## 6. 关键页面结构建议

## 6.1 Home 页面结构

建议顺序：

1. 顶部欢迎区
2. `cash available after reserve` Hero Card
3. 3 个 KPI
- month revenue
- tax reserve
- open reviews
4. `Today’s queue`
5. 风险项 / 提醒项

## 6.2 Ledger 页面结构

建议顺序：

1. 页头 + 筛选器
2. segmented control
- income
- expenses
- invoices
3. 核心记录列表
4. quick actions

## 6.3 Discover 页面结构

建议顺序：

1. Tax Assistant Hero
2. 功能卡片
- eligibility check
- 1099 income inbox
- export kits
- template vault
3. 智能建议 / assistant prompt chips

---

## 7. 视觉与交互建议

## 7.1 视觉方向

建议延续仓库现有 token 风格：

- 浅暖底色
- 深蓝正文
- 低饱和绿色强调色
- 局部暖金色用于税务与提醒

整体感受：

- calm
- trustworthy
- operational
- creator-friendly

## 7.2 卡片风格

建议：

- 大圆角
- 柔和分层
- 信息密度中高
- 不做强金融交易感

## 7.3 动作区

关键 CTA 建议固定化：

- Review
- Attach
- Ask
- Export
- Mark paid

---

## 8. 初版 UX 风险

1. 继续保留说明页结构
- 会让产品长期停在“骨架展示”阶段

2. Ledger 不成为真正工作区
- 会导致首页看得见、业务做不动

3. Discover 价值不清晰
- 会浪费一个天然适合放智能体和税务工具的入口

4. AI 入口只做成孤立按钮
- 会降低产品的解释力和可用性

---

## 9. 初版 UX 结论

当前仓库最适合的产品推进方式不是重做架构，而是：

**保留现有移动端壳层，重构内容层与工作流。**

优先级顺序建议：

1. Home 财务总览化
2. Ledger 工作区化
3. Discover Tax Assistant 化
4. 保留 Profile 极简控制

这样既符合当前仓库结构，也能最快把产品从“结构演示”推进到“真实业务体验”。

