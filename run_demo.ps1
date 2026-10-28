# Edge-AI Predictive Maintenance - One-Click Launcher for Windows PowerShell

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Edge-AI Predictive Maintenance for Rotating Machinery   " -ForegroundColor Cyan
Write-Host "  TinyML + ESP32 Academic Demonstration Launcher          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    $pyVersion = python --version
    Write-Host "[OK] Python detected: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check Node
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Services..." -ForegroundColor Yellow
Write-Host "1. FastAPI Backend: http://127.0.0.1:8000 (Docs: /docs)" -ForegroundColor White
Write-Host "2. React Frontend:  http://127.0.0.1:5173" -ForegroundColor White
Write-Host ""

# Start FastAPI backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- FastAPI Predictive Maintenance Backend ---' -ForegroundColor Cyan; python backend/run.py"

# Start React Vite frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '--- React Vite Dashboard ---' -ForegroundColor Cyan; cd frontend; npm run dev"

Write-Host "[SUCCESS] Both services launched in separate windows!" -ForegroundColor Green
Write-Host "Open your browser to: http://127.0.0.1:5173" -ForegroundColor Cyan
