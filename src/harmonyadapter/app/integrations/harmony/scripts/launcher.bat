@echo off
setlocal

:: -------------------------------------------------------
:: Harmony Batch Launcher
:: Usage: launcher.bat <harmony_exe> <scene_path> <script>
:: -------------------------------------------------------

set "HARMONY_EXE=%~1"
set "SCENE_PATH=%~2"
set "SCRIPT_PATH=%~3"

:: Validate arguments
if "%HARMONY_EXE%"=="" (
    echo [launcher] ERROR: No Harmony executable provided.
    exit /b 1
)

if "%SCENE_PATH%"=="" (
    echo [launcher] ERROR: No scene path provided.
    exit /b 1
)

if "%SCRIPT_PATH%"=="" (
    echo [launcher] ERROR: No script path provided.
    exit /b 1
)

:: Confirm resolved paths before execution
echo [launcher] Executable : %HARMONY_EXE%
echo [launcher] Scene      : %SCENE_PATH%
echo [launcher] Script     : %SCRIPT_PATH%
echo [launcher] Args       : %HARMONY_WRAPPER_ARGS%
echo.

:: Launch Harmony in batch mode, injecting the script
"%HARMONY_EXE%" "%SCENE_PATH%" -batch -compile "%SCRIPT_PATH%"

:: Capture and forward Harmony's exit code
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% neq 0 (
    echo [launcher] ERROR: Harmony exited with code %EXIT_CODE%.
) else (
    echo [launcher] Done.
)

exit /b %EXIT_CODE%