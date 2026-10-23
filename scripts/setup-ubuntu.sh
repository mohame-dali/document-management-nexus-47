#!/usr/bin/env bash
# scripts/setup-ubuntu.sh
# Script d'installation des dépendances système (Ubuntu / Debian) & modèles IA GGUF
# Sans sudo depuis Express - Exécuté uniquement par l'administrateur système

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     INSTALLATION SYSTÈME & MOTEUR IA DMS (UBUNTU / DEBIAN)        ║${NC}"
echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}\n"

# Détection de l'accès root / sudo
SUDO=""
if [ "$EUID" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
    echo -e "${CYAN}[INFO]${NC} Privilèges standard détectés : utilisation de 'sudo' pour les paquets système."
  else
    echo -e "${RED}[ERREUR]${NC} Ce script nécessite les droits root ou sudo pour installer les dépendances système."
    exit 1
  fi
fi

# 1. Mise à jour de la liste des paquets
echo -e "\n${BOLD}1. Mise à jour des dépôts APT...${NC}"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y

# 2. Installation des outils de build et compilation (requis pour node-llama-cpp)
echo -e "\n${BOLD}2. Installation des compilateurs C/C++ et CMake...${NC}"
$SUDO apt-get install -y --no-install-recommends \
  build-essential \
  cmake \
  python3 \
  curl \
  ca-certificates

# 3. Installation du moteur OCR Tesseract (français + arabe)
echo -e "\n${BOLD}3. Installation du moteur OCR Tesseract...${NC}"
$SUDO apt-get install -y --no-install-recommends \
  tesseract-ocr \
  tesseract-ocr-fra \
  tesseract-ocr-ara

# 4. Installation des pilotes et utilitaires de Scanner (SANE)
echo -e "\n${BOLD}4. Installation des outils de numérisation (SANE / scanimage)...${NC}"
$SUDO apt-get install -y --no-install-recommends \
  sane-utils \
  libsane-dev

# 5. Création du répertoire des modèles
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "\n${BOLD}5. Préparation du répertoire des modèles IA...${NC}"
mkdir -p "$PROJECT_ROOT/models"

# 6. Vérification de node-llama-cpp dans le projet
echo -e "\n${BOLD}6. Vérification du moteur d'inférence node-llama-cpp...${NC}"
if [ -d "node_modules/node-llama-cpp" ] || [ -d "backend/node_modules/node-llama-cpp" ]; then
  echo -e "${GREEN}[OK]${NC} node-llama-cpp est installé."
else
  echo -e "${YELLOW}[INFO]${NC} Installation des dépendances Node.js..."
  npm install
fi

# 7. Téléchargement des modèles IA GGUF (ALLaM 7B & BGE-M3)
echo -e "\n${BOLD}7. Lancement du téléchargement des modèles IA GGUF...${NC}"
if command -v node >/dev/null 2>&1; then
  node scripts/download-models.js
else
  echo -e "${RED}[ERREUR]${NC} Node.js n'est pas trouvé dans le PATH. Veuillez installer Node.js v18+."
  exit 1
fi

echo -e "\n${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}✅ INSTALLATION SYSTÈME ET MODÈLES IA TERMINÉE AVEC SUCCÈS !${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${NC}\n"
echo -e "Pour démarrer le serveur : ${CYAN}npm run dev${NC} ou ${CYAN}npm start${NC}\n"
