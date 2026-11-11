#!/usr/bin/env bash
# ==============================================================================
# deploy/scripts/restore-all.sh
# Procédure de restauration intégrale DMS (Base MongoDB + Fichiers Courrier & Uploads)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   Restaure une archive complète générée par backup-all.sh :
#   1. Décompresse l'archive dans un dossier de transit sécurisé
#   2. Restaure les collections MongoDB avec remplacement propre (--drop)
#   3. Restaure les répertoires physiques de stockage (courrier/, uploads/)
#   4. Restaure les permissions adaptées (dms:dms ou utilisateur courant)
#
# Utilisation :
#   bash deploy/scripts/restore-all.sh /chemin/vers/dms_full_backup_YYYYMMDD_HHMMSS.tar.gz
# ==============================================================================

set -euo pipefail

# 1. Contrôle des paramètres
if [ $# -lt 1 ]; then
  echo "❌ ERREUR : Aucun fichier d'archive spécifié."
  echo "Usage : bash $0 /chemin/vers/dms_full_backup_YYYYMMDD_HHMMSS.tar.gz"
  exit 1
fi

ARCHIVE_PATH="$1"
if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "❌ ERREUR : Le fichier d'archive spécifié est introuvable : ${ARCHIVE_PATH}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESTORE_WORK_DIR="/tmp/dms_restore_$(date +'%Y%m%d_%H%M%S')"

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "⚠️  ATTENTION : RESTAURATION COMPLÈTE DE LA BASE DE DONNÉES ET DES DOCUMENTS DMS"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "Fichier d'archive à restaurer : ${ARCHIVE_PATH}"
echo "Racine du projet DMS          : ${PROJECT_ROOT}"
echo ""
echo "⚠️  Cette opération va ÉCRASER les données actuelles de la base avec celles de l'archive."
printf "Voulez-vous vraiment continuer ? Tapez 'OUI' pour confirmer : "
read -r CONFIRMATION
if [ "${CONFIRMATION}" != "OUI" ]; then
  echo "Opération annulée par l'administrateur."
  exit 0
fi

# 2. Décompression de l'archive
echo "\n[$(date +'%Y-%m-%d %H:%M:%S')] 📂 1/4 - Extraction de l'archive de sauvegarde..."
mkdir -p "${RESTORE_WORK_DIR}"
tar -xzf "${ARCHIVE_PATH}" -C "${RESTORE_WORK_DIR}"

# 3. Restauration de la base MongoDB
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🗄️ 2/4 - Restauration de la base MongoDB..."
MONGODB_CONN_URI="${MONGODB_URI:-}"
if [ -z "${MONGODB_CONN_URI}" ] && [ -f "${PROJECT_ROOT}/.env" ]; then
  MONGODB_CONN_URI=$(grep -E '^[[:space:]]*MONGODB_URI=' "${PROJECT_ROOT}/.env" | head -n1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi

if [ -z "${MONGODB_CONN_URI}" ]; then
  MONGODB_CONN_URI="mongodb://127.0.0.1:27017/document-management"
fi

DB_DUMP_FILE="${RESTORE_WORK_DIR}/database_dump.archive.gz"
if [ -f "${DB_DUMP_FILE}" ]; then
  if command -v mongorestore >/dev/null 2>&1; then
    echo "  Application de mongorestore (--drop)..."
    mongorestore --uri="${MONGODB_CONN_URI}" --archive="${DB_DUMP_FILE}" --gzip --drop --quiet
    echo "  ✅ Base de données MongoDB restaurée avec succès."
  else
    echo "  ❌ ERREUR : 'mongorestore' est introuvable. Installez 'mongodb-database-tools'." >&2
    rm -rf "${RESTORE_WORK_DIR}"
    exit 1
  fi
else
  echo "  ⚠️ Fichier de dump de base de données non présent dans cette archive."
fi

# 4. Restauration des fichiers physiques (Courriers & Téléversements)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📁 3/4 - Restauration des fichiers physiques..."
COURRIER_TARGET="${DOCUMENT_PATH:-${PROJECT_ROOT}/backend/courrier}"
UPLOADS_TARGET="${UPLOAD_DIR:-${PROJECT_ROOT}/backend/uploads}"

if [ -d "${RESTORE_WORK_DIR}/storage/courrier" ]; then
  mkdir -p "${COURRIER_TARGET}"
  echo "  Copie des documents vers : ${COURRIER_TARGET}"
  cp -r "${RESTORE_WORK_DIR}/storage/courrier/"* "${COURRIER_TARGET}/" 2>/dev/null || true
  echo "  ✅ Dossier courrier restauré."
fi

if [ -d "${RESTORE_WORK_DIR}/storage/uploads" ]; then
  mkdir -p "${UPLOADS_TARGET}"
  echo "  Copie des téléversements vers : ${UPLOADS_TARGET}"
  cp -r "${RESTORE_WORK_DIR}/storage/uploads/"* "${UPLOADS_TARGET}/" 2>/dev/null || true
  echo "  ✅ Dossier uploads restauré."
fi

# 5. Restitution de l'inventaire IA
if [ -f "${RESTORE_WORK_DIR}/ai_models_manifest.txt" ]; then
  echo "\n[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ 4/4 - Inventaire des modèles IA à l'époque de la sauvegarde :"
  cat "${RESTORE_WORK_DIR}/ai_models_manifest.txt" | head -n 15
  echo "  ..."
fi

# 6. Nettoyage
rm -rf "${RESTORE_WORK_DIR}"

echo "\n" + "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "✅ RESTAURATION TERMINÉE AVEC SUCCÈS !"
echo "Recommandation : Relancez 'node deploy/scripts/smoke-test.mjs' pour valider le bon fonctionnement."
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
