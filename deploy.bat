@echo off
setlocal
cd /d D:\agent-app

echo === [1/5] Update main branch ===
git checkout main
git pull origin main

echo === [2/5] Build web (web\.env can set VITE_API_BASE for the hosted backend) ===
cd web
call npm run build
if errorlevel 1 (
  echo Build failed - not deploying.
  exit /b 1
)
cd /d D:\agent-app

echo === [3/5] Rebuild clean gh-pages branch (only the static build) ===
if exist D:\agent-app-pages-build rmdir /s /q D:\agent-app-pages-build
move web\dist D:\agent-app-pages-build

git branch -D gh-pages
git checkout --orphan gh-pages
git rm -r --cached . >nul 2>&1
git clean -fd

echo === [4/5] Commit and force-push gh-pages ===
move D:\agent-app-pages-build\* .
rmdir /s /q D:\agent-app-pages-build
git add -A
git commit -m "Deploy web build to GitHub Pages"
git push -f origin gh-pages
if errorlevel 1 (
  echo Push failed.
  exit /b 1
)

echo === [5/5] Back to main ===
git checkout main
echo.
echo Done! Visit: https://Tomato175.github.io/agens-app/
echo NOTE: chat needs a hosted backend. Set VITE_API_BASE in web\.env
echo to your backend URL (e.g. Render), then re-run this script.
pause