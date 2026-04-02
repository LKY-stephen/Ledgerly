# feat_upload Test Plan (Testor)

## 1) 需求理解摘要

- 目标：完成本地上传 → 解析 → 记录入库 → 首页展示的完整本地优先闭环。
- 解析策略：iOS 使用原生 OCR（Apple Vision + Expo Module），Android/Web 使用规则解析 fallback。
- 数据落点：`evidences`/`evidence_files`/`record_evidence_links`/`records` 全部存于 SQLite 与本地文件仓。
- UI 约束：不改变现有视觉结构，仅接入真实数据和必要交互（刷新、加载更多、编辑确认）。

## 2) 测试范围

### 覆盖范围

- 上传：单文件、多文件（移动端多选/多照片）、Live Photo（.heic + .mov）、PDF。
- OCR 解析：
  - iOS：原生 OCR 提取文本并形成结构化候选。
  - Android/Web：规则解析 fallback。
- 解析确认与提交：必填字段校验、顺序处理、最后一项返回 Ledger。
- 数据入库：`records` + `record_evidence_links` + `evidences.extracted_data` + `parse_status`。
- 首页展示：月度收入/支出/净额、30 天收入趋势、最近 20 条记录 + 刷新/分页。
- 存储契约一致性：`contracts.ts`、`local-storage.md`、`schemas` 同步更新并通过契约测试。

### 不测范围

- Android 原生 OCR。
- 云端 OCR / Document AI。
- 跨设备同步、加密、云备份。
- 自定义日期范围、高级筛选、导出。
- PDF 原生 OCR（仅规则解析覆盖）。

## 3) 自动化测试设计

### 3.1 Storage / Contract Tests

建议新增或更新：

- `packages/storage/tests/contracts.test.ts`
  - `evidences` 新字段存在：`file_path`, `parse_status`, `extracted_data`
  - 文件仓命名规范存在（路径规则或 helper 输出验证）

### 3.2 Upload / Parse / Persist Tests

建议新增：

- `apps/mobile/tests/feat_upload.int.test.ts`（新）
  - 上传单文件：`evidences` 记录与 `evidence_files` 记录一致
  - 批量上传：多个 `evidences` 同时生成，`parse_status = pending`
  - Live Photo：同一 `evidence_id` 下两条 `evidence_files`
  - OCR 解析成功：`parse_status = parsed`，`extracted_data` 写入
  - OCR 失败：`parse_status = failed`
  - 提交入库：`records`/`record_evidence_links` 写入且字段一致

### 3.3 Home 数据聚合 Tests

建议新增：

- `apps/mobile/tests/feat_upload_home.test.ts`（新）
  - 本月收入/支出/净额计算正确
  - 30 天收入趋势只包含 `record_kind = income`
  - 最近 20 条记录正确分页与刷新

### 3.4 已有测试需更新

- `apps/mobile/tests/ledger-mocks.test.ts`：
  - 若 mock 被替换为真实数据驱动，新增断言确保 parse 字段与 UI 逻辑保持一致。

## 4) 手工冒烟路径

### iOS OCR 主路径（dev build）

1. 启动 iOS dev build。
2. 进入 Ledger → Upload。
3. 多选照片上传（含至少一张清晰收据）。
4. OCR 自动解析 → 进入 Parse Review。
5. 修改任意字段 → 保存 → 确认弹窗。
6. 提交最后一项 → 返回 Ledger。
7. 回到 Home → 顶部金额与列表应更新。

### Android/Web fallback 路径

1. 上传图片或 PDF。
2. 进入 Parse Review，看到规则解析预填。
3. 手动补全必填字段 → 提交入库。
4. Home 与 Ledger 更新一致。

## 5) 关键阻塞场景

- 上传失败：文件未写入 vault / evidences 不一致。
- OCR 失败：parse_status 未正确标记 `failed`。
- 必填字段缺失仍能提交。
- 最后一项提交未返回 Ledger。
- 首页聚合不正确或分页重复。
- `contracts.ts` / `local-storage.md` / `schemas` 未同步导致 contract:check 失败。

## 6) 测试命令

必须通过：

```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
pnpm smoke
```

## 7) 交付物

- `.cursor/testor/feat_upload_test_plan.md`（本文件）
- 自动化测试新增 / 更新
- `tests/smoke/README.md` 增补 iOS OCR 主路径条目（由 Dev 提交）
