@echo off
cd /d "%~dp0server"
echo Importing Real Cricsheet IPL Database...
node seed/importRealCricsheetIPL.js
pause
