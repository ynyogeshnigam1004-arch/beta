@echo off
echo ========================================
echo   Restarting Frontend Only
echo ========================================
echo.

echo Stopping frontend...
taskkill /f /im node.exe /fi "WINDOWTITLE eq Frontend*" 2>nul

timeout /t 2 /nobreak >nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Frontend Restarted!
echo   URL: http://localhost:3000
echo ========================================
echo.
echo Now you can see Deepgram options in the Transcriber dropdown!
