# Harness Review: feat_upload

## 基本信息
- PRD: `.cursor/prd/feat/feat_upload.md`
- 口径来源: `AGENTS.md`、`.cursor/context/main.md`、`docs/contracts/`、`packages/storage/src/contracts.ts`、`packages/schemas/src/index.ts`
- 当前结论: **已通过（Harness 收口完成）**

## 范围包含
- 本地文件上传（单文件与批量）
- 本地文件重命名与存储到文件仓（含 Live Photo 配对）
- `evidences` 扩展字段与解析状态追踪
- 解析结果可编辑与提交（写入 `records`）
- 首页数据从 SQLite `records` 聚合展示（含刷新/加载更多）
- iOS 原生 OCR（Apple Vision），Android/Web 规则解析回退
- 质量门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke`

## 明确不包含
- 云端备份、文件加密、跨设备同步
- OCR 模型训练、云端解析服务、手写识别
- Android 原生 OCR
- 云 OCR（如 Document AI）
- PDF 原生 OCR（本期仅规则解析回退）
- Expo Go 作为 OCR 运行目标（需 iOS dev build）

## 锁定口径 / 假设
- **iOS OCR only**：仅 iOS 侧接入原生 OCR（Apple Vision）。
- **Android/Web fallback**：Android 与 Web 维持规则解析回退。
- **PDF fallback**：PDF 不走 OCR，仅规则解析。
- **dev build required**：iOS OCR 需 Expo development build，不再要求 Expo Go。
- **默认实体**：统一使用本地主实体 `entity-main` 作为上传/解析/展示的归属。

## 需求拆解与进度表
> 状态枚举：`未开始` / `进行中` / `待验收` / `已通过` / `已打回` / `已搁置`

| 编号 | 需求 / 验收项 | 状态 | 证据 | 阻塞 / 风险 | 备注 |
| --- | --- | --- | --- | --- | --- |
| A1 | 文件上传：支持单文件与批量上传 | 已通过 | `apps/mobile/src/features/ledger/ledger-upload-screen.tsx` + `ledger-runtime.native.ts` / `ledger-runtime.web.ts` | iOS 真机仍需手工复核 | 移动端批量语义落地为多文件/多照片选择 |
| A2 | 文件存储：重命名 + 规范化路径写入文件仓 | 已通过 | `packages/storage/src/contracts.ts` + `apps/mobile/tests/feat_upload.int.test.ts` | iOS 真机文件系统需手工复核 | Live Photo 单 evidence / 双 evidence_files 已覆盖 |
| A3 | `evidences` 扩展字段 + `parse_status` + `extracted_data` | 已通过 | `packages/storage/src/contracts.ts` + `packages/storage/tests/contracts.test.ts` | - | 文档与测试同步完成 |
| A4 | 解析流程：自动/手动触发解析、可编辑列表、状态追踪 | 已通过 | `ledger-parse-screen.tsx` + `use-ledger-parse-queue.ts` + `feat_upload.int.test.ts` | iOS OCR 真机仍需手工复核 | iOS OCR + fallback 已分平台接入 |
| A5 | 提交逻辑：必填验证与 `records` 持久化 | 已通过 | `ledger-store.ts` + `feat_upload.int.test.ts` | - | 最后一项返回 Ledger 已接线 |
| A6 | 首页展示：金额卡、柱状图、明细列表 | 已通过 | `home-screen.tsx` + `home-data.ts` + `feat_upload_home.test.ts` | 真实设备交互需手工复核 | 刷新 / 加载更多已接入 |
| A7 | 存储契约同步：`contracts.ts` / `local-storage.md` / `schemas` | 已通过 | 三处文件 diff + `pnpm contract:check` | - | schema-first 已执行 |
| A8 | 自动化测试覆盖上传/解析/持久化 | 已通过 | `apps/mobile/tests/feat_upload.int.test.ts` + `feat_upload_home.test.ts` | - | 阻塞级场景已补主干测试 |
| A9 | 门禁检查全部通过 | 已通过 | `pnpm lint` / `typecheck` / `test` / `build` / `contract:check` / `smoke` | - | 全绿 |
| A10 | 冒烟：iOS 设备完整流程 | 待验收 | `tests/smoke/README.md` 已补路径 | 需 iOS dev build 手工执行 | 自动化部分已准备完毕 |

## 当前阻塞与风险
- iOS OCR 需 dev build；Expo Go 不能作为 OCR 运行目标。
- PDF 仅规则解析回退（与 PRD 的“自动解析”存在范围缩减，需要明确验收口径）。
- 批量上传在移动端是多文件/多照片选择，不保证“目录选择”语义。

## 证据清单占位
- 自动化测试日志：`pnpm test`、`pnpm contract:check`、`pnpm smoke`
- 契约变更：`packages/storage/src/contracts.ts`、`packages/schemas/src/index.ts`、`docs/contracts/local-storage.md`
- iOS dev build OCR 冒烟路径：`tests/smoke/README.md`
- 首页数据聚合验证：`apps/mobile/tests/feat_upload_home.test.ts`

## 汇总
已通过条数 / 总条数：**9 / 10**  
当前主阻塞：**A10 仍需 iOS dev build 手工冒烟证据**  
下一步：按 `tests/smoke/README.md` 在 iOS development build 上执行真实 OCR 路径并补截图/录像。
