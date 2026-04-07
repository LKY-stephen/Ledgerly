# feat_upload_opt Testor Report

## 需求理解摘要

本需求是修复既有上传解析链路，不是新增 OCR、后端或重做 schema。主路径应为：

1. 选择文件
2. 本地落盘
3. 调用既有 Vercel Parse API
4. 将解析结果写入现有本地数据流
5. 在校对页完成核对并确认保存

## 测试范围

- 上传后本地文件仓落盘
- Parse API 成功与失败分型
- `extracted_data` / `parse_status` / `records` / `record_evidence_links`
- 校对页关键字段展示
- smoke 主路径

## 不测范围

- 新 OCR 能力
- 新后端服务建设
- 大规模 UI 重构
- schema 重设计

## 场景表

| ID | 场景 | 预期结果 |
| --- | --- | --- |
| P1 | 图片上传主路径 | 先本地落盘，再请求 API，成功进入 Parse Review |
| P2 | PDF 上传主路径 | 小 PDF 可完成同样链路 |
| P3 | 校对后确认保存 | 写入 `records`、`record_evidence_links`，evidence 变为 `parsed` |
| F1 | 本地落盘失败 | 不发 API，UI 给出可读错误，不留半写入 DB |
| F2 | 缺少 `baseUrl` | 返回 `missing_base_url` 类错误 |
| F3 | 缺少 key | 返回 `missing_api_key` 类错误 |
| F4 | API timeout | 返回 timeout 类错误，evidence 保持可重试 |
| F5 | 网络异常 | 返回 network error 类错误，evidence 保持可重试 |
| F6 | API 4xx | 返回 client error 类错误 |
| F7 | API 5xx | 返回 server error 类错误 |
| F8 | 非法响应 | 返回 invalid response 类错误 |
| F9 | 落库失败 | 保留 `extracted_data`，不写脏 record，可继续重试 |
| E1 | 多文件上传 | 每条 evidence 独立入队 |
| E2 | Live Photo | 保留 primary 图与关联 motion 文件 |
| E3 | 重复上传 | 相同文件可进入不同 evidence |
| E4 | 校对页字段完整性 | 可见来源文件、trace path、金额、日期、对手方、分类、备注，以及可用时的 `rawSummary` / `warnings` / `rawText` |

## 自动化测试门禁

- 至少 1 条主路径自动化测试
- 至少 1 组失败路径自动化测试
- Required Checks:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm contract:check`
  - `pnpm smoke`

## Smoke 步骤

1. 启动前设置 `EXPO_PUBLIC_PARSE_API_BASE_URL`。
2. 启动前设置 `EXPO_PUBLIC_PARSE_API_KEY`。
3. 进入 Ledger Upload。
4. 选择一张图片或一个小 PDF。
5. 确认先本地入队，再进入 Parse Review。
6. 在 `Complete Verification` 区块确认来源文件、trace path、金额、日期、对手方、分类、备注可见。
7. 确认 `rawSummary` / `warnings` / `rawText` 在有值时可见。
8. 补全 `date`、`amount`、`description` 并保存。
9. 提交最后一项后返回 Ledger。
10. 回到 Home / Ledger 确认本地数据刷新。

## 阻塞级场景

- 本地落盘失败后仍发 API
- 配置缺失不能明确分型
- timeout / 网络异常 / 4xx / 5xx / 非法响应未完成分型
- 落库失败丢失 `extracted_data` 或 evidence 被错误标记为 `parsed`
- 校对页看不到完整关键字段
