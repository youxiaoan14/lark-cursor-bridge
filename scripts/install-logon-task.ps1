# Register a Windows scheduled task to auto-start bridge at user logon.
# Run once: powershell -ExecutionPolicy Bypass -File scripts\install-logon-task.ps1
# Remove:   Unregister-ScheduledTask -TaskName "LarkCursorBridge" -Confirm:$false

$ErrorActionPreference = "Stop"
$project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$restartScript = Join-Path $PSScriptRoot "restart-bridge.ps1"
$taskName = "LarkCursorBridge"

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Task '$taskName' already exists. Removing old task..."
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$restartScript`""

$trigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Auto-start lark-cursor-bridge (Feishu bot) at logon" | Out-Null

Write-Host "OK: Scheduled task '$taskName' registered."
Write-Host "Bridge will restart in background each time you log in to Windows."
Write-Host "Check status: powershell -File scripts\status-bridge.ps1"
