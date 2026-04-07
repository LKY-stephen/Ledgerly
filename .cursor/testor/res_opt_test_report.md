# feat_res_opt Testor 测试设计报告（双接口版）

## 1. 需求理解摘要（基于 PRD + workflow）

- 需求目标：将当前“单接口解析”改为双接口流程，拆分为 `parse-origin-data`（纯解析）与 `map-evidence-scheme`（纯映射）。
- 关键验收链路：上传文件后必须严格按 `接口1 -> 接口2` 顺序执行，再进行表单回填与测试区展示。
- 本期包含：
- `POST /api/parse-origin-data` 主路径与异常路径。
- `POST /api/map-evidence-scheme` 主路径与异常路径。
- 前端解析主链路顺序与回填行为验证。
- `scheme` 字段集合与 `records` 整表定义一致性验证。
- 解析页测试区展示完整 `originData`。
- 本期不包含：
- SQLite 表结构变更。
- 文件仓契约改造。
- UI 大改版。

## 2. 现状审视结论（当前代码库）

- 当前 API 主入口仍是 `/api/parse-evidence`，尚未形成双接口主协议。
- 当前移动端 `remote-parse` 仍直接调用 `/api/parse-evidence`，未形成“先 originData 再 scheme 映射”的强约束。
- 现有测试主要覆盖单接口协议与基础失败分型，双接口测试文件尚缺。
- 当前解析页测试区已存在 JSON 预览容器（`ledger-parse-json-preview`），可复用做 `originData` 展示验收。

## 3. 验收条件（可执行）

### 3.1 接口 1：`parse-origin-data`

- 成功场景下返回 HTTP 2xx 且响应体是合法 JSON，顶层包含 `originData`。
- 不返回 `scheme` 字段（若返回，视为契约偏移）。
- 失败场景下返回合法 JSON（包含 `error.code` 与 `error.message`），不得返回非 JSON 文本。
- 支持图片与 PDF 两类文件输入（multipart 主路径），并保持 MIME 校验。

### 3.2 接口 2：`map-evidence-scheme`

- 成功场景下返回 HTTP 2xx 且响应体是合法 JSON，顶层包含 `scheme`。
- 输入仅为 `{ scheme, originData }`，不得要求二次上传文件。
- 失败场景下返回合法 JSON（包含 `error.code` 与 `error.message`）。
- 返回的 `scheme` 必须保留输入模板键集合，不得丢键。

### 3.3 前端链路顺序与页面联动

- 上传解析链路必须先调用 `parse-origin-data`，成功后再调用 `map-evidence-scheme`。
- 接口 1 失败时不得继续调用接口 2。
- 接口 2 成功后，编辑区回填映射后的 `scheme` 值。
- 解析页测试区优先展示 `originData` 的完整 JSON（可读、可滚动、不中断页面）。

### 3.4 `scheme` 字段集合一致性

- `scheme` 模板字段必须对齐 `records` 整表字段真源（`packages/storage/src/contracts.ts` 中 `records` 表）。
- 不允许按页面可编辑字段裁剪 `scheme` 模板。
- 字段一致性至少校验以下列集合：
- `record_id`
- `entity_id`
- `record_status`
- `source_system`
- `description`
- `memo`
- `occurred_on`
- `currency`
- `amount_cents`
- `source_label`
- `target_label`
- `source_counterparty_id`
- `target_counterparty_id`
- `record_kind`
- `category_code`
- `subcategory_code`
- `tax_category_code`
- `tax_line_code`
- `business_use_bps`
- `created_at`
- `updated_at`

## 4. 测试场景设计（主路径 / 异常路径 / 边界）

### 4.1 `parse-origin-data` 场景

- 主路径 A：multipart 上传图片，返回 `{ originData }` JSON。
- 主路径 B：multipart 上传 PDF，返回 `{ originData }` JSON。
- 异常 A：缺少 `Authorization`，返回 401 JSON 错误。
- 异常 B：缺少文件或 `fileUrl`，返回 400 JSON 错误。
- 异常 C：不支持 MIME，返回 415 JSON 错误。
- 异常 D：上游 OpenAI 调用失败，返回受控 JSON 错误（不泄露内部堆栈）。
- 边界 A：超时场景返回受控 JSON（可区分 timeout）。
- 边界 B：上游返回非 JSON/不可解析内容时，接口仍返回受控 JSON 错误。

### 4.2 `map-evidence-scheme` 场景

- 主路径 A：输入完整 `{ scheme, originData }`，返回映射后的 `{ scheme }`。
- 主路径 B：`originData` 含嵌套对象/数组，映射后 `scheme` 仍保持键集合完整。
- 异常 A：缺失 `scheme`，返回 400 JSON 错误。
- 异常 B：`scheme` 非对象，返回 400 JSON 错误。
- 异常 C：缺失 `originData`，返回 400 JSON 错误。
- 异常 D：上游映射失败，返回 5xx JSON 错误且结构稳定。
- 边界 A：`scheme` 含未知键时，返回中应保留该键且值可为空。

### 4.3 前端联动场景

- 主路径：上传成功后，调用顺序为接口 1 再接口 2，编辑表单被映射值回填，测试区显示 `originData`。
- 异常 A：接口 1 失败，页面显示可读错误，不触发接口 2。
- 异常 B：接口 2 失败，保留 `originData` 展示并提示可重试。
- 异常 C：任一接口返回非 JSON，页面不崩溃并显示受控错误。
- 边界 A：`scheme` 中字段多于页面可编辑字段时，页面仅展示既有可编辑字段，但回填来源仍是完整 `scheme`。

## 5. 阻塞级失败场景（Blocker）

- Blocker-1：任一双接口返回非 JSON（与 PRD“成功/失败都 JSON”冲突）。
- Blocker-2：上传主链路没有严格执行 `接口1 -> 接口2` 顺序。
- Blocker-3：`scheme` 模板字段集合与 `records` 整表不一致（丢系统字段或被页面字段裁剪）。
- Blocker-4：解析页测试区未展示 `originData` 或展示内容与缓存不一致。
- Blocker-5：接口 1 失败后仍调用接口 2，导致无效映射请求。

## 6. 自动化测试建议（文件级）

- API：
- `api/parse-origin-data.test.ts`：主路径 2 条（图片/PDF）+ 异常至少 2 条（鉴权、非法输入/上游失败）。
- `api/map-evidence-scheme.test.ts`：主路径 1 条 + 异常至少 2 条（缺字段、非法 JSON/上游失败）。
- Mobile：
- `apps/mobile/tests/remote-parse.test.ts`：改为验证双接口调用顺序与错误分层。
- `apps/mobile/tests/feat_upload.int.test.ts`：补“接口 1 成功 + 接口 2 成功 + 本地 extracted_data 写入 originData/scheme”链路。
- `apps/mobile/tests/ledger-domain.test.ts`：补“测试区优先展示 originData”与缺失回退行为。

## 7. 冒烟路径（手工）

- 前置：设置 `EXPO_PUBLIC_PARSE_API_BASE_URL`、`EXPO_PUBLIC_PARSE_API_KEY`，启动移动端开发环境。
- 步骤 1：上传 1 个图片或小 PDF。
- 步骤 2：确认网络请求顺序为 `POST /api/parse-origin-data` 后 `POST /api/map-evidence-scheme`。
- 步骤 3：进入解析页，检查编辑区字段已被映射回填。
- 步骤 4：检查测试区显示完整 `originData` JSON。
- 步骤 5：触发一次失败用例（如临时错误 key），确认错误文案可读且页面不崩溃。

## 8. 通过门禁（本期建议口径）

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contract:check`
- `pnpm smoke`

## 9. 风险与待确认

- 风险：`scheme` 字段命名是否严格使用 `records` 的 snake_case 列名，需在实现前锁定；当前代码中编辑字段多为业务 camelCase。
- 风险：当前仓库仍有单接口遗留逻辑，若不先切主入口，双接口测试会出现“通过但未命中新链路”的假阳性。
- 结论：本报告可作为 Testor 阶段执行基线；在 Dev 完成双接口改造后，按本报告落地自动化并出复验结果。

