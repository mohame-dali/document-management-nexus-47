# Système de Gestion Documentaire & Courrier (DMS)

Application full-stack de gestion électronique de documents, courriers administratifs entrants/sortants, suivi RH, numérisation locale et recherche sémantique / IA locale (GGUF).

---

## Pile technique

- **Frontend** : React 18, TypeScript, Vite 5, Tailwind CSS, React Router, i18next (FR / AR avec support RTL/LTR).
- **Serveur unifié (`server.ts`)** : Node.js >= 22 (`tsx`), Express 5, Socket.IO 4, tâches planifiées `node-cron` (sauvegarde, nettoyage temporaire, notifications quotidiennes), service SPA Vite (`dev`) / `dist/` (`production`).
- **Base de données** : MongoDB Community + Mongoose `^9.10.2` (client racine partagé).
- **IA locale (GGUF)** : `node-llama-cpp` (`ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` + `bge-m3-q4_k_m.gguf` par défaut, repli Qwen 2.5 / Nomic pris en charge).
- **OCR & Numérisation** : `tesseract-ocr` (`ara`, `fra`, `eng`), `poppler-utils` (`pdftoppm`), `ImageMagick`, `pdf-parse`, scanner Linux SANE (`scanimage`, `img2pdf`) ou Windows WIA (`PowerShell`).
- **Déploiement** : PM2 (`fork`, 1 instance, `ecosystem.config.cjs`), Nginx (`deploy/ubuntu/dms.nginx.conf`) ou IIS (`deploy/windows/web.config`), sauvegarde/restauration (`deploy/scripts/backup-all.sh`, `restore-all.sh`).

---

## Démarrage rapide (développement local)

```bash
# 1. Installer les dépendances depuis la racine uniquement
npm ci

# 2. Configurer l'unique fichier .env à la racine (voir .env.production.example)
cp .env.production.example .env

# 3. Télécharger et vérifier les modèles GGUF locaux (~4,7 Go)
npm run download-models
npm run check-models

# 4. Lancer le serveur unifié (Express + Vite middlewares)
npm run dev
```

## Build et exploitation

```bash
# Compiler le bundle frontend dans dist/
npm run build

# Contrôler l'environnement avant mise en production
node --env-file=.env deploy/scripts/check-env.mjs

# Lancer avec PM2 (1 instance fork via tsx)
pm2 start ecosystem.config.cjs
```

> **Note de sécurité** : avant toute exposition réseau, consultez `docs/ARCHITECTURE_DMS.md` (section 0) et `docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md` pour vérifier l'état exact des contrôles de sécurité, du compte administrateur initial (`backend/scripts/create-superadmin.js`) et des règles Nginx/UFW.

---

## Documentation du dépôt

- [`docs/ARCHITECTURE_DMS.md`](docs/ARCHITECTURE_DMS.md) — Architecture réelle vérifiée dans le code source, flux réseau, chemins de stockage et points de vigilance sécurité.
- [`docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md`](docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md) — Guide complet de préparation et de déploiement (VM QEMU/KVM Ubuntu Desktop, Ubuntu Server, Windows Server, recette et dépannage).
- [`MODELS.md`](MODELS.md) — Guide des modèles IA GGUF (`node-llama-cpp`), variables `.env`, téléchargement et réindexation vectorielle RAG.
