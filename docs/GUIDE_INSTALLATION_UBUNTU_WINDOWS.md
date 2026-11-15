# Guide d'installation et de déploiement DMS — Ubuntu Server & Windows Server

> **AVERTISSEMENT CRITIQUE DE SÉCURITÉ — NE PAS EXPOSER AU RÉSEAU**  
> **Ne pas exposer cette application sur un réseau (LAN, intranet ou Internet) tant que les défauts de sécurité bloquants inventoriés dans `docs/ARCHITECTURE_DMS.md` (section 0) n'ont pas été corrigés et prouvés.**  
> - Répertoire `docs/audit-local/` : **`[RÉPERTOIRE ABSENT]`**.  
> - Document `docs/PRET_DEPLOIEMENT.md` (dont `SEC-12`) : **non confirmé par le propriétaire**.  
> - Toute procédure d'installation décrite dans ce guide est marquée **`[NON TESTÉ EN RÉEL]`** (aucune exécution effectuée sur les serveurs cibles du propriétaire).  
> - Chaque assertion est distinguée en **`FAIT`** (lu dans le code avec `fichier:ligne`), **`HYPOTHÈSE`** ou **`DÉCISION DU PROPRIÉTAIRE`**. Aucune valeur réelle de secret ni aucun mot de passe par défaut (`admin / Admin123!`) ne doit être utilisé en exploitation.

---

# PARTIE 2/4 : PRÉREQUIS ET PRÉPARATION (COMMUNS UBUNTU & WINDOWS)

## 1. Matériel requis (déduit du code — `[À CONFIRMER]`)

| Ressource | Exigence déduite du code | Source vérifiée (`fichier:ligne`) | Statut / Remarque |
|---|---|---|---|
| **RAM** | **16 Go minimum** recommandés (ou ≥ 8 Go avec modèle allégé non configuré par défaut) | `ecosystem.config.cjs:34` (`max_memory_restart: '6G'`) ; `server.ts:80` (~5 Go préchargés) ; `scripts/download-models.js:55-67` ; `MODELS.md:11-14,100` | **`[À CONFIRMER]`** selon charge concurrente et taille des PDF scannés en 600 DPI (`backend/utils/ocrProcessor.js:119-121`) |
| **CPU** | **4 cœurs physiques minimum** (`LLAMA_THREADS` calculé à `os.cpus().length / 2`) | `server.ts:44` ; `.env.production.example:74` ; `MODELS.md:14` | **`[À CONFIRMER]`** selon latence acceptable pour l'inférence CPU |
| **GPU** | Optionnel (`LLAMA_GPU_LAYERS=0` = CPU pur ; `>0` = `gpu: 'auto'` CUDA/Vulkan) | `backend/services/ollamaService.js:28,86` ; `.env.production.example:77` | **`DÉCISION DU PROPRIÉTAIRE`** (présence GPU ou non) |
| **Disque** | ~5 Go pour les 2 modèles `.gguf` + dépendances (`node_modules` + natif C++) + OS + MongoDB + `courrier/` + `uploads/` + `backups/` | `scripts/download-models.js:56,66` ; `MODELS.md:11-12` | **`[À CONFIRMER]`** selon volumétrie annuelle de courriers et rétention (14–30 jours) |

---

## 2. Système d'exploitation, Node.js, Mongoose et MongoDB

### 2.1 Système d'exploitation (`DÉCISION DU PROPRIÉTAIRE`)
- **Ubuntu Server** : scripts ciblant `22.04 / 24.04 LTS` (`deploy/ubuntu/setup-system.sh:4`, `MODELS.md:14`) — version exacte = **`DÉCISION DU PROPRIÉTAIRE`**.
- **Windows Server** : scripts ciblant `2019 / 2022` (`deploy/windows/install-prereqs.ps1:3`, `deploy/windows/web.config:4`) — version exacte = **`DÉCISION DU PROPRIÉTAIRE`**.

### 2.2 Runtime Node.js
- **`FAIT`** : `deploy/scripts/check-env.mjs:47-56` bloque le déploiement si `Node.js < 22.x`.
- `deploy/ubuntu/setup-system.sh:76-82` installe **Node.js 22.x LTS** ; `deploy/windows/install-prereqs.ps1:42` installe **Node.js 22.14.0 LTS**.

### 2.3 Double version de Mongoose et choix de la version MongoDB
- **`FAIT` (double version détectée)** :
  - `package.json:81` (racine) : `"mongoose": "^9.10.2"`
  - `backend/package.json:21` : `"mongoose": "^8.0.0"`
- **Quelle version le serveur actif charge-t-il ? (`FAIT`)**
  - Le serveur de référence est `server.ts` à la racine (`ecosystem.config.cjs:26`, `deploy/windows/install-service.ps1:55-62`).
  - `server.ts:19` importe `require('./backend/config/db')`, lequel exécute `const mongoose = require('mongoose');` (`backend/config/db.js:2`).
  - D'après la résolution Node.js, tant qu'aucun `backend/node_modules/` distinct n'est installé via `cd backend && npm install`, Node remonte au répertoire parent et charge **`mongoose ^9.10.2` depuis `/node_modules` (racine, `package.json:81`)**. Si `npm install` était exécuté séparément dans `backend/`, Node chargerait `^8.0.0` (`backend/package.json:21`), créant une divergence de version avec `server.ts`.
- **Version de MongoDB à installer : `[À CONFIRMER]`**
  - `deploy/ubuntu/install-mongodb.sh:31-35` configure le dépôt **MongoDB Community 7.0** (tandis que `docker-compose.yml:32` cite `mongo:6.0` et `deploy/windows/install-prereqs.ps1:52` installe le paquet Chocolatey `mongodb` sans version épinglée).
  - La version exacte de MongoDB Community à installer sur le serveur cible reste **`[À CONFIRMER]`** par le propriétaire selon :
    1. la matrice de compatibilité officielle de **`mongoose ^9.10.2`** (chargé par `server.ts:19` via `backend/config/db.js:2`) ;
    2. la version exacte d'Ubuntu Server ou de Windows Server retenue.

---

## 3. Ports, domaine/IP et stratégie HTTPS (`DÉCISION DU PROPRIÉTAIRE`)

| Paramètre réseau | Valeur / Règle | Décision / Incohérence |
|---|---|---|
| **Port interne Node.js `${PORT}`** | Variable `${PORT}` (écoute sur `0.0.0.0:${PORT}`, `server.ts:376`) | **`DÉCISION DU PROPRIÉTAIRE` (non tranchée)**. **Incohérence `3000` / `5000` constatée (`FAIT`)** : `server.ts:316` prend `3000` par défaut (et `.env.example:1`, `vite.config.ts:14`, `deploy/ubuntu/setup-system.sh:106` `ufw deny 3000/tcp`), alors que `backend/server.js:354`, `.env.production.example:15`, `ecosystem.config.cjs:42`, `deploy/ubuntu/dms.nginx.conf:7`, `dms.nginx.conf:89`, `deploy/windows/web.config:30`, `deploy/windows/install-service.ps1:83` et `deploy/scripts/check-env.mjs:38` utilisent `5000`. Une fois `${PORT}` choisi, il doit être **identique** dans `.env`, `ecosystem.config.cjs` / NSSM, Nginx / IIS et le pare-feu. |
| **Ports externes exposés** | `80/tcp` (redirection HTTPS) et `443/tcp` (HTTPS via Nginx ou IIS) | `dms.nginx.conf:7-28` ; `deploy/ubuntu/dms.nginx.conf:17-36` ; `deploy/ubuntu/setup-system.sh:103-104` |
| **Port MongoDB** | `27017/tcp` strictement lié à `127.0.0.1` et bloqué de l'extérieur | `deploy/ubuntu/install-mongodb.sh:86` ; `deploy/ubuntu/setup-system.sh:107` ; `deploy/windows/install-prereqs.ps1:60` |
| **Nom de domaine ou IP** | Nom DNS interne/public ou IP fixe | **`DÉCISION DU PROPRIÉTAIRE`** (`server_name` Nginx, binding IIS, SAN certificat) |
| **HTTPS** | Auto-signé (intranet fermé, `deploy/ubuntu/scripts/gen-selfsigned-cert.sh`), autorité interne (PKI), ou Let's Encrypt (`dms.nginx.conf:33-34` si domaine public) | **`DÉCISION DU PROPRIÉTAIRE`** (obligatoire car `NODE_ENV=production` active `cookie.secure = true` dans `backend/controllers/auth/utils.js:17-19`) |

---

## 4. Liste des paquets et dépendances système selon l'architecture réelle

| Rôle dans le DMS | Preuve code (`fichier:ligne`) | Paquets Ubuntu Server | Composants Windows Server |
|---|---|---|---|
| **Runtime JS/TS** | `package.json:7,9` ; `deploy/scripts/check-env.mjs:48-56` | `nodejs` (`>= 22.x`), `pm2` (`npm i -g pm2`), `git`, `curl` (`setup-system.sh:44-88`) | `nodejs-lts` (`22.x`), `git`, `nssm` (`install-prereqs.ps1:42-43,71`) |
| **Compilation native IA (`node-llama-cpp`)** | `package.json:85` ; `backend/services/ollamaService.js:52` | `build-essential`, `cmake`, `pkg-config` (`setup-system.sh:50-52`) | `visualstudio2022buildtools` (workload `VCTools`), `cmake` (`install-prereqs.ps1:47-48`) |
| **Base de données & outils dump/restore** | `backend/config/db.js:58` ; `backupScheduler.js:17` ; `backup-all.sh:57` ; `restore-all.sh:130` | `mongodb-org`, `mongodb-database-tools` (`install-mongodb.sh:38`) — version **`[À CONFIRMER]`** | `mongodb`, `mongodb-database-tools` (`install-prereqs.ps1:52-53`) — version **`[À CONFIRMER]`** |
| **OCR & conversion PDF** | `backend/utils/ocrProcessor.js:49-52,119-121,301-303,493-496` | `tesseract-ocr`, `tesseract-ocr-ara`, `tesseract-ocr-fra`, `tesseract-ocr-eng` (opt.), `poppler-utils` (`pdftoppm`), `imagemagick` (`convert`, omis de `setup-system.sh` mais appelé avec repli) | `tesseract` (installer langues `ara` + `fra` + `eng` dans `tessdata`), `poppler` (`pdftoppm`), `imagemagick` (`magick`, optionnel avec repli, omis de `install-prereqs.ps1`) |
| **Numérisation physique (Scanner)** | `backend/utils/scanner/index.js:9-23` ; `linux/scannerDetection.js:22,89` ; `linux/pdfConverter.js:15-16` ; `windows/scannerDetection.js:19,60` | **SANE** : `sane-utils` (`scanimage`, `setup-system.sh:63`), `img2pdf` (optionnel, repli `pdfkit`) + pilotes scanner Linux | **WIA via PowerShell** : natif Windows (`New-Object -ComObject WIA.DeviceManager`, aucun paquet supplémentaire hors pilote WIA constructeur et service *Acquisition d'image Windows (WIA)* / `stisvc` actif) |
| **Reverse Proxy HTTPS** | `deploy/ubuntu/dms.nginx.conf` ; `deploy/windows/web.config` | `nginx`, `ufw`, `logrotate`, `openssl` (`setup-system.sh:53-54`, `gen-selfsigned-cert.sh:60`) | Rôle IIS (`Web-Server`, `Web-WebSockets`), modules **URL Rewrite 2.1** et **ARR 3.0** (`[FICHIER ABSENT]` dans `install-prereqs.ps1`) |
| **Redis / Bull** | `backend/jobs/ocrQueue.js` ; `package.json` | **NON REQUIS** (files non installées ni branchées dans `server.ts` / `backend/server.js`) | **NON REQUIS** |

---

## 5. Variables d'environnement (`.env`)

> **Important (`FAIT`)** : `server.ts:38-39` charge `backend/.env` en premier puis `.env` à la racine en fallback (`dotenv` ne remplace pas une variable déjà chargée), tandis que `deploy/ubuntu/deploy.sh:32`, `deploy/scripts/backup-all.sh:41` et `deploy/backup/backup-mongo.ps1:43` exigent `.env` **à la racine du projet**. Utilisez **un unique fichier `.env` à la racine** (et assurez-vous qu'aucun `backend/.env` divergent n'existe).

### 5.1 Génération des secrets (`JWT_SECRET` et mots de passe)
- **Ubuntu (Linux)** : `openssl rand -hex 48` (génère 96 caractères hexadécimaux, au-delà du minimum de 32 imposé par `deploy/scripts/check-env.mjs:37`).
- **Windows (PowerShell)** :
  ```powershell
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [System.BitConverter]::ToString($bytes).Replace('-', '').ToLower()
  ```

### 5.2 Tableau de référence des variables `.env`

| Nom de la variable | Obligatoire | Rôle dans le code (`fichier:ligne`) | Exemple factice (à adapter) |
|---|---|---|---|
| `NODE_ENV` | **Oui** | Active `dist/` (`server.ts:354-366`), rend `JWT_SECRET` bloquant (`server.ts:54`), active `cookie.secure=true` (`auth/utils.js:17`). | `production` |
| `PORT` | **Oui** | Port d'écoute Express (`server.ts:316`). Défaut code `3000` si absent/8080 ; **DÉCISION DU PROPRIÉTAIRE** (`${PORT}`). | `${PORT}` (ex. `5000`) |
| `MONGODB_URI` | **Oui** | Chaîne de connexion Mongoose (`backend/config/db.js:49`) et `mongodump` (`backupScheduler.js:16`). **`authSource` doit correspondre à la base où l'utilisateur est créé**. | `mongodb://dms_app_user:CHANGE_ME@127.0.0.1:27017/document-management?authSource=document-management` |
| `JWT_SECRET` | **Oui** | Clé de signature/vérification JWT (`server.ts:53`, `backend/middleware/auth.js:40`, `backend/sockets/index.js:19`). Obligatoire en prod, `>= 32` car. (`check-env.mjs:37`). | `CHANGE_ME_OPENSSL_RAND_HEX_96_CHARS` |
| `JWT_EXPIRE` | Recommandée | Durée de validité du JWT (`server.ts:63`, `User.js:113` ; défaut dangereux `30d`). | `8h` |
| `JWT_COOKIE_EXPIRE` | Recommandée | Durée du cookie HTTP-only en jours (`server.ts:64`, `auth/utils.js:8` ; défaut `30`). | `1` |
| `LLAMA_CHAT_MODEL_PATH` | Recommandée | Chemin absolu vers le modèle GGUF de chat (`backend/services/ollamaService.js:18`, `server.ts:324`). | `/opt/dms-models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` *(ou `C:\dms\models\...`)* |
| `LLAMA_EMBEDDING_MODEL_PATH` | Recommandée | Chemin absolu vers le modèle GGUF d'embedding (`backend/services/ollamaService.js:23`, `server.ts:325`). | `/opt/dms-models/bge-m3-q4_k_m.gguf` *(ou `C:\dms\models\...`)* |
| `LLAMA_THREADS` | Non | Cœurs CPU pour `node-llama-cpp` (`server.ts:42-46`, défaut `os.cpus().length / 2`). | `4` |
| `LLAMA_GPU_LAYERS` | Non | Couches déchargées sur GPU (`backend/services/ollamaService.js:28,86`, défaut `0` = CPU pur). | `0` |
| `DOCUMENT_PATH` | Attention | Utilisée en lecture (`fileController.js:43,86`), `check-env.mjs:148`, `backup-all.sh:67` ; **ignorée en écriture** (`documentHelper.js:62-70` écrit dans `backend/courrier`). Garder la valeur réelle `backend/courrier` tant que le code n'est pas unifié. | `/var/www/dms/backend/courrier` *(ou `C:\dms\backend\courrier`)* |
| `UPLOAD_DIR` | Attention | Utilisée par `handleScannedDocument` (`upload.js:145`), `check-env.mjs:149`, `backup-all.sh:68` (Multer écrit dans `backend/uploads`, `upload.js:6-9`). | `/var/www/dms/backend/uploads` *(ou `C:\dms\backend\uploads`)* |
| `UPLOAD_PATH` | Attention | Utilisée uniquement par le module scanner (`scannerConfig.js:11`, défaut `./uploads`). Aligner sur `UPLOAD_DIR` si scanner actif. | `/var/www/dms/backend/uploads` *(ou `C:\dms\backend\uploads`)* |
| **`BACKUP_DIR`** | **Oui (aligner)** | Utilisée par `backupScheduler.js:12`, `check-env.mjs:150`, `backup-all.sh:24`. **Doit avoir une valeur STRICTEMENT IDENTIQUE à `BACKUP_PATH` et `BACKUP_ROOT`.** | `/var/backups/dms` *(ou `C:\backups\dms`)* |
| **`BACKUP_PATH`** | **Oui (aligner)** | Utilisée par download/delete backup (`backend/controllers/backup.js:678,731`). **Valeur IDENTIQUE imposée à `BACKUP_DIR` et `BACKUP_ROOT`.** | `/var/backups/dms` *(ou `C:\backups\dms`)* |
| **`BACKUP_ROOT`** | **Oui (aligner)** | Utilisée par `scripts/backup-mongo.sh:13`. **Valeur IDENTIQUE imposée à `BACKUP_DIR` et `BACKUP_PATH`.** | `/var/backups/dms` *(ou `C:\backups\dms`)* |
| `SCANNER_ENABLED` | Non | Active le scanner serveur (`scannerConfig.js:15`). | `false` |
| `SCANNER_DEVICE_ID` | Non | Identifiant SANE (`scanimage -L`) ou WIA (`scannerConfig.js:16`). | *(vide si désactivé)* |
| `SCANNER_RESOLUTION` | Non | Résolution DPI du scan (`scannerConfig.js:17`, défaut `300`). | `300` |
| `SCANNER_FORMAT` | Non | Format cible `pdf`, `jpeg` ou `png` (`scannerConfig.js:18`, défaut `pdf`). | `pdf` |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | Non | Proxy sortant pour `scripts/download-models.js:39-43` (et système). | *(vide si accès direct)* |
| `VITE_API_URL` | Non | URL de base API compilée dans le bundle Vite (`src/services/apiService.ts:4`, défaut `/api`). Laisser vide en prod derrière reverse proxy même origine. | *(vide)* |
| `ALLOWED_ORIGINS` | **Non (ineffective)** | Présente dans `.env.production.example:44` — **ignorée par `server.ts`** (`server.ts:154` utilise `origin: true` et `121` `origin: '*'`). Ne protège pas en l'état. | `https://CHANGE_ME_DOMAIN` *(documentaire uniquement)* |
| `AI_WARMUP` | **Non (ineffective)** | Présente dans `.env.production.example:81` — **ignorée par `server.ts`** (`server.ts:67-80` précharge toujours après 5s). | `true` *(ignorée)* |
| `INDEX_RETRY_CRON` | **Non (ineffective)** | Lue dans `indexRetryScheduler.js:239`, mais **ignorée par `server.ts`** car `startIndexRetryScheduler()` n'y est pas appelé (seulement dans `backend/server.js:323`). | `0 2 * * *` *(ignorée)* |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | **Non (code mort)** | Référencées uniquement dans `backend/jobs/ocrQueue.js:6-8` (non branché). | *(ne pas définir)* |

---

## 6. Préparation applicative commune (`[NON TESTÉ EN RÉEL]`)

> Les étapes ci-dessous sont communes aux deux OS (chemins et syntaxe adaptés ensuite dans les parties Ubuntu 3/4 et Windows 4/4).

### 6.1 Récupération du code source
- **`[NON TESTÉ EN RÉEL]`** Cloner le dépôt (ou copier l'archive validée) dans le répertoire applicatif cible (ex. `/var/www/dms` sous Ubuntu ou `C:\dms` sous Windows) sous un compte non privilégié dédié.
- Vérifier que le dossier de travail racine contient `package.json`, `server.ts`, `backend/`, `deploy/` et `scripts/`.

### 6.2 Installation des dépendances (`npm ci` — Attention `package-lock.json`)
- **`FAIT` (anomalie dépôt)** : `deploy/ubuntu/deploy.sh:54` et `deploy/windows/install-prereqs.ps1:81` préconisent `npm ci`, mais **le dépôt actuel contient `bun.lock` et aucun `package-lock.json`** (`list_dir` racine). Sans `package-lock.json`, `npm ci` échoue immédiatement (`npm error The npm ci command can only be used when your project has a package-lock.json`).
- **`[NON TESTÉ EN RÉEL]`** Procédure :
  1. Exécuter à la racine :
     ```bash
     npm ci
     ```
     *(Note : `package.json:18` déclenche automatiquement `"postinstall": "node scripts/check-os.js"` qui crée `backend/uploads/{usersphoto,personnelphoto,documents,backups}`).*
  2. Si `package-lock.json` est absent du dépôt source, générer d'abord le verrouillage avec l'accord du propriétaire (`npm install --package-lock-only` puis `npm ci`) ou utiliser `npm install --no-audit` selon la politique d'exploitation.
  3. **Ne pas exécuter `npm install` dans `backend/`** afin d'éviter d'installer une copie concurrente de `mongoose ^8.0.0` (`backend/package.json:21`) face au `mongoose ^9.10.2` racine (`package.json:81`).
  4. Vérifier que la compilation native de `node-llama-cpp` (`package.json:85`) s'est terminée sans erreur C++ / CMake.

### 6.3 Compilation du frontend (`dist/`)
- **`[NON TESTÉ EN RÉEL]`** Exécuter à la racine (`package.json:11`) :
  ```bash
  npm run build
  ```
- **Résultat attendu** : génération du dossier `dist/` contenant `index.html` et `dist/assets/` (sans dépendance CDN externe).

### 6.4 Vérification de la commande de démarrage (`npm start` vs `tsx`)
- **`FAIT`** : `package.json:9` définit `"start": "node server.ts"`, mais `server.ts` contient du typage TypeScript (`server.ts:34,183,250`), alors que `ecosystem.config.cjs:27` et `deploy/windows/install-service.ps1:55-62` démarrent avec `tsx` (`./node_modules/.bin/tsx server.ts`).
- **`[À VÉRIFIER]`** Tester manuellement sur le serveur cible avant d'envisager `npm start` :
  ```bash
  NODE_ENV=production PORT=${PORT} node server.ts
  ```
- **Recommandation** : **utiliser `tsx` (`./node_modules/.bin/tsx server.ts` ou `node_modules\.bin\tsx.cmd server.ts`) tant que `node server.ts` n'est pas prouvé fonctionnel en production sur la version exacte de Node 22 cible.**

### 6.5 Téléchargement et vérification des modèles IA (`.gguf`)
- **`[NON TESTÉ EN RÉEL]`** Télécharger les deux modèles via le script officiel (`package.json:20`, `scripts/download-models.js:46-68`) :
  ```bash
  npm run download-models
  ```
  - Télécharge par défaut dans `./models/` (`scripts/download-models.js:33`) via `curl -L -C -` (gère `HTTPS_PROXY`/`HTTP_PROXY`) :
    - `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` (`~4.26 Go`, min `3.0 Go`)
    - `bge-m3-q4_k_m.gguf` (`~417 Mo`, min `300 Mo`)
  - *(Optionnel pour environnement hors-ligne / air-gapped)* : copier manuellement les `.gguf` vérifiés vers le dossier cible (`LLAMA_CHAT_MODEL_PATH` et `LLAMA_EMBEDDING_MODEL_PATH`, ex. `/opt/dms-models/` ou `<projet>/models/`) et vérifier leurs empreintes.
- Contrôler la détection des modèles avec `npm run check-models` (`package.json:21`, `backend/scripts/checkModelPath.js:107-141`).

### 6.6 Création du premier SuperAdmin
- **`[FICHIER ABSENT]`** : il n'existe **aucun** script d'initialisation interactif sécurisé ni route de premier enregistrement (`setup`) permettant de créer un premier compte `Admin` avec mot de passe saisi ou généré proprement.
- **`FAIT` (rappel bloquant)** : le code actuel crée automatiquement un compte `Admin` avec mot de passe par défaut dans `backend/config/db.js:8-45,67` au premier branchement MongoDB, et `backend/controllers/auth/loginController.js:50-68` accepte ce mot de passe par défaut en mode dégradé. **Cette méthode ne doit jamais être présentée ni utilisée comme procédure de mise en production.** Une procédure sécurisée de bootstrap SuperAdmin doit être ajoutée et prouvée avant exposition réseau.

---

# PARTIE 3/4 : DÉPLOIEMENT SUR UBUNTU SERVER (`[NON TESTÉ EN RÉEL]`)

> **Statut global de la Partie 3/4** : **`[NON TESTÉ EN RÉEL]`** (aucune commande n'a été exécutée sur un serveur Ubuntu cible).  
> **Ordre suivi** : ordre réel des scripts et fichiers fournis dans `deploy/ubuntu/`, adapté pour respecter `${PORT}` (`DÉCISION DU PROPRIÉTAIRE`), corriger les anomalies détectées dans les scripts existants et rappeler les prérequis manquants sans modifier aucun fichier du dépôt.  
> **Rappel sécurité bloquant** : exécuter cette procédure uniquement sur une machine isolée de recette/préproduction tant que `SEC-01`..`SEC-12` (`docs/ARCHITECTURE_DMS.md` section 0) ne sont pas corrigés et prouvés.

---

## Étape 3.1 — Initialisation système, paquets OS, compte `dms`, Node 22, PM2 et UFW (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/ubuntu/setup-system.sh:1-114` (et écarts observés vs `deploy/ubuntu/README_DEPLOY_UBUNTU.md:25-26`, `backend/utils/ocrProcessor.js:49-52,119-121,493-496`).
- **Ce que fait réellement le script (`FAIT`)** :
  - Configure le fuseau horaire `Africa/Tunis` (`setup-system.sh:33`), met à jour APT (`:39-40`).
  - Installe : `ca-certificates curl gnupg lsb-release git build-essential cmake pkg-config nginx ufw` (`:44-54`), plus `tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra poppler-utils sane-utils` (`:58-63`).
  - Crée l'utilisateur système `dms` avec `/var/www/dms` et `/bin/bash` (`:70`).
  - Installe Node.js `22.x` via NodeSource (`:76-82`) et `pm2` en global (`:87`).
  - Crée `/var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}` avec `chown -R dms:dms` (`:93-96`).
  - Active UFW (`default deny incoming`, autorise `22/tcp`, `80/tcp`, `443/tcp`, refuse `3000/tcp` et `27017/tcp`, `:100-108`).
- **Anomalies / points à traiter manuellement (`FAIT`)** :
  1. **`ufw deny 3000` (`setup-system.sh:106`)** : le script bloque explicitement `3000/tcp`. Si `${PORT}` choisi par le propriétaire est différent (ex. `5000`), bloquer aussi `${PORT}/tcp` dans UFW (et supprimer la règle erronée si inutile) pour empêcher tout accès HTTP direct à Express hors Nginx.
  2. **Répertoire `/var/backups/dms` non créé par `setup-system.sh`** : `setup-system.sh:93` crée `/var/www/dms/backups`, alors que `.env.production.example:62` (`BACKUP_DIR=/var/backups/dms`), `deploy/ubuntu/systemd/dms-backup.service:10` (`backup-all.sh /var/backups/dms 14`) et `scripts/backup-mongo.sh:13` utilisent `/var/backups/dms`. Le compte `dms` n'a pas les droits pour créer `/var/backups/dms` lui-même sous `/var/backups` : il faut le créer en `root`.
  3. **Paquets optionnels absents de `setup-system.sh:58-63`** : `tesseract-ocr-eng` (demandé par défaut dans `ocrProcessor.js:49` via `'ara+fra+eng'`), `imagemagick` (`convert` appelé par `ocrProcessor.js:301` avec repli), `img2pdf` (`linux/pdfConverter.js:15` avec repli `pdfkit`) et `logrotate` (nécessaire pour `deploy/ubuntu/logrotate/dms`).
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # Depuis le répertoire contenant le dépôt copié (ou après copie du script)
  sudo bash deploy/ubuntu/setup-system.sh
  # Source : deploy/ubuntu/setup-system.sh:20-113

  # Compléments indispensables non couverts par setup-system.sh :
  # 1) Bloquer aussi le port applicatif retenu ${PORT} si différent de 3000 (anomalie setup-system.sh:106)
  sudo ufw deny ${PORT}/tcp comment 'Block direct DMS Express access'

  # 2) Créer /var/backups/dms absent de setup-system.sh:93 (requis par dms-backup.service:10 et .env.production.example:62)
  sudo mkdir -p /var/backups/dms
  sudo chown -R dms:dms /var/backups/dms
  sudo chmod 750 /var/backups/dms

  # 3) Compléter les paquets OCR/PDF/logrotate et scanner si nécessaire (ocrProcessor.js:49,301 ; linux/pdfConverter.js:15)
  sudo apt-get install -y tesseract-ocr-eng imagemagick logrotate
  ```
- **Résultat attendu** : compte `dms` créé, Node.js `>= 22.x`, `pm2`, Nginx, UFW actif (`22`, `80`, `443` ouverts ; `${PORT}` et `27017` bloqués), `/var/www/dms` et `/var/backups/dms` détenus par `dms:dms`.
- **Vérification** :
  ```bash
  id dms && node -v && npm -v && pm2 -v
  tesseract --list-langs
  command -v pdftoppm && command -v scanimage
  sudo ufw status verbose
  ls -ld /var/www/dms /var/backups/dms
  ```
  - *(Si scanner physique USB/réseau prévu : tester ensuite `sudo -u dms scanimage -L` ; si le scanner n'apparaît pas sous `dms`, vérifier l'appartenance aux groupes `scanner`/`lp` sur `/dev/bus/usb` — `[NON VÉRIFIÉ]` selon modèle matériel).*
- **Si ça échoue** :
  - **Conflit APT / dépôt NodeSource** : vérifier la connectivité HTTPS/proxy (`/etc/apt/apt.conf.d/`) et la sortie de `sudo apt-get update`.
  - **Coupure SSH après `ufw --force enable` (`setup-system.sh:108`)** : vérifier depuis la console hyperviseur/IPMI que `22/tcp` est autorisé avant toute reconnexion.
  - **Node `< 22.x` déjà installé** : purger l'ancien paquet `nodejs` et relancer l'étape `nodesource` (`setup-system.sh:76-82`).

---

## Étape 3.2 — Installation et sécurisation de MongoDB (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/ubuntu/install-mongodb.sh:1-110`.
- **Conflits et réserves critiques à connaître avant d'exécuter (`FAIT`)** :
  1. **Version de MongoDB à installer : `[À CONFIRMER]`**  
     `install-mongodb.sh:31-35` pointe vers `https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0`. Selon la version exacte d'Ubuntu retenue (`22.04 jammy` vs `24.04 noble`) et la matrice de compatibilité officielle de **`mongoose ^9.10.2`** (chargé par `server.ts:19` -> `backend/config/db.js:2`, cf. Partie 2 section 2.3), confirmer avant exécution si MongoDB `7.0` (ou `8.0`) dispose du paquet officiel pour `$(lsb_release -cs)` et est supporté par la version exacte de `mongoose` installée par `npm ls mongoose`.
  2. **CONFLIT CRITIQUE `authSource` (`install-mongodb.sh:71-78` vs `:107`)** :
     - Aux lignes `71-78`, le script exécute `use document-management;` et crée `dms_app_user` **dans la base `document-management`**.
     - À la ligne `107` (ainsi que dans `.env.production.example:23`), il affiche à tort `?authSource=admin`.
     - Or MongoDB vérifie les identifiants dans la base désignée par `authSource`. Avec l'utilisateur créé selon `install-mongodb.sh:71-78`, **`MONGODB_URI` DOIT contenir `?authSource=document-management`** (sauf si le propriétaire préfère créer l'utilisateur dans `admin` avec rôle sur `document-management`).
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # Préparer deux mots de passe forts (ex: openssl rand -hex 24) pour admin_dms et dms_app_user
  sudo bash deploy/ubuntu/install-mongodb.sh
  # Source : deploy/ubuntu/install-mongodb.sh:29-103
  ```
- **Résultat attendu** : paquets `mongodb-org` et `mongodb-database-tools` (`mongodump`, `mongorestore`) installés (`:38`), service `mongod` actif au démarrage (`:42-43`), écoute liée exclusivement sur `127.0.0.1` (`:86`), `security.authorization: enabled` dans `/etc/mongod.conf` (`:88-97`), utilisateurs `admin_dms` (sur `admin`, `:62-69`) et `dms_app_user` (sur `document-management`, `:71-78`) créés.
- **Vérification** :
  ```bash
  sudo systemctl status mongod --no-pager
  ss -ltnp | grep 27017
  mongodump --version && mongorestore --version
  # Test d'authentification cohérent avec install-mongodb.sh:71-78 (remplacer le mot de passe au prompt -p) :
  mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" -p --eval "db.runCommand({ connectionStatus: 1 })"
  ```
  - Attendu : `ss` affiche uniquement `127.0.0.1:27017` (jamais `0.0.0.0:27017`), et `mongosh` retourne `{ ok: 1 }` avec `authenticatedUsers: [ { user: 'dms_app_user', db: 'document-management' } ]`.
- **Si ça échoue** :
  - **Dépôt `404` sous Ubuntu 24.04 (`noble`)** : MongoDB 7.0 ne publie pas pour `noble` sur certains miroirs ; vérifier la compatibilité `mongoose ^9.10.2` (`npm ls mongoose`) + version MongoDB officielle pour la distribution cible (`[À CONFIRMER]`).
  - **`AuthenticationFailed` lors de la connexion** : vérifier que l'`authSource` de `MONGODB_URI` correspond exactement à la base où `dms_app_user` a été créé (`document-management` par `install-mongodb.sh:71-78`, et non `admin` comme imprimé par `:107`).
  - **`mongod` refuse de redémarrer après édition de `/etc/mongod.conf`** : vérifier la syntaxe YAML d'indentation (`  authorization: enabled`) dans `/etc/mongod.conf` (l'insertion `sed` à `:96` peut mal indenter si `security:` existait déjà) et lire `sudo journalctl -u mongod -n 50 --no-pager`.

---

## Étape 3.3 — Déploiement du code source, `npm ci`, `.env` et contrôle `check-env.mjs` (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/ubuntu/deploy.sh:31-58`, `package.json:9-21,81`, `.env.production.example:1-102`, `deploy/scripts/check-env.mjs:25-209`.
- **Règles impératives constatées dans le dépôt (`FAIT`)** :
  1. **`package-lock.json` obligatoire pour `npm ci` vs `bun.lock` doublon** :  
     `deploy/ubuntu/deploy.sh:54` exécute `npm ci`. Or **`npm ci` exige la présence de `package-lock.json`** (actuellement absent du dépôt racine, qui contient un doublon **`bun.lock`**).  
     - **Ne pas utiliser `bun.lock`** en exploitation Node/NPM/PM2.  
     - Copier `package-lock.json` avec les sources du projet (ou le générer **une fois** avant `npm ci` via `npm install --package-lock-only` sur la machine de préparation/recette validée, puis le versionner).
  2. **Ne jamais exécuter `npm install` dans `backend/`** : conserve la résolution unique sur `mongoose ^9.10.2` racine (`package.json:81`) au lieu de `backend/package.json:21` (`^8.0.0`).
  3. **Anomalie `deploy.sh` / `check-env.mjs` (`.env` non chargé)** :  
     `deploy/ubuntu/deploy.sh:38` appelle `node "${APP_DIR}/deploy/scripts/check-env.mjs"`, mais **`deploy.sh` ne charge pas `.env`** dans le shell et **`check-env.mjs` n'importe pas `dotenv`**. Sans export préalable (`set -a; source .env; set +a` ou `node --env-file=.env`), `check-env.mjs` affiche `NODE_ENV: NON DÉFINI` et échoue.
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # 1) Copier / cloner les sources validées dans /var/www/dms sous l'utilisateur dms
  sudo chown -R dms:dms /var/www/dms
  sudo -u dms -H bash -c '
    cd /var/www/dms
    # Vérifier que package-lock.json est présent (ou le générer une seule fois avant npm ci) ; ne pas utiliser bun.lock :
    test -f package-lock.json || npm install --package-lock-only
    npm ci
    npm ls mongoose
  '
  # Sources : deploy/ubuntu/deploy.sh:54 ; package.json:18,81

  # 2) Créer .env à la racine (unique fichier .env) et restreindre les droits
  sudo -u dms cp /var/www/dms/.env.production.example /var/www/dms/.env
  sudo chmod 600 /var/www/dms/.env
  sudo chown dms:dms /var/www/dms/.env
  # Sources : .env.production.example:5-7 ; server.ts:38-39
  ```
  - Éditer `/var/www/dms/.env` (en tant que `dms`) avec les valeurs suivantes :
    - `NODE_ENV=production`
    - `PORT=${PORT}` *(décision du propriétaire ; doit correspondre à `ecosystem.config.cjs:42`, Nginx et UFW)*
    - `MONGODB_URI=mongodb://dms_app_user:<MOT_DE_PASSE_FORT>@127.0.0.1:27017/document-management?authSource=document-management` *(cohérent avec `install-mongodb.sh:71-78`)*
    - `JWT_SECRET=<sortie de openssl rand -hex 48>`
    - `JWT_EXPIRE=8h` et `JWT_COOKIE_EXPIRE=1`
    - `DOCUMENT_PATH=/var/www/dms/backend/courrier`
    - `UPLOAD_DIR=/var/www/dms/backend/uploads`
    - `UPLOAD_PATH=/var/www/dms/backend/uploads` *(ajouté si scanner actif, `scannerConfig.js:11`)*
    - **`BACKUP_DIR=/var/backups/dms`**, **`BACKUP_PATH=/var/backups/dms`**, **`BACKUP_ROOT=/var/backups/dms`** *(valeur strictement identique imposée)*
    - `LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf`
    - `LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf`
    - *(Rappel : `ALLOWED_ORIGINS`, `AI_WARMUP`, `INDEX_RETRY_CRON` sont ignorées par `server.ts` — cf. Partie 2 section 5.2).*
  - Lancer le contrôle d'environnement **en chargeant `.env`** (contournement du manque de chargement dans `deploy.sh:38`) :
    ```bash
    sudo -u dms -H bash -c '
      cd /var/www/dms
      node --env-file=.env deploy/scripts/check-env.mjs
    '
    # Source : deploy/scripts/check-env.mjs:1-209 ; deploy/ubuntu/deploy.sh:38
    ```
- **Résultat attendu** : `npm ci` installe les paquets + `tsx` et compile `node-llama-cpp` ; `npm ls mongoose` n'affiche que la branche racine (`^9.10.2`) ; `check-env.mjs` retourne code `0` (sauf avertissement éventuel si les modèles `.gguf` ne sont pas encore téléchargés ou si `${PORT}` ≠ `5000`, `check-env.mjs:71-73`).
- **Vérification** :
  ```bash
  ls -la /var/www/dms/.env
  ls -la /var/www/dms/node_modules/.bin/tsx
  sudo -u dms -H bash -c 'cd /var/www/dms && npm ls mongoose'
  ```
- **Si ça échoue** :
  - **`npm ci` échoue faute de `package-lock.json`** : vérifier qu'il a bien été copié avec le projet ou généré une fois par `npm install --package-lock-only` ; ignorer `bun.lock`.
  - **Échec compilation native `node-llama-cpp`** : vérifier `cmake --version`, `g++ --version` (`setup-system.sh:50-52`) et l'espace disque/RAM disponible.
  - **`check-env.mjs` sort en erreur (`exit 1`)** : vérifier `JWT_SECRET` (`>= 32` car., hors liste interdite `check-env.mjs:26-35`), absence de `CHANGE_ME` dans `MONGODB_URI`, droits d'écriture de `dms` sur `DOCUMENT_PATH`, `UPLOAD_DIR` et `BACKUP_DIR` (`/var/backups/dms`).

---

## Étape 3.4 — Modèles IA GGUF, compilation frontend (`dist/`) et premier SuperAdmin (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `package.json:11,20-21`, `scripts/download-models.js:33-68`, `backend/scripts/checkModelPath.js:107-141`.
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  sudo -u dms -H bash -c '
    cd /var/www/dms
    set -a && source .env && set +a
    npm run download-models
    npm run check-models
    npm run build
    node --env-file=.env deploy/scripts/check-env.mjs
  '
  # Sources : package.json:11,20-21 ; scripts/download-models.js:46-68 ; checkModelPath.js:107-141
  ```
  *(Si le serveur n'a pas accès Internet sortant, copier les deux fichiers `.gguf` vérifiés dans `/var/www/dms/models/` avec propriétaire `dms:dms` au lieu d'exécuter `npm run download-models`, puis lancer `npm run check-models`.)*
- **Premier SuperAdmin** : **`[FICHIER ABSENT]`** — aucune commande existante ne permet de créer un premier SuperAdmin de façon sécurisée (ne jamais utiliser `admin / Admin123!`, cf. Partie 2 section 6.6).
- **Résultat attendu** : les deux `.gguf` présents et valides (`~4.26 Go` + `~417 Mo`), `/var/www/dms/dist/index.html` généré par `vite build`, et `check-env.mjs` sort `0` sans avertissement sur les modèles.
- **Vérification** :
  ```bash
  ls -lh /var/www/dms/models/*.gguf
  ls -la /var/www/dms/dist/index.html
  ```
- **Si ça échoue** :
  - **Échec téléchargement `curl` (`scripts/download-models.js:39-43`)** : renseigner `HTTPS_PROXY`/`HTTP_PROXY` dans `.env` ou transférer les `.gguf` hors-ligne par `scp`.
  - **Échec `npm run build` par manque mémoire** : vérifier la RAM libre (`free -h`) ; ajouter temporairement un fichier swap si < 4 Go disponibles au build Vite.

---

## Étape 3.5 — Mise sous supervision PM2 (`ecosystem.config.cjs`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `ecosystem.config.cjs:1-52`, `package.json:9`, `deploy/ubuntu/deploy.sh:61-69`, `deploy/ubuntu/README_DEPLOY_UBUNTU.md:113-119`.
- **Points critiques (`FAIT`)** :
  - `ecosystem.config.cjs:26-31` lance **`server.ts`** avec l'interpréteur **`./node_modules/.bin/tsx`**, `exec_mode: 'fork'`, `instances: 1` (obligatoire pour ne pas dupliquer ~5 Go de modèles GGUF en RAM), `max_memory_restart: '6G'`.
  - **Port hardcodé dans `ecosystem.config.cjs:42`** : le bloc `env` contient `PORT: 5000`. PM2 injecte ce bloc `env` avant que `dotenv` (`server.ts:38-39`) ne charge `.env` ; comme `dotenv` n'écrase pas une variable déjà présente dans `process.env`, **`ecosystem.config.cjs:42` écrase `PORT` du `.env`**. Si le propriétaire choisit un `${PORT}` ≠ `5000`, il doit aligner `ecosystem.config.cjs:42` (ou y supprimer `PORT` pour laisser `.env` décider).
  - Journaux écrits dans `./logs/err.log` et `./logs/out.log` (`/var/www/dms/logs/err.log` et `out.log`, `ecosystem.config.cjs:45-46`).
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # Test préalable de la commande de démarrage (tsx vs npm start "node server.ts" à vérifier) :
  sudo -u dms -H bash -c '
    cd /var/www/dms
    pm2 start ecosystem.config.cjs
    pm2 save
  '
  # Enregistrer le démarrage automatique au reboot pour l'utilisateur dms :
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u dms --hp /var/www/dms
  # Sources : ecosystem.config.cjs:22-50 ; deploy/ubuntu/deploy.sh:67-69 ; deploy/ubuntu/README_DEPLOY_UBUNTU.md:119
  ```
- **Résultat attendu** : processus `dms-backend` à l'état `online` sous PM2, à l'écoute sur `0.0.0.0:${PORT}` (`server.ts:376`), service `pm2-dms.service` activé sous systemd.
- **Vérification** :
  ```bash
  sudo -u dms -H pm2 status
  sudo -u dms -H pm2 logs dms-backend --lines 30 --nostream
  ss -ltnp | grep ":${PORT}\b"
  curl -sf "http://127.0.0.1:${PORT}/api/health"
  ```
- **Si ça échoue** :
  - **Boucle de redémarrage (`errored` / `restart` > 0)** : consulter `/var/www/dms/logs/err.log` ; causes typiques : `NODE_ENV=production` sans `JWT_SECRET` (`server.ts:54-56`), échec connexion MongoDB (`authSource` ou service `mongod` arrêté), ou manque RAM pour préchargement GGUF (`server.ts:67-80`).
  - **Port occupé (`EADDRINUSE`)** : vérifier via `ss -ltnp` qu'aucun autre service n'écoute sur `${PORT}` et qu'aucun vieux processus `node`/`tsx` ne tourne hors PM2.

---

## Étape 3.6 — Certificats TLS et Reverse Proxy Nginx (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/ubuntu/scripts/gen-selfsigned-cert.sh:1-73`, `deploy/ubuntu/dms.nginx.conf:1-147`, `dms.nginx.conf:1-147`, `deploy/ubuntu/README_DEPLOY_UBUNTU.md:133-151`.
- **Option TLS (`DÉCISION DU PROPRIÉTAIRE`)** :
  1. **Intranet sans domaine public (auto-signé)** : `deploy/ubuntu/scripts/gen-selfsigned-cert.sh` génère `/etc/ssl/certs/dms-selfsigned.crt` et `/etc/ssl/private/dms-selfsigned.key` (`rsa:4096`, SAN DNS + IP, `:21-68`).
     - **OBLIGATION POSTES CLIENTS** : **le certificat auto-signé (`/etc/ssl/certs/dms-selfsigned.crt`) doit être exporté et installé dans le magasin *Autorités de certification racines de confiance* de chaque poste client** (et navigateur Firefox si magasin séparé), faute de quoi les navigateurs bloqueront ou alerteront sur HTTPS, WebSockets (`wss://`) et cookies `Secure`.
  2. **Domaine public avec Let's Encrypt** : Certbot (`deploy/ubuntu/README_DEPLOY_UBUNTU.md:25,144`) + modèle `dms.nginx.conf:33-34` (hors script automatisé dans `deploy/ubuntu/`).
- **Choix et points d'attention sur la configuration Nginx (`FAIT`)** :
  - Deux configurations Nginx existent (`deploy/ubuntu/dms.nginx.conf` pour auto-signé + `/api-docs`, vs `dms.nginx.conf` racine pour Let's Encrypt sans `/api-docs` ; ignorer `nginx/default.conf` qui est pour Docker).
  - Les deux hardcodent `http://127.0.0.1:5000` (`deploy/ubuntu/dms.nginx.conf:72,82,93,113,129` ; `dms.nginx.conf:89,109,129`) : **remplacer `5000` par `${PORT}`** et `dms.local` / `your-domain.com` par le domaine/IP décidé par le propriétaire.
  - **Règle sécurité impérative (`FAIT`)** : `/courrier/` et `/uploads/` **ne doivent JAMAIS** être servis via `root` ou `alias` Nginx ; ils doivent toujours être proxyfiés vers Node (`proxy_pass http://127.0.0.1:${PORT}`).
  - **Piège Nginx détecté dans `deploy/ubuntu/dms.nginx.conf:71,81,141` (`FAIT`)** : la règle de cache `location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$` (`:141`) est une expression régulière sans modificateur `^~` sur `location /courrier/` (`:71`) et `location /uploads/` (`:81`). Or, sous Nginx, une règle regex (`~*`) **l'emporte** sur un préfixe simple (`/uploads/`), ce qui ferait chercher `/uploads/usersphoto/*.png` dans `root /var/www/dms/dist` (404) au lieu de les transmettre à Express ! Avant mise en service, vérifier/adapter avec `location ^~ /courrier/` et `location ^~ /uploads/` (ou utiliser la forme `location /assets/` de `dms.nginx.conf:79-83`).
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # A) Si certificat auto-signé choisi :
  sudo bash deploy/ubuntu/scripts/gen-selfsigned-cert.sh "<VOTRE_IP_OU_DOMAINE>"
  # Source : deploy/ubuntu/scripts/gen-selfsigned-cert.sh:13,18-73

  # B) Copier la configuration Nginx (adapter server_name, chemins SSL et ${PORT}, plus ^~ sur /courrier/ et /uploads/) :
  sudo cp /var/www/dms/deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.nginx.conf
  sudo nano /etc/nginx/sites-available/dms.nginx.conf
  sudo ln -sf /etc/nginx/sites-available/dms.nginx.conf /etc/nginx/sites-enabled/dms.nginx.conf
  sudo rm -f /etc/nginx/sites-enabled/default
  # Sources : deploy/ubuntu/dms.nginx.conf:1-147 ; deploy/ubuntu/README_DEPLOY_UBUNTU.md:134-150

  sudo nginx -t
  sudo systemctl reload nginx
  sudo systemctl enable nginx
  ```
- **Résultat attendu** : `nginx -t` affiche `syntax is ok` et `test is successful` ; Nginx écoute sur `80` (redirection 301 -> HTTPS) et `443` et proxyfie `/api/`, `/socket.io/`, `/courrier/`, `/uploads/` vers `127.0.0.1:${PORT}`.
- **Vérification** :
  ```bash
  sudo nginx -t
  ss -ltnp | grep -E ':(80|443)\b'
  curl -skI "https://127.0.0.1/api/health" -H "Host: <VOTRE_IP_OU_DOMAINE>"
  # Vérifier que le backend direct est bien bloqué de l'extérieur :
  sudo ufw status | grep -E "(${PORT}|27017)"
  ```
- **Si ça échoue** :
  - **`nginx -t` échoue sur `ssl_certificate`** : vérifier les droits et chemins exacts `/etc/ssl/certs/dms-selfsigned.crt` et `/etc/ssl/private/dms-selfsigned.key` (`gen-selfsigned-cert.sh:21-22`).
  - **HTTP `502 Bad Gateway`** : le processus PM2 `dms-backend` est arrêté ou écoute sur un autre port que `${PORT}` configuré dans `proxy_pass` Nginx.
  - **Images `/uploads/*.png` retournent `404` HTML/Nginx au lieu de passer par Express** : le bloc regex de `deploy/ubuntu/dms.nginx.conf:141` intercepte l'URL avant `location /uploads/` (`:81`) — ajouter `^~` (`location ^~ /uploads/` et `location ^~ /courrier/`).

---

## Étape 3.7 — Rotation des journaux (`logrotate`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/ubuntu/logrotate/dms:1-15`.
- **Point d'attention chemin logrotate vs journaux PM2 (`FAIT`)** :
  - `deploy/ubuntu/logrotate/dms:1` cible `/var/www/dms/logs/*.log /var/www/dms/logs/*.err` avec `create 0640 dms dms` (`:8`) et `su - dms -c "pm2 reloadLogs"` (`:12`).
  - Cela couvre les logs applicatifs PM2 configurés dans `ecosystem.config.cjs:45-46` (`./logs/err.log`, `./logs/out.log` -> `/var/www/dms/logs/err.log`, `out.log`) et les logs de sauvegarde `dms-backup.service:11-12` (`backup.log`, `backup.err`).
  - **En revanche**, cela **ne couvre pas** le journal propre du démon PM2 (`~dms/.pm2/pm2.log`, soit `/var/www/dms/.pm2/pm2.log`) si PM2 utilise son répertoire par défaut ; pour ce dernier, soit installer `pm2-logrotate` (non installé par défaut), soit surveiller `/var/www/dms/.pm2/`. De plus, sur Ubuntu récent, comme `/var/www/dms/logs` appartient à `dms:dms` (`setup-system.sh:94`), `logrotate` refuse parfois une rotation sans directive `su dms dms` dans `/etc/logrotate.d/dms`.
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  sudo cp /var/www/dms/deploy/ubuntu/logrotate/dms /etc/logrotate.d/dms
  sudo chown root:root /etc/logrotate.d/dms
  sudo chmod 644 /etc/logrotate.d/dms
  # Source : deploy/ubuntu/logrotate/dms:1-15
  ```
- **Résultat attendu** : configuration installée et valide sans erreur de permissions parent/utilisateur.
- **Vérification** :
  ```bash
  sudo logrotate -d /etc/logrotate.d/dms
  ```
- **Si ça échoue** :
  - **Erreur `skipping ... because parent directory has insecure permissions (It's world writable or writable by group ...)`** : ajouter `su dms dms` en haut du bloc dans `/etc/logrotate.d/dms` (`logrotate/dms:1-2`).

---

## Étape 3.8 — Sauvegardes automatiques (`systemd`) et test de restauration (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/ubuntu/systemd/dms-backup.service:1-16`, `deploy/ubuntu/systemd/dms-backup.timer:1-13`, `deploy/scripts/backup-all.sh:1-148`, `deploy/scripts/restore-all.sh:1-178`.
- **Recommandation de script (`FAIT`)** : privilégier **`deploy/scripts/backup-all.sh`** piloté par `systemd` (`dms-backup.service` + `dms-backup.timer` à `02:00`), qui sauvegarde ensemble le dump MongoDB (`mongodump`), `courrier/`, `uploads/` et le manifeste SHA256 des `.gguf`, et extrait `MONGODB_URI` directement depuis `.env` (`backup-all.sh:40-43`). *(Les doublons `deploy/backup/backup-mongo.sh` et `scripts/backup-mongo.sh` ont des chemins/bases par défaut divergents ; vérifier que `/var/backups/dms` existe bien — créé à l'étape 3.1 car omis par `setup-system.sh:93` — et que `BACKUP_DIR = BACKUP_PATH = BACKUP_ROOT = /var/backups/dms`).*
  *(Note `backup-all.sh:67-68` : si `DOCUMENT_PATH`/`UPLOAD_DIR` sont personnalisés hors `backend/courrier` et `backend/uploads`, exporter `.env` ou utiliser les chemins par défaut `/var/www/dms/backend/courrier` et `/var/www/dms/backend/uploads` ; `dms-backup.service` n'a pas de directive `EnvironmentFile=/var/www/dms/.env`, seule `MONGODB_URI` est lue par `grep` dans `backup-all.sh:42`.)*
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.service /etc/systemd/system/dms-backup.service
  sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.timer /etc/systemd/system/dms-backup.timer
  sudo systemctl daemon-reload
  sudo systemctl enable --now dms-backup.timer
  # Sources : deploy/ubuntu/systemd/dms-backup.service:1-16 ; dms-backup.timer:1-13

  # Déclenchement d'une première sauvegarde manuelle immédiate :
  sudo systemctl start dms-backup.service
  ```
- **Résultat attendu** : timer planifié chaque jour à `02:00:00` (`dms-backup.timer:8`) et création d'une archive `/var/backups/dms/dms_full_backup_YYYYMMDD_HHMMSS.tar.gz` contenant `database_dump.archive.gz`, `storage/courrier`, `storage/uploads` et `ai_models_manifest.txt`.
- **Vérification** :
  ```bash
  systemctl list-timers --all | grep dms-backup
  sudo journalctl -u dms-backup.service -n 50 --no-pager
  ls -lh /var/backups/dms/
  tar -tzf /var/backups/dms/dms_full_backup_*.tar.gz | head -n 30

  # Test de restauration SANS écraser la production (cible document-management-test par défaut) :
  sudo -u dms -H bash /var/www/dms/deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_<TIMESTAMP>.tar.gz
  # Source : deploy/scripts/restore-all.sh:18,69-77,118-135
  ```
  - *(Pour une vraie restauration de production en sinistre : ajouter `--target-prod` et saisir `OUI`, `restore-all.sh:89-97`.)*
- **Si ça échoue** :
  - **`mongodump` échoue sur authentification** : vérifier `MONGODB_URI` dans `/var/www/dms/.env` et l'`authSource` (`document-management` selon `install-mongodb.sh:71-78`).
  - **Permission denied sur `/var/backups/dms`** : vérifier que l'étape 3.1 a bien créé `/var/backups/dms` avec propriétaire `dms:dms` (`dms-backup.service:7-8`).
  - **`restore-all.sh` échoue en mode test (`document-management-test`)** : `dms_app_user` n'a les droits `readWrite`/`dbAdmin` que sur `document-management` (`install-mongodb.sh:76`). Pour tester une restauration dans `document-management-test`, passer une URI avec un compte ayant droits sur la base de test (ou `admin_dms` temporairement).

---

## Étape 3.9 — Mise à jour applicative et retour arrière (`deploy.sh` & `rollback.sh`) (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/ubuntu/deploy.sh:1-92`, `deploy/ubuntu/rollback.sh:1-51`.
- **Anomalies critiques à contourner (`FAIT`)** :
  1. **`deploy.sh:38` ne charge pas `.env`** avant d'appeler `check-env.mjs`, ce qui fait échouer `[1/6]` si les variables ne sont pas exportées dans le shell appelant.
  2. **`deploy.sh:78` et `rollback.sh:42` hardcodent `http://127.0.0.1:5000`** pour `smoke-test.mjs` et le contrôle `/api/health`. Si `${PORT}` ≠ `5000`, `deploy.sh` déclencherait un faux échec puis un **rollback automatique** !
  3. **`deploy.sh:43`** écrit la sauvegarde de pré-déploiement dans `${APP_DIR}/backups` (`/var/www/dms/backups`) plutôt que `/var/backups/dms`.
- **Commande (`[NON TESTÉ EN RÉEL]`)** :
  ```bash
  # À exécuter sous l'utilisateur dms ; si ${PORT} = 5000 :
  sudo -u dms -H bash -c '
    cd /var/www/dms
    set -a && source .env && set +a
    bash deploy/ubuntu/deploy.sh
  '
  # Sources : deploy/ubuntu/deploy.sh:28-91 ; deploy/scripts/smoke-test.mjs:31,38

  # Si ${PORT} != 5000 (tant que deploy.sh:78 hardcode 5000), exécuter la séquence manuelle équivalente avec ${PORT} :
  sudo -u dms -H bash -c '
    cd /var/www/dms
    set -a && source .env && set +a
    node deploy/scripts/check-env.mjs &&
    bash deploy/scripts/backup-all.sh /var/backups/dms 14 &&
    rm -rf dist.bak && ([ ! -d dist ] || cp -r dist dist.bak) &&
    npm ci &&
    npm run build &&
    pm2 reload ecosystem.config.cjs --update-env &&
    sleep 5 &&
    node deploy/scripts/smoke-test.mjs "http://127.0.0.1:${PORT}"
  '
  ```
  - **En cas d'échec après mise à jour (Rollback manuel)** :
    ```bash
    # Utilise rollback.sh si PORT=5000 (rollback.sh:42 hardcode 5000), sinon restaurer dist.bak + pm2 reload + curl ${PORT} :
    sudo -u dms -H bash /var/www/dms/deploy/ubuntu/rollback.sh
    # Source : deploy/ubuntu/rollback.sh:26-49
    ```
- **Résultat attendu** : sauvegarde préalable créée, dépendances propres installées via `npm ci`, `dist/` recompilé, PM2 rechargé, Groupe 1 (`DEP-01`..`DEP-04`) de `smoke-test.mjs` en `PASS` (`smoke-test.mjs:348-356`). *(Rappel : le Groupe 2 sécurité de `smoke-test.mjs` échouera/avertira tant que `SEC-01`..`SEC-12` ne sont pas corrigés ; ne pas passer `--strict-security` avant correction de ces failles).*
- **Vérification** :
  ```bash
  sudo -u dms -H pm2 status
  node /var/www/dms/deploy/scripts/smoke-test.mjs "http://127.0.0.1:${PORT}"
  ```
- **Si ça échoue** :
  - **Rollback déclenché automatiquement par `deploy.sh:85`** : vérifier que `dist.bak` a bien été restauré (`rollback.sh:26-30`) et lire `/var/www/dms/logs/err.log`.
  - **Échec `npm ci` sur `package-lock.json` désynchronisé** : mettre à jour `package-lock.json` en recette depuis un `package.json` validé avant le déploiement.

---

# PARTIE 4/4 : DÉPLOIEMENT SUR WINDOWS SERVER, RECETTE ET EXPLOITATION (`[NON TESTÉ EN RÉEL]`)

> **Statut global de la Partie 4/4** : **`[NON TESTÉ EN RÉEL]`** (aucune commande n'a été exécutée sur un serveur Windows ou Ubuntu cible).  
> **Ordre suivi** : ordre réel des scripts et fichiers fournis dans `deploy/windows/` (`install-prereqs.ps1`, `install-service.ps1`, `web.config`) et `deploy/backup/backup-mongo.ps1`, complété par les procédures manuelles pour tout élément marqué `[FICHIER ABSENT]`, en conservant `${PORT}` (`DÉCISION DU PROPRIÉTAIRE`).  
> **Rappel sécurité bloquant** : ne jamais exposer sur le réseau tant que `SEC-01`..`SEC-12` (`docs/ARCHITECTURE_DMS.md` section 0) ne sont pas corrigés et prouvés.

---

## Section A — Déploiement sur Windows Server (`[NON TESTÉ EN RÉEL]`)

### Étape 4.1 — Prérequis système Windows (`install-prereqs.ps1`) (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/windows/install-prereqs.ps1:1-85`, `deploy/windows/README_DEPLOY_WINDOWS.md:11-39`, `backend/utils/ocrProcessor.js:49-52,301-303`.
- **Ce que fait réellement le script (`FAIT`)** :
  - Exige PowerShell Administrateur (`install-prereqs.ps1:19-23`).
  - Installe Chocolatey (`:30-35`), `nodejs-lts` `22.14.0` (`:42`), `git` (`:43`), `visualstudio2022buildtools` (workload `VCTools`, `:47`), `cmake` (`:48`), `mongodb` et `mongodb-database-tools` (`:52-53`), tente `bindIp: 127.0.0.1` dans `mongod.cfg` (`:56-62`), puis installe `tesseract` (`:66`), `poppler` (`:67`) et `nssm` (`:71`).
- **Écarts / éléments absents à traiter manuellement (`FAIT`)** :
  1. **Installeurs IIS, URL Rewrite 2.1 et ARR 3.0** : **`[FICHIER ABSENT]`** dans `deploy/windows/install-prereqs.ps1` (à activer/télécharger séparément avant l'étape 4.5).
  2. **Version de MongoDB à installer : `[À CONFIRMER]`** selon la compatibilité de `mongoose ^9.10.2` (`package.json:81`) et la version de Windows Server (`2019` vs `2022`), car `choco install mongodb -y` (`:52`) n'épingle aucune version.
  3. **Langues Tesseract (`ara`, `fra`, `eng`) et `PATH`** : le paquet Chocolatey `tesseract` peut ne pas inclure les données `ara.traineddata` et `fra.traineddata` (`ocrProcessor.js:49-52`) ; vérifier leur présence dans `tessdata` et le `PATH` système (`README_DEPLOY_WINDOWS.md:15`).
  4. **ImageMagick absent** : `ocrProcessor.js:301-303` appelle `magick` sous Windows (avec repli sur l'image brute), mais `install-prereqs.ps1` ne l'installe pas (`choco install imagemagick -y` optionnel).
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force
  .\deploy\windows\install-prereqs.ps1
  # Source : deploy/windows/install-prereqs.ps1:16-84
  ```
- **Résultat attendu** : Node.js `22.14.0`, Git, VS Build Tools C++, CMake, MongoDB, `mongodb-database-tools`, Tesseract, Poppler (`pdftoppm`) et NSSM installés ; `mongod.cfg` lié à `127.0.0.1`.
- **Vérification** :
  ```powershell
  node -v
  npm -v
  nssm version
  tesseract --list-langs
  where.exe pdftoppm
  where.exe mongodump
  ```
  - *(Si `ara` ou `fra` manque dans `tesseract --list-langs`, copier `ara.traineddata`, `fra.traineddata` et `eng.traineddata` dans le dossier `tessdata` de Tesseract — `[NON VÉRIFIÉ]`.)*
- **Si ça échoue** :
  - **Échec Chocolatey derrière proxy d'entreprise** : configurer le proxy Chocolatey (`choco config set proxy ...`) ou installer manuellement les `.msi`/`.exe` hors-ligne.
  - **Échec compilation native ultérieure de `node-llama-cpp`** : vérifier que le workload C++ `VCTools` et `cmake` sont bien présents dans le `PATH` système (`install-prereqs.ps1:47-48,75`).

---

### Étape 4.2 — MongoDB authentifié sur `127.0.0.1` (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/windows/install-prereqs.ps1:55-62` ; **script de durcissement / création de comptes Windows** : **`[FICHIER ABSENT]`** (l'équivalent de `deploy/ubuntu/install-mongodb.sh` n'existe pas sous `deploy/windows/`).
- **Règle impérative (`FAIT`)** : créer `dms_app_user` dans une base définie (ex. `document-management`, comme dans `install-mongodb.sh:71-78`) et utiliser **strictement le même `authSource`** dans `MONGODB_URI`, tout en maintenant `net.bindIp: 127.0.0.1` et `security.authorization: enabled`.
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  # 1) Vérifier bindIp: 127.0.0.1 dans mongod.cfg (deploy/windows/install-prereqs.ps1:56-60)
  $cfg = (Resolve-Path "C:\Program Files\MongoDB\Server\*\bin\mongod.cfg")[0].Path
  Select-String -Path $cfg -Pattern "bindIp"

  # 2) Créer les utilisateurs admin_dms (base admin) et dms_app_user (base document-management) avant d'activer authorization
  # Générer des mots de passe forts via RNG PowerShell (Partie 2 section 5.1) — remplacer <ADMIN_PWD> et <APP_PWD> :
  mongosh --quiet --eval @"
  use admin;
  db.createUser({ user: 'admin_dms', pwd: '<ADMIN_PWD>', roles: [ { role: 'userAdminAnyDatabase', db: 'admin' }, { role: 'readWriteAnyDatabase', db: 'admin' } ] });
  use document-management;
  db.createUser({ user: 'dms_app_user', pwd: '<APP_PWD>', roles: [ { role: 'readWrite', db: 'document-management' }, { role: 'dbAdmin', db: 'document-management' } ] });
  "@

  # 3) Activer security.authorization: enabled dans $cfg (si absent) puis redémarrer MongoDB :
  Add-Content -Path $cfg -Value "`r`nsecurity:`r`n  authorization: enabled"
  Restart-Service -Name "MongoDB"
  ```
- **Résultat attendu** : service `MongoDB` en cours d'exécution (`Running`), écoute uniquement sur `127.0.0.1:27017`, authentification obligatoire.
- **Vérification** :
  ```powershell
  Get-Service -Name "MongoDB"
  netstat -ano | findstr ":27017"
  mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" --password --eval "db.runCommand({ connectionStatus: 1 })"
  ```
- **Si ça échoue** :
  - **Le service `MongoDB` ne redémarre pas** : vérifier l'indentation YAML (`  authorization: enabled`) ou un doublon de clé `security:` dans `mongod.cfg`, puis consulter le journal `mongod.log` dans le dossier `log\` de MongoDB.
  - **`AuthenticationFailed`** : vérifier que `authSource` dans `MONGODB_URI` correspond à la base où `dms_app_user` a été créé (`document-management`).

---

### Étape 4.3 — Code source, `npm ci`, `.env`, ACL (`icacls`), modèles IA, build et SuperAdmin (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/windows/install-prereqs.ps1:80-82`, `deploy/windows/README_DEPLOY_WINDOWS.md:48-80,114`, `.env.production.example:49-78`, `deploy/scripts/check-env.mjs:25-209`, `package.json:11,18,20-21,81`.
- **Incohérence de chemin de déploiement (`FAIT`)** : `install-prereqs.ps1:80` et `README_DEPLOY_WINDOWS.md:47-50` citent `C:\inetpub\wwwroot\dms`, alors que `.env.production.example:51,56,61` cite `C:\dms\...` et `C:\backups\dms`. Le répertoire retenu reste un choix d'exploitation (attention : `deploy/windows/README_DEPLOY_WINDOWS.md:114` préconise d'ouvrir `backend\uploads` à `IIS_IUSRS`, **ce qui est dangereux** si `IIS` pouvait servir `uploads` sans Auth ; seul `dist\` doit être lisible par `IIS_IUSRS`, jamais `.env`, `backend\courrier`, `backend\uploads` ni `backups`).
- **Règles identiques à Ubuntu (`FAIT`)** :
  - **`package-lock.json` obligatoire pour `npm ci`** (à copier avec le projet ou générer une fois avec `npm install --package-lock-only`) ; **ne pas utiliser `bun.lock`**.
  - **Ne jamais exécuter `npm install` dans `backend\`** (conserver `mongoose ^9.10.2` racine, `package.json:81`).
  - Premier SuperAdmin : **`[FICHIER ABSENT]`** (ne jamais utiliser `admin / Admin123!`).
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  # Exemple avec C:\dms (adapter si C:\inetpub\wwwroot\dms est retenu ; créer les dossiers requis) :
  Set-Location C:\dms
  New-Item -ItemType Directory -Path ".\backend\courrier", ".\backend\uploads\attachments", ".\backend\uploads\usersphoto", ".\backend\uploads\personnelphoto", ".\models", ".\logs", "C:\backups\dms" -Force | Out-Null

  # Générer package-lock.json si absent (ne pas utiliser bun.lock), puis npm ci :
  if (-not (Test-Path ".\package-lock.json")) { npm install --package-lock-only }
  npm ci
  npm ls mongoose

  # Créer .env depuis .env.production.example (adapter PORT=${PORT}, MONGODB_URI authSource=document-management, JWT_SECRET PowerShell RNG, BACKUP_DIR=BACKUP_PATH=BACKUP_ROOT=C:\backups\dms) :
  Copy-Item .\.env.production.example .\.env
  # Éditer .env avant la suite !

  # Durcir les permissions NTFS (icacls) sur .env et les dossiers sensibles :
  # Ne laisser l'accès qu'aux Administrateurs et à SYSTEM (et compte du service DMSBackend si compte dédié) :
  icacls "C:\dms\.env" /inheritance:r /grant:r "Administrators:(F)" "SYSTEM:(F)"
  icacls "C:\dms\backend\courrier" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  icacls "C:\dms\backend\uploads" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  icacls "C:\backups\dms" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  # Seul dist\ doit être lisible par IIS (IIS_IUSRS) :
  New-Item -ItemType Directory -Path ".\dist" -Force | Out-Null
  icacls "C:\dms\dist" /grant "IIS_IUSRS:(OI)(CI)(RX)"

  # Charger .env dans la session PowerShell pour check-env.mjs (qui n'importe pas dotenv) :
  Get-Content .\.env | Where-Object { $_ -match '^\s*[^#=]+=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
  }
  node .\deploy\scripts\check-env.mjs

  # Télécharger / copier les .gguf, contrôler et compiler dist\ :
  npm run download-models
  npm run check-models
  npm run build
  node .\deploy\scripts\check-env.mjs
  # Sources : deploy/windows/install-prereqs.ps1:80-82 ; package.json:11,20-21 ; deploy/scripts/check-env.mjs:1-209
  ```
- **Résultat attendu** : ACL `icacls` appliquées (aucun droit `Users` ou `IIS_IUSRS` sur `.env`, `courrier`, `uploads`, `backups`), `npm ci` + compilation native C++ réussis, `.gguf` vérifiés, `dist\index.html` généré, `check-env.mjs` retourne `0`.
- **Vérification** :
  ```powershell
  icacls C:\dms\.env
  icacls C:\dms\backend\courrier
  Test-Path C:\dms\dist\index.html
  Get-ChildItem C:\dms\models\*.gguf
  ```
- **Si ça échoue** :
  - **Refus d'accès après `icacls`** : si le service Windows `DMSBackend` tourne sous un compte dédié autre que `SYSTEM`, accorder explicitement `(M)`/`(F)` à ce compte sur `C:\dms`, `.env`, `courrier`, `uploads`, `logs`, `C:\backups\dms`.
  - **Échec `node-llama-cpp` sous Windows** : lancer dans un shell disposant des variables VS Build Tools (`vcvars64.bat`) ou vérifier `cmake --version`.

---

### Étape 4.4 — Service Windows via NSSM (`install-service.ps1`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/windows/install-service.ps1:1-116`.
- **Points critiques (`FAIT`)** :
  - `install-service.ps1` crée le service **`DMSBackend`** avec `NSSM`, exécutant `node_modules\.bin\tsx.cmd server.ts` (`:55-62,77`), avec démarrage auto (`SERVICE_AUTO_START`, `:80`), rotation des logs `service-out.log` et `service-err.log` (`24h` / `10 Mo`, `:86-93`), et délai de redémarrage `4000 ms` (`:96`).
  - **Écart de port dans `install-service.ps1:83` (`FAIT`)** : la ligne `83` injecte `AppEnvironmentExtra "NODE_ENV=production``r``nPORT=5000"`. Comme `NSSM` passe ces variables au démarrage avant `dotenv` (`server.ts:38-39`), **elles écrasent le `PORT` du fichier `.env`**. Si le propriétaire choisit un `${PORT}` ≠ `5000`, ajuster `install-service.ps1:83` (ou via `nssm set DMSBackend AppEnvironmentExtra NODE_ENV=production PORT=${PORT}`).
  - **Écart doc (`FAIT`)** : `deploy/windows/README_DEPLOY_WINDOWS.md:84-98` mentionne encore PM2, alors que `install-service.ps1` utilise **NSSM** (aucun service PM2 Windows n'est installé par les scripts).
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  Set-Location C:\dms
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\deploy\windows\install-service.ps1
  # Source : deploy/windows/install-service.ps1:18-115

  # Obligatoire si ${PORT} != 5000 (anomalie install-service.ps1:83) :
  # nssm set DMSBackend AppEnvironmentExtra "NODE_ENV=production" "PORT=${PORT}"
  # Restart-Service -Name "DMSBackend"
  ```
- **Résultat attendu** : service `DMSBackend` à l'état `Running`, à l'écoute sur `0.0.0.0:${PORT}`, journaux dans `C:\dms\logs\service-out.log` et `service-err.log`.
- **Vérification** :
  ```powershell
  Get-Service -Name "DMSBackend"
  netstat -ano | findstr ":${PORT}"
  Invoke-RestMethod -Uri "http://127.0.0.1:${PORT}/api/health"
  ```
- **Si ça échoue** :
  - **Service `Paused` ou redémarre en boucle** : lire `Get-Content C:\dms\logs\service-err.log -Tail 50` ; vérifier `JWT_SECRET`, `MONGODB_URI` (`authSource`) et présence de `node_modules\.bin\tsx.cmd`.

---

### Étape 4.5 — IIS, URL Rewrite, ARR, `web.config`, HTTPS et Pare-feu Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/windows/web.config:1-88`, `deploy/windows/README_DEPLOY_WINDOWS.md:20-39,104-118`.
- **Éléments `[FICHIER ABSENT]` (`FAIT`)** :
  - **Installeurs URL Rewrite 2.1 & ARR 3.0** : `[FICHIER ABSENT]` (à télécharger depuis Microsoft et installer manuellement).
  - **Script de liaison HTTPS IIS** : `[FICHIER ABSENT]`.
  - **Script pare-feu Windows (`New-NetFirewallRule`)** : `[FICHIER ABSENT]`.
- **Points critiques de `deploy/windows/web.config` (`FAIT`)** :
  - `maxAllowedContentLength="52428800"` (50 Mo, `web.config:18`) et `<webSocket enabled="true" />` (`:23`).
  - **Ordre impératif des règles Rewrite (`web.config:26-70`)** : les règles `API Proxy` (`^api/(.*)`, `:28-34`), `SocketIO Proxy` (`^socket.io/(.*)`, `:37-40`), `Swagger Docs` (`^api-docs(.*)`, `:43-46`), **`Courrier Proxy` (`^courrier/(.*)`, `:49-52`)** et **`Uploads Proxy` (`^uploads/(.*)`, `:55-58`)** sont placées **AVANT** `React SPA Routes` (`:61-69`), laquelle exclut explicitement `^/(api|socket\.io|courrier|uploads|api-docs)` (`:66`). **Ne jamais inverser cet ordre ni exposer `courrier`/`uploads` en dossiers virtuels IIS.**
  - **Port `5000` codé en dur (`web.config:30,39,45,51,57`)** : remplacer `http://localhost:5000/...` par `http://127.0.0.1:${PORT}/...` (ou `localhost:${PORT}`).
  - **Variable serveur `HTTP_X_FORWARDED_PROTO` (`web.config:32`)** : pour autoriser `web.config` à modifier `HTTP_X_FORWARDED_PROTO`, ajouter `HTTP_X_FORWARDED_PROTO` dans IIS Manager > *URL Rewrite > View Server Variables > Add* (sinon IIS renvoie une erreur HTTP `500.50` sur `/api/*` !).
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  # 1) Activer IIS + WebSocket Protocol :
  Install-WindowsFeature -Name Web-Server, Web-WebSockets, Web-Http-Redirect, Web-Mgmt-Tools
  # Source : deploy/windows/web.config:11 ; deploy/windows/README_DEPLOY_WINDOWS.md:23-27

  # 2) Installer manuellement URL Rewrite 2.1 et ARR 3.0 ([FICHIER ABSENT]), puis activer le proxy ARR :
  # Dans IIS Manager : Serveur > Application Request Routing Cache > Server Proxy Settings > cocher "Enable proxy" > Apply
  # (Équivalent PowerShell WebAdministration si module chargé — [NON TESTÉ EN RÉEL] :)
  Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/proxy' -name 'enabled' -value 'True'
  # Déclarer la variable serveur autorisée pour éviter l'erreur HTTP 500.50 sur HTTP_X_FORWARDED_PROTO (web.config:32) :
  Add-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/rewrite/allowedServerVariables' -name '.' -value @{name='HTTP_X_FORWARDED_PROTO'}

  # 3) Copier web.config dans dist\ et adapter ${PORT} dans dist\web.config :
  Copy-Item "C:\dms\deploy\windows\web.config" "C:\dms\dist\web.config" -Force
  # Éditer C:\dms\dist\web.config pour remplacer 5000 par ${PORT} si différent.
  # Source : deploy/windows/web.config:1-87 ; deploy/windows/README_DEPLOY_WINDOWS.md:112

  # 4) Créer le site IIS pointant vers C:\dms\dist (NE PAS utiliser Default Web Site sans nettoyer le port 80) :
  Import-Module WebAdministration
  New-Website -Name "DMS" -PhysicalPath "C:\dms\dist" -Port 80 -HostHeader "<VOTRE_DOMAINE_OU_IP>"

  # 5) Liaison HTTPS IIS ([FICHIER ABSENT] — exemple auto-signé intranet, sinon importer certificat PKI .pfx) :
  $cert = New-SelfSignedCertificate -DnsName "<VOTRE_DOMAINE>", "dms.local", "localhost" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(3)
  New-WebBinding -Name "DMS" -Protocol "https" -Port 443 -IPAddress "*" -SslFlags 0
  Get-WebBinding -Name "DMS" -Protocol "https" | ForEach-Object { $_.AddSslCertificate($cert.Thumbprint, "My") }
  # OBLIGATOIRE si auto-signé : exporter $cert (.cer) et l'installer dans "Autorités de certification racines de confiance" sur chaque poste client !

  # 6) Pare-feu Windows ([FICHIER ABSENT] — autoriser 80/443, bloquer accès direct ${PORT} et 27017) :
  New-NetFirewallRule -DisplayName "DMS HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
  New-NetFirewallRule -DisplayName "DMS HTTPS (443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
  New-NetFirewallRule -DisplayName "DMS Block Direct Node" -Direction Inbound -Protocol TCP -LocalPort ${PORT} -Action Block
  New-NetFirewallRule -DisplayName "DMS Block Direct MongoDB" -Direction Inbound -Protocol TCP -LocalPort 27017 -Action Block
  ```
- **Résultat attendu** : site IIS `DMS` démarré sur `80` et `443`, proxy ARR actif, requêtes `/api/`, `/socket.io/`, `/courrier/`, `/uploads/` transmises à `127.0.0.1:${PORT}`, accès direct à `${PORT}` et `27017` bloqué par le pare-feu Windows.
- **Vérification** :
  ```powershell
  Get-Website -Name "DMS"
  Get-WebBinding -Name "DMS"
  Get-NetFirewallRule -DisplayName "DMS*" | Format-Table DisplayName, Enabled, Action
  # Test local HTTPS (avec -SkipCertificateCheck sous PS 7 ou callback TLS sous PS 5.1) :
  curl.exe -kI "https://127.0.0.1/api/health"
  ```
- **Si ça échoue** :
  - **Erreur IIS `500.50` (`HTTP_X_FORWARDED_PROTO`)** : variable serveur non ajoutée dans `allowedServerVariables` (voir commande étape 2).
  - **Erreur IIS `502.3 Bad Gateway` ou `404.4`** : ARR non installé ou case *Enable proxy* non cochée dans ARR *Server Proxy Settings*, ou service `DMSBackend` arrêté.
  - **WebSocket Socket.IO bloqué** : fonctionnalité Windows `Web-WebSockets` non installée (`Install-WindowsFeature Web-WebSockets`).

---

### Étape 4.6 — Scanner WIA sous Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `backend/utils/scanner/windows/scannerDetection.js:14-108`, `backend/utils/scanner/config/scannerConfig.js:15-18`.
- **Ce que fait le code (`FAIT`)** : `server.ts` lance PowerShell (`New-Object -ComObject WIA.DeviceManager`) et sélectionne les périphériques `Type -eq 1` (`scannerDetection.js:19,60-64`).
- **Commande de vérification (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  # 1) Vérifier que le service Windows Image Acquisition (WIA) est actif et automatique :
  Get-Service -Name "stisvc"
  Set-Service -Name "stisvc" -StartupType Automatic
  Start-Service -Name "stisvc"

  # 2) Tester la détection WIA exactement comme backend/utils/scanner/windows/scannerDetection.js:60-71 :
  $dm = New-Object -ComObject WIA.DeviceManager
  $dm.DeviceInfos | Where-Object { $_.Type -eq 1 } | ForEach-Object {
    [PSCustomObject]@{
      ID = $_.DeviceID
      Name = $_.Properties("Name").Value
    }
  }
  ```
- **Résultat attendu** : service `stisvc` `Running`, et liste des scanners WIA retournée avec leur `DeviceID` (à reporter dans `SCANNER_DEVICE_ID` du `.env` si `SCANNER_ENABLED=true`).
- **Si ça échoue** : installer le pilote **WIA** constructeur (pas seulement TWAIN) ou vérifier la visibilité USB/réseau dans le *Gestionnaire de périphériques* Windows.

---

### Étape 4.7 — Sauvegarde planifiée, Restauration et Mise à jour Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/backup/backup-mongo.ps1:1-161`, `deploy/windows/README_DEPLOY_WINDOWS.md:121-130`.
- **Incohérences constatées (`FAIT`)** :
  - `backup-mongo.ps1:23` écrit toujours dans `<ProjectRoot>\backups` (ignore `BACKUP_DIR`), alors que `.env.production.example:62` prévoit `C:\backups\dms`. Si `C:\backups\dms` est exigé, synchroniser/copier les `.zip` ou aligner `.env` sur le dossier réel.
  - `backup-mongo.ps1:138` applique **14 jours** de rétention (contre 30 jours annoncés dans `README_DEPLOY_WINDOWS.md:123`).
- **Éléments `[FICHIER ABSENT]` (`FAIT`)** :
  - **Restauration Windows (`restore-all.ps1`)** : **`[FICHIER ABSENT]`**.
  - **Mise à jour / Rollback Windows (`deploy.ps1` / `rollback.ps1`)** : **`[FICHIER ABSENT]`**.
- **Commande (`[NON TESTÉ EN RÉEL]`, PowerShell Administrateur)** :
  ```powershell
  # 1) Planifier la sauvegarde quotidienne à 02:00 (README_DEPLOY_WINDOWS.md:127-129) :
  $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\dms\deploy\backup\backup-mongo.ps1"
  $Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
  Register-ScheduledTask -TaskName "DMS_Daily_Backup" -Action $Action -Trigger $Trigger -User "SYSTEM" -RunLevel Highest -Force
  # Source : deploy/windows/README_DEPLOY_WINDOWS.md:127-129 ; deploy/backup/backup-mongo.ps1:18-160

  # 2) Lancer un test immédiat de sauvegarde :
  Start-ScheduledTask -TaskName "DMS_Daily_Backup"

  # 3) Procédure manuelle de mise à jour ([FICHIER ABSENT]) :
  # Stop-Service DMSBackend
  # powershell -File C:\dms\deploy\backup\backup-mongo.ps1
  # Copy-Item C:\dms\dist C:\dms\dist.bak -Recurse -Force
  # npm ci ; npm run build ; Copy-Item C:\dms\deploy\windows\web.config C:\dms\dist\web.config -Force
  # Start-Service DMSBackend ; node C:\dms\deploy\scripts\smoke-test.mjs "http://127.0.0.1:${PORT}"

  # 4) Procédure manuelle de restauration de secours ([FICHIER ABSENT]) :
  # Extraire dms_full_backup_<TIMESTAMP>.zip vers un dossier temporaire, puis sur une base de test (ou prod après arrêt service) :
  # mongorestore.exe --uri="mongodb://dms_app_user:<PWD>@127.0.0.1:27017/document-management?authSource=document-management" --dir="<EXTRACT>\mongo_dump\document-management" --drop
  # Copier <EXTRACT>\storage\courrier et uploads vers C:\dms\backend\
  ```
- **Vérification** :
  ```powershell
  Get-ScheduledTask -TaskName "DMS_Daily_Backup" | Get-ScheduledTaskInfo
  Get-ChildItem "C:\dms\backups\dms_*.zip" | Sort-Object LastWriteTime -Descending
  ```
- **Si ça échoue** :
  - **Dernier code résultat ≠ `0` dans le Planificateur de tâches** : exécuter `powershell -NoProfile -File C:\dms\deploy\backup\backup-mongo.ps1` en console pour voir l'erreur (`mongodump.exe` absent du `PATH` système pour `SYSTEM` ou échec `authSource` MongoDB).

---

## Section B — Recette de réception (Ubuntu & Windows) (`[NON TESTÉ EN RÉEL]`)

> **Outil automatique existant (`FAIT`)** : `node deploy/scripts/smoke-test.mjs "http://127.0.0.1:${PORT}"` (`deploy/scripts/smoke-test.mjs:1-379`). Attention : les tests marqués **"DÉFAUT CONNU"** dans le tableau ci-dessous **échoueront** sur le code actuel tant que les correctifs de la section 0 (`docs/ARCHITECTURE_DMS.md`) n'auront pas été appliqués.

| # | Test de recette | Commande Ubuntu (`curl` / bash) | Commande Windows (`curl.exe` / PowerShell) | Résultat attendu |
|---|---|---|---|---|
| **R-01** | **Santé API & BDD** (`/api/health`) | `curl -sk https://<DOMAINE_OU_IP>/api/health` | `curl.exe -sk https://<DOMAINE_OU_IP>/api/health` | HTTP `200`, JSON avec `"success": true`, `"status": "healthy"`, **`"database": "connected"`** (`server.ts:238-246`). |
| **R-02** | **Route protégée sans jeton** (`/api/departments`) | `curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/api/departments` | `curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/api/departments` | HTTP **`401`** (jamais `503` ni `200`, `smoke-test.mjs:118-129`). |
| **R-03** | **Route API inconnue** | `curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/api/inconnue` | `curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/api/inconnue` | HTTP **`404`** (jamais `500`, `smoke-test.mjs:143-153`). |
| **R-04** | **Protection `/courrier/` sans session (`.pdf`)** | `curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/courrier/2026/Incoming-Doc/test.pdf` | `curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/courrier/2026/Incoming-Doc/test.pdf` | HTTP **`401` ou `403`** (preuve que Nginx/IIS délègue bien à Express au lieu de servir le fichier en statique). |
| **R-05** | **Protection `/uploads/` sans session (`.pdf` et `.jpg`)** | `curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/attachments/test.pdf && curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/attachments/test.jpg` | `curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/attachments/test.pdf && curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/attachments/test.jpg` | HTTP **`401` ou `403`** pour les deux (attention sous Ubuntu au piège regex `dms.nginx.conf:141` sur `.jpg` sans `^~`, qui renverrait `404` Nginx !). |
| **R-06** | **Photos `usersphoto` / `personnelphoto` (DÉFAUT CONNU)** | `curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/usersphoto/test.jpg && curl -sk -o /dev/null -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/personnelphoto/test.jpg` | `curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/usersphoto/test.jpg && curl.exe -sk -o NUL -w "%{http_code}\n" https://<DOMAINE_OU_IP>/uploads/personnelphoto/test.jpg` | **Attendu avant mise en prod : `401` ou `403`**. **Constat code actuel (`FAIT`)** : `server.ts:172-173` les sert en statique public (`404`/`200`) — défaut bloquant à corriger (`smoke-test.mjs:231-241`). |
| **R-07** | **CORS `Origin: http://evil.test` (DÉFAUT CONNU)** | `curl -skI -X OPTIONS -H "Origin: http://evil.test" -H "Access-Control-Request-Method: GET" https://<DOMAINE_OU_IP>/api/health \| grep -i access-control` | `curl.exe -skI -X OPTIONS -H "Origin: http://evil.test" -H "Access-Control-Request-Method: GET" https://<DOMAINE_OU_IP>/api/health \| findstr /I access-control` | **Attendu avant mise en prod : origine refusée** (aucun `Access-Control-Allow-Origin: http://evil.test`). **Constat code actuel (`FAIT`)** : `server.ts:154` reflète `origin: true` — défaut bloquant à corriger (`smoke-test.mjs:209-229`). |
| **R-08** | **HTTPS & redirection HTTP → HTTPS & isolation port `${PORT}`** | `curl -sI http://<DOMAINE_OU_IP>/ \| head -n 5` et depuis un autre poste : `nc -zv <IP_SERVEUR> ${PORT}` | `curl.exe -sI http://<DOMAINE_OU_IP>/` et depuis un autre poste : `Test-NetConnection <IP_SERVEUR> -Port ${PORT}` | `301` vers `https://...`, certificat approuvé sans alerte sur poste client, et connexion externe directe sur `${PORT}` et `27017` **refusée/timeout**. |
| **R-09** | **Redémarrage complet du serveur (auto-reprise)** | `sudo reboot` puis après 60s : `systemctl is-active mongod nginx` + `sudo -u dms -H pm2 status` + test **R-01** | `Restart-Computer -Force` puis après 60s : `Get-Service MongoDB, DMSBackend, W3SVC` + test **R-01** | Tous les services sont revenus en `active`/`Running` sans intervention manuelle ; **R-01** repasse `200` (`database: connected`). |
| **R-10** | **Restauration d'une sauvegarde** | `sudo -u dms -H bash /var/www/dms/deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_<TS>.tar.gz` | `[FICHIER ABSENT]` — test manuel : extraction `.zip` + `mongorestore` vers base `document-management-test` | Extraction sans erreur, `mongorestore` restaure les collections sans erreur, manifeste IA vérifié. |

---

## Section C — Dépannage rapide

| Symptôme | Cause probable vérifiée dans le code/config | Commande de diagnostic |
|---|---|---|
| **`502 Bad Gateway` (Nginx ou IIS)** | Processus `dms-backend` / `DMSBackend` arrêté, crash au démarrage (`JWT_SECRET` absent en prod, `server.ts:54`) ou port mismatch entre `.env` (`${PORT}`), `ecosystem.config.cjs:42` / `install-service.ps1:83` et Nginx/IIS (`5000`). | **Ubuntu** : `sudo -u dms -H pm2 logs dms-backend --lines 50` & `ss -ltnp \| grep ${PORT}`<br>**Windows** : `Get-Content C:\dms\logs\service-err.log -Tail 50` & `netstat -ano \| findstr :${PORT}` |
| **IIS renvoie HTTP `500.50` sur `/api/*`** | Variable serveur `HTTP_X_FORWARDED_PROTO` utilisée dans `deploy/windows/web.config:32` non autorisée dans IIS `allowedServerVariables`. | **Windows** : `Get-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/rewrite/allowedServerVariables' -name '.'` |
| **Erreur `/uploads/*.jpg` retourne `404` Nginx au lieu de `401`/image** | Règle regex statique dans `deploy/ubuntu/dms.nginx.conf:141` passe avant `location /uploads/` (`:81`) sans `^~`. | **Ubuntu** : `sudo nginx -T \| grep -nE "location.*/(uploads\|courrier)\|png"` |
| **Crash ou échec `check-env.mjs` via `deploy.sh`** | `deploy/ubuntu/deploy.sh:38` exécute `check-env.mjs` sans charger `.env` (`NODE_ENV: NON DÉFINI`). | **Ubuntu** : `cd /var/www/dms && node --env-file=.env deploy/scripts/check-env.mjs` |
| **`AuthenticationFailed` MongoDB au démarrage** | Conflit `authSource` (`install-mongodb.sh:71-78` crée dans `document-management` vs `:107` et `.env.production.example:23` affichent `authSource=admin`). | **Ubuntu/Win** : `mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" -p --eval "db.stats()"` |
| **Cookie de session non enregistré en navigation** | `NODE_ENV=production` force `cookie.secure = true` (`backend/controllers/auth/utils.js:17-19`) : refusé si accès en HTTP simple ou certificat TLS non approuvé. | Inspecter les en-têtes `Set-Cookie` et vérifier que l'accès se fait en `https://` avec certificat installé sur le poste client. |
| **Modèles IA non chargés / crash mémoire (OOM)** | RAM < 16 Go, `max_memory_restart: '6G'` (`ecosystem.config.cjs:34`), ou modèles absents dans `LLAMA_*_MODEL_PATH`. | **Ubuntu** : `free -h && dmesg -T \| grep -i oom` ; `npm run check-models`<br>**Windows** : `Get-CimInstance Win32_OperatingSystem \| Select FreePhysicalMemory` ; `npm run check-models` |
| **OCR échoue ou ne reconnaît pas l'arabe** | Pack langue `tesseract-ocr-ara` / `ara.traineddata` absent, ou `pdftoppm` introuvable dans `PATH`. | **Ubuntu/Win** : `tesseract --list-langs` et `pdftoppm -v` |
| **Scanner non détecté** | Ubuntu : utilisateur `dms` sans accès `/dev/bus/usb` (SANE) ; Windows : service `stisvc` arrêté ou pilote WIA absent. | **Ubuntu** : `sudo -u dms scanimage -L`<br>**Windows** : `Get-Service stisvc` et test `WIA.DeviceManager` (étape 4.6) |

---

## Section D — Annexes

### D.1 Synthèse des incohérences détectées dans le dépôt (`FAIT`)

1. **Port interne `3000` vs `5000`** : `server.ts:316`, `vite.config.ts:14`, `.env.example:1` et `setup-system.sh:106` (`ufw deny 3000`) utilisent `3000`, tandis que `backend/server.js:354`, `.env.production.example:15`, `ecosystem.config.cjs:42`, `install-service.ps1:83`, `web.config:30`, `dms.nginx.conf`, `deploy.sh:78`, `rollback.sh:42` et `check-env.mjs:38` utilisent `5000`.
2. **Double version de Mongoose et d'Express** : racine `package.json:70,81` (`express ^5.2.1`, `mongoose ^9.10.2`) vs `backend/package.json:15,21` (`express ^4.18.2`, `mongoose ^8.0.0`).
3. **`package-lock.json` absent vs `bun.lock` présent** : `deploy.sh:54` et `install-prereqs.ps1:81` exigent `npm ci`, impossible sans `package-lock.json`.
4. **`package.json:9` (`"start": "node server.ts"`)** : non prouvé face au typage TS de `server.ts` (`tsx` utilisé partout ailleurs — `[À VÉRIFIER]`).
5. **Conflit `authSource` MongoDB** : `install-mongodb.sh:71-78` (crée dans `document-management`) vs `install-mongodb.sh:107` et `.env.production.example:23` (`authSource=admin`).
6. **Variables `.env` ignorées par `server.ts`** : `ALLOWED_ORIGINS` (`server.ts:121,154`), `AI_WARMUP` (`server.ts:67-80`), `INDEX_RETRY_CRON` (`server.ts` n'appelle pas `startIndexRetryScheduler()`), `REDIS_*` (code mort `backend/jobs/ocrQueue.js`).
7. **Chemins divergents** : `DOCUMENT_PATH` (lue à la lecture, ignorée à l'écriture dans `documentHelper.js:62-70`), `UPLOAD_DIR` / `UPLOAD_PATH` (ignorés par Multer `upload.js:6-9`), `BACKUP_DIR` / `BACKUP_PATH` / `BACKUP_ROOT`, `/var/backups/dms` absent de `setup-system.sh:93`, `C:\dms` (`.env.production.example`) vs `C:\inetpub\wwwroot\dms` (`README_DEPLOY_WINDOWS.md`).
8. **Anomalies scripts Ubuntu/Windows** : `deploy.sh:38` ne charge pas `.env` pour `check-env.mjs`, `deploy.sh:78` et `rollback.sh:42` hardcodent `5000`, `deploy/ubuntu/dms.nginx.conf:141` intercepte les images `/uploads/*.png|jpg` sans `^~`, `README_DEPLOY_WINDOWS.md:84-98,114` mentionne PM2 (NSSM utilisé) et donne `IIS_IUSRS` sur `uploads` (dangereux).

### D.2 Liste des éléments `[FICHIER ABSENT]` à créer / fournir avant mise en production

1. **Procédure sécurisée de création du premier SuperAdmin** (sans `admin / Admin123!` ni fallback mock en `backend/config/db.js:8-45`).
2. **`package-lock.json`** (généré/validé pour permettre `npm ci`).
3. **Scripts Windows manquants sous `deploy/windows/`** : configuration/durcissement MongoDB avec comptes, liaison HTTPS IIS, règles pare-feu (`New-NetFirewallRule`), restauration (`restore-all.ps1`), mise à jour et rollback (`deploy.ps1` / `rollback.ps1`), et installeurs hors-ligne/automatisés URL Rewrite 2.1 + ARR 3.0.
4. **Dossier d'audit `docs/audit-local/`** (référencé comme `[RÉPERTOIRE ABSENT]`) et **correctifs prouvés pour `SEC-01`..`SEC-12`**.

### D.3 Ce que ce guide ne couvre pas

- La correction des vulnérabilités applicatives listées dans `docs/ARCHITECTURE_DMS.md` section 0 (qui reste **obligatoire** avant toute ouverture réseau).
- Le déploiement haute disponibilité / multi-nœuds (impossible sans refonte car `userSockets` en mémoire `backend/sockets/index.js` et le singleton RAM `node-llama-cpp` imposent une instance unique).
- La configuration du réseau d'entreprise (DNS interne/externe, reverse proxy amont, pare-feu périmétrique, relais SMTP, stockage NAS externe) et l'installation du certificat auto-signé par GPO sur le parc client.
- Les pilotes spécifiques constructeur de chaque modèle de scanner physique.

### D.4 Questions pour le propriétaire (décisions requises avant exécution réelle)

1. **OS cible** : quelle version exacte d'**Ubuntu Server** (`22.04 LTS` ou `24.04 LTS`) et/ou de **Windows Server** (`2019` ou `2022`) est retenue ?
2. **Version MongoDB** : compte tenu de `mongoose ^9.10.2` (`package.json:81`) et de l'OS retenu, quelle version exacte de MongoDB Community (`7.0`, `8.0`...) validez-vous (`[À CONFIRMER]`) ?
3. **Matériel** : de combien de **RAM**, cœurs **CPU** et d'un éventuel **GPU** (CUDA/Vulkan) dispose le serveur ?
4. **Port applicatif `${PORT}`** : retenez-vous **`5000`** ou **`3000`** comme port interne unique ?
5. **Réseau & HTTPS** : quel **nom de domaine**, quelle **adresse IP fixe** et quel mode **HTTPS** (certificat auto-signé intranet, PKI interne ou Let's Encrypt) souhaitez-vous utiliser ?
6. **Charge & Scanner** : combien d'**utilisateurs simultanés** sont attendus, et un **scanner physique** (modèle exact, connexion USB ou réseau) doit-il être piloté depuis le serveur ?

---

## Section E — Résumé (15 lignes)

1. Le DMS repose sur un serveur unifié `server.ts` (Express 5, Socket.IO, `node-cron`, SPA Vite `dist/`, IA locale `node-llama-cpp` `.gguf`).
2. **Avertissement bloquant** : ne pas exposer l'application sur le réseau tant que les défauts critiques (`Admin123!`, contournement DB hors-ligne, CORS ouvert, photos statiques publiques, RBAC incomplets) ne sont pas corrigés et prouvés.
3. Le serveur de référence charge **`mongoose ^9.10.2`** (racine) et non `backend/package.json` (`^8.0.0`) ; la version MongoDB exacte reste **`[À CONFIRMER]`**.
4. Le port interne **`${PORT}`** (`3000` vs `5000`) et le choix **HTTPS** / domaine relèvent d'une **décision du propriétaire** et doivent être alignés partout.
5. Trois variables `.env` documentées (`ALLOWED_ORIGINS`, `AI_WARMUP`, `INDEX_RETRY_CRON`) sont ignorées par `server.ts` ; `BACKUP_DIR`, `BACKUP_PATH` et `BACKUP_ROOT` doivent être strictement identiques.
6. `npm ci` exige **`package-lock.json`** (absent du dépôt, contrairement au doublon `bun.lock` à ne pas utiliser) et **`tsx`** reste recommandé tant que `node server.ts` n'est pas prouvé.
7. Aucun script sécurisé de création du premier SuperAdmin n'existe (**`[FICHIER ABSENT]`**).
8. Sous **Ubuntu Server**, exécuter dans l'ordre `setup-system.sh`, `install-mongodb.sh`, `npm ci`/`.env`/modèles/`build`, PM2 (`fork`, `1` instance), `gen-selfsigned-cert.sh`, Nginx, `logrotate`, `dms-backup.timer` et `deploy.sh`.
9. Corriger manuellement sous Ubuntu : `ufw deny ${PORT}`, créer `/var/backups/dms`, fixer `?authSource=document-management`, charger `.env` avant `check-env.mjs` et ajouter `^~` sur `/uploads/` et `/courrier/` dans Nginx.
10. Sous **Windows Server**, exécuter `install-prereqs.ps1`, sécuriser MongoDB sur `127.0.0.1`, appliquer les ACL `icacls` (`IIS_IUSRS` uniquement sur `dist\`), installer le service NSSM (`install-service.ps1`), configurer IIS + ARR + `web.config`, WIA (`stisvc`) et `backup-mongo.ps1`.
11. Les scripts Windows de pare-feu, liaison HTTPS IIS, installeurs URL Rewrite/ARR, mise à jour/rollback et restauration sont **`[FICHIER ABSENT]`**.
12. Sur certificat auto-signé, l'installation du certificat racine sur chaque poste client est obligatoire pour éviter le blocage TLS et des cookies `Secure`.
13. La recette finale s'appuie sur `smoke-test.mjs` et les contrôles `curl`/PowerShell (`/api/health`, `401`, `404`, `/courrier`, `/uploads`, CORS, HTTPS, reboot, restauration).
14. Chaque procédure de ce guide porte le statut **`[NON TESTÉ EN RÉEL]`** et devra d'abord être validée sur une VM de recette isolée.
15. **Aucun fichier existant du projet n'a été modifié** lors de l'analyse et de la rédaction de ces deux documents.


