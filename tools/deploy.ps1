# 提交本地更改并推送到 main，触发 GitHub Actions 发布
$ErrorActionPreference = "Stop"

$env:Path = "D:\app\nodejs\node-v22;D:\app\git\cmd;D:\app\git\bin;" + $env:Path

$status = git status --porcelain
if (-not $status) {
  Write-Host "没有需要提交的更改。若仅想触发重新部署，可先改一个文件再运行。"
  exit 0
}

git add -A
$message = "publish: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git commit -m $message
git push -u origin HEAD:main

Write-Host "已推送到 main。请到 GitHub Actions 查看构建与 Pages 部署状态。"
