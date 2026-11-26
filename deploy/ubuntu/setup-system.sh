#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/setup-system.sh
# Préparation initiale du système Ubuntu (Server & Desktop VM 22.04 / 24.04 LTS)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle (Idempotent) :
#   1. Vérifie l'exécution sous privilèges sudo / root
#   2. Attend la libération d'éventuels verrous APT/DPKG (unattended-upgrades / packagekitd)
#   3. Met à jour les paquets APT du système
#   4. Installe les paquets de compilation C++ (cmake, build-essential) pour node-llama-cpp
#   5. Installe les outils OCR, PDF & numérisation (tesseract-ocr, ara/fra, poppler-utils, imagemagick, sane-utils, img2pdf)
#   6. Crée l'utilisateur système dédié 'dms' et l'ajoute aux groupes scanner,lp
#   7. Configure le fuseau horaire administratif (Africa/Tunis)
#   8. Installe le runtime Node.js v22 LTS via NodeSource et le gestionnaire PM2
#   9. Crée /var/www/dms et /var/backups/dms (dms:dms, chmod 750)
#  10. Configure le pare-feu UFW (autorise 22, 80, 443 ; bloque 3000, 5000 et 27017)
# ==============================================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté avec des privilèges administrateur (sudo ou root)." >&2
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
      echo "  ⏳ Verrou APT/DPKG détecté (unattended-upgrades / packagekitd) — attente..."
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
echo "🚀 DMS — INITIALISATION DU SYSTÈME UBUNTU (22.04 / 24.04 LTS)"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""

# 1. Fuseau horaire
echo "[1/8] Configuration du fuseau horaire (Africa/Tunis)..."
timedatectl set-timezone Africa/Tunis || true
echo "  Heure locale système : $(date)"

# 2. Mise à jour des dépôts
echo "[2/8] Mise à jour des paquets système APT..."
wait_for_apt_lock
apt-get update -y
wait_for_apt_lock
apt-get upgrade -y

# 3. Outils de base & dépendances C++ pour node-llama-cpp
echo "[3/8] Installation des outils de compilation et utilitaires..."
wait_for_apt_lock
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  build-essential \
  cmake \
  pkg-config \
  nginx \
  ufw

# 4. Dépendances OCR, Image & Numérisation (Arabe + Français + Poppler + ImageMagick + SANE + img2pdf)
echo "[4/8] Installation de Tesseract OCR, Poppler, ImageMagick, SANE et img2pdf..."
wait_for_apt_lock
apt-get install -y \
  tesseract-ocr \
  tesseract-ocr-ara \
  tesseract-ocr-fra \
  poppler-utils \
  imagemagick \
  sane-utils \
  img2pdf

# 5. Création de l'utilisateur système dédié 'dms' et attribution des groupes scanner/lp
echo "[5/8] Création du compte de service 'dms'..."
if id "dms" >/dev/null 2>&1; then
  echo "  Le compte 'dms' existe déjà."
else
  useradd -r -m -d /var/www/dms -s /bin/bash dms
  echo "  ✅ Utilisateur 'dms' créé avec répertoire personnel /var/www/dms."
fi

for grp in scanner lp; do
  if getent group "${grp}" >/dev/null 2>&1; then
    usermod -aG "${grp}" dms
  fi
done
echo "  Groupes matériels pour 'dms' : $(id -Gn dms)"

# 6. Installation de Node.js v22 LTS & PM2
echo "[6/8] Installation de Node.js 22 LTS et PM2..."
if command -v snap >/dev/null 2>&1 && snap list node >/dev/null 2>&1; then
  echo "  ⚠️ ALERTE : Paquet Snap 'node' détecté. Purgez-le ('sudo snap remove node') pour éviter les conflits AppArmor." >&2
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
  echo "  Configuration du dépôt NodeSource pour Node 22.x..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  wait_for_apt_lock
  apt-get update -y
  wait_for_apt_lock
  apt-get install -y nodejs
fi
echo "  Node.js : $(node -v) | NPM : $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
  echo "  ✅ PM2 installé globalement."
fi

# 7. Création de l'arborescence des répertoires de données et sauvegardes
echo "[7/8] Création de /var/www/dms et /var/backups/dms avec attribution des droits..."
mkdir -p /var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}
chown -R dms:dms /var/www/dms
chmod 750 /var/www/dms
chmod -R 750 /var/www/dms/{backend/courrier,backend/uploads,backups,logs}

mkdir -p /var/backups/dms
chown dms:dms /var/backups/dms
chmod 750 /var/backups/dms

# 8. Configuration du pare-feu UFW
echo "[8/8] Configuration du pare-feu local UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Nginx'
ufw allow 443/tcp comment 'HTTPS Nginx'
# Bloquer les accès directs Express (3000 & 5000) et MongoDB (27017) de l'extérieur
ufw deny 3000/tcp comment 'Block direct Express dev access'
ufw deny 5000/tcp comment 'Block direct Express prod access'
ufw deny 27017/tcp comment 'Block direct MongoDB access'
ufw --force enable || true

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "✅ SYSTÈME UBUNTU INITIALISÉ AVEC SUCCÈS !"
echo "Prochaine étape : exécuter 'bash deploy/ubuntu/install-mongodb.sh' puis déployer l'application."
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
