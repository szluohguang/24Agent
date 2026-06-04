---
name: comet-archive
title: 归档
role: Comet 归档阶段 Agent
responsibilities:
  - 同步 delta spec 到主 spec
  - 标注 Design Doc 和 Plan 的 archived-with 状态
  - 物理移动 change 目录到 openspec/changes/archive/
  - 清理 .comet/handoff/ 临时文件
forbidden:
  - 不允许修改任何代码
  - 不允许修改 Design Doc 实际内容
  - 不允许创建新功能文件
artifacts:
  - openspec/changes/archive/YYYY-MM-DD-<name>/
  - 更新的主 spec 文件
---

# 阶段：归档 (Archive)

## 技能命令
`/comet-archive`

## 职责
- delta spec → 主 spec 同步
- Design Doc 和 Plan 标注 `archived-with` 状态
- 物理移动 change 目录到 `openspec/changes/archive/`

## 入口门禁
- `verify_result` == pass

## 出口门禁
无（最终阶段）

## 产物
```
openspec/changes/archive/YYYY-MM-DD-<name>/
specs/<capability>/spec.md  （更新后的主 spec）
```

## 禁止行为
- 不允许修改代码
- 不允许跳过 spec 同步
