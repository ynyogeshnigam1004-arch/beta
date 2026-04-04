@echo off
echo ========================================
echo   RESTARTING WITH DEEPGRAM STREAMING
echo ========================================
echo.

echo [1/3] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Starting backend with streaming support...
cd backend
start "Voice AI Backend (Streaming)" cmd /k "npm start"
cd ..

echo.
echo [3/3] Starting frontend...
timeout /t 5 /nobreak >nul
cd frontend
start "Voice AI Frontend" cmd /k "npm start"
cd ..

echo.
echo ========================================
echo   SERVERS STARTING WITH STREAMING!
echo ========================================
echo.
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3000
echo.
echo IMPORTANT:
echo - Make sure transcriber is set to "Deepgram Nova-2"
echo - Watch console for [STREAMING] logs
echo - STT should be ~2.3s (was 4.5s)
echo.
echo Press any key to exit...
pause >nul
