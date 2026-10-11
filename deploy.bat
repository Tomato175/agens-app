@echo off
setlocal
cd /d "%~dp0"

echo === [1/4] Build web ===
cd web
call npm run build
if errorlevel 1 (
  echo Build failed - not deploying.
  exit /b 1
)
cd /d "%~dp0"

echo === [2/4] Rebuild clean gh-pages branch (only the static build) ===
git branch -D gh-pages 2>nul
git checkout --orphan gh-pages
git rm -r -q --cached . 2>nul
copy /Y web\dist\* . >nul
REM add only the dist paths - never "git add -A" here, or node_modules gets committed
git add index.html assets
git commit -m "Deploy web build to GitHub Pages"
git push -f origin gh-pages
if errorlevel 1 (
  echo Push failed.
  exit /b 1
)

echo === [3/4] Back to main ===
git checkout main
git clean -fdq index.html assets 2>nul

echo.
echo Done! Visit: https://Tomato175.github.io/agens-app/
echo NOTE: chat needs a hosted backend. Set VITE_API_BASE in web\.env
echo to your backend URL (e.g. Render), then re-run this script.
pause