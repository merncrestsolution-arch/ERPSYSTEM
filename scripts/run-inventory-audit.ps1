param(
  [string]$HostIp = "44.223.82.38",
  [string]$User = "admin",
  [string]$KeyPath = "",
  [switch]$ApplyFix
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

if (-not $KeyPath) {
  $KeyPath = Join-Path $RepoRoot "ssh key\LightsailDefaultKey-us-east-1 (3).pem"
}
if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

$sshTarget = "${User}@${HostIp}"
$ssh = @("-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=20", "-i", $KeyPath, $sshTarget)

function Invoke-RemoteSql([string]$LocalSqlPath, [string]$RemoteName) {
  $bytes = [System.IO.File]::ReadAllBytes($LocalSqlPath)
  $b64 = [Convert]::ToBase64String($bytes)
  $remote = "/tmp/$RemoteName"
  $cmd = @"
echo $b64 | base64 -d > $remote
export PGPASSWORD=erp_secret_change_me
psql -h 127.0.0.1 -U erp -d erp -v ON_ERROR_STOP=1 -f $remote
"@
  & ssh @ssh $cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote SQL failed: $RemoteName" }
}

Write-Host "=== AUDIT all inventory SKUs on $HostIp ===" -ForegroundColor Cyan
Invoke-RemoteSql (Join-Path $ScriptDir "audit-inventory-skus.sql") "audit-inventory-skus.sql"

if ($ApplyFix) {
  Write-Host "=== APPLY full GRN rebuild for ALL packaging/colour SKUs ===" -ForegroundColor Yellow
  Invoke-RemoteSql (Join-Path $ScriptDir "fix-all-grn-movements-by-sku.sql") "fix-all-grn-movements-by-sku.sql"
  Write-Host "=== RE-AUDIT after fix ===" -ForegroundColor Cyan
  Invoke-RemoteSql (Join-Path $ScriptDir "audit-inventory-skus.sql") "audit-inventory-skus-after.sql"
}

Write-Host "Done." -ForegroundColor Green
