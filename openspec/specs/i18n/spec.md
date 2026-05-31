# i18n Specification

## Purpose
TBD - created by archiving change webui-enhancement. Update Purpose after archive.
## Requirements
### Requirement: en-US.json 翻译文件

WHEN 系统初始化加载语言包
THEN 必须存在 `en-US.json` 文件，其所有翻译 id 与 `zh-CN.json` 完全一致
THEN 每个 id 对应一条完整的英文翻译文案

#### Scenario: en-US.json 与 zh-CN.json id 一致性校验

WHEN CI 运行 i18n 校验脚本
THEN 脚本遍历 `en-US.json` 和 `zh-CN.json` 的所有 key
THEN 如果存在任一文件独有而另一文件缺失的 key
THEN CI 构建失败并输出缺失的 key 列表

#### Scenario: 运行时 key 缺失兜底

WHEN 组件通过 `FormattedMessage` 引用了某个翻译 id
THEN 该 id 在当前语言文件中不存在
THEN 系统应降级显示该 id 的原始字符串，而非抛出异常或显示空白

### Requirement: I18nProvider 加载 en-US.json

WHEN 用户设置的语言为 `'en'`
THEN `I18nProvider` 自动加载 `en-US.json` 文件
THEN 全局 `intl` 上下文使用英文文案渲染所有 `FormattedMessage`

#### Scenario: Provider 初始化加载

WHEN 应用启动，`I18nProvider` 挂载
THEN Provider 检测 `locale` 属性
THEN 若 `locale === 'en'`，则异步请求 `/locales/en-US.json`
THEN 加载完成后注入 `IntlProvider` 的 `messages` prop

#### Scenario: Provider 加载失败

WHEN 网络异常导致 `en-US.json` 加载失败
THEN Provider 捕获错误并记录 `console.error`
THEN 应用继续运行，回退至 `zh-CN.json` 中的文案

### Requirement: 现有 FormattedMessage id 全覆盖

WHEN 代码库中存在任意 `FormattedMessage` 组件
THEN `en-US.json` 必须包含该组件 `id` 属性对应的英文翻译
WHEN 新增或修改了 `FormattedMessage id`
THEN 开发人员必须在 `en-US.json` 中添加相同 id 的英文翻译

#### Scenario: 全覆盖自动化检查

WHEN `npm run i18n:check` 执行
THEN 脚本扫描所有 `FormattedMessage id` 及 `defineMessages` 中的 id
THEN 逐 id 检查 `en-US.json` 是否存在对应条目
THEN 任一缺失时输出警告并返回非零退出码

#### Scenario: PR 审查门禁

WHEN 开发人员提交 PR 包含新的 `FormattedMessage id`
THEN CI 门禁自动运行 i18n 全覆盖检查
THEN 若检查未通过，PR 合并按钮被禁用

### Requirement: 新增翻译 id

WHEN 健康看板、调度管理、恢复显示等模块需要使用文案
THEN `en-US.json` 和 `zh-CN.json` 同步添加以下分类的翻译 id

#### Scenario: 健康看板翻译

| id | 英文 | 中文 |
|---|---|---|
| `health.title` | System Health | 系统健康 |
| `health.cpu` | CPU Usage | CPU 使用率 |
| `health.memory` | Memory Usage | 内存使用 |
| `health.disk` | Disk Usage | 磁盘使用 |
| `health.uptime` | Uptime | 运行时间 |
| `health.status.healthy` | Healthy | 健康 |
| `health.status.warning` | Warning | 警告 |
| `health.status.critical` | Critical | 严重 |
| `health.lastUpdated` | Last Updated: {time} | 最后更新：{time} |

#### Scenario: 调度管理翻译

| id | 英文 | 中文 |
|---|---|---|
| `schedule.title` | Schedule Management | 调度管理 |
| `schedule.create` | Create Schedule | 创建调度 |
| `schedule.edit` | Edit Schedule | 编辑调度 |
| `schedule.delete` | Delete Schedule | 删除调度 |
| `schedule.cron` | Cron Expression | Cron 表达式 |
| `schedule.nextRun` | Next Run: {time} | 下次运行：{time} |
| `schedule.lastRun` | Last Run: {time} | 上次运行：{time} |
| `schedule.enabled` | Enabled | 已启用 |
| `schedule.disabled` | Disabled | 已禁用 |

#### Scenario: 恢复显示翻译

| id | 英文 | 中文 |
|---|---|---|
| `recovery.title` | Recovery | 恢复 |
| `recovery.autoRetry` | Auto Retry | 自动重试 |
| `recovery.retryCount` | Retry {count}/{max} | 重试 {count}/{max} |
| `recovery.backoff` | Backoff: {seconds}s | 退避：{seconds}秒 |
| `recovery.status.recovering` | Recovering... | 恢复中… |
| `recovery.status.stable` | Stable | 稳定 |
| `recovery.reset` | Reset Connection | 重置连接 |

### Requirement: 语言检测

WHEN 用户首次访问应用
THEN 系统按以下优先级检测语言：`localStorage` > 浏览器 `navigator.language` > 默认 `'zh'`
WHEN 用户在设置中切换语言
THEN 系统将选择写入 `localStorage` 并立即刷新 `I18nProvider` 的语言上下文

#### Scenario: 浏览器语言检测

WHEN `localStorage` 中不存在 `locale` 键
THEN 系统读取 `navigator.language`（如 `'en-US'`）
THEN 取前两个字符（`'en'`）作为目标语言
THEN 若支持该语言则应用，否则回退至默认 `'zh'`

#### Scenario: localStorage 覆盖

WHEN 用户通过设置面板将语言切换为英文
THEN 系统将 `'en'` 写入 `localStorage.setItem('locale', 'en')`
THEN `I18nProvider` 重新加载 `en-US.json`
THEN 页面所有 `FormattedMessage` 即时刷新为英文文案
THEN 刷新页面后 `localStorage` 中的值被优先读取，语言保持为英文

#### Scenario: 不支持的浏览器语言

WHEN `navigator.language` 返回 `'ja'`（日语）
THEN 系统发现 `ja-JP.json` 不存在
THEN 回退至默认语言 `'zh'`
THEN 控制台输出 `[i18n] Unsupported locale: ja, falling back to zh`

