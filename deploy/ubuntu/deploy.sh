#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/deploy.sh
# Script de déploiement et mise à jour automatisée de DMS sur Ubuntu Server
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   1. Vérifie l'environnement (.env et permissions) via check-env.mjs
#   2. Crée une sauvegarde automatique de sécurité avant déploiement
#   3. Installe les dépendances avec 'npm ci --omit=dev' (ou npm ci complet pour tsx)
#   4. Recompile le frontend Vite (npm run build)
#   5. Recharge le service PM2 sans interruption
#   6. Exécute la suite de smoke tests (smoke-test.mjs)
#   7. En cas d'échec du smoke test : déclenche le ROLLBACK AUTOMATIQUE !
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "🚀 DMS — DÉPLOIEMENT DE PRODUCTION UBUNTU"
echo "  Répertoire de l'application : ${APP_DIR}"
echo "  Date & Heure                : $(date +'%Y-%m-%d %H:%M:%S')"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""

cd "${APP_DIR}"

# 1. Vérification de l'environnement avec check-env.mjs
echo "\n[1/6] 🔍 Contrôle préalable de l'environnement..."
if [ ! -f "${APP_DIR}/.env" ]; then
  echo "❌ ERREUR : Fichier .env absent dans ${APP_DIR}."
  echo "   Veuillez copier .env.production.example vers .env et configurer vos valeurs."
  exit 1
fi

node "${APP_DIR}/deploy/scripts/check-env.mjs"

# 2. Sauvegarde de sécurité préalable
echo "\n[2/6] 📦 Création d'une sauvegarde de pré-déploiement..."
if [ -f "${APP_DIR}/deploy/scripts/backup-all.sh" ]; then
  bash "${APP_DIR}/deploy/scripts/backup-all.sh" "${APP_DIR}/backups" 14 || echo "⚠️ Sauvegarde préalable avec avertissement, poursuite du déploiement."
fi

# Sauvegarde de la version précédente de dist/ au cas où
if [ -d "${APP_DIR}/dist" ]; then
  rm -rf "${APP_DIR}/dist.bak"
  cp -r "${APP_DIR}/dist" "${APP_DIR}/dist.bak"
fi

# 3. Installation des dépendances NPM
echo "\n[3/6] 📥 Installation propre des dépendances (npm ci)..."
npm ci

# 4. Compilation des assets Frontend Vite
echo "\n[4/6] 🏗️ Compilation du frontend Vite React (npm run build)..."
npm run build

# 5. Démarrage ou Rechargement PM2
echo "\n[5/6] 🔄 Rechargement du service dms-backend sous PM2..."
if pm2 describe dms-backend >/dev/null 2>&1; then
  echo "  Rechargement de l'instance existante..."
  pm2 reload ecosystem.config.cjs --update-env
else
  echo "  Démarrage initial sous PM2..."
  pm2 start ecosystem.config.cjs
fi
pm2 save

# Pause pour laisser le serveur Express initialiser les connexions
echo "  Attente de stabilisation du serveur (5 secondes)..."
sleep 5

# 6. Exécution du Smoke Test Post-Déploiement
echo "\n[6/6] 🧪 Exécution de la suite de validation (smoke-test)..."
set +e
node "${APP_DIR}/deploy/scripts/smoke-test.mjs" "http://127.0.0.1:5000"
TEST_EXIT_CODE=$?
set -e

if [ ${TEST_EXIT_CODE} -ne 0 ]; then
  echo "\n🚨 ALERTE CRITIQUE : Échec du Smoke Test après déploiement !"
  echo "   Déclenchement immédiat de la procédure de ROLLBACK..."
  bash "${APP_DIR}/deploy/ubuntu/rollback.sh"
  exit 1
fi

echo "\n" + "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "🎉 DÉPLOIEMENT ACHEVÉ AVEC SUCCÈS SUR UBUNTU SERVER !"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
