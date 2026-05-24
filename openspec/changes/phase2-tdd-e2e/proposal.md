## Why

Phase 1 搭建了 24h Agent Orchestrator 的完整骨架，但存在以下不足：

- **测试覆盖率极低**：仅 4 个 HTTP 服务测试，核心编排逻辑、ACP 管理、事件流、评估器均无测试
- **缺少浏览器自动化测试**：WebUI 的交互流程（任务创建、分派、中止、语言切换）无法自动验证
- **测试基础设施薄弱**：vitest 仅有基础配置，无 setup 文件、无覆盖率报告、无 mock 工厂
- **核心模块未经 TDD 验证**：orchestrator、acp-manager、event-stream、evaluator 等关键模块的边界情况和错误路径未覆盖

Phase 2 的目标是建立完整的自动化质量保障体系，确保所有核心模块通过 TDD 方式开发并通过自动化测试验证。

## Change

- 建立完整的测试基础设施（vitest 增强配置、覆盖率、setup 文件、mock 工厂）
- 为所有后端核心模块编写 TDD 单元测试
- 引入 Playwright 实现 WebUI 浏览器自动化测试
- 补充和完善现有测试（API、WebSocket）
- 确保 npm run build + typecheck + test 全部通过

**非破坏性变更**：不修改现有功能，只增加测试和配套的测试基础设施。

## Capabilities

### Added
- `tdd-infrastructure`: 测试基础设施（vitest 覆盖率、setup、mock 工厂）
- `backend-unit-tests`: 后端核心模块完整单元测试
- `browser-e2e-tests`: WebUI Playwright 浏览器自动化测试

### Modified
- 测试配置增强

## Impact

- `24h-agent-orchestrator/package.json` — 新增 devDependencies（@playwright/test, @vitest/coverage-v8 等）
- `24h-agent-orchestrator/vitest.config.ts` — 增强配置
- `24h-agent-orchestrator/src/**/__tests__/` — 新增测试文件
- `24h-agent-orchestrator/src/webui/e2e/` — 新增 Playwright E2E 测试
