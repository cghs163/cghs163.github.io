# 用 Obsidian 打开如升楼仓库（本博客根目录）
$vault = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$uri = "obsidian://open?path=" + [uri]::EscapeDataString($vault)
Write-Host "打开 Obsidian 仓库: $vault"
Start-Process $uri
