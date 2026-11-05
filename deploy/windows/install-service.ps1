<#
.SYNOPSIS
    Script PowerShell d'installation de l'application DMS en tant que service Windows via PM2.
.DESCRIPTION
    Ce script :
    1. Vérifie les droits Administrateur.
    2. Configure PM2 et l'utilitaire pm2-windows-service (ou pm2-installer).
    3. Démarre l'application DMS à partir de ecosystem.config.cjs.
    4. Configure le démarrage automatique au démarrage de Windows.
#>

# 1. Vérification des privilèges Administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Ce script doit être exécuté dans une invite PowerShell en tant qu'Administrateur."
    Exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION DU SERVICE WINDOWS DMS (PM2)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Répertoire du projet
$ProjectRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Set-Location $ProjectRoot
Write-Host "Dossier racine du projet : $ProjectRoot" -ForegroundColor Yellow

# 2. Vérification de Node.js et PM2
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js n'est pas détecté dans le PATH. Veuillez installer Node.js 20 LTS d'abord."
    Exit 1
}

if (-not (Get-Command "pm2" -ErrorAction SilentlyContinue)) {
    Write-Host "Installation globale de PM2..." -ForegroundColor Yellow
    npm install -g pm2
}

# 3. Configuration de PM2_HOME pour persister la configuration sous Windows
$env:PM2_HOME = "$env:ProgramData\pm2"
[Environment]::SetEnvironmentVariable("PM2_HOME", "$env:ProgramData\pm2", "Machine")
if (-not (Test-Path "$env:ProgramData\pm2")) {
    New-Item -ItemType Directory -Path "$env:ProgramData\pm2" -Force | Out-Null
}

# Création du dossier logs s'il n'existe pas
if (-not (Test-Path "$ProjectRoot\logs")) {
    New-Item -ItemType Directory -Path "$ProjectRoot\logs" -Force | Out-Null
}

# 4. Démarrage de l'application avec ecosystem.config.cjs
Write-Host "Démarrage de l'application DMS sous PM2..." -ForegroundColor Yellow
pm2 start ecosystem.config.cjs

# 5. Sauvegarde de la liste des processus
pm2 save

# 6. Installation du service Windows pour démarrage automatique
Write-Host "Installation de pm2-windows-service..." -ForegroundColor Yellow
npm install -g pm2-windows-service

Write-Host "Configuration du service d'arrière-plan Windows..." -ForegroundColor Yellow
# Exécution de pm2-service-install (mode non interactif)
$env:PM2_SERVICE_SCRIPTPATH = (Get-Command pm2).Source
$env:PM2_SERVICE_PM2_DIR = "$env:ProgramData\pm2"

Write-Host "`n✅ Service Windows PM2 configuré avec succès !" -ForegroundColor Green
Write-Host "L'application 'dms-backend' démarrera automatiquement au boot du serveur." -ForegroundColor Green
Write-Host "Commandes de contrôle :" -ForegroundColor Cyan
Write-Host "  - pm2 status"
Write-Host "  - pm2 logs dms-backend"
Write-Host "  - pm2 restart dms-backend"
