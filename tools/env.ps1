
$env:Path = "D:\app\nodejs\node-v22;D:\app\git\cmd;D:\app\git\bin;" + $env:Path
Write-Host "loaded : node=$(node -v)  npm=$(npm -v)  git=$(git --version)"
