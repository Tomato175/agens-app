@echo off
echo === Stopping existing processes ===
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo === Starting backend server ===
cd /d D:\agent-app\server
start /B npx tsx src/index.ts
timeout /t 3 >nul

echo === Starting web frontend ===
cd /d D:\agent-app\web
call npx vite --host

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo Press Ctrl+C to stop both.
pause
