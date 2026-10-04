param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$taskProject = Split-Path -Parent $PSScriptRoot
$taskRunner = Join-Path $taskProject 'runner'
$taskCompose = Join-Path $taskRunner 'compose.yml'
$taskConfig = Join-Path $taskProject 'backend\config\codelab.properties'
$taskDocker = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
if (-not $taskDocker) {
  foreach ($taskCandidate in @("$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe", 'C:\Program Files\Docker\Docker\resources\bin\docker.exe')) {
    if (Test-Path -LiteralPath $taskCandidate) { $taskDocker=$taskCandidate; break }
  }
}
if (-not $taskDocker) { throw 'Install and open Docker Desktop first. See docs/CODELAB-LOCAL.md.' }
# A terminal opened before Docker was installed may have an old PATH. Docker
# invokes its credential helper by name, so locating docker.exe alone is not enough.
$taskDockerBin = Split-Path -Parent $taskDocker
if (($env:PATH -split ';') -notcontains $taskDockerBin) { $env:PATH = "$taskDockerBin;$env:PATH" }
function Invoke-RunnerDocker {
  param([string[]]$Arguments)
  & $taskDocker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Docker command failed (exit $LASTEXITCODE). Open Docker Desktop and check its status." }
}
$taskEnvironment = Join-Path $taskRunner '.env'
if ($Stop) {
  Invoke-RunnerDocker -Arguments @('compose','-f',$taskCompose,'stop')
  Write-Host 'Local runner stopped. Installed languages and saved submissions are kept.'
  exit 0
}
$taskEngine = & $taskDocker info --format '{{.OSType}} {{.CgroupVersion}}'
if ($LASTEXITCODE -ne 0 -or $taskEngine.Trim() -ne 'linux 2') { throw 'Start Docker Desktop using the WSL 2 Linux engine with cgroup v2, then run this script again.' }

# Pin the pulled official image to its digest. Subsequent starts keep that exact image.
if (-not (Test-Path -LiteralPath $taskEnvironment)) {
  Invoke-RunnerDocker -Arguments @('pull','ghcr.io/engineer-man/piston:latest')
  $taskDigest = & $taskDocker image inspect 'ghcr.io/engineer-man/piston:latest' --format '{{index .RepoDigests 0}}'
  if ($LASTEXITCODE -ne 0 -or $taskDigest -notmatch '^ghcr.io/engineer-man/piston@sha256:[a-f0-9]{64}$') { throw 'Could not pin the official runner image.' }
  [IO.File]::WriteAllText($taskEnvironment,"PISTON_IMAGE=$taskDigest`n")
}
Invoke-RunnerDocker -Arguments @('compose','--env-file',$taskEnvironment,'-f',$taskCompose,'up','-d')
$taskUrl='http://127.0.0.1:2000/api/v2'
$taskReady=$false
for ($taskAttempt=0; $taskAttempt -lt 30; $taskAttempt++) {
  try { $null=Invoke-RestMethod -Uri "$taskUrl/runtimes" -TimeoutSec 3; $taskReady=$true; break } catch { Start-Sleep -Seconds 2 }
}
if (-not $taskReady) { throw 'Local sandbox did not start. Check Docker Desktop; no backend configuration was changed.' }

$taskInstalled=Invoke-RestMethod -Uri "$taskUrl/runtimes" -TimeoutSec 10
$taskRequired=@{ java='java'; cpp='gcc'; python='python' }
foreach($taskLanguage in @('java','cpp','python')) {
  if (-not ($taskInstalled | Where-Object {$_.language -eq $taskLanguage -or $_.aliases -contains $taskLanguage})) {
    Write-Host "Installing local $taskLanguage runtime..."
    $taskBody=@{language=$taskRequired[$taskLanguage];version='*'} | ConvertTo-Json
    $null=Invoke-RestMethod -Method Post -Uri "$taskUrl/packages" -ContentType 'application/json' -Body $taskBody -TimeoutSec 900
  }
}
$taskInstalled=Invoke-RestMethod -Uri "$taskUrl/runtimes" -TimeoutSec 10
$taskVersions=@{}
foreach($taskLanguage in @('java','cpp','python')) {
  $taskRuntime=$taskInstalled | Where-Object {$_.language -eq $taskLanguage -or $_.aliases -contains $taskLanguage} | Sort-Object {[version]$_.version} -Descending | Select-Object -First 1
  if (-not $taskRuntime -or $taskRuntime.version -notmatch '^\d+\.\d+\.\d+$') { throw "Missing $taskLanguage runtime" }
  $taskVersions[$taskLanguage]=$taskRuntime.version
}

# Real smoke checks must pass before enabling the backend. No expected answer is sent to the sandbox.
$taskSources=@{
  python=@{name='main.py';content="import sys`nvalues=list(map(int,sys.stdin.read().split()))`nprint(sum(values[1:]))`n"}
  cpp=@{name='main.cpp';content='#include <iostream>
int main(){int count;std::cin>>count;long long total=0,value;while(count--){std::cin>>value;total+=value;}std::cout<<total;}' }
  java=@{name='Main.java';content='import java.util.*;
public class Main { public static void main(String[] args){Scanner input=new Scanner(System.in);int count=input.nextInt();long total=0;while(count-->0)total+=input.nextLong();System.out.println(total);} }'}
}
foreach($taskLanguage in @('python','cpp','java')) {
  Write-Host "Checking $taskLanguage execution..."
  # Java compiles source during the run stage; include its bounded compiler startup.
  $taskRunTimeout=if($taskLanguage -eq 'java'){15000}else{5000}
  $taskRunCpuTime=if($taskLanguage -eq 'java'){10000}else{3000}
  $taskBody=@{language=$taskLanguage;version=$taskVersions[$taskLanguage];files=@($taskSources[$taskLanguage]);stdin="4`n1 2 -3 7`n";compile_timeout=10000;run_timeout=$taskRunTimeout;compile_cpu_time=10000;run_cpu_time=$taskRunCpuTime;compile_memory_limit=536870912;run_memory_limit=268435456} | ConvertTo-Json -Depth 6
  $taskResult=Invoke-RestMethod -Method Post -Uri "$taskUrl/execute" -ContentType 'application/json' -Body $taskBody -TimeoutSec 40
  if (-not $taskResult.run -or $taskResult.run.code -ne 0 -or $taskResult.run.stdout.Trim() -ne '7') { throw "$taskLanguage sandbox check failed. Backend is not enabled. Inspect the local runner logs." }
}

if (Test-Path -LiteralPath $taskConfig) {
  $taskBackup=Join-Path $taskProject '.local-backups\codelab-runner'
  $null=New-Item -ItemType Directory -Path $taskBackup -Force
  Copy-Item -LiteralPath $taskConfig -Destination (Join-Path $taskBackup ('codelab-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.properties'))
}
$taskLines=@('# Local CodeLab runner. Generated after real Java/C++/Python checks.','app.codelab.provider=piston','app.codelab.runner-url=http://127.0.0.1:2000',"app.codelab.java-version=$($taskVersions.java)","app.codelab.cpp-version=$($taskVersions.cpp)","app.codelab.python-version=$($taskVersions.python)")
[IO.File]::WriteAllLines($taskConfig,$taskLines)
Write-Host 'Local Java, C++ and Python checks passed. Restart the SkillNex backend once, then refresh CodeLab.'
Write-Host 'Keep Docker Desktop running while you practice. No runner API key is required.'
