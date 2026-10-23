# Script para registrar a sincronização do Garmin no Agendador de Tarefas do Windows
# Execute este script no PowerShell (como Administrador ou Usuário atual)

$TaskName = "BioFIT_Garmin_Sync"
$BatPath = Join-Path $PSScriptRoot "sync-garmin.bat"

Write-Host "Criando tarefa agendada: $TaskName" -ForegroundColor Cyan
Write-Host "Executável: $BatPath" -ForegroundColor Gray

# Cria a tarefa para rodar 1x por dia, às 07:00
$Action = New-ScheduledTaskAction -Execute $BatPath
$Trigger = New-ScheduledTaskTrigger -Daily -At 7:00am

# Se o PC estiver desligado/dormindo às 07:00, roda assim que ligar (em vez de pular o dia)
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

# Se já existir, remove antes de recriar
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Sincroniza biometrica do Garmin Connect para o BioFIT automaticamente"

Write-Host "`n✓ Tarefa registrada com sucesso no Agendador do Windows!" -ForegroundColor Green
Write-Host "Horário agendado: 07:00, 1x por dia (roda ao ligar o PC se perder o horário)." -ForegroundColor Yellow
