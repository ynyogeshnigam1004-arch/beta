@echo off
echo ========================================
echo   Voice AI - Simple Start (No Auto-Restart)
echo ========================================
echo.

echo Stopping any existing servers...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Backend...
start "Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo   Backend: http://localhost:5001
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Close the terminal windows to stop servers
