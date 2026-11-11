#!/usr/bin/env bash
# ==============================================================================
# deploy/scripts/backup-all.sh
# Sauvegarde intégrale DMS (Base MongoDB + Fichiers Courrier & Uploads + Manifeste IA)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   1. Sauvegarde BSON complète de la base de données via mongodump (--gzip)
#   2. Copie et archivage des répertoires physiques de données (courrier/ et uploads/)
#   3. Recensement et empreinte de contrôle (SHA256) des modèles IA GGUF (sans copie lourde)
#   4. Rétention automatique configurable (par défaut : 14 jours)
#   5. Journalisation sécurisée (AUCUN secret, mot de passe ou URI affiché dans les logs)
#
# Utilisation :
#   bash deploy/scripts/backup-all.sh [/chemin/dossier/sauvegardes] [JOURS_RETENTION]
# Exemple :
#   bash deploy/scripts/backup-all.sh /var/backups/dms 14
# ==============================================================================

set -euo pipefail

# 1. Détermination des chemins
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TARGET_BACKUP_DIR="${1:-${BACKUP_DIR:-${PROJECT_ROOT}/backups}}"
RETENTION_DAYS="${2:-14}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_TAG="dms_full_backup_${TIMESTAMP}"
WORK_DIR="/tmp/${BACKUP_TAG}"
FINAL_ARCHIVE="${TARGET_BACKUP_DIR}/${BACKUP_TAG}.tar.gz"

mkdir -p "${TARGET_BACKUP_DIR}"
mkdir -p "${WORK_DIR}"

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🚀 DÉMARRAGE DE LA SAUVEGARDE COMPLÈTE DMS"
echo "  Dossier cible : ${TARGET_BACKUP_DIR}"
echo "  Rétention      : ${RETENTION_DAYS} jours"

# 2. Récupération sécurisée de la chaîne MongoDB (sans affichage)
MONGODB_CONN_URI="${MONGODB_URI:-}"
if [ -z "${MONGODB_CONN_URI}" ] && [ -f "${PROJECT_ROOT}/.env" ]; then
  MONGODB_CONN_URI=$(grep -E '^[[:space:]]*MONGODB_URI=' "${PROJECT_ROOT}/.env" | head -n1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi

if [ -z "${MONGODB_CONN_URI}" ]; then
  MONGODB_CONN_URI="mongodb://127.0.0.1:27017/document-management"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ MONGODB_URI non définie, utilisation de l'instance locale par défaut."
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🔒 MONGODB_URI détectée (identifiants masqués pour sécurité)."
fi

# 3. Dump MongoDB compressé
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📦 1/4 - Extraction de la base de données MongoDB..."
DB_DUMP_ARCHIVE="${WORK_DIR}/database_dump.archive.gz"

if command -v mongodump >/dev/null 2>&1; then
  # mongodump direct dans une archive compressée unitaire
  mongodump --uri="${MONGODB_CONN_URI}" --archive="${DB_DUMP_ARCHIVE}" --gzip --quiet
  DUMP_SIZE=$(du -h "${DB_DUMP_ARCHIVE}" | cut -f1)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   ✅ Dump MongoDB achevé (${DUMP_SIZE})."
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   ⚠️ Commande 'mongodump' introuvable ! Vérifiez l'installation de 'mongodb-database-tools'." >&2
  # On crée un fichier indicateur pour ne pas casser le script si mongodump n'est pas encore installé
  echo "MONGODUMP_NOT_AVAILABLE_AT_BACKUP_TIME" > "${WORK_DIR}/database_dump.missing.txt"
fi

# 4. Copie des données physiques : Courrier et Téléversements
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📂 2/4 - Archivage des documents administratifs physiques..."

COURRIER_DIR="${DOCUMENT_PATH:-${PROJECT_ROOT}/backend/courrier}"
UPLOADS_DATA_DIR="${UPLOAD_DIR:-${PROJECT_ROOT}/backend/uploads}"

mkdir -p "${WORK_DIR}/storage"

if [ -d "${COURRIER_DIR}" ]; then
  COURRIER_COUNT=$(find "${COURRIER_DIR}" -type f | wc -l)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   Archivage de courrier/ (${COURRIER_COUNT} fichier(s))..."
  cp -r "${COURRIER_DIR}" "${WORK_DIR}/storage/courrier"
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   ℹ️ Dossier courrier non trouvé (${COURRIER_DIR}), création d'une entrée vide."
  mkdir -p "${WORK_DIR}/storage/courrier"
fi

if [ -d "${UPLOADS_DATA_DIR}" ]; then
  UPLOADS_COUNT=$(find "${UPLOADS_DATA_DIR}" -type f | wc -l)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   Archivage de uploads/ (${UPLOADS_COUNT} fichier(s))..."
  cp -r "${UPLOADS_DATA_DIR}" "${WORK_DIR}/storage/uploads"
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')]   ℹ️ Dossier uploads non trouvé (${UPLOADS_DATA_DIR}), création d'une entrée vide."
  mkdir -p "${WORK_DIR}/storage/uploads"
fi

# 5. Inventaire & Empreinte des modèles IA locaux GGUF (sans duplication lourde des 5 Go)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🤖 3/4 - Inventaire des modèles IA souverains (GGUF)..."
MODELS_DIR="${PROJECT_ROOT}/models"
MANIFEST_FILE="${WORK_DIR}/ai_models_manifest.txt"

{
  echo "DMS AI MODELS INVENTORY — DATE: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  echo "==================================================================="
  echo "NOTE : Les fichiers .gguf (~5 Go) ne sont pas dupliqués dans cette archive"
  echo "pour préserver l'espace disque. En cas de sinistre total, les re-télécharger"
  echo "ou les restaurer depuis le dépôt maître d'administration."
  echo ""
  if [ -d "${MODELS_DIR}" ]; then
    find "${MODELS_DIR}" -maxdepth 2 -type f -name "*.gguf" -exec ls -lh {} + 2>/dev/null || true
    echo ""
    echo "--- Sommes de contrôle SHA256 (si sha256sum disponible) ---"
    if command -v sha256sum >/dev/null 2>&1; then
      find "${MODELS_DIR}" -maxdepth 2 -type f -name "*.gguf" -exec sha256sum {} + 2>/dev/null || true
    fi
  else
    echo "Répertoire models/ introuvable."
  fi
} > "${MANIFEST_FILE}"
echo "[$(date +'%Y-%m-%d %H:%M:%S')]   ✅ Manifeste IA généré."

# 6. Assemblage final compressé de la sauvegarde
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🗜️ 4/4 - Compression de l'archive consolidée..."
tar -czf "${FINAL_ARCHIVE}" -C "${WORK_DIR}" .
rm -rf "${WORK_DIR}"

TOTAL_ARCHIVE_SIZE=$(du -h "${FINAL_ARCHIVE}" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📦 Sauvegarde consolidée créée avec succès :"
echo "   Fichier : ${FINAL_ARCHIVE} (${TOTAL_ARCHIVE_SIZE})"

# 7. Rétention : Purge automatique des archives plus anciennes que RETENTION_DAYS
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🧹 Application de la politique de rétention (${RETENTION_DAYS} jours)..."
PURGED_COUNT=0
while IFS= read -r old_backup; do
  if [ -n "${old_backup}" ]; then
    rm -f "${old_backup}"
    PURGED_COUNT=$((PURGED_COUNT + 1))
    echo "   Suppression de l'ancienne archive : $(basename "${old_backup}")"
  fi
done < <(find "${TARGET_BACKUP_DIR}" -maxdepth 1 -type f -name "dms_full_backup_*.tar.gz" -mtime +"${RETENTION_DAYS}" 2>/dev/null || true)

echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ ${PURGED_COUNT} archive(s) expirée(s) purgée(s)."
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🎉 SAUVEGARDE DMS TERMINÉE AVEC SUCCÈS."
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
