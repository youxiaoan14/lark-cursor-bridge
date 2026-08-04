# Create a Feishu document via lark-cli.
# Usage:
#   powershell -File scripts\examples\create-doc.ps1 -Title "日报" -Content "# 今日进展"
#   powershell -File scripts\examples\create-doc.ps1 -Title "周报" -As bot

param(
  [Parameter(Mandatory = $true)]
  [string]$Title,

  [string]$Content = "",

  [ValidateSet("user", "bot")]
  [string]$As = "user"
)

if (-not $Content) {
  $Content = "# $Title`n`n创建于 $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

lark-cli docs +create --as $As --title $Title --doc-format markdown --content $Content
