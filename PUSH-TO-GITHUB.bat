@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Push Nuvio Regional Catalog to GitHub

echo ==============================================
echo  Push Nuvio Regional Catalog to GitHub
echo ==============================================
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found. Install Git for Windows from https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist ".git" (
  git init -b main
  if errorlevel 1 goto :failed
)

if exist ".env" (
  git check-ignore -q .env
  if errorlevel 1 (
    echo SAFETY CHECK FAILED: .env is not ignored by Git. Do not continue.
    pause
    exit /b 1
  )
  echo Safety check passed: .env is ignored by Git.
)

git add .
if errorlevel 1 goto :failed

git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes to commit.
) else (
  git commit -m "Initial Nuvio Regional Catalog"
  if errorlevel 1 goto :failed
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog.git
  if errorlevel 1 goto :failed
) else (
  for /f "delims=" %%U in ('git remote get-url origin') do set "ORIGIN_URL=%%U"
  if /I not "!ORIGIN_URL!"=="https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog.git" (
    echo Existing origin is: !ORIGIN_URL!
    echo Expected: https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog.git
    echo Please review your Git remote manually before pushing.
    pause
    exit /b 1
  )
)

git push -u origin main
if errorlevel 1 goto :failed

echo.
echo Push completed. Go to GitHub Actions and check the deployment status.
pause
exit /b 0

:failed
echo.
echo Push failed. Review the Git error above and try again.
pause
exit /b 1
