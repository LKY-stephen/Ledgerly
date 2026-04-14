# CreatorCFO 记账功能 PRD

- Version: v1
- Date: 2026-03-30
- Product surface: `apps/mobile`
- Scope: 仅聚焦记账功能

## 1. 产品定义

### 1.1 一句话定义

CreatorCFO 记账功能是一个面向创作者的移动端、本地优先记账工作区，帮助用户记录收入、费用和发票状态，并形成清晰、可追溯、可继续整理的个人经营账本。

### 1.2 当前边界

本 PRD 只覆盖“记账功能”，不覆盖：

- 正式税务计算
- Tax Assistant
- 正式报税提交
- 平台 API 自动同步
- 银行自动连接
- 云端协作

### 1.3 当前阶段定位

这不是完整会计系统，也不是传统消费记账 App。  
它是：

- 面向创作者与自雇用户的移动端记账工作区
- 以后续税务准备和经营整理为目标的本地账本

---

## 2. 背景

基于当前仓库，产品已经具备：

- Expo + React Native 移动端壳层
- Login / Home / Ledger / Discover / Profile 四个 Tab
- SQLite / File Vault / AsyncStorage 本地契约

但当前 `Ledger` 仍然偏占位，缺少真正的记账能力。  
因此本阶段最合理的方向，是优先把“记账功能”做扎实，让移动端具备最基础但真实可用的财务记录能力。

---

## 3. 产品目标

### 3.1 用户目标

让用户能够在手机端完成下面 4 件事：

1. 记录收入
2. 记录费用
3. 管理发票 / 应收状态
4. 查看和整理账本记录

### 3.2 业务目标

1. 把 `Ledger` 从占位页升级成真实工作区
2. 验证用户是否愿意在本地优先模式下使用 CreatorCFO 进行日常财务整理
3. 为后续税务、导出、AI 辅助打下结构化账本基础

### 3.3 成功标准

1. 用户可以新增一笔收入记录
2. 用户可以新增一笔费用记录
3. 用户可以新增和更新一笔发票记录
4. 用户可以在 Ledger 中查看、筛选、区分不同记录类型
5. 用户可以识别哪些记录需要后续处理

---

## 4. 目标用户

### 4.1 核心用户

- YouTube 创作者
- Newsletter 作者
- Podcast 创作者
- 自由职业者
- 独立承包人
- 单人经营者

### 4.2 典型特征

- 收入来源不止一个
- 会有品牌合作、平台收入、联盟收入等不同形式
- 费用类型较多，如软件、设备、差旅、外包
- 需要在手机端快速记一笔、查一笔、改一笔

---

## 5. 核心问题

用户当前最常见的问题：

1. 收入和费用分散，难以及时记下
2. 发票 / 应收状态容易忘记跟进
3. 记录虽然存在，但缺乏统一整理入口
4. 不确定哪些记录还没处理完

---

## 6. 范围定义

## 6.1 In Scope

1. 收入记录
2. 费用记录
3. 发票记录
4. 记录列表与筛选
5. 记录状态管理
6. 快捷操作
7. 本地存储

## 6.2 Out of Scope

1. 自动税务计算
2. 自动平台导入
3. 银行对账
4. AI 自动分类
5. 多人协作
6. 正式导出报税包

---

## 7. 功能模块

## 7.1 收入记录

### 功能目标

记录用户的收入事件。

### 最小字段

- `id`
- `source`
- `type`
- `amount`
- `currency`
- `captured_at`
- `note`

### 示例 source

- YouTube
- Patreon
- Sponsor
- Affiliate
- Shopify
- Other

### 示例 type

- platform_income
- sponsorship
- affiliate_income
- tip
- merch_sale

### 用户动作

1. 新增收入
2. 查看收入
3. 编辑收入
4. 删除收入（待确认是否直接支持，建议 v1 先不开放彻底删除，只做归档或标记）

---

## 7.2 费用记录

### 功能目标

记录经营相关费用。

### 最小字段

- `id`
- `category`
- `amount`
- `currency`
- `incurred_on`
- `note`

### 示例 category

- software
- equipment
- travel
- contractor
- marketing
- workspace
- other

### 用户动作

1. 新增费用
2. 查看费用
3. 编辑费用
4. 关联票据（后续版本可增强）

---

## 7.3 发票记录

### 功能目标

跟踪品牌合作、顾问费等应收记录。

### 最小字段

- `id`
- `client_name`
- `amount`
- `currency`
- `status`
- `due_on`

### 示例 status

- draft
- sent
- paid
- overdue

### 用户动作

1. 新增发票
2. 查看发票状态
3. 标记已发送
4. 标记已付款
5. 查看逾期

---

## 7.4 Ledger 工作区

### 功能目标

作为收入、费用、发票的统一查看和整理入口。

### 页面结构建议

1. 顶部标题区
2. segmented control
- Income
- Expenses
- Invoices
3. 列表区
4. quick action 区

### 列表展示字段

#### Income
- source
- type
- amount
- captured_at
- status（可选）

#### Expenses
- category
- amount
- incurred_on
- note

#### Invoices
- client_name
- amount
- due_on
- status

### 必要交互

1. 切换不同记录类型
2. 查看列表
3. 打开详情
4. 进入新建记录页
5. 执行 quick action

---

## 8. 页面清单

### 8.1 Ledger Home

用途：
- 作为记账功能总入口

应包含：
- 收入 / 费用 / 发票切换
- 最近记录列表
- 新建入口

### 8.2 New Income

用途：
- 新增收入记录

### 8.3 New Expense

用途：
- 新增费用记录

### 8.4 New Invoice

用途：
- 新增发票记录

### 8.5 Record Detail

用途：
- 查看和编辑单条记录

---

## 9. 用户流程

## 9.1 记一笔收入

1. 进入 Ledger
2. 点击新增
3. 选择 `Income`
4. 填写来源、类型、金额、日期、备注
5. 保存到本地
6. 返回列表可见

## 9.2 记一笔费用

1. 进入 Ledger
2. 点击新增
3. 选择 `Expense`
4. 填写分类、金额、日期、备注
5. 保存到本地
6. 返回列表可见

## 9.3 管理发票

1. 进入 Ledger
2. 切换到 `Invoices`
3. 新增发票
4. 查看状态
5. 标记 `sent / paid / overdue`

---

## 10. 数据设计映射

基于当前仓库存储契约，建议直接使用：

### 10.1 SQLite 表

1. `income_snapshots`
- 收入记录

2. `expense_records`
- 费用记录

3. `invoice_records`
- 发票记录

### 10.2 暂不强依赖

1. `tax_forecasts`
2. `cash_flow_snapshots`

这两个表后续适合 Home 和 Tax Assistant 使用，但不是本次“记账功能”必需。

---

## 11. 非功能需求

1. 本地优先
- 记账功能不能依赖后端

2. 可维护
- 字段设计应尽量贴近当前 SQLite 契约

3. 简洁
- 不要为了“专业”增加过多表单字段

4. 可扩展
- 后续可接票据、税务、导出、AI 分类

5. 中英双语
- 继续使用当前文案体系

---

## 12. 验收标准

### 12.1 收入

1. 用户可以新增一笔收入
2. 用户可以在列表中看到收入
3. 用户可以编辑收入记录

### 12.2 费用

1. 用户可以新增一笔费用
2. 用户可以在列表中看到费用
3. 用户可以编辑费用记录

### 12.3 发票

1. 用户可以新增一笔发票
2. 用户可以切换发票状态
3. 用户可以识别逾期发票

### 12.4 Ledger

1. 用户可以在一个页面内切换收入、费用、发票
2. 列表能清楚区分记录类型
3. 页面承担工作流，而不是仅做说明展示

---

## 13. 风险

1. 继续把 Ledger 做成说明页
2. 字段太多，导致移动端录入负担过重
3. 发票和收入边界混乱
4. 设计成“消费记账工具”，偏离 creator finance 定位

---

## 14. 后续演进建议

当基础记账功能跑通后，建议按以下顺序扩展：

1. Receipt attach / file vault
2. Cash snapshot in Home
3. Tax Assistant
4. Export summary
5. AI explain / classify

---

## 15. 结论

当前阶段最合理的产品推进方向，不是一次性做完整财税系统，而是：

**先把移动端记账功能做成一个真实、好用、结构清晰的本地工作区。**

这个版本应优先聚焦三件事：

1. Income
2. Expenses
3. Invoices

只要这三件事形成清晰的记录与整理闭环，CreatorCFO 的移动端产品基础就算真正立住了。

