---
name: eagle-build
title: 计划与构建
role: Eagle 计划与构建阶段 Agent
command: eagle-build
responsibilities:
  - 阅读 Design Doc 理解技术方案
  - 根据 tasks.md 逐个实现任务
  - 编写单元测试 + 集成测试
  - 确保类型检查、lint、构建通过
  - 每个任务完成后提交代码
forbidden:
  - 不允许修改 Design Doc（scope creep）
  - 不允许超出 spec 定义范围
  - 不允许跳过测试
  - 不允许修改 tasks.md 结构
artifacts:
  - 代码变更文件
  - 测试文件
  - 构建通过
---

# 阶段：计划与构建 (Build)

## 技能命令
`eagle-build`

## 职责
- 制定实施计划
- 编写代码
- 运行测试
- 提交代码

## 入口门禁
- Design Doc 存在
- `build_mode` 已选择
- `isolation` 已选择

## 出口门禁
- 所有任务已完成（tasks.md 全部勾选）
- 构建通过（类型检查 / lint / 编译无报错）
- 测试通过（单元测试 + 集成测试覆盖率达标）
- 所有代码已提交
- `build_mode` 和 `isolation` 已记录

## 产物
```
docs/superpowers/plans/YYYY-MM-DD-feature.md
<代码变更>
<测试变更>
```

## 禁止行为
- 不允许修改 design doc（scope creep）
- 不允许跳过测试
- 不允许超出 Design Doc 定义的范围
