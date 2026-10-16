@echo off
REM =============================================================================
REM push-test.cmd - ONE CLICK: deploy to the TEST REALM + Discord announce.
REM
REM Target: https://zenithvalues.github.io/Apex-Ball-TD-WIKI/
REM         (https://github.com/ZenithValues/Apex-Ball-TD-WIKI)
REM
REM The test realm is gated (visitors need team login), shows NO ads, and is
REM built by that repo's own GitHub Actions with the right /Apex-Ball-TD-WIKI/
REM base path. It uses the SAME live database as the main site - admin edits
REM made on the test site are REAL.
REM
REM Works whether launched from the outer unzipped folder or from inside
REM apex-td-project\: it automatically steps into the code folder, links it to
REM the TEST repo, adopts its history, commits, and pushes to main.
REM push-message.txt is NOT consumed, so push.cmd still gets the full message.
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
  echo Make sure you extracted the entire zip archive before running push-test.cmd.
  pause
  exit /b 1
)

set "APEX_TEST_REMOTE=https://github.com/ZenithValues/Apex-Ball-TD-WIKI.git"

set "MSG="
if exist "push-message.txt" set /p "MSG=" < "push-message.txt"
if not defined MSG if exist "%~dp0push-message.txt" set /p "MSG=" < "%~dp0push-message.txt"
if not defined MSG set "MSG=Test deploy %DATE%"
set "MSG=[TEST] %MSG%"

echo.
echo [1/4] Committing from "%CD%": %MSG%

REM --- link this folder to the TEST repo (always force the correct target)
if not exist ".git" (
  echo       first run here - linking this folder to the TEST repo...
  git init >nul 2>&1
  git checkout -b main >nul 2>&1
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (git remote add origin %APEX_TEST_REMOTE%) else (git remote set-url origin %APEX_TEST_REMOTE%)

REM --- anchor on the TEST repo's history (no-op if already synced)
echo       fetching test repo...
git fetch -q origin main
if errorlevel 1 goto :failfetch
git reset -q --soft FETCH_HEAD

REM --- commit + push -----------------------------------------------------------
git add -A
git commit -m "%MSG%" >nul 2>&1
if errorlevel 1 echo       nothing new to commit - continuing

echo.
echo [2/4] Pushing to the TEST repo ^(main^)...
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
echo [4/4] Done - the TEST site is building on GitHub.
echo       Check: https://zenithvalues.github.io/Apex-Ball-TD-WIKI/
pause
exit /b 0

:failfetch
echo.
echo Could not reach GitHub. Check your internet / git login, then run again.
echo If the ZenithValues/Apex-Ball-TD-WIKI repo was renamed or deleted,
echo this script needs its new address.
pause
exit /b 1

:fail
echo.
echo Push FAILED - see the git output above.
pause
exit /b 1
