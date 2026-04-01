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

1. 运行 `pnpm --filter @creator-cfo/mobile start`，在 Expo Go、iOS、Android 或 Web 中打开应用。
2. 冷启动时确认先进入登录页，并能看到：
   - Apple 登录入口
   - 右上角「暂不登录」
   - 本地优先说明文案
3. 点击「暂不登录」，确认进入四个底部 Tab：
   - 首页
   - 记账
   - 发现
   - 我的
4. 确认四个 Tab 均有清晰图标，切换时当前图标会出现轻微选中反馈。
5. 在首页确认 dashboard 壳层正常渲染，并能看到：
   - product modules
   - supported creator platforms
   - local persistence architecture cards
6. 确认本地 bootstrap 区域明确反映 SQLite 与 version-2 file-vault 的就绪状态；关键数据以图标化卡片呈现，且数值来自真实现有数据：
   - modules
   - supported platforms
   - bootstrap / storage related counts
7. 保持 light 主题，依次检查以下交互控件无“浅底浅字”或“贴底发灰”问题：
   - 登录页右上角「暂不登录」
   - 登录页游客入口与 Apple 按钮/降级按钮
   - 底部四个 Tab 的 icon 与 label（含 active / inactive）
   - Discover 列表卡片、分类 Pill 与「Load more」按钮
   - 「我的」页主题/语言 Pill 与退出登录按钮
8. 切到 dark 主题，抽样复查：
   - 底部四个 Tab 的 active / inactive 对比度
   - 登录页主按钮与游客入口
   - Discover 列表卡片、分类 Pill 与「Load more」按钮可读性
   - 「我的」页主题/语言 Pill 与退出登录按钮
9. 确认数据库 demo 已完全从产品入口移除：
   - 登录页不再出现「Open database demo」之类的 CTA
   - 首页不再出现数据库 CRUD、字段选择 chip、记录选中态或报告卡片等 demo 区块
   - 主壳层四个 Tab 内不存在通往 database demo / database hooks demo 的入口
10. 打开 Discover，确认当前保留的信息流路径正常：
   - 列表首屏能渲染 hero、文章卡片与「Load more」按钮
   - 下拉刷新后列表会重置并继续可用
   - 打开任意文章详情后可返回列表继续浏览
11. 若当前构建仍暴露 Schedule C / Schedule SE 预览入口，从其现有入口打开并确认税年切换会触发真实数据重载：
   - 切换当前年与上一年时，预览内税年按钮会变化
   - Schedule C / Schedule SE 结果会根据所选税年刷新，而不是只改标题文字
   - 本地数据库中 `tax_lines_v` 可按 `entity_id`、`tax_year`、`schedule_code`、`line_key`、`line_status` 过滤查询，并与预览主数据一致
12. 在「我的」中切换主题与语言，确认 Tab 图标、首页数据块与设置控件仍清晰可读。
13. 在「我的」中执行退出登录，确认应用回到登录页。
14. 若在支持的 iOS 设备上，验证 Apple 登录可进入主壳层；若当前环境不支持，确认会优雅提示并允许游客继续。
15. 运行 `pnpm contract:check`，确认本地存储与设备状态契约测试通过。
