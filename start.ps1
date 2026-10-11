# Agent App - one-click start
# Usage: .\start.ps1
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Stopping existing processes on ports 3000/5173 ===" -ForegroundColor Yellow
foreach ($port in 3000, 5173) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $conns.OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  }
}
Start-Sleep -Seconds 1

Write-Host "=== Starting backend server (port 3000) ===" -ForegroundColor Cyan
Start-Process -FilePath "npx" -ArgumentList "tsx", "src/index.ts" -WorkingDirectory (Join-Path $root "server") -WindowStyle Hidden
Start-Sleep -Seconds 3

Write-Host "=== Starting web frontend (port 5173) ===" -ForegroundColor Cyan
Set-Location (Join-Path $root "web")
npx vite --host

Write-Host ""
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the frontend; the backend stops next time the script runs."