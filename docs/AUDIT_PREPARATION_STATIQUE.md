# AUDIT STATIQUE DE PRÉPARATION AU DÉPLOIEMENT — DMS (UBUNTU & WINDOWS)

**Question centrale :** *« Cette application et ses fichiers de déploiement sont-ils prêts ? »*  
**Verdict global :** **🔴 NON PRÊT** *(sauf preuve contraire après correction des bloquants 🔴 ci-dessous et exécution complète de la recette `[À TESTER EN LOCAL]`)*.

> **Périmètre et règles strictes de cet audit :**
> - Ce rapport décrit **uniquement la copie locale inspectée dans cet espace de travail** (`/app/applet`).
> - Aucun fichier existant n'a été modifié ; aucun serveur applicatif, base MongoDB, binaire OCR (`tesseract`, `pdftoppm`, `magick`/`convert`), scanner ou hôte Windows n'a été démarré ici.
> - Tout point exigeant une exécution réelle (serveur, MongoDB, outils système, OS cible) est marqué **`[À TESTER EN LOCAL]`** avec la commande exacte.
> - Distinction systématique entre **`FAIT` (lu dans le code ou mesuré)**, **`HYPOTHÈSE`** et **`DÉCISION DU PROPRIÉTAIRE`**.
> - Note sur la numérotation : les identifiants **`SEC-04` à `SEC-07`** (ainsi que `SEC-12` et `BLK-xx`) proviennent de `docs/PRET_DEPLOIEMENT.md` / `deploy/scripts/smoke-test.mjs` et représentent une **numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée par le propriétaire**.

---

## ÉTAPE 0 — IDENTIFICATION DE LA COPIE INSPECTÉE

### Constats mesurés dans le conteneur d'inspection (`FAIT`)

| Élément | Valeur mesurée | Remarque |
|---|---|---|
| Répertoire de travail (`pwd`) | `/app/applet` | Conteneur cloud d'audit, **pas** la machine cible du propriétaire |
| Système d'exploitation (`uname -a`, `/etc/os-release`) | `Linux localhost 4.19.0-gvisor #1 x86_64`, `Debian GNU/Linux 12 (bookworm)` | Sandbox gVisor |
| Node.js / npm (`node -v`, `npm -v`) | `v22.23.2` / `10.9.8` | Conforme au seuil `>= 22.x` de `deploy/scripts/check-env.mjs:51` |
| Mémoire / Swap (`free -h`) | `4.0Gi` RAM (`2.1Gi` disponible) / `0B` Swap | Ressources du conteneur uniquement |
| CPU (`nproc`) / Disque (`df -h .`) | `4` vCPU / `756G` (`1.5G` utilisés) | Ressources du conteneur uniquement |
| Dépôt Git (`.git`) | Absent (`NO_GIT`) | Copie de travail hors historique Git |
| Présence `.env` / `dist` / `backups` | `.env` absent (`.env.example` et `.env.production.example` présents) ; `dist/` absent ; `backups/` absent | Aucun secret lu ni affiché |
| Présence `models/` | Dossier présent contenant uniquement `.gitkeep` (73 octets) | Aucun modèle `.gguf` téléchargé dans cette copie |
| Données locales présentes | `backend/courrier/{2024,2025,2026}`, `backend/uploads/{attachments,backups,documents,personnelphoto,temp,templates,usersphoto}` + 1 PDF à la racine de `backend/uploads/` | Dossiers préexistants dans la copie |

### Vérifications statiques exécutées dans ce conteneur (`FAIT`)

> **Avertissement :** Ces deux commandes ont été exécutées **dans le conteneur cloud AI Studio**, pas sur la machine Ubuntu/Windows du propriétaire.

- `npx tsc --noEmit` → code de sortie **`0`** (`TSC_EXIT=0`, aucune erreur TypeScript détectée sur le frontend).
- `npm run lint -- --quiet` → code de sortie **`0`** (`LINT_EXIT=0`). Note : `npm run lint` sans `--quiet` remonte **12 avertissements (`warning`)** React (`react-refresh/only-export-components` et `react-hooks/exhaustive-deps` dans `src/`), 0 erreur.
- Build production (`npm run build`), tests unitaires (`npm run test:run`), démarrage serveur, MongoDB, OCR et Windows : **non exécutés ici (`[À TESTER EN LOCAL]`)**.

---

## ÉTAPE 1 — COHÉRENCE DU DÉPÔT ET DES PORTS / CHEMINS DE DÉPLOIEMENT

### 1.1 Dualité des points d'entrée serveur (`FAIT`)
- **Point d'entrée unifié actif :** `server.ts` utilisé par :
  - `package.json:7-9` (`"dev": "tsx server.ts"`, `"start": "node server.ts"`).
  - `ecosystem.config.cjs:26-27` (`script: 'server.ts'`, `interpreter: tsxInterpreter`).
  - `deploy/windows/install-service.ps1:55-62` (`tsx.cmd server.ts`).
- **Serveur legacy encore présent :** `backend/server.js`, toujours référencé par :
  - `backend/Dockerfile.backend:25` (`CMD ["node", "server.js"]`).
  - `docker-compose.yml:13-25` (build de `./backend` avec `MONGODB_URI=mongodb://mongo:27017/dms`).
- **Conséquence critique :** Les durcissements ajoutés dans `backend/server.js` (Helmet, rate limiters, check strict 503 si DB hors ligne, lancement de `startIndexRetryScheduler()`) **sont absents de `server.ts`**.

### 1.2 Conflit de ports (3000 vs 5000) (`FAIT`)

| Fichier:Ligne | Port configuré / attendu | Extrait |
|---|---|---|
| `server.ts:316` | **`3000`** par défaut | `process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000` |
| `.env.example:1` | **`3000`** | `PORT=3000` |
| `vite.config.ts:14,17,33,38,42` | **`3000`** (dev + proxy) | `port: 3000`, `target: 'http://localhost:3000'` |
| `deploy/ubuntu/setup-system.sh:106` | **`3000`** (UFW !) | `ufw deny 3000/tcp comment 'Block direct Express access'` (**le port 5000 n'est pas bloqué par UFW**) |
| `deploy/scripts/check-env.mjs:38,68-70` | **`5000`** attendu, fallback **`3000`** | `const EXPECTED_PORT = '5000';` / commentaire `// 3. Contrôle du PORT unique (3000)` |
| `.env.production.example:15` | **`5000`** | `PORT=5000` |
| `ecosystem.config.cjs:42` | **`5000`** | `PORT: 5000` |
| `deploy/ubuntu/dms.nginx.conf:7,72,82,93,113,129` | **`5000`** | `proxy_pass http://127.0.0.1:5000;` |
| `deploy/windows/web.config:30,39,45,51,57` | **`5000`** | `url="http://localhost:5000/..."` |
| `deploy/windows/install-service.ps1:83` | **`5000`** | `"NODE_ENV=production\r\nPORT=5000"` |
| `deploy/scripts/smoke-test.mjs:38` | **`5000`** | `'http://127.0.0.1:5000'` |
| `deploy/ubuntu/rollback.sh:42` | **`5000`** | `"http://127.0.0.1:5000/api/health"` |

- **DÉCISION DU PROPRIÉTAIRE :** Confirmer le port unique de production (les scripts de prod visent `5000`, mais `setup-system.sh:106` bloque `3000` et non `5000`).

### 1.3 Incohérences des scripts de déploiement (`FAIT`)
- `deploy/ubuntu/deploy.sh:38` lance `node "${APP_DIR}/deploy/scripts/check-env.mjs"` **sans charger `.env`** (`check-env.mjs` ne lit pas `.env` via `dotenv`, il lit uniquement `process.env`). Sauf export préalable dans le shell appelant, `check-env.mjs` échoue sur `NODE_ENV`, `JWT_SECRET` et `MONGODB_URI`.
- `deploy/ubuntu/install-mongodb.sh:71-78` crée `dms_app_user` dans `use document-management;` (base d'authentification `document-management`), mais affiche à la ligne `:107` : `MONGODB_URI=mongodb://dms_app_user:<VOTRE_MOT_DE_PASSE>@127.0.0.1:27017/document-management?authSource=admin` (idem `.env.production.example:23`). **`HYPOTHÈSE` à tester en local :** l'authentification MongoDB échouera si `authSource=admin` est conservé alors que l'utilisateur vit dans `document-management`.
- `deploy/ubuntu/systemd/dms-backup.service:7-10` s'exécute sous `User=dms` et écrit dans `/var/backups/dms`, mais `deploy/ubuntu/setup-system.sh:93` ne crée que `/var/www/dms/{...,backups,logs}` — `/var/backups/dms` n'est ni créé ni attribué à `dms:dms`.

---

## ÉTAPE 2 — SÉCURITÉ (LECTURE DU CODE ACTUEL)

### 2.1 Constats critiques sur l'authentification, les secrets et le transport (`FAIT`)

1. **Compte admin par défaut en clair (`backend/config/db.js:8-45,67`)**
   - `DEFAULT_ADMIN = { username: 'admin', password: 'Admin123!', role: 'Admin', isActive: true, mustChangePassword: true }` créé automatiquement par `createDefaultAdmin()` à chaque `connectDB()` si aucun `Admin` n'existe, avec affichage du mot de passe en clair dans les logs (`db.js:38-39`).
2. **Porte dérobée hors ligne (`backend/controllers/auth/loginController.js:7-27,51-69` & `backend/middleware/auth.js:54-66`)**
   - Dans `loginController.js:51-57` et `63-68`, si MongoDB est hors ligne (`readyState !== 1`) ou si la requête échoue (`catch (dbErr)`), le couple `admin` / `Admin123!` **ou `admin` / `admin`** reçoit un vrai JWT `role: 'Admin'` via `getMockAdmin()`.
   - Dans `backend/middleware/auth.js:54-66`, si `mongoose.connection.readyState !== 1` ou `decoded.id === '65f000000000000000000001'`, `protect()` reconstruit un utilisateur `Admin` fictif sans vérifier la base ni `isActive` en base. **Même sans fichier `.env` compromis, une coupure MongoDB ouvre une authentification de repli.**
3. **Secrets JWT de repli codés en dur (`backend/models/User.js:111`, `loginController.js:23`, `server.ts:60`)**
   - `User.js:111` : `process.env.JWT_SECRET || 'votre_secret_super_securise_123'`.
   - `loginController.js:23` : `process.env.JWT_SECRET || 'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026'`.
   - `server.ts:60` : en mode non-production, assigne `'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026'`. (En `NODE_ENV=production`, `server.ts:54-57` appelle `process.exit(1)` si absent).
   - Par ailleurs, `src/services/apiService.ts:16` lit le jeton depuis `localStorage.getItem('token')`, et `backend/middleware/auth.js:23-25` accepte le JWT en query string (`req.query.token`), ce qui expose le jeton aux journaux HTTP / historique navigateur.
4. **CORS totalement ouvert (`server.ts:153-158` & `server.ts:119-124`)**
   - Express : `cors({ origin: true, credentials: true, ... })` reflète n'importe quelle origine avec cookies/credentials autorisés (la variable `ALLOWED_ORIGINS` de `.env.production.example:44` n'est même pas lue par `server.ts`).
   - Socket.IO : `cors: { origin: '*', methods: ['GET', 'POST'] }`.
5. **Absence de Helmet, de rate limiting global/login et de `trust proxy` dans `server.ts`**
   - `helmet` et `express-rate-limit` sont présents dans `package.json:71-72` et appliqués dans `backend/server.js:148-206`, mais **totalement absents de `server.ts`** (aucun en-tête `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `X-Powered-By` non masqué côté Node ; aucun anti-bruteforce sur `/api/auth/login`). Seul `backend/routes/aiRoutes.js` utilise `aiRateLimiter.js`.
   - `app.set('trust proxy', 1)` est absent de `server.ts` (et commenté dans `backend/server.js:171`), faussant l'IP client derrière Nginx/IIS.
6. **`/api/health` renvoie toujours HTTP 200 et mode dégradé API 200 (`server.ts:238-247,265-297`)**
   - `server.ts:238-247` : `res.json({ success: true, ..., status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })` retourne HTTP `200` même si MongoDB est déconnecté (`readyState !== 1`).
   - `server.ts:265-297` : en cas d'erreur Mongo/Mongoose hors ligne sur toute requête `GET`, le middleware global renvoie HTTP `200` avec des données factices/vides (`success: true, data: [] / {}`) au lieu d'une erreur `503`.

### 2.2 Autres failles applicatives relevées (`FAIT`)

| ID | Libellé / Constat | Statut code actuel | Preuve (`Fichier:Ligne`) |
|---|---|---|---|
| **SEC-01** *(confirmé)* | Contournement `skipDepartmentCheck` via `req.originalUrl` | `checkDepartmentAccess` existe toujours avec `req.originalUrl.startsWith(route)` (remplacé de `.includes` vers `.startsWith` dans `auth.js:144`, mais `/api/incoming-documents`, `/api/outgoing-documents`, `/api/folders`, `/api/messages`, `/api/users/messaging` contournent toujours le contrôle départemental `:departmentId`). | `backend/middleware/auth.js:135-147` |
| **SEC-02** *(confirmé)* | Historique RH (`promotions`, `postes`, `diplomes`, `sanctions`, `full-history`) sans `authorize` ni `checkRHAccess` sur les routes `GET` | Tout utilisateur authentifié (`protect` seul) peut consulter l'historique RH complet de n'importe quel agent (`:personnelId`). | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` |
| **SEC-03** *(confirmé)* | `/api/auth/reset-admin` & `/api/auth/test-admin` | `reset-admin` est bloqué par `if (process.env.NODE_ENV === 'production') return 403`, mais `test-admin` reste public sans condition `NODE_ENV` (énumération du compte `admin`). Risque critique si `NODE_ENV` n'est pas exactement `'production'`. | `backend/controllers/auth/adminController.js:8-28,33-66` |
| **SEC-04** *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* | Injection shell possible dans `scanExecutor` via `exec()` | Concaténation directe de `sanitizedScannerName`, `outputPath`, `format`, `resolution` dans `exec(\`scanimage ...\`)` sans échappement complet des métacaractères (`;`, `&`, `\|`, `$()`, `\n`). | `backend/utils/scanner/linux/scanExecutor.js:68-89,134-157,216-219` |
| **SEC-05** *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* | Photos `usersphoto` et `personnelphoto` servies sans authentification | `express.static` monté **avant** `protect` sur `/uploads/usersphoto` et `/uploads/personnelphoto`. (`/uploads` racine et `/courrier` sont derrière `protect`). | `server.ts:171-176` |
| **SEC-06** *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* | CORS `origin: true, credentials: true` et Socket.IO `origin: '*'` | Reflète toute origine avec cookies/credentials. `ALLOWED_ORIGINS` inutilisé. | `server.ts:119-124,153-158` |
| **SEC-07** *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* | Helmet et rate limit absents de `server.ts` | Présents dans `backend/server.js:148-206`, absents du point d'entrée réel `server.ts`. | `server.ts:1-236` vs `backend/server.js:148-206` |
| **SEC-08** *(confirmé)* | Réinitialisation de mot de passe renvoyant le mot de passe en clair | `resetPassword` renvoie `newPassword` dans la réponse JSON ; `resetAdminPassword` (hors prod) logue et renvoie `'admin123'` en clair. | `backend/controllers/users/accountControllers.js:170`, `backend/controllers/auth/adminController.js:59,65` |
| **SEC-09** *(confirmé)* | Contrôle d'accès manquant sur routes `:id` (documents orphelins / scan) | `detailControllers.js:85-92` autorise tout utilisateur dès que `assignedTo` est vide ; `documentScanController.js:105-138` (`GET /api/scan/document/:id/:type`) n'a **aucun** contrôle RBAC/département et accepte `type === 'temp'` où `id` devient directement le chemin fichier (`:148-150`). | `backend/controllers/incomingDocuments/detailControllers.js:85-92`, `backend/controllers/scan/documentScanController.js:105-151` |
| **SEC-11** *(confirmé)* | Mass Assignment sur `POST /api/users` et `PUT /api/users/:id` | `User.create(req.body)` sans whitelist de champs ; `updateUser` copie `{ ...req.body }` en ne supprimant que 4 champs (`password`, `isDeleted`, `deletedAt`, `deletedBy`), laissant passer d'autres attributs éventuels. | `backend/controllers/users/managementControllers.js:116,248-253,276` |
| **SEC-12** *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* | Filtrage départemental RAG dans le module IA | `chatController.js:40-71` applique un filtre par `metadata.departmentIds`/`departmentId` pour les rôles non globaux (`GLOBAL_ACCESS_ROLES` = Admin/Director/AdminTuningDesk). Cohérence dépendante de la justesse des métadonnées indexées (`SemanticIndex`). | `backend/controllers/ai/chatController.js:40-71` |
| **Upload / Scan DoS** *(constat complémentaire)* | `POST /api/scan/ocr-upload` sans `authorize(...)` + Swagger public | Tout rôle (`User` inclus) peut soumettre un PDF de 50 Mo à l'OCR ; `/api-docs` et `/api-docs.json` exposés sans authentification même en production. | `backend/routes/scan.js:68-71`, `server.ts:182-186` |

---

## ÉTAPE 3 — DONNÉES ET EXPLOITATION

### 3.1 Stockage physique et incohérences des chemins (`FAIT`)

Quatre conventions de chemins et variables d'environnement coexistent et divergent :

| Usage | Fichier:Ligne | Chemin / Variable utilisée | Problème constaté |
|---|---|---|---|
| Lecture / service PDF protégé | `backend/controllers/fileController.js:43,86` | `process.env.DOCUMENT_PATH \|\| path.join(__dirname, '../../backend/courrier')` | Cherche aussi dans `process.cwd()/backend/uploads`, `uploads`, etc. |
| Sauvegarde des courriers créés | `backend/utils/documentHelper.js:62-71` | `path.join(__dirname, '..', 'courrier', `${year}`, docType)` | **Ignore `DOCUMENT_PATH` !** Si `DOCUMENT_PATH` pointe ailleurs en prod, écriture et lecture divergent. |
| Upload Multer (photos, PJ, docs) | `backend/middleware/upload.js:6-9` | `path.join(__dirname, '..', 'uploads')` (constant à l'init) | **Ignore `UPLOAD_DIR`** pour le stockage Multer, alors que `handleScannedDocument` (`upload.js:145`) lit `process.env.UPLOAD_DIR \|\| uploadDir`. |
| Config Scanner | `backend/utils/scanner/config/scannerConfig.js:11` | `process.env.UPLOAD_PATH \|\| './uploads'` | Troisième nom de variable (`UPLOAD_PATH` ≠ `UPLOAD_DIR`) et relatif à `cwd`. |
| Temp OCR | `backend/routes/scan.js:42` vs `backend/services/cleanupScheduler.js:21` | `scan.js` écrit dans `backend/tmp/ocr-uploads` ; `cleanupScheduler` purge `os.tmpdir()/ocr-uploads` | **Incohérence :** en cas de crash pendant un OCR `/api/scan/ocr-upload`, les PDF temporaires dans `backend/tmp/ocr-uploads` ne sont jamais purgés par le cron de 02h00. |
| Backups UI / Scheduler | `backend/controllers/backup.js:176` vs `backend/services/backupScheduler.js:12` vs `backup.js:678,731` | `backup.js:176` écrit les `.zip` dans `process.cwd()/backups` (ignore `BACKUP_DIR`) ; `backupScheduler.js:12` écrit `mongodump` dans `BACKUP_DIR \|\| cwd/backups` ; `backup.js:678,731` vérifie `BACKUP_PATH` | Trois conventions (`BACKUP_DIR`, `BACKUP_PATH`, `cwd/backups`) ; dossier `backend/uploads/backups` également présent sur disque. |

### 3.2 Base de données MongoDB, index et sauvegardes (`FAIT`)
- **Connexion & fail-fast (`server.ts:22`, `backend/config/db.js:47-72`) :** `bufferCommands` est désactivé (`false`) ; `directConnection: true` est appliqué automatiquement si l'URI ne contient pas `+srv` ni `replicaSet`, avec `serverSelectionTimeoutMS: 5000` et `socketTimeoutMS: 5000`. En échec de connexion, `connectDB()` retourne `null` et **démarre quand même le serveur HTTP en mode dégradé**.
- **Index déclarés dans les schémas Mongoose (`FAIT`) :** Les index existent dans les modèles clés (`IncomingDocument.js:93-100` unique `{serialNumber, year}`, `OutgoingDocument.js:82-88`, `User.js:10,65,70`, `Personnel.js:161-164`, `Attendance.js:117-120`, `AuditLog.js:57-60`, `SemanticIndex.js:72-86`, `Message.js:67-70`, etc.). Leur création réelle et l'absence de doublons existants en base est **`[À TESTER EN LOCAL]`**.
- **Sauvegarde intégrée UI (`backend/controllers/backup.js` & `backend/services/backupScheduler.js`) — failles majeures (`FAIT`) :**
  1. `processBackup()` (`backup.js:278-283`) déclenche `dumpMongoDB()` dans un répertoire séparé `mongo-<timestamp>` **hors de l'archive ZIP**. Le ZIP lui-même (`backup.js:342-343`) ne contient que les exports JSON d'`IncomingDocument` et `OutgoingDocument` (+ leurs PDF). **Les collections `User`, `Department`, `Personnel`, `Attendance`, `Folder`, `Message`, `AuditLog`, `RH*` sont absentes du ZIP téléchargeable via l'UI.**
  2. `dumpMongoDB()` (`backupScheduler.js:16-17`) lance `exec(\`mongodump --uri="${uri}" --out="${dumpDir}"\`)` : l'URI (avec identifiants) est exposée sur la ligne de commande du processus système, et tombe en repli sur `mongodb://localhost:27017/document-management` si `MONGODB_URI` est vide.
  3. `restoreBackup()` (`backup.js:633`) exécute `unzip -o -q "${backup.filePath}" -d "${process.cwd()}"` : binaire Linux `unzip` inexistant par défaut sur Windows Server, extraction brute sur `cwd` sans restauration MongoDB réelle (`mongorestore` absent du contrôleur).
- **Scripts de sauvegarde/restauration d'exploitation (`deploy/scripts/` & `deploy/backup/`) (`FAIT`) :**
  - **Linux (`deploy/scripts/backup-all.sh` & `restore-all.sh`) :** `backup-all.sh` exécute `mongodump --archive=... --gzip`, archive `courrier/` + `uploads/`, calcule les `sha256sum` des `.gguf` et applique une rétention (14j) en protégeant toujours la dernière archive (`:128-143`). `restore-all.sh` vérifie `tar -tzf`, cible par défaut `document-management-test` (`:68-77`) et exige `--target-prod` + saisie exacte de `'OUI'` (`:89-97`) avant `--drop`. **Attention :** `backup-all.sh:28` écrit son dossier temporaire dans `/tmp/${BACKUP_TAG}` (risque de saturation de `/tmp` si volume documentaire élevé) et `deploy/ubuntu/systemd/dms-backup.service:10` cible `/var/backups/dms` non créé par `setup-system.sh`.
  - **Windows (`deploy/backup/backup-mongo.ps1`) :** Exécute `mongodump.exe`, copie `backend\courrier` et `backend\uploads`, calcule les SHA256 et compresse en `.zip` via `Compress-Archive` (attention : `Compress-Archive` .NET sous Windows échoue au-delà de 2 Go / limite Zip32 selon la version PowerShell, et les chemins `$BackupDir`, `$CourrierSrc`, `$UploadsSrc` sont codés en dur aux lignes `:23,77,86` en ignorant `DOCUMENT_PATH`/`UPLOAD_DIR`/`BACKUP_DIR` du `.env`).
  - L'ensemble des scripts backup/restore est marqué `[NON TESTÉ]` dans leurs en-têtes : **`[À TESTER EN LOCAL]`**.

### 3.3 OCR, files d'attente et mémoire (`FAIT`)
- **Aucune file d'attente ni worker isolé actif :** Bien que `backend/jobs/ocrQueue.js` et `backend/jobs/ocrProcessor.js` (Bull + Redis) existent dans le dépôt, ils ne sont importés ni par `server.ts` ni par `backend/routes/scan.js` ni par `fileUploadHandler.js` / `scannedDocumentHandler.js`.
- **Exécution OCR synchrone dans le processus HTTP Express (`backend/utils/ocrProcessor.js:105-317`) :**
  - Conversion **en une seule passe de toutes les pages** à **600 DPI** via `pdftoppm -png -r 600` (`ocrProcessor.js:119-121`) dans `os.tmpdir()/ocr-enhanced-<timestamp>`. Sur des PDF multi-pages, les PNG 600 DPI + le prétraitement ImageMagick + Tesseract s'exécutent dans le processus principal sans limite de concurrence ni file d'attente : risque élevé de saturation RAM/disque (`/tmp`) et de timeout HTTP/Nginx (300s).
  - Prétraitement ImageMagick (`ocrProcessor.js:301-303`) : appelle `magick` sous `win32` et `convert` sous Linux (`convert` est déprécié/absent sur certaines installations ImageMagick v7 récentes).
  - Boucle jusqu'à **6 appels séquentiels à `tesseract` par page** (`ocrProcessor.js:149-238`).
  - L'en-tête de `backend/routes/scan.js:68-70` autorise des PDF jusqu'à **50 Mo** pour tout utilisateur authentifié (sans `authorize`), alors que `middleware/upload.js:188` limite les documents à 10 Mo.

### 3.4 Intelligence Artificielle locale (`node-llama-cpp`) et exploitation (`FAIT`)
- **Warm-up & chargement en mémoire (`server.ts:67-80` & `backend/services/ollamaService.js:60-124,184-214`) :**
  - `server.ts:67-80` lance `checkOllamaHealth()` 5 secondes après démarrage **sans lire** la variable `AI_WARMUP` documentée dans `.env.production.example:81`.
  - Si les deux fichiers GGUF (`ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` et `bge-m3-q4_k_m.gguf`) sont présents, `checkOllamaHealth()` (`ollamaService.js:205`) appelle `initModels()`, qui charge **les deux modèles dans le même processus Node.js** qu'Express (`contextSize: 2048`, `LLAMA_THREADS` = cœurs physiques par défaut selon `server.ts:42-47`).
  - `ecosystem.config.cjs:30-34` impose `exec_mode: 'fork'`, `instances: 1`, `max_memory_restart: '6G'`.
  - **`DÉCISION DU PROPRIÉTAIRE` / dimensionnement :** La RAM physique du serveur de production n'est pas connue ici (le conteneur d'audit n'a que 4,0 GiB / 0 Swap). Si les modèles GGUF (~5 Go sur disque) sont chargés sur une machine à ≤ 4–6 GiB sans swap suffisant, le noyau tuera le processus Node (OOM).
- **Scheduler RAG oublié dans `server.ts` (`FAIT`) :** `startIndexRetryScheduler()` (`backend/services/indexRetryScheduler.js:233`, variable `INDEX_RETRY_CRON`) est appelé dans `backend/server.js:323`, **mais n'est jamais appelé dans `server.ts`**.
- **Exploitation PM2 / Logrotate / IIS / Docker (`FAIT`) :**
  - `ecosystem.config.cjs:40-43` fixe `NODE_ENV=production` et `PORT=5000` sans passer `env_file` (compensé par `dotenv.config()` dans `server.ts:38-39` au démarrage, mais `pm2` démarre depuis `cwd`).
  - `deploy/ubuntu/logrotate/dms:1-14` rote `/var/www/dms/logs/*.log` et `*.err` sur 14 jours et exécute `pm2 reloadLogs` en `postrotate` (non testé).
  - `deploy/ubuntu/dms.nginx.conf` et `deploy/windows/web.config` délèguent correctement `/api/`, `/socket.io/`, `/courrier/`, `/uploads/` et `/api-docs` au port `5000` (sans servir `courrier/` ou `uploads/` en direct). Toutefois, Nginx exige les certificats `/etc/ssl/certs/dms-selfsigned.crt` et `/etc/ssl/private/dms-selfsigned.key` (`dms.nginx.conf:39-40`), dont la génération est manuelle (`[À TESTER EN LOCAL]`).
  - `docker-compose.yml` + `backend/Dockerfile.backend` sont désynchronisés : ils exécutent `node server.js` (legacy) sans `poppler-utils`/`tesseract`/`node-llama-cpp` build tools, avec une URI différente (`mongodb://mongo:27017/dms`).

---

## ÉTAPE 4 — GRILLE DE PRÉPARATION AU DÉPLOIEMENT

Légende : **🔴 bloquant** | **🟠 important** | **🟡 conseillé** | **🟢 prêt** | **`[À TESTER EN LOCAL]`**

| Domaine | Critère audité | Statut | Constat factuel (`Fichier:Ligne`) |
|---|---|---|---|
| **Sécurité** | Compte `admin` par défaut (`Admin123!`) | **🔴 bloquant** | `backend/config/db.js:8-45,67` crée `admin`/`Admin123!` automatiquement et logue le mot de passe en clair. |
| **Sécurité** | Porte dérobée hors ligne (`loginController` & `auth.js`) | **🔴 bloquant** | `loginController.js:7-27,51-69` et `auth.js:54-66` authentifient un faux `Admin` avec `admin`/`Admin123!` ou `admin`/`admin` dès que MongoDB est hors ligne ou échoue. |
| **Sécurité** | Secrets JWT de repli en dur | **🔴 bloquant** | `User.js:111` (`'votre_secret_super_securise_123'`), `loginController.js:23` et `server.ts:60` (`'dms_dev_jwt_secret_...'`). |
| **Sécurité** | CORS ouvert (`origin: true`, Socket.IO `'*'`) | **🔴 bloquant** | `server.ts:153-158` (`origin: true, credentials: true`) et `server.ts:119-124` (`origin: '*'`). `ALLOWED_ORIGINS` non appliqué. |
| **Sécurité** | Absence de Helmet & rate limiting dans `server.ts` | **🔴 bloquant** | `helmet`, `globalLimiter`, `loginLimiter` et `trust proxy` absents de `server.ts` (présents uniquement dans `backend/server.js:148-206`). |
| **Exploitation / Sécurité** | `/api/health` toujours HTTP 200 (+ GET fallback 200) | **🔴 bloquant** | `server.ts:238-247` retourne HTTP `200` même avec `database: 'disconnected'` ; `server.ts:265-297` masque la panne DB en renvoyant `200` + tableaux/objets vides sur `GET`. |
| **Sécurité** | `SEC-01` `skipDepartmentCheck` par préfixe d'URL | **🔴 bloquant** | `backend/middleware/auth.js:135-147` court-circuite le contrôle départemental sur 5 préfixes majeurs. |
| **Sécurité** | `SEC-02` Historique RH lisible sans contrôle RBAC | **🔴 bloquant** | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` sans `authorize` ni `checkRHAccess`. |
| **Sécurité** | `SEC-03` `/api/auth/reset-admin` & `/test-admin` | **🔴 bloquant** | `adminController.js:8-28,33-66` (`test-admin` toujours public ; `reset-admin` actif si `NODE_ENV !== 'production'`). |
| **Sécurité** | `SEC-04` *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* Injection shell `scanExecutor` | **🔴 bloquant** | `backend/utils/scanner/linux/scanExecutor.js:75-89,134-157` passe paramètres et noms de périphériques dans `exec()`. |
| **Sécurité** | `SEC-09` Routes `:id` sans filtre (`incomingDocuments` orphelins, `/api/scan/document/:id/:type`) | **🔴 bloquant** | `detailControllers.js:85-92` & `documentScanController.js:105-151` (aucun contrôle départemental, `type=temp` lit `id` comme chemin). |
| **Sécurité** | `SEC-11` Mass Assignment (`POST/PUT /users`) | **🔴 bloquant** | `managementControllers.js:116,248-253,276` (`User.create(req.body)` et `Object.assign(user, updateData)` sans whitelist stricte). |
| **Sécurité** | `SEC-05` *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* Photos servies sans session | **🟠 important** | `server.ts:172-173` expose `/uploads/usersphoto` et `/uploads/personnelphoto` sans `protect`. |
| **Sécurité** | `SEC-08` Mot de passe retourné en clair à la réinitialisation | **🟠 important** | `accountControllers.js:170` renvoie `newPassword` dans la réponse JSON. |
| **Sécurité** | `SEC-07` *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* + `Swagger` public + OCR sans rôle | **🟠 important** | `server.ts:182-186` expose `/api-docs` publiquement ; `routes/scan.js:68-71` laisse tout rôle déclencher l'OCR 50 Mo. |
| **Sécurité** | `SEC-06` *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* Stockage JWT `localStorage` & `?token=` | **🟠 important** | `src/services/apiService.ts:16` et `auth.js:23-25`. |
| **Sécurité** | `SEC-12` *(numérotation de `docs/PRET_DEPLOIEMENT.md`, non confirmée)* Filtrage RAG IA | **🟡 conseillé** | `chatController.js:40-71` filtre par département ; fiabilité de l'indexation à vérifier en recette. |
| **Config / Réseau** | Conflit Port 3000 vs 5000 & UFW Ubuntu | **🔴 bloquant** | `server.ts:316` & `setup-system.sh:106` sur `3000` vs Nginx/IIS/PM2/smoke-test sur `5000`. |
| **Base de données** | `install-mongodb.sh` `authSource=admin` vs `document-management` | **🔴 bloquant** | `install-mongodb.sh:71-78` vs `:107` et `.env.production.example:23`. **`[À TESTER EN LOCAL]`** |
| **Déploiement Ubuntu** | `deploy.sh` appelle `check-env.mjs` sans charger `.env` | **🟠 important** | `deploy/ubuntu/deploy.sh:38` échouera si les variables du `.env` ne sont pas exportées dans le shell. |
| **Stockage & Chemins** | Divergence `DOCUMENT_PATH`, `UPLOAD_DIR`, `UPLOAD_PATH`, `BACKUP_DIR` | **🟠 important** | `documentHelper.js:64`, `upload.js:6`, `scannerConfig.js:11`, `backup.js:176` ignorent tout ou partie des variables `.env`. |
| **Sauvegardes** | Backup UI incomplet + `unzip` Linux-only + `/var/backups/dms` absent | **🔴 bloquant** | `backup.js:342-343,633` (ZIP sans Users/RH, `unzip` absent sous Windows) ; `dms-backup.service:10` vs `setup-system.sh:93` ; `backup-mongo.ps1` ignore `.env`. **`[À TESTER EN LOCAL]`** |
| **OCR & Mémoire** | OCR synchrone 600 DPI dans le processus Express, pas de queue/worker | **🟠 important** | `ocrProcessor.js:119-238` (toutes pages en 600 DPI, 6 passes Tesseract, `convert` Linux, `jobs/ocrQueue.js` non branché). **`[À TESTER EN LOCAL]`** |
| **IA & Schedulers** | Chargement GGUF inconditionnel + `startIndexRetryScheduler` absent de `server.ts` | **🟠 important** | `server.ts:67-80` ignore `AI_WARMUP` ; `server.ts` n'appelle pas `startIndexRetryScheduler()` (`backend/server.js:323`). **`[À TESTER EN LOCAL]`** |
| **Outillage statique** | `npx tsc --noEmit` et `npm run lint -- --quiet` (conteneur uniquement) | **🟢 prêt** *(conteneur)* | Exit `0` dans `/app/applet` (12 warnings eslint non bloquants). Build Vite `npm run build` et machine cible **`[À TESTER EN LOCAL]`**. |
| **Reverse Proxy** | Templates `dms.nginx.conf` et `deploy/windows/web.config` | **🟡 conseillé** | Proxy correct vers `5000` (y compris `/courrier/`, `/uploads/`, WebSockets), certificats SSL et ARR IIS **`[À TESTER EN LOCAL]`**. |
| **Docker** | `docker-compose.yml` & `Dockerfile.backend` | **🟠 important** | Exécutent `node server.js` legacy avec URI différente et sans binaires OCR/IA. |

---

## ÉTAPE 5 — RAPPORT FINAL ET PLAN DE VALIDATION LOCALE

### 5.1 Synthèse de la décision
- **Verdict : 🔴 NON PRÊT pour une mise en production** *(en particulier pour des données administratives et RH sensibles)*.
- **Faits bloquants immédiats à corriger avant tout déploiement :**
  1. Supprimer la porte dérobée hors ligne (`loginController.js`, `auth.js`), la création automatique `admin`/`Admin123!` (`db.js`) et tous les secrets JWT de repli (`User.js`, `loginController.js`, `server.ts`).
  2. Porter dans `server.ts` la sécurité manquante : CORS strict basé sur `ALLOWED_ORIGINS`, `helmet`, rate limiting global + anti-bruteforce login, `trust proxy`, et basculer `/api/health` + les routes API en **HTTP 503 réel** quand MongoDB est déconnecté (`readyState !== 1`).
  3. Corriger les contrôles d'accès et injections (`SEC-01`, `SEC-02`, `SEC-03` sur `test-admin`, `SEC-04` `exec` scanner, `SEC-09`, `SEC-11`, ainsi que `SEC-05`, `SEC-07`, `SEC-08`, Swagger public et `/api/scan/ocr-upload`).
  4. Aligner `PORT=5000`, `ufw deny 5000/tcp`, `authSource` MongoDB (`document-management` vs `admin`), le chargement de `.env` dans `deploy.sh`, les répertoires `/var/backups/dms` et la cohérence `DOCUMENT_PATH`/`UPLOAD_DIR`/`BACKUP_DIR`.
  5. Fiabiliser le backup/restauration applicatif et isoler l'OCR (worker / file d'attente / page par page).

### 5.2 Répartition `FAIT` / `HYPOTHÈSE` / `DÉCISION DU PROPRIÉTAIRE`
- **`FAIT` :** Tous les constats `fichier:ligne` ci-dessus, ainsi que `npx tsc --noEmit` (exit `0`) et `npm run lint -- --quiet` (exit `0`) exécutés dans le conteneur cloud `/app/applet`.
- **`HYPOTHÈSE` :**
  - `install-mongodb.sh` échouera à connecter `dms_app_user` tant que `authSource=admin` contredit `use document-management`.
  - Un PDF scanné volumineux (50 Mo / multi-pages) à 600 DPI ou le chargement conjoint d'ALLaM-7B + BGE-M3 provoquera un OOM ou un timeout proxy sur un serveur à mémoire limitée (≤ 4–6 Go sans swap).
  - `backup.js` restore échouera sur Windows (`unzip` absent).
- **`DÉCISION DU PROPRIÉTAIRE` :**
  - Confirmer la cible OS de production (Ubuntu Server, Windows Server, ou les deux) et la RAM disponible sur le serveur cible pour l'IA GGUF vs OCR.
  - Confirmer le nom de domaine, les certificats TLS, le port interne unique (`5000`), et si l'IA locale (`AI_WARMUP`) doit être activée sur cette machine.
  - Valider la politique de gestion du premier compte administrateur (script CLI interactif au lieu d'un compte `Admin123!` codé en dur).

---

### 5.3 Liste des contrôles `[À TESTER EN LOCAL]` (commandes exactes)

#### Sur la machine Ubuntu Server cible (ou VM de recette)
```bash
# 1. Vérifier les prérequis système, Node >= 22, binaires OCR et MongoDB
node -v && npm -v && mongod --version && mongosh --version && mongodump --version
tesseract --version && tesseract --list-langs && pdftoppm -v && which convert magick scanimage

# 2. Charger .env et lancer le contrôle d'environnement + build + tests
set -a && source .env && set +a
node deploy/scripts/check-env.mjs
npm ci && npm run build && npm run test:run

# 3. Tester l'authentification MongoDB réelle avec l'URI du .env
mongosh "$MONGODB_URI" --eval "db.runCommand({ ping: 1 })"

# 4. Vérifier l'écoute exclusive sur 127.0.0.1:5000 (ou port choisi) et UFW
ss -tulpn | grep -E '3000|5000|27017'
sudo ufw status numbered

# 5. Tester le smoke test complet et l'audit sécurité automatisé (contre le serveur démarré)
node deploy/scripts/smoke-test.mjs "http://127.0.0.1:5000" --strict-security

# 6. Tester réellement la chaîne backup puis restore sur la base de TEST
bash deploy/scripts/backup-all.sh /var/backups/dms 14
bash deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_*.tar.gz

# 7. Tester un OCR multi-pages (PDF réel arabe+français) et surveiller RAM/CPU
free -h && ps aux | grep -E 'tsx|node|tesseract|pdftoppm'

# 8. Valider la configuration Nginx et le service systemd backup
sudo nginx -t
sudo systemctl status dms-backup.timer --no-pager
```

#### Sur la machine Windows Server cible (PowerShell Administrateur)
```powershell
# 1. Vérifier Node >= 22, MongoDB Tools, Tesseract, Poppler, NSSM et IIS
node -v; npm -v; mongodump --version; tesseract --version; pdftoppm -v; nssm version

# 2. Compiler et exécuter les vérifications pre-flight (charger .env dans la session puis tester)
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process') } }
node .\deploy\scripts\check-env.mjs
npm ci; npm run build; npm run test:run

# 3. Installer/vérifier le service Windows et tester le smoke test
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-service.ps1
Get-Service DMSBackend
node .\deploy\scripts\smoke-test.mjs "http://127.0.0.1:5000" --strict-security

# 4. Tester la sauvegarde Windows (et vérifier les chemins réels .env vs script)
powershell -ExecutionPolicy Bypass -File .\deploy\backup\backup-mongo.ps1
```
