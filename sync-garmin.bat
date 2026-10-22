@echo off
REM ==============================================================
REM  BioFIT - Sincronizacao Garmin Connect
REM  Executa a sincronizacao de biometria para o app e Coach IA
REM ==============================================================

cd /d "%~dp0"
echo [%date% %time%] Iniciando sincronizacao Garmin Connect...

python biofit_garmin_sync.py --dias 3

echo [%date% %time%] Sincronizacao finalizada!
