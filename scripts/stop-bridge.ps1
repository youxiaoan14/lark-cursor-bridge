# Stop background bridge processes started from this project.
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$project*" -and $_.CommandLine -like "*dist\index.js*" } |
  ForEach-Object {
    Write-Host "Stopping PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force
  }
