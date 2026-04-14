# Smoke Checklist

## 自动化（CI / Agent 优先）

在仓库根目录、依赖已安装的前提下：

```bash
pnpm smoke
```

说明：`pnpm smoke` 通过 Turbo 先跑依赖的 `build`，再执行各工作区的 `smoke` 任务。移动端包（`@creator-cfo/mobile`）当前将 `smoke` 映射为 `pnpm test`（Vitest）。可与下列 **Required Checks** 一起作为回归入口：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
pnpm smoke
```

## 手工（设备 / 模拟器）

在自动化通过仍不足时，或验证真实运行时：

1. 运行 `pnpm --filter @creator-cfo/mobile start`，在 iOS development build、Android 或 Web 中打开应用。
2. 冷启动时确认先进入登录页，并能看到：
   - Apple 登录入口
   - 右上角「暂不登录」
   - 本地优先说明文案
3. 点击「暂不登录」，确认进入三个底部 Tab：
   - 首页
   - 记账
   - 设置
4. 确认三个 Tab 均有清晰图标，切换时当前图标会出现轻微选中反馈。
5. 在首页确认 dashboard 壳层正常渲染，并能看到：
   - 顶部 `Monthly Profit` 与本月净额
   - `Income / Outflow / Net` 三个本月指标
   - `New Records` 主按钮
   - `30-Day Income Trend` 图表
   - `Recent Activity` 区块
6. 确认首页不再出现以下旧模块或 CTA：
   - `download report`
   - `Action Queue`
7. 保持 light 主题，依次检查以下交互控件无“浅底浅字”或“贴底发灰”问题：
   - 登录页右上角「暂不登录」
   - 登录页游客入口与 Apple 按钮/降级按钮
   - 底部三个 Tab 的 icon 与 label（含 active / inactive）
   - 「设置」页主题/语言 Pill 与退出登录按钮
8. 切到 dark 主题，抽样复查：
   - 底部三个 Tab 的 active / inactive 对比度
   - 登录页主按钮与游客入口
   - 「设置」页主题/语言 Pill 与退出登录按钮
9. 确认数据库 demo 已完全从产品入口移除：
   - 登录页不再出现「Open database demo」之类的 CTA
   - 首页不再出现数据库 CRUD、字段选择 chip、记录选中态或报告卡片等 demo 区块
   - 主壳层三个 Tab 内不存在通往 database demo / database hooks demo 的入口
10. 在启动移动端前设置环境变量，再打开 Ledger 上传与解析子流程，确认前端直连 OpenAI 主路径可用：
   - 运行前提供 `EXPO_PUBLIC_OPENAI_BASE_URL`（可省略，默认 `https://api.openai.com/v1`）
   - 如需覆盖模型，提供 `EXPO_PUBLIC_OPENAI_MODEL`
   - 在应用 Settings 中填写 OpenAI API key
   - Upload workspace 支持 `Select Photos`、`Take Photo` 与 `Select Files`
   - 点击 `Take Photo` 首次会弹出相机权限请求：
     - 授权后打开系统相机，拍照完成后自动进入 Parse Review
     - 拒绝权限后显示错误提示（中文环境显示中文提示）
     - 拍照后点击取消（Cancel）时正常返回上传页，无异常
   - 选择一张清晰收据图片或一个小 PDF 后，会进入 Parse Review
   - Parse Review 可见 batch state、raw parse JSON、planner summary、write proposals、candidate record
   - `Amount`、`Date`、`Source`、`Target` 可编辑
   - 若存在 `create_counterparty` proposal，先审批该 proposal，再审批 `persist_candidate_record`
   - 最终审批通过后会写入本地 `records`，Home 指标会刷新
11. 在对象存储联调场景下，确认 `fileUrl` 入口可用：
   - 客户端可先拉取 `fileUrl` 内容，再直连 OpenAI 解析
   - 缺少 OpenAI API key 会有明确错误提示
   - OpenAI `429`、`5xx`、响应 JSON 异常均会有明确错误提示
12. 在任一客户端完成保存后，确认本地数据展示仍正确：
   - 可手动补全必填字段并成功保存
   - 保存后 Home 的月度指标、趋势图与 Recent Activity 会刷新到最新本地数据
13. 若当前构建仍暴露 Schedule C / Schedule SE 预览入口，从其现有入口打开并确认税年切换会触发真实数据重载：
   - 切换当前年与上一年时，预览内税年按钮会变化
   - Schedule C / Schedule SE 结果会根据所选税年刷新，而不是只改标题文字
   - 本地数据库中 `tax_lines_v` 可按 `entity_id`、`tax_year`、`schedule_code`、`line_key`、`line_status` 过滤查询，并与预览主数据一致
14. 在「设置」中切换主题与语言，确认 Tab 图标、首页数据块与设置控件仍清晰可读。
15. 在「设置」中执行退出登录，确认应用回到登录页。
16. 若在支持的 iOS 设备上，验证 Apple 登录可进入主壳层；若当前环境不支持，确认会优雅提示并允许游客继续。
17. 运行 `pnpm contract:check`，确认本地存储与设备状态契约测试通过。
18. 在「设置」页确认 Profile 模块可见（Name / Email / Phone 三个字段），输入后点击 Save Profile，退出重进后回显正确。设置页不再出现 "Vercel API Base URL" 或等价配置项。上传文件 → Map to Records → 确认 planner 不报错且 source / target 映射合理（若已填写 Profile，source 应优先归属到 Profile 主体）。
19. 在「设置」页 AI Provider 区块确认可切换 OpenAI / Gemini：
    - 默认选中 OpenAI，显示 OpenAI API Key 输入框
    - 切换到 Gemini 后，显示 Gemini API Key 输入框
    - 填入对应 API key 并点击 Save，退出重进后 provider 和 key 均回显正确
    - 切换 provider 不会清除另一方 key
    - 选中 Gemini 并填入有效 Gemini key 后，上传文件 → Parse → 确认使用 Gemini 解析（model 字段应显示 gemini 相关模型）
    - 切回 OpenAI 并填入有效 OpenAI key 后，上传文件 → Parse → 确认使用 OpenAI 解析
