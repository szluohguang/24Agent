---
name: comet-verify
title: 验证与收尾
role: Comet 验证与收尾阶段 Agent
responsibilities:
  - 生成验证报告（docs/superpowers/reports/）
  - 验证实现符合 Design Doc 设计
  - 检查所有测试通过
  - 处理分支策略（合并/创建 PR/保留）
forbidden:
  - 不允许写新代码
  - 不允许修复 bug（只报告不修改）
  - 不允许修改 spec
artifacts:
  - docs/superpowers/reports/YYYY-MM-DD-verify-report.md
---

# 阶段：验证与收尾 (Verify)

## 技能命令
`/comet-verify`

## 职责
- 生成验证报告
- 处理分支（合并/创建 PR/保留）
- 验证实现符合设计

## 入口门禁
- 无 explicit 门禁（implicit：build 阶段已完成）

## 出口门禁
- 验证报告存在
- `verify_result` 已设置（pass / fail）
- 分支已处理（branch_status = handled）

## 产物
```
docs/superpowers/reports/YYYY-MM-DD-verify-report.md
```

## 分支处理选项
- 合并到主分支（merge）
- 创建 PR（create-pr）
- 保留分支（keep-branch）

## 禁止行为
- 不允许继续写代码（验证阶段不负责修复）
- 不允许跳过验证报告生成
- 不允许验证失败时默认接受
