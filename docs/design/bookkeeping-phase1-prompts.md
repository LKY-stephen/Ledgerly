# Ledgerly 一期记账版设计提示词

- Version: v1
- Date: 2026-03-30
- Scope: 一期仅做 `记账 + 上传 + 解析`
- Important: **不修改当前仓库既有底部菜单结构**

## 1. 核心约束

在使用任何 AI 生成设计图时，必须先明确以下边界：

1. 当前产品是移动端优先、本地优先的 React Native / Expo App
2. 当前底部 Tab 结构不能改：
- `Home`
- `Ledger`
- `Discover`
- `Profile`
3. 一期只做：
- 记账
- 上传
- 解析
4. 一期不做：
- 税务助手主流程
- 自动报税
- 自动同步
- 平台 API 连接
- 银行直连
- 后端协作

因此所有设计图都要建立在：

**不改现有导航，只增强现有页面内容**

---

## 2. 通用中文母提示词

```text
请为 Ledgerly 设计一张高保真移动端 App UI 设计图。

项目背景：
Ledgerly 是一个移动端优先、本地优先的创作者财务工作台，运行在 Expo + React Native 环境中。当前一期功能只做记账、上传和解析，帮助用户在手机端记录收入、费用和发票，并上传票据、对账单、发票文件等资料，再对这些文件做基础解析。

当前产品约束：
- 不修改现有底部菜单结构
- 底部菜单保持：
  - Home
  - Ledger
  - Discover
  - Profile
- 一期只在对应页面中增加记账、上传、解析能力

目标用户：
美国市场的创作者、自雇人士和自由职业者，尤其是 YouTube 创作者、Newsletter 作者、播客创作者，以及有平台收入、品牌赞助和联盟收入的用户。

设计目标：
把现有 App 骨架升级成一个真实可用的移动端记账工作区，但不改动原有导航结构。

视觉方向：
现代、专业、可信、清晰、冷静，浅暖色背景、深蓝文字、低饱和绿色强调色、大圆角卡片、清晰的信息层级。整体应像 creator finance workspace，而不是消费记账 App、银行 App 或传统 ERP。

设计约束：
- 必须符合真实 iPhone App 比例
- 必须像真实 React Native / Expo 产品
- 不要做成概念海报
- 不要新增底部 Tab
- 不要把一期做成复杂财税系统
- 必须体现“记账 + 上传 + 解析”的主线
```

---

## 3. 整套页面统一提示词

```text
请为 Ledgerly 设计一整套高保真移动端 App UI 设计图。

项目背景：
Ledgerly 是一个移动端优先、本地优先的创作者财务工作台。当前一期只做记账、上传和解析，不改动现有底部菜单结构。产品运行在 Expo + React Native 环境中，数据主要保存在设备本地。

底部菜单必须保持不变：
- Home
- Ledger
- Discover
- Profile

请基于这个现有导航结构来设计，而不是重新定义整个 App IA。

一期功能范围：
1. 记账
- 收入记录
- 费用记录
- 发票记录

2. 上传
- receipt
- statement
- invoice file
- support file

3. 解析
- 上传后显示基础解析结果
- 让用户确认和修正解析字段

请设计以下页面：
1. Home（不改菜单，只增强财务总览和待处理项）
2. Ledger Home（收入/费用/发票主工作区）
3. New Income
4. New Expense
5. New Invoice
6. Upload Flow / Upload Center
7. Parse Review（上传后解析确认页）
8. Record Detail
9. Discover（不改菜单，但承接模板资料库/上传记录/解析入口）
10. Profile（保持极简，不作为本期重点）

设计要求：
- 高保真 iPhone App
- 真实产品感，不是概念海报
- 风格统一、逻辑清晰
- 必须体现“保持原有菜单不变，只增强内容层”的思路
- 解析功能应是记账和上传后的辅助步骤，而不是独立复杂系统
```

---

## 4. 页面级提示词

## 4.1 Home

```text
请为 Ledgerly 设计一张移动端 Home 页面高保真 UI 设计图。

要求：
- 不改底部菜单结构
- Home 仍然是底部第一个 Tab
- 本期只增强 Home 的内容，不新增导航

页面目标：
- 展示记账相关的财务总览
- 显示最近上传和待解析项目
- 给用户一个“今天该处理什么”的入口

页面重点模块：
- 顶部欢迎区
- Hero card：本月账本概览
- KPI 卡片：收入、费用、待处理项
- Today’s queue
- 最近上传 / 待解析卡片
- 底部 Tab 保持 Home / Ledger / Discover / Profile

视觉要求：
Creator finance workspace 风格，清晰、可信、安静。
```

## 4.2 Ledger Home

```text
请为 Ledgerly 设计一张移动端 Ledger Home 页面高保真 UI 设计图。

要求：
- 不改底部菜单结构
- Ledger 仍然是底部第二个 Tab

页面目标：
- 成为一期记账功能的主工作区
- 支持查看收入、费用、发票
- 提供上传入口

页面重点模块：
- 标题：Ledger
- segmented control：Income / Expenses / Invoices
- 列表区
- 顶部或底部固定按钮：
  - New Record
  - Upload
- 每条记录显示来源/分类、金额、日期、状态

重点说明：
这个页面必须是“工作区”，不是说明页。
```

## 4.3 New Income

```text
请为 Ledgerly 设计一张移动端 New Income 页面高保真 UI 设计图。

页面目标：
- 新增一笔收入

字段：
- source
- income type
- amount
- currency
- date
- note

附件能力：
- attach statement
- attach proof

要求：
- 表单简洁
- 适合移动端快速录入
- 可衔接后续解析结果修正
```

## 4.4 New Expense

```text
请为 Ledgerly 设计一张移动端 New Expense 页面高保真 UI 设计图。

页面目标：
- 新增一笔费用

字段：
- category
- amount
- currency
- incurred date
- note

附件能力：
- upload receipt
- attach from vault

要求：
- 体现经营支出记录场景
- 支持后续票据解析确认
```

## 4.5 New Invoice

```text
请为 Ledgerly 设计一张移动端 New Invoice 页面高保真 UI 设计图。

页面目标：
- 新增一笔发票 / 应收记录

字段：
- client name
- amount
- currency
- due date
- status

附件能力：
- upload invoice file

要求：
- 保持移动端轻量
- 明确应收状态管理
```

## 4.6 Upload Center

```text
请为 Ledgerly 设计一张移动端 Upload Center 页面高保真 UI 设计图。

页面目标：
- 统一处理文件上传
- 服务于记账功能

上传类型：
- Receipt
- Statement
- Invoice file
- Support file

页面重点：
- 上传入口卡片
- 最近上传列表
- 文件状态
- 进入解析确认的 CTA

要求：
- 这是一期的关键页面
- 不能像系统文件管理器
- 要明确属于记账工作流的一部分
```

## 4.7 Parse Review

```text
请为 Ledgerly 设计一张移动端 Parse Review 页面高保真 UI 设计图。

页面目标：
- 上传文件后展示解析结果
- 用户确认、修正并保存结果到记账记录中

页面重点：
- 文件预览缩略区
- 解析结果字段
  - amount
  - date
  - category / source
  - note
- 用户可编辑修正
- Save as expense / Save as income / Attach to invoice

要求：
- 解析结果是建议，不是直接写入
- 必须可编辑、可确认
- 这个页面要体现“上传 -> 解析 -> 入账”闭环
```

## 4.8 Record Detail

```text
请为 Ledgerly 设计一张移动端 Record Detail 页面高保真 UI 设计图。

页面目标：
- 查看、编辑一条收入/费用/发票记录
- 查看和追加附件

页面重点：
- 核心字段卡片
- 状态区
- 附件区
- 解析来源标记（如果这条记录来自上传解析）
- 编辑按钮
- 操作按钮，例如 attach file、mark paid、review

要求：
- 页面结构必须清晰
- 要体现“记录”和“文件”的关联关系
```

## 4.9 Discover

```text
请为 Ledgerly 设计一张移动端 Discover 页面高保真 UI 设计图。

要求：
- 不改底部菜单结构
- Discover 仍然是底部第三个 Tab

一期目标：
- 不做复杂智能助手
- Discover 主要承接模板资料库、上传记录、解析工具入口

页面重点：
- Upload history
- Template vault
- Parse tools
- Export drafts（可弱化）

要求：
- Discover 是工具入口页，不是资讯页
- 要与记账和上传形成配合
```

## 4.10 Profile

```text
请为 Ledgerly 设计一张移动端 Profile 页面高保真 UI 设计图。

要求：
- 不改底部菜单结构
- Profile 仍然是底部第四个 Tab

页面目标：
- 管理主题、语言、会话和本地偏好

页面模块：
- Theme preference
- Language preference
- Session card
- Sign out

要求：
- 本期不需要加太多功能
- 保持简洁、清晰、稳定
```

---

## 5. Midjourney 版本

### 5.1 整体视觉方向

```text
mobile app UI for Ledgerly, creator bookkeeping workspace, upload and parsing workflow, local-first finance app, income expenses invoices, iphone app interface, premium fintech mobile design, calm and trustworthy, warm off-white background, deep navy typography, muted green accents, rounded cards, realistic react native product layout, not banking app, not budgeting app, not crypto exchange --ar 9:16 --stylize 150
```

### 5.2 Ledger Home

```text
iphone app UI, ledger workspace for creator bookkeeping app, segmented tabs income expenses invoices, upload button, new record button, realistic product design, creator finance mobile app, warm neutral palette, deep navy text, muted green accent, rounded cards --ar 9:16 --stylize 125
```

### 5.3 Upload Center

```text
iphone app UI, upload center screen for creator bookkeeping app, receipt statement invoice upload categories, recent uploads list, parse review workflow, realistic mobile product design, calm fintech style, warm off-white background, deep navy text, muted green accents --ar 9:16 --stylize 125
```

### 5.4 Parse Review

```text
iphone app UI, parse review screen, file upload parsing confirmation workflow, extracted fields amount date category note, editable result form, creator bookkeeping app, realistic mobile design, not OCR scanner app, premium product UI --ar 9:16 --stylize 125
```

---

## 6. Figma AI / Uizard / Galileo 版本

```text
Create a mobile app screen set for Ledgerly.

Product:
Ledgerly is a local-first creator bookkeeping app. Phase 1 only includes bookkeeping, upload, and parsing features. Do not change the existing bottom navigation structure.

Bottom tabs must remain:
- Home
- Ledger
- Discover
- Profile

Required screens:
1. Home
2. Ledger Home
3. New Income
4. New Expense
5. New Invoice
6. Upload Center
7. Parse Review
8. Record Detail
9. Discover
10. Profile

Design direction:
realistic iPhone app, React Native product feel, warm neutral surfaces, deep navy typography, muted green accent, large rounded cards, clean hierarchy, calm creator-finance workspace.

Important:
- Do not redesign the navigation structure
- Only enrich the existing tabs with bookkeeping, upload, and parsing workflows
- Ledger must be the main bookkeeping workspace
- Upload must be visible and easy to access
- Parse Review should show editable extracted fields before saving
```

---

## 7. 强制追加约束词

如果出图结果偏了，可以补：

```text
请注意：
- 不要修改底部菜单结构
- 不要新增第五个 Tab
- 不要把一期做成复杂财税系统
- 不要做成普通消费记账 App
- 不要做成银行或支付产品
- 解析功能必须是“上传后的确认步骤”，而不是独立 OCR 工具首页
```

