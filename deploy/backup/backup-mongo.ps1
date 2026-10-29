<#
.SYNOPSIS
    Script de sauvegarde automatisée MongoDB pour Windows Server.
.DESCRIPTION
    Exécute mongodump, compresse le résultat en archive ZIP et supprime les sauvegardes de plus de 30 jours.
#>

$ErrorActionPreference = "Stop"

# 1. Détermination des chemins
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Get-Item $ScriptDir).Parent.Parent.FullName
$BackupDir = Join-Path $ProjectRoot "backups"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$ArchiveName = "dms_backup_${Timestamp}.zip"
$TempDumpDir = Join-Path $env:TEMP "dms_dump_${Timestamp}"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# 2. Récupération de l'URI MongoDB depuis .env si présent
$MongoUri = "mongodb://127.0.0.1:27017/dms_db"
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

Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🚀 Démarrage de la sauvegarde MongoDB..." -ForegroundColor Cyan
Write-Host "  URI MongoDB : $MongoUri" -ForegroundColor Gray
Write-Host "  Répertoire de sauvegarde : $BackupDir" -ForegroundColor Gray

# 3. Exécution de mongodump
try {
    if (-not (Test-Path $TempDumpDir)) {
        New-Item -ItemType Directory -Path $TempDumpDir -Force | Out-Null
    }
    
    $dumpArgs = @("--uri=$MongoUri", "--out=$TempDumpDir", "--quiet")
    $process = Start-Process -FilePath "mongodump.exe" -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        throw "mongodump a retourné le code d'erreur $($process.ExitCode)"
    }
    Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] ✅ Extraction mongodump terminée." -ForegroundColor Green
}
catch {
    Write-Error "Échec de mongodump : $_"
    if (Test-Path $TempDumpDir) {
        Remove-Item -Path $TempDumpDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Exit 1
}

# 4. Compression ZIP de l'archive
$DestinationZip = Join-Path $BackupDir $ArchiveName
try {
    Compress-Archive -Path "$TempDumpDir\*" -DestinationPath $DestinationZip -CompressionLevel Optimal -Force
    Remove-Item -Path $TempDumpDir -Recurse -Force -ErrorAction SilentlyContinue
    
    $zipSizeMb = [math]::Round(((Get-Item $DestinationZip).Length / 1MB), 2)
    Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 📦 Archive créée : $ArchiveName ($zipSizeMb Mo)" -ForegroundColor Green
}
catch {
    Write-Error "Échec de la compression de l'archive : $_"
    Exit 1
}

# 5. Rétention : Purge des archives datant de plus de 30 jours
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🧹 Vérification des sauvegardes de plus de 30 jours..." -ForegroundColor Cyan
$CutoffDate = (Get-Date).AddDays(-30)
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "dms_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate }

$PurgedCount = 0
foreach ($file in $OldBackups) {
    Remove-Item -Path $file.FullName -Force
    $PurgedCount++
}

Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] ✅ $PurgedCount ancienne(s) sauvegarde(s) supprimée(s)." -ForegroundColor Green
Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] 🎉 Sauvegarde terminée avec succès." -ForegroundColor Green
