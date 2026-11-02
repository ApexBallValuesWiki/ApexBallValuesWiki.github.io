@echo off
REM ===========================================================================
REM push.cmd - APEX release: commit + NON-FORCE push to ApexBallValuesWiki/ApexBallValuesWiki.github.io.
REM Run from the extracted ZIP root or from inside apex-td-final\.
REM Deploy the shared worker FIRST: see DEPLOY-WORKER.md.
REM ===========================================================================
setlocal EnableExtensions
cd /d "%~dp0"

if not exist "package.json" (
  if exist "apex-td-final\package.json" cd /d "%~dp0apex-td-final"
)
if not exist "package.json" (
  echo ERROR: package.json not found. Extract the whole ZIP before running.
  pause
  exit /b 1
)

set "APEX_REMOTE=https://github.com/ApexBallValuesWiki/ApexBallValuesWiki.github.io.git"
set "MSG="
if exist "push-message.txt" set /p "MSG=" < "push-message.txt"
if not defined MSG if exist "%~dp0push-message.txt" set /p "MSG=" < "%~dp0push-message.txt"
if not defined MSG set "MSG=APEX release 2026-11-02 compliance sync"

echo.
echo   Target repo : ApexBallValuesWiki/ApexBallValuesWiki.github.io
echo   From folder : %CD%
echo   Commit msg  : %MSG%
echo.
set "CONFIRM="
set /p "CONFIRM=Type YES to push: "
if /I not "%CONFIRM%"=="YES" (
  echo Cancelled. Nothing was pushed.
  exit /b 0
)

echo.
echo [1/4] Linking to GitHub...
if not exist ".git" (
  git init >nul 2>&1
  git symbolic-ref HEAD refs/heads/main >nul 2>&1
)
git config user.name >nul 2>&1 || git config user.name "APEX Release"
git config user.email >nul 2>&1 || git config user.email "release@users.noreply.github.com"
git remote get-url origin >nul 2>&1
if errorlevel 1 (git remote add origin %APEX_REMOTE%) else (git remote set-url origin %APEX_REMOTE%)

echo [2/4] Adopting the existing remote history...
git fetch -q origin main
if errorlevel 1 goto :failfetch
git reset -q --soft FETCH_HEAD

echo [3/4] Committing...
git add -A
git commit -m "%MSG%" >nul 2>&1
if errorlevel 1 echo       nothing new to commit - continuing

echo [4/4] Pushing (no force)...
git push origin HEAD:main
if errorlevel 1 goto :fail

echo.
echo Done. GitHub Actions will build and publish https://apexballvalueswiki.github.io
echo REMINDER: deploy the shared worker first - see DEPLOY-WORKER.md
echo.
if exist "webhook.txt" if exist "notify.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "notify.ps1" -Message "%MSG%" >nul 2>&1
)
pause
exit /b 0

:failfetch
echo.
echo Could not reach GitHub. Check internet / git credentials, then run again.
pause
exit /b 1

:fail
echo.
echo Push FAILED. See the git output above. Nothing was force-pushed.
pause
exit /b 1
