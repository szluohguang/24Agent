# webui-i18n Specification

## Purpose
TBD - created by archiving change webui-chinese-i18n. Update Purpose after archive.
## Requirements
### Requirement: WebUI 支持中文显示
系统 SHALL 提供完整的 WebUI 中文界面，覆盖所有用户可见的静态文本。

#### Scenario: 默认语言为中文
- **WHEN** 用户首次访问 WebUI，且浏览器语言为 `zh-CN` 或 `zh`
- **THEN** 所有界面文字显示为中文

#### Scenario: 英文 fallback
- **WHEN** 翻译 key 在资源文件中不存在
- **THEN** 显示对应的英文 `defaultMessage`

### Requirement: 语言切换控件
系统 SHALL 在界面上提供语言切换控件，支持中文和英文之间的即时切换。

#### Scenario: 切换语言
- **WHEN** 用户点击语言切换按钮从中文切换到英文
- **THEN** 所有界面文字立即切换为英文，无需刷新页面

#### Scenario: 语言持久化
- **WHEN** 用户在中文模式下刷新页面
- **THEN** 页面加载后仍显示中文界面

### Requirement: 国际化基础设施
系统 SHALL 提供标准化的国际化框架，便于未来扩展更多语言。

#### Scenario: 新增翻译 key
- **WHEN** 开发者在翻译资源文件中添加新的翻译条目
- **THEN** 组件中可通过 `<FormattedMessage id="key" />` 使用该翻译

#### Scenario: 翻译 key 缺失检测
- **WHEN** 编译或测试阶段运行 `i18n-check`
- **THEN** 检测到组件中使用的 key 在资源文件中缺失时输出警告

