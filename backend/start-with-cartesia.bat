@echo off
echo ========================================
echo Setting Cartesia API Key...
echo ========================================
set CARTESIA_API_KEY=sk_car_PRRWgDdXgSWykzUWXA11uR
echo Key set: %CARTESIA_API_KEY:~0,15%...

echo.
echo ========================================
echo Starting Backend Server...
echo ========================================
cd /d "%~dp0"
node server.js
