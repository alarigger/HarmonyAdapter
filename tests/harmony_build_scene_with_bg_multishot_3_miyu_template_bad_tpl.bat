@echo off
setlocal

:: Get folder of this script
set "SCRIPT_DIR=%~dp0"

:: Call template next to this file
call "%SCRIPT_DIR%run_build_scene_test_template.bat" build_scene build_scene_with_bg_multishot_3_miyu_template_bad_tpl SH001_animatic xstage SH003

endlocal
