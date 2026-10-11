@echo off
setlocal
cd /d "%~dp0"

echo === Stopping existing processes on ports 3000/5173 ===
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr /C:":3000 " /C:":5173 "') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

echo === Starting backend server ===
cd /d "%~dp0server"
start /B npx tsx src/index.ts
timeout /t 3 >nul

echo === Starting web frontend ===
cd /d "%~dp0web"
npx vite --host

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo (PPT download works locally via the vite proxy.)
echo Press Ctrl+C to stop the frontend; backend stops next time the script runs.
pause