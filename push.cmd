@echo off
REM =============================================================================
REM push.cmd - ONE CLICK: commit + push to the MAIN WEBSITE repo + Discord announce.
REM
REM Target: https://github.com/ApexBallValuesWiki/ApexBallValuesWiki.github.io
REM         (its deploy.yml workflow builds + publishes the site automatically)
REM
REM The commit message is automatic (from push-message.txt shipped with every
REM update - no typing). Works in ANY folder, even a fresh unzip: it links the
REM folder to the website repo, adopts its history, commits, pushes to main.
REM The remote is ALWAYS forced to the website repo, so it can never push to
REM any other repo by accident.
REM =============================================================================
setlocal
cd /d "%~dp0"

set "APEX_REMOTE=https://github.com/ApexBallValuesWiki/ApexBallValuesWiki.github.io.git"

set "MSG="
if exist "push-message.txt" set /p "MSG=" < "push-message.txt"
if not defined MSG set "MSG=Site update %DATE%"

echo.
echo [1/4] Committing: %MSG%
if exist "push-message.txt" del "push-message.txt" >nul 2>&1

REM --- link this folder to the website repo (always force the correct target)
if not exist ".git" (
  echo       first run here - linking this folder to the website repo...
  git init >nul 2>&1
  git checkout -b main >nul 2>&1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (git remote add origin %APEX_REMOTE%) else (git remote set-url origin %APEX_REMOTE%)

REM --- anchor on the website repo's history (no-op if already synced)
git fetch -q origin main
if errorlevel 1 goto :failfetch
git reset -q --soft FETCH_HEAD

REM --- commit + push -----------------------------------------------------------
git add -A
git commit -m "%MSG%" >nul 2>&1
if errorlevel 1 echo       nothing new to commit - continuing

echo.
echo [2/4] Pushing to the website repo ^(main^)...
git push origin HEAD:main
if errorlevel 1 goto :fail

echo.
echo [3/4] Announcing on Discord...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0notify.ps1" -Message "%MSG%"
if errorlevel 1 echo       ^(announce failed - but the push went through^)

echo.
echo [4/4] Done - the site is building on GitHub.
pause
exit /b 0

:failfetch
echo.
echo Could not reach GitHub. Check your internet / git login, then run again.
pause
exit /b 1

:fail
echo.
echo Push FAILED - see the git output above.
pause
exit /b 1
