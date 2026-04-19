# Ledgerly 记账版设计图提示词包

- Version: v1
- Date: 2026-03-30
- Scope: 仅针对当前“记账功能 + 上传入口”版本

## 1. 使用说明

这份提示词包基于当前仓库的真实产品阶段整理：

- 移动端优先
- 本地优先
- Expo + React Native
- 无后端
- 当前只做：
  - Income
  - Expense
  - Invoice
  - Upload Center
  - Record Detail

这意味着设计图不应呈现：

- 云同步复杂状态
- 远端数据拉取
- 银行直连
- 税务复杂流程
- 聊天型 AI 主界面

---

## 2. 通用中文母提示词

```text
请为 Ledgerly 设计一张高保真移动端 App UI 设计图。

产品背景：
Ledgerly 是一个面向创作者的移动端、本地优先财务工作台。当前版本只做记账功能，帮助用户记录收入、费用和发票，并通过上传入口管理票据、对账单、发票文件和附件资料。产品运行在 Expo + React Native 环境中，数据主要保存在设备本地。

目标用户：
美国市场的创作者、自雇人士和自由职业者，尤其是 YouTube 创作者、Newsletter 作者、播客创作者，以及有品牌赞助、平台收入和联盟收入的用户。

产品定位：
这不是普通消费记账 App，不是银行 App，也不是传统 ERP，而是一个创作者经营账本和财务整理工具。

视觉方向：
现代、专业、可信、清晰、冷静，浅暖色背景、深蓝文字、低饱和绿色强调色、大圆角卡片、舒适留白、信息层级清楚。

设计约束：
- 必须符合真实 iPhone App 界面比例
- 必须像真实 React Native / Expo 产品界面
- 不要做成概念海报
- 不要做成消费型预算工具
- 不要做成支付或交易所界面
- 要体现 creator finance workspace 的气质
```

---

## 3. GPT-4o / 通用图像模型版本

适合：

- GPT-4o
- 通用 AI 图片生成器
- 支持长文本 UI 生成的模型

### 3.1 整套页面总提示词

```text
请为 Ledgerly 设计一整套高保真移动端 App UI 设计图。

项目背景：
Ledgerly 是一个移动端优先、本地优先的创作者财务工作台。当前版本只聚焦记账功能，帮助用户记录收入、费用和发票，并通过本地文件上传管理票据、对账单和资料附件。产品运行在 Expo + React Native 环境中，数据主要保存在设备本地。

目标用户：
美国市场的创作者、自雇人士、自由职业者，尤其是 YouTube 创作者、Newsletter 作者、播客创作者，以及拥有品牌赞助、平台收入、联盟收入的 solo creator。

当前版本只做：
- Income 记录
- Expense 记录
- Invoice 记录
- Ledger 工作区
- Upload 上传入口
- Record detail 记录详情
- 本地文件关联

请设计以下页面：
1. Ledger Home
2. New Income
3. New Expense
4. New Invoice
5. Upload Center
6. Record Detail

设计要求：
- 高保真 iPhone App 界面
- 真实可落地，不是概念海报
- 现代、专业、可信、清晰、冷静
- 浅暖色背景、深蓝文字、低饱和绿色强调色、大圆角卡片
- 像创作者财务工作区，不像消费记账 App
- 不像银行 App，不像支付 App，不像 ERP，也不像交易所

请特别强调上传入口：
- Ledger Home 必须有 Upload 入口
- New Expense 要能上传 receipt
- New Income 要能关联 statement
- New Invoice 要能上传 invoice file
- Record Detail 必须能查看和追加附件
- Upload Center 应作为统一文件入口存在

请保持整套页面风格统一、逻辑准确，并适合 React Native / Expo 产品实现。
```

### 3.2 页面级提示词

#### Ledger Home

```text
请为 Ledgerly 设计一张移动端 Ledger Home 页面高保真 UI 设计图。

这是记账功能的主工作区。用户可以查看收入、费用和发票，并进入新增记录和上传流程。

页面重点：
- 顶部标题：Ledger
- 副标题：创作者本地账本工作区
- segmented control：Income / Expenses / Invoices
- 最近记录列表
- 每条记录包含来源/分类、金额、日期、状态
- 主入口按钮：New Record 和 Upload
- 底部四 Tab：Home / Ledger / Discover / Me

视觉要求：
真实 iPhone App，现代、可信、清晰，像 creator finance workspace，不像消费记账工具。
```

#### New Income

```text
请为 Ledgerly 设计一张移动端 New Income 页面高保真 UI 设计图。

页面目标：
新增一笔收入记录。

表单字段：
- source
- income type
- amount
- currency
- date
- note

附件能力：
- attach statement
- attach proof

主 CTA：
- Save income

界面应简洁明确，适合移动端快速录入，不要像复杂会计表单。
```

#### New Expense

```text
请为 Ledgerly 设计一张移动端 New Expense 页面高保真 UI 设计图。

页面目标：
新增一笔费用记录。

表单字段：
- category
- amount
- currency
- incurred date
- note

附件能力：
- upload receipt
- attach from vault

主 CTA：
- Save expense

界面应体现经营支出记录感，而不是生活消费记账。
```

#### New Invoice

```text
请为 Ledgerly 设计一张移动端 New Invoice 页面高保真 UI 设计图。

页面目标：
新增一笔发票 / 应收记录。

表单字段：
- client name
- amount
- currency
- due date
- status

附件能力：
- upload invoice file

主 CTA：
- Save invoice

界面应轻量但有应收管理感。
```

#### Upload Center

```text
请为 Ledgerly 设计一张移动端 Upload Center 页面高保真 UI 设计图。

页面目标：
统一处理文件上传入口。

上传类型：
- Receipt
- Statement
- Invoice file
- Tax support

页面元素：
- 标题 Upload Center
- 上传类型卡片
- 最近上传记录（可选）
- 主上传按钮

界面应是财务工作流的一部分，而不是系统文件管理器。
```

#### Record Detail

```text
请为 Ledgerly 设计一张移动端 Record Detail 页面高保真 UI 设计图。

页面目标：
查看并编辑一条收入、费用或发票记录，同时管理其附件。

页面元素：
- 页面标题：Record Detail
- 核心字段区
- 状态区
- 附件区
- 编辑按钮
- 操作按钮，例如 mark paid、attach receipt、review

界面应结构化、可操作、真实可落地。
```

---

## 4. Midjourney 版本

说明：

- Midjourney 更适合生成“视觉方向图”而不是严格产品线框
- 所以提示词会更偏视觉和构图
- 建议你在 Midjourney 中使用 `--ar 9:16` 或 `--ar 4:5`

### 4.1 整套视觉方向

```text
mobile app UI for Ledgerly, creator finance workspace, local-first bookkeeping app, income records, expense records, invoice tracking, upload center, iphone app interface, premium fintech mobile product, calm and trustworthy, warm off-white background, deep navy typography, muted green accents, rounded cards, realistic SaaS app layout, structured information hierarchy, not a banking app, not a budgeting app, not crypto exchange, high fidelity product design --ar 9:16 --stylize 150
```

### 4.2 Ledger Home

```text
iphone mobile UI, ledger home screen for creator finance app, segmented tabs income expenses invoices, upload button, new record button, creator bookkeeping workspace, realistic product design, premium fintech, calm layout, warm light background, deep navy text, soft green accents, rounded cards, structured list rows --ar 9:16 --stylize 125
```

### 4.3 New Expense

```text
iphone app UI, new expense entry screen, creator finance app, receipt upload section, simple mobile form, category amount currency date note fields, realistic react native product screen, warm neutral palette, modern fintech, clean rounded cards --ar 9:16 --stylize 125
```

### 4.4 Upload Center

```text
iphone app UI, upload center screen, receipt statement invoice file upload, creator finance mobile app, file categories cards, recent uploads list, realistic product design, calm professional fintech style, warm off-white and deep navy, muted green highlights --ar 9:16 --stylize 125
```

---

## 5. Figma AI / Uizard / Galileo 类工具版本

说明：

- 这类工具更适合结构化描述
- 需要明确页面目标、模块和交互

### 5.1 整套提示词

```text
Create a mobile app design system and screen set for Ledgerly.

Product:
Ledgerly is a mobile-first, local-first bookkeeping workspace for creators. This version only supports bookkeeping workflows: income, expenses, invoices, upload center, and record detail. No backend, no automatic sync, no tax calculation.

Users:
US-based creators, freelancers, and solo operators.

Required screens:
1. Ledger Home
2. New Income
3. New Expense
4. New Invoice
5. Upload Center
6. Record Detail

Design direction:
calm creator-finance product, realistic iPhone app, modern but not flashy, warm neutral surfaces, deep navy typography, muted green accent, large rounded cards, clean hierarchy.

Important:
- Ledger Home needs segmented control for income / expenses / invoices
- Add clear Upload entry
- Expense form must support receipt upload
- Income form should support statement attachment
- Invoice form should support invoice file upload
- Record Detail must show attachments and action buttons
```

### 5.2 适合单页继续精细化的 prompt

```text
Design a mobile Record Detail screen for Ledgerly.

Goal:
Allow a user to review and edit a bookkeeping record, see current status, and manage attached files.

Sections:
- header
- record summary card
- editable fields
- status section
- attachment section
- actions

Style:
mobile-first, realistic product, calm fintech, creator workspace, not consumer finance.
```

---

## 6. 附加约束词

如果出图结果偏了，可以在任何提示词后面追加这些句子：

```text
请不要把这个页面设计成消费记账工具。
请不要把它设计成银行或支付产品。
请不要把它设计成股票或加密交易界面。
这应该是一个给创作者使用的经营账本工作区。
请确保界面具有真实移动端产品感，适合 React Native / Expo 落地。
```

---

## 7. 推荐使用顺序

建议你先用下面顺序出图：

1. Ledger Home
2. New Expense
3. Upload Center
4. Record Detail
5. New Income
6. New Invoice

这个顺序最容易先把“记账主工作区 + 上传入口”跑通。

