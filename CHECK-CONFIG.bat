@echo off
echo.
echo =======================================================
echo CHECK TWIML APP CONFIGURATION
echo =======================================================
echo.

cd backend
node check-twiml-app-config.js
cd ..

echo.
pause
