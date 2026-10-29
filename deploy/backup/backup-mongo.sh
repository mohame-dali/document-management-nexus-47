#!/usr/bin/env bash
# ==============================================================================
# deploy/backup/backup-mongo.sh
# Script de sauvegarde automatisée MongoDB pour Linux (Ubuntu / Debian)
# Effectue un dump, compresse en .tar.gz et purge les archives > 30 jours.
# ==============================================================================

set -euo pipefail

# 1. Détermination des répertoires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
ARCHIVE_NAME="dms_backup_${TIMESTAMP}.tar.gz"
TEMP_DUMP_DIR="/tmp/dms_dump_${TIMESTAMP}"

# 2. Chargement de l'URI MongoDB depuis .env si présent
MONGODB_URI="mongodb://127.0.0.1:27017/dms_db"
if [ -f "${PROJECT_ROOT}/.env" ]; then
    ENV_URI=$(grep -E '^MONGODB_URI=' "${PROJECT_ROOT}/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
    if [ -n "${ENV_URI}" ]; then
        MONGODB_URI="${ENV_URI}"
    fi
fi

mkdir -p "${BACKUP_DIR}"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🚀 Démarrage de la sauvegarde MongoDB..."
echo "  URI : ${MONGODB_URI}"
echo "  Dossier cible : ${BACKUP_DIR}"

# 3. Exécution de mongodump
mkdir -p "${TEMP_DUMP_DIR}"
if mongodump --uri="${MONGODB_URI}" --out="${TEMP_DUMP_DIR}" --quiet; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ mongodump terminé."
else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ Échec de mongodump !" >&2
    rm -rf "${TEMP_DUMP_DIR}"
    exit 1
fi

# 4. Compression de l'archive tar.gz
tar -czf "${BACKUP_DIR}/${ARCHIVE_NAME}" -C "${TEMP_DUMP_DIR}" .
rm -rf "${TEMP_DUMP_DIR}"

ARCHIVE_SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_NAME}" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📦 Archive créée avec succès : ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"

# 5. Rétention : Purge des sauvegardes datant de plus de 30 jours
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🧹 Nettoyage des sauvegardes de plus de 30 jours..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -type f -name "dms_backup_*.tar.gz" -mtime +30 -exec rm -f {} \; -print | wc -l)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ ${DELETED_COUNT} ancienne(s) archive(s) supprimée(s)."
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 Sauvegarde terminée avec succès."
