@echo off
setlocal

:: -------------------------
:: READ ARGUMENTS
:: -------------------------
set "request_name=%~1"
set "bg_type=%~2"
set "bg_format=%~3"
set "shot_type=%~4"
set "shot_format=%~5"
set "shot_name=%~6"
:: -------------------------
:: project structure paths 
:: -------------------------
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set MAIN_PATH=%ROOT_DIR%\HarmonyAdapter.bat
set TEST_INPUT_FOLDER=%ROOT_DIR%\tests\input
set TEST_OUTPUT_FOLDER=%ROOT_DIR%\tests\output



:: TEST ID
set testid=%RANDOM%


:: SOURCE BG
set bg_file=%TEST_INPUT_FOLDER%\%bg_format%\%bg_type%.%bg_format%

:: SOURCE CADRES
set cadres_json=%TEST_INPUT_FOLDER%\%bg_format%\%bg_type%.json

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

:: OUTPUT VIDEO 
set video_path=%TEST_OUTPUT_FOLDER%\video\%shot_name%_%shot_type%_%testid%.mp4
:: normalize the path before running CLI
for %%I in ("%video_path%") do set video_path=%%~fI


:: OUTPUT JSON
set json_path=%TEST_OUTPUT_FOLDER%\json\%shot_name%_%shot_type%_%testid%.json
:: normalize the path before running CLI
for %%I in ("%json_path%") do set json_path=%%~fI

:: --- Run CLI ---
call "%MAIN_PATH%" -r %request_name% -b %bg_file% -sn %shot_name% -sf "%shot_path%" -o "%video_path%" -ot mp4 -j "%json_path%" -cad "%cadres_json%""

echo.%shot_folder%

:: Open result
start "" "%video_path%"

endlocal
