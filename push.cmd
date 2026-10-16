@echo off
REM =============================================================================
REM push.cmd - ONE CLICK: commit + push to the MAIN WEBSITE repo + Discord announce.
REM
REM Target: https://github.com/ApexBallValuesWiki/ApexBallValuesWiki.github.io
REM         (its deploy.yml workflow builds + publishes the site automatically)
REM
REM The commit message is automatic (from push-message.txt shipped with every
REM update - no typing). Works whether launched from the outer unzipped folder
REM or from inside apex-td-project\: it automatically steps into the code folder,
REM links it to the website repo, adopts its history, commits, and pushes to main.
REM =============================================================================
setlocal
cd /d "%~dp0"

REM --- If launched from the outer zip wrapper folder, step into the code folder
if not exist "package.json" (
  if exist "apex-td-project\package.json" (
    if exist ".git" rmdir /s /q ".git" >nul 2>&1
    cd /d "%~dp0apex-td-project"
  ) else if exist "apex-td-final\package.json" (
    if exist ".git" rmdir /s /q ".git" >nul 2>&1
    cd /d "%~dp0apex-td-final"
  )
)

if not exist "package.json" (
  echo.
  echo ERROR: Could not find package.json in "%CD%" or ".\apex-td-project".
  echo Make sure you extracted the entire zip archive before running push.cmd.
  pause
  exit /b 1
)

set "APEX_REMOTE=https://github.com/ApexBallValuesWiki/ApexBallValuesWiki.github.io.git"

set "MSG="
if exist "push-message.txt" set /p "MSG=" < "push-message.txt"
if not defined MSG if exist "%~dp0push-message.txt" set /p "MSG=" < "%~dp0push-message.txt"
if not defined MSG set "MSG=Site update %DATE%"

echo.
echo [1/4] Committing from "%CD%": %MSG%
if exist "push-message.txt" del "push-message.txt" >nul 2>&1
if exist "%~dp0push-message.txt" del "%~dp0push-message.txt" >nul 2>&1

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
if exist "%CD%\notify.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\notify.ps1" -Message "%MSG%"
  if errorlevel 1 echo       ^(announce skipped or failed - but the push went through^)
) else if exist "%~dp0notify.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0notify.ps1" -Message "%MSG%"
  if errorlevel 1 echo       ^(announce skipped or failed - but the push went through^)
) else (
  echo       ^(notify.ps1 not found - skipping Discord announce, push succeeded^)
)

echo.
echo [4/4] Done - the site is building on GitHub.
echo       Check: https://apexballvalueswiki.github.io/
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
