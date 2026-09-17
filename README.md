# Cline Desktop 简体中文运行时汉化补丁

面向官方 Cline Desktop 的简体中文运行时补丁。非官方项目，与 Cline 官方无隶属关系，也不提供官方支持。

当前已验证官方 Cline Desktop `0.0.30`。未知版本会加载基础字典，但不会加载版本专用规则；升级 Cline 后请先运行自检并查看 [兼容性说明](docs/COMPATIBILITY.md)。

## 要求与安装

- Windows、Node.js 22+、Bun 1.3+。
- 已安装官方 Cline Desktop。
- 本仓库包含可直接运行的生成字典；普通用户无需下载 Cline 源码或重新生成字典。

从仓库根目录运行：

```powershell
npm run self-check
npm run launch
```

启动器会依次查找常见的官方安装位置。若未找到，请设置 `CLINE_OFFICIAL_EXE`，或在仓库根目录创建本地且被忽略的 `local.config.json`：

```json
{ "officialExe": "C:\\path\\to\\cline-app.exe" }
```

可运行 `npm run install-shortcut` 创建当前用户桌面的“Cline 中文版”快捷方式；`npm run uninstall-shortcut` 只删除该快捷方式。删除本补丁时，请自行删除项目目录。

`tools/dev/` 仅供维护者使用；其中部分脚本会连接活跃 CDP 页面并读取页面内容，`reload-page.mjs` 会请求页面重载。

## 使用、更新与故障排查

始终通过 `npm run launch` 或该快捷方式启动补丁。官方 Cline 更新后，请运行 `npm run self-check`；若版本规则缺失或页面显示异常，请停止使用补丁并提交包含 Cline FileVersion 的 issue。开发者更新基础字典的说明见 [翻译来源](docs/SOURCE-PROVENANCE.md)。

安全软件可能提示 WebView2 的本机远程调试参数。这是本工具进行页面注入的可见行为。完整的端口、权限和卸载边界见 [安全与隐私说明](docs/SECURITY.md)。

## 许可证

本项目以 Apache-2.0 许可发布。生成翻译字典的上游来源与声明见 [NOTICE](NOTICE) 和 [翻译来源](docs/SOURCE-PROVENANCE.md)。
