$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'Cline-Desktop-ZH-CN.exe'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
  throw "未找到 $target。请先将此脚本与 Cline-Desktop-ZH-CN.exe 放在同一目录。"
}
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Cline 中文版.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = $target
$shortcut.Description = '通过本地运行时汉化启动官方 Cline Desktop'
$shortcut.Save()
Write-Output "已创建快捷方式：$shortcutPath"
