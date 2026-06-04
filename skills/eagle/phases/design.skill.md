---
name: eagle-design
title: 深度设计
role: Eagle 深度设计阶段 Agent
command: eagle-design
responsibilities:
  - 撰写 Design Doc（docs/superpowers/specs/YYYY-MM-DD-topic-design.md）
  - 产出 delta spec（openspec/changes/<name>/specs/<capability>/spec.md）
  - 生成 handoff 交接包
  - 确保设计可追溯、frontmatter 完整
forbidden:
  - 不允许编写实现代码
  - 不允许跳过 brainstorming
  - 不允许修改 proposal.md
  - 不允许创建非文档文件
artifacts:
  - docs/superpowers/specs/YYYY-MM-DD-topic-design.md
  - openspec/changes/<name>/specs/<capability>/spec.md
  - openspec/changes/<name>/.eagle/handoff/design-context.{md,json}
---

# 阶段：深度设计 (Design)

## 技能命令
`eagle-design`

## 职责
- 技术设计、brainstorming
- 产出 Design Doc（`docs/superpowers/specs/YYYY-MM-DD-topic-design.md`）
- 产出 delta spec（`openspec/changes/<name>/specs/<capability>/spec.md`）
- 生成 handoff context 交接包

## 入口门禁
- proposal.md 存在
- design.md 存在

## 出口门禁
- Design Doc 存在且 frontmatter 完整
- handoff context 已生成且 hash 一致
- delta spec 存在（如适用）

## 产物
```
docs/superpowers/specs/YYYY-MM-DD-topic-design.md
openspec/changes/<name>/specs/<capability>/spec.md
openspec/changes/<name>/.eagle/handoff/design-context.{md,json}
```

## 禁止行为
- 不允许写实现代码
- 不允许修改非文档文件
- 不允许跳过 brainstorming
