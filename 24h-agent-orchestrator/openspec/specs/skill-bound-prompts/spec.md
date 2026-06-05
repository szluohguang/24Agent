# Skill-Bound Prompts — 按阶段注入职责专属 Prompt

## ADDED Requirements

### Requirement: SkillLoader reads skill.md with frontmatter
The system SHALL provide a `SkillLoader` class that reads phase skill files from `skills/comet/phases/<phase>.skill.md` and parses the YAML frontmatter into structured data.

#### Scenario: Load open skill
- **WHEN** `SkillLoader.load('open')` is called
- **THEN** it reads `skills/comet/phases/open.skill.md`
- **THEN** parses the YAML frontmatter extracting: name, title, role, responsibilities, forbidden, artifacts
- **THEN** returns a structured `SkillDef` object

#### Scenario: Missing skill file
- **WHEN** `SkillLoader.load('nonexistent')` is called
- **THEN** returns a default generic skill definition
- **THEN** logs a warning

### Requirement: Prompt templates per phase
The system SHALL provide a `PromptTemplates` module with a `render(task, skill, projectContext)` function that generates a phase-specific ACP session prompt.

#### Scenario: Open phase prompt
- **WHEN** rendering prompt for open phase
- **THEN** prompt begins with "你是 Comet 开启阶段 Agent"
- **THEN** includes all responsibilities from open.skill.md
- **THEN** includes all forbidden actions from open.skill.md
- **THEN** lists expected artifacts

#### Scenario: Build phase prompt
- **WHEN** rendering prompt for build phase
- **THEN** prompt begins with "你是 Comet 计划与构建阶段 Agent"
- **THEN** references the Design Doc as the source of truth
- **THEN** instructs to implement tasks from tasks.md
- **THEN** includes test requirements

#### Scenario: Verify phase prompt
- **WHEN** rendering prompt for verify phase
- **THEN** prompt says should NOT write new code
- **THEN** instructs to generate verification report
- **THEN** includes branch handling instructions

### Requirement: dispatchTask injects phase prompt
The system SHALL modify `dispatchTask()` in core.ts to inject the phase-specific prompt instead of the generic one.

#### Scenario: Phase prompt sent
- **WHEN** `dispatchTask('task-123')` is called
- **AND** task-123 has `cometPhase: 'open'`
- **THEN** `sendTaskPrompt()` is called with the open-phase rendered prompt
- **THEN** the prompt includes the skill's forbidden actions

#### Scenario: No cometPhase falls back
- **WHEN** `dispatchTask('task-456')` is called
- **AND** task-456 has no `cometPhase`
- **THEN** the original generic prompt is used as fallback

### Requirement: Skill structure with YAML frontmatter
Each phase skill.md file SHALL contain a YAML frontmatter block between `---` separators with the following fields: name, title, role, responsibilities (list), forbidden (list), artifacts (list).

#### Scenario: Valid frontmatter
- **WHEN** SkillLoader parses a skill.md with proper frontmatter
- **THEN** extracts all fields correctly
- **THEN** ignores markdown body after the frontmatter

#### Scenario: Missing frontmatter
- **WHEN** a skill.md has no frontmatter
- **THEN** SkillLoader falls back to parsing the markdown body
- **THEN** uses heading-based extraction (## 职责, ## 禁止, ## 产物)
