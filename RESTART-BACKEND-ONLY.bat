@echo off
echo ========================================
echo 🔄 RESTARTING BACKEND ONLY
echo ========================================
echo.
echo ✅ Changes Applied:
echo   - Auto-detect audio format (PCM or WebM)
echo   - Works with both Deepgram and Groq
echo   - Automatic format conversion if needed
echo.

REM Kill backend only
echo 🛑 Stopping backend...
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start backend
echo.
echo 🚀 Starting backend server...
start "Backend Server" cmd /k "cd backend && echo 🔧 Backend Server Starting... && npm start"

echo.
echo ========================================
echo ✅ BACKEND RESTARTED
echo ========================================
echo.
echo 📝 Frontend is still running - just refresh browser
echo.
pause
