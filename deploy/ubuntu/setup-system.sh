#!/usr/bin/env bash
# ==============================================================================
# deploy/ubuntu/setup-system.sh
# Préparation initiale du système d'exploitation Ubuntu Server (22.04 / 24.04 LTS)
# [NON TESTÉ, à exécuter sur une VM de recette]
# ==============================================================================
# Rôle (Idempotent) :
#   1. Vérifie l'exécution sous privilèges sudo / root
#   2. Met à jour les paquets APT du système
#   3. Installe les paquets de compilation C++ et bibliothèques (cmake, build-essential)
#      requis pour la compilation native de node-llama-cpp
#   4. Installe les outils OCR & PDF (tesseract-ocr, packs arabe/français, poppler-utils)
#   5. Installe les utilitaires de numérisation (sane-utils)
#   6. Crée l'utilisateur système de service dédié 'dms' (sans accès shell interactif)
#   7. Configure le fuseau horaire administratif (Africa/Tunis)
#   8. Installe le runtime Node.js v22 LTS via NodeSource et le gestionnaire PM2
#   9. Configure le pare-feu UFW (autorise SSH:22, HTTP:80, HTTPS:443 ; bloque 3000 et 27017 de l'extérieur)
# ==============================================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Ce script doit être exécuté avec des privilèges administrateur (sudo ou root)." >&2
  exit 1
fi

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "🚀 DMS — INITIALISATION DU SYSTÈME UBUNTU SERVER (22.04 / 24.04 LTS)"
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""

# 1. Fuseau horaire
echo "[1/8] Configuration du fuseau horaire (Africa/Tunis)..."
timedatectl set-timezone Africa/Tunis || true
echo "  Heure locale système : $(date)"

# 2. Mise à jour des dépôts
echo "[2/8] Mise à jour des paquets système APT..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# 3. Outils de base & dépendances C++ pour node-llama-cpp
echo "[3/8] Installation des outils de compilation et utilitaires..."
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

# 4. Dépendances OCR & Numérisation (Arabe + Français + Poppler + SANE)
echo "[4/8] Installation de Tesseract OCR, Poppler et SANE..."
apt-get install -y \
  tesseract-ocr \
  tesseract-ocr-ara \
  tesseract-ocr-fra \
  poppler-utils \
  sane-utils

# 5. Création de l'utilisateur système dédié 'dms'
echo "[5/8] Création du compte de service 'dms'..."
if id "dms" >/dev/null 2>&1; then
  echo "  Le compte 'dms' existe déjà."
else
  useradd -r -m -d /var/www/dms -s /bin/bash dms
  echo "  ✅ Utilisateur 'dms' créé avec répertoire personnel /var/www/dms."
fi

# 6. Installation de Node.js v22 LTS & PM2
echo "[6/8] Installation de Node.js 22 LTS et PM2..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
  echo "  Configuration du dépôt NodeSource pour Node 22.x..."
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
echo "  Node.js : $(node -v) | NPM : $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
  echo "  ✅ PM2 installé globalement."
fi

# 7. Création de l'arborescence des répertoires de données
echo "[7/8] Création de l'arborescence /var/www/dms et attribution des droits..."
mkdir -p /var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}
chown -R dms:dms /var/www/dms
chmod 750 /var/www/dms
chmod -R 750 /var/www/dms/{backend/courrier,backend/uploads,backups,logs}

# 8. Configuration du pare-feu UFW
echo "[8/8] Configuration du pare-feu local UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Nginx'
ufw allow 443/tcp comment 'HTTPS Nginx'
# Bloquer express (3000) et mongo (27017) de l'extérieur en s'assurant qu'aucun port n'est ouvert par erreur
ufw deny 3000/tcp comment 'Block direct Express access'
ufw deny 27017/tcp comment 'Block direct MongoDB access'
ufw --force enable || true

echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
echo "✅ SYSTÈME UBUNTU INITIALISÉ AVEC SUCCÈS !"
echo "Prochaine étape : exécuter 'bash deploy/ubuntu/install-mongodb.sh' puis déployer l'application."
echo "═".repeat 78 2>/dev/null || printf '=%.0s' {1..78}; echo ""
