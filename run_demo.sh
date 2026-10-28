#!/usr/bin/env bash
# Edge-AI Predictive Maintenance - Launcher for Linux/macOS

echo -e "\033[36m==========================================================\033[0m"
echo -e "\033[36m  Edge-AI Predictive Maintenance for Rotating Machinery   \033[0m"
echo -e "\033[36m  TinyML + ESP32 Academic Demonstration Launcher          \033[0m"
echo -e "\033[36m==========================================================\033[0m"

# Trap exit to kill child jobs
trap 'kill 0' EXIT

echo -e "\033[33mStarting FastAPI Backend on port 8000...\033[0m"
python backend/run.py &
BACKEND_PID=$!

echo -e "\033[33mStarting React Vite Frontend on port 5173...\033[0m"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo -e "\033[32m[SUCCESS] Services running!\033[0m"
echo -e "Backend API:  http://127.0.0.1:8000/docs"
echo -e "Dashboard UI: http://127.0.0.1:5173"
echo -e "Press [CTRL+C] to stop all processes."

wait
