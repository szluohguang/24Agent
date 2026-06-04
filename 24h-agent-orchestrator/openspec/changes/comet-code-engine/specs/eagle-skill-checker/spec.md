# Eagle Skill Checker — 项目目录初始化与技能完整性校验

## ADDED Requirements

### Requirement: OpenSpec init check
When a user sets a project directory, the system SHALL verify that OpenSpec has been initialized in that directory by checking for `.openspec.yaml`.

#### Scenario: OpenSpec already initialized
- **WHEN** user sets project directory
- **AND** `{projectDir}/.openspec.yaml` exists
- **THEN** returns `{ openspecReady: true }`

#### Scenario: OpenSpec not initialized
- **WHEN** user sets project directory
- **AND** `{projectDir}/.openspec.yaml` does not exist
- **THEN** returns `{ openspecReady: false }`
- **THEN** frontend shows prompt: "项目尚未初始化 OpenSpec，需要初始化吗？"
- **THEN** has buttons: [初始化] [跳过]

### Requirement: openspec init execution
When the user clicks initialize, the system SHALL execute `openspec init` in the project directory.

#### Scenario: Init succeeds
- **WHEN** user clicks "初始化"
- **THEN** `POST /api/project/init-openspec` is called
- **THEN** server executes `openspec init {projectDir}`
- **THEN** returns `{ success: true }`

### Requirement: Eagle skill installation to .opencode/skills
The system SHALL install Eagle skill files to `{projectDir}/.opencode/skills/eagle/` so that the opencode skill tool can resolve them.

#### Scenario: Install to .opencode
- **WHEN** `POST /api/project/init-skills` is called
- **THEN** copies `{orchestratorDir}/skills/eagle/` → `{projectDir}/.opencode/skills/eagle/`
- **THEN** copies `{orchestratorDir}/eagle-orchestration.json` → `{projectDir}/`
- **THEN** verifies all files were copied correctly
- **THEN** returns `{ success: true, files: ['.opencode/skills/eagle/SKILL.md', ...] }`

#### Scenario: .opencode directory missing
- **WHEN** `{projectDir}/.opencode/` does not exist
- **THEN** creates `.opencode/` directory
- **THEN** creates `.opencode/skills/` directory
- **THEN** proceeds with installation

### Requirement: Superpowers skill installation
The system SHALL install the required Superpowers skills from the global install location to the project's `.opencode/skills/superpowers/` directory.

#### Scenario: Install superpowers
- **WHEN** `POST /api/project/init-skills` is called
- **AND** Eagle skills are being installed
- **THEN** copies specified superpowers from `{globalSuperpowersDir}` to `{projectDir}/.opencode/skills/superpowers/`
- **THEN** the minimal set of skills to copy includes: brainstorming, test-driven-development, writing-plans, subagent-driven-development, verification-before-completion, requesting-code-review, finishing-a-development-branch, executing-plans, using-git-worktrees

#### Scenario: Superpowers already exist
- **WHEN** skills are being installed
- **AND** `{projectDir}/.opencode/skills/superpowers/` already exists
- **THEN** does NOT overwrite existing files
- **THEN** logs which skills were skipped

### Requirement: Unified init flow
The system SHALL provide a single API endpoint that runs the full initialization sequence: openspec init → eagle skills → superpowers skills.

#### Scenario: Full init
- **WHEN** `POST /api/project/init-eagle` is called
- **THEN** step 1: checks and runs openspec init if needed
- **THEN** step 2: installs Eagle skills to .opencode/skills/eagle/
- **THEN** step 3: installs Superpowers skills to .opencode/skills/superpowers/
- **THEN** step 4: copies eagle-orchestration.json to project root
- **THEN** returns `{ success: true, steps: { openspecInit: true, eagleInstall: true, superpowersInstall: true } }`

### Requirement: ACP skill tool loading
The installed skill files in `.opencode/skills/eagle/` SHALL be loadable by ACP sub-agents via the built-in skill tool.

#### Scenario: Sub-agent loads eagle skill
- **WHEN** ACP sub-agent calls skill tool with name "eagle"
- **THEN** opencode server reads `.opencode/skills/eagle/SKILL.md`
- **THEN** the skill content is injected into the sub-agent's context
- **THEN** sub-agent can read the phase definitions and follow instructions

### Requirement: Phase skill md frontmatter is parseable
Each phase skill.md file in `.opencode/skills/eagle/phases/` SHALL contain YAML frontmatter with `name`, `title`, `role`, `command`, `responsibilities`, `forbidden`, `artifacts` fields.

#### Scenario: Frontmatter parsed
- **WHEN** SkillLoader reads `open.skill.md`
- **THEN** parses frontmatter into `{ name: 'eagle-open', title: '开启', role: 'Eagle 开启阶段 Agent', ... }`
- **THEN** returns structured SkillDef object
- **THEN** prompt template uses these fields to build the ACP session prompt

### Requirement: Project directory validation summary
The project directory setup dialog SHALL aggregate all checks and display a unified status.

#### Scenario: All checks pass
- **WHEN** both OpenSpec init and Eagle skill installation are complete
- **THEN** no prompt shown, project directory is set directly

#### Scenario: Partial checks
- **WHEN** OpenSpec is initialized but Eagle skills are missing
- **THEN** shows: "Eagle 技能尚未安装到 .opencode/skills/"
- **THEN** offers [安装 Eagle 技能] [跳过]

#### Scenario: Neither checks pass
- **WHEN** both OpenSpec, Eagle skills, and Superpowers skills are missing
- **THEN** shows unified dialog with all three items listed
- **THEN** offers [初始化全部] [跳过]

### Requirement: Eagle skill reference in ACP prompt
The dispatchTask() prompt SHALL instruct the sub-agent to load the eagle skill via the skill tool.

#### Scenario: Prompt includes skill instruction
- **WHEN** a phase task is dispatched
- **THEN** the prompt contains: '请使用 skill tool 加载 "eagle" 技能'
- **THEN** the prompt references the specific phase command: '执行 eagle-{phase} 子命令'
