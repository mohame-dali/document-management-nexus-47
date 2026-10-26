#!/usr/bin/env bash
# ==============================================================================
# scripts/backup-mongo.sh — Sauvegarde quotidienne et rotation MongoDB
# DMS (Gestion Électronique des Courriers & RH)
#
# Utilisation recommandée dans crontab (ex: tous les jours à 03:00) :
#   0 3 * * * /var/www/dms/scripts/backup-mongo.sh >> /var/log/dms/backup.log 2>&1
# ==============================================================================

set -euo pipefail

# Configuration des chemins
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/dms}"
TIMESTAMP="$(date +'%Y-%m-%d_%H-%M-%S')"
DUMP_DIR="${BACKUP_ROOT}/dump_${TIMESTAMP}"
ARCHIVE_NAME="${BACKUP_ROOT}/dms_mongo_${TIMESTAMP}.tar.gz"
RETENTION_DAYS=30

echo "----------------------------------------------------------------------"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🚀 Démarrage de la sauvegarde MongoDB DMS"
echo "----------------------------------------------------------------------"

# 1. Vérification des outils nécessaires
if ! command -v mongodump >/dev/null 2>&1; then
  echo "❌ ERREUR: 'mongodump' est introuvable."
  echo "   Installez les outils MongoDB via : sudo apt-get install -y mongodb-database-tools"
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "❌ ERREUR: 'tar' est introuvable."
  exit 1
fi

# 2. Création du répertoire de sauvegarde
mkdir -p "${BACKUP_ROOT}"

# 3. Détection de l'URI MongoDB (depuis variable d'environnement ou fichier .env)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(dirname "${SCRIPT_DIR}")"

if [ -z "${MONGODB_URI:-}" ] && [ -f "${APP_ROOT}/.env" ]; then
  # Extraction de MONGODB_URI du fichier .env
  EXTRACTED_URI=$(grep -E '^MONGODB_URI=' "${APP_ROOT}/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  if [ -n "${EXTRACTED_URI}" ]; then
    MONGODB_URI="${EXTRACTED_URI}"
  fi
fi

# Fallback URI standard
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/document-management}"

echo "📦 Répertoire de destination : ${BACKUP_ROOT}"
echo "🔗 Connexion base de données : ${MONGODB_URI%%\?*}"

# 4. Exécution du dump MongoDB
echo "⏳ Export des collections MongoDB..."
mongodump --uri="${MONGODB_URI}" --out="${DUMP_DIR}" --quiet

# 5. Compression de l'archive
echo "🗜️  Compression de l'archive tar.gz..."
tar -czf "${ARCHIVE_NAME}" -C "${BACKUP_ROOT}" "dump_${TIMESTAMP}"

# 6. Suppression du dossier temporaire non compressé
rm -rf "${DUMP_DIR}"

ARCHIVE_SIZE=$(du -h "${ARCHIVE_NAME}" | cut -f1)
echo "✅ Sauvegarde créée avec succès : ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"

# 7. Rotation des anciennes sauvegardes (> 30 jours)
echo "🧹 Nettoyage des sauvegardes datant de plus de ${RETENTION_DAYS} jours..."
DELETED_COUNT=$(find "${BACKUP_ROOT}" -name "dms_mongo_*.tar.gz" -type f -mtime +"${RETENTION_DAYS}" -print -delete | wc -l)
echo "ℹ️  ${DELETED_COUNT} ancienne(s) sauvegarde(s) supprimée(s)."

echo "----------------------------------------------------------------------"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✨ Sauvegarde terminée avec succès."
echo "----------------------------------------------------------------------"
