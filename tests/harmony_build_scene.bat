@echo off
setlocal

:: Get folder of this script
set "SCRIPT_DIR=%~dp0"

:: Call template next to this file
call "%SCRIPT_DIR%run_build_scene_test_template.bat" ^
    build_scene ^
    multishot_123 ^
    psd ^
    SH001_camera_rest ^
    xstage ^
    SH001

endlocal
