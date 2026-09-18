# 版本兼容性

| 官方 Cline Desktop | 状态 | 基础字典 | 版本规则 |
| --- | --- | --- | --- |
| 0.0.30 | 已验证 | 545 条静态唯一映射 | `rules/0.0.30.json`：29 条静态覆盖、6 条动态模式 |
| 0.0.32 | 已验证 | 545 条静态唯一映射；22 个已加载 JS bundle 中命中 380 条（69.72%） | `rules/0.0.32.json`：60 条静态覆盖、6 条动态模式 |
| 0.0.31 / 0.0.33 / 0.0.34 | 兼容模式（未正式验证） | 基础字典 + 最近规则 | 通过 target、DOM、属性节点、注入和 MutationObserver 探测后尝试；不保证全部页面 |

基础字典由上游 Cline Desktop 的 `en-US` 与 `zh-CN` catalog 生成。版本规则仅收录因版本变化、字符串拼接或属性语义需要单独处理的文案。

0.0.30 与 0.0.32 的 CDP page target 均为 `type=page`、`url=http://tauri.localhost/`，页面标题在加载完成后为 `Cline`。0.0.32 首次 target 可能短暂显示 `about:blank`，启动器会继续使用同一 page target 并由观察器等待 React 内容。

每个 `rules/<FileVersion>.json` 都有 `static` 与 `patterns`。`rules/manifest.json` 定义相邻小版本的最近规则回退策略；当前允许同一 `0.0.x` 系列最多相差两个 patch 版本。未知版本先进行能力探测：必须有 `page` target 和有效 WebView URL，基础 DOM 已就绪，页面存在交互元素或 placeholder/title/aria 属性，字典注入成功且 MutationObserver 可建立。探测失败才阻断并弹窗。0.0.32 的覆盖补充了首页、Tooltip/ARIA、输入框和设置导航文案，保留 0.0.30 的 6 条动态模式。

提示语义分为三类：正式支持版本静默启动；兼容模式仅记录“未正式验证版本”警告；官方 EXE、CDP target、必要资源、规则格式、基础注入或能力探测失败时显示错误窗口。

点击主窗口关闭后的生命周期由官方进程决定。启动器只等待自己启动的官方直接子进程；官方真正退出后心跳停止、锁文件删除、启动器退出。若官方关闭窗口后仍驻留托盘或后台，启动器跟随该进程继续驻留，不擅自强杀；官方进程最终退出后再完成清理。`--debug` 日志会记录 `official-exit` 和 `cleanup-complete`。

支持版本代表已完成验证，并不代表所有页面、原生菜单或用户内容均可翻译。
