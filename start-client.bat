@echo off
cd /d \%~dp0client\
echo Starting IPL Auction Frontend on http://localhost:5173...
call npm.cmd run dev
pause
