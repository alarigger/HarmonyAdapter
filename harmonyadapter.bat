@echo off
setlocal

set SCRIPT_DIR=%~dp0
set VENV_ACTIVATE=%SCRIPT_DIR%\.venv\Scripts\activate.bat
set MAIN_PATH=%SCRIPT_DIR%\src\harmonyadapter\cli.py

:: --- Activate venv if present ---
set VENV_ACTIVE=0
if exist "%VENV_ACTIVATE%" (
    echo Activating virtual environment
    call "%VENV_ACTIVATE%"
    set VENV_ACTIVE=1
) else (
    echo No virtual environment found, using system Python
)

:: --- Run CLI ---
python "%MAIN_PATH%" %*

:: --- Deactivate only if we activated ---
if "%VENV_ACTIVE%"=="1" (
    call deactivate
)

endlocal

