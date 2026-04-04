@echo off
echo ========================================
echo   Voice AI Platform - Server Startup
echo ========================================
echo.

echo [1/3] Killing existing node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/3] Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && echo Starting backend... && node server.js"
timeout /t 5 >nul

echo [3/3] Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && echo Starting frontend... && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Two terminal windows will open.
echo Keep both windows open while using the app!
echo.
echo Opening browser in 10 seconds...
timeout /t 10 >nul

start http://localhost:5173

echo.
echo ========================================
echo   Done! Browser opened.
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul

