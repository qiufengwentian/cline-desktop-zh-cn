# Cline Desktop 简体中文运行时汉化补丁

面向官方 Cline Desktop 的简体中文运行时补丁。非官方项目，与 Cline 官方无隶属关系，也不提供官方支持。

当前已验证官方 Cline Desktop `0.0.30`。未知版本会加载基础字典，但不会加载版本专用规则；升级 Cline 后请先运行自检并查看 [兼容性说明](docs/COMPATIBILITY.md)。

## 推荐安装与使用

普通用户请打开 GitHub Release 页面，下载 `Cline-Desktop-ZH-CN.exe`，将它放在任意可写目录后双击运行。电脑无需预装 Node.js 或 Bun。启动器只会启动官方 Cline 的子进程并通过临时的本机 CDP 连接注入翻译，不会修改官方安装目录。

启动器会自动查找常见的官方安装位置。若提示找不到官方 Cline，请在 EXE 同目录创建 `local.config.json`，填入实际的 `cline-app.exe` 路径后再次双击：

```json
{ "officialExe": "C:\\path\\to\\cline-app.exe" }
```

v0.1.1 的 EXE 当前未做商业代码签名，首次运行可能触发 Windows SmartScreen 或 Defender 提示；请根据自己的安全策略核对来源。项目不提供绕过安全软件的操作。EXE 体积与启动时间以每次 Release 的构建说明为准。

需要快捷方式时，可将 `install-shortcut.ps1` 或 `install-shortcut.cmd` 放在 EXE 同目录并运行；它只创建当前用户桌面的快捷方式，不写入注册表或官方 Cline 目录。删除快捷方式可在桌面手动删除。

## 开发者方式

- Windows、Node.js 22+、Bun 1.3+。
- 已安装官方 Cline Desktop。
- 本仓库包含可直接运行的生成字典；普通用户无需下载 Cline 源码或重新生成字典。

构建便携用户版 EXE：

```powershell
npm run build:windows
```

产物写入被 Git 忽略的 `dist/Cline-Desktop-ZH-CN.exe`，不会提交二进制。

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

始终通过 `npm run launch` 或该快捷方式启动补丁。官方 Cline 更新后，请运行 `npm run self-check`；若版本规则缺失或页面显示异常，请停止使用补丁并提交包含 Cline FileVersion 的 [issue](https://github.com/ExSchwi/cline-desktop-zh-cn/issues)。开发者更新基础字典的说明见 [翻译来源](docs/SOURCE-PROVENANCE.md)。

安全软件可能提示 WebView2 的本机远程调试参数。这是本工具进行页面注入的可见行为。完整的端口、权限和卸载边界见 [安全与隐私说明](docs/SECURITY.md)。

## 许可证

本项目以 Apache-2.0 许可发布。生成翻译字典的上游来源与声明见 [NOTICE](NOTICE) 和 [翻译来源](docs/SOURCE-PROVENANCE.md)。
