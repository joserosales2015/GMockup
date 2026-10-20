@echo off
cd /d "%~dp0"
echo Abre http://127.0.0.1:4173 en tu navegador.
echo Manten esta ventana abierta mientras usas GMockup.
node server.mjs
pause
