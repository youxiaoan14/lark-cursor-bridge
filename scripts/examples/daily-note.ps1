# Example: create a dated Feishu note (for Task Scheduler or manual runs).
# Usage:
#   powershell -File scripts\examples\daily-note.ps1
# Schedule (daily 9:00):
#   schtasks /Create /TN "FeishuDailyNote" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Mico\Projects\lark-cursor-bridge\scripts\examples\daily-note.ps1" /SC DAILY /ST 09:00

$date = Get-Date -Format "yyyy-MM-dd"
$title = "工作笔记 $date"
$content = @"
# 工作笔记 $date

## 今日计划
- 

## 进展记录
- 

## 待办
- [ ] 
"@

& "$PSScriptRoot\create-doc.ps1" -Title $title -Content $content -As user
