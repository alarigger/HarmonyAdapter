@echo off
setlocal EnableDelayedExpansion

:: -------------------------
:: READ ARGUMENTS
:: -------------------------
set "request_name=build_scene"
set "scene_path=%~1"
set "shot_name=%~2"
set "json_input_path=%~3"
set "library_path=%~4"
set "output_folder=%~5"

:: -------------------------
:: PROJECT STRUCTURE PATHS
:: -------------------------
set "SCRIPT_DIR=%~dp0"
set "MAIN_PATH=%SCRIPT_DIR%cli.py"

:: -------------------------
:: VALIDATE INPUTS
:: -------------------------
if "%scene_path%"=="" (
    echo ERROR: scene_path is empty
    exit /b 1
)

if not exist "%scene_path%" (
    echo ERROR: scene file does not exist:
    echo %scene_path%
    exit /b 1
)

:: -------------------------
:: RESOLVE SOURCE FOLDER
:: Example:
:: B\A.xstage  -> source_folder = B
:: -------------------------
for %%I in ("%scene_path%") do (
    set "scene_file=%%~nxI"
    set "scene_folder=%%~dpI"
)

:: Remove trailing backslash from scene_folder
if "!scene_folder:~-1!"=="\" (
    set "scene_folder=!scene_folder:~0,-1!"
)

echo Source Scene  : %scene_path%
echo Source Folder : !scene_folder!
echo Output Folder : %output_folder%

:: -------------------------
:: CREATE OUTPUT FOLDER
:: -------------------------
if not exist "%output_folder%" (
    mkdir "%output_folder%"
)

:: -------------------------
:: COPY ENTIRE PROJECT
:: -------------------------
echo Copying project...

robocopy "!scene_folder!" "%output_folder%" /E /Z /R:3 /W:5

:: Robocopy returns codes >0 even on success
if %ERRORLEVEL% GEQ 8 (
    echo ERROR: Robocopy failed
    exit /b 1
)

:: -------------------------
:: RESOLVE COPIED SCENE PATH
:: Example:
:: B\A.xstage -> C\A.xstage
:: -------------------------
set "pasted_path=%output_folder%\%scene_file%"

:: Normalize path
for %%I in ("%pasted_path%") do (
    set "pasted_path=%%~fI"
)

echo Copied Scene  : %pasted_path%

:: -------------------------
:: RUN PYTHON CLI
:: -------------------------
echo Running Python CLI...

:: -------------------------
:: HARMONY LIBRARY PATH
:: Needed to resolve __LIBRARY__ asset paths
:: -------------------------

if not exist "%library_path%" (
    echo ERROR: Library path does not exist:
    echo %library_path%
    exit /b 1
)

set "HARMONY_LIBRARY_PATH=%library_path%"

echo HARMONY_LIBRARY_PATH=%HARMONY_LIBRARY_PATH%

python "%MAIN_PATH%" -r %request_name% -sn %shot_name% -sp "%pasted_path%" -ji "%json_input_path%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python execution failed
    exit /b 1
)

echo Done.
endlocal