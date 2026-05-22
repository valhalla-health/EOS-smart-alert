# EOS Smart Alert V5 — deploy.ps1
# Usage:
#   .\deploy.ps1                        # build + deploy as-is
#   .\deploy.ps1 "https://...exec"      # update GAS URL + build + deploy
#   .\deploy.ps1 "https://...exec" -m "fix: xyz"  # custom message

param(
    [string]$GasUrl = "",
    [string]$m = ""
)

$root = "C:\Users\USER\Desktop\PraewPP\Web App Projects\EOS-Smart-Alert"
$data = "$root\v5\src\eos-data.jsx"

# --- show current URL ---
$cur = (Select-String -Path $data -Pattern "DEFAULT_WEBHOOK = '([^']+)'").Matches[0].Groups[1].Value
Write-Host "Current GAS URL: $cur"

# --- update URL if provided ---
if ($GasUrl) {
    $content = Get-Content $data -Raw
    $content = $content -replace "(const DEFAULT_WEBHOOK = ')[^']*", "`${1}$GasUrl"
    Set-Content $data $content -NoNewline
    Write-Host "[OK] DEFAULT_WEBHOOK → $GasUrl"
}

# --- build ---
Write-Host "[..] Building docs/index.html..."
python "$root\v5\build.py" --pages
if ($LASTEXITCODE -ne 0) { Write-Host "[ERR] Build failed — aborting"; exit 1 }
Write-Host "[OK] Build complete"

# --- git ---
$msg = if ($m) { $m } elseif ($GasUrl) { "deploy: update GAS URL" } else { "deploy: rebuild" }
git -C $root add docs/index.html v5/src/
git -C $root diff --cached --stat
git -C $root commit -m $msg
git -C $root push
Write-Host "[DONE] Pushed → valhalla-health/EOS-Smart-Alert"
