# feat_upload_opt Harness Review

## 审查结论

- 结论：待实现后复核 / 待验收
- 当前判断：本 PRD 只允许修复既有移动端上传、落盘、解析、校对链路，不允许扩成新的后端或新的上传方案。

## 范围口径

### 包含

- 上传与本地落盘修复
- Parse API 调用修复
- 解析结果落库修复
- 校对展示视图补齐
- 配置与安全合规
- 自动化与 smoke 闭环

### 不包含

- 新 OCR 能力开发
- 新后端服务建设
- 大规模 UI 重构
- schema 重设计
- 把本仓库 `api/`、`.vercelignore`、Vercel 部署实验改动混入本 PRD

## 守门项

1. 不得先调 API 再落盘。
2. 不得硬编码线上 `baseUrl`。
3. 不得把 key 写入仓库明文。
4. 不得把本仓库 `api/` / Vercel 实验改动混进本 PRD。
5. 无证据不得标已通过。

## 需求进度表

| 编号 | 条目 | 状态 | 证据 | 阻塞 | 备注 |
| --- | --- | --- | --- | --- | --- |
| A1 | 上传与本地落盘修复 | 进行中 | 待补代码 diff、测试、smoke | 待验收 | 重点检查失败时不发 API、无半写入 DB |
| A2 | Parse API 调用修复 | 进行中 | 待补远端调用测试 | 待验收 | 必须使用环境变量，不得回退为 Settings 真源 |
| A3 | 解析结果落库修复 | 进行中 | 待补集成测试 | 待验收 | 重点检查落库失败时保留 `extracted_data` |
| A4 | 校对展示视图补齐 | 进行中 | 待补 UI 证据与 smoke | 待验收 | 复用 `ledger-parse-screen`，不新增平行页面 |
| A5 | 配置与安全合规 | 进行中 | 待补代码检查与文档 | 待验收 | key 只允许运行时环境变量透传 |
| A6 | 自动化与 smoke 闭环 | 进行中 | 待补命令结果 | 待验收 | Required Checks 未全跑完前不得标已通过 |

## 证据字段

### A1 上传与本地落盘修复

- 上传入口与代码路径
- 本地文件落盘结果
- `evidences` / `evidence_files` / `file_path` 写入结果
- 保存失败时不发 API 的证明

### A2 Parse API 调用修复

- 环境变量读取路径
- 请求构造与调用入口
- timeout / 网络异常 / 4xx / 5xx / 非法响应分型证据

### A3 解析结果落库修复

- `extracted_data` 写入结果
- `records` / `record_evidence_links` 成功路径
- 落库失败保留解析结果与可重试证据

### A4 校对展示视图补齐

- 来源文件名
- trace path
- 金额 / 日期 / 对手方 / 分类 / 备注
- `rawSummary` / `warnings` / `rawText`

### A5 配置与安全合规

- 无硬编码 `baseUrl`
- 无仓库明文 key
- 无 Settings / AsyncStorage 作为 parse 真源

### A6 自动化与 smoke 闭环

- 自动化测试文件
- smoke README 更新
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contract:check`
- `pnpm smoke`

## 风险摘要

- 当前工作区存在与本需求无关的 `api/` / Vercel 实验改动，必须隔离。
- 若任何路径仍从 Settings / AsyncStorage 读取 parse 配置，则与本轮口径冲突。
- 若 Required Checks 未通过，本需求不能收口为已完成。
