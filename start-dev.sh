#!/bin/bash

echo "Starting Plagiarism Checker Development Environment..."

echo ""
echo "Starting Backend Server..."
cd Back-end
python main.py &
BACKEND_PID=$!

echo ""
echo "Waiting for backend to start..."
sleep 5

echo ""
echo "Starting Frontend Development Server..."
cd ../Front-end
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Both servers are starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait






