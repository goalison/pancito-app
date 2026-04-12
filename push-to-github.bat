@echo off
setlocal

:: ============================================================
::  Pancito y Mas — Push to GitHub
::  Double-click this file anytime you want to save your
::  app changes to GitHub.
:: ============================================================

cd /d "%~dp0"

:: Read token from github-token.txt
if not exist "github-token.txt" (
    echo ERROR: github-token.txt not found.
    echo Please create it in this folder and paste your GitHub token inside.
    pause
    exit /b 1
)

set /p TOKEN=<github-token.txt
set TOKEN=%TOKEN: =%

if "%TOKEN%"=="PASTE_YOUR_GITHUB_TOKEN_HERE" (
    echo ERROR: You haven't added your GitHub token yet!
    echo Open github-token.txt and replace the placeholder with your real token.
    pause
    exit /b 1
)

:: Check if there are any changes to commit
git diff --quiet && git diff --cached --quiet
if %ERRORLEVEL%==0 (
    echo No changes to push — everything is already up to date!
    pause
    exit /b 0
)

:: Show what's changed
echo.
echo Files changed:
git status --short
echo.

:: Ask for a commit message
set /p MSG=Describe what you changed (e.g. "Fixed timer bug"):

if "%MSG%"=="" set MSG=Update app

:: Stage all changes, commit, and push
git add -A
git commit -m "%MSG%"

echo.
echo Pushing to GitHub...
git push https://goalison:%TOKEN%@github.com/goalison/pancito-app.git main

if %ERRORLEVEL%==0 (
    echo.
    echo Done! Your changes are live on GitHub.
) else (
    echo.
    echo Something went wrong. Check the error above.
    echo Common fix: make sure your token in github-token.txt is correct and not expired.
)

pause
endlocal
