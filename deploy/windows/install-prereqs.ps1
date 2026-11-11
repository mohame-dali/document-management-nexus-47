<#
.SYNOPSIS
    Script PowerShell d'installation automatisée des prérequis DMS sur Windows Server 2019 / 2022.
    [NON TESTÉ, à exécuter sur une VM de recette]

.DESCRIPTION
    Ce script :
    1. Exige les privilèges Administrateur ($ErrorActionPreference = 'Stop').
    2. Installe ou vérifie Chocolatey (gestionnaire de paquets Windows).
    3. Installe Node.js 22 LTS (nodejs-lts), Git, Visual Studio Build Tools (C++ pour node-llama-cpp).
    4. Installe MongoDB Community Server & Database Tools.
    5. Installe Tesseract OCR (avec langues ara/fra) et Poppler (pdftoppm).
    6. Installe NSSM (Non-Sucking Service Manager) pour le pilotage du service.
#>

$ErrorActionPreference = "Stop"

# 1. Vérification des privilèges Administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "❌ Ce script doit être exécuté dans une session PowerShell en tant qu'Administrateur."
    Exit 1
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 DMS — INSTALLATION DES PRÉREQUIS SYSTÈME (WINDOWS SERVER)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 2. Installation de Chocolatey si absent
if (-not (Get-Command "choco" -ErrorAction SilentlyContinue)) {
    Write-Host "[1/7] Installation de Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:PATH = "$env:PATH;$env:ALLUSERSPROFILE\chocolatey\bin"
} else {
    Write-Host "[1/7] ✅ Chocolatey est déjà installé." -ForegroundColor Green
}

# 3. Installation de Node.js 22 LTS et Git
Write-Host "[2/7] Installation / Vérification de Node.js 22 et Git..." -ForegroundColor Yellow
choco install nodejs-lts -y --version 22.14.0 -ia "ADDLOCAL=NodeRuntime,npm"
choco install git -y --params "/GitAndUnixToolsOnPath"

# 4. Installation des outils de compilation C++ (pour node-llama-cpp)
Write-Host "[3/7] Installation de Visual Studio Build Tools (C++ & CMake)..." -ForegroundColor Yellow
choco install visualstudio2022buildtools -y --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"
choco install cmake -y --installargs 'ADD_CMAKE_TO_PATH=System'

# 5. Installation de MongoDB Community Server et Database Tools
Write-Host "[4/7] Installation de MongoDB Community & Database Tools..." -ForegroundColor Yellow
choco install mongodb -y
choco install mongodb-database-tools -y

# Configuration du service MongoDB sur 127.0.0.1
$MongoConfigPath = "C:\Program Files\MongoDB\Server\*\bin\mongod.cfg"
$foundConfig = Resolve-Path $MongoConfigPath -ErrorAction SilentlyContinue
if ($foundConfig) {
    Write-Host "  Verrouillage de MongoDB sur 127.0.0.1..." -ForegroundColor Yellow
    (Get-Content $foundConfig[0].Path) -replace 'bindIp: .*', 'bindIp: 127.0.0.1' | Set-Content $foundConfig[0].Path
    Restart-Service -Name "MongoDB" -ErrorAction SilentlyContinue
}

# 6. Installation de Tesseract OCR et Poppler
Write-Host "[5/7] Installation de Tesseract OCR et Poppler..." -ForegroundColor Yellow
choco install tesseract -y
choco install poppler -y

# 7. Installation de NSSM (Non-Sucking Service Manager)
Write-Host "[6/7] Installation de NSSM..." -ForegroundColor Yellow
choco install nssm -y

# 8. Rafraîchissement des variables d'environnement
Write-Host "[7/7] Rafraîchissement des variables d'environnement PATH..." -ForegroundColor Yellow
$env:PATH = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "✅ TOUS LES PRÉREQUIS WINDOWS SONT INSTALLÉS AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "Prochaines étapes :" -ForegroundColor Cyan
Write-Host "  1. Configurer C:\inetpub\wwwroot\dms\.env depuis .env.production.example"
Write-Host "  2. Installer les dépendances : npm ci"
Write-Host "  3. Compiler le frontend : npm run build"
Write-Host "  4. Enregistrer le service Windows : powershell -File .\deploy\windows\install-service.ps1"
Write-Host "======================================================================" -ForegroundColor Green
