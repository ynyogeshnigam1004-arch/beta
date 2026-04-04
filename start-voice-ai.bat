@echo off
REM ============================================================================
REM Voice AI Platform - Permanent Startup Script
REM ============================================================================
REM This script starts both backend and frontend servers with all models
REM Last Updated: 2025-01-29
REM ============================================================================

echo.
echo ========================================
echo   VOICE AI PLATFORM - STARTING
echo ========================================
echo.

REM Kill any existing Node processes
echo [1/4] Stopping existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Start Backend Server (Port 5000)
echo [2/4] Starting Backend Server (Port 5000)...
echo    - Groq API (20+ LLM models + STT)
echo    - Cartesia API (100+ voices + TTS)
echo    - MongoDB Connected
echo.
start "Voice AI Backend - Port 5000" cmd /k "cd /d "%~dp0backend" && echo ========================================= && echo    BACKEND SERVER - PORT 5000 && echo ========================================= && echo. && echo Features: && echo   - 20+ LLM Models (Llama, Gemma, Qwen, etc.) && echo   - 3+ Whisper Transcribers (STT) && echo   - 100+ Cartesia Voices (TTS) && echo   - Real-time Streaming && echo   - Auto Rate Limit Handling && echo. && echo Starting... && echo. && node server.js"

REM Wait for backend to start
echo [3/4] Waiting for backend to initialize...
timeout /t 8 >nul

REM Start Frontend Server (Port 3000)
echo [4/4] Starting Frontend Server (Port 3000)...
start "Voice AI Frontend - Port 3000" cmd /k "cd /d "%~dp0frontend" && echo ========================================= && echo    FRONTEND SERVER - PORT 3000 && echo ========================================= && echo. && echo Starting React + Vite... && echo. && npm run dev"

echo.
echo ========================================
echo   SERVERS STARTING...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Two terminal windows will open.
echo Keep both windows open while using the app!
echo.
echo Opening browser in 15 seconds...
timeout /t 15 >nul

REM Open browser
start http://localhost:3000

echo.
echo ========================================
echo   DONE! Browser opened.
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
