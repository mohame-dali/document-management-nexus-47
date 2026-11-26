#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/install-mongodb.sh
# Installation et durcissement de MongoDB Community Edition sur Ubuntu (22.04 / 24.04 LTS)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle :
#   1. Détecte dynamiquement Ubuntu 22.04 (jammy -> 7.0) ou 24.04 (noble -> 8.0)
#   2. Installe MongoDB Community Edition + mongodb-database-tools
#   3. Active le service systemd mongod au démarrage
#   4. Verrouille bindIp strictement sur 127.0.0.1 (aucune écoute externe)
#   5. Crée admin_dms (admin) et dms_app_user (document-management) sans mot de passe codé en dur
#   6. Active l'authentification (authorization: enabled) dans /etc/mongod.conf
# ==============================================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté avec les privilèges root (sudo)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

wait_for_apt_lock() {
  local waited=0
  local max_wait=300
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
     || fuser /var/lib/dpkg/lock >/dev/null 2>&1 \
     || fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
    if [ "${waited}" -eq 0 ]; then
      echo "  ⏳ Verrou APT/DPKG détecté — attente..."
    fi
    if [ "${waited}" -ge "${max_wait}" ]; then
      echo "❌ ERREUR : Verrou APT/DPKG toujours actif après ${max_wait}s." >&2
      exit 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "🗄️ DMS — INSTALLATION ET SÉCURISATION DE MONGODB COMMUNITY"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""

# 1. Ajout de la clé GPG et du dépôt officiel MongoDB selon la version d'Ubuntu
UBUNTU_CODENAME="$(lsb_release -cs)"
case "${UBUNTU_CODENAME}" in
  jammy)
    MONGO_SERIES="${MONGO_VERSION:-7.0}"
    ;;
  noble)
    MONGO_SERIES="${MONGO_VERSION:-8.0}"
    ;;
  *)
    echo "❌ ERREUR : Nom de code Ubuntu '${UBUNTU_CODENAME}' non pris en charge automatiquement." >&2
    echo "   Attendu : jammy (22.04 LTS -> MongoDB 7.0) ou noble (24.04 LTS -> MongoDB 8.0)." >&2
    exit 1
    ;;
esac

echo "[1/5] Ajout du dépôt officiel MongoDB ${MONGO_SERIES} (Ubuntu ${UBUNTU_CODENAME})..."
curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_SERIES}.asc" | \
  gpg -o "/usr/share/keyrings/mongodb-server-${MONGO_SERIES}.gpg" --dearmor --yes

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_SERIES}.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/${MONGO_SERIES} multiverse" | \
  tee "/etc/apt/sources.list.d/mongodb-org-${MONGO_SERIES}.list"

wait_for_apt_lock
apt-get update -y
wait_for_apt_lock
apt-get install -y mongodb-org mongodb-database-tools

# 2. Démarrage initial pour initialisation
echo "[2/5] Démarrage du service mongod..."
systemctl enable mongod
systemctl restart mongod
sleep 3

# 3. Création interactive des utilisateurs sans mot de passe en clair dans le script
echo "[3/5] Configuration sécurisée des comptes de base de données..."
echo "Veuillez définir un mot de passe fort pour l'administrateur MongoDB ('admin_dms') :"
read -rs ADMIN_PWD
echo ""
echo "Veuillez définir un mot de passe fort pour l'application DMS ('dms_app_user') :"
read -rs APP_PWD
echo ""

if [ -z "${ADMIN_PWD}" ] || [ -z "${APP_PWD}" ]; then
  echo "❌ ERREUR : Les mots de passe ne peuvent être vides."
  exit 1
fi

# Création du compte administrateur et du compte d'application
mongosh --quiet <<EOF
use admin;
if (!db.getUser("admin_dms")) {
  db.createUser({
    user: "admin_dms",
    pwd: "${ADMIN_PWD}",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" }, { role: "readWriteAnyDatabase", db: "admin" } ]
  });
}

use document-management;
if (!db.getUser("dms_app_user")) {
  db.createUser({
    user: "dms_app_user",
    pwd: "${APP_PWD}",
    roles: [ { role: "readWrite", db: "document-management" }, { role: "dbAdmin", db: "document-management" } ]
  });
}
EOF

# Effacer les variables de la mémoire du shell
unset ADMIN_PWD

# 4. Durcissement de /etc/mongod.conf (bindIp local + authentification activée)
echo "[4/5] Application du durcissement dans /etc/mongod.conf..."
sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf

if ! grep -q "^security:" /etc/mongod.conf; then
  cat <<EOT >> /etc/mongod.conf

security:
  authorization: enabled
EOT
elif ! grep -qE '^[[:space:]]*authorization:[[:space:]]*enabled' /etc/mongod.conf; then
  sed -i '/^security:/a \  authorization: enabled' /etc/mongod.conf 2>/dev/null || true
fi

# 5. Redémarrage avec authentification active
echo "[5/5] Redémarrage de mongod avec sécurité active..."
systemctl restart mongod
sleep 2

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "✅ MONGODB ${MONGO_SERIES} INSTALLÉ ET SÉCURISÉ AVEC SUCCÈS !"
echo "ℹ️ Chaîne de connexion à inscrire dans /var/www/dms/.env :"
echo "   MONGODB_URI=mongodb://dms_app_user:<VOTRE_MOT_DE_PASSE>@127.0.0.1:27017/document-management?authSource=document-management"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
unset APP_PWD
