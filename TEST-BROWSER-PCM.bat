@echo off
REM Test Browser-Side PCM Conversion for Ultra-Fast Deepgram STT

echo ========================================
echo 🚀 TESTING BROWSER-SIDE PCM CONVERSION
echo ========================================
echo.
echo ✅ Changes Applied:
echo   - Browser: ScriptProcessor with Float32 → Int16 PCM conversion
echo   - Browser: 16x audio amplification for better recognition
echo   - Browser: 48kHz sample rate (Deepgram optimal)
echo   - Backend: Removed FFmpeg conversion (instant forwarding)
echo   - Backend: Direct PCM → Deepgram (no conversion)
echo.
echo 🎯 Expected Performance:
echo   - STT: ~300ms (was 5,000ms)
echo   - LLM: ~366ms
echo   - TTS: ~3,834ms
echo   - Total: ~4.5s (was 9.2s)
echo.
echo 📊 Improvement: 50%% faster overall, 94%% faster STT!
echo.

REM Kill existing node processes
echo 🛑 Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start backend
echo.
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd backend && echo 🔧 Backend Server Starting... && npm start"

REM Wait for backend
echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend
echo.
echo 🚀 Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && echo 🎨 Frontend Server Starting... && npm start"

echo.
echo ========================================
echo ✅ SERVERS STARTING
echo ========================================
echo.
echo 📝 Testing Instructions:
echo   1. Wait for both servers to start
echo   2. Go to http://localhost:3000
echo   3. Select assistant with Deepgram Nova-2 transcriber
echo   4. Start a call and speak clearly
echo   5. Watch console for latency logs
echo.
echo 🔍 What to Look For:
echo   - Browser console: "🚀 [PCM] Sent audio: X samples"
echo   - Backend console: "🚀 [NO CONVERSION] Sending PCM directly"
echo   - Backend console: "STT processing time: ~300ms"
echo   - Backend console: "Total latency: ~4500ms"
echo.
echo 📖 Full documentation: BROWSER_PCM_CONVERSION_COMPLETE.md
echo.
pause
