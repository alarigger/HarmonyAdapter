@echo off
setlocal

:: -------------------------
:: READ ARGUMENTS
:: -------------------------
set "request_name=%~1"
set "json_input_name=%~2"
set "shot_type=%~3"
set "shot_format=%~4"
set "shot_name=%~5"

:: -------------------------
:: project structure paths 
:: -------------------------
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set MAIN_PATH=%ROOT_DIR%\harmonyadapter.bat
set TEST_INPUT_FOLDER=%ROOT_DIR%\tests\input
set TEST_OUTPUT_FOLDER=%ROOT_DIR%\tests\output


::

:: TEST ID
set testid=%RANDOM%


:: normalize the bg_file before running CLI
for %%I in ("%bg_file%") do set bg_file=%%~fI

:: SOURCE SHOT
set scene_name=%shot_type%
set shot_source_folder=%TEST_INPUT_FOLDER%\%shot_format%\%scene_name%

:: COPY SOURCE SCENE TO UNIQUE OUTPUT FOLDER
set test_folder=%TEST_OUTPUT_FOLDER%\%shot_format%\%testid%
set shot_folder=%test_folder%\%scene_name%
:: normalize the shot_path path before running CLI
for %%I in ("%shot_folder%") do set shot_folder=%%~fI

mkdir "%shot_folder%"

robocopy "%shot_source_folder%" "%shot_folder%" /E /Z /R:3 /W:5

:: OUTPUT SHOT FILE
set shot_path=%shot_folder%\%scene_name%.%shot_format%
:: normalize the shot_path path before running CLI
for %%I in ("%shot_path%") do set shot_path=%%~fI


:: OUTPUT SHOT FILE
set new_scene_folder=%test_folder%\build
mkdir "%new_scene_folder%"

set new_scene_path=%new_scene_folder%\%scene_name%.%shot_format%
for %%I in ("%new_scene_path%") do set new_scene_path=%%~fI



:: OUTPUT JSON
set json_path=%TEST_OUTPUT_FOLDER%\json\%shot_name%_%shot_type%_%testid%.json

:: normalize the path before running CLI
for %%I in ("%json_path%") do set json_path=%%~fI

:: normalize the path before running CLI
set json_input_path=%TEST_OUTPUT_FOLDER%\json\build_scene\%json_input_name%.json
for %%I in ("%json_input_path%") do set json_input_path=%%~fI

set HARMONY_LIBRARY_PATH="%TEST_INPUT_FOLDER%\tpl\library"
for %%I in ("%HARMONY_LIBRARY_PATH%") do set HARMONY_LIBRARY_PATH=%%~fI

:: --- Run CLI ---
call "%MAIN_PATH%" -r %request_name% -sn %shot_name% -sp "%shot_path%" -ji "%json_input_path%" -o "%new_scene_path%"

echo.%shot_folder%

endlocal
