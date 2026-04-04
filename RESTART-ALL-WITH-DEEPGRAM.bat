@echo off
echo ========================================
echo   Restarting Voice AI with Deepgram
echo ========================================
echo.

echo Stopping all Node processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Starting Backend Server...
start "Backend" cmd /k "cd backend && node server.js"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:3000
echo.
echo NEW FEATURES:
echo   - Deepgram STT options now available!
echo   - Go to Assistants page
echo   - Edit assistant
echo   - Click Transcriber tab
echo   - Select "Deepgram Nova-2 (ULTRA-FAST)"
echo.
echo IMPORTANT: Do a hard refresh (Ctrl+Shift+R) 
echo            on the browser to see new options!
echo.
echo ========================================
pause
