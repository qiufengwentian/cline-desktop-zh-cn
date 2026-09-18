# 版本兼容性

| 官方 Cline Desktop | 状态 | 基础字典 | 版本规则 |
| --- | --- | --- | --- |
| 0.0.30 | 已验证 | 545 条静态唯一映射 | `rules/0.0.30.json`：29 条静态覆盖、6 条动态模式 |
| 0.0.32 | 已验证 | 545 条静态唯一映射；22 个已加载 JS bundle 中命中 380 条（69.72%） | `rules/0.0.32.json`：60 条静态覆盖、6 条动态模式 |

基础字典由上游 Cline Desktop 的 `en-US` 与 `zh-CN` catalog 生成。版本规则仅收录因版本变化、字符串拼接或属性语义需要单独处理的文案。

0.0.30 与 0.0.32 的 CDP page target 均为 `type=page`、`url=http://tauri.localhost/`，页面标题在加载完成后为 `Cline`。0.0.32 首次 target 可能短暂显示 `about:blank`，启动器会继续使用同一 page target 并由观察器等待 React 内容。

每个 `rules/<FileVersion>.json` 都有 `static` 与 `patterns`。未知版本仍会加载基础字典，但不加载版本覆盖；请在升级官方 Cline 后先运行自检并完成页面验证，再增加小范围规则。0.0.32 的覆盖补充了首页、Tooltip/ARIA、输入框和设置导航文案，保留 0.0.30 的 6 条动态模式。

支持版本代表已完成验证，并不代表所有页面、原生菜单或用户内容均可翻译。
