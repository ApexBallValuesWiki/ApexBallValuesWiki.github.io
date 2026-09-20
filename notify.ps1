# =============================================================================
# notify.ps1 - posts an "Apex WIKI & Values updated" announcement to Discord.
#
# THE WEBHOOK URL IS NO LONGER IN THIS FILE (it was exposed once - never again).
# It is read from, in order:
#   1. the -Webhook parameter
#   2. the APEX_DISCORD_WEBHOOK environment variable
#   3. webhook.txt sitting next to this script  <-- recommended
#
# Create the webhook: Discord server -> Server Settings -> Integrations ->
# Webhooks -> New Webhook -> Copy URL, then paste it into webhook.txt.
# webhook.txt is gitignored - push.cmd can never commit it.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify.ps1 -DryRun
#       (prints the payload, sends nothing - safe to test)
# =============================================================================

param(
  [string]$Title   = "Apex WIKI & Values updated",
  [string]$Message = "",
  [string]$Webhook = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# --- resolve the webhook (env var -> webhook.txt) -----------------------------
if (-not $Webhook) { $Webhook = $env:APEX_DISCORD_WEBHOOK }
if (-not $Webhook) {
  $txt = Join-Path $PSScriptRoot "webhook.txt"
  if (Test-Path $txt) { $Webhook = (Get-Content $txt -Raw).Trim() }
}
if (-not $Webhook -or $Webhook -notmatch "^https://") {
  Write-Output "No webhook configured - announce skipped."
  Write-Output "To enable: create webhook.txt next to notify.ps1 with your Discord"
  Write-Output "webhook URL (Discord -> Server Settings -> Integrations -> Webhooks)."
  exit 1
}

# --- helpers ------------------------------------------------------------------

function Clamp([string]$Text, [int]$Max) {
  # Discord rejects empty field values (HTTP 400) and values over 1024 chars.
  if ([string]::IsNullOrWhiteSpace($Text)) { return "-" }
  $Text = $Text.Trim()
  if ($Text.Length -le $Max) { return $Text }
  return $Text.Substring(0, $Max - 3) + "..."
}

# --- collect context (every piece is optional - works outside a repo too) -----

$version = "?"
try {
  $pkg = Get-Content (Join-Path $PSScriptRoot "package.json") -Raw | ConvertFrom-Json
  if ($pkg.version) { $version = $pkg.version }
} catch {}

$commit = ""
try { $commit = (git -C $PSScriptRoot log -1 --pretty="%h %s" 2> $null | Select-Object -First 1) } catch {}
$commit = Clamp $commit 1024

$stamp = [datetime]::UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC"

# --- build the embed ------------------------------------------------------------

$payload = @{
  username = "Apex WIKI & Values"
  embeds   = @(
    @{
      title       = Clamp $Title 256
      color       = 0x8A5CFF
      description = Clamp $Message 2048
      fields      = @(
        @{ name = "Version"; value = Clamp $version 1024; inline = $true },
        @{ name = "Commit";  value = $commit;           inline = $true },
        @{ name = "Pushed";  value = $stamp;            inline = $true }
      )
      footer    = @{ text = "Apex WIKI & Values - push.cmd auto-announce" }
      timestamp = [datetime]::UtcNow.ToString("o")
    }
  )
} | ConvertTo-Json -Depth 6

if ($DryRun) {
  Write-Output $payload
  Write-Output ""
  Write-Output "(dry run - nothing was sent)"
  exit 0
}

# Send as UTF-8 bytes so accented characters survive Windows PowerShell 5.1.
$body = [System.Text.Encoding]::UTF8.GetBytes($payload)

try {
  Invoke-RestMethod -Uri $Webhook -Method Post -ContentType "application/json" -Body $body | Out-Null
  Write-Output "Discord notified."
  exit 0
} catch {
  Write-Output ("Notify FAILED: " + $_.Exception.Message)
  exit 1
}
