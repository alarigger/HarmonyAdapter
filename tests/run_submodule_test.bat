@echo off
setlocal

:: ---- folder of this batch ----
set SCRIPT_DIR=%~dp0..
echo.%SCRIPT_DIR%

:: ---- first argument = relative path to Python script ----
set TESTED_RELATIVE_PATH=%~1
shift

:: ---- resolve full path to the Python script ----
set MAIN_PATH=%SCRIPT_DIR%\%TESTED_RELATIVE_PATH%

:: ---- virtual environment ----
set VENV_ACTIVATE=%SCRIPT_DIR%\.venv\Scripts\activate.bat
set VENV_ACTIVE=0
if exist "%VENV_ACTIVATE%" (
    echo Activating virtual environment
    call "%VENV_ACTIVATE%"
    set VENV_ACTIVE=1
) else (
    echo No virtual environment found, using system Python
)

:: ---- rebuild remaining arguments after shift ----
set "ARGS="
:loop
if "%~1"=="" goto afterloop
set ARGS=%ARGS% "%~1"
shift
goto loop
:afterloop

:: ---- build command for debugging ----
set cmd=python "%MAIN_PATH%" %ARGS%
echo Running: %cmd%

:: ---- run Python CLI with the remaining args ONLY ----
call %cmd%

:: ---- deactivate venv if activated ----
if "%VENV_ACTIVE%"=="1" (
    call deactivate
)

endlocal