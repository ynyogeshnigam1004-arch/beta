@echo off
echo ========================================
echo   Testing 100ms Streaming
echo ========================================
echo.

echo Starting backend server...
start "Backend Server" cmd /k "cd backend && node server.js"

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers starting!
echo.
echo Next steps:
echo   1. Open browser: http://localhost:5173
echo   2. Select assistant with transcriber: deepgram-nova-2
echo   3. Start call and speak
echo   4. Watch console logs
echo.
echo Expected latency: ~1.5 seconds
echo.
pause
