@echo off
cd /d \%~dp0server\
echo Starting IPL Auction Backend Server on port 5000...
node server.js
pause
