@echo off
cd /d "%~dp0"

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo Bolao Brasil ja esta rodando em http://localhost:3000
  start http://localhost:3000
  pause
  exit /b 0
)

set "NODE_EXE=node"

where node >nul 2>nul
if not %errorlevel%==0 set "NODE_EXE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE_EXE%" if "%NODE_EXE%"=="C:\Program Files\nodejs\node.exe" (
  echo Node.js nao foi encontrado neste computador.
  echo Instale o Node.js LTS em https://nodejs.org/ e abra este arquivo novamente.
  echo.
  pause
  exit /b 1
)

"%NODE_EXE%" backend\server.js
pause
