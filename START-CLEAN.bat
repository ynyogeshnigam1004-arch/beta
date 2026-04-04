@echo off
echo ========================================
echo   Voice AI Platform - Clean Start
echo ========================================
echo.

echo [1/3] Stopping all Node processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Clearing port 5001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do taskkill /f /pid %%a 2>nul
timeout /t 1 /nobreak >nul

echo [3/3] Starting servers...
echo.
npm start
