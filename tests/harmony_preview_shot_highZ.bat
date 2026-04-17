@echo off
setlocal

:: Get folder of this script
set "SCRIPT_DIR=%~dp0"

:: Call template next to this file
call "%SCRIPT_DIR%run_preview_test_template.bat" ^
    preview_shot ^
    multishot_123 ^
    psd ^
    SH001_camera_highZ ^
    xstage ^
    SH001

endlocal
