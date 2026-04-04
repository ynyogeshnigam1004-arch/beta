@echo off
echo ========================================
echo   Restarting Backend with Deepgram Fix
echo ========================================
echo.

echo Stopping backend...
taskkill /f /im node.exe /fi "WINDOWTITLE eq Backend*" 2>nul

timeout /t 2 /nobreak >nul

echo Starting Backend...
start "Backend" cmd /k "cd backend && node server.js"

echo.
echo ========================================
echo   Backend Restarted!
echo   URL: http://localhost:5001
echo ========================================
echo.
echo Now the /api/transcribers endpoint includes Deepgram!
echo Click "Refresh Models" in the browser to see them.
pause
