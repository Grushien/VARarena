@echo off
title VASVAR ARENA
cd /d "%~dp0"
echo ==============================================
echo    VASVAR ARENA - Bajnokok Kora
echo.
echo    A jatek megnyilik a bongeszoben...
echo    NE zard be ezt az ablakot, amig jatszol!
echo ==============================================
start "" "http://localhost:8123"
python -m http.server 8123 2>nul
if errorlevel 1 py -m http.server 8123
