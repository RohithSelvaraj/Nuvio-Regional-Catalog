@echo off
setlocal
cd /d "%~dp0"
title Nuvio Regional Catalog - Windows Setup

echo ==============================================
echo  Nuvio Regional Catalog - first-time setup
echo ==============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%V in ('node --version') do set NODEMAJOR=%%V
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example.
)
echo.
echo Notepad will open .env. Paste your TMDB API key after TMDB_API_KEY=, save, and close Notepad.
echo Keep .env private. The .gitignore file excludes it from Git.
echo.
notepad ".env"
echo.
echo Building catalog collections and downloading TMDB metadata...
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. Read the error above and check your .env credentials and internet connection.
  pause
  exit /b 1
)
echo.
echo Local build completed. Generated files are in the public folder.
echo For Nuvio on other devices, follow README.md to publish through GitHub Pages.
pause
