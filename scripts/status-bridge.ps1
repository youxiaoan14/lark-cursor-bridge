# Show bridge process count and recent log lines.
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -like "*$project*" -and $_.CommandLine -like "*dist\index.js*" }

Write-Host "Bridge instances: $($procs.Count)"
if ($procs.Count -eq 0) {
  Write-Host "Status: not running"
} elseif ($procs.Count -eq 1) {
  Write-Host "Status: running (OK)"
  Write-Host "  PID $($procs[0].ProcessId)"
} else {
  Write-Host "Status: WARNING - multiple instances (messages may be lost)"
  foreach ($p in $procs) {
    Write-Host "  PID $($p.ProcessId)"
  }
  Write-Host "Fix: powershell -File scripts\stop-bridge.ps1"
}

foreach ($log in @("bridge-bg.log", "bridge.log")) {
  $path = Join-Path $project "logs\$log"
  if (Test-Path $path) {
    Write-Host ""
    Write-Host "--- logs\$log (last 15 lines) ---"
    Get-Content $path -Tail 15 -ErrorAction SilentlyContinue
  }
}
