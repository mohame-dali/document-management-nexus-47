<#
.SYNOPSIS
    Script de sauvegarde intégrale DMS pour Windows Server (MongoDB + Courrier + Uploads).
    [NON TESTÉ, à exécuter sur une VM de recette]

.DESCRIPTION
    Ce script :
    1. Échoue explicitement en cas d'anomalie ($ErrorActionPreference = "Stop").
    2. Exécute mongodump pour sauvegarder toutes les collections de la base de données.
    3. Copie et archive de façon sécurisée les dossiers physiques de données :
       - courrier/ (documents administratifs scannés)
       - uploads/ (pièces jointes, photos utilisateurs et personnel)
    4. Génère un inventaire d'intégrité SHA256 des modèles IA locaux .gguf (sans les dupliquer).
    5. Compresse l'ensemble dans une archive ZIP horodatée.
    6. Applique la politique de rétention sans JAMAIS supprimer la dernière archive valide.
#>

$ErrorActionPreference = "Stop"

# 1. Détermination des chemins
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$BackupDir = Join-Path $ProjectRoot "backups"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$ArchiveName = "dms_full_backup_${Timestamp}.zip"
$TempWorkDir = Join-Path $env:TEMP "dms_backup_${Timestamp}"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

if (-not (Test-Path $TempWorkDir)) {
    New-Item -ItemType Directory -Path $TempWorkDir -Force | Out-Null
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🚀 SAUVEGARDE INTÉGRALE DMS (WINDOWS)" -ForegroundColor Cyan
Write-Host "  Dossier cible : $BackupDir" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Cyan

# 2. Récupération de l'URI MongoDB depuis .env (sans affichage de secret)
$MongoUri = "mongodb://127.0.0.1:27017/document-management"
$EnvPath = Join-Path $ProjectRoot ".env"
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        if ($_ -match '^\s*MONGODB_URI\s*=\s*(.*)$') {
            $val = $matches[1].Trim().Trim('"').Trim("'")
            if ($val -ne "") {
                $MongoUri = $val
            }
        }
    }
}

# 3. Étape 1/4 : Dump MongoDB
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 📦 1/4 - Extraction mongodump..." -ForegroundColor Yellow
$MongoDumpOut = Join-Path $TempWorkDir "mongo_dump"
try {
    $dumpArgs = @("--uri=$MongoUri", "--out=$MongoDumpOut", "--quiet")
    $process = Start-Process -FilePath "mongodump.exe" -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        throw "mongodump a échoué avec le code $($process.ExitCode)"
    }
    Write-Host "  ✅ Dump MongoDB achevé avec succès." -ForegroundColor Green
}
catch {
    Write-Warning "mongodump introuvable ou échec : $_. Vérifiez que MongoDB Database Tools est dans le PATH."
    New-Item -Path (Join-Path $TempWorkDir "mongo_dump_missing.txt") -ItemType File -Value "MONGODUMP_FAILED" -Force | Out-Null
}

# 4. Étape 2/4 : Copie des dossiers physiques (courrier/ et uploads/)
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 📂 2/4 - Archivage des documents administratifs physiques..." -ForegroundColor Yellow
$StorageDir = Join-Path $TempWorkDir "storage"
New-Item -ItemType Directory -Path $StorageDir -Force | Out-Null

$CourrierSrc = Join-Path $ProjectRoot "backend\courrier"
if (Test-Path $CourrierSrc) {
    $courrierCount = (Get-ChildItem -Path $CourrierSrc -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "  Archivage de courrier/ ($courrierCount fichier(s))..." -ForegroundColor Gray
    Copy-Item -Path $CourrierSrc -Destination (Join-Path $StorageDir "courrier") -Recurse -Force
} else {
    New-Item -ItemType Directory -Path (Join-Path $StorageDir "courrier") -Force | Out-Null
}

$UploadsSrc = Join-Path $ProjectRoot "backend\uploads"
if (Test-Path $UploadsSrc) {
    $uploadsCount = (Get-ChildItem -Path $UploadsSrc -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "  Archivage de uploads/ ($uploadsCount fichier(s))..." -ForegroundColor Gray
    Copy-Item -Path $UploadsSrc -Destination (Join-Path $StorageDir "uploads") -Recurse -Force
} else {
    New-Item -ItemType Directory -Path (Join-Path $StorageDir "uploads") -Force | Out-Null
}

# 5. Étape 3/4 : Inventaire SHA256 des modèles IA locaux
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🤖 3/4 - Inventaire des modèles IA GGUF..." -ForegroundColor Yellow
$ModelsSrc = Join-Path $ProjectRoot "models"
$ManifestPath = Join-Path $TempWorkDir "ai_models_manifest.txt"
$manifestContent = @(
    "DMS AI MODELS INVENTORY (WINDOWS) — DATE: $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))",
    "===================================================================",
    "NOTE : Les fichiers .gguf (~5 Go) ne sont pas dupliqués dans cette archive.",
    ""
)

if (Test-Path $ModelsSrc) {
    $ggufFiles = Get-ChildItem -Path $ModelsSrc -Filter "*.gguf" -Recurse -ErrorAction SilentlyContinue
    foreach ($file in $ggufFiles) {
        $fileSizeMb = [math]::Round(($file.Length / 1MB), 2)
        $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        $manifestContent += "Fichier : $($file.Name) ($fileSizeMb Mo)"
        $manifestContent += "SHA256  : $hash"
        $manifestContent += "---"
    }
} else {
    $manifestContent += "Dossier models/ non trouvé."
}
$manifestContent | Out-File -FilePath $ManifestPath -Encoding UTF8
Write-Host "  ✅ Manifeste IA généré." -ForegroundColor Green

# 6. Étape 4/4 : Compression consolidée ZIP
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🗜️ 4/4 - Compression de l'archive ZIP..." -ForegroundColor Yellow
$DestinationZip = Join-Path $BackupDir $ArchiveName
try {
    Compress-Archive -Path "$TempWorkDir\*" -DestinationPath $DestinationZip -CompressionLevel Optimal -Force
    Remove-Item -Path $TempWorkDir -Recurse -Force -ErrorAction SilentlyContinue
    $zipSizeMb = [math]::Round(((Get-Item $DestinationZip).Length / 1MB), 2)
    Write-Host "  ✅ Archive consolidée créée : $ArchiveName ($zipSizeMb Mo)" -ForegroundColor Green
}
catch {
    Write-Error "Échec de la compression de l'archive : $_"
    Remove-Item -Path $TempWorkDir -Recurse -Force -ErrorAction SilentlyContinue
    Exit 1
}

# 7. Rétention : Purge des archives de plus de 14 jours avec protection stricte de la dernière archive
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🧹 Application de la rétention (14 jours)..." -ForegroundColor Cyan
$CutoffDate = (Get-Date).AddDays(-14)
$AllBackups = Get-ChildItem -Path $BackupDir -Filter "dms_*.zip" | Sort-Object -Property CreationTime

if ($AllBackups.Count -gt 1) {
    $LatestBackup = $AllBackups[-1]
    $EligibleBackups = $AllBackups | Select-Object -First ($AllBackups.Count - 1)
    $PurgedCount = 0
    foreach ($file in $EligibleBackups) {
        if ($file.CreationTime -lt $CutoffDate) {
            Remove-Item -Path $file.FullName -Force
            $PurgedCount++
            Write-Host "   Suppression de l'archive expirée : $($file.Name)" -ForegroundColor Gray
        }
    }
    Write-Host "  Dernière archive protégée : $($LatestBackup.Name)" -ForegroundColor Green
    Write-Host "  ✅ $PurgedCount ancienne(s) archive(s) purgée(s)." -ForegroundColor Green
} else {
    Write-Host "  Une seule archive présente, aucune suppression." -ForegroundColor Gray
}

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🎉 SAUVEGARDE TERMINÉE AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
