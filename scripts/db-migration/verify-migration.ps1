# Controleer Next + MariaDB (geen wachtwoorden nodig).
param(
  [string]$NextHost = "192.168.1.32",
  [string]$DbHost = "192.168.1.14",
  [int]$NextPort = 3000
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

foreach ($h in @($NextHost, $DbHost)) {
  if (Test-Connection $h -Count 1 -Quiet) { Write-Host "[OK] ping $h" }
  else { Write-Host "[FAIL] ping $h"; $ok = $false }
}

$tnc = Test-NetConnection $DbHost -Port 3306 -WarningAction SilentlyContinue
if ($tnc.TcpTestSucceeded) { Write-Host "[OK] MariaDB $DbHost`:3306" }
else { Write-Host "[FAIL] MariaDB port"; $ok = $false }

$base = "http://${NextHost}:$NextPort/api"
foreach ($ep in @("weer/live", "weer/historie", "energie/live", "energie/historie")) {
  if (-not (Test-JsonUrl "$base/$ep" $ep)) { $ok = $false }
}

if ($ok) { exit 0 } else { exit 1 }
