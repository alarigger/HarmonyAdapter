@echo off
setlocal

:: -------------------------------------------------------
:: Harmony UI Launcher (NO -batch flag)
:: Usage: launcher_noBatch.bat <harmony_exe> <scene_path> <script>
::
:: Without -batch, the full Harmony scripting API is available:
::   - node.add("READ") creates a proper READ module (not PLACEHOLDER)
::   - column.setEntry() works without ACCESS_VIOLATION
::   - All drawing/element APIs work as documented
::
:: REQUIREMENT: the script MUST call scene.saveAll() and System.exit(0)
:: at the end, or Harmony will stay open after the script completes.
:: -------------------------------------------------------

set "HARMONY_EXE=%~1"
set "SCENE_PATH=%~2"
set "SCRIPT_PATH=%~3"

if "%HARMONY_EXE%"=="" (
    echo [launcher_noBatch] ERROR: No Harmony executable provided.
    exit /b 1
)

if "%SCENE_PATH%"=="" (
    echo [launcher_noBatch] ERROR: No scene path provided.
    exit /b 1
)

if "%SCRIPT_PATH%"=="" (
    echo [launcher_noBatch] ERROR: No script path provided.
    exit /b 1
)

echo [launcher_noBatch] Executable : %HARMONY_EXE%
echo [launcher_noBatch] Scene      : %SCENE_PATH%
echo [launcher_noBatch] Script     : %SCRIPT_PATH%
echo [launcher_noBatch] Args       : %HARMONY_WRAPPER_ARGS%
echo.

:: Launch Harmony WITHOUT -batch — all scripting APIs available.
:: Syntax: -compile -script <script> <scene>  (NOT: scene -compile script)
:: This is the correct form that gives access to READ nodes, column.setEntry, etc.
:: The script MUST call scene.saveAll() + System.exit(0) to close Harmony.
"%HARMONY_EXE%" -compile -script "%SCRIPT_PATH%" "%SCENE_PATH%"

set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% neq 0 (
    echo [launcher_noBatch] ERROR: Harmony exited with code %EXIT_CODE%.
) else (
    echo [launcher_noBatch] Done.
)

exit /b %EXIT_CODE%
