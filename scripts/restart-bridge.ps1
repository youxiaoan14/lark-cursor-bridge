# Stop duplicate bridges, rebuild, and start one background instance.
$ErrorActionPreference = "Stop"
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $project

Write-Host "Stopping existing bridge processes..."
& "$PSScriptRoot\stop-bridge.ps1"
Start-Sleep -Seconds 1

Write-Host "Building..."
npm run build

if (-not (Test-Path logs)) {
  New-Item -ItemType Directory -Path logs | Out-Null
}

Write-Host "Starting bridge in background (logs\bridge-bg.log)..."
wscript.exe "$PSScriptRoot\start-hidden.vbs"
Start-Sleep -Seconds 4

& "$PSScriptRoot\status-bridge.ps1"
