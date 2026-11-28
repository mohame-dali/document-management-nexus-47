# Architecture réelle du DMS — Référence technique & RBAC

> **Statut du document** : Architecture vérifiée dans le code source (`server.ts`, `src/`, `backend/`, `ecosystem.config.cjs`, `deploy/`). Cible de production Ubuntu 24.04 LTS : **`172.16.90.131`** sous **`/var/www/dms`**.

---

## 0. État de sécurité & contrôles actifs (`FAIT`)

> **Rappel d'exploitation** : L'application traite des données administratives et RH sensibles (courriers, dossiers du personnel, pièces d'identité/CIN, sanctions, assiduité). Vérifier avant toute exposition réseau la configuration `.env`, le compte administrateur initial (`backend/scripts/create-superadmin.js`) et les règles Nginx/UFW.

### Contrôles durcis dans le code actif (`server.ts` & `backend/`)
- **Refus strict MongoDB hors ligne (`backend/config/db.js` ; `backend/controllers/auth/loginController.js` ; `backend/middleware/auth.js:43-60` ; `server.ts:385-422,470-480`)** : En `NODE_ENV=production`, `server.ts` s'arrête (`exit(1)`) si MongoDB est injoignable au démarrage, `protect` et le gestionnaire d'erreurs global renvoient **`HTTP 503`** si la base tombe, sans aucun fallback ni auth mock.
- **Bootstrap administrateur CLI (`backend/scripts/create-superadmin.js:1-175`)** : script interactif TTY avec saisie masquée et mot de passe fort (>= 12 caractères, minuscule/majuscule/chiffre) créant le premier compte `Admin`.
- **Protection des fichiers, dossiers sensibles & Swagger (`server.ts:276-305`)** : `/api/files/:type/:id/:filename`, `/courrier`, `/uploads/usersphoto`, `/uploads/personnelphoto` et `/uploads` sont protégés par `protect` ; `/uploads/attachments`, `/uploads/temp` et `/uploads/templates` renvoient **`403`** en accès direct ; `/api-docs` et `/api-docs.json` exigent `protect, authorize('Admin')`.
- **CORS, Helmet, NoSQL Sanitize & Rate-Limiting (`server.ts:124-269`)** : `app.set('trust proxy', 1)`, liste blanche dynamique `ALLOWED_ORIGINS` sur Express et Socket.IO, en-têtes `helmet` (`hsts` en production), `express-mongo-sanitize` (Express 5), `globalLimiter` et `loginLimiter` (5 tentatives / 15 min sur `POST /api/auth/login`), et arrêt fatal si `JWT_SECRET` est absent en production (`server.ts:53-58`).
- **Protection Tableau de bord Exécutif & RH (`backend/middleware/auth.js:165-243`)** : `/api/dashboard/summary` et `/api/dashboard/stats` exigent `authorizeExecutiveDashboard` (`Admin` / `Director`, sinon **`403`**) ; `/api/hr/*` exige `checkRHAccess` (`Admin`, `Director`, ou `AdminDepartment` rattaché à `OrganizationSettings.rhDepartmentId`).
- **Sous-processus OCR, Scanner & Worker IA isolé (`backend/utils/ocrProcessor.js` ; `backend/utils/scanner/linux/scanExecutor.js` ; `backend/workers/aiWorker.js`)** : OCR/scan via `execFile` sans interpolation shell (`OCR_DPI = 300`, timeout `60s`, buffer 10 Mio), inférence `node-llama-cpp` isolée en processus fils IPC (`aiWorker.js`) avec arrêt propre `shutdownAIWorker()` (`server.ts:539-543`), ordonnanceur `startIndexRetryScheduler()` actif (`server.ts:87-95`), et versioning immuable des courriers numérisés (`backend/utils/documentVersionHelper.js`).

---

## 1. Inventaire détaillé des composants (`FAIT` observé dans le code)

### 1.1 Frontend (SPA React + Vite), Navigation & RBAC

- **Framework & bibliothèques** : React `^18.3.1`, TypeScript `^5.5.3`, React Router `^6.26.2`, Tailwind CSS `^3.4.11`, i18next / react-i18next (FR / AR avec direction RTL/LTR dynamique, `Cairo` / `Inter`, `tabular-nums`), Axios (`VITE_API_URL || '/api'` dans `src/services/apiService.ts`).
- **Build & sortie** : `npm run build` exécute `vite build`, générant le bundle statique dans `dist/`. En développement (`NODE_ENV !== 'production'`), `server.ts:484-494` monte `vite.middlewares` ; en production (`NODE_ENV === 'production'`), `server.ts:495-501` sert `dist/` avec fallback SPA vers `dist/index.html`.
- **Architecture de navigation (barre latérale à 7 entrées principales + hub Administration)** :

| Entrée / Module | Route(s) canonique(s) | Rôles autorisés (`src/` & `backend/`) | Capacités clés finalisées |
|---|---|---|---|
| **Tableau de bord exécutif** | `/dashboard` | **`Admin`**, **`Director`** (`Directeur`) — `403` backend pour les autres rôles | KPIs de goulets d'étranglement, courriers urgents/en retard ou sans responsable ; les rôles non exécutifs (`AdminDepartment`, `AdminTuningDesk`, `User`) atterrissent directement sur **`/dashboard/mail/incoming`**. |
| **Courrier & Documents** | `/dashboard/mail/{incoming,outgoing,search}` | Tous (création/édition `Admin`, `AdminTuningDesk` ; lecture/traitement selon département) | Formulaires à divulgation progressive, autocomplétion intelligente des organismes, suggestion de sujet OCR/IA en 1 clic, actions rapides au survol (tiroir PDF latéral, copie référence 1 clic, affectation rapide), classement dossiers en ligne/lot, déduplication audit `document_view` de **10 minutes** (`backend/utils/auditLogger.js`). |
| **Archives & Dossiers** | `/dashboard/folders` *(redirect depuis `/dashboard/mail/folders`)* | Tous (isolation par département pour `AdminDepartment`/`User`) | Explorateur d'archives **Master-Detail** à deux volets promu au premier niveau de la barre latérale. |
| **Ressources Humaines** | `/dashboard/hr/{personnel,attendance,all-personnel-situation,stages}` & `/dashboard/hr/attendance/report` | `Admin`, `Director`, et `AdminDepartment` du département RH configuré (`rhDepartmentId`) | Hub à **4 onglets** (`Personnel`, `Registre de présence` matriciel en 1 clic avec visibilité cloisonnée par département, `Situation globale`, `Stages`), + rapport mensuel imprimable `@media print` **A4 paysage**. |
| **Administration & Modèles** *(« الإدارة والنماذج » / « Administration & Modèles »)* | `/dashboard/organization/{templates,chart,settings,document-options}` | Tous (`templates`, `chart`) ; `settings` (`Admin`) ; `document-options` (`AdminTuningDesk` / `Admin`) | Hub unifié regroupant la galerie de modèles sur 3 colonnes, l'organigramme interactif (annuaire / arbre) et les réglages ciblés. Redirections rétrocompatibles depuis `/dashboard/tools/templates`, `/dashboard/tools/document-options`, `/dashboard/organization-chart` et `/dashboard/admin/organization-chart`. |
| **Profil & Présence** | `/dashboard/profile/{my-profile,my-attendance}` | Tous les utilisateurs authentifiés | Profil personnel, calendrier individuel de présence et suivi du solde de congés. |
| **Messagerie & Corbeille** | `/dashboard/messages` · `/dashboard/trash` | Messagerie : Tous · Corbeille : `Admin`, `AdminTuningDesk`, `AdminDepartment` | Messagerie interne temps réel Socket.IO et **corbeille persistante isolée par utilisateur** (`backend/controllers/trashController.js`). |
| **Administration système** *(Hub 5)* | `/dashboard/admin/{users,departments,audit-trail,settings,guide}` | `Admin`, `Director` (`settings` réservé `Admin`) | Gestion des utilisateurs, départements, piste d'audit, sauvegardes/rétention et guide d'installation. |

### 1.2 Serveur de référence et commande réelle de démarrage
- **Serveur de référence** : `server.ts` à la racine du dépôt (`package.json:7-9`, `ecosystem.config.cjs:25-27`, `deploy/windows/install-service.ps1:55-62`). Il unifie Express `^5.2.1`, Socket.IO `^4.8.3`, les routes `./backend/routes/*` (`server.ts:320-352`), les fichiers protégés (`server.ts:276-296`), les tâches `node-cron` (`server.ts:85-119`), et le frontend Vite/`dist/` (`server.ts:484-501`).
- **Serveur historique secondaire** : `backend/server.js`, qui n'expose que l'API (ciblé uniquement par `backend/Dockerfile.backend`), **n'est pas** utilisé par `ecosystem.config.cjs`, `deploy/ubuntu/deploy.sh` ni `deploy/windows/install-service.ps1`.
- **Exécution recommandée** : **Node.js `v22.22.1`** (`>= 22.x`) avec **`./node_modules/.bin/tsx server.ts`** via `ecosystem.config.cjs` (`exec_mode: 'fork'`, `instances: 1`, `name: 'dms-backend'`).
- **Port interne de production** : **`PORT=5000`** (`ecosystem.config.cjs:42`, `deploy/ubuntu/dms.nginx.conf`, `deploy/scripts/check-env.mjs:38`). (`server.ts:436` utilise `3000` par défaut en développement local hors `PORT`.)

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
- **Moteur** : `node-llama-cpp` `^3.22.1` (`package.json:85`, `backend/package.json:24`), exécuté dans un worker IPC isolé (`backend/workers/aiWorker.js` piloté par `backend/services/ollamaService.js`, aucune dépendance à un serveur Ollama externe).
- **Modèles `.gguf` attendus** :
  - **Chat / Extraction / Résumé / Traduction** : `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` (`server.ts:441`, `backend/services/ollamaService.js`, `scripts/download-models.js:50`), avec repli détecté `qwen2.5-7b-instruct-q4_k_m.gguf` (`server.ts:447`, [`MODELS.md`](../MODELS.md)).
  - **Embeddings / RAG** : `bge-m3-q4_k_m.gguf` (`server.ts:442`, `backend/services/ollamaService.js`, `scripts/download-models.js:61`), avec repli détecté `nomic-embed-text-v1.5.Q8_0.gguf` (`server.ts:448`).
- **Chargement et exécution** :
  - Au démarrage de `server.ts:67-82`, si `DISABLE_AI_WARMUP !== 'true'`, un `setTimeout(..., 5000)` appelle `checkOllamaHealth()` pour précharger `chatModel` (`LLAMA_CONTEXT_SIZE=2048`, `LLAMA_THREADS`, `LLAMA_GPU_LAYERS=0`) et `embeddingModel` dans le worker IPC.
  - `ecosystem.config.cjs:28-34` impose `exec_mode: 'fork'`, `instances: 1` et `max_memory_restart: '6G'` pour éviter de dupliquer les ~5 Go de modèles en RAM.

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
  1. `startBackupScheduler()` (`server.ts:86-95`, `backend/services/backupScheduler.js`) : déclenché selon la collection `BackupPolicy` en MongoDB (défaut `0 2 * * *`), lance `mongodump` + archive ZIP (`backend/controllers/backup.js`) + purge selon `retentionCount`.
  2. `startIndexRetryScheduler()` (`server.ts:87-95,533-537`, `backend/services/indexRetryScheduler.js`, variable `INDEX_RETRY_CRON`) : rattrapage automatique des documents non indexés pour la recherche RAG.
  3. `startCleanupScheduler()` (`server.ts:102-103`, `backend/services/cleanupScheduler.js`) : tous les jours à `02:00` (`0 2 * * *`), supprime les fichiers temporaires de plus de 24h.
  4. Notification quotidienne d'activité (`server.ts:110-118`) : tous les jours à `08:00` (`0 8 * * *`), exécute `checkDailyNotifications()`.
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
| **Reverse Proxy** | TLS/HTTPS, compression, limites upload, WebSocket | Ubuntu : `nginx` ; Windows : IIS + URL Rewrite + ARR + WebSocket | `ALLOWED_ORIGINS` (`server.ts:139-144`) | `deploy/ubuntu/dms.nginx.conf` ; `dms.nginx.conf` ; `deploy/windows/web.config` |
| **Planificateur** | Sauvegardes BDD/ZIP, purge temp, notifs, RAG | `node-cron`, `mongodump`, `systemd` timer (Ubuntu) | `BACKUP_DIR`, `BACKUP_PATH`, `INDEX_RETRY_CRON` | `server.ts:85-119` ; `backupScheduler.js` ; `cleanupScheduler.js` ; `indexRetryScheduler.js` ; `deploy/ubuntu/systemd/dms-backup.timer` |
| **Files Redis/Bull** | File OCR asynchrone (code mort) | Redis + `bull` *(non installés ni branchés)* | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` *(inutilisées)* | `backend/jobs/ocrQueue.js:1-19` ; `backend/jobs/ocrProcessor.js:1-120` |

---

## 4. Exigences matérielles & environnement de production (`172.16.90.131` / `/var/www/dms`)

- **Runtime & OS cible Ubuntu 24.04 LTS** :
  - **Node.js `v22.22.1`** (`>= 22.x`, NodeSource `22.x`), **MongoDB 8.0** (`127.0.0.1:27017`), **Tesseract OCR** (`ara`, `fra`, `eng`), `poppler-utils`, `ImageMagick`, **PM2** (`ecosystem.config.cjs`, mode `fork`, 1 instance, `PORT=5000`) et **Nginx** (`https://172.16.90.131`, `client_max_body_size 100M`).
- **RAM & Modèles IA** :
  - `ecosystem.config.cjs:34` fixe `max_memory_restart: '6G'` pour le seul processus `dms-backend` (`server.ts`, mode `fork` à `1` instance obligatoire).
  - `scripts/download-models.js` attend `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` (~4.26 Go) et `bge-m3-q4_k_m.gguf` (~417 Mo).
  - [`MODELS.md`](../MODELS.md) recommande **16 Go de RAM minimum** sur Server (**18–24 Go** avec bureau GNOME Desktop actif) et **4 cœurs CPU minimum** (`LLAMA_THREADS=4`, `LLAMA_GPU_LAYERS=0` par défaut en inférence CPU).

---

## 5. Procédure de mise à jour & synchronisation production (`172.16.90.131`)

Pour déployer une mise à jour applicative sur le serveur Ubuntu 24.04 (`172.16.90.131`, `/var/www/dms`) :

```bash
# 1. Sur le poste de build : vérifier TypeScript, lint et compiler dist/
npx tsc --noEmit
npm run lint
npm run build

# 2. Synchroniser vers /var/www/dms en préservant node_modules/, uploads/, courrier/, models/ et .env
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

Puis sur le serveur **`172.16.90.131`** :

```bash
cd /var/www/dms
pm2 restart dms || pm2 restart dms-backend
sudo nginx -t && sudo systemctl reload nginx

# Vérification post-déploiement
pm2 status
pm2 logs dms --lines 50 || pm2 logs dms-backend --lines 50
test -w /var/www/dms/backend/uploads && echo "backend/uploads writable OK"
curl -sk https://172.16.90.131/api/health
```

*(Pour le déploiement complet initial étape par étape, l'automatisation `deploy/ubuntu/deploy.sh` et le rollback, voir [`GUIDE_INSTALLATION_UBUNTU_WINDOWS.md`](GUIDE_INSTALLATION_UBUNTU_WINDOWS.md).)*
