# feat_res_opt Harness Review（新版）

## 0. 审查基线

- PRD：`.cursor/prd/feat/res_opt.md`
- 工作流：`.cursor/rules/work_flow.md`
- 守门口径：
  1. 主协议必须是双接口：`/api/parse-origin-data` + `/api/map-evidence-scheme`
  2. `scheme` 模板必须来自 `records` 整表字段，禁止按页面编辑字段裁剪
  3. 不改 SQLite schema
  4. 无证据不得标通过

## 一、审查结论

- 结论：**打回修改（按新版 PRD 重建）**
- 原因：当前工作区主链路仍停留在“单接口 `parse-evidence` + `scheme/originData` 混合协议”方向，与新版 PRD 的“双接口拆分”不一致，尚不足以进入“待交付”。

## 二、可验收拆解（新版）

1. **A1 双接口落地（后端）**
   - 新增并可独立调用：`POST /api/parse-origin-data`
   - 新增并可独立调用：`POST /api/map-evidence-scheme`
   - 两接口成功/失败都返回 JSON（不允许非 JSON 混合响应）
2. **A2 协议职责收敛**
   - `parse-origin-data` 只返回 `{ originData }`
   - `map-evidence-scheme` 只返回 `{ scheme }`
   - 旧 `parse-evidence` 不再作为移动端主入口
3. **A3 scheme 模板真源**
   - `scheme` 模板由 `records` 整表字段生成
   - 不因页面仅开放部分编辑字段而裁剪模板键集合
4. **A4 客户端调用顺序**
   - 上传后固定顺序：接口 1（originData）→ 生成整表 `scheme` → 接口 2（mapped scheme）→ 表单回填
5. **A5 本地缓存与页面展示**
   - `extracted_data` 继续缓存 `originData` 与 `scheme`
   - 解析页测试区展示完整 `originData`
   - 编辑区只展示既有可编辑字段，但值来源于映射后的 `scheme`
6. **A6 契约边界**
   - 不改 SQLite schema（表结构与迁移不变）
   - 如新增/调整 DTO，需同步 `packages/schemas` 与文档说明
7. **A7 测试与门禁**
   - 双接口各至少 1 条主路径 + 1 条异常路径
   - 页面主路径 1 条（上传成功、双接口串联、回填展示）
   - 质量门禁按本仓库 Required Checks 执行

## 三、范围包含 / 不包含

### 包含

- 双接口 API 协议拆分与客户端联调
- `scheme` 模板生成器（records 整表口径）
- 解析页联动（回填 + originData 测试展示）
- 对应自动化测试与验收证据

### 不包含

- 新 OCR 能力开发
- 本地数据库表结构调整
- 文件仓 contract 重构
- 大规模 UI 重设计
- 与本需求无关的 Vercel/部署实验性改动并入交付

## 四、关键守门点（强约束）

1. 不允许继续把单接口 `parse-evidence` 作为主协议。
2. 不允许从页面 `fieldDefinitions` 反推全量 `scheme` 模板。
3. 不允许删除 `records` 系统字段来“简化” `scheme`。
4. 不允许以“前端可显示”替代接口协议验收。
5. 无测试/日志/行为证据，不得把条目标记为“已通过”。

## 五、当前工作区必须回退/重做项（单接口残留）

> 说明：Harness 仅指出方向，不执行回退操作。

1. `api/parse-evidence.ts`
   - 当前把 `scheme` 作为同接口入参并输出混合结果，不符合双接口主协议。
2. `api/_lib/openai.ts`
   - 当前内置“同次调用同时产出 `originData + scheme`”逻辑，需拆分为“纯解析”和“纯映射”两条职责。
3. `api/_lib/contracts.ts` 与 `api/_lib/types.ts`
   - 当前 DTO/输入围绕单接口 `scheme+originData` 聚合，需重构为双接口 DTO。
4. `api/parse-evidence.test.ts`
   - 当前测试断言单接口输出 `scheme + originData`，与新版验收口径冲突。
5. `packages/schemas/src/index.ts`
   - 当前 `ParseEvidenceApiSuccess` 为单接口聚合结构，需拆分为两套成功响应类型。
6. `apps/mobile/src/features/ledger/remote-parse.ts`
   - 当前只调用 `/api/parse-evidence`，必须改为按顺序调用两个新接口。
7. `apps/mobile/src/features/ledger/ledger-domain.ts`
   - 当前 `buildRemoteExtractedData` 按单响应对象兜底解析，需按双响应链路重整输入真源。

## 六、证据字段建议（供 Testor/Dev 回填）

1. **接口证据**
   - 请求样例（multipart 与 fileUrl）
   - 响应样例（成功/失败均 JSON）
   - 错误码与 message 分型
2. **scheme 真源证据**
   - `records` 字段清单快照
   - 生成的 `scheme` 键集合比对（字段数与键名一致性）
3. **页面联动证据**
   - 调用顺序日志（接口 1 再接口 2）
   - 编辑区回填截图/断言
   - `originData` 完整展示截图/断言
4. **本地持久化证据**
   - `extracted_data` 包含 `originData` 与 `scheme` 的落库样例
   - 确认保存后字段未丢失
5. **门禁证据**
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - （如本轮执行）`pnpm build` / `pnpm contract:check` / `pnpm smoke`

## 七、需求进度表（对照 PRD）

| 编号 | 验收项 | 状态 | 证据 | 阻塞 | 备注 |
| --- | --- | --- | --- | --- | --- |
| A1 | 双接口落地（parse-origin-data / map-evidence-scheme） | 已打回 | 当前仅见单接口 `parse-evidence` 链路 | B1 | 必须先完成接口拆分 |
| A2 | 协议职责收敛（接口 1 只 originData，接口 2 只 scheme） | 已打回 | 当前存在单响应聚合口径 | B1 | 禁止继续叠加单接口补丁 |
| A3 | scheme 模板来自 records 整表字段 | 未开始 | 待补模板生成器与字段对照 | B2 | 不能按页面可编辑字段裁剪 |
| A4 | 页面按接口 1→2 顺序调用并回填 | 未开始 | 待补调用链日志/测试 | B3 | 现有客户端仍指向单接口 |
| A5 | 解析页测试区完整展示 originData | 进行中 | 已有展示方向改动，但需基于双接口结果复验 | B3 | 以双接口链路实证为准 |
| A6 | 不改 SQLite schema | 待验收 | PRD 口径已锁，待最终 diff 复核 | - | 无 schema 迁移证据前不判通过 |
| A7 | 自动化覆盖与门禁 | 未开始 | 待补 API/页面主异常路径测试与命令结果 | B4 | 无证据不得通过 |

**汇总**

- 已通过：`0 / 7`
- 当前主阻塞：`B1 双接口主协议未建立，单接口残留为主路径`
- 距离可交付最低条件：先关闭 B1、B2、B3，再补齐 A7 证据链

## 八、问题分级与建议

### Blocker

- **B1 协议方向错误**：仍以单接口为主路径，违背新版 PRD。
- **B2 scheme 真源未落地**：未证明来自 `records` 整表字段。
- **B3 客户端链路未切换**：未形成“接口 1 → 接口 2”串联实证。
- **B4 测试证据缺失**：未形成双接口主/异常路径最小自动化覆盖。

### Major

- **M1 类型与实现耦合不清**：DTO 与实现仍偏单接口，后续易反复回归。
- **M2 需求外改动混入风险**：当前工作区存在多处非本需求改动，需隔离提交避免污染验收。

### Minor

- **N1 文档口径待同步**：待最终实现后统一更新 API/本地缓存说明，减少口径漂移。

## 九、汇报结果（可转发）

| 要素 | 内容 |
| --- | --- |
| 对象与范围 | `feat_res_opt`（双接口解析重构），依据 `.cursor/prd/feat/res_opt.md` 与 `.cursor/rules/work_flow.md` |
| 总结论 | **打回修改**（当前实现方向与 PRD 主协议不一致） |
| 阻塞与风险 | Blocker 4 项：协议未拆分、scheme 真源未落地、调用顺序未形成、测试证据不足 |
| 证据摘要 | 现有改动集中在单接口 `parse-evidence` 及其 DTO/客户端调用；未见双接口独立主路径证据 |
| 下一步 | 先回退/重做单接口残留 → 建立双接口 DTO 与实现 → 切换客户端串联调用 → 补测试与门禁证据 |
| 时间语义 | 结论基于当前工作区快照；后续以 Testor 复验证据与最新 diff 重新判定 |

