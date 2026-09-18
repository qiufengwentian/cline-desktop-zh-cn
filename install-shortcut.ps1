$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root 'Cline-Desktop-ZH-CN.exe'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
  throw "未找到 $target。请先将此脚本与 Cline-Desktop-ZH-CN.exe 放在同一目录。"
}
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Cline 中文版.lnk'
$configuredOfficial = $null
$localConfig = Join-Path $root 'local.config.json'
if (Test-Path -LiteralPath $localConfig -PathType Leaf) {
  $configuredOfficial = (Get-Content -LiteralPath $localConfig -Raw | ConvertFrom-Json).officialExe
}
$officialCandidates = @(
  $env:CLINE_OFFICIAL_EXE,
  $configuredOfficial,
  (Join-Path $env:LOCALAPPDATA 'Programs\Cline\cline-app.exe'),
  (Join-Path $env:ProgramFiles 'Cline\cline-app.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Cline\cline-app.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }
$officialExe = $officialCandidates | Select-Object -First 1
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = if ($officialExe) { "$officialExe,0" } else { "$target,0" }
$shortcut.Description = '通过本地运行时汉化启动官方 Cline Desktop'
$shortcut.Save()
if ($officialExe) { Write-Output "快捷方式图标来源：$officialExe" }
else { Write-Warning '未找到官方 cline-app.exe，快捷方式暂使用补丁 EXE 图标；启动时仍会继续查找官方程序。' }
Write-Output "已创建快捷方式：$shortcutPath"
