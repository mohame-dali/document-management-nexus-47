# Architecture réelle du DMS — Analyse du code source (Partie 1/4)

> **Statut du document** : Analyse statique fondée exclusivement sur la lecture du code source présent dans le dépôt (`FAIT`). Les éléments non observables dans le code ou dépendant de l'infrastructure cible sont marqués `[NON VÉRIFIÉ]`, `[À CONFIRMER]`, `[À VÉRIFIER]`, `[FICHIER ABSENT]` ou `DÉCISION DU PROPRIÉTAIRE`.

---

## 0. État de sécurité et points bloquants (`FAIT`)

> **AVERTISSEMENT IMPÉRATIF :** **Ne pas exposer l'application sur le réseau (LAN, intranet ou Internet) tant que les défauts bloquants encore ouverts ci-dessous n'ont pas été corrigés et prouvés.** L'application traite des données administratives et RH sensibles (courriers, dossiers du personnel, pièces d'identité/CIN, sanctions, assiduité).

### Éléments déjà durcis dans le code actuel (`FAIT`)
- **Suppression du contournement DB hors ligne & de l'auth mock (`backend/config/db.js:24-73` ; `backend/controllers/auth/loginController.js:28-44` ; `backend/middleware/auth.js:44-60` ; `server.ts:352-364`)** : `loginController` et `protect` refusent l'accès avec **`HTTP 503`** si MongoDB est hors ligne (aucun fallback `MOCK_ADMIN_ID` ni mot de passe par défaut), et `server.ts` quitte (`exit(1)`) en `NODE_ENV=production` si MongoDB est injoignable au démarrage.
- **Bootstrap administrateur CLI (`backend/scripts/create-superadmin.js:1-175`)** : script interactif TTY avec saisie masquée et mot de passe fort (>= 12 caractères, minuscule/majuscule/chiffre) créant le premier compte `Admin`.
- **Protection des routes de fichiers statiques (`server.ts:169-177`)** : `/api/files/:type/:id/:filename`, `/courrier`, `/uploads/usersphoto`, `/uploads/personnelphoto` et `/uploads` sont tous protégés par le middleware `protect`.
- **Durcissement des sous-processus OCR & Scanner Linux (`backend/utils/ocrProcessor.js:11-14,64-100` ; `backend/utils/scanner/linux/scanExecutor.js`)** : exécution via `execFile` / `runCommand` sans interpolation shell, cap mémoire (10 Mio) et timeout (`60s` par défaut), `OCR_DPI = 300`, et liaison `User <-> Personnel` encapsulée en transaction Mongoose + compensation (`backend/controllers/personnelController.js:795-937`).

### Défauts encore ouverts dans le code actif (`FAIT`)

| Gravité | Défaut constaté dans le code actif | Preuve vérifiée (`fichier:ligne`) | Impact / Risque |
|---|---|---|---|
| **CRITIQUE** | **Fallback `GET` hors ligne renvoyant `200` si une erreur Mongoose remonte** | `server.ts:257-306` | Si une erreur Mongoose/MongoNetworkError échappe à un contrôleur sur un `GET`, `server.ts` renvoie `HTTP 200` avec des données JSON vides/par défaut au lieu d'une erreur `503`. |
| **CRITIQUE** | **Secrets JWT fallback en dev (`30d` par défaut), stockage `localStorage` et `?token=` en URL** | `server.ts:53-64` ; `backend/middleware/auth.js:23-25` ; `src/services/apiService.ts:16,54` | Exige `JWT_SECRET` en `production` (`server.ts:54-57`), mais conserve `30d` par défaut (`:63`), le jeton lisible en `localStorage` et `?token=` accepté en requête (`auth.js:23-25`). |
| **HAUTE** | **CORS ouvert (`origin: true`), Socket.IO `origin: '*'`, absence de `helmet` et de rate-limiting login dans `server.ts`** | `server.ts:122-127,156-161` ; `backend/routes/auth.js:16` (`helmet`/`rateLimit` absents de `server.ts`, présents dans `backend/server.js:148-206`) | `ALLOWED_ORIGINS` ignorée par `server.ts` ; absence d'en-têtes `helmet` côté Express (partiellement compensée en prod par Nginx) et absence de protection anti-brute-force sur `POST /api/auth/login`. |
| **HAUTE** | **Documentation Swagger `/api-docs` exposée sans authentification** | `server.ts:183-187` | `/api-docs` et `/api-docs.json` restent accessibles sans `protect` ni restriction `Admin`. |
| **HAUTE** | **Contrôles d'accès incomplets / Mass Assignment / mot de passe en clair à la réinitialisation** | `backend/routes/rhPersonnelHistoryRoutes.js` ; `backend/controllers/incomingDocuments/detailControllers.js` ; `backend/controllers/scan/documentScanController.js` ; `backend/controllers/users/managementControllers.js` ; `backend/controllers/users/accountControllers.js` | Points signalés lors de l'audit statique nécessitant validation/durcissement ciblé sur les routes RH, scan, gestion utilisateurs et réinitialisation de mot de passe avant ouverture réseau. |
| **MOYENNE** | **Remédiations partiellement câblées (fichiers présents sur disk mais non appelés dans le flux actif)** | `backend/workers/aiWorker.js` (non appelé par `backend/services/ollamaService.js`) ; `backend/utils/documentVersionHelper.js` (non appelé par `incomingDocuments/.../documentUpdateController.js:112-123` qui utilise encore `fs.unlinkSync`) ; `backend/models/SemanticIndex.js:58-61` & `semanticIndexer.js:99` (`nomic-embed-text` par défaut sans `embeddingDimension`) ; `startIndexRetryScheduler()` absent de `server.ts` | L'inférence `node-llama-cpp` tourne toujours dans le processus principal Express, l'édition de fichier écrase toujours l'ancien PDF sur disque, et le rattrapage RAG automatique n'est pas déclenché dans `server.ts`. |

---

## 1. Inventaire détaillé des composants (`FAIT` observé dans le code)

### 1.1 Frontend (SPA React + Vite)
- **Framework & bibliothèques** : React `^18.3.1` (`package.json:89,93`), TypeScript `^5.5.3` (`package.json:138`), React Router `^6.26.2` (`package.json:98`), Tailwind CSS `^3.4.11` (`package.json:136`), i18next / react-i18next (`package.json:75,96`), Axios (`package.json:59`, configuré avec `VITE_API_URL || '/api'` dans `src/services/apiService.ts:4`).
- **Build & sortie** : `npm run build` exécute `vite build` (`package.json:11`), générant le bundle statique dans `dist/` (`server.ts:361`).
- **Mode dev vs prod** : En hors-production (`NODE_ENV !== 'production'`), `server.ts:354-359` monte `vite.middlewares` en mémoire ; en production (`NODE_ENV === 'production'`), `server.ts:360-366` sert `dist/` avec fallback SPA vers `dist/index.html` (ce qui permet aussi à un reverse proxy Nginx/IIS de servir `dist/` directement en amont).

### 1.2 Serveur de référence et commande réelle de démarrage
- **Serveur de référence** : `server.ts` à la racine du dépôt (`package.json:7-9`, `ecosystem.config.cjs:26`, `deploy/windows/install-service.ps1:55-62`). Il unifie Express `^5.2.1` (`package.json:70`), Socket.IO `^4.8.3` (`package.json:101`), les routes `./backend/routes/*` (`server.ts:201-235`), le service des fichiers protégés (`server.ts:169-177`), les tâches `node-cron` (`server.ts:83-116`), et la distribution du frontend Vite/`dist/` (`server.ts:366-383`).
- **Serveur historique secondaire** : `backend/server.js`, qui n'expose que l'API (pas le frontend SPA), active `helmet` (`backend/server.js:150`), `rateLimit` (`backend/server.js:174-206`), CORS restreint via `FRONTEND_URL` (`backend/server.js:65-73`) et `startIndexRetryScheduler()` (`backend/server.js:323`). Il est ciblé par `backend/Dockerfile.backend:25` mais **n'est pas** le point d'entrée utilisé par `ecosystem.config.cjs:26`, `deploy/ubuntu/deploy.sh` ni `deploy/windows/install-service.ps1`.
- **Commande réelle de démarrage** :
  - Scripts PM2 et NSSM existants : `./node_modules/.bin/tsx server.ts` (`ecosystem.config.cjs:26-27`, `deploy/windows/install-service.ps1:55-62`) et `npm run dev` (`package.json:7`).
  - Script `"start": "node server.ts"` (`package.json:9`) : **`[À VÉRIFIER]`**. `server.ts` contient des annotations de type TypeScript (`err: Error`, `_req: express.Request`, `interface AppError`, `server.ts:34,184,252`). Sans exécution de preuve sous la version exacte de Node 22 installée sur la cible (ex. `NODE_ENV=production PORT=${PORT} node server.ts` ou `node --experimental-strip-types server.ts`), le démarrage direct par `node server.ts` n'est pas garanti ; **recommander `tsx` (`./node_modules/.bin/tsx server.ts`) tant que `node server.ts` n'est pas prouvé**.
- **Port par défaut et variable `PORT`** :
  - `server.ts:318` : `const PORT = Number(portFromArgs || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));` — écoute sur `0.0.0.0:${PORT}` (`server.ts:393`).
  - `backend/server.js:354` : `const PORT = process.env.PORT || 5000;`.
  - **DÉCISION DU PROPRIÉTAIRE** : le choix définitif du port interne (`${PORT}`) reste `5000` dans les configurations de production (`ecosystem.config.cjs:42`, `.env.production.example:15`, Nginx/IIS, `deploy.sh:48`) vs `3000` par défaut dans `server.ts:318` (voir section 5).

### 1.3 Base de données MongoDB & Mongoose
- **Version MongoDB** :
  - `deploy/ubuntu/install-mongodb.sh:48-61` : détecte dynamiquement `jammy` (Ubuntu 22.04 → MongoDB **7.0**) ou `noble` (Ubuntu 24.04 → MongoDB **8.0**), surchargeable via `MONGO_VERSION`.
  - `docker-compose.yml:32` : utilise l'image `mongo:6.0` (artefact Docker obsolète).
  - Compatibilité exacte sur la VM cible avec Mongoose 9 : **`[À CONFIRMER]`** par le propriétaire.
- **ODM Mongoose** :
  - Racine (`package.json:81`) et `backend/package.json:21` : alignés sur `mongoose: ^9.10.2` (installable via `package-lock.json` à la racine).
  - Connexion (`backend/config/db.js:58-62`) : `directConnection: true` si URI locale/standalone (sans `+srv` ni `replicaSet`), `serverSelectionTimeoutMS: 5000` en production (`2000` hors prod), `socketTimeoutMS: 5000` ; `mongoose.set('bufferCommands', false)` (`server.ts:22`, `backend/config/db.js:3`).
- **Index principaux lus dans les schémas** :
  - `User` (`backend/models/User.js:10,65,70`) : `username` (`unique`), `lastSeen`, `isDeleted`.
  - `IncomingDocument` (`backend/models/IncomingDocument.js:93-100`) : `{ serialNumber: 1, year: 1 }` (`unique`), `assignedTo.id`, `dateActivity`, `createdAt: -1`, `{ year: 1, createdAt: -1, isDeleted: 1 }`, `{ "assignedTo.id": 1, year: 1, createdAt: -1 }`.
  - `OutgoingDocument` (`backend/models/OutgoingDocument.js:82-88`) : `{ serialNumber: 1, year: 1 }` (`unique`), `source.id`, `createdAt: -1`, `{ year: 1, createdAt: -1, isDeleted: 1 }`, `{ "source.id": 1, year: 1, createdAt: -1 }`.
  - `SemanticIndex` (`backend/models/SemanticIndex.js:72-89`) : `{ documentType: 1, documentId: 1 }` (`unique`, nom `unique_doc_idx`), `metadata.year`, `{ "metadata.departmentIds": 1, documentType: 1 }`, `{ "metadata.departmentId": 1, documentType: 1 }`.
  - `Personnel` (`backend/models/Personnel.js:161-164`) : `{ nom: 1, prenom: 1 }`, `cin` (`unique, sparse`), `statut`, `activeDepartment`.
  - Autres collections indexées (`FAIT` lu dans `backend/models/`) : `Attendance`, `Message`, `Folder`, `AuditLog`, `ResponsibleNotification`, `ActivityNotification`, `PersonnelDocument`, `RHStage`, `RHPromotion`, `RHPoste`, `RHDiplome`, `RHEcole`, `RHTypeFormation`, `LeaveReason`.

### 1.4 Temps réel (Socket.IO)
- `socket.io` `^4.8.3` monté sur `httpServer` dans `server.ts:119-130` (avec `cors: { origin: '*', methods: ['GET', 'POST'] }`).
- Logique dans `backend/sockets/index.js:4-85` :
  - Middleware JWT sur `socket.handshake.auth?.token || socket.handshake.query?.token` (`backend/sockets/index.js:9-35`).
  - Table en mémoire `userSockets` (`Map` locale au processus — **incompatible avec le mode cluster**, ce qui renforce l'exigence d'une instance unique).
  - Événements gérés : `user_connected`, `new_message` → `message_received`, `message_read` → `message_status_updated`, `disconnect` (`backend/sockets/index.js:44-84`).
  - Écart observé : `server.ts` ne transmet pas les événements `scannerService` (`scanStart`, `scanComplete`, `scanError`) vers `io`, contrairement à `backend/server.js:374,408-418`.

### 1.5 Intelligence Artificielle locale (`node-llama-cpp`, `.gguf`)
- **Moteur** : `node-llama-cpp` `^3.22.1` (`package.json:85`, `backend/package.json:24`), importé dynamiquement en ESM par `backend/services/ollamaService.js:49-55` (nom de service historique conservé, aucune dépendance à un serveur Ollama externe).
- **Modèles `.gguf` attendus** :
  - **Chat / Extraction / Résumé / Traduction** : `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` (`server.ts:321`, `backend/services/ollamaService.js:17-20`, `scripts/download-models.js:50`), avec fallback de détection `qwen2.5-7b-instruct-q4_k_m.gguf` dans `server.ts:327` (`MODELS.md:11` documente également Qwen 2.5 7B).
  - **Embeddings / RAG** : `bge-m3-q4_k_m.gguf` (`server.ts:322`, `backend/services/ollamaService.js:22-25`, `scripts/download-models.js:61`), avec fallback de détection `nomic-embed-text-v1.5.Q8_0.gguf` dans `server.ts:328`.
- **Chargement et exécution** :
  - Au démarrage de `server.ts:67-80`, un `setTimeout(..., 5000)` appelle `checkOllamaHealth()` qui déclenche `initModels()` (`backend/services/ollamaService.js:60`) si les deux fichiers existent.
  - `initModels()` (`backend/services/ollamaService.js:60-124`) charge en singleton dans le processus principal `chatModel` (`contextSize: 2048`, `threads: LLAMA_THREADS`, `gpuLayers: LLAMA_GPU_LAYERS`) puis `embeddingModel` (`threads: LLAMA_THREADS`, `gpuLayers: LLAMA_GPU_LAYERS`). Un module worker IPC isolé `backend/workers/aiWorker.js` (incluant `embeddingDimension`) existe sur disque mais n'est pas encore câblé dans `ollamaService.js`.
  - `SemanticIndex` (`backend/models/SemanticIndex.js:58-61`) et `semanticIndexer.js:99` conservent encore `embeddingModel: 'nomic-embed-text'` par défaut sans champ `embeddingDimension` persisté en schéma.
  - `ecosystem.config.cjs:28-31` impose `exec_mode: 'fork'` et `instances: 1` pour éviter de dupliquer les ~5 Go de modèles en RAM.

### 1.6 Pipeline OCR et manipulation PDF/Images
- Implémentation active dans `backend/utils/ocrProcessor.js` (appelée lors de l'upload via `backend/utils/fileUploadHandler.js:4,51`) :
  - Conversion PDF → PNG **300 DPI** (`OCR_DPI = 300`, `DEFAULT_MAX_PAGES = 50`, `SUBPROCESS_TIMEOUT_MS = 60000`, `SUBPROCESS_MAX_BUFFER = 10 MiB` dans `backend/utils/ocrProcessor.js:11-14`) : binaire système `pdftoppm` (`poppler-utils` sous Linux, Poppler sous Windows), exécuté via `runBinary` (`execFile` sans shell, `:64-100`).
  - Prétraitement d'image : ImageMagick (`convert` sous Linux, `magick` sous Windows), avec repli sur l'image brute en cas d'échec.
  - Reconnaissance optique : binaire système `tesseract` (`--list-langs`, stratégies multi-PSM avec `ara`, `fra`, `eng`).
  - Repli texte natif : package npm `pdf-parse` (`backend/utils/ocrProcessor.js:1`). (`tesseract.js` est présent dans `package.json:107` mais non utilisé par `backend/utils/ocrProcessor.js`).
- Conversion scan → PDF sous Linux (`backend/utils/scanner/linux/pdfConverter.js:15-50`, `scanExecutor.js`) : binaire `img2pdf` prioritaire, sinon package npm `pdfkit`. Sous Windows (`backend/utils/scanner/windows/pdfProcessor.js:3,15-48`) : `pdfkit`.

### 1.7 Pilotage du scanner local
- Abstraction OS dans `backend/utils/scanner/index.js:9-23` :
  - **Linux** : `scanimage` (`sane-utils`) pour détection (`scanimage -L`, `backend/utils/scanner/linux/scannerDetection.js:89`) et acquisition (`scanimage --device=...`, `backend/utils/scanner/linux/scanExecutor.js:75-78,142-145`).
  - **Windows** : COM `WIA.DeviceManager` invoqué via `powershell` (`backend/utils/scanner/windows/scannerDetection.js:19,60` et `scanExecutor.js:42,76`), avec mode simulation fallback (`backend/utils/scanner/windows/windowsScanner.js:19,120`).
- Piloté par `SCANNER_ENABLED`, `SCANNER_DEVICE_ID`, `SCANNER_RESOLUTION`, `SCANNER_FORMAT` (`backend/utils/scanner/config/scannerConfig.js:15-18`).

### 1.8 Files d'attente (Redis / Bull) — NON BRANCHÉ
- `backend/jobs/ocrQueue.js:1-34` et `backend/jobs/ocrProcessor.js:1-120` définissent une file `Bull` connectée à Redis (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`).
- **FAIT vérifié** : ni `bull` ni `redis` ne sont déclarés dans `package.json:24-111` ou `backend/package.json:10-31`, et aucun contrôleur, route ni `server.ts` / `backend/server.js` n'importe `backend/jobs/ocrQueue.js` ou `backend/jobs/ocrProcessor.js`. Le traitement OCR à l'upload s'exécute directement dans le processus Node via `backend/utils/fileUploadHandler.js:51`. **Redis n'est donc pas requis en l'état du code.**

### 1.9 Tâches planifiées (`node-cron` et systemd)
- Dans `server.ts` (en processus, via `node-cron` `^4.6.0`, `package.json:83`) :
  1. `startBackupScheduler()` (`server.ts:84-90`, `backend/services/backupScheduler.js:31-97`) : déclenché selon la collection `BackupPolicy` en MongoDB (défaut `0 2 * * *`), lance `mongodump` + archive ZIP (`backend/controllers/backup.js:164-201`) + purge selon `retentionCount`.
  2. `startCleanupScheduler()` (`server.ts:97-98`, `backend/services/cleanupScheduler.js:73-90`) : tous les jours à `02:00` (`0 2 * * *`), supprime les fichiers temporaires de plus de 24h.
  3. Notification quotidienne d'activité (`server.ts:105-110`) : tous les jours à `08:00` (`0 8 * * *`), exécute `checkDailyNotifications()`.
  4. **Non démarré dans `server.ts`** : `startIndexRetryScheduler()` (`backend/services/indexRetryScheduler.js:233-252`, variable `INDEX_RETRY_CRON`, défaut `0 * * * *`) est appelé dans `backend/server.js:323` mais **absent de `server.ts`**.
- Au niveau système Ubuntu : `deploy/ubuntu/systemd/dms-backup.timer` (`OnCalendar=*-*-* 02:00:00`) déclenche `deploy/ubuntu/systemd/dms-backup.service` (`ExecStart=/bin/bash /var/www/dms/deploy/scripts/backup-all.sh /var/backups/dms 14`).

---

## 2. Flux réseau et cartographie des chemins de fichiers

### 2.1 Flux de requêtes
```text
Navigateur utilisateur (HTTPS :443 / HTTP :80 -> redirect 301)
   │
   ├──► Reverse Proxy (Ubuntu: Nginx | Windows: IIS + URL Rewrite + ARR)
   │       ├── /                 ──► Fichiers statiques SPA (dist/ ou proxy Node)
   │       ├── /api/*            ──► Proxy HTTP/1.1 -> 127.0.0.1:${PORT} (timeouts >= 300s IA/OCR)
   │       ├── /socket.io/*      ──► Proxy WebSocket (Upgrade) -> 127.0.0.1:${PORT}
   │       ├── /courrier/*       ──► Proxy obligatoirement vers Node 127.0.0.1:${PORT} (JWT Express)
   │       └── /uploads/*        ──► Proxy obligatoirement vers Node 127.0.0.1:${PORT} (JWT Express)
   │
   └──► Processus Node.js unique (`server.ts` via `tsx`, PM2 fork=1 / NSSM, 127.0.0.1:${PORT})
           ├── MongoDB (`127.0.0.1:27017`, Mongoose + `mongodump`/`mongorestore`)
           ├── IA locale (`node-llama-cpp` -> `./models/*.gguf` ou `LLAMA_*_MODEL_PATH`)
           ├── OCR / PDF (`tesseract`, `pdftoppm`, `magick`/`convert`, `pdf-parse`)
           ├── Scanner (`scanimage` + `img2pdf` Linux / PowerShell `WIA.DeviceManager` Windows)
           └── Stockage local (`courrier/`, `uploads/`, `backups/`, `logs/`, `tmp`)
```

### 2.2 Chemins des fichiers : résolution, variable de pilotage et exposition HTTP

| Dossier logique | Chemin à l'écriture (réel dans le code) | Chemin à la lecture / scripts | Variable(s) d'env | Relatif ou absolu | Mode de service HTTP (`server.ts`) |
|---|---|---|---|---|---|
| **Courriers PDF** | `path.join(__dirname, '..', 'courrier', year, docType)` → `backend/courrier/<année>/Incoming-Doc\|Outgoing-Doc` (`backend/utils/documentHelper.js:62-70`) *(remplacement in-place via `fs.unlinkSync` dans `documentUpdateController.js:117` ; `documentVersionHelper.js` non branché)* | `process.env.DOCUMENT_PATH \|\| path.join(__dirname, '../../backend/courrier')` (`backend/controllers/fileController.js:43,85-86`) | `DOCUMENT_PATH` (lue en lecture et scripts `backup-all.sh`/`check-env.mjs`, **ignorée en écriture**) | Relatif à `__dirname` (écr.) ; absolu si `DOCUMENT_PATH` (lect.) | **Authentifié** : `GET /api/files/:type/:id/:filename` (`protect` + RBAC dept, `server.ts:169`) et `/courrier` (`protect`, `server.ts:172`) |
| **Uploads (pièces jointes, modèles, temp)** | `path.join(__dirname, '..', 'uploads')` → `backend/uploads/{attachments,templates,temp}` (`backend/middleware/upload.js:6-9,70,87`) ; scanner : `UPLOAD_PATH \|\| './uploads'` (`scannerConfig.js:11`) | `process.env.UPLOAD_DIR \|\| uploadDir` dans `handleScannedDocument` (`backend/middleware/upload.js:145`) ; `backend/routes/messages.js:58` en dur | `UPLOAD_DIR`, `UPLOAD_PATH` (alignés dans `.env.production.example:57-58` et scripts, **ignorés par Multer**) | Relatif à `__dirname` (Multer) ou à `cwd` (`scannerConfig.js`) | **Authentifié** : `/uploads` (`protect` + `express.static`, `server.ts:177`) et `/api/messages/attachments/:filename` (`protect` + sender/recipient, `backend/routes/messages.js:55-94`) |
| **Photos (utilisateurs & personnel)** | `backend/uploads/usersphoto`, `backend/uploads/personnelphoto` (`backend/middleware/upload.js:7-8`) | `path.join(process.cwd(), 'backend', 'uploads/usersphoto\|personnelphoto')` (`server.ts:175-176`) | Aucune | Relatif à `__dirname` / `cwd` | **Authentifié** : `/uploads/usersphoto` et `/uploads/personnelphoto` protégés par `protect` (`server.ts:175-176`) |
| **Fichiers temporaires** | `backend/uploads/temp` (`upload.js:9`), `./uploads/temp` (`scannerConfig.js:12`), `backend/uploads/temp` via `getAppTempRoot()` (`ocrProcessor.js:19-30`) | Purgé par `cleanupScheduler.js:17-22` (> 24h à 02:00) | `UPLOAD_PATH` / `UPLOAD_DIR` | Mixte (`__dirname`, `cwd`) | Non servis directement |
| **Sauvegardes** | API/contrôleur : `exportPath \|\| path.join(process.cwd(), 'backups')` (`backup.js:176`) ; Scheduler : `BACKUP_DIR \|\| path.join(cwd, 'backups')` (`backupScheduler.js:12`) | Download/Delete API : `BACKUP_PATH \|\| path.join(cwd, 'backups')` (`backup.js:678,731`) ; Scripts : `BACKUP_DIR`/`BACKUP_PATH`/`BACKUP_ROOT` (défaut `/var/backups/dms`) | `BACKUP_DIR`, `BACKUP_PATH`, `BACKUP_ROOT` (unifiés dans `.env.production.example:63-65` et les scripts `deploy/`) | Relatif à `cwd` (contrôleur) / `/var/backups/dms` (scripts) | Téléchargement authentifié Admin via `/api/backup/download/:id` (`backend/routes/backup.js`, `backup.js:657-697`) |
| **Modèles IA (`.gguf`)** | Téléchargement via `scripts/download-models.js:33` vers `path.join(process.cwd(), 'models')` | `LLAMA_CHAT_MODEL_PATH` / `LLAMA_EMBEDDING_MODEL_PATH`, sinon `backend/../models` (`ollamaService.js:14`) ou `cwd/models` (`server.ts:322`) | `LLAMA_CHAT_MODEL_PATH`, `LLAMA_EMBEDDING_MODEL_PATH` | Relatif à `cwd`/`__dirname` par défaut ; absolu conseillé | Jamais servis par HTTP |

---

## 3. Schéma texte et matrice des composants

```text
+-----------------------------------------------------------------------------------+
| POSTE CLIENT (Navigateur)                                                         |
|  - SPA React (Vite build `dist/`) + Axios (`withCredentials: true`, localStorage) |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS :443 (TLS) / HTTP :80 -> 301
                                          v
+-----------------------------------------------------------------------------------+
| REVERSE PROXY LOCAL (Ubuntu: Nginx | Windows: IIS + URL Rewrite + ARR)            |
|  - Sert `dist/` (ou relaie vers Node)                                             |
|  - Relaie /api, /socket.io (WS), /courrier, /uploads -> 127.0.0.1:${PORT}         |
|  - client_max_body_size 50M (Nginx) / maxAllowedContentLength 52428800 (IIS)      |
+-----------------------------------------+-----------------------------------------+
                                          | HTTP/1.1 + WebSocket (127.0.0.1:${PORT})
                                          v
+-----------------------------------------------------------------------------------+
| SERVEUR NODE.JS UNIFIÉ (`server.ts` via `tsx`, 1 instance fork PM2 / NSSM)        |
|  - Express 5 + Socket.IO + node-cron (backup 02h, cleanup 02h, notifs 08h)        |
|  - Contrôleurs API (/api/*), fichiers protégés (/api/files, /courrier, /uploads)  |
|  - Inférence IA in-process (`node-llama-cpp` -> ALLaM 7B + BGE-M3 .gguf)          |
+------+------------------------+---------------------------+-----------------------+
       |                        |                           |
       v                        v                           v
+--------------+     +------------------------+    +--------------------------------+
| MongoDB      |     | BINAIRES SYSTÈME       |    | STOCKAGE DISQUE LOCAL          |
| 127.0.0.1    |     | - tesseract (ara+fra)  |    | - backend/courrier/            |
| :27017       |     | - pdftoppm (Poppler)   |    | - backend/uploads/             |
| (Mongoose 9) |     | - magick / convert     |    | - models/*.gguf (~4.7 Go)      |
| + mongodump  |     | - scanimage / img2pdf  |    | - backups/ & logs/             |
|              |     |   ou PowerShell WIA    |    |                                |
+--------------+     +------------------------+    +--------------------------------+
```

| Composant | Rôle | Dépendance système / NPM | Variable d'environnement | Référence (`fichier:ligne`) |
|---|---|---|---|---|
| **Frontend SPA** | Interface React FR/AR (RTL/LTR) | Vite `5.4.1`, React `18.3.1`, build `dist/` | `VITE_API_URL` (optionnelle, défaut `/api`) | `package.json:11,89,141` ; `src/services/apiService.ts:4` ; `server.ts:361-365` |
| **Serveur HTTP / API** | API REST, routage fichiers, cron, SPA | Node.js `>=22`, `tsx`, Express `5.2.1` | `NODE_ENV`, `PORT` | `server.ts:1,115,316,354-379` ; `deploy/scripts/check-env.mjs:48-56` |
| **Base de données** | Persistance documents, RH, utilisateurs, RAG | `mongod`, `mongosh`, `mongodump`, `mongorestore`, Mongoose `^9.10.2` | `MONGODB_URI` | `backend/config/db.js:47-68` ; `package.json:81` ; `deploy/ubuntu/install-mongodb.sh:38` |
| **Auth & Sessions** | Signature/validation JWT + cookies HTTP-only | `jsonwebtoken`, `bcryptjs`, `cookie-parser` | `JWT_SECRET`, `JWT_EXPIRE`, `JWT_COOKIE_EXPIRE` | `server.ts:53-64` ; `backend/models/User.js:108-116` ; `backend/controllers/auth/utils.js:3-25` |
| **Temps réel** | Messagerie et notifications instantanées | `socket.io` `^4.8.3` | (hérite `JWT_SECRET`, `PORT`) | `server.ts:119-130` ; `backend/sockets/index.js:4-85` |
| **IA locale (LLM + RAG)** | Extraction JSON, résumé, traduction, embeddings | `node-llama-cpp` `^3.22.1`, `build-essential`/`cmake` ou VS Build Tools C++ | `LLAMA_CHAT_MODEL_PATH`, `LLAMA_EMBEDDING_MODEL_PATH`, `LLAMA_THREADS`, `LLAMA_GPU_LAYERS` | `backend/services/ollamaService.js:17-124` ; `server.ts:42-47,67-80,319-339` |
| **OCR & PDF** | Extraction texte arabe/français des PDF scannés | `tesseract-ocr` (`ara`, `fra`, `eng`), `poppler-utils` (`pdftoppm`), `ImageMagick` (`convert`/`magick`), `pdf-parse` | Aucune dédiée | `backend/utils/ocrProcessor.js:48-52,119-121,301-303,493-496` |
| **Scanner local** | Numérisation directe poste/serveur | Linux : `sane-utils` (`scanimage`), `img2pdf` (opt.) ; Windows : WIA COM via PowerShell | `SCANNER_ENABLED`, `SCANNER_DEVICE_ID`, `SCANNER_RESOLUTION`, `SCANNER_FORMAT`, `UPLOAD_PATH` | `backend/utils/scanner/index.js:9-23` ; `scannerConfig.js:11-18` ; `linux/scanExecutor.js` ; `windows/scannerDetection.js` |
| **Supervision / Service** | Maintien en vie, logs, redémarrage | Ubuntu : `pm2` ; Windows : `nssm` | `NODE_ENV`, `PORT` | `ecosystem.config.cjs:22-51` ; `deploy/windows/install-service.ps1:64-100` |
| **Reverse Proxy** | TLS/HTTPS, compression, limites upload, WebSocket | Ubuntu : `nginx` ; Windows : IIS + URL Rewrite + ARR + WebSocket | Aucune dans Node (`ALLOWED_ORIGINS` ignorée par `server.ts`) | `deploy/ubuntu/dms.nginx.conf` ; `dms.nginx.conf` ; `deploy/windows/web.config` |
| **Planificateur** | Sauvegardes BDD/ZIP, purge temp, notifs | `node-cron`, `mongodump`, `systemd` timer (Ubuntu) | `BACKUP_DIR`, `BACKUP_PATH` | `server.ts:83-113` ; `backupScheduler.js` ; `cleanupScheduler.js` ; `deploy/ubuntu/systemd/dms-backup.timer` |
| **Files Redis/Bull** | File OCR asynchrone (code mort) | Redis + `bull` *(non installés ni branchés)* | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` *(inutilisées)* | `backend/jobs/ocrQueue.js:1-19` ; `backend/jobs/ocrProcessor.js:1-120` |

---

## 4. Exigences matérielles déduites du code

- **OCR & PDF** :
  - `ecosystem.config.cjs:34` fixe `max_memory_restart: '6G'` pour le seul processus `dms-backend` (`server.ts`, mode `fork` à `1` instance obligatoire, lignes `28-31`).
  - `server.ts:80` indique le chargement de `~5 Go` pour les modèles IA au démarrage.
  - `scripts/download-models.js:55-67` attend ALLaM 7B (`~4.26 Go`, seuil min `3.0 Go`) et BGE-M3 (`~417 Mo`, seuil min `300 Mo`).
  - `MODELS.md:17` recommande **16 Go de RAM minimum** sur Server (**18–24 Go** avec bureau GNOME Desktop actif) pour héberger le chat 7B (~4.5–5.5 Go RAM), les embeddings (~500 Mo RAM), MongoDB, Nginx/IIS et l'OS.
  - Pics mémoire additionnels lors de l'OCR à **300 DPI** (`pdftoppm -png -r 300` + ImageMagick dans `backend/utils/ocrProcessor.js:11`) : **`[À CONFIRMER]`** selon le nombre de pages et la concurrence d'utilisation.
- **CPU** :
  - `server.ts:44` calcule automatiquement `LLAMA_THREADS = Math.max(1, Math.floor(os.cpus().length / 2))` (cœurs physiques).
  - `.env.production.example:77` et `MODELS.md:17` retiennent **`4` cœurs CPU minimum** (`LLAMA_THREADS=4`). **`[À CONFIRMER]`** selon les temps de réponse tolérés sur l'inférence CPU.
- **GPU (optionnel)** :
  - Par défaut `LLAMA_GPU_LAYERS=0` (exécution 100 % CPU, `.env.production.example:80`, `backend/services/ollamaService.js:28`). Si un GPU compatible CUDA/Vulkan est présent, `LLAMA_GPU_LAYERS > 0` active `gpu: 'auto'` (`backend/services/ollamaService.js:86`).
- **Disque** :
  - ~`4.7 Go` à `5 Go` minimum pour les 2 modèles `.gguf` (`scripts/download-models.js:56,66` ; `MODELS.md:11-12`), plus les dépendances npm (avec binaires natifs `node-llama-cpp`), la base MongoDB, les archives `courrier/`, `uploads/` et la rétention de `backups/` (14 jours dans les scripts). Capacité totale **`[À CONFIRMER]`** selon la volumétrie documentaire annuelle.

---

## 5. Écarts, incohérences et état des correctifs de déploiement (`FAIT`)

1. **Incohérence de port `3000` vs `5000` (`DÉCISION DU PROPRIÉTAIRE`)** :
   - `server.ts:318` prend `3000` par défaut si `PORT` est absent ou vaut `'8080'`. `.env.example:1` et `vite.config.ts:14,17` utilisent `3000`.
   - `5000` est utilisé en production dans `backend/server.js:354`, `.env.production.example:15`, `ecosystem.config.cjs:42`, `deploy/ubuntu/dms.nginx.conf:7`, `dms.nginx.conf:89`, `deploy/ubuntu/deploy.sh:48`, `deploy/ubuntu/rollback.sh:31`, `deploy/windows/install-service.ps1:83`, `deploy/windows/web.config:30,39,45,51,57` et `deploy/scripts/check-env.mjs:38`.
   - `deploy/ubuntu/setup-system.sh:148-149` bloque désormais **à la fois `3000/tcp` et `5000/tcp`** dans UFW, et `deploy.sh` / `rollback.sh` lisent dynamiquement `${PORT:-5000}` depuis `.env`.
2. **Script `"start": "node server.ts"` (`package.json:9`) — `[À VÉRIFIER]`** :
   - `server.ts` est en TypeScript avec typage explicite (`server.ts:34,184,252`). Commande de test avant basculement : `NODE_ENV=production PORT=${PORT} node server.ts` (ou `--experimental-strip-types`). **Conserver `tsx` (`./node_modules/.bin/tsx server.ts`) tant que `node server.ts` n'est pas prouvé.**
3. **Variables d'environnement documentées mais encore ignorées par `server.ts`** :
   - `ALLOWED_ORIGINS` (`.env.production.example:44`) : **ignorée** par `server.ts:157` (`origin: true`) et `server.ts:124` (`origin: '*'`).
   - `AI_WARMUP` (`.env.production.example:84`) : **ignorée** par `server.ts:67-80` (le préchargement démarre toujours après 5s).
   - `INDEX_RETRY_CRON` (`.env.production.example:87`) : lue dans `backend/services/indexRetryScheduler.js:239`, mais `startIndexRetryScheduler()` n'est **pas appelée** par `server.ts` (seulement dans `backend/server.js:323`).
4. **Chemins de stockage et scripts harmonisés vs écriture applicative** :
   - `DOCUMENT_PATH` : honorée à la lecture (`backend/controllers/fileController.js:43,86`) et par `backup-all.sh:70` / `restore-all.sh:152` / `check-env.mjs:148`, **mais ignorée à l'écriture** (`backend/utils/documentHelper.js:62-70` écrit toujours dans `backend/courrier/<année>/<type>`).
   - `UPLOAD_DIR` / `UPLOAD_PATH` & `BACKUP_DIR` / `BACKUP_PATH` / `BACKUP_ROOT` : harmonisés dans `.env.production.example:57-65` et les scripts `deploy/ubuntu/deploy.sh`, `deploy/scripts/backup-all.sh`, `deploy/scripts/restore-all.sh`, `deploy/scripts/check-env.mjs` (`/var/backups/dms`), même si Multer (`upload.js:6-9`) et `backup.js` conservent leurs repli relatifs en code applicatif.
5. **Correctifs de déploiement appliqués dans le dépôt (`FAIT` — à valider sur VM cible)** :
   - `package-lock.json` généré à la racine (permet `npm ci` dans `deploy.sh:67`) et `backend/package.json` aligné avec la racine (`express ^5.2.1`, `mongoose ^9.10.2`, `helmet ^8.3.0`, `express-rate-limit ^8.7.0`).
   - `deploy/ubuntu/setup-system.sh` : attente de verrou APT/DPKG (`wait_for_apt_lock`), ajout d'`imagemagick` et `img2pdf` (`:86-88`), groupes `scanner` & `lp` pour `dms` (`:99-103`), création `/var/backups/dms` (`:136-138`) et `ufw deny 3000` + `5000` (`:148-149`).
   - `deploy/ubuntu/install-mongodb.sh` : sélection dynamique `jammy -> 7.0` / `noble -> 8.0` (`:48-61`), URI corrigée en `?authSource=document-management` (`:141`) cohérente avec `.env.production.example:23`.
   - `deploy/ubuntu/dms.nginx.conf:72,82` : ajout de **`^~`** sur `location ^~ /courrier/` et `location ^~ /uploads/` pour éviter l'interception par la règle regex statique `:142`.
   - `deploy/ubuntu/deploy.sh`, `rollback.sh`, `deploy/scripts/backup-all.sh` & `restore-all.sh` : chargement automatique du `.env` racine, `PORT` et `BACKUP_*` dynamiques, et correction du `sed` dans `restore-all.sh:130` pour préserver `?authSource=document-management`.
6. **Artefacts secondaires et scripts Windows incomplets (`FAIT`)** :
   - **Nginx / Docker secondaires** : `/dms.nginx.conf` (Let's Encrypt) et `/nginx/default.conf` (Docker, sans `/courrier` ni `/uploads`) ; `docker-compose.yml`, `Dockerfile.frontend`, `backend/Dockerfile.backend` ciblent l'ancien `backend/server.js` avec `mongo:6.0`.
   - **Windows Server** : `deploy/windows/install-prereqs.ps1` ne couvre pas ImageMagick, URL Rewrite 2.1 / ARR 3.0, liaison HTTPS IIS ni règles pare-feu Windows, et aucun `deploy.ps1` / `rollback.ps1` / `restore-all.ps1` n'existe sous `deploy/windows/`.
   - **Protection path traversal `serveProtectedFile`** (`backend/controllers/fileController.js:44,68`) : impose `targetFile.startsWith(ALLOWED_ROOT)` où `ALLOWED_ROOT = path.resolve(process.cwd())`, ce qui bloquerait un `DOCUMENT_PATH` déplacé hors du répertoire applicatif.
