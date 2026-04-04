@echo off
echo.
echo ========================================
echo   VAPI-Level Streaming Test
echo ========================================
echo.
echo Stopping existing servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
cd backend
start "Backend Server" cmd /k "echo Backend Server (Port 5001) && npm start"
timeout /t 3 /nobreak >nul

echo.
echo Starting frontend server...
cd ..
cd frontend
start "Frontend Server" cmd /k "echo Frontend Server (Port 5173) && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo Performance Targets:
echo   - Batch Mode (Groq Whisper): ~5.7 seconds
echo   - Streaming Mode (Deepgram): ~1.2 seconds
echo   - Improvement: 78%% faster!
echo.
echo Testing Instructions:
echo   1. Open: http://localhost:5173
echo   2. Go to Assistants page
echo   3. Edit assistant
echo   4. Set Transcriber: deepgram-nova-2
echo   5. Set Voice Provider: cartesia
echo   6. Start call and speak
echo   7. Watch console for [STREAMING] logs
echo.
echo See TEST_VAPI_SPEED_NOW.md for detailed guide
echo.
pause
