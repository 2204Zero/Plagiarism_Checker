@echo off
echo Starting Plagiarism Checker Development Environment...

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd Back-end && python main.py"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd Front-end && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080
echo.
echo Press any key to exit...
pause > nul






