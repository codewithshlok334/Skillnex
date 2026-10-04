param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendRoot = Join-Path $projectRoot 'frontend'
$backendRoot = Join-Path $projectRoot 'backend'
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Install Java 21 and set JAVA_HOME first.' }
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { throw 'Install Maven 3.9+ first.' }
if (-not (Test-Path (Join-Path $frontendRoot 'node_modules'))) { Push-Location $frontendRoot; try { npm.cmd ci } finally { Pop-Location } }
$mavenArgs = if ($Demo) { 'spring-boot:run -Dspring-boot.run.profiles=demo' } else { 'spring-boot:run' }
$backendProcess = Start-Process -FilePath 'mvn.cmd' -ArgumentList $mavenArgs -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru
Write-Host "Backend process: $($backendProcess.Id). Frontend: http://127.0.0.1:5173"
Push-Location $frontendRoot
try { npm.cmd run dev } finally { Pop-Location; Write-Host "Backend started as process $($backendProcess.Id); stop it when finished." }
