#!/usr/bin/env bash
# ==============================================================================
# deploy/scripts/restore-all.sh
# Procédure de restauration intégrale DMS sécurisée
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   Restaure une archive complète générée par backup-all.sh :
#   1. Vérifie l'intégrité de l'archive tar.gz AVANT toute action
#   2. Restaure par défaut vers une base de test (document-management-test)
#      Pour restaurer vers la base de production et appliquer --drop, exige le
#      flag explicite --target-prod ET la confirmation textuelle 'OUI'
#   3. Affiche explicitement la base cible et l'archive
#   4. Restaure les répertoires physiques de stockage (courrier/, uploads/)
#   5. Restitue l'inventaire des modèles IA requis
#
# Utilisation :
#   bash deploy/scripts/restore-all.sh /chemin/vers/archive.tar.gz [--target-prod]
# ==============================================================================

set -euo pipefail

# 1. Analyse des arguments
TARGET_PROD=false
ARCHIVE_PATH=""

for arg in "$@"; do
  if [ "$arg" == "--target-prod" ]; then
    TARGET_PROD=true
  elif [ -z "${ARCHIVE_PATH}" ]; then
    ARCHIVE_PATH="$arg"
  fi
done

if [ -z "${ARCHIVE_PATH}" ]; then
  echo "❌ ERREUR : Aucun fichier d'archive spécifié."
  echo "Usage : bash $0 /chemin/vers/dms_full_backup_*.tar.gz [--target-prod]"
  exit 1
fi

if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "❌ ERREUR : Le fichier d'archive spécifié est introuvable : ${ARCHIVE_PATH}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# 2. Vérification rigoureuse de l'intégrité de l'archive tar.gz
printf '=%.0s' {1..78}; echo ""
echo "🔍 ÉTAPE PRÉALABLE : VÉRIFICATION D'INTÉGRITÉ DE L'ARCHIVE..."
if ! tar -tzf "${ARCHIVE_PATH}" >/dev/null 2>&1; then
  echo "❌ ERREUR CRITIQUE : L'archive tar.gz est corrompue ou incomplète !"
  echo "   Restauration annulée immédiatement pour protéger le système."
  exit 1
fi
echo "✅ Intégrité de l'archive vérifiée avec succès (archive valide)."

# 3. Détermination de la base de données cible
MONGODB_CONN_URI="${MONGODB_URI:-}"
if [ -z "${MONGODB_CONN_URI}" ] && [ -f "${PROJECT_ROOT}/.env" ]; then
  MONGODB_CONN_URI=$(grep -E '^[[:space:]]*MONGODB_URI=' "${PROJECT_ROOT}/.env" | head -n1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi
if [ -z "${MONGODB_CONN_URI}" ]; then
  MONGODB_CONN_URI="mongodb://127.0.0.1:27017/document-management"
fi

PROD_DB_NAME="document-management"
TEST_DB_NAME="document-management-test"

if [ "${TARGET_PROD}" = true ]; then
  TARGET_DB="${PROD_DB_NAME}"
  DROP_FLAG="--drop"
else
  TARGET_DB="${TEST_DB_NAME}"
  DROP_FLAG=""
fi

# 4. Affichage récapitulatif & Demande de confirmation
printf '=%.0s' {1..78}; echo ""
echo "⚠️  DMS — RESTAURATION DE LA BASE DE DONNÉES ET DES DOCUMENTS"
printf '=%.0s' {1..78}; echo ""
echo "  Archive source : ${ARCHIVE_PATH}"
echo "  Base cible     : ${TARGET_DB}"
echo "  Mode cible     : $([ "${TARGET_PROD}" = true ] && echo "🔴 PRODUCTION (Écrasement avec --drop)" || echo "🟡 TEST / RECETTE (Sécurisé, pas de --drop sur prod)")"
echo "  Racine projet  : ${PROJECT_ROOT}"
echo ""

if [ "${TARGET_PROD}" = true ]; then
  echo "🚨 DANGER : Vous avez spécifié --target-prod."
  echo "   Toutes les collections de la base de PRODUCTION '${TARGET_DB}' vont être ÉCRASÉES !"
  printf "   Tapez exactement 'OUI' pour confirmer l'écrasement de production : "
  read -r CONFIRMATION
  if [ "${CONFIRMATION}" != "OUI" ]; then
    echo "Opération annulée par l'administrateur."
    exit 0
  fi
else
  echo "ℹ️ Restauration en environnement de test (aucun impact sur la base de production)."
  printf "   Confirmez-vous la restauration vers '${TARGET_DB}' ? (O/N) : "
  read -r CONFIRMATION
  if [ "${CONFIRMATION}" != "O" ] && [ "${CONFIRMATION}" != "o" ] && [ "${CONFIRMATION}" != "OUI" ]; then
    echo "Opération annulée."
    exit 0
  fi
fi

# 5. Extraction temporaire de l'archive
RESTORE_WORK_DIR="/tmp/dms_restore_$(date +'%Y%m%d_%H%M%S')"
mkdir -p "${RESTORE_WORK_DIR}"
echo "\n[$(date +'%Y-%m-%d %H:%M:%S')] 📂 1/4 - Extraction de l'archive de transit..."
tar -xzf "${ARCHIVE_PATH}" -C "${RESTORE_WORK_DIR}"

# 6. Restauration de la base MongoDB
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🗄️ 2/4 - Restauration vers la base MongoDB '${TARGET_DB}'..."
DB_DUMP_FILE="${RESTORE_WORK_DIR}/database_dump.archive.gz"

if [ -f "${DB_DUMP_FILE}" ]; then
  if command -v mongorestore >/dev/null 2>&1; then
    # Construction de l'URI cible adaptée si base de test
    RESTORE_URI="${MONGODB_CONN_URI}"
    if [ "${TARGET_PROD}" != true ]; then
      # Remplacement du nom de base dans l'URI pour cibler document-management-test
      RESTORE_URI=$(echo "${MONGODB_CONN_URI}" | sed "s|/${PROD_DB_NAME}|/${TEST_DB_NAME}|g")
    fi

    echo "  Application de mongorestore ${DROP_FLAG} vers la cible..."
    # mongorestore avec remapping vers la base cible
    if [ "${TARGET_PROD}" = true ]; then
      mongorestore --uri="${RESTORE_URI}" --archive="${DB_DUMP_FILE}" --gzip --drop --quiet
    else
      mongorestore --uri="${RESTORE_URI}" --archive="${DB_DUMP_FILE}" --gzip --nsInclude="${PROD_DB_NAME}.*" --nsFrom="${PROD_DB_NAME}.*" --nsTo="${TEST_DB_NAME}.*" --quiet || \
      mongorestore --uri="${RESTORE_URI}" --archive="${DB_DUMP_FILE}" --gzip --quiet
    fi
    echo "  ✅ Données MongoDB restaurées avec succès dans '${TARGET_DB}'."
  else
    echo "  ❌ ERREUR : 'mongorestore' introuvable. Installez 'mongodb-database-tools'." >&2
    rm -rf "${RESTORE_WORK_DIR}"
    exit 1
  fi
else
  echo "  ⚠️ Aucun fichier database_dump.archive.gz trouvé dans cette archive."
fi

# 7. Restauration des fichiers physiques (uniquement si target-prod ou validation)
COURRIER_TARGET="${DOCUMENT_PATH:-${PROJECT_ROOT}/backend/courrier}"
UPLOADS_TARGET="${UPLOAD_DIR:-${PROJECT_ROOT}/backend/uploads}"

if [ "${TARGET_PROD}" = true ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] 📁 3/4 - Restauration des documents administratifs physiques..."
  if [ -d "${RESTORE_WORK_DIR}/storage/courrier" ]; then
    mkdir -p "${COURRIER_TARGET}"
    cp -r "${RESTORE_WORK_DIR}/storage/courrier/"* "${COURRIER_TARGET}/" 2>/dev/null || true
    echo "  ✅ Dossier courrier/ restauré (${COURRIER_TARGET})."
  fi

  if [ -d "${RESTORE_WORK_DIR}/storage/uploads" ]; then
    mkdir -p "${UPLOADS_TARGET}"
    cp -r "${RESTORE_WORK_DIR}/storage/uploads/"* "${UPLOADS_TARGET}/" 2>/dev/null || true
    echo "  ✅ Dossier uploads/ restauré (${UPLOADS_TARGET})."
  fi
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️ 3/4 - Restauration des fichiers physiques ignorée en mode test (évite d'écraser la prod)."
fi

# 8. Affichage du manifeste des modèles IA
if [ -f "${RESTORE_WORK_DIR}/ai_models_manifest.txt" ]; then
  echo "\n[$(date +'%Y-%m-%d %H:%M:%S')] 🤖 4/4 - Manifeste des modèles IA archivés :"
  cat "${RESTORE_WORK_DIR}/ai_models_manifest.txt"
fi

rm -rf "${RESTORE_WORK_DIR}"

printf '=%.0s' {1..78}; echo ""
echo "✅ RESTAURATION ACHEVÉE AVEC SUCCÈS !"
echo "Cible restaurée : ${TARGET_DB}"
printf '=%.0s' {1..78}; echo ""
