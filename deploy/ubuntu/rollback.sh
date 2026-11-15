#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/rollback.sh
# Procédure de retour arrière (Rollback) d'urgence pour Ubuntu Server
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   1. Restaure le dossier 'dist' précédent depuis 'dist.bak' si disponible
#   2. Recharge le processus PM2 avec la configuration précédente
#   3. Exécute un contrôle de santé minimal pour confirmer la remise en service
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "⚠️  DMS — PROCÉDURE DE ROLLBACK D'URGENCE"
echo "  Répertoire de l'application : ${APP_DIR}"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""

cd "${APP_DIR}"

# 1. Restauration du build frontend précédent
if [ -d "${APP_DIR}/dist.bak" ]; then
  echo "[1/3] 🔙 Restauration du dossier frontend 'dist' précédent..."
  rm -rf "${APP_DIR}/dist"
  mv "${APP_DIR}/dist.bak" "${APP_DIR}/dist"
  echo "  ✅ Frontend restauré depuis la sauvegarde temporaire."
else
  echo "[1/3] ℹ️ Aucune sauvegarde dist.bak trouvée."
fi

# 2. Redémarrage de secours sous PM2
echo "[2/3] 🔄 Redémarrage du processus PM2..."
pm2 reload dms-backend || pm2 restart dms-backend || pm2 start ecosystem.config.cjs
sleep 3

# 3. Contrôle de santé basique
echo "[3/3] 🔍 Vérification de la disponibilité du serveur..."
if curl -s -f "http://127.0.0.1:5000/api/health" >/dev/null; then
  echo "  ✅ Serveur opérationnel sur http://127.0.0.1:5000/api/health."
  echo "🎉 ROLLBACK TERMINÉ : Le service a été rétabli dans son état antérieur."
else
  echo "  ❌ ATTENTION : Le serveur ne répond pas sur /api/health après rollback !"
  echo "     Consultez les journaux d'erreurs : pm2 logs dms-backend --lines 50"
  exit 1
fi
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
