@echo off
setlocal

:: -------------------------
:: project structure paths 
:: -------------------------
set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
set TESTED_SCRIPT_RELATIVE_PATH=src\HarmonyAdapter\app\integrations\harmony\cli.py

set TEST_INPUT_FOLDER=%ROOT_DIR%\tests\input
set TEST_OUTPUT_FOLDER=%ROOT_DIR%\tests\output

:: TEST ID
set testid=%RANDOM%

:: SOURCE SHOT
set scene_name=my_scene
set shot_source_folder=%TEST_INPUT_FOLDER%\xstage\run_script\my_scene

:: COPY SOURCE SCENE TO UNIQUE OUTPUT FOLDER
set test_folder=%TEST_OUTPUT_FOLDER%\xstage\run_script
set shot_folder=%test_folder%\import_image_%RANDOM%
mkdir "%shot_folder%"

robocopy "%shot_source_folder%" "%shot_folder%" /E /Z /R:3 /W:5

:: OUTPUT SHOT FILE
set xstage_path=%shot_folder%\my_scene.xstage
:: normalize the xstage path before running CLI
for %%I in ("%xstage_path%") do set xstage_path=%%~fI

:: INPUT IMAGE FILE 
set image_path=%TEST_INPUT_FOLDER%/images/wizard.png
for %%I in ("%image_path%") do set image_path=%%~fI

:: VIDEO OUTPUT
set output_path=%TEST_OUTPUT_FOLDER%\video\import_image_%RANDOM%.mp4
for %%I in ("%output_path%") do set output_path=%%~fI


:: the name of the js file to run  the string "Myscript" will load ../harmony/scripts/Myscript.js
set SCRIPT_NAME=import_image

:: --- Run CLI ---
set BAT=%ROOT_DIR%\tests\run_submodule_test.bat
call "%BAT%" "%TESTED_SCRIPT_RELATIVE_PATH%" -x %xstage_path% -run_script %SCRIPT_NAME% -ip %image_path% -render %output_path%


echo.OPEN VIDEO 
echo.%output_path%
start %output_path%

pause 

echo.OPEN XTAGE  
echo.%xstage_path%

start %xstage_path%

endlocal
