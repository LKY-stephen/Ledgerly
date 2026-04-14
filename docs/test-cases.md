# CreatorCFO 详细测试用例

## 1. 文档说明

- 适用仓库：`/Users/test/CreatorCFO`
- 基线分支：`origin/dev_peanut`
- 基线提交：`e89590c`
- 适用端：移动端，当前以 **iOS** 为主执行环境
- 文档目标：覆盖当前分支已经实现的用户主流程、本地数据流、配置持久化，以及现有代码域回归

这份文档按照两层来组织：

1. **当前 iOS 可执行 UAT / 回归用例**
2. **代码域自动化与补充回归建议**

## 2. 当前版本范围

### 2.1 纳入测试范围

- 登录页
- 会话持久化：游客模式 / Apple 登录降级
- 底部 3 Tab 壳层：`Home / Ledger / Profile`
- 首页本地账本总览
- 上传中心：选文件 / 选照片 / 导入队列
- 解析复核页：字段编辑、分类选择、确认保存、重试解析
- 本地设置：主题、语言、Vercel Parse API、OpenAI API Key、退出登录
- 本地数据链路：AsyncStorage、SQLite、本地 evidence queue
- 税表/聚合相关代码域回归：Schedule C、Schedule SE、1040、1099-NEC 模型层

### 2.2 不纳入本轮主执行范围

- `Discover` 页面 UI 验收
- 后端服务端联调
- 正式报税申报流程
- Android / Web 端主回归

说明：

- 当前代码里虽然存在 `discover` 路由，但在 Tab 配置中是隐藏的，不作为本轮 iOS 主验收内容。
- 当前 `Ledger` Tab 本身还是展示型 mock + 跳转入口，它不是完整真实账本页，因此测试时需要把“记账总览页本身”与“上传/解析实际闭环”分开执行。

## 3. 测试目标

- 验证 App 在 **无后端强依赖** 前提下能完成登录、进入主界面和本地数据操作
- 验证上传凭证后，数据可进入本地解析队列并完成确认入账
- 验证首页读取本地 SQLite 结果，并正确展示月度收入、流出、净额和最近活动
- 验证 Profile 中的主题、语言、API 设置和会话状态能正确保存并恢复
- 验证现有模型测试与本地账务聚合逻辑持续可用

## 4. 测试环境

### 4.1 推荐环境矩阵

- iOS 模拟器：主执行环境
- iOS 真机：补充验证 Apple 登录成功路径、相册权限、文件选择体验

### 4.2 执行前准备

- 仓库依赖已安装：`pnpm install`
- 可启动移动端：`pnpm --filter @creator-cfo/mobile exec expo start --go`
- 如需验证 Apple 成功登录：准备支持 Apple Authentication 的 iPhone 真机
- 如需验证解析成功路径：在 Profile 中提前写入
  - `Vercel API Base URL`
  - `OpenAI API Key`

### 4.3 建议执行命令

- 全量自动化：`pnpm test`
- 仅移动端测试：`pnpm --filter @creator-cfo/mobile test`
- 类型检查：`pnpm typecheck`
- Lint：`pnpm lint`

当前仓库实测结果：

- `pnpm --filter @creator-cfo/mobile test`：**15 个测试文件，38 个用例全部通过**

## 5. 测试数据设计

### 5.1 会话数据

- `guest-session`
  - `kind = guest`
  - `displayName = Guest mode`
- `apple-session`
  - `kind = apple`
  - 带 `appleUserId / email / displayName / startedAt`
- `invalid-session`
  - 非法 JSON
  - 缺少 `kind`

### 5.2 偏好设置数据

- 主题：`light / dark / system`
- 语言：`en / zh-CN / system`
- 非法主题：`night`
- 非法语言：`fr-FR`

### 5.3 上传与解析数据

- 图片：`receipt.jpg`
- PDF：`invoice.pdf`
- Live Photo：`receipt.heic + receipt.mov`
- 解析成功样本
  - 金额：`52.99`
  - 日期：`2026-04-01`
  - 描述：`Apple accessories`
- 解析失败样本
  - API 不可达
  - API Key 未配置
  - Base URL 未配置

### 5.4 本地账本样本

- 收入记录
  - `YouTube payout`
  - `Consulting payout`
- 支出记录
  - `Adobe subscription`
- 用于首页验证
  - 月收入
  - 月流出
  - 月净额
  - 最近活动分页

## 6. 优先级定义

- `P0`：阻塞发布的主流程，失败即不能交付
- `P1`：高价值体验或错误处理，需在候选版本前修复
- `P2`：增强项、体验细节或当前已知缺陷跟踪

## 7. 详细测试用例

## 7.1 启动与登录

### TC-BOOT-001 冷启动进入登录页

- 优先级：`P0`
- 前置条件：清空本地会话
- 步骤：
  1. 首次安装或清理本地存储
  2. 启动 App
- 预期结果：
  1. 先展示 Launch / Hydration 过渡态
  2. Hydration 完成后进入登录页
  3. 页面包含 Apple 登录入口
  4. 页面包含游客继续入口

### TC-BOOT-002 已有会话时自动进入主壳层

- 优先级：`P0`
- 前置条件：本地已有有效 `auth_session`
- 步骤：
  1. 关闭 App
  2. 重启 App
- 预期结果：
  1. 不停留在登录页
  2. 自动进入 Tab 主壳层

### TC-AUTH-001 游客模式进入应用

- 优先级：`P0`
- 前置条件：无会话
- 步骤：
  1. 打开登录页
  2. 点击游客继续按钮
- 预期结果：
  1. 成功进入主壳层
  2. `Profile` 中显示访客会话
  3. 重启应用后仍保持已登录状态

### TC-AUTH-002 Apple 登录不可用时的降级提示

- 优先级：`P0`
- 执行环境：iOS 模拟器
- 前置条件：无会话
- 步骤：
  1. 打开登录页
  2. 点击 Apple 登录按钮
- 预期结果：
  1. 不崩溃
  2. 页面状态提示切换为 Apple 不可用说明
  3. 用户仍可改走游客路径

### TC-AUTH-003 Apple 登录成功路径

- 优先级：`P1`
- 执行环境：iOS 真机
- 前置条件：支持 Apple Authentication
- 步骤：
  1. 打开登录页
  2. 点击 Apple 登录
  3. 完成系统授权
- 预期结果：
  1. 成功进入主壳层
  2. `session.kind = apple`
  3. `Profile` 中显示 Apple 身份信息

### TC-AUTH-004 Apple 登录取消

- 优先级：`P1`
- 执行环境：iOS 真机
- 前置条件：支持 Apple Authentication
- 步骤：
  1. 点击 Apple 登录
  2. 在系统弹窗中取消
- 预期结果：
  1. 停留在登录页
  2. 页面显示取消提示
  3. 不写入错误会话

## 7.2 主壳层与导航

### TC-NAV-001 三个 Tab 正常展示

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 进入主壳层
  2. 查看底部导航
- 预期结果：
  1. 仅显示 `Home / Ledger / Profile`
  2. 图标、标题与当前语言一致
  3. `Discover` 不显示在底部 Tab 中

### TC-NAV-002 Tab 切换正常

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 依次点击 `Home`
  2. 点击 `Ledger`
  3. 点击 `Profile`
- 预期结果：
  1. 页面可正常切换
  2. 当前 Tab 有高亮态
  3. 不出现空白页和闪退

### TC-NAV-003 未登录时访问 Tabs 自动跳转登录页

- 优先级：`P0`
- 前置条件：清空会话
- 步骤：
  1. 打开任意 Tab 路由
- 预期结果：
  1. 统一被重定向到 `/login`

## 7.3 首页 Home

### TC-HOME-001 首页基础区块展示

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 进入首页
- 预期结果：
  1. 显示品牌区域
  2. 显示 `Monthly Profit`
  3. 显示 `Income / Outflow / Net`
  4. 显示趋势图和最近活动区域

### TC-HOME-002 首页空数据态

- 优先级：`P0`
- 前置条件：本地账本无记录
- 步骤：
  1. 首次进入首页
- 预期结果：
  1. 收入、流出、净额为 0
  2. 最近活动展示空态说明
  3. 不崩溃，不显示脏数据

### TC-HOME-003 首页下拉刷新

- 优先级：`P1`
- 前置条件：已登录
- 步骤：
  1. 在首页下拉
- 预期结果：
  1. 触发刷新状态
  2. 刷新完成后页面恢复可交互
  3. 刷新失败时显示错误信息，不影响再次尝试

### TC-HOME-004 首页最近活动分页

- 优先级：`P1`
- 前置条件：本地存在超过 20 条记录
- 步骤：
  1. 打开首页
  2. 观察最近活动数量
  3. 点击 `Load More`
- 预期结果：
  1. 首屏只显示第一页记录
  2. 点击后追加下一页，不覆盖原数据
  3. 数据加载完后 `Load More` 消失

### TC-HOME-005 首页跳转上传中心

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 点击 Hero 区的 `New Records`
- 预期结果：
  1. 跳转到 `/ledger/upload`

### TC-HOME-006 首页跳转 Ledger Tab

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 点击 `See All`
- 预期结果：
  1. 跳转到 `Ledger` Tab

### TC-HOME-007 首页金额聚合正确

- 优先级：`P0`
- 执行方式：自动化 + 手工抽查
- 前置条件：准备一组包含收入和支出的本地样本记录
- 步骤：
  1. 写入 `income + expense` 记录
  2. 进入首页
- 预期结果：
  1. `Income` 等于当月收入总额
  2. `Outflow` 等于当月支出 + personal spending
  3. `Net = Income - Outflow`

### TC-HOME-008 通知按钮交互

- 优先级：`P2`
- 前置条件：已登录
- 步骤：
  1. 点击右上角通知按钮
- 预期结果：
  1. 当前版本无实际功能
  2. 不应崩溃
  3. 若无行为，应记录为已知缺陷而非执行失败

## 7.4 Ledger Tab

### TC-LEDGER-001 Ledger 页基础展示

- 优先级：`P1`
- 前置条件：已登录
- 步骤：
  1. 进入 `Ledger` Tab
- 预期结果：
  1. 显示会计期间、分段切换、指标卡、交易列表
  2. 页面可滚动
  3. 顶部上传和解析按钮可见

### TC-LEDGER-002 Ledger 页跳转上传中心

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 点击上传按钮
- 预期结果：
  1. 跳转 `/ledger/upload`

### TC-LEDGER-003 Ledger 页跳转解析页

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 点击筛选调节按钮
  2. 或点击任一交易卡片
- 预期结果：
  1. 跳转 `/ledger/parse`

### TC-LEDGER-004 Ledger 三段切换交互

- 优先级：`P2`
- 前置条件：已登录
- 步骤：
  1. 点击 `明细汇总`
  2. 点击 `资产负债`
  3. 点击 `现金流`
- 预期结果：
  1. 当前代码中无真实切换逻辑
  2. 若点击无反应，记录为已知缺陷

### TC-LEDGER-005 Ledger 与首页数据一致性

- 优先级：`P0`
- 前置条件：本地已有真实记录
- 步骤：
  1. 记录首页中的金额与最近活动
  2. 进入 `Ledger` Tab
- 预期结果：
  1. 理想上应保持一致
  2. 当前分支实际不一致，应记录为已知缺陷

## 7.5 上传中心 Ledger Upload

### TC-UPLOAD-001 进入上传中心

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 通过首页或 Ledger 页进入上传中心
- 预期结果：
  1. 页面正常展示
  2. 显示 `Select Photos / Select Files / Review Queue`

### TC-UPLOAD-002 取消选择文件

- 优先级：`P1`
- 前置条件：已进入上传中心
- 步骤：
  1. 点击 `Select Files`
  2. 在系统文件选择器中取消
- 预期结果：
  1. 页面提示 `No files were selected.`
  2. 不新增队列项
  3. 页面保持可继续操作

### TC-UPLOAD-003 取消选择照片

- 优先级：`P1`
- 前置条件：已进入上传中心
- 步骤：
  1. 点击 `Select Photos`
  2. 在照片选择器中取消
- 预期结果：
  1. 页面提示 `No files were selected.`
  2. 不崩溃

### TC-UPLOAD-004 相册权限被拒绝

- 优先级：`P0`
- 前置条件：系统相册权限关闭
- 步骤：
  1. 点击 `Select Photos`
- 预期结果：
  1. 页面显示权限错误信息
  2. 用户仍可改走 `Select Files`

### TC-UPLOAD-005 导入单张图片进入本地队列

- 优先级：`P0`
- 前置条件：
  - 已配置解析接口，或允许走失败可重试路径
  - 准备图片文件
- 步骤：
  1. 点击 `Select Photos`
  2. 选择 1 张图片
- 预期结果：
  1. 文件被导入本地 vault / evidence 队列
  2. 状态提示显示新增条数
  3. 自动跳转到 `/ledger/parse`

### TC-UPLOAD-006 导入 PDF 文件

- 优先级：`P0`
- 前置条件：准备 PDF 文件
- 步骤：
  1. 点击 `Select Files`
  2. 选择 PDF
- 预期结果：
  1. 成功入队
  2. 自动跳转到 `/ledger/parse`

### TC-UPLOAD-007 导入 Live Photo 配对文件

- 优先级：`P1`
- 执行环境：支持 Live Photo 的 iOS 真机
- 前置条件：相册内存在 Live Photo
- 步骤：
  1. 点击 `Select Photos`
  2. 选择一条 Live Photo
- 预期结果：
  1. 主图与配对视频被同一 evidence 组接收
  2. 队列中仍只体现为一个待处理项

### TC-UPLOAD-008 导入期间按钮禁用

- 优先级：`P1`
- 前置条件：开始导入
- 步骤：
  1. 在导入过程中重复点击按钮
- 预期结果：
  1. 按钮进入忙碌态
  2. 不重复创建同一批次导入

### TC-UPLOAD-009 Review Queue 直达解析页

- 优先级：`P0`
- 前置条件：已进入上传中心
- 步骤：
  1. 点击 `Review Queue`
- 预期结果：
  1. 跳转 `/ledger/parse`

## 7.6 解析复核页 Ledger Parse

### TC-PARSE-001 队列为空时展示空态

- 优先级：`P0`
- 前置条件：无待处理 evidence
- 步骤：
  1. 打开 `/ledger/parse`
- 预期结果：
  1. 显示 `No pending uploads`
  2. 提供 `Go to Upload`

### TC-PARSE-002 队列中有待处理项时展示当前项

- 优先级：`P0`
- 前置条件：至少 1 条 pending / failed evidence
- 步骤：
  1. 打开解析页
- 预期结果：
  1. 展示文件名、来源标签、创建日期
  2. 展示解析字段区域
  3. 展示分类区和确认按钮

### TC-PARSE-003 自动触发解析

- 优先级：`P0`
- 前置条件：当前 evidence `parseStatus = pending` 且无 `rawText`
- 步骤：
  1. 进入解析页
- 预期结果：
  1. 自动触发解析请求
  2. 成功后更新本地 extracted data
  3. 失败后仍保留在队列中

### TC-PARSE-004 未配置 Base URL 时解析失败提示

- 优先级：`P0`
- 前置条件：Profile 中未保存 `Vercel API Base URL`
- 步骤：
  1. 导入文件
  2. 进入解析页
- 预期结果：
  1. 页面提示先配置 API Base URL
  2. evidence 保留在队列中
  3. 用户可去 Settings 补录后重试

### TC-PARSE-005 未配置 OpenAI API Key 时解析失败提示

- 优先级：`P0`
- 前置条件：Profile 中未保存 `OpenAI API Key`
- 步骤：
  1. 导入文件
  2. 进入解析页
- 预期结果：
  1. 页面提示先配置 OpenAI API Key
  2. evidence 保留在队列中

### TC-PARSE-006 字段编辑与确认弹窗

- 优先级：`P0`
- 前置条件：解析页中存在字段值
- 步骤：
  1. 点击任意字段的 `Edit`
  2. 修改内容
  3. 点击 `Save`
- 预期结果：
  1. 出现确认弹窗
  2. 点击 `Confirm` 后字段值更新
  3. 点击 `Cancel` 后值不落入正式 review 状态

### TC-PARSE-007 必填项校验

- 优先级：`P0`
- 前置条件：解析页有待提交项
- 步骤：
  1. 清空 `date`
  2. 点击 `Confirm & Save`
  3. 重复清空 `amount`、`description`
- 预期结果：
  1. 提交失败
  2. 错误提示为 `date, amount, and description are required.`
  3. 当前 evidence 不应从队列中消失

### TC-PARSE-008 分类切换

- 优先级：`P0`
- 前置条件：解析页有待提交项
- 步骤：
  1. 依次点击 `Income`
  2. 点击 `Expense`
  3. 点击 `Spending`
- 预期结果：
  1. 单选态正确切换
  2. 最终提交时带入对应分类

### TC-PARSE-009 确认入账成功

- 优先级：`P0`
- 前置条件：必填字段完整
- 步骤：
  1. 点击 `Confirm & Save`
- 预期结果：
  1. 当前 evidence 状态更新为 `parsed`
  2. 写入 records
  3. evidence 从待处理队列移除
  4. 如果这是最后一条队列项，返回 `Ledger` Tab

### TC-PARSE-010 重试解析

- 优先级：`P1`
- 前置条件：当前 evidence 解析失败
- 步骤：
  1. 点击 `Retry Parse`
- 预期结果：
  1. evidence 被重置为 pending
  2. 重新发起解析
  3. 成功则可继续复核，失败则继续保留在队列

### TC-PARSE-011 保存后首页联动

- 优先级：`P0`
- 前置条件：保存一条新 record
- 步骤：
  1. 在解析页完成确认保存
  2. 返回首页
- 预期结果：
  1. 首页最近活动新增该条记录
  2. 对应月度金额同步变化

## 7.7 Profile 设置页

### TC-PROFILE-001 Profile 页基础展示

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 进入 `Profile`
- 预期结果：
  1. 显示主题设置
  2. 显示语言设置
  3. 显示 API 配置区
  4. 显示当前会话信息和退出按钮

### TC-PROFILE-002 主题切换

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 依次切换 `Light / Dark / System`
  2. 重启应用
- 预期结果：
  1. UI 主题立即变化
  2. 重启后保持上次选择

### TC-PROFILE-003 语言切换

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 切换 `English / 中文 / System`
- 预期结果：
  1. Tab 标题等接入 copy 的部分随之变化
  2. 页面不崩溃
  3. 当前未接入 copy 的硬编码区块需记录混用现象

### TC-PROFILE-004 保存 Parse API 设置

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 输入 `Vercel API Base URL`
  2. 输入 `OpenAI API Key`
  3. 点击 `Save API Settings`
  4. 重启应用
- 预期结果：
  1. 两项配置成功保存
  2. 重启后输入框仍可回显
  3. Base URL 自动去除末尾 `/`

### TC-PROFILE-005 清空 Parse API 设置

- 优先级：`P0`
- 前置条件：已存在 API 设置
- 步骤：
  1. 点击 `Clear`
- 预期结果：
  1. 输入框清空
  2. AsyncStorage 中相应键被移除

### TC-PROFILE-006 退出登录

- 优先级：`P0`
- 前置条件：已登录
- 步骤：
  1. 点击 `Sign out`
- 预期结果：
  1. 返回登录页
  2. 本地会话被清除
  3. 再次打开 Tabs 会被重定向到登录页

## 7.8 本地数据与一致性

### TC-DATA-001 首次导入时自动创建默认 Entity

- 优先级：`P0`
- 执行方式：自动化主测，手工抽验
- 前置条件：空数据库
- 步骤：
  1. 执行首次导入
- 预期结果：
  1. 自动创建 `entity-main`
  2. 不需要额外手动初始化

### TC-DATA-002 同一 evidence 确认后产生 record 和 link

- 优先级：`P0`
- 前置条件：有待处理 evidence
- 步骤：
  1. 完成复核保存
- 预期结果：
  1. `records` 中新增对应 record
  2. `record_evidence_links` 中存在主关联

### TC-DATA-003 失败解析项可重试

- 优先级：`P0`
- 前置条件：一次解析失败
- 步骤：
  1. 保持失败 evidence 在队列中
  2. 重新进入解析页或点击重试
- 预期结果：
  1. 队列项未丢失
  2. 可继续重试

### TC-DATA-004 首页分页偏移正确

- 优先级：`P1`
- 前置条件：记录数大于 20
- 步骤：
  1. 首页加载第一页
  2. 点击 `Load More`
- 预期结果：
  1. 第二页数据按 offset 追加
  2. 不重复，不漏项

### TC-DATA-005 会话与偏好设置容错

- 优先级：`P1`
- 前置条件：AsyncStorage 中预写入非法值
- 步骤：
  1. 写入非法 theme / locale / session
  2. 启动应用
- 预期结果：
  1. theme 回退到 `system`
  2. locale 回退到 `system`
  3. 非法 session 被忽略

## 7.9 税表与模型层回归

说明：

- 这一组不是当前用户可见主流程，但仓库已有稳定自动化，建议继续纳入回归基线。

### TC-MODEL-001 Schedule C 聚合计算正确

- 优先级：`P1`
- 执行方式：自动化
- 预期结果：
  1. 收入与可抵扣支出正确聚合
  2. 关键行位金额正确

### TC-MODEL-002 Schedule SE 预览计算正确

- 优先级：`P1`
- 执行方式：自动化
- 预期结果：
  1. `grossReceipts / deductibleExpenses / netProfit` 正确

### TC-MODEL-003 1040 / 1099-NEC / Schedule SE / Schedule C 模型回归

- 优先级：`P1`
- 执行方式：自动化
- 预期结果：
  1. 当前 JSON 布局、字段映射与模型逻辑不回退

## 8. 当前已知缺陷与执行备注

以下问题来自当前 `dev_peanut` 实现，执行测试时应单独记录，不应和测试操作错误混淆：

1. `Ledger` Tab 使用静态 mock 数据，与首页真实本地账本数据不一致。
2. `Ledger` 页顶部三段切换 `明细汇总 / 资产负债 / 现金流` 目前没有真实交互逻辑。
3. 首页和 Ledger 页存在中英文硬编码混用，切换语言后会出现部分文案不跟随变化。
4. 首页右上角通知按钮无实际点击行为。

## 9. 自动化覆盖映射

当前已存在且可用的自动化：

- `/Users/test/CreatorCFO/apps/mobile/tests/feat_upload.int.test.ts`
  - 覆盖上传入库、Live Photo 配对、失败解析保留、确认入账
- `/Users/test/CreatorCFO/apps/mobile/tests/feat_upload_home.test.ts`
  - 覆盖首页聚合、趋势、分页
- `/Users/test/CreatorCFO/apps/mobile/tests/app-shell-model.test.ts`
  - 覆盖主题/语言回退、会话解析
- `/Users/test/CreatorCFO/apps/mobile/tests/tab-config.test.ts`
  - 覆盖三 Tab 配置
- `/Users/test/CreatorCFO/apps/mobile/tests/login-copy.test.ts`
  - 覆盖登录文案结构
- `/Users/test/CreatorCFO/apps/mobile/tests/database-demo.test.ts`
  - 覆盖本地记录与税表聚合
- `/Users/test/CreatorCFO/apps/mobile/tests/form-1040-model.test.ts`
- `/Users/test/CreatorCFO/apps/mobile/tests/form-1099-nec-model.test.ts`
- `/Users/test/CreatorCFO/apps/mobile/tests/form-schedule-c-model.test.ts`
- `/Users/test/CreatorCFO/apps/mobile/tests/form-schedule-se-model.test.ts`

## 10. 当前自动化缺口

建议下一步补齐这些自动化：

- 首页组件级交互测试
  - 下拉刷新
  - `Load More`
  - `New Records / See All`
- 上传页组件测试
  - 文件选择取消
  - 相册权限拒绝
  - busy 态防重入
- 解析页组件测试
  - 字段编辑确认弹窗
  - 必填项校验
  - 分类切换
  - 最后一条保存后自动返回 Ledger
- Profile 组件测试
  - 主题切换持久化
  - 语言切换持久化
  - API 设置保存/清空
  - 退出登录
- 路由级 smoke
  - 未登录重定向
  - 已登录进入 Tabs

## 11. 发布退出标准

### 11.1 必须满足

- 所有 `P0` 用例通过，或仅剩已签字接受的已知缺陷
- `pnpm --filter @creator-cfo/mobile test` 全绿
- 上传 -> 解析 -> 保存 -> 首页联动 这条主链路可完整走通
- 退出登录后可正确回到登录页
- 主题、语言、API 设置重启后保持一致

### 11.2 建议满足

- `P1` 用例全部通过
- Ledger 已知缺陷至少被明确记录在 issue / PR 说明中
- 真机完成一次 Apple 登录成功路径验证

## 12. 推荐执行顺序

建议每次回归按以下顺序执行：

1. 登录与会话
2. 主壳层与 Tab
3. 首页基础展示
4. 上传导入
5. 解析复核
6. 首页联动验证
7. Profile 设置与退出登录
8. 自动化回归

这样能最快暴露阻塞问题，也最贴近当前产品主流程。
