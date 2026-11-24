# Architecture réelle du DMS — Analyse du code source (Partie 1/4)

> **Statut du document** : Analyse statique fondée exclusivement sur la lecture du code source présent dans le dépôt (`FAIT`). Les éléments non observables dans le code ou dépendant de l'infrastructure cible sont marqués `[NON VÉRIFIÉ]`, `[À CONFIRMER]`, `[À VÉRIFIER]`, `[FICHIER ABSENT]` ou `DÉCISION DU PROPRIÉTAIRE`.  
> **Aucune modification** n'a été apportée au code applicatif.

---

## 0. Avertissement critique — Points de sécurité bloquants (À TRAITER AVANT TOUTE EXPOSITION RÉSEAU)

> **AVERTISSEMENT IMPÉRATIF :** **Ne pas exposer l'application sur le réseau (LAN, intranet ou Internet) tant que les défauts bloquants ci-dessous n'ont pas été corrigés et prouvés.** L'application traite des données administratives et RH sensibles (courriers, dossiers du personnel, pièces d'identité/CIN, sanctions, assiduité).

### Références d'audit existantes dans le dépôt
- `docs/audit-local/` : **`[RÉPERTOIRE ABSENT]`** (aucun dossier `docs/audit-local/` n'existe dans `docs/`).
- `docs/PRET_DEPLOIEMENT.md` (lignes `1-28`) : rapport d'audit antérieur recensant `SEC-01` à `SEC-12` — **statut : non confirmé par le propriétaire** (y compris `SEC-12` sur l'isolation départementale dans `backend/controllers/ai/chatController.js:47-70`, noté `INFIRMÉ / RÉSERVE` dans ce document et **non confirmé par le propriétaire**). De plus, certaines numérotations de lignes ou constats de `docs/PRET_DEPLOIEMENT.md` ont évolué dans le code actuel (voir tableau vérifié ci-dessous).

### Défauts bloquants vérifiés directement dans le code (`FAIT`)

| Gravité | Défaut bloquant constaté | Preuve vérifiée (`fichier:ligne`) | Impact / Risque |
|---|---|---|---|
| **CRITIQUE** | **Identifiants par défaut et backdoor mock en dur (`admin` / `Admin123!` et `admin`)** | `backend/config/db.js:8-14,20-45,67` ; `backend/controllers/auth/loginController.js:7-27,50-57,63-68` ; `backend/scripts/seedDatabaseMultiYear.js:113,159,484` | Création automatique d'un compte `Admin` à mot de passe connu au premier démarrage ; en cas de perte/erreur MongoDB, `loginController.js` accepte ce mot de passe et forge un jeton `Admin` en mémoire (`MOCK_ADMIN_ID`). **Ne jamais utiliser comme procédure d'exploitation.** |
| **CRITIQUE** | **Création propre du premier SuperAdmin absente** | `[FICHIER ABSENT]` (aucun script CLI interactif de création initiale sans mot de passe codé en dur) | Impossible de provisionner le premier compte `Admin` de production sans passer par la création automatique `Admin123!` (`backend/config/db.js:20-45`). |
| **CRITIQUE** | **Contournement d'authentification et mode dégradé silencieux si MongoDB est hors ligne** | `server.ts:343-352` ; `server.ts:255-303` ; `backend/config/db.js:69-72` ; `backend/middleware/auth.js:53-66` | Le serveur HTTP démarre même si MongoDB est déconnecté ; `protect` injecte un `req.user` `Admin` fictif lorsque `readyState !== 1` ou `decoded.id === '65f000000000000000000001'` ; les `GET` renvoient des JSON `200` vides. |
| **CRITIQUE** | **Secrets JWT faibles en fallback, durée 30 jours, stockage `localStorage` et token en URL** | `backend/models/User.js:111,113` ; `server.ts:59-64` ; `backend/controllers/auth/loginController.js:23-24` ; `src/services/apiService.ts:16,54` ; `backend/middleware/auth.js:23-25` | Fallback `'votre_secret_super_securise_123'` si `JWT_SECRET` absent dans `User.js`, `'dms_dev_jwt_secret...'` en dev dans `server.ts` / `loginController.js` ; expiration par défaut `30d` ; token lisible par XSS dans `localStorage` et exposé dans l'URL/logs via `?token=`. |
| **HAUTE** | **CORS ouvert (`origin: true` + `credentials: true`), Socket.IO `origin: '*'`, absence de `helmet` et de rate-limiting dans `server.ts`** | `server.ts:119-124` ; `server.ts:153-158` ; absence de `helmet` et `express-rate-limit` dans `server.ts:1-20` (présents uniquement dans `backend/server.js:148-206`) | Exposition CSRF / exfiltration inter-origines (avec cookies), absence d'en-têtes de sécurité HTTP Express et absence de protection anti-brute-force sur `/api/auth/login` sur le serveur de référence `server.ts`. |
| **HAUTE** | **Service statique sans authentification des photos utilisateurs et personnel** | `server.ts:172-173` ; `backend/server.js:238-239` | `/uploads/usersphoto` et `/uploads/personnelphoto` sont servis directement par `express.static` sans middleware `protect`. |
| **HAUTE** | **Contrôles d'accès incomplets (RH, courriers orphelins, scan, Mass Assignment)** | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` ; `backend/controllers/incomingDocuments/detailControllers.js:85-92` ; `backend/controllers/scan/documentScanController.js:105-160` ; `backend/controllers/users/managementControllers.js:116,248-277` | Historique RH (promotions, postes, diplômes, sanctions) consultable par tout utilisateur authentifié ; courriers sans `assignedTo` accessibles à tous les départements ; `getDocumentScan` sans contrôle départemental ni protection path traversal sur `type=temp` ; `POST /api/users` et `PUT /api/users/:id` acceptent des champs arbitraires du corps de requête. |
| **HAUTE** | **Mot de passe renvoyé en clair à la réinitialisation et injection shell potentielle sur le scanner Linux** | `backend/controllers/users/accountControllers.js:170` ; `backend/controllers/auth/adminController.js:33-70` ; `backend/utils/scanner/linux/scanExecutor.js:68,75-89,134-157` | `resetPassword` retourne `newPassword` en clair dans la réponse HTTP ; `resetAdminPassword` (code présent dans `adminController.js`, non monté dans `backend/routes/auth.js:1-25`) réinitialise en `'admin123'` ; `scanExecutor.js` passe `scannerDevice` dans `exec(...)` via concaténation de chaîne. |
| **INFO / RÉSERVE** | **Écart vérifié sur `SEC-01` de `docs/PRET_DEPLOIEMENT.md`** | `backend/middleware/auth.js:93-108` vs `docs/PRET_DEPLOIEMENT.md:13` | Dans le code actuel lu, `authorize()` vérifie `!req.user \|\| !roles.includes(req.user.role)` sans `req.originalUrl.includes` ; `docs/PRET_DEPLOIEMENT.md` reste **non confirmé par le propriétaire**. |

---

## 1. Inventaire détaillé des composants (`FAIT` observé dans le code)

### 1.1 Frontend (SPA React + Vite)
- **Framework & bibliothèques** : React `^18.3.1` (`package.json:89,93`), TypeScript `^5.5.3` (`package.json:138`), React Router `^6.26.2` (`package.json:98`), Tailwind CSS `^3.4.11` (`package.json:136`), i18next / react-i18next (`package.json:75,96`), Axios (`package.json:59`, configuré avec `VITE_API_URL || '/api'` dans `src/services/apiService.ts:4`).
- **Build & sortie** : `npm run build` exécute `vite build` (`package.json:11`), générant le bundle statique dans `dist/` (`server.ts:361`).
- **Mode dev vs prod** : En hors-production (`NODE_ENV !== 'production'`), `server.ts:354-359` monte `vite.middlewares` en mémoire ; en production (`NODE_ENV === 'production'`), `server.ts:360-366` sert `dist/` avec fallback SPA vers `dist/index.html` (ce qui permet aussi à un reverse proxy Nginx/IIS de servir `dist/` directement en amont).

### 1.2 Serveur de référence et commande réelle de démarrage
- **Serveur de référence** : `server.ts` à la racine du dépôt (`package.json:7-9`, `ecosystem.config.cjs:26`, `deploy/windows/install-service.ps1:55-62`). Il unifie Express `^5.2.1` (`package.json:70`), Socket.IO `^4.8.3` (`package.json:101`), les routes `./backend/routes/*` (`server.ts:201-232`), le service des fichiers protégés (`server.ts:166-176`), les tâches `node-cron` (`server.ts:83-113`), et la distribution du frontend Vite/`dist/` (`server.ts:354-366`).
- **Serveur historique secondaire** : `backend/server.js` (Express `^4.18.2`, `backend/package.json:15`), qui n'expose que l'API (pas le frontend SPA), active `helmet` (`backend/server.js:150`), `rateLimit` (`backend/server.js:174-206`), CORS restreint via `FRONTEND_URL` (`backend/server.js:65-73`) et `startIndexRetryScheduler()` (`backend/server.js:323`). Il est ciblé par `backend/Dockerfile.backend:25` mais **n'est pas** le point d'entrée utilisé par `ecosystem.config.cjs:26`, `deploy/ubuntu/deploy.sh` ni `deploy/windows/install-service.ps1`.
- **Commande réelle de démarrage** :
  - Scripts PM2 et NSSM existants : `./node_modules/.bin/tsx server.ts` (`ecosystem.config.cjs:26-27`, `deploy/windows/install-service.ps1:55-62`) et `npm run dev` (`package.json:7`).
  - Script `"start": "node server.ts"` (`package.json:9`) : **`[À VÉRIFIER]`**. `server.ts` contient des annotations de type TypeScript (`err: Error`, `_req: express.Request`, `interface AppError`, `server.ts:34,183,250`). Sans exécution de preuve sous la version exacte de Node 22 installée sur la cible (ex. `NODE_ENV=production PORT=${PORT} node server.ts` ou `node --experimental-strip-types server.ts`), le démarrage direct par `node server.ts` n'est pas garanti ; **recommander `tsx` (`./node_modules/.bin/tsx server.ts`) tant que `node server.ts` n'est pas prouvé**.
- **Port par défaut et variable `PORT`** :
  - `server.ts:316` : `const PORT = Number(portFromArgs || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000));` — écoute sur `0.0.0.0:${PORT}` (`server.ts:376`).
  - `backend/server.js:354` : `const PORT = process.env.PORT || 5000;`.
  - **DÉCISION DU PROPRIÉTAIRE** : le choix définitif du port interne (`${PORT}`) n'est pas tranché entre `3000` et `5000` (voir section 5).

### 1.3 Base de données MongoDB & Mongoose
- **Version MongoDB** :
  - `deploy/ubuntu/install-mongodb.sh:31-35` : configure le dépôt MongoDB Community **7.0**.
  - `docker-compose.yml:32` : utilise l'image `mongo:6.0`.
  - Compatibilité exacte avec l'OS cible et Mongoose 9 : **`[À CONFIRMER]`** par le propriétaire.
- **ODM Mongoose** :
  - Racine (`package.json:81`) : `mongoose: ^9.10.2` (utilisé lors du lancement de `server.ts` depuis la racine).
  - Dossier backend (`backend/package.json:21`) : `mongoose: ^8.0.0`.
  - Connexion (`backend/config/db.js:57-62`) : `directConnection: true` si URI locale/standalone (sans `+srv` ni `replicaSet`), `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 5000` ; `mongoose.set('bufferCommands', false)` (`server.ts:22`, `backend/config/db.js:3`).
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
  - Au démarrage de `server.ts:67-80`, un `setTimeout(..., 5000)` appelle `checkOllamaHealth()` qui déclenche `initModels()` (`backend/services/ollamaService.js:205`) si les deux fichiers existent.
  - `initModels()` (`backend/services/ollamaService.js:60-124`) charge en singleton `chatModel` (`contextSize: 2048`, `threads: LLAMA_THREADS`, `gpuLayers: LLAMA_GPU_LAYERS`) puis `embeddingModel` (`threads: LLAMA_THREADS`, `gpuLayers: LLAMA_GPU_LAYERS`).
  - `ecosystem.config.cjs:28-31` impose `exec_mode: 'fork'` et `instances: 1` pour éviter de dupliquer les ~5 Go de modèles en RAM.

### 1.6 Pipeline OCR et manipulation PDF/Images
- Implémentation active dans `backend/utils/ocrProcessor.js` (appelée lors de l'upload via `backend/utils/fileUploadHandler.js:4,51`) :
  - Conversion PDF → PNG 600 DPI : binaire système `pdftoppm` (`poppler-utils` sous Linux, Poppler sous Windows ; `backend/utils/ocrProcessor.js:119-121`).
  - Prétraitement d'image : ImageMagick — commande `convert` sous Linux, `magick` sous Windows (`backend/utils/ocrProcessor.js:301-303`). En cas d'échec ImageMagick, repli sur l'image brute (`ocrProcessor.js:309-312`).
  - Reconnaissance optique : binaire système `tesseract` (`--list-langs`, stratégies multi-PSM avec `ara`, `fra`, `eng` ; `backend/utils/ocrProcessor.js:49-52,89,151-228`).
  - Repli texte natif : package npm `pdf-parse` (`backend/utils/ocrProcessor.js:1,68`). (`tesseract.js` est présent dans `package.json:107` mais non utilisé par `backend/utils/ocrProcessor.js`).
- Conversion scan → PDF sous Linux (`backend/utils/scanner/linux/pdfConverter.js:15-50`, `scanExecutor.js:183-189`) : binaire `img2pdf` prioritaire, sinon package npm `pdfkit`. Sous Windows (`backend/utils/scanner/windows/pdfProcessor.js:3,15-48`) : `pdfkit`.

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
   │       └── /uploads/*        ──► Proxy obligatoirement vers Node 127.0.0.1:${PORT} (JWT sauf photos)
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
| **Courriers PDF** | `path.join(__dirname, '..', 'courrier', year, docType)` → `backend/courrier/<année>/Incoming-Doc\|Outgoing-Doc` (`backend/utils/documentHelper.js:62-70`) | `process.env.DOCUMENT_PATH \|\| path.join(__dirname, '../../backend/courrier')` (`backend/controllers/fileController.js:43,85-86`) | `DOCUMENT_PATH` (lue en lecture et scripts `backup-all.sh`/`check-env.mjs`, **ignorée en écriture**) | Relatif à `__dirname` (écr.) ; absolu si `DOCUMENT_PATH` (lect.) | **Authentifié** : `GET /api/files/:type/:id/:filename` (`protect` + RBAC dept, `server.ts:166`) et `/courrier` (`protect`, `server.ts:169`) |
| **Uploads (pièces jointes, modèles, temp)** | `path.join(__dirname, '..', 'uploads')` → `backend/uploads/{attachments,templates,temp}` (`backend/middleware/upload.js:6-9,70,87`) ; scanner : `UPLOAD_PATH \|\| './uploads'` (`scannerConfig.js:11`) | `process.env.UPLOAD_DIR \|\| uploadDir` dans `handleScannedDocument` (`backend/middleware/upload.js:145`) ; `backend/routes/messages.js:58` en dur | `UPLOAD_DIR`, `UPLOAD_PATH` (divergents, **ignorés par Multer**) | Relatif à `__dirname` (Multer) ou à `cwd` (`scannerConfig.js`) | **Authentifié** : `/uploads` (`protect` + `express.static`, `server.ts:176`) et `/api/messages/attachments/:filename` (`protect` + sender/recipient, `backend/routes/messages.js:55-94`) |
| **Photos (utilisateurs & personnel)** | `backend/uploads/usersphoto`, `backend/uploads/personnelphoto` (`backend/middleware/upload.js:7-8`) | `path.join(process.cwd(), 'backend', 'uploads/usersphoto\|personnelphoto')` (`server.ts:172-173`) | Aucune | Relatif à `__dirname` / `cwd` | **STATIQUE PUBLIC SANS SESSION** (`server.ts:172-173`) — **DÉFAUT SÉCURITÉ** |
| **Fichiers temporaires** | `backend/uploads/temp` (`upload.js:9`), `./uploads/temp` (`scannerConfig.js:12`), `os.tmpdir()/ocr-enhanced-*` (`ocrProcessor.js:108`) | Purgé par `cleanupScheduler.js:17-22` (> 24h à 02:00) | `UPLOAD_PATH` (partiel) | Mixte (`__dirname`, `cwd`, `os.tmpdir()`) | Non servis directement |
| **Sauvegardes** | API/contrôleur : `exportPath \|\| path.join(process.cwd(), 'backups')` (`backup.js:176`) ; Scheduler : `BACKUP_DIR \|\| path.join(cwd, 'backups')` (`backupScheduler.js:12`) | Download/Delete API : `BACKUP_PATH \|\| path.join(cwd, 'backups')` (`backup.js:678,731`) ; Scripts : `BACKUP_DIR` / `BACKUP_ROOT` | `BACKUP_DIR`, `BACKUP_PATH`, `BACKUP_ROOT` (**noms divergents**) | Relatif à `cwd` par défaut | Téléchargement authentifié Admin via `/api/backup/download/:id` (`backend/routes/backup.js`, `backup.js:657-697`) |
| **Modèles IA (`.gguf`)** | Téléchargement via `scripts/download-models.js:33` vers `path.join(process.cwd(), 'models')` | `LLAMA_CHAT_MODEL_PATH` / `LLAMA_EMBEDDING_MODEL_PATH`, sinon `backend/../models` (`ollamaService.js:14`) ou `cwd/models` (`server.ts:320`) | `LLAMA_CHAT_MODEL_PATH`, `LLAMA_EMBEDDING_MODEL_PATH` | Relatif à `cwd`/`__dirname` par défaut ; absolu conseillé | Jamais servis par HTTP |

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

- **Mémoire RAM** :
  - `ecosystem.config.cjs:34` fixe `max_memory_restart: '6G'` pour le seul processus `dms-backend` (`server.ts`, mode `fork` à `1` instance obligatoire, lignes `28-31`).
  - `server.ts:80` indique le chargement de `~5 Go` pour les modèles IA au démarrage.
  - `scripts/download-models.js:55-67` attend ALLaM 7B (`~4.26 Go`, seuil min `3.0 Go`) et BGE-M3 (`~417 Mo`, seuil min `300 Mo`).
  - `MODELS.md:11-14` recommande **16 Go de RAM minimum** pour héberger le chat 7B (~4.5–5.5 Go RAM), les embeddings (~400 Mo RAM), MongoDB, Nginx/IIS et l'OS (et mentionne un repli `qwen2.5-3b` ~2.1 Go si RAM ≤ 8 Go, `MODELS.md:100`).
  - Pics mémoire additionnels lors de l'OCR à **600 DPI** (`pdftoppm -png -r 600` + ImageMagick dans `backend/utils/ocrProcessor.js:119-121,301-303`) : **`[À CONFIRMER]`** selon le nombre de pages et la concurrence d'utilisation.
- **CPU** :
  - `server.ts:44` calcule automatiquement `LLAMA_THREADS = Math.max(1, Math.floor(os.cpus().length / 2))` (cœurs physiques).
  - `.env.production.example:74` et `MODELS.md:14` retiennent **`4` cœurs CPU minimum** (`LLAMA_THREADS=4`). **`[À CONFIRMER]`** selon les temps de réponse tolérés sur l'inférence CPU.
- **GPU (optionnel)** :
  - Par défaut `LLAMA_GPU_LAYERS=0` (exécution 100 % CPU, `.env.production.example:77`, `backend/services/ollamaService.js:28`). Si un GPU compatible CUDA/Vulkan est présent, `LLAMA_GPU_LAYERS > 0` active `gpu: 'auto'` (`backend/services/ollamaService.js:86`).
- **Disque** :
  - ~`4.7 Go` à `5 Go` minimum pour les 2 modèles `.gguf` (`scripts/download-models.js:56,66` ; `MODELS.md:11-12`), plus les dépendances npm (avec binaires natifs `node-llama-cpp`), la base MongoDB, les archives `courrier/`, `uploads/` et la rétention de `backups/` (14 à 30 jours dans les scripts). Capacité totale **`[À CONFIRMER]`** selon la volumétrie documentaire annuelle.

---

## 5. Écarts, incohérences et risques de déploiement détectés (`FAIT`)

1. **Incohérence de port `3000` vs `5000` (`DÉCISION DU PROPRIÉTAIRE`)** :
   - `server.ts:316` : défaut `3000` (et ignore explicitement `PORT === '8080'`).
   - `.env.example:1` et `vite.config.ts:14,17` : `3000`.
   - `deploy/ubuntu/setup-system.sh:106` : `ufw deny 3000/tcp`.
   - À l'inverse, `5000` est utilisé dans `backend/server.js:354`, `.env.production.example:15`, `ecosystem.config.cjs:42`, `deploy/ubuntu/dms.nginx.conf:7,72,82,93,113,129`, `dms.nginx.conf:89,109,129`, `deploy/ubuntu/deploy.sh:78`, `deploy/ubuntu/rollback.sh:42`, `deploy/windows/install-service.ps1:83`, `deploy/windows/web.config:30,39,45,51,57` et `deploy/scripts/check-env.mjs:38` (lequel affiche pourtant un commentaire `PORT unique (3000)` et un fallback `'3000'` aux lignes `68-70`).
2. **Script `"start": "node server.ts"` (`package.json:9`) — `[À VÉRIFIER]`** :
   - `server.ts` est en TypeScript avec typage explicite (`server.ts:34,183,250`). L'exécution brute par `node server.ts` échoue sur les versions Node ne supportant pas nativement TypeScript ou sur certaines syntaxes TS (`interface`, imports/CJS mixtes).
   - Commande de test à exécuter sur la cible avant tout basculement : `NODE_ENV=production PORT=${PORT} node server.ts` (ou `node --experimental-strip-types server.ts` selon la sous-version de Node 22). **Tant que cela n'est pas prouvé, utiliser `tsx` (`./node_modules/.bin/tsx server.ts`), comme configuré dans `ecosystem.config.cjs:27` et `deploy/windows/install-service.ps1:55-62`.**
3. **Variables d'environnement documentées mais ignorées par `server.ts`** :
   - `ALLOWED_ORIGINS` (`.env.production.example:44`) : **totalement ignorée** ; `server.ts:154` utilise `origin: true` et `server.ts:121` utilise `origin: '*'`. (Même `backend/server.js:71` lit `FRONTEND_URL`, pas `ALLOWED_ORIGINS`).
   - `AI_WARMUP` (`.env.production.example:81`) : **totalement ignorée** par `server.ts:67-80` et `backend/server.js:50-59` (le préchargement démarre toujours après 5s, même si `AI_WARMUP=false`).
   - `INDEX_RETRY_CRON` (`.env.production.example:84`) : lue dans `backend/services/indexRetryScheduler.js:239`, mais `startIndexRetryScheduler()` n'est **jamais appelée** par `server.ts` (seulement dans `backend/server.js:323`).
4. **Noms et comportements divergents des chemins de stockage** :
   - `DOCUMENT_PATH` : honorée à la lecture (`backend/controllers/fileController.js:43,86`) et par `backup-all.sh:67` / `restore-all.sh:146` / `check-env.mjs:148`, **mais ignorée à l'écriture** (`backend/utils/documentHelper.js:62-70` écrit toujours dans `backend/courrier/<année>/<type>`). Un `DOCUMENT_PATH` pointant hors du dépôt ferait écrire les nouveaux PDF dans `backend/courrier/` et les sauvegardes/lectures chercheraient ailleurs.
   - `UPLOAD_DIR` vs `UPLOAD_PATH` : `backend/middleware/upload.js:6-9` écrit toujours dans `backend/uploads/` (ignorant `UPLOAD_DIR`, lu uniquement à la ligne `145` pour `handleScannedDocument`), tandis que `backend/utils/scanner/config/scannerConfig.js:11` lit `UPLOAD_PATH` (défaut `./uploads` relatif à `cwd`).
   - `BACKUP_DIR` vs `BACKUP_PATH` vs `BACKUP_ROOT` : `backend/services/backupScheduler.js:12` lit `BACKUP_DIR`, `backend/controllers/backup.js:678,731` lit `BACKUP_PATH` (mais `createBackup` ligne `176` écrit dans `process.cwd()/backups`), `deploy/scripts/check-env.mjs:150` lit `BACKUP_DIR` (fallback `backend/backups`), et `scripts/backup-mongo.sh:13` lit `BACKUP_ROOT`.
5. **Incohérence `authSource` MongoDB** :
   - `deploy/ubuntu/install-mongodb.sh:71-78` crée `dms_app_user` dans la base `document-management`, mais sa sortie ligne `107` et `.env.production.example:23` indiquent `?authSource=admin`. Sous MongoDB avec `authorization: enabled`, le `authSource` dans `MONGODB_URI` **doit correspondre exactement à la base où l'utilisateur a été créé** (`authSource=document-management` si créé dans `document-management`, ou utilisateur créé dans `admin` si `authSource=admin`).
6. **Doublons d'infrastructure et artefacts obsolètes** :
   - **3 configurations Nginx** : `/dms.nginx.conf` (Let's Encrypt, `your-domain.com`), `/deploy/ubuntu/dms.nginx.conf` (certificat auto-signé, `dms.local`, bloc `/api-docs`), `/nginx/default.conf` (Docker port 80, sans `/courrier`, `/uploads` ni `/socket.io`, donc inutilisable tel quel).
   - **Artefacts Docker obsolètes** (`docker-compose.yml`, `Dockerfile.frontend`, `backend/Dockerfile.backend`) : exécutent l'ancien `backend/server.js` avec `mongo:6.0` sans authentification, sans `models/`, sans Tesseract/Poppler/ImageMagick/SANE, et appellent `npm install` en copiant `package-lock.json` alors que le dépôt contient `bun.lock` et aucun `package-lock.json` (`list_dir` racine).
   - **4 scripts de sauvegarde distincts** : `deploy/scripts/backup-all.sh` (complet BDD+fichiers+manifeste IA, utilisé par `deploy.sh` et `dms-backup.service`), `deploy/backup/backup-mongo.sh` (BDD seule vers `./backups`, URI fallback `dms_db`), `scripts/backup-mongo.sh` (BDD seule vers `/var/backups/dms`), et `deploy/backup/backup-mongo.ps1` (Windows complet ZIP).
   - **Double `package.json`** : dépendances critiques en versions majeures différentes entre la racine (`express ^5.2.1`, `mongoose ^9.10.2`) et `backend/package.json` (`express ^4.18.2`, `mongoose ^8.0.0`).
   - **Défaut de dépendance Windows ImageMagick** : `backend/utils/ocrProcessor.js:301-303` invoque `magick` sous Windows (optionnel avec repli sur image brute), mais `deploy/windows/install-prereqs.ps1` n'installe pas ImageMagick (seulement Chocolatey, Node 22, Git, VS Build Tools + CMake, MongoDB + Tools, Tesseract, Poppler, NSSM).
   - **Protection path traversal `serveProtectedFile`** (`backend/controllers/fileController.js:44,68`) : impose `targetFile.startsWith(ALLOWED_ROOT)` où `ALLOWED_ROOT = path.resolve(process.cwd())`, ce qui bloquerait `DOCUMENT_PATH` s'il était déplacé en dehors du répertoire de l'application (ex. `/var/data/courrier`).
