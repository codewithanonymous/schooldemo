@echo off
title School Management System - Startup Utility
color 0A
cls

echo ==========================================================
echo       SCHOOL MANAGEMENT SYSTEM - STARTUP UTILITY
echo ==========================================================
echo.
echo [1/3] Checking environment...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not added to your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

echo Node.js version:
call node -v
echo.

:: Check for .env file
if not exist ".env" (
    color 0E
    echo [WARNING] .env file is missing.
    echo Please ensure you create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
    echo.
)

echo [2/3] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] node_modules not found. Automatically installing dependencies...
    echo Running: npm install ...
    call npm install
) else (
    echo [INFO] node_modules exists. Skipping auto-install.
    echo [TIP] If you experience issues, delete the "node_modules" folder and rerun this script.
)

echo.
echo [3/3] Starting Vite development server...
echo The application will run at: http://localhost:5173
echo.
call npm run dev

pause
