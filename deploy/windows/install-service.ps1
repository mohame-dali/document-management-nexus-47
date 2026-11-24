<#
.SYNOPSIS
    Script PowerShell d'installation de l'application DMS en tant que service Windows via NSSM.
    [NON TESTÉ, à exécuter sur une VM de recette]

.DESCRIPTION
    Ce script :
    1. Vérifie les droits Administrateur ($ErrorActionPreference = 'Stop').
    2. Localise l'exécutable NSSM (Non-Sucking Service Manager).
    3. Configure le service Windows 'DMSBackend' pour exécuter 'node_modules\.bin\tsx.cmd server.ts'.
    4. Définit l'environnement d'exécution (NODE_ENV=production, PORT=5000).
    5. Configure le redémarrage automatique en cas de crash et la journalisation des sorties.
    6. Démarre le service Windows.
#>

$ErrorActionPreference = "Stop"

# 1. Vérification des privilèges Administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "❌ Ce script doit être exécuté dans une session PowerShell en tant qu'Administrateur."
    Exit 1
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "⚙️ DMS — INSTALLATION DU SERVICE WINDOWS VIA NSSM (PORT 5000)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 2. Localisation de NSSM
$NssmPath = (Get-Command "nssm" -ErrorAction SilentlyContinue).Source
if (-not $NssmPath) {
    $fallbackNssm = "C:\ProgramData\chocolatey\bin\nssm.exe"
    if (Test-Path $fallbackNssm) {
        $NssmPath = $fallbackNssm
    } else {
        Write-Error "❌ NSSM est introuvable. Veuillez exécuter 'choco install nssm -y' ou lancer install-prereqs.ps1."
        Exit 1
    }
}
Write-Host "Utilisation de NSSM : $NssmPath" -ForegroundColor Gray

# 3. Répertoire racine du projet
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
Set-Location $ProjectRoot
Write-Host "Répertoire du projet : $ProjectRoot" -ForegroundColor Gray

# Création du dossier logs s'il n'existe pas
$LogsDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
}

# 4. Localisation de tsx.cmd
$TsxCmd = Join-Path $ProjectRoot "node_modules\.bin\tsx.cmd"
if (-not (Test-Path $TsxCmd)) {
    Write-Host "⚠️ tsx local non trouvé dans node_modules. Utilisation de tsx global ou npx..." -ForegroundColor Yellow
    $TsxCmd = (Get-Command "npx.cmd" -ErrorAction SilentlyContinue).Source
    $ServiceArgs = "tsx server.ts"
} else {
    $ServiceArgs = "server.ts"
}

$ServiceName = "DMSBackend"

# 5. Arrêt et suppression de l'ancien service s'il existe déjà (idempotence)
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Arrêt de l'ancien service $ServiceName..." -ForegroundColor Yellow
    & $NssmPath stop $ServiceName 2>$null
    & $NssmPath remove $ServiceName confirm 2>$null
    Start-Sleep -Seconds 2
}

# 6. Installation et paramétrage du service via NSSM
Write-Host "Installation du service $ServiceName..." -ForegroundColor Yellow
& $NssmPath install $ServiceName $TsxCmd $ServiceArgs
& $NssmPath set $ServiceName AppDirectory $ProjectRoot
& $NssmPath set $ServiceName Description "DMS - Courrier Hybride, Ressources Humaines et IA Souveraine"
& $NssmPath set $ServiceName Start SERVICE_AUTO_START

# Configuration des variables d'environnement du service
& $NssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production`r`nPORT=5000"

# Configuration des flux de journaux (logs)
$OutLog = Join-Path $LogsDir "service-out.log"
$ErrLog = Join-Path $LogsDir "service-err.log"
& $NssmPath set $ServiceName AppStdout $OutLog
& $NssmPath set $ServiceName AppStderr $ErrLog
& $NssmPath set $ServiceName AppRotateFiles 1
& $NssmPath set $ServiceName AppRotateOnline 1
& $NssmPath set $ServiceName AppRotateSeconds 86400
& $NssmPath set $ServiceName AppRotateBytes 10485760

# Configuration de la politique de redémarrage (restart delay de 4 secondes)
& $NssmPath set $ServiceName AppRestartDelay 4000

# 7. Démarrage du service
Write-Host "Démarrage du service $ServiceName..." -ForegroundColor Yellow
& $NssmPath start $ServiceName
Start-Sleep -Seconds 3

# 8. Contrôle du statut
$serviceStatus = Get-Service -Name $ServiceName
if ($serviceStatus.Status -eq "Running") {
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "✅ SERVICE WINDOWS '$ServiceName' DÉMARRÉ AVEC SUCCÈS !" -ForegroundColor Green
    Write-Host "  Statut : $($serviceStatus.Status)"
    Write-Host "  URL locale : http://localhost:5000"
    Write-Host "  Logs : $LogsDir"
    Write-Host "======================================================================" -ForegroundColor Green
} else {
    Write-Error "❌ Le service n'a pas pu démarrer. Consultez $ErrLog pour identifier la cause."
    Exit 1
}
