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
echo [orchestrator] Starting...
echo [orchestrator] Work dir: %CD%
echo.

if not exist node_modules\ (
    echo [orchestrator] Installing dependencies...
    call npm install
)

call npm run dev
pause
