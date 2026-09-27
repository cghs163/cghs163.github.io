# 只用 source 作为 Obsidian 仓库：侧边栏只见文章/图片/模板，不见项目代码
$vault = (Resolve-Path (Join-Path $PSScriptRoot "..\source")).Path
$uri = "obsidian://open?path=" + [uri]::EscapeDataString($vault)
Write-Host "打开 Obsidian 写作仓库: $vault"
Write-Host "（已隐藏 css/配置等；主要看 _posts 与 img）"
Start-Process $uri
