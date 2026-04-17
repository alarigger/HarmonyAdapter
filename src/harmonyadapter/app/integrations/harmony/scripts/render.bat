@echo off
setlocal

:: -------------------------------------------------------
:: Harmony Render Launcher
:: Usage: render.bat <harmony_exe> <scene_path>
:: -------------------------------------------------------

set "HARMONY_EXE=%~1"
set "SCENE_PATH=%~2"

:: Validate arguments
if "%HARMONY_EXE%"=="" (
    echo [render] ERROR: No Harmony executable provided.
    exit /b 1
)

if "%SCENE_PATH%"=="" (
    echo [render] ERROR: No scene path provided.
    exit /b 1
)

echo [render] Executable : %HARMONY_EXE%
echo [render] Scene      : %SCENE_PATH%
echo.

:: Launch Harmony in batch render mode
"%HARMONY_EXE%" "%SCENE_PATH%" -batch -compile

set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% neq 0 (
    echo [render] ERROR: Harmony exited with code %EXIT_CODE%.
) else (
    echo [render] Done.
)

exit /b %EXIT_CODE%