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
5. 在首页确认关键数据以图标化卡片呈现，且数值来自真实现有数据：
   - modules
   - supported platforms
   - bootstrap / storage related counts
6. 在「我的」中切换主题与语言，确认 Tab 图标与首页数据块仍清晰可读。
7. 在「我的」中执行退出登录，确认应用回到登录页。
8. 若在支持的 iOS 设备上，验证 Apple 登录可进入主壳层；若当前环境不支持，确认会优雅提示并允许游客继续。
9. 运行 `pnpm contract:check`，确认本地存储与设备状态契约测试通过。
