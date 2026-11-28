# Système de Gestion Documentaire & Courrier (DMS)

Application full-stack de gestion électronique de documents, courriers administratifs entrants/sortants, suivi RH, numérisation locale et recherche sémantique / IA locale (GGUF).

---

## Pile technique

- **Frontend** : React 18, TypeScript, Vite 5, Tailwind CSS, React Router, i18next (FR / AR avec support RTL/LTR).
- **Serveur unifié (`server.ts`)** : Node.js **`v22.22.1`** (`>= 22.x`, exécuté via `tsx`), Express 5, Socket.IO 4, tâches planifiées `node-cron` (sauvegarde, nettoyage temporaire, notifications quotidiennes, rattrapage RAG `INDEX_RETRY_CRON`), service SPA Vite (`dev`) / `dist/` (`production`).
- **Base de données** : MongoDB 8.0 Community + Mongoose `^9.10.2` (client racine partagé).
- **IA locale (GGUF)** : `node-llama-cpp` (`ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` + `bge-m3-q4_k_m.gguf` par défaut, isolé dans un worker IPC `backend/workers/aiWorker.js`, repli Qwen 2.5 / Nomic pris en charge).
- **OCR & Numérisation** : `tesseract-ocr` (`ara`, `fra`, `eng`), `poppler-utils` (`pdftoppm`), `ImageMagick`, `pdf-parse`, scanner Linux SANE (`scanimage`, `img2pdf`) ou Windows WIA (`PowerShell`).
- **Déploiement** : PM2 (`fork`, 1 instance, `ecosystem.config.cjs`), Nginx (`deploy/ubuntu/dms.nginx.conf`) ou IIS (`deploy/windows/web.config`), sauvegarde/restauration (`deploy/scripts/backup-all.sh`, `restore-all.sh`).

---

## Architecture de navigation & RBAC

La barre latérale est structurée autour de **7 entrées principales** (+ hub Administration réservé à `Admin` / `Director`) :

1. **Tableau de bord exécutif (`/dashboard`)** — Accès restreint exclusivement à `Admin` et `Director` (`Directeur`), protégé côté backend (`403` sur `/api/dashboard/summary` et `/api/dashboard/stats`). Affiche les indicateurs de goulets d'étranglement et les courriers urgents ou sans responsable. Tous les autres rôles (`AdminDepartment`, `AdminTuningDesk` / Bureau d'ordre, `User`) atterrissent directement sur **`/dashboard/mail/incoming`**.
2. **Courrier & Documents (`/dashboard/mail/*`)** — Formulaires de création à divulgation progressive, autocomplétion intelligente des organismes, suggestion de sujet OCR/IA en un clic, actions rapides au survol (aperçu PDF en tiroir latéral, copie de référence en un clic, affectation rapide selon rôle), classement en dossiers en ligne ou par lot, et déduplication d'audit `document_view` de 10 minutes côté backend.
3. **Archives & Dossiers (`/dashboard/folders`)** — Explorateur d'archives Master-Detail à deux volets promu au premier niveau (avec redirection rétrocompatible depuis `/dashboard/mail/folders`).
4. **Ressources Humaines (`/dashboard/hr/*`)** — Hub à 4 onglets (`Personnel`, `Registre de présence` matriciel en un clic avec visibilité cloisonnée par département, `Situation globale`, `Stages`), plus rapport mensuel imprimable en A4 paysage (`@media print` sur `/dashboard/hr/attendance/report`). Accessible à `Admin`, `Director`, et `AdminDepartment` rattaché au département RH configuré.
5. **Administration & Modèles — « الإدارة والنماذج » / « Administration & Modèles » (`/dashboard/organization`)** — Hub unifié regroupant la galerie de modèles administratifs sur 3 colonnes, l'organigramme interactif (annuaire / arbre), et les onglets protégés par rôle Paramètres système (`Admin`) / Options des documents (`AdminTuningDesk`), avec redirections fluides depuis `/dashboard/tools/templates`, `/dashboard/tools/document-options`, `/dashboard/organization-chart` et `/dashboard/admin/organization-chart`.
6. **Profil & Présence (`/dashboard/profile/my-profile`, `/dashboard/profile/my-attendance`)** — Fiche personnelle, calendrier de présence individuel et solde de congés.
7. **Messagerie (`/dashboard/messages`) & Corbeille (`/dashboard/trash`)** — Messagerie interne temps réel Socket.IO et corbeille persistante isolée par utilisateur (corbeille accessible aux rôles `Admin`, `AdminTuningDesk`, `AdminDepartment`).
   - *Hub Administration (`/dashboard/admin/*` — `Admin` & `Director`)* : Comptes utilisateurs, Départements, Piste d'audit, Paramètres (`Admin` uniquement) et Guide d'installation.

---

## Démarrage rapide (développement local)

```bash
# 1. Installer les dépendances depuis la racine uniquement (Node.js v22.22.1 recommandé)
npm ci

# 2. Configurer l'unique fichier .env à la racine (voir .env.example et docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md)
cp .env.example .env

# 3. Télécharger et vérifier les modèles GGUF locaux (~4,7 Go)
npm run download-models
npm run check-models

# 4. Lancer le serveur unifié (Express + Vite middlewares)
npm run dev
```

---

## Build et mise en production (Ubuntu 24.04 — `172.16.90.131` / `/var/www/dms`)

### Vérification locale et compilation

```bash
# Contrôler les types, le lint et compiler le bundle frontend dans dist/
npx tsc --noEmit
npm run lint
npm run build

# Contrôler l'environnement avant mise en production
node --env-file=.env deploy/scripts/check-env.mjs
```

### Mise à jour et déploiement des modifications (`Updating & Deploying Changes`)

Depuis le poste de développement (ou dépôt local propre) vers le serveur Ubuntu 24.04 (`172.16.90.131`, répertoire cible `/var/www/dms`) :

```bash
# 1. Compiler le bundle frontend à jour
npm run build

# 2. Synchroniser les sources et dist/ vers /var/www/dms (en préservant node_modules/, uploads/, courrier/, models/ et .env)
rsync -avz --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='backend/node_modules/' \
  --exclude='uploads/' \
  --exclude='backend/uploads/' \
  --exclude='backend/courrier/' \
  --exclude='models/*.gguf' \
  --exclude='.env' \
  --exclude='backend/.env' \
  --exclude='logs/' \
  --exclude='backups/' \
  ./ dms@172.16.90.131:/var/www/dms/
```

Sur le serveur **`172.16.90.131`** (`/var/www/dms`) :

```bash
# 3. Redémarrer le processus PM2 (ecosystem.config.cjs déclare l'application 'dms-backend', ou alias 'dms')
cd /var/www/dms
pm2 restart dms || pm2 restart dms-backend

# 4. Recharger Nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. Vérifications post-déploiement obligatoires
pm2 status
pm2 logs dms --lines 50 || pm2 logs dms-backend --lines 50
curl -sk https://172.16.90.131/api/health
# Vérifier les droits d'écriture sur backend/uploads/ pour l'utilisateur d'exécution (dms)
test -w /var/www/dms/backend/uploads && echo "uploads writable OK" || echo "ERREUR droits backend/uploads/"
```

> **Note de sécurité** : avant toute exposition réseau, consultez [`docs/ARCHITECTURE_DMS.md`](docs/ARCHITECTURE_DMS.md) et [`docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md`](docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md) pour vérifier l'état des contrôles de sécurité, du compte administrateur initial (`backend/scripts/create-superadmin.js`) et des règles Nginx/UFW.

---

## Documentation du dépôt

- [`docs/ARCHITECTURE_DMS.md`](docs/ARCHITECTURE_DMS.md) — Architecture complète (navigation/RBAC frontend, API/Socket.IO, worker IA GGUF, chemins de stockage et sécurité).
- [`docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md`](docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md) — Guide complet d'installation, durcissement, déploiement (`172.16.90.131` / `/var/www/dms`), mise à jour et dépannage (Ubuntu 24.04 LTS & Windows Server).
- [`deploy/DEPLOY_KVM_UBUNTU.md`](deploy/DEPLOY_KVM_UBUNTU.md) — Fiche synthétique d'infrastructure VM KVM/QEMU sous Ubuntu 24.04 Server.
- [`MODELS.md`](MODELS.md) — Guide des modèles IA GGUF (`node-llama-cpp`), variables `.env`, téléchargement et réindexation vectorielle RAG.
