@echo off
setlocal

:: Get folder of this script
set "SCRIPT_DIR=%~dp0"

:: Call template next to this file
call "%SCRIPT_DIR%run_test_template.bat" ^
    preview_shot ^
    camera_panH ^
    psd ^
    SH001_camera_panH^
    xstage ^
    SH001

endlocal
