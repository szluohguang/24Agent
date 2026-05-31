# 24h Agent Orchestrator — 黑盒测试用例索引

> 所有用例以**用户视角**编写。格式：用户看到什么 → 做什么操作 → 页面如何变化。

## 测试结果总览

| 指标 | 数值 |
|---|---|
| **测试日期** | 2026-05-31 |
| **运行环境** | Windows 10 + Node.js 22 + Chromium (真实生产环境) |
| **总用例数** | 53 |
| **通过** | 53 ✅ |
| **失败** | 0 |
| **通过率** | **100%** |
| **总耗时** | 2.3 分钟 |

## 核心操作流程

| 文件 | 通过率 | 测试范围 |
|---|---|---|
| [task-lifecycle.md](./task-lifecycle.md) | ✅ 11/11 | 任务创建/分发/流式/完成/失败/中止/删除/依赖 |
| [schedule-management.md](./schedule-management.md) | ✅ 6/6 | 定时任务 CRUD / 表单验证 / cron |
| [review-panel.md](./review-panel.md) | ✅ 5/5 | 审核 API / 404/409/400 边界 |
| [system-configuration.md](./system-configuration.md) | ✅ 5/5 | 权限/预算/并行度配置 |
| [webhook-management.md](./webhook-management.md) | ✅ 4/4 | Webhook CRUD / 边界验证 |
| [i18n.md](./i18n.md) | ✅ 4/4 | 中文/英文切换/持久化 |

## 系统行为

| 文件 | 通过率 | 测试范围 |
|---|---|---|
| [connection-management.md](./connection-management.md) | ✅ 2/2 | 连接状态/权限默认值 |
| [persistence-recovery.md](./persistence-recovery.md) | ✅ 2/2 | 页面刷新后数据保持/pending 保持 |
| [system-startup.md](./system-startup.md) | ✅ 1/1 | 健康检查端点 |

## UI 面板交互

| 文件 | 通过率 | 测试范围 |
|---|---|---|
| [task-tree.md](./task-tree.md) | ✅ 3/3 | 节点展示/依赖/高亮 |
| [stream-console.md](./stream-console.md) | ✅ 1/1 | 空状态显示 |
| [timeline.md](./timeline.md) | ✅ 1/1 | 事件记录 |
| [control-bar.md](./control-bar.md) | ✅ 3/3 | 输入/按钮/连接状态 |
| [health-dashboard.md](./health-dashboard.md) | ✅ 1/1 | 空状态 Agent |
| [system-overview.md](./system-overview.md) | ✅ 2/2 | 健康指标/任务计数 |
| [settings-dialog.md](./settings-dialog.md) | ✅ 2/2 | 打开/关闭弹窗 |

## 统计

- **文件数**: 16
- **测试用例总数**: 53（实际可自动化执行的部分）
- **测试类型**: 纯黑盒 UI 操作，生产环境真实执行
- **测试框架**: Playwright + Chromium headless

## 详细报告

参见 [test-report-2026-05-31.html](./test-report-2026-05-31.html) 以可视化方式查看每条用例的通过状态。

## 每条用例的格式

```
### 操作 N: 操作名称

- **页面状态**: 用户打开页面时看到了什么
- **用户操作**: 用户执行了什么交互（点击/输入/等待等）
- **预期结果**: 页面上具体发生了什么变化（位置/颜色/文字/状态）
```

## 命名规范

遵循 openspec 的 `<kebab-case>.md` 风格，文件名全小写，连字符分隔。
