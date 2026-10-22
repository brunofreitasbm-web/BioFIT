# Script para registrar a sincronização do Garmin no Agendador de Tarefas do Windows
# Execute este script no PowerShell (como Administrador ou Usuário atual)

$TaskName = "BioFIT_Garmin_Sync"
$BatPath = Join-Path $PSScriptRoot "sync-garmin.bat"

Write-Host "Criando tarefa agendada: $TaskName" -ForegroundColor Cyan
Write-Host "Executável: $BatPath" -ForegroundColor Gray

# Cria a tarefa para rodar às 07:00 e às 17:00 todos os dias
$Action = New-ScheduledTaskAction -Execute $BatPath
$TriggerManha = New-ScheduledTaskTrigger -Daily -At 7:00am
$TriggerTarde = New-ScheduledTaskTrigger -Daily -At 5:00pm

# Se já existir, remove antes de recriar
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger @($TriggerManha, $TriggerTarde) -Description "Sincroniza biometrica do Garmin Connect para o BioFIT automaticamente"

Write-Host "`n✓ Tarefa registrada com sucesso no Agendador do Windows!" -ForegroundColor Green
Write-Host "Horários agendados: 07:00 (ao acordar) e 17:00 (antes do treino)." -ForegroundColor Yellow
