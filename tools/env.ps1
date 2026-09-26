# 注入 Node.js 与 Git 到当前 PowerShell 会话
$env:Path = "D:\app\nodejs\node-v22;D:\app\git\cmd;D:\app\git\bin;" + $env:Path
Write-Host "已加载环境: node=$(node -v)  npm=$(npm -v)  git=$(git --version)"
