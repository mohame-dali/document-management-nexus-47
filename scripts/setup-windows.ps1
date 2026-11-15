<#
.SYNOPSIS
  scripts/setup-windows.ps1
  Script d'installation des dépendances système Windows (Tesseract, CMake) & modèles IA GGUF
  À exécuter dans PowerShell en mode Administrateur
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        INSTALLATION SYSTÈME & MOTEUR IA DMS (WINDOWS)              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérification des privilèges Administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Attention : Ce script n'est pas exécuté en mode Administrateur."
    Write-Warning "Certaines installations de paquets système (winget/choco) peuvent nécessiter une élévation de privilèges."
}

# 1. Vérification / Installation de CMake
Write-Host "`n1. Vérification de CMake..." -ForegroundColor Yellow
if (Get-Command cmake -ErrorAction SilentlyContinue) {
    $cmakeVersion = (cmake --version | Select-Object -First 1)
    Write-Host "[OK] CMake déjà installé : $cmakeVersion" -ForegroundColor Green
} else {
    Write-Host "[INFO] Installation de CMake via winget..." -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Kitware.CMake -e --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install cmake --installargs 'ADD_CMAKE_TO_PATH=System' -y
    } else {
        Write-Warning "Ni 'winget' ni 'choco' n'ont été trouvés. Veuillez installer CMake manuellement depuis https://cmake.org/download/"
    }
}

# 2. Vérification / Installation de Tesseract OCR
Write-Host "`n2. Vérification de Tesseract OCR..." -ForegroundColor Yellow
if (Get-Command tesseract -ErrorAction SilentlyContinue) {
    $tessVersion = (tesseract --version | Select-Object -First 1)
    Write-Host "[OK] Tesseract déjà installé : $tessVersion" -ForegroundColor Green
} else {
    Write-Host "[INFO] Installation de Tesseract OCR via winget..." -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id UB-Mannheim.TesseractOCR -e --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install tesseract -y
    } else {
        Write-Warning "Ni 'winget' ni 'choco' n'ont été trouvés. Veuillez installer Tesseract depuis https://github.com/UB-Mannheim/tesseract/wiki"
    }
}

# 3. Préparation du répertoire models
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$modelsDir = Join-Path $projectRoot "models"

Write-Host "`n3. Préparation du répertoire des modèles : $modelsDir" -ForegroundColor Yellow
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

# 4. Vérification de node-llama-cpp
Write-Host "`n4. Vérification du moteur d'inférence node-llama-cpp..." -ForegroundColor Yellow
Set-Location -Path $projectRoot

if (Test-Path "node_modules/node-llama-cpp") {
    Write-Host "[OK] node-llama-cpp est installé." -ForegroundColor Green
} else {
    Write-Host "[INFO] Installation des dépendances npm..." -ForegroundColor Cyan
    npm install
}

# 5. Téléchargement des modèles IA GGUF (ALLaM 7B & BGE-M3)
Write-Host "`n5. Lancement du téléchargement des modèles IA GGUF..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    node scripts/download-models.js
} else {
    Write-Error "Node.js n'a pas été détecté dans le PATH. Veuillez installer Node.js v18+."
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ INSTALLATION SYSTÈME ET MODÈLES IA TERMINÉE AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "`nPour démarrer le serveur : npm run dev ou npm start`n"
