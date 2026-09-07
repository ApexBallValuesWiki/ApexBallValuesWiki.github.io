# =============================================================================
# notify.ps1 - posts a "new version" announcement to the APEX Discord webhook.
# Called automatically by push.cmd, or run it on its own:
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify.ps1 -Message "New units added" -Title "Values update"
#   powershell -NoProfile -ExecutionPolicy Bypass -File notify.ps1 -DryRun
#       (prints the payload, sends nothing - safe to test)
# =============================================================================

param(
  [string]$Title   = "Apex WIKI & Values updated",
  [string]$Message = "",
  [string]$Webhook = "https://discord.com/api/webhooks/1530560657848533163/fSAs2a2OGZW-b1uTA0RYbrllFbJZ7FcFQ7Jf_6JWT6nj5gUlVdaIuuSN3515I_3a4Q-a",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

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
