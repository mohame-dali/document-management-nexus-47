# Porte de décision — « Prêt pour le déploiement ? »

> **Statut d'analyse** : Audit statique réalisé sur la copie locale du projet au `pwd` ci-dessous, sans aucune modification de code et sans exécution de serveur cible.  
> **Règle de décision** : Un seul **`FAIL`** dans les portes **`G1` à `G6`** entraîne un verdict **`NON PRÊT`**. Même si `G1`–`G6` passaient après correction, la lecture du code seule ne permet **JAMAIS** de déclarer **`PRÊT`** : elle autorise au maximum **`PILOTE POSSIBLE`** sous réserve d'exécuter et de réussir les tests locaux/recette en environnement lancé (**`[À TESTER EN LOCAL]`**).  
> **Aucun secret** n'est reproduit dans ce document (les chaînes sensibles lues dans le code sont remplacées par `[MASQUÉ]`).

---

## 0. Identification de la copie du projet analysée (`FAIT`)

- **Répertoire de travail (`pwd`)** : `/app/applet`
- **Verrouillage des dépendances** :
  - `package-lock.json` : **`ABSENT`** (`ls: cannot access 'package-lock.json': No such file or directory`).
  - `bun.lock` : **présent** (`-rw-r--r-- ... bun.lock`), non utilisable avec `npm ci`.
- **Serveur de référence** : `/app/applet/server.ts` (`ecosystem.config.cjs:26`, `deploy/windows/install-service.ps1:55-62`).
- **Serveur secondaire historique** : `/app/applet/backend/server.js` (Express 4, `backend/package.json:15`).

---

## 1. Évaluation détaillée porte par porte (`G1` à `G9`)

### G1 — Aucun compte par défaut (`FAIL` — Bloquant)
- **Critère** : `createDefaultAdmin` / `DEFAULT_ADMIN` absents ou désactivés en production.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - `backend/config/db.js:8-14` : `const DEFAULT_ADMIN = { username: 'admin', password: '[MASQUÉ]', role: 'Admin', isActive: true, mustChangePassword: true };`
  - `backend/config/db.js:20-45` : `const createDefaultAdmin = async () => { ... await User.create({ username: DEFAULT_ADMIN.username, password: DEFAULT_ADMIN.password, ... }); }` — aucune condition `process.env.NODE_ENV !== 'production'`.
  - `backend/config/db.js:67` : `await createDefaultAdmin();` — exécuté systématiquement à chaque connexion MongoDB réussie.
  - `[FICHIER ABSENT]` : aucun script interactif sécurisé de création du premier SuperAdmin ne remplace `createDefaultAdmin`.

---

### G2 — Aucune porte dérobée hors ligne (`FAIL` — Bloquant)
- **Critère** : `getMockAdmin`, mode mock dans `loginController.js` et `auth.js` supprimés ; le serveur refuse de démarrer sans MongoDB en production.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - `backend/controllers/auth/loginController.js:7-27` : `const MOCK_ADMIN_ID = '65f000000000000000000001'; const getMockAdmin = () => ({ ... role: 'Admin', ... });`
  - `backend/controllers/auth/loginController.js:51-57` : `if (mongoose.connection.readyState !== 1) { if (username.trim() === 'admin' && (password === '[MASQUÉ]' || password === '[MASQUÉ]')) { ... return sendTokenResponse(getMockAdmin(), 200, res); } }`
  - `backend/controllers/auth/loginController.js:63-69` : même repli `getMockAdmin()` dans le `catch (dbErr)`.
  - `backend/middleware/auth.js:54-66` : `if (!user && (decoded.id === '65f000000000000000000001' || mongoose.connection.readyState !== 1)) { user = { ... role: decoded.role || 'Admin', ... }; }`
  - `server.ts:343-352` : `const conn = await connectDB(); ... console.log('[Database] ⚠️ Démarrage HTTP en mode dégradé (MongoDB hors ligne...)');` — le serveur démarre sans refuser lorsque MongoDB est indisponible en production.

---

### G3 — JWT (`FAIL` — Bloquant)
- **Critère** : aucun secret de repli (`User.js`, `loginController.js`, `server.ts`) ; refus de démarrer si `JWT_SECRET` absent ou `< 32` caractères ; durée `<= 8h` ; pas de `?token=` dans l'URL.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - **Secret de repli présent** :
    - `backend/models/User.js:111` : `process.env.JWT_SECRET || '[MASQUÉ]'`
    - `backend/controllers/auth/loginController.js:23` : `process.env.JWT_SECRET || '[MASQUÉ]'`
    - `server.ts:60` : `process.env.JWT_SECRET = '[MASQUÉ]';` (hors production).
  - **Longueur `< 32` caractères non bloquée au démarrage de `server.ts`** :
    - `server.ts:53-57` : vérifie uniquement `if (!process.env.JWT_SECRET)`, sans vérifier `.length < 32` (seul `deploy/scripts/check-env.mjs:37,88-90` le contrôle en pré-vol externe).
  - **Durée par défaut `30d` (> `8h`)** :
    - `server.ts:63-64` : `process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';` et `JWT_COOKIE_EXPIRE || '30'`
    - `backend/models/User.js:113` : `expiresIn: process.env.JWT_EXPIRE || '30d'`
    - `backend/controllers/auth/loginController.js:24` : `expiresIn: process.env.JWT_EXPIRE || '30d'`
    - `backend/controllers/auth/utils.js:8` : `const cookieExpire = process.env.JWT_COOKIE_EXPIRE || 30;`
  - **`?token=` dans l'URL accepté** :
    - `backend/middleware/auth.js:23-25` : `else if (req.query && req.query.token) { token = req.query.token; }`

---

### G4 — Socle HTTP (`FAIL` — Bloquant)
- **Critère** : CORS en liste blanche (`ALLOWED_ORIGINS` réellement lu, Socket.IO inclus), `helmet`, rate limiting sur le login, `trust proxy`, `/api/health` en `503` si MongoDB est déconnecté, plus de fallback HTTP `200` sur erreur MongoDB.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - **CORS ouvert (`ALLOWED_ORIGINS` ignorée)** :
    - `server.ts:153-158` : `app.use(cors({ origin: true, credentials: true, ... }))`
    - `server.ts:119-124` (Socket.IO) : `cors: { origin: '*', methods: ['GET', 'POST'] }`
  - **`helmet` absent de `server.ts`** : aucune importation ni appel `app.use(helmet(...))` dans `server.ts:1-418` (présent uniquement dans le serveur secondaire `backend/server.js:148-166`).
  - **Rate limiting sur `/api/auth/login` absent de `server.ts`** : aucune importation ni utilisation de `express-rate-limit` dans `server.ts:1-418` (présent uniquement dans `backend/server.js:168-206`).
  - **`trust proxy` absent** : aucun `app.set('trust proxy', ...)` dans `server.ts:1-418` (et commenté dans `backend/server.js:171`).
  - **`/api/health` reste en HTTP `200` si MongoDB est déconnecté** :
    - `server.ts:238-247` : `app.get(['/api/test', '/api/health'], (_req, res) => { res.json({ ..., database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }); });` (pas de statut `503`).
  - **Fallback HTTP `200` sur erreur MongoDB toujours actif** :
    - `server.ts:255-303` : `if (err.name === 'MongooseError' ... ) { ... if (req.method === 'GET') { ... return res.json({ success: true, data: ... }); } }`

---

### G5 — Contrôle d'accès (`FAIL` — Bloquant)
- **Critère** : isolation par département (courriers sans `assignedTo`, scans, `/courrier`, `/uploads`, photos), historique RH protégé, mot de passe jamais renvoyé, mass assignment (liste blanche de champs), `test-admin` / `reset-admin` absents, Swagger protégé.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - **Courriers sans `assignedTo` accessibles à tous les départements** :
    - `backend/controllers/incomingDocuments/detailControllers.js:85-92` : `if (!document.assignedTo || document.assignedTo.length === 0) { ... return res.status(200).json({ success: true, data: document }); }`
    - `backend/controllers/fileController.js:36` : `const hasAccess = docDepts.length === 0 || docDepts.some((d) => userDepts.includes(d));`
  - **Scans non isolés + traversal sur `type=temp`** :
    - `backend/controllers/scan/documentScanController.js:105-165` : `getDocumentScan` ne vérifie ni le rôle ni le département ; pour `type === 'temp'`, `determineDocumentPath` retourne directement `id` (`:148-151`) transmis à `path.join(__dirname, '../..', filePath)` (`:122`).
  - **`/courrier` et `/uploads` sans isolation départementale** :
    - `server.ts:169` & `backend/controllers/fileController.js:84-118` : `/courrier` applique `protect` (authentification) sans vérifier le département associé au document.
    - `server.ts:176` : `app.use('/uploads', protect, express.static(path.join(backendDir, 'uploads')));` — tout utilisateur authentifié peut lire tous les fichiers d'`uploads/`.
  - **Photos utilisateurs et personnel servies sans authentification** :
    - `server.ts:172-173` : `app.use('/uploads/usersphoto', express.static(...))` et `app.use('/uploads/personnelphoto', express.static(...))` montés avant `protect` (`:176`).
  - **Historique RH non protégé par `checkRHAccess` / `authorize` en lecture** :
    - `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` : `router.get('/personnel/:personnelId/promotions|postes|diplomes|sanctions|full-history', protect, ...)` — accessible à tout utilisateur connecté quel que soit son rôle/département.
  - **Mot de passe renvoyé en clair à la réinitialisation** :
    - `backend/controllers/users/accountControllers.js:170` : `res.status(200).json({ success: true, message: 'Password reset successful', newPassword: newPassword });`
  - **Mass assignment dans la gestion des utilisateurs** :
    - `backend/controllers/users/managementControllers.js:116` : `const user = await User.create(req.body);` (aucune liste blanche).
    - `backend/controllers/users/managementControllers.js:248-276` : `const updateData = { ...req.body }; ... Object.assign(user, updateData);` (exclusion de 4 champs seulement, pas de liste blanche).
  - **`test-admin` / `reset-admin` non montés mais toujours présents dans le contrôleur** :
    - `backend/routes/auth.js:1-25` : routes absentes du routeur auth (**OK côté montage**), **mais** `backend/controllers/auth/adminController.js:8-71` conserve toujours `exports.testAdminCredentials` (`:8-28`, sans restriction prod) et `exports.resetAdminPassword` (`:33-71`, réinitialisation en `[MASQUÉ]`).
  - **Swagger `/api-docs` exposé sans authentification** :
    - `server.ts:182-186` : `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); app.get('/api-docs.json', ...);` — aucun `protect` ni `authorize('Admin')` ni désactivation en production.

---

### G6 — Injection (`FAIL` — Bloquant)
- **Critère** : `scanExecutor` n'utilise plus `exec()` avec concaténation (`execFile` + tableau d'arguments).
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - `backend/utils/scanner/linux/scanExecutor.js:2,6,75-77,89,142-144,157,216,219` : importe `exec` (pas `execFile`) et exécute `exec(scanCommand, ...)` sur des chaînes interpolées (`scanimage --device="${sanitizedScannerName}" ... > "${outputPath}"`, `tesseract "${filePath}" ...`).
  - `backend/utils/scanner/windows/scanExecutor.js:5-6,42,74-112,137-166` : utilise `execAsync(\`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"\`)` avec scripts générés par concaténation de `${scannerDevice}`, `${resolution}`, `${colorMode}`, `${documentSource}`, `${outputPath}`.

---

### G7 — Déploiement (`FAIL` — Non bloquant G1–G6 mais bloquant exploitation)
- **Critère** : un seul serveur de référence, port unique cohérent, `authSource` MongoDB cohérent, variables de chemins cohérentes (`DOCUMENT_PATH`, `UPLOAD_DIR`, `BACKUP_DIR`/`PATH`/`ROOT`), aucune ressource externe (CDN, Google Fonts).
- **Verdict** : **`FAIL`** *(sous-critère polices/CDN locales : `PASS` statique, runtime `[À TESTER EN LOCAL]`)*
- **Preuves (`fichier:ligne`)** :
  - **Aucune ressource externe CDN/Google Fonts (statique = `PASS`, runtime = `[À TESTER EN LOCAL]`)** :
    - `index.html:1-30` sans balise CDN/Google Fonts ; `src/main.tsx:2-3` importe `@fontsource-variable/cairo` et `@fontsource-variable/inter` en local ; `grep` sur `index.html` et `src/` retourne `0` correspondance (`fonts.googleapis`, `fonts.gstatic`, `cdn.`, `unpkg.com`, `jsdelivr`).
  - **Double serveur / double `package.json` (`FAIL`)** : `server.ts` vs `backend/server.js` (`backend/Dockerfile.backend:25`), `package.json:81` (`mongoose ^9.10.2`) vs `backend/package.json:21` (`^8.0.0`).
  - **Port `3000` vs `5000` incohérent (`FAIL`)** : `3000` dans `server.ts:316`, `vite.config.ts:14`, `.env.example:1`, `deploy/ubuntu/setup-system.sh:106` (`ufw deny 3000/tcp`) ; contre `5000` dans `.env.production.example:15`, `ecosystem.config.cjs:42`, `deploy/windows/install-service.ps1:83`, `deploy/windows/web.config:30`, `deploy/ubuntu/dms.nginx.conf:7`, `dms.nginx.conf:89`, `deploy/ubuntu/deploy.sh:78`, `deploy/ubuntu/rollback.sh:42`, `deploy/scripts/check-env.mjs:38`.
  - **`authSource` MongoDB incohérent (`FAIL`)** : `deploy/ubuntu/install-mongodb.sh:71-78` crée `dms_app_user` dans `document-management`, tandis que `install-mongodb.sh:107` et `.env.production.example:23` affichent `?authSource=admin`.
  - **Variables de chemins incohérentes (`FAIL`)** :
    - `DOCUMENT_PATH` lue (`backend/controllers/fileController.js:43,86`) mais ignorée à l'écriture (`backend/utils/documentHelper.js:62-70`).
    - `UPLOAD_DIR` (`backend/middleware/upload.js:145`) vs `UPLOAD_PATH` (`backend/utils/scanner/config/scannerConfig.js:11`) ignorés par Multer (`upload.js:6-9`).
    - `BACKUP_DIR` (`backend/services/backupScheduler.js:12`, `deploy/scripts/check-env.mjs:150`) vs `BACKUP_PATH` (`backend/controllers/backup.js:678,731`) vs `process.cwd()/backups` (`backup.js:176`, `deploy/backup/backup-mongo.ps1:23`) vs `BACKUP_ROOT` (`scripts/backup-mongo.sh:13`).

---

### G8 — Exploitation (`FAIL`)
- **Critère** : sauvegarde ET restauration existent pour base + fichiers (Ubuntu et Windows), planification, `logrotate` cohérent avec les journaux réels, retour arrière.
- **Verdict** : **`FAIL`**
- **Preuves (`fichier:ligne`)** :
  - **Ubuntu (partiel avec défauts)** :
    - Sauvegarde + restauration complètes présentes : `deploy/scripts/backup-all.sh:1-148`, `deploy/scripts/restore-all.sh:1-178`.
    - Planification : `deploy/ubuntu/systemd/dms-backup.service:1-16` + `dms-backup.timer:8` (`OnCalendar=*-*-* 02:00:00`), mais `deploy/ubuntu/setup-system.sh:93` ne crée pas `/var/backups/dms`.
    - `logrotate` : `deploy/ubuntu/logrotate/dms:1,8,12` couvre `/var/www/dms/logs/*.log` et `*.err` (`ecosystem.config.cjs:45-46`, `dms-backup.service:11-12`), mais pas le journal du démon PM2 (`~dms/.pm2/pm2.log`) et ne contient pas `su dms dms`.
    - Retour arrière / mise à jour : `deploy/ubuntu/rollback.sh:26-49` ne restaure que `dist.bak` (pas code+BDD) et hardcode `5000` (`:42`) ; `deploy/ubuntu/deploy.sh:38` ne charge pas `.env` avant `check-env.mjs` et `:78` hardcode `5000`.
  - **Windows (`FAIL`)** :
    - Sauvegarde existe (`deploy/backup/backup-mongo.ps1:1-161`, écrit toutefois dans `<ProjectRoot>\backups` `:23` en ignorant `BACKUP_DIR`), planification documentée dans `deploy/windows/README_DEPLOY_WINDOWS.md:126-129`.
    - Restauration Windows (`restore-all.ps1`) : **`[FICHIER ABSENT]`**.
    - Mise à jour et retour arrière Windows (`deploy.ps1` / `rollback.ps1`) : **`[FICHIER ABSENT]`**.

---

### G9 — Cohérence du guide d'installation (`FAIL` sur complétude des fichiers `[FICHIER ABSENT]` ; `PASS` sur l'exactitude des 22 fichiers existants cités)
- **Critère** : chaque commande de `docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md` correspond à un fichier existant ; liste des `[FICHIER ABSENT]` restants.
- **Verdict** : **`FAIL` (dépendant de `[FICHIER ABSENT]` restants) / Commandes pointant vers des scripts existants vérifiées présentes**
- **Preuves (`fichier:ligne` et vérification disque)** :
  - Tous les 22 scripts/fichiers existants cités dans `docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md` ont été vérifiés présents sur `/app/applet` (`setup-system.sh`, `install-mongodb.sh`, `gen-selfsigned-cert.sh`, `deploy/ubuntu/dms.nginx.conf`, `dms.nginx.conf`, `logrotate/dms`, `dms-backup.service`, `dms-backup.timer`, `deploy.sh`, `rollback.sh`, `check-env.mjs`, `smoke-test.mjs`, `backup-all.sh`, `restore-all.sh`, `install-prereqs.ps1`, `install-service.ps1`, `web.config`, `backup-mongo.ps1`, `ecosystem.config.cjs`, `.env.production.example`, `download-models.js`, `checkModelPath.js`).
  - **`[FICHIER ABSENT]` restants à créer/fournir** :
    1. `package-lock.json` (exigé par `npm ci` dans `deploy/ubuntu/deploy.sh:54` et `deploy/windows/install-prereqs.ps1:81`).
    2. Script/route sécurisée de création du **premier SuperAdmin** (remplaçant `DEFAULT_ADMIN` dans `backend/config/db.js:8-45`).
    3. Scripts Windows manquants sous `deploy/windows/` : durcissement/comptes MongoDB, liaison HTTPS IIS, pare-feu (`New-NetFirewallRule`), restauration (`restore-all.ps1`), mise à jour/rollback (`deploy.ps1` / `rollback.ps1`), installeurs URL Rewrite 2.1 et ARR 3.0.
    4. Répertoire `docs/audit-local/` (`[RÉPERTOIRE ABSENT]`).

---

## 2. Tableau récapitulatif final des portes

| Porte | Critère | Statut (`PASS` / `FAIL` / `[À TESTER EN LOCAL]`) | Preuve `fichier:ligne` | Bloquant ? |
|---|---|---|---|---|
| **G1** | Aucun compte par défaut (`createDefaultAdmin` / `DEFAULT_ADMIN`) | **`FAIL`** | `backend/config/db.js:8-14,20-45,67` ; `[FICHIER ABSENT]` | **OUI (Bloquant)** |
| **G2** | Aucune porte dérobée hors ligne (mode mock supprimé, refus sans MongoDB) | **`FAIL`** | `loginController.js:7-27,51-57,63-69` ; `auth.js:54-66` ; `server.ts:343-352` | **OUI (Bloquant)** |
| **G3** | JWT (aucun fallback, blocage `< 32` car., `<= 8h`, pas de `?token=`) | **`FAIL`** | `User.js:111,113` ; `loginController.js:23-24` ; `server.ts:53-64` ; `utils.js:8` ; `auth.js:23-25` | **OUI (Bloquant)** |
| **G4** | Socle HTTP (CORS liste blanche + Socket.IO, `helmet`, rate-limit, `trust proxy`, `/api/health` `503`, fin fallback `200`) | **`FAIL`** | `server.ts:119-124,153-158,238-247,255-303` ; `helmet`/`rateLimit`/`trust proxy` absents de `server.ts` | **OUI (Bloquant)** |
| **G5** | Contrôle d'accès (isolation dept, `/courrier`, `/uploads`, photos, RH, mot de passe, mass assignment, admin routes, Swagger) | **`FAIL`** | `detailControllers.js:85-92` ; `fileController.js:36` ; `documentScanController.js:105-165` ; `server.ts:169,172-176,182-186` ; `rhPersonnelHistoryRoutes.js:9-41` ; `accountControllers.js:170` ; `managementControllers.js:116,248-276` ; `adminController.js:8-71` | **OUI (Bloquant)** |
| **G6** | Injection (`scanExecutor` sans `exec()` concaténé, `execFile` + args) | **`FAIL`** | `linux/scanExecutor.js:2,75-77,89,142-144,157,216,219` ; `windows/scanExecutor.js:5-6,42,74-112,166` | **OUI (Bloquant)** |
| **G7** | Déploiement (serveur unique, port, `authSource`, chemins, zéro CDN/Google Fonts) | **`FAIL`** *(polices locales : `PASS` statique, `[À TESTER EN LOCAL]` runtime)* | `server.ts:316` vs `ecosystem.config.cjs:42` ; `install-mongodb.sh:71-78` vs `:107` ; `documentHelper.js:62-70` ; `upload.js:6-9` ; `backup.js:176,678` ; `index.html:1-30` ; `src/main.tsx:2-3` | Non-G1..G6, **bloquant exploitation** |
| **G8** | Exploitation (sauvegarde + restauration Ubuntu/Win, planification, `logrotate`, rollback) | **`FAIL`** | `restore-all.ps1` `[FICHIER ABSENT]` ; `deploy.ps1`/`rollback.ps1` `[FICHIER ABSENT]` ; `setup-system.sh:93` ; `deploy.sh:38,78` ; `rollback.sh:42` ; `logrotate/dms:1` | Non-G1..G6, **bloquant exploitation** |
| **G9** | Cohérence guide (`docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md` vs fichiers présents + `[FICHIER ABSENT]`) | **`FAIL`** *(22 fichiers cités présents, mais `[FICHIER ABSENT]` critiques)* | Présence vérifiée sur `/app/applet` ; manquants : `package-lock.json`, SuperAdmin, scripts Windows (HTTPS/FW/restore/deploy/ARR) | Non-G1..G6, **bloquant exploitation** |

---

## 3. Décision formelle

### **VERDICT : `NON PRÊT`**

- **Justification** : **6 portes bloquantes sur 6 (`G1`, `G2`, `G3`, `G4`, `G5`, `G6`) sont en `FAIL`** dans le code actuel, auxquelles s'ajoutent les `FAIL` d'exploitation/déploiement `G7`, `G8` et les `[FICHIER ABSENT]` de `G9`.
- **Rappel méthodologique** : **On ne peut JAMAIS déclarer une application « PRÊTE » depuis la lecture du code seule.** Une fois les correctifs `G1` à `G9` implémentés et tous passés en `PASS` statique, le verdict maximal issu du code sera **`PILOTE POSSIBLE`**, conditionné à la réussite complète des tests locaux et de recette ci-dessous sur serveur lancé.

---

## 4. Liste des tests locaux à exécuter (`[À TESTER EN LOCAL]`)

*(À exécuter après correction de `G1`–`G9`, sur une VM/environnement de recette isolé avec `.env` chargé.)*

1. **Vérification pré-vol `.env` et dépendances** (`[À TESTER EN LOCAL]`):
   ```bash
   cd /app/applet
   npm ls mongoose
   node --env-file=.env deploy/scripts/check-env.mjs
   ```
2. **Démarrage du serveur unifié sans et avec MongoDB** (`[À TESTER EN LOCAL]`):
   ```bash
   # Test 1 : avec MongoDB arrêté, le serveur de production doit refuser de démarrer (après correction G2) :
   NODE_ENV=production PORT=${PORT} ./node_modules/.bin/tsx server.ts
   # Test 2 : test de compatibilité "npm start" (`node server.ts`) vs `tsx` :
   NODE_ENV=production PORT=${PORT} node server.ts
   ```
3. **Compilation frontend & absence de toute requête réseau externe (CDN / Google Fonts)** (`[À TESTER EN LOCAL]`):
   ```bash
   npm run build
   grep -rnE "fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg\.com|jsdelivr" dist/ || true
   # Puis contrôler dans l'onglet Réseau (DevTools navigateur) hors-ligne qu'aucune requête externe n'est émise.
   ```
4. **Suite automatisée de déploiement et sécurité stricte** (`[À TESTER EN LOCAL]`):
   ```bash
   node deploy/scripts/smoke-test.mjs "http://127.0.0.1:${PORT}" --strict-security
   ```
   *(Couvre `/api/health`, `/api/departments` = 401, `/` HTML, 404, `reset-admin`/`test-admin`, `X-Powered-By`, `nosniff`, CORS `http://evil.test`, `/uploads/usersphoto` et `/uploads/attachments` sans session, rate-limiting `/api/auth/login`.)*
5. **Contrôles ciblés G3, G4, G5, G6 (à exécuter sur serveur lancé)** (`[À TESTER EN LOCAL]`):
   ```bash
   # /api/health quand MongoDB est coupé (attendu après correction G4 : HTTP 503) :
   curl -i "http://127.0.0.1:${PORT}/api/health"
   # Swagger en production (attendu après correction G5 : 401/403/404) :
   curl -i "http://127.0.0.1:${PORT}/api-docs"
   # Rejet du token en URL ?token= (attendu après correction G3 : HTTP 401) :
   curl -i "http://127.0.0.1:${PORT}/api/departments?token=<JWT_VALIDE>"
   # Protection /courrier et /uploads/.jpg/.pdf sans session (attendu HTTP 401/403) :
   curl -i "http://127.0.0.1:${PORT}/courrier/2026/Incoming-Doc/test.pdf"
   curl -i "http://127.0.0.1:${PORT}/uploads/attachments/test.jpg"
   curl -i "http://127.0.0.1:${PORT}/uploads/usersphoto/test.jpg"
   curl -i "http://127.0.0.1:${PORT}/uploads/personnelphoto/test.jpg"
   ```
6. **Tests d'isolation RBAC & départementale (utilisateur `User` / `AdminDepartment` authentifié)** (`[À TESTER EN LOCAL]`):
   - Accès à un courrier d'un autre département et à un courrier sans `assignedTo` (attendu `403`).
   - Accès à `GET /api/scan/document/..%2F..%2Fpackage.json/temp` (attendu `400`/`403`).
   - Accès `GET /api/hr/personnel/:id/full-history` par un `User` hors RH (attendu `403`).
   - Réinitialisation mot de passe & création utilisateur avec champ `role: "Admin"` injecté par un `AdminDepartment` (attendu `newPassword` non exposé si politique retenue, champs hors liste blanche rejetés/ignorés).
7. **Recette reverse proxy, TLS, redémarrage et restauration** (`[À TESTER EN LOCAL]`):
   - Ubuntu : `sudo nginx -t`, `sudo logrotate -d /etc/logrotate.d/dms`, `sudo systemctl start dms-backup.service`, `bash deploy/scripts/restore-all.sh <archive>`, `sudo reboot` + contrôle `DEP-01`.
   - Windows : contrôle ARR + `web.config` (`50 Mo`, WebSocket, `/courrier`, `/uploads`), `stisvc` / `WIA.DeviceManager`, sauvegarde planifiée `DMS_Daily_Backup`, `Restart-Computer` + contrôle `/api/health`.
