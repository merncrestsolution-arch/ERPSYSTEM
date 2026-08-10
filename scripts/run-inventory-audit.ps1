param(
  [string]$HostIp = "44.223.82.38",
  [string]$User = "admin",
  [string]$KeyPath = "",
  [switch]$ApplyFix
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

# Prefer the Desktop PEM path used on this machine; fall back to repo-relative copy.
$CandidateKeys = @(
  $KeyPath,
  "C:\Users\moham\Desktop\dis erp 458\ssh key\LightsailDefaultKey-us-east-1 (3).pem",
  (Join-Path $RepoRoot "ssh key\LightsailDefaultKey-us-east-1 (3).pem")
) | Where-Object { $_ -and $_.Trim() -ne "" }

$KeyPath = $null
foreach ($candidate in $CandidateKeys) {
  Write-Host "Test-Path '$candidate' => $(Test-Path -LiteralPath $candidate)"
  if (Test-Path -LiteralPath $candidate) {
    $KeyPath = $candidate
    Get-Item -LiteralPath $KeyPath | Format-List FullName, Length, LastWriteTime
    break
  }
}
if (-not $KeyPath) {
  throw "SSH key not found. Checked: $($CandidateKeys -join '; ')"
}

$sshTarget = "${User}@${HostIp}"
$ssh = @("-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=20", "-i", $KeyPath, $sshTarget)

function Invoke-RemoteSql([string]$LocalSqlPath, [string]$RemoteName) {
  if (-not (Test-Path -LiteralPath $LocalSqlPath)) {
    throw "SQL file missing: $LocalSqlPath"
  }
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

function Invoke-RemoteSqlText([string]$Sql, [string]$RemoteName) {
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Sql))
  $remote = "/tmp/$RemoteName"
  $cmd = @"
echo $b64 | base64 -d > $remote
export PGPASSWORD=erp_secret_change_me
psql -h 127.0.0.1 -U erp -d erp -v ON_ERROR_STOP=1 -f $remote
"@
  & ssh @ssh $cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote SQL failed: $RemoteName" }
}

$AuditSql = Join-Path $ScriptDir "audit-inventory-skus.sql"
$FixSql = Join-Path $ScriptDir "fix-all-grn-movements-by-sku.sql"

Write-Host "=== AUDIT all inventory SKUs on $HostIp ===" -ForegroundColor Cyan
Invoke-RemoteSql $AuditSql "audit-inventory-skus.sql"

if ($ApplyFix) {
  Write-Host "=== APPLY full GRN rebuild for ALL packaging/colour SKUs ===" -ForegroundColor Yellow
  Invoke-RemoteSql $FixSql "fix-all-grn-movements-by-sku.sql"

  Write-Host "=== RE-AUDIT after fix ===" -ForegroundColor Cyan
  Invoke-RemoteSql $AuditSql "audit-inventory-skus-after.sql"

  Write-Host "=== Twin Flat 100M/50M movement lines after fix ===" -ForegroundColor Cyan
  $twinSql = @'
\echo '=== Twin Flat products ==='
SELECT id, barcode, name, stock_quantity
FROM products
WHERE name ILIKE '%Twin Flat 7/0.67%'
ORDER BY id;

\echo ''
\echo '=== Twin Flat movement lines ==='
SELECT sm.id, sm.product_id, p.barcode, left(p.name, 45) AS name,
       sm.movement_type, sm.quantity_units, sm.quantity_meters,
       sm.reference, sm.notes, sm.created_at
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE p.name ILIKE '%Twin Flat 7/0.67%'
ORDER BY sm.product_id, sm.id;

\echo ''
\echo '=== Packaging/colour SKU confirmation (separate barcodes) ==='
SELECT id, barcode, name, stock_quantity
FROM products
WHERE barcode ~ '-(50M|10M|500M|perM)$'
   OR name ~ '\[Roll-(100M|50M)\]'
   OR name ~ '\[Coil-'
ORDER BY barcode, id;
'@
  Invoke-RemoteSqlText $twinSql "twin-flat-after-fix.sql"
}

Write-Host "Done." -ForegroundColor Green
