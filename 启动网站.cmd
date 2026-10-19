@echo off
chcp 65001 >nul
cd /d "%~dp0"
set ASTRO_TELEMETRY_DISABLED=1
echo 网站启动后，请打开 http://localhost:4321
echo 保持本窗口打开，按 Ctrl+C 可停止。
call npm run dev
pause
