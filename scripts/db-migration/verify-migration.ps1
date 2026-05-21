# Controleer interne migratie (geen wachtwoorden nodig).
param(
  [string]$PhpHost = "192.168.1.52",
  [string]$DbHost = "192.168.1.14"
)

$ok = $true
function Test-JsonUrl($url, $label) {
  try {
    $r = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
    if ($r.StatusCode -eq 200 -and $r.Content.TrimStart().StartsWith("{")) {
      Write-Host "[OK] $label"
      return $true
    }
    Write-Host "[FAIL] $label"
    return $false
  } catch {
    Write-Host "[FAIL] $label $($_.Exception.Message)"
    return $false
  }
}

foreach ($h in @($PhpHost, $DbHost)) {
  if (Test-Connection $h -Count 1 -Quiet) { Write-Host "[OK] ping $h" }
  else { Write-Host "[FAIL] ping $h"; $ok = $false }
}

$tnc = Test-NetConnection $DbHost -Port 3306 -WarningAction SilentlyContinue
if ($tnc.TcpTestSucceeded) { Write-Host "[OK] MariaDB $DbHost`:3306" }
else { Write-Host "[FAIL] MariaDB port"; $ok = $false }

$base = "http://$PhpHost"
foreach ($ep in @("api.php", "historie.php", "energie.php", "historie_energie.php")) {
  if (-not (Test-JsonUrl "$base/$ep`?t=1" $ep)) { $ok = $false }
}

if ($ok) { exit 0 } else { exit 1 }
