@echo off
setlocal

:: Get folder of this script
set "SCRIPT_DIR=%~dp0"

:: Call template next to this file
call "%SCRIPT_DIR%run_build_scene_test_template.bat" build_scene build_scene_with_bg_truckin_1_miyu SH001_camera_truckin xstage SH001

endlocal
