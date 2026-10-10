# Agent App - 一键启动
# 用法: .\start.ps1

Write-Host "=== Stopping existing processes ===" -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "=== Starting backend server (port 3000) ===" -ForegroundColor Cyan
Start-Process -FilePath "npx" -ArgumentList "tsx","src/index.ts" -WorkingDirectory "D:\agent-app\server" -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "=== Starting web frontend (port 5173) ===" -ForegroundColor Cyan
cd D:\agent-app\web
npx vite --host

Write-Host "" 
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop both."
