@echo off
title 24h Agent Orchestrator

pushd %~dp0
cd 24h-agent-orchestrator
if errorlevel 1 (
    echo [ERROR] Cannot find project directory
    pause
    exit /b 1
)

echo ===============================
echo  24h Agent Orchestrator
echo  Port: 3000
echo ===============================
echo.
echo [orchestrator] Checking port 4096...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr "127.0.0.1:4096" ^| findstr LISTENING') do (
    echo [orchestrator] Port 4096 in use by PID %%a, killing...
    taskkill /F /PID %%a >nul 2>&1
    if %errorlevel% equ 0 (
        echo [orchestrator] Killed process %%a
    )
)
echo [orchestrator] Port 4096 is free
echo.

echo [orchestrator] Starting...
echo [orchestrator] Work dir: %CD%
echo.

if not exist node_modules\ (
    echo [orchestrator] Installing dependencies...
    call npm install
)

call npm run dev
pause
