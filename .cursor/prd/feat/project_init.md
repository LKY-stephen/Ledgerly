# 项目架构初始化

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/creator-cfo-always.mdc`。

## 存储与契约影响

- **结构化 DB / 文件仓**：初始化阶段多为 `需改契约`（首版 storage/contracts 与文档）
- **须同步的工件**（本需求目标）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试  
- **说明**：以仓库当前 `AGENTS.md` 与 `.cursor/context/main.md`（及已有 `*_context.md` 归档）为准建立基线。

## 需求描述

- 为多平台收入创作者提供统一财务控制台（收入归集、开票、成本、税务预估、现金流、stablecoin 收款等方向的聚合产品）。
- 按指南与仓库真源搭建项目架构，目录可为空或默认状态。
- 定义代码规范、测试与目录结构；架构落地后在 README 中梳理目录说明。

## 验收标准

- [ ] 架构初始化
- [ ] 符合指南与仓库真源
- [ ] 代码规范、格式、目录结构、测试用例
- [ ] README 规范、清晰

## 参考 Skill

- `.cursor/skills/project`
- 移动端相关时：`.cursor/skills/project/expo`（见摘要 **Skill 选用**）

## 本需求补充

- 架构正确、代码规范、指南对齐；验证方式与门禁见摘要 **交付前检查** 与 **Feat PRD 公用约定**。
