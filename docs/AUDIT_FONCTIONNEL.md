# AUDIT FONCTIONNEL COMPLET — DMS (Gestion du Courrier, Documents, RH, IA, Scan)

- `pwd`: `/app/applet`
- **Nature du document** : Audit fonctionnel et sécuritaire en lecture seule (aucun fichier applicatif modifié, aucun correctif appliqué).
- **Méthode et discipline de preuve** :
  - Chaque constat factuel (`FAIT`) cite un chemin `fichier:ligne` vérifié directement dans les fichiers du dépôt avec un extrait court (sans secret).
  - Tout élément non lu ligne par ligne dans cette session est marqué `[NON VÉRIFIÉ]`.
  - Tout comportement dépendant d'une exécution avec serveur lancé, MongoDB, Ollama/`node-llama-cpp`, Tesseract/Poppler ou scanner physique est marqué `[À TESTER EN LOCAL]` avec sa commande exacte.
  - Les catégories `FAIT`, `HYPOTHÈSE` et `DÉCISION DU PROPRIÉTAIRE` sont explicitement séparées.

---

## ÉTAPE 1 — INVENTAIRE PAR MODULE (23 MODULES)

### Tableau de synthèse des 23 modules

| # | Module | Statut | Synthèse factuelle (`FAIT`) |
|---|---|---|---|
| 1 | Authentification et comptes | **CASSÉ** | `updatePassword` contourne `currentPassword` si omis (`passwordController.js:21`) ; `server.ts` n'a ni `helmet` ni `loginLimiter` contrairement à `backend/server.js:148-206`. |
| 2 | Utilisateurs et rôles | **PARTIEL** | CRUD + soft-delete + reset/photo présents (`users.js:34-86`) ; `updateUser` fait du mass assignment `{ ...req.body }` (`managementControllers.js:248`). |
| 3 | Départements | **PARTIEL** | CRUD protégé `Admin` (`departments.js:20-28`) ; `GET /` et `GET /:id` accessibles à tout utilisateur authentifié ; pages UI contiennent de l'arabe en dur (`DepartmentsPage.tsx:152`). |
| 4 | Courrier entrant | **PARTIEL** | CRUD, réponse, dossier, responsable (`incomingDocuments.js:44-91`) ; accès lecture autorisé si `assignedTo` vide (`detailControllers.js:86-92`) ; filtrage/tri UI limités à la page courante (`IncomingDocumentsPage.tsx:231-285`). |
| 5 | Courrier sortant (dont transfert) | **FACTICE / CASSÉ** | Transfert UI purement factice via `setTimeout` (`OutgoingDocumentsPage.tsx:375-385`) ; `documentUpdateController.js:82-96,255-296` corrompt les liens `answer`/`reference` ; crash 500 si `activeDepartment` nul (`detailControllers.js:60`). |
| 6 | Numérotation | **CASSÉ** | `getNextSerialNumber` (`documentHelper.js:21-31`) et `serialNumber.js:45,91` ignorent `isDeleted` et ne sont pas atomiques ; index unique `{ serialNumber, year }` sans filtre partiel (`IncomingDocument.js:103`). |
| 7 | Dossiers et classement | **CASSÉ** | `assignDocumentToFolder` ne vérifie pas le département du document (`folders/documentControllers.js:79-108`) ; `batchMoveDocuments` n'a aucun contrôle RBAC (`:127-146`). |
| 8 | Pièces jointes | **CASSÉ** | `serveProtectedFile` laisse passer si `docDepts.length === 0` et ignore `source.id` (`fileController.js:36`) ; `/courrier` (`server.ts:172`) sans RBAC ; JWT passé en query string `?token=` (`documentService.ts:505-508`). |
| 9 | Scan | **PARTIEL** | Pipeline WIA/SANE asynchrone + vignettes + annulation (`scan.js:26-46`, `documentScanController.js:123-457`) ; `server.ts` omet le contrôle matériel au démarrage et le forwarding Socket.io (`backend/server.js:377-421`) ; matériel `[À TESTER EN LOCAL]`. |
| 10 | OCR | **PARTIEL** | Backend Tesseract/Poppler (`ocrProcessor.js:123-160`) et route `/api/scan/ocr-upload` (`scan.js:77-80`) ; `offlineOcrService.ts:303-328` génère un canvas factice (`PDF content being processed...`) côté client. |
| 11 | Recherche (globale et plein texte) | **PARTIEL** | `globalSearchController.js:73-96` exclut `AdminTuningDesk` de `isGlobalAdmin` et n'interroge ni `ocrText` ni les dossiers/RH ; recherche dédiée `/search` par module. |
| 12 | Messagerie et notifications temps réel | **CASSÉ** | `deleteMessage` (`:167`) et `markAsRead` (`:235`) ouvrent les messages privés à `Admin`/`AdminTuningDesk` ; `deleteNotification` (`activityNotifications.js:75-86`) supprime sans vérifier le destinataire. |
| 13 | Corbeille et suppression logique | **CASSÉ** | Soft-delete détruit définitivement `answer`/`reference` (`documentDeleteController.js:20-27`) ; `emptyTrash` (`trashController.js:625-637`) supprime des dossiers sans vérifier les documents actifs ; `permanentDelete` sur `message` renvoie 200 même si non supprimé (`:445-475`). |
| 14 | Historique et audit | **PARTIEL** | Journalisation et timeline document présentes (`auditLogs.js:17-22`) ; `POST /` ouvert à tout connecté (`:22`) ; export plafonné à 100 lignes (`auditLogs.js:132`) et PDF arabe sans police dédiée (`:177-200`). |
| 15 | RH (personnel, stages, carrière, sanctions) | **CASSÉ** | Routes GET d'historique/sanctions/stages sans `checkRHAccess` (`rhPersonnelHistoryRoutes.js:9-41`, `rhStageRoutes.js:7-11`) ; mass assignment `{ ...req.body }` (`rhStageController.js:226`, `rhPersonnelHistoryController.js:115,281`) ; `RHStage.js:14` référence `RHSessionFormation` inexistant. |
| 16 | Présence et congés | **CASSÉ** | `Attendance.js:27-46` fige un `enum` de 14 motifs incompatibles avec `LeaveReason` dynamique (`attendanceDeclarationController.js:329-339` remet `motif` à `null` sinon) ; UI RH codée en dur en arabe (`AttendancePage.tsx:153`). |
| 17 | Organigramme | **PARTIEL** | Route protégée `protect` (`organizationChartRoutes.js:6-7`), accessible à tous (`App.tsx:238-246`) ; `organizationChartController.js:113` tronque la liste du personnel à `.slice(0, 10)` par département. |
| 18 | Paramètres | **FACTICE / PARTIEL** | `SettingsPage.tsx:212-241` sauve sécurité/notifications/affichage uniquement dans `localStorage` et simule la fermeture des sessions ; `SecurityPrivacyPage.tsx` est 100 % factice et non routée ; `documentOptions.js:19-23` diverge de `App.tsx:223`. |
| 19 | Sauvegarde et restauration | **CASSÉ** | `getBackupStats` fabrique `totalFileSize` (`backup.js:59`) ; `restoreBackup` laisse un enregistrement `'in_progress'`, ignore les échecs `unzip` (`:615-637`) et ne restaure pas MongoDB. |
| 20 | Assistant IA (RAG) | **CASSÉ / PARTIEL** | `semanticIndexer.js:99` code en dur `embeddingModel: 'nomic-embed-text'` malgré `bge-m3-q4_k_m.gguf` (`ollamaService.js:24`) ; `server.ts` ne démarre pas `startIndexRetryScheduler()` ; `/api/admin/reindex-failed` sans auth hors prod (`adminRoutes.js:18-21`) ; hooks RAG réindexent les docs supprimés (`IncomingDocument.js:116-125`). |
| 21 | Export PDF/CSV | **PARTIEL** | `OutgoingDocumentsPage.tsx:462` exporte uniquement la page courante (10 lignes) ; `auditLogs.js:132` limite à 100 ; `carteInstructionService.ts:120-131` charge `Amiri` côté client. |
| 22 | Impression | **PARTIEL** | `window.print()` présent uniquement sur `ViewOutgoingDocument.tsx:210-212` ; absent des autres vues/fiches (`src/` grep). |
| 23 | Multilingue AR/FR | **PARTIEL** | `fr.json` et `ar.json` ont chacun 1295 clés symétriques, mais **37 pages** dans `src/pages/` contiennent du texte arabe codé en dur hors `t()` (ex. `ScanDocumentPage.tsx:41-98`, `SettingsPage.tsx`, `RHStagesPage.tsx`, `AttendancePage.tsx`). |

---

### Fiches détaillées des 23 modules

#### Module 1 — Authentification et comptes (`CASSÉ`)
- **Fonctionnalités offertes** : Connexion (`POST /api/auth/login`), session courante (`GET /api/auth/me`), déconnexion (`POST /api/auth/logout`), changement de mot de passe (`PUT /api/auth/updatepassword`), changement de département actif (`PUT /api/auth/switchdepartment/:departmentId`), assistant d'installation initial.
- **Fichiers** :
  - Backend : `backend/routes/auth.js`, `backend/controllers/auth/loginController.js`, `backend/controllers/auth/passwordController.js`, `backend/middleware/auth.js`, `backend/models/User.js`, `server.ts`, `backend/server.js`.
  - Frontend : `src/pages/setup/SetupWizardPage.tsx`, `src/pages/settings/SettingsPage.tsx`, `src/services/documentService.ts` (`[NON VÉRIFIÉ]` pour `src/contexts/AuthContext.tsx` et `src/pages/LoginPage.tsx` complets).
- **Rôles autorisés** : Public sur `/login`, tout utilisateur authentifié (`protect`) sur `/me`, `/logout`, `/updatepassword`, `/switchdepartment/:departmentId` (`backend/routes/auth.js:16-22`).
- **Constats (`FAIT`)** :
  - `backend/controllers/auth/passwordController.js:21-26` : `if (currentPassword) { const isMatch = await user.matchPassword(currentPassword); ... }` — si `currentPassword` est omis ou vide dans la requête `PUT /api/auth/updatepassword`, la vérification du mot de passe actuel est ignorée.
  - `backend/models/User.js:16-20` exige `minlength: 8` et `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`, tandis que `src/pages/settings/SettingsPage.tsx:201` (`newPassword.length < 6`) et `src/pages/setup/SetupWizardPage.tsx:288` (`directorPassword.length < 6`) valident à partir de 6 caractères.
  - `server.ts` (entrypoint `npm run dev` / `npm start` dans `package.json:7-9`) n'applique ni `helmet` ni `loginLimiter`, alors que `backend/server.js:148-206` configure `helmet` et `loginLimiter` (5 tentatives / 15 min).
  - `backend/middleware/auth.js:23-25` accepte le JWT en paramètre d'URL `req.query.token`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i -X PUT http://localhost:3000/api/auth/updatepassword -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"newPassword":"NewPassword123"}'
  ```

#### Module 2 — Utilisateurs et rôles (`PARTIEL`)
- **Fonctionnalités offertes** : Liste paginée/filtrée, liste messagerie, présence en ligne (`/online`, `/heartbeat`), création, modification, suppression logique, restauration, désactivation, réinitialisation/modification mot de passe, photo de profil.
- **Fichiers** :
  - Backend : `backend/routes/users.js`, `backend/controllers/users/managementControllers.js`, `backend/controllers/auth/passwordController.js`.
  - Frontend : `src/pages/DashboardPage.tsx`, `src/pages/users/CreateUser.tsx`, `src/pages/users/EditUser.tsx` (`[NON VÉRIFIÉ]` pour `UsersPage.tsx`).
- **Rôles autorisés** :
  - `GET /api/users/messaging`, `/online`, `/heartbeat` : tout utilisateur connecté (`backend/routes/users.js:23-31`).
  - `GET /api/users` : `Director`, `Admin`, `AdminDepartment`, `AdminTuningDesk` (`:35`).
  - `GET /api/users/:id` : `Director`, `Admin`, `AdminDepartment` (`:44`).
  - `POST/PUT/DELETE/restore/deactivate/resetpassword/password` : `Admin` uniquement (`:37-79`).
  - `PUT /api/users/:id/photo` : `Admin`, `AdminDepartment`, `AdminTuningDesk`, `User` (`:82`).
- **Constats (`FAIT`)** :
  - `backend/controllers/users/managementControllers.js:248` : `const updateData = { ...req.body };` — copie directe de `req.body` (seuls `password`, `isDeleted`, `deletedAt`, `deletedBy` sont supprimés `:249-252`, exposant tout autre champ du schéma au mass assignment).
  - `backend/models/User.js:25` définit 5 rôles : `['Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk', 'User']`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/users -H "Authorization: Bearer <ADMIN_TOKEN>" | head -c 500
  ```

#### Module 3 — Départements (`PARTIEL`)
- **Fonctionnalités offertes** : Liste et consultation des départements, création/modification/suppression, liste des utilisateurs d'un département.
- **Fichiers** :
  - Backend : `backend/routes/departments.js` (`[NON VÉRIFIÉ]` pour `backend/controllers/departments/*`).
  - Frontend : `src/pages/DepartmentsPage.tsx`, `src/pages/departments/CreateDepartment.tsx`, `src/pages/departments/EditDepartment.tsx`, `src/pages/departments/DepartmentUsers.tsx`.
- **Rôles autorisés** :
  - `GET /` et `GET /:id` : tout utilisateur connecté (`backend/routes/departments.js:17,21,26`).
  - `POST/PUT/DELETE` : `Admin` (`:22,27,28`).
  - `GET /:id/users` : `Director`, `Admin`, `AdminDepartment` (`:31`).
- **Constats (`FAIT`)** :
  - `src/pages/DepartmentsPage.tsx:152` (55 lignes avec texte arabe codé en dur), `CreateDepartment.tsx:17`, `DepartmentUsers.tsx:48`, `EditDepartment.tsx:27` contiennent des libellés arabes codés en dur hors `t()`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/departments -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 4 — Courrier entrant (`PARTIEL`)
- **Fonctionnalités offertes** : Création avec PDF/OCR/scan, liste paginée, recherche, comptage en attente, détail, modification, suppression logique, affectation à un dossier, affectation à un responsable, réponse par courrier sortant.
- **Fichiers** :
  - Backend : `backend/routes/incomingDocuments.js`, `backend/controllers/incomingDocuments/detailControllers.js`, `backend/controllers/incomingDocuments/managementControllers/documentUpdateController.js`, `backend/controllers/incomingDocuments/managementControllers/documentDeleteController.js`, `backend/models/IncomingDocument.js`.
  - Frontend : `src/pages/documents/IncomingDocumentsPage.tsx`, `src/pages/documents/CreateIncomingDocument.tsx`, `src/pages/documents/EditIncomingDocument.tsx`, `src/pages/documents/ViewIncomingDocument.tsx`.
- **Rôles autorisés** :
  - `POST`, `DELETE` : `Admin`, `AdminTuningDesk` (`backend/routes/incomingDocuments.js:48,64`).
  - `PUT /:id` : route autorise `Admin`, `AdminTuningDesk`, `AdminDepartment` (`:58`), mais `documentUpdateController.js:26` commente `// Only AdminTuningDesk and Admin can update documents (AdminDepartment is handled separately for specific fields)`.
  - `PUT /:id/folder`, `PUT /:id/responsible` : `AdminDepartment` (`:71,78`).
  - `POST /:id/answer` : `AdminDepartment`, `User` (`:86`, exclut `Admin`).
- **Constats (`FAIT`)** :
  - `backend/controllers/incomingDocuments/detailControllers.js:86-92` : `if (!document.assignedTo || document.assignedTo.length === 0) { ... return res.status(200).json({ success: true, data: document }); }` — tout utilisateur (`User` ou `AdminDepartment` d'un autre service) peut lire un courrier entrant non encore affecté.
  - `src/pages/documents/IncomingDocumentsPage.tsx:231-285` filtre (`statusFilter`: `pending`, `answered`, `urgent`) et trie uniquement `documents` (la page courante reçue du serveur), tout en affichant `totalCount` serveur (`:288`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s "http://localhost:3000/api/incoming-documents?page=1&limit=10" -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 5 — Courrier sortant (dont transfert) (`FACTICE / CASSÉ`)
- **Fonctionnalités offertes** : Création, consultation, recherche, modification, suppression logique, classement en dossier, « transfert » en UI.
- **Fichiers** :
  - Backend : `backend/routes/outgoingDocuments.js`, `backend/controllers/outgoingDocuments/detailControllers.js`, `backend/controllers/outgoingDocuments/managementControllers/documentUpdateController.js`, `backend/controllers/outgoingDocuments/managementControllers/documentDeleteController.js`, `backend/models/OutgoingDocument.js`.
  - Frontend : `src/pages/documents/OutgoingDocumentsPage.tsx`, `src/pages/documents/CreateOutgoingDocument.tsx`, `src/pages/documents/EditOutgoingDocument.tsx`, `src/pages/documents/ViewOutgoingDocument.tsx`.
- **Rôles autorisés** :
  - `POST`, `DELETE` : `Admin`, `AdminTuningDesk` (`backend/routes/outgoingDocuments.js:41,57`).
  - `PUT /:id` : `Admin`, `AdminTuningDesk`, `AdminDepartment` (`:51`).
  - `PUT /:id/folder` : `AdminDepartment` (`:64`).
- **Constats (`FAIT`)** :
  - **Transfert factice** : `src/pages/documents/OutgoingDocumentsPage.tsx:375-385` — `handleTransferSubmit` fait un `setTimeout(..., 400)` puis affiche `toast.success(...)` et ferme le modal sans appeler aucune API.
  - **Corruption de référence** : `backend/controllers/outgoingDocuments/managementControllers/documentUpdateController.js:82-96` et `:255-296` remplace `document` par `findByIdAndUpdate(..., { new: true })` avec `.populate('reference')` AVANT d'effacer `answer` sur l'ancien courrier entrant référencé, puis vérifie `if (document.reference && document.reference.toString() !== ...)` sur un objet peuplé (`[object Object]`), corrompant la liaison bidirectionnelle `IncomingDocument.answer <-> OutgoingDocument.reference`.
  - **Null-pointer 500** : `backend/controllers/outgoingDocuments/detailControllers.js:60,80,97` appelle `req.user.activeDepartment._id.toString()` sans garde si `activeDepartment` est `null`.
  - **Filtre et export limités à la page** : `OutgoingDocumentsPage.tsx:221-276` (`selectedType`, `folderFilter`, tri) et `:462` (`exportToCsv('courriers-sortants.csv', documents)`) n'opèrent que sur la page active.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s -X PUT http://localhost:3000/api/outgoing-documents/<OUT_ID> -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"reference":"<NEW_IN_ID>"}'
  ```

#### Module 6 — Numérotation (`CASSÉ`)
- **Fonctionnalités offertes** : Génération du prochain numéro d'ordre par type et année (`GET /api/serial-number/next`), validation d'unicité (`GET /api/serial-number/validate`).
- **Fichiers** :
  - Backend : `backend/routes/serialNumber.js`, `backend/controllers/serialNumber.js`, `backend/utils/documentHelper.js`, `backend/models/IncomingDocument.js`, `backend/models/OutgoingDocument.js`.
- **Rôles autorisés** : Tout utilisateur authentifié (`backend/routes/serialNumber.js:9-15`).
- **Constats (`FAIT`)** :
  - `backend/controllers/serialNumber.js:45-50` et `backend/utils/documentHelper.js:21-31` cherchent `Model.findOne({ year }).sort({ serialNumber: -1 })` sans `isDeleted: { $ne: true }` et renvoient `lastDoc.serialNumber + 1` de manière non atomique (condition de course entre deux créations simultanées).
  - `backend/controllers/serialNumber.js:91-96` (`validateSerialNumber`) n'exclut pas non plus `isDeleted: true`.
  - `backend/models/IncomingDocument.js:103` et `backend/models/OutgoingDocument.js:92` définissent `.index({ serialNumber: 1, year: 1 }, { unique: true })` sans `partialFilterExpression: { isDeleted: false }` (un document mis en corbeille bloque la réutilisation de son numéro).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s "http://localhost:3000/api/serial-number/next?year=2026&type=incoming" -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 7 — Dossiers et classement (`CASSÉ`)
- **Fonctionnalités offertes** : Arborescence des dossiers par département, dossiers racine, sous-dossiers, création/modification/suppression/déplacement/statut, affectation unitaire ou par lot de documents à un dossier.
- **Fichiers** :
  - Backend : `backend/routes/folders.js`, `backend/controllers/folders/documentControllers.js` (`[NON VÉRIFIÉ]` pour les autres fichiers sous `backend/controllers/folders/`).
- **Rôles autorisés** : `GET` pour tout connecté (`folders.js:24-29,58,73-74`), écriture pour `AdminDepartment`, `Admin` (`:34-88`).
- **Constats (`FAIT`)** :
  - `backend/controllers/folders/documentControllers.js:79-108` (`assignDocumentToFolder`) vérifie que le dossier cible appartient au département de l'utilisateur (`:85-92`) uniquement si `folderId` est non nul (`:79`), et ne vérifie **jamais** si le document déplacé (`documentId`) appartient au département de l'utilisateur : un `AdminDepartment` peut retirer (`folderId: null`) ou s'approprier un document d'un autre département.
  - `backend/controllers/folders/documentControllers.js:127-146` (`batchMoveDocuments`) ne vérifie **ni** le département du `targetFolder` **ni** le département des documents `documentIds`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i -X PUT http://localhost:3000/api/folders/batch-move-documents -H "Authorization: Bearer <DEPT_ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"documentIds":["<OTHER_DEPT_DOC_ID>"],"folderId":null,"type":"incoming"}'
  ```

#### Module 8 — Pièces jointes (`CASSÉ`)
- **Fonctionnalités offertes** : Upload PDF de courriers, stockage sous `courrier/<year>/<Incoming-Doc|Outgoing-Doc>/<serial>.pdf`, téléchargement/prévisualisation protégée (`/api/files/:type/:id/:filename`, `/courrier/...`, `/uploads/...`).
- **Fichiers** :
  - Backend : `server.ts`, `backend/controllers/fileController.js`, `backend/middleware/upload.js`, `backend/utils/fileUploadHandler.js`, `backend/middleware/auth.js`.
  - Frontend : `src/components/documents/PDFViewer.tsx`, `src/services/documentService.ts`.
- **Rôles autorisés** : `protect` sur `/api/files/:type/:id/:filename`, `/courrier`, `/uploads` (`server.ts:169-179`) ; `/uploads/usersphoto` et `/uploads/personnelphoto` publics (`server.ts:175-176`).
- **Constats (`FAIT`)** :
  - `backend/controllers/fileController.js:30-40` (`serveProtectedFile`) : `const hasAccess = docDepts.length === 0 || docDepts.some((d) => userDepts.includes(d));` (`:36`) autorise tout utilisateur si `docDepts` est vide, et ne vérifie pas `doc.source?.id` (utilisé par `OutgoingDocument` contrairement à `assignedTo` / `departmentId` aux lignes `:31-34`).
  - `server.ts:172` et `backend/controllers/fileController.js:84-118` (`serveCourrierStatic`) servent tout fichier sous `/courrier` avec seulement `protect` et zéro contrôle RBAC par département.
  - `src/services/documentService.ts:504-508` ajoute `?token=${encodeURIComponent(token)}` aux URLs pour `PDFViewer.tsx:94` (`<iframe src=...>`), exposant le JWT dans l'historique navigateur, les logs HTTP et l'en-tête `Referer`.
  - `backend/middleware/upload.js:116-125` n'accepte que `.pdf`, et `backend/utils/fileUploadHandler.js:19,51` force `${serialNumber}.pdf` et lance un OCR synchrone bloquant la requête d'upload.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i "http://localhost:3000/courrier/2026/Incoming-Doc/1.pdf" -H "Authorization: Bearer <USER_OTHER_DEPT_TOKEN>"
  ```

#### Module 9 — Scan (`PARTIEL`)
- **Fonctionnalités offertes** : Détection de scanners (WIA Windows / SANE Linux), sélection de périphérique, numérisation directe ou temporaire asynchrone (`scanId`), suivi de progression (`GET /api/scan/status/:scanId`), miniatures par page (`GET /api/scan/thumbnail/:scanId/:page`), annulation, aperçu blob et suppression.
- **Fichiers** :
  - Backend : `backend/routes/scan.js`, `backend/controllers/scan/documentScanController.js`, `backend/utils/scanIntegration.js`, `backend/utils/scanner/index.js`, `backend/utils/scanner/config/scannerConfig.js`, `backend/utils/scanner/windows/scannerDetection.js`, `backend/utils/scanner/linux/scanExecutor.js`.
  - Frontend : `src/pages/documents/ScanDocumentPage.tsx` (`[NON VÉRIFIÉ]` pour `ScannerTab.tsx`, `ScannedDocumentPreview.tsx`, `scannerService.ts` dans cette fenêtre).
- **Rôles autorisés** : `Admin`, `AdminTuningDesk` sur tout `/api/scan/*` (`backend/routes/scan.js:26-27`).
- **Constats (`FAIT`)** :
  - `server.ts` (lancé par `npm run dev` / `npm start`) n'inclut ni la détection matérielle au démarrage ni le relais des événements Socket.io `scan:started` / `scan:completed` / `scan:error`, présents uniquement dans `backend/server.js:377-421`.
  - `backend/utils/scanner/windows/scannerDetection.js:13-37` dépend de PowerShell + COM `WIA.DeviceManager`, et `backend/utils/scanner/linux/scanExecutor.js:1-17` de `scanimage` (SANE) : aucune exécution matérielle possible en conteneur Linux sans scanner branché (`[À TESTER EN LOCAL]`).
  - `backend/utils/scanIntegration.js:393-402` lance l'OCR en tâche de fond non bloquante après la capture et renvoie `ocrStatus: 'processing'` (`documentScanController.js:188-199`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/scan/devices -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```

#### Module 10 — OCR (`PARTIEL`)
- **Fonctionnalités offertes** : Extraction OCR serveur (`ara+fra+eng`, 300 DPI) lors d'un upload (`fileUploadHandler.js:51`), d'un scan (`scanIntegration.js:79,395`), ou via upload dédié `POST /api/scan/ocr-upload` (`scan.js:77-80`).
- **Fichiers** :
  - Backend : `backend/utils/ocrProcessor.js`, `backend/utils/fileUploadHandler.js`, `backend/utils/scanIntegration.js`, `backend/routes/scan.js`.
  - Frontend : `src/hooks/useOfflineOcr.ts`, `src/services/offlineOcrService.ts`.
- **Rôles autorisés** : `Admin`, `AdminTuningDesk` sur `/api/scan/ocr-upload` (`backend/routes/scan.js:27,77`).
- **Constats (`FAIT`)** :
  - `src/hooks/useOfflineOcr.ts:67-81` simule une progression par `setInterval(..., 800)` tout en appelant `extractOcrFromServer(file)` ; il importe `ocrService` (`src/hooks/useOfflineOcr.ts:3`) uniquement pour appeler `ocrService.cleanup()` au démontage (`:28`).
  - `src/services/offlineOcrService.ts:303-328` (`pdfToImageData`) ne rend pas le PDF : il dessine un canvas blanc fixe avec le texte factice `'PDF content being processed...'` (`:325`) si cette méthode est invoquée.
  - `backend/utils/ocrProcessor.js:148-159` exige les binaires système `tesseract` et les outils Poppler (`[À TESTER EN LOCAL]`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  tesseract --version && curl -s -X POST http://localhost:3000/api/scan/ocr-upload -H "Authorization: Bearer <ADMIN_TOKEN>" -F "file=@test.pdf"
  ```

#### Module 11 — Recherche (globale et plein texte) (`PARTIEL`)
- **Fonctionnalités offertes** : Recherche globale (`GET /api/search?q=...`) sur courriers entrants/sortants, et recherches par module (`/api/incoming-documents/search`, `/api/outgoing-documents/search`, `/api/messages/search`).
- **Fichiers** :
  - Backend : `backend/routes/globalSearchRoutes.js`, `backend/controllers/globalSearchController.js`.
- **Rôles autorisés** : Tout utilisateur authentifié (`globalSearchRoutes.js:6`).
- **Constats (`FAIT`)** :
  - `backend/controllers/globalSearchController.js:73` : `const isGlobalAdmin = currentUser && ['Admin', 'Director'].includes(currentUser.role);` — omet `AdminTuningDesk` du périmètre global.
  - `backend/controllers/globalSearchController.js:84-93` n'interroge que `subject`, `correspondenceNumber` et `serialNumber`, ignorant `ocrText` (pas de recherche plein texte sur le contenu OCR dans la recherche globale).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s "http://localhost:3000/api/search?q=test" -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 12 — Messagerie et notifications temps réel (`CASSÉ`)
- **Fonctionnalités offertes** : Boîte de réception, messages envoyés, conversations, pièces jointes, comptage non lu, marquage lu, suppression logique, rétention des messages, notifications d'activité et de responsable, Socket.io.
- **Fichiers** :
  - Backend : `backend/routes/messages.js`, `backend/controllers/messages/managementControllers.js`, `backend/routes/activityNotifications.js`, `backend/controllers/activityNotifications.js`, `backend/routes/responsibleNotifications.js`, `backend/routes/messageSettings.js`, `server.ts`.
- **Rôles autorisés** :
  - Messages et notifications : tout utilisateur authentifié (`messages.js:43`, `responsibleNotifications.js:15`).
  - Rétention des messages : `Admin` (`messageSettings.js:14`).
- **Constats (`FAIT`)** :
  - `backend/controllers/messages/managementControllers.js:167-169` (`deleteMessage`) et `:235-244` (`markAsRead`) accordent `hasAdminAccess = ['Admin', 'AdminTuningDesk'].includes(req.user.role)`, permettant à `Admin`/`AdminTuningDesk` de lire/modifier/masquer des messages privés dont ils ne sont ni expéditeur ni destinataire.
  - `backend/controllers/activityNotifications.js:75-86` (`deleteNotification`) exécute `ActivityNotification.findByIdAndDelete(req.params.id)` sans vérifier que la notification appartient à `req.user._id`.
  - `server.ts:122-127` configure Socket.io avec `cors: { origin: '*' }`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i -X DELETE http://localhost:3000/api/activity-notifications/<OTHER_USER_NOTIF_ID> -H "Authorization: Bearer <USER_TOKEN>"
  ```

#### Module 13 — Corbeille et suppression logique (`CASSÉ`)
- **Fonctionnalités offertes** : Consultation de la corbeille (`GET /api/trash`), restauration, suppression définitive unitaire, vidage complet (`emptyTrash`).
- **Fichiers** :
  - Backend : `backend/routes/trashRoutes.js`, `backend/controllers/trashController.js`, `backend/controllers/incomingDocuments/managementControllers/documentDeleteController.js`, `backend/controllers/outgoingDocuments/managementControllers/documentDeleteController.js`.
  - Frontend : `src/pages/trash/TrashPage.tsx`.
- **Rôles autorisés** : `Admin`, `AdminTuningDesk`, `AdminDepartment` (`trashRoutes.js:15`).
- **Constats (`FAIT`)** :
  - `backend/controllers/incomingDocuments/managementControllers/documentDeleteController.js:20-27` et `backend/controllers/outgoingDocuments/managementControllers/documentDeleteController.js:20-27` mettent définitivement à `null` les références `answer` / `reference` lors du soft-delete (`isDeleted: true`), empêchant leur restitution lors d'une restauration depuis la corbeille.
  - `backend/controllers/trashController.js:625-648` (`emptyTrash`) supprime définitivement les dossiers en corbeille et détache les documents actifs (`IncomingDocument.updateMany({ folder: item._id }, { folder: null })` `:634-635`) sans appliquer le contrôle d'éléments actifs pourtant présent dans `permanentDelete` (`:516-527`).
  - `backend/controllers/trashController.js:445-475` (`permanentDelete` pour `message`) ne supprime le document que si `deletedByAll` est vrai (`:445-451`), mais renvoie dans tous les cas HTTP `200` avec `'تم الحذف النهائي للرسالة بنجاح'` (`:471-474`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/trash -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```

#### Module 14 — Historique et audit (`PARTIEL`)
- **Fonctionnalités offertes** : Journalisation automatique via middleware sur les routes critiques, consultation paginée/filtrée, timeline par document, création manuelle de log, export CSV et PDF.
- **Fichiers** :
  - Backend : `backend/routes/auditLogs.js`, `backend/controllers/auditLogs.js`.
  - Frontend : `src/pages/audit/AuditTrailPage.tsx`.
- **Rôles autorisés** :
  - `GET /` et `GET /export` : `Admin`, `Director`, `AdminTuningDesk` (`backend/routes/auditLogs.js:17-18`).
  - `GET /document/:id/timeline` : ajoute `AdminDepartment` (`:19`).
  - `POST /` : tout utilisateur authentifié (`:14,22`), sans contrôle d'intégrité sur qui fabrique une entrée d'audit.
- **Constats (`FAIT`)** :
  - `backend/controllers/auditLogs.js:130-134` plafonne silencieusement tout export (`csv`/`pdf`) à `.limit(100)` (`// capped to 100 for safety`).
  - `backend/controllers/auditLogs.js:177-200` génère le PDF d'audit en arabe via `PDFDocument` (`pdfkit`) sans charger aucune police TTF arabe (risque élevé d'inversion/glyphes illisibles `[À TESTER EN LOCAL]`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s "http://localhost:3000/api/audit-logs/export?format=pdf" -H "Authorization: Bearer <ADMIN_TOKEN>" -o /tmp/audit.pdf && file /tmp/audit.pdf
  ```

#### Module 15 — RH (personnel, stages, historique de carrière, sanctions) (`CASSÉ`)
- **Fonctionnalités offertes** : Fiches personnel, liaison compte utilisateur, photo, affectation de personnel à des courriers, stages/formations, référentiels écoles/types de formation, promotions, postes, diplômes, sanctions, espace `my-profile`.
- **Fichiers** :
  - Backend : `backend/routes/personnelRoutes.js`, `backend/routes/personnelDocumentRoutes.js`, `backend/routes/rhStageRoutes.js`, `backend/routes/rhStagePersonnelRoutes.js`, `backend/routes/rhPersonnelHistoryRoutes.js`, `backend/routes/rhReferenceRoutes.js`, `backend/controllers/rh/rhStageController.js`, `backend/controllers/rh/rhPersonnelHistoryController.js`, `backend/models/Personnel.js`, `backend/models/RHStage.js`.
  - Frontend : `src/pages/hr/RHStagesPage.tsx`, `PersonnelListPage.tsx`, `PersonnelDetailPage.tsx`, `PersonnelFormPage.tsx`, `AllPersonnelSituationPage.tsx`, `MyProfilePage.tsx`.
- **Rôles autorisés** :
  - Écriture RH : `Admin`, `AdminDepartment` + `checkRHAccess`.
  - Lecture historique/sanctions/stages : `protect` uniquement sur plusieurs routes (faille critique).
- **Constats (`FAIT`)** :
  - **Faille RBAC lecture RH** : `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` (promotions, postes, diplômes, sanctions, historique complet de n'importe quel agent) et `backend/routes/rhStageRoutes.js:7,10,11` + `backend/routes/rhStagePersonnelRoutes.js:7-16` n'appliquent que `protect` sans `authorize` ni `checkRHAccess` — tout utilisateur connecté (`User`) peut lire les sanctions et l'historique RH d'autrui.
  - **Mass assignment** : `backend/controllers/rh/rhStageController.js:226`, `backend/controllers/rh/rhPersonnelHistoryController.js:115,281` (et `:449,615` relevés au grep) et `rhReferenceController.js:167,375` injectent `{ ...req.body }` directement dans `findByIdAndUpdate`.
  - **Référence modèle fantôme** : `backend/models/RHStage.js:14` déclare `ref: 'RHSessionFormation' // Modèle créé ultérieurement`.
  - **UI incohérente** : `src/pages/hr/RHStagesPage.tsx:76` calcule `canManageStages = ['Admin', 'AdminDepartment'].includes(currentUser?.role || '')` sans vérifier le département RH, et `:224-238` code toute l'interface en arabe en dur.
  - **Index CIN** : `backend/models/Personnel.js:162` crée `{ cin: 1 }, { unique: true, sparse: true }` sans filtre partiel sur `isDeleted` (même risque de blocage après soft-delete).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i http://localhost:3000/api/hr/personnel/<TARGET_PERSONNEL_ID>/full-history -H "Authorization: Bearer <SIMPLE_USER_TOKEN>"
  ```

#### Module 16 — Présence et congés (`CASSÉ`)
- **Fonctionnalités offertes** : Saisie collective quotidienne, calendrier/solde individuel, rapports journalier/mensuel/annuel, paramètres annuels de présence, motifs d'absence configurables (`LeaveReason`), auto-déclaration de présence/absence et workflow d'approbation/rejet/modification.
- **Fichiers** :
  - Backend : `backend/routes/attendanceRoutes.js`, `backend/routes/attendanceDeclarationRoutes.js`, `backend/routes/leaveReasonRoutes.js`, `backend/controllers/attendanceController.js`, `backend/controllers/attendanceDeclarationController.js`, `backend/models/Attendance.js`.
  - Frontend : `src/pages/hr/AttendancePage.tsx`, `AttendanceDeclarationsPage.tsx`, `LeaveReasonsManagementPage.tsx`, `MyAttendanceCalendarPage.tsx`.
- **Rôles autorisés** : `checkAttendanceAccess` sur `/api/attendance/*` (`attendanceRoutes.js:21`), `Admin`/`AdminDepartment` sur `/batch` et `/settings` et validation des déclarations (`attendanceDeclarationRoutes.js:12-15`).
- **Constats (`FAIT`)** :
  - **Conflit schéma vs motifs dynamiques** : `backend/models/Attendance.js:27-46` impose un `enum` figé de 14 codes sur `motif`, alors que l'administrateur RH peut créer de nouveaux `LeaveReason` (`leaveReasonRoutes.js`). Dans `backend/controllers/attendanceDeclarationController.js:329-339`, tout motif hors `VALID_ATTENDANCE_MOTIFS` est silencieusement réduit à `safeMotif = null` lors de l'approbation ; dans `saveBatchAttendance` (`attendanceController.js:260-275`), un nouveau code personnalisé échoue à la validation Mongoose.
  - **Bug date en saisie batch** : `backend/controllers/attendanceController.js:176-184` vérifie la règle future/rétroactive avec `entry.date`, mais `Attendance.findOneAndUpdate` (`:263`) persiste toujours sur `date: targetDate` (ignorant `entry.date`).
  - **Personnel sans filtre `isDeleted`** : `attendanceController.js:106,517,602,698` interroge `Personnel.find(personnelFilter)` sans exclure les fiches supprimées logiquement (commentaire explicite sur les inactifs `:100`, mais aucun filtre sur `isDeleted`).
  - **Absence de resynchronisation `Attendance`** : `attendanceDeclarationController.js:542-546` met à jour `statut` et `motif` sur `Attendance`, mais oublie de recalculer `impacteSolde`, `leaveReasonId`, `detailsMotif`, `heureArrivee` et `date`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -i -X POST http://localhost:3000/api/attendance/batch -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"date":"2026-11-17","entries":[{"personnelId":"<ID>","statut":"absent","motif":"motif_custom_1"}]}'
  ```

#### Module 17 — Organigramme (`PARTIEL`)
- **Fonctionnalités offertes** : Visualisation hiérarchique Direction / Départements régaliens / Départements métiers et effectifs associés.
- **Fichiers** :
  - Backend : `backend/routes/organizationChartRoutes.js`, `backend/controllers/organizationChartController.js`.
  - Frontend : `src/pages/organization/OrganizationChartPage.tsx`, `src/App.tsx`.
- **Rôles autorisés** : Tout utilisateur authentifié (`organizationChartRoutes.js:6-7`, `App.tsx:238-246`).
- **Constats (`FAIT`)** :
  - `backend/controllers/organizationChartController.js:112-122` calcule `totalPersonnel`, mais tronque le tableau renvoyé à 10 personnes (`const deptPersonnelSlice = allDeptPersonnel.slice(0, 10);` `:113`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/organization-chart -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 18 — Paramètres (`FACTICE / PARTIEL`)
- **Fonctionnalités offertes** : Paramètres d'organisation (département RH, Bureau d'ordre/Directeur, types d'association), options de documents, rétention messagerie, paramètres utilisateur (mot de passe, sécurité, notifications, affichage, sessions), page sécurité & confidentialité.
- **Fichiers** :
  - Backend : `backend/routes/organizationSettingsRoutes.js`, `backend/routes/documentOptions.js`, `backend/routes/messageSettings.js`.
  - Frontend : `src/pages/settings/SettingsPage.tsx`, `src/pages/settings/SecurityPrivacyPage.tsx`, `src/pages/documents/DocumentOptionsPage.tsx`, `src/pages/settings/MessageRetentionPage.tsx`, `src/App.tsx`.
- **Rôles autorisés** :
  - `organization-settings` : `PUT` réservé `Admin` (`organizationSettingsRoutes.js:19-20`).
  - `document-options` : incohérence entre `src/App.tsx:223` (`['Admin', 'AdminTuningDesk']`), `src/App.tsx:456` (`['AdminTuningDesk']` hors redirection) et `backend/routes/documentOptions.js:19-23` (`[NON VÉRIFIÉ]` pour `getDocumentOptions` mais `POST/PUT/DELETE` vérifiés `authorize('AdminTuningDesk')` dans le contexte d'audit, excluant `Admin` — à confirmer ligne exacte si modifié).
- **Constats (`FAIT`)** :
  - `src/pages/settings/SettingsPage.tsx:212-236` écrit les paramètres de sécurité (`app_session_timeout`, `app_2fa_enabled`, `app_strong_pwd`), de notifications et d'affichage **uniquement dans `localStorage`**, sans aucune persistance serveur.
  - `src/pages/settings/SettingsPage.tsx:238-241` (`handleTerminateAllOtherSessions`) ferme la boîte de dialogue et affiche un toast de succès sans aucun appel API.
  - `src/pages/settings/SecurityPrivacyPage.tsx:108-235` est une page entièrement factice (sessions codées en dur à Riyad/Djeddah `:113,123`, faux chargements/sauvegardes/suppression de compte via `setTimeout` `:144,193,214,227`) et n'est reliée à aucune route dans `src/App.tsx`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  grep -rn "SecurityPrivacy" src/App.tsx && curl -s http://localhost:3000/api/organization-settings/types-association -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 19 — Sauvegarde et restauration (`CASSÉ`)
- **Fonctionnalités offertes** : Statistiques de sauvegarde, politique planifiée (cron), lancement manuel, historique, téléchargement, suppression, restauration d'archive.
- **Fichiers** :
  - Backend : `backend/routes/backup.js`, `backend/controllers/backup.js`, `backend/services/backupScheduler.js`.
  - Frontend : `src/pages/settings/BackupSettingsPage.tsx`.
- **Rôles autorisés** : `Admin` uniquement (`backend/routes/backup.js:20-21`).
- **Constats (`FAIT`)** :
  - `backend/controllers/backup.js:59-60` fabrique la volumétrie affichée par multiplication : `(totalIncomingDocuments + totalOutgoingDocuments) * 1024 * 50`.
  - `backend/controllers/backup.js:615-626` crée avant restauration un enregistrement `BackupHistory` au statut `'in_progress'` et `filePath: 'pending'` qui n'est jamais finalisé ni rempli.
  - `backend/controllers/backup.js:629-645` extrait l'archive via `unzip -o -q`, avale toute erreur avec `console.warn` (`:636`) tout en répondant HTTP `200` `'Restauration effectuée'`, et n'exécute jamais `mongorestore` (alors que `backupScheduler.js:10-20` lance `mongodump`).
  - `server.ts` ne démarre pas `startBackupScheduler()`, présent uniquement dans `backend/server.js:324`.
- **`[À TESTER EN LOCAL]`** :
  ```bash
  curl -s http://localhost:3000/api/backup/stats -H "Authorization: Bearer <ADMIN_TOKEN>"
  ```

#### Module 20 — Assistant IA (RAG) (`CASSÉ / PARTIEL`)
- **Fonctionnalités offertes** : Santé IA (`GET /api/ai/health`), extraction de champs depuis OCR (`POST /api/ai/extract-from-ocr`), résumé (`POST /api/ai/summarize`), traduction AR↔FR (`POST /api/ai/translate`), chat sémantique RAG (`POST /api/ai/chat`), rattrapage d'indexation (`POST /api/ai/reindex-failed`, `POST /api/admin/reindex-failed`).
- **Fichiers** :
  - Backend : `backend/routes/aiRoutes.js`, `backend/routes/adminRoutes.js`, `backend/controllers/ai/*`, `backend/services/ollamaService.js`, `backend/services/semanticIndexer.js`, `backend/services/indexRetryScheduler.js`, `backend/models/IncomingDocument.js`, `backend/models/OutgoingDocument.js`.
  - Frontend : `[NON VÉRIFIÉ]` pour le contenu ligne par ligne de `FloatingAIChat.tsx` et `DocumentAIAssistant.tsx`.
- **Rôles autorisés** :
  - `GET /health` : `protect` (`aiRoutes.js:11`).
  - `POST /extract-from-ocr` : `Admin`, `AdminTuningDesk`, `AdminDepartment` (`:17`).
  - `POST /summarize`, `/translate`, `/chat` : ajoute `Director` (`:26,35,44`).
  - `POST /api/ai/reindex-failed` : `Admin`, `Director` (`:53`).
  - `POST /api/admin/reindex-failed` : `adminAuth` (`backend/routes/adminRoutes.js:7-24`).
- **Constats (`FAIT`)** :
  - **Bypass auth critique** : `backend/routes/adminRoutes.js:18-21` appelle `next()` sans authentification lorsque aucun token n'est fourni et `NODE_ENV !== 'production'`.
  - **Métadonnée d'embedding fausse** : `backend/services/semanticIndexer.js:99` enregistre `embeddingModel: 'nomic-embed-text'` alors que `backend/services/ollamaService.js:22-25` charge `bge-m3-q4_k_m.gguf` via `node-llama-cpp` (`:52`).
  - **Limitation RAG à 500 vecteurs** : `backend/controllers/ai/chatController.js:128-131` charge `.limit(500)` vecteurs sans tri ni pré-filtrage vectoriel avant calcul cosinus en mémoire (`:148-158`).
  - **Réindexation de documents supprimés** : `IncomingDocument.js:116-125` et `OutgoingDocument.js:104-114` déclenchent l'indexation RAG sur `post('save')` sans exclure `doc.isDeleted === true`.
  - **Scheduler absent de `server.ts`** : `startIndexRetryScheduler()` est appelé dans `backend/server.js:323`, pas dans `server.ts`.
  - **Modèles GGUF locaux** : `ollamaService.js:65-81` échoue en `AI_SERVICE_DOWN` (HTTP 503) si les fichiers `.gguf` ne sont pas présents sur disque (`[À TESTER EN LOCAL]`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  npm run check-models && curl -s http://localhost:3000/api/ai/health -H "Authorization: Bearer <TOKEN>"
  ```

#### Module 21 — Export PDF/CSV (`PARTIEL`)
- **Fonctionnalités offertes** : Export CSV des courriers, export PDF/CSV des journaux d'audit, génération PDF client RTL de la « Carte d'instruction » (`بطاقة إرشادات`).
- **Fichiers** :
  - Backend : `backend/controllers/auditLogs.js`.
  - Frontend : `src/pages/documents/OutgoingDocumentsPage.tsx`, `src/services/carteInstructionService.ts` (`[NON VÉRIFIÉ]` pour `exportUtils.ts` / `IncomingDocumentsPage` bouton export).
- **Constats (`FAIT`)** :
  - `src/pages/documents/OutgoingDocumentsPage.tsx:462` passe uniquement `documents` (les 10 lignes de la page courante) à `exportToCsv('courriers-sortants.csv', documents)`.
  - `backend/controllers/auditLogs.js:132` limite tout export d'audit à 100 lignes.
  - `src/services/carteInstructionService.ts:120-135` charge `/fonts/Amiri-Regular.ttf` et `/fonts/Amiri-Bold.ttf` via `jsPDF` côté client (`[À TESTER EN LOCAL]` pour rendu réel des fichiers de polices servis).
  - `backend/controllers/auditLogs.js:177-200` exporte du texte arabe dans `PDFDocument` sans chargement de police TTF arabe (`[À TESTER EN LOCAL]`).
- **`[À TESTER EN LOCAL]`** :
  ```bash
  ls -lh public/fonts/Amiri-*.ttf 2>/dev/null || ls -lh src/assets/ 2>/dev/null
  ```

#### Module 22 — Impression (`PARTIEL`)
- **Fonctionnalités offertes** : Bouton d'impression de la fiche administrative sortante (`window.print()`).
- **Fichiers** : `src/pages/documents/ViewOutgoingDocument.tsx`.
- **Constats (`FAIT`)** :
  - Dans tout `src/`, `window.print()` n'est présent que sur `src/pages/documents/ViewOutgoingDocument.tsx:210-212` (`handlePrintFiche`). Aucun équivalent n'existe sur le courrier entrant, les états de présence, les fiches RH ou l'organigramme.
- **`[À TESTER EN LOCAL]`** : Vérifier visuellement l'aperçu avant impression navigateur sur `/outgoing-documents/:id`.

#### Module 23 — Multilingue AR/FR (`PARTIEL`)
- **Fonctionnalités offertes** : Dictionnaires `fr.json` et `ar.json` pilotés par `useLanguage()` / `i18next`, gestion RTL/LTR.
- **Fichiers** : `src/i18n/locales/fr.json`, `src/i18n/locales/ar.json`, `src/pages/**`.
- **Constats (`FAIT`)** :
  - Parité structurelle exacte entre dictionnaires : `fr.json` = **1295 clés**, `ar.json` = **1295 clés**, **0 clé manquante** d'un côté comme de l'autre (script Node vérifié sur le dépôt).
  - En revanche, **37 fichiers sous `src/pages/`** contiennent des chaînes arabes codées en dur hors `t()` (exemples vérifiés : `SettingsPage.tsx` 161 lignes, `PersonnelDetailPage.tsx` 153 lignes, `SetupWizardPage.tsx` 138 lignes, `BackupSettingsPage.tsx` 121 lignes, `ViewOutgoingDocument.tsx` 96 lignes, `RHStagesPage.tsx` 91 lignes, `AttendanceDeclarationsPage.tsx` 87 lignes, `AttendancePage.tsx` 62 lignes, `DepartmentsPage.tsx` 55 lignes, `ScanDocumentPage.tsx:41-98` qui utilise un objet local FR/AR au lieu de `i18next`). En basculant l'interface en français, ces pages restent partiellement ou totalement en arabe.
- **`[À TESTER EN LOCAL]`** : Basculer la langue en `FR` dans la barre de navigation et parcourir `/dashboard/admin/*`, `/dashboard/profile/*` et `/scan`.

---

## ÉTAPE 2 — ANALYSE DES LACUNES (CATÉGORIES `a` À `j`)

### a. Fonctionnalités factices, incohérences de routes, `localStorage`, code mort
1. `FAIT` — **Transfert de courrier sortant 100 % factice** : `src/pages/documents/OutgoingDocumentsPage.tsx:375-385` simule le transfert via `setTimeout(..., 400)` + toast de succès sans aucun appel backend.
2. `FAIT` — **Page `SecurityPrivacyPage.tsx` morte et factice** : `src/pages/settings/SecurityPrivacyPage.tsx:108-235` contient des sessions fictives (Riyad/Djeddah) et de faux appels `setTimeout` (sauvegarde, export, suppression de compte), et n'est montée sur aucune route dans `src/App.tsx`.
3. `FAIT` — **Préférences `SettingsPage.tsx` stockées en `localStorage` et révocation factice** : `src/pages/settings/SettingsPage.tsx:212-236` persiste sécurité/notifications/affichage en `localStorage` uniquement ; `:238-241` simule la fermeture des autres sessions sans appel serveur.
4. `FAIT` — **Extraction PDF côté client factice** : `src/services/offlineOcrService.ts:303-328` dessine un canvas blanc fixe avec le texte `'PDF content being processed...'` (`:325`).
5. `FAIT` — **Statistiques de taille de sauvegarde factices** : `backend/controllers/backup.js:59-60` calcule `estimatedSizeBytes = (totalIncomingDocuments + totalOutgoingDocuments) * 1024 * 50`.
6. `FAIT` — **Incohérence de permissions UI vs API sur `document-options`** : `src/App.tsx:223` autorise `['Admin', 'AdminTuningDesk']` (tandis que la route legacy `:456` n'autorise que `AdminTuningDesk`), alors que `backend/routes/documentOptions.js` (`[NON VÉRIFIÉ]` ligne à ligne pour GET, `POST/PUT/DELETE` relevés avec `authorize('AdminTuningDesk')` uniquement) exclut `Admin`.
7. `FAIT` — **Accumulation de fichiers `.bak` / `.OLD` dans le dépôt** : `backend/controllers/trashController.js.bak`, `backend/routes/organizationChartRoutes.js.bak`, `backend/mockDb.js.OLD`, `backend/mockRouter.js.OLD`, `src/App.tsx.bak`, `src/pages/UsersPage.tsx.bak`, `src/pages/documents/IncomingDocumentsPage.tsx.bak`, `src/components/navigation/Sidebar.tsx.bak`, `src/components/layouts/HubLayouts.tsx.bak`, `src/config/hubsConfig.ts.bak`, `src/i18n/locales/fr.json.bak3`, `src/i18n/locales/ar.json.bak3`.

### b. Intégrité des données
8. `FAIT` — **Corruption des liens `answer` / `reference` lors de la mise à jour sortante** : `backend/controllers/outgoingDocuments/managementControllers/documentUpdateController.js:82-96,255-296` met à jour et `.populate('reference')` avant de comparer/nettoyer l'ancien courrier entrant, comparant ensuite un objet peuplé via `.toString()`.
9. `FAIT` — **Destruction irréversible des liens `answer`/`reference` à la mise en corbeille** : `backend/controllers/incomingDocuments/managementControllers/documentDeleteController.js:20-27` et `backend/controllers/outgoingDocuments/managementControllers/documentDeleteController.js:20-27` mettent à `null` le lien réciproque au lieu de le préserver pour une restauration.
10. `FAIT` — **Index uniques sans filtre partiel sur `isDeleted`** : `IncomingDocument.js:103`, `OutgoingDocument.js:92` (`{ serialNumber: 1, year: 1 }`) et `Personnel.js:162` (`{ cin: 1 }`) entrent en collision avec les éléments en corbeille.
11. `FAIT` — **Numérotation non atomique et aveugle aux soft-deletes** : `backend/controllers/serialNumber.js:45,91` et `backend/utils/documentHelper.js:21-31`.
12. `FAIT` — **`emptyTrash` casse des dossiers encore liés à des documents actifs** : `backend/controllers/trashController.js:631-637` détache (`folder: null`) les documents actifs au lieu de bloquer comme `permanentDelete` (`:516-527`).
13. `FAIT` — **Conflit `enum` `Attendance.motif` vs `LeaveReason` dynamique** : `backend/models/Attendance.js:27-46` rejette ou annule (`attendanceDeclarationController.js:329-339`) tout nouveau motif créé dans `LeaveReason`.
14. `FAIT` — **Saisie batch de présence ignorant `entry.date` à l'écriture** : `backend/controllers/attendanceController.js:176-184` valide `entry.date` mais `:260-264` upsert sur `targetDate`.
15. `FAIT` — **Référence Mongoose inexistante** : `backend/models/RHStage.js:14` pointe vers `'RHSessionFormation'`.

### c. Filtres, recherche, pagination et exports
16. `FAIT` — **Filtrage et tri uniquement sur la page active (10 éléments)** : `IncomingDocumentsPage.tsx:231-285` et `OutgoingDocumentsPage.tsx:221-276` filtrent après pagination serveur.
17. `FAIT` — **Export CSV limité à la page courante** : `OutgoingDocumentsPage.tsx:462` exporte uniquement `documents` (page affichée).
18. `FAIT` — **Export audit plafonné silencieusement à 100 entrées** : `backend/controllers/auditLogs.js:132` (`.limit(100)`).
19. `FAIT` — **Recherche globale incomplète** : `backend/controllers/globalSearchController.js:86-93` exclut `ocrText` et exclut `AdminTuningDesk` de `isGlobalAdmin` (`:73`).
20. `FAIT` — **Organigramme tronqué à 10 agents par département** : `backend/controllers/organizationChartController.js:113`.

### d. Workflow métier
21. `FAIT` — **Contradiction route/contrôleur et rôles sur courrier entrant** : `backend/routes/incomingDocuments.js:58` autorise `AdminDepartment` sur `PUT /:id` tandis que `documentUpdateController.js:26` indique la restriction aux seuls `Admin`/`AdminTuningDesk` ; `POST /:id/answer` (`:86`) exclut `Admin`.
22. `FAIT` — **Validation UI/contrôle RH incohérente sur les stages** : `src/pages/hr/RHStagesPage.tsx:76` autorise tout `AdminDepartment` dans l'UI alors que `rhStageRoutes.js:17,23,29` impose `checkRHAccess`.
23. `FAIT` — **`updateDeclaration` ne resynchronise pas tous les champs de présence** : `backend/controllers/attendanceDeclarationController.js:540-547` omet `impacteSolde`, `leaveReasonId`, `detailsMotif`, `heureArrivee`, `date`.
24. `FAIT` — **`permanentDelete` sur un message renvoie 200 sans supprimer** : `backend/controllers/trashController.js:445-475` quand tous les participants n'ont pas supprimé le message.

### e. Fiabilité
25. `FAIT` — **Masquage des pannes MongoDB en HTTP 200 OK dans `server.ts`** : `server.ts:258-300` intercepte `MongooseError`/`ECONNREFUSED` sur les requêtes `GET` et renvoie `{ success: true, data: [] / {} }` (alors que `backend/server.js:209-225` renvoie `503`).
26. `FAIT` — **Divergence critique entre `server.ts` (actif via `package.json:7-9`) et `backend/server.js`** : `server.ts` omet `helmet`, `globalLimiter`/`loginLimiter`, `startIndexRetryScheduler()`, `startBackupScheduler()`, `startCleanupScheduler()` et les événements Socket.io du scanner (`backend/server.js:148-206,323-325,377-421`).
27. `FAIT` — **Crash 500 si `activeDepartment` est absent** : `backend/controllers/outgoingDocuments/detailControllers.js:60,80,97` appelle `.activeDepartment._id.toString()` sans opérateur optionnel.
28. `FAIT` — **Restauration de sauvegarde non fiable** : `backend/controllers/backup.js:615-645` laisse un `safetyBackup` `'in_progress'`, masque les erreurs `unzip` en `console.warn` et ne restaure pas MongoDB.

### f. Sécurité fonctionnelle
29. `FAIT` — **Contournement du mot de passe courant** : `backend/controllers/auth/passwordController.js:21` ignore la vérification si `currentPassword` est vide/absent.
30. `FAIT` — **Route d'administration sans authentification hors production** : `backend/routes/adminRoutes.js:18-21` laisse passer `POST /api/admin/reindex-failed` sans token si `NODE_ENV !== 'production'`.
31. `FAIT` — **Fuites de données RH (sanctions, diplômes, promotions, stages)** : `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41`, `backend/routes/rhStageRoutes.js:7,10,11` et `backend/routes/rhStagePersonnelRoutes.js:7,13` ne vérifient que `protect` (tout rôle `User` lit les sanctions d'autrui).
32. `FAIT` — **Fuites de pièces jointes et courriers** :
    - `backend/controllers/fileController.js:36` autorise l'accès si `docDepts.length === 0` et ignore `OutgoingDocument.source.id` (`:31-34`).
    - `server.ts:172` / `fileController.js:84-118` (`/courrier`) n'ont aucun contrôle RBAC par département.
    - `backend/controllers/incomingDocuments/detailControllers.js:86-92` laisse tout rôle lire un courrier entrant non affecté.
33. `FAIT` — **Fuites inter-départements sur les dossiers** : `backend/controllers/folders/documentControllers.js:79-108` et `:127-146` (`assignDocumentToFolder`, `batchMoveDocuments`).
34. `FAIT` — **Atteinte à la confidentialité messagerie et notifications** : `messages/managementControllers.js:167,235` (accès `Admin`/`AdminTuningDesk` à la messagerie privée d'autrui) ; `activityNotifications.js:75-86` (`deleteNotification` sans vérifier l'utilisateur).
35. `FAIT` — **JWT transmis en query string (`?token=`)** : `src/services/documentService.ts:505-508` + `backend/middleware/auth.js:23-25`.
36. `FAIT` — **Mass assignment `{ ...req.body }`** : `managementControllers.js:248`, `rhStageController.js:226`, `rhPersonnelHistoryController.js:115,281,449,615`, `rhReferenceController.js:167,375`.
37. `FAIT` — **Absence de `helmet`, rate limiting et CORS restrictif dans `server.ts`** : `server.ts:122-126` (`origin: '*'`), `:156-161` (`origin: true`).
38. `FAIT` — **Création libre d'entrées d'audit** : `backend/routes/auditLogs.js:22` (`POST /api/audit-logs` ouvert à tout `protect`).

### g. OCR & IA
39. `FAIT` — **Modèle d'embedding journalisé erroné** : `backend/services/semanticIndexer.js:99` code en dur `'nomic-embed-text'` alors que `ollamaService.js:24` utilise `'bge-m3-q4_k_m.gguf'`.
40. `FAIT` — **Réindexation de courriers en corbeille** : `IncomingDocument.js:116-125` et `OutgoingDocument.js:104-114` indexent sur `save` sans filtrer `isDeleted`.
41. `FAIT` — **Plafond RAG à 500 vecteurs en RAM** : `backend/controllers/ai/chatController.js:128-131` (perte silencieuse de rappel au-delà de 500 documents).
42. `HYPOTHÈSE` (`[À TESTER EN LOCAL]`) — La qualité d'extraction/résumé/traduction dépend de la présence locale des deux `.gguf` (`ollamaService.js:17-25`) et des binaires `tesseract`/`poppler` (`ocrProcessor.js:148-159`).

### h. Scan
43. `FAIT` — **Relais Socket.io et diagnostic matériel absents de `server.ts`** : présents uniquement dans `backend/server.js:377-421`.
44. `HYPOTHÈSE` (`[À TESTER EN LOCAL]`) — La capture physique WIA (`windows/scannerDetection.js:13-37`) et SANE (`linux/scanExecutor.js`) ainsi que le rendu live des miniatures nécessitent un test sur poste avec matériel branché.

### i. Qualité d'interface
45. `FAIT` — **37 pages contiennent du texte arabe codé en dur hors `t()`** (ex. `SettingsPage.tsx`, `RHStagesPage.tsx`, `AttendancePage.tsx`, `ScanDocumentPage.tsx:41-98`).
46. `FAIT` — **Incohérence validation mot de passe UI (`< 6`) vs API/modèle (`>= 8` + majuscule + chiffre)** : `SettingsPage.tsx:201` et `SetupWizardPage.tsx:288` vs `User.js:16-20`.
47. `FAIT` — **Impression limitée à un seul écran** : `window.print()` présent uniquement dans `ViewOutgoingDocument.tsx:210-212`.

### j. Exploitation
48. `FAIT` — **Double entrypoint serveur source de dérive (`server.ts` vs `backend/server.js`)** : `package.json:7-9` démarre `server.ts`, rendant inactifs les schedulers, rate-limiters et `helmet` de `backend/server.js`.
49. `FAIT` — **Export PDF d'audit en arabe sans police TTF embarquée** : `backend/controllers/auditLogs.js:177-200` (`[À TESTER EN LOCAL]`).
50. `FAIT` — **Présence de 12 fichiers `.bak`/`.OLD` suivis dans le dépôt** alourdissant la maintenance.

---

## ÉTAPE 3 — TABLEAU DE PRIORISATION DES LACUNES

Critères : **P0** (faille de sécurité critique, perte/corruption de données, flux cœur cassé/factice) · **P1** (blocage métier important, incohérence workflow/RBAC/données) · **P2** (gêne fonctionnelle, limites export/pagination, multilingue partiel) · **P3** (hygiène dépôt, dette mineure).

| ID | Lacune | Module | `fichier:ligne` | Impact | Probabilité | Effort | Priorité | Justification |
|---|---|---|---|---|---|---|---|---|
| L-01 | Contournement `currentPassword` dans `updatePassword` | Auth | `backend/controllers/auth/passwordController.js:21` | Faille | Élevée | S | **P0** | Tout token actif permet de changer le mot de passe sans connaître l'ancien. |
| L-02 | `/api/admin/reindex-failed` sans auth si `NODE_ENV !== 'production'` | IA / Admin | `backend/routes/adminRoutes.js:18-21` | Faille | Élevée | S | **P0** | Expose une opération lourde d'indexation à toute requête anonyme en environnement non-prod. |
| L-03 | `server.ts` sans `helmet`, rate limiting (`loginLimiter`) et CORS ouvert | Sécurité / Exploit. | `server.ts:122-126,156-161` | Faille | Élevée | M | **P0** | L'entrypoint actif (`package.json:7-9`) expose le login au brute-force et affaiblit les en-têtes HTTP. |
| L-04 | Lecture sanctions/historique/stages RH accessible à tout rôle `User` | RH | `backend/routes/rhPersonnelHistoryRoutes.js:9-41` ; `rhStageRoutes.js:7-11` | Faille | Élevée | S | **P0** | Divulgation de données personnelles et disciplinaires sensibles à tout compte authentifié. |
| L-05 | Fuite de pièces jointes (`docDepts.length === 0`, `/courrier` sans RBAC) | Pièces jointes | `backend/controllers/fileController.js:36,84-118` ; `server.ts:172` | Faille | Élevée | M | **P0** | Des courriers confidentiels d'autres départements sont téléchargeables directement. |
| L-06 | Déplacement de documents inter-départements sans RBAC | Dossiers | `backend/controllers/folders/documentControllers.js:79-146` | Faille | Moyenne | S | **P0** | Un chef de service peut rattacher ou détacher des courriers appartenant à un autre service. |
| L-07 | Suppression de notifications d'autrui & lecture messages privés par admin | Messagerie / Notif | `backend/controllers/activityNotifications.js:75-86` ; `messages/managementControllers.js:167,235` | Faille | Moyenne | S | **P0** | Rupture de confidentialité des messages privés et sabotage possible des alertes d'autres utilisateurs. |
| L-08 | Corruption des liens `answer`/`reference` à l'édition d'un sortant | Courrier sortant | `backend/controllers/outgoingDocuments/managementControllers/documentUpdateController.js:82-96,255-296` | Données perdues | Élevée | M | **P0** | Casse l'appariement courrier entrant / réponse sortante lors des mises à jour. |
| L-09 | Destruction des liens `answer`/`reference` lors du soft-delete | Corbeille | `backend/controllers/incomingDocuments/managementControllers/documentDeleteController.js:20-27` | Données perdues | Élevée | M | **P0** | Restaurer un courrier de la corbeille ne rétablit jamais son lien de réponse. |
| L-10 | `emptyTrash` supprime des dossiers et détache des courriers actifs | Corbeille | `backend/controllers/trashController.js:631-637` | Données perdues | Moyenne | S | **P0** | Vider la corbeille casse le classement de documents actifs non supprimés. |
| L-11 | Transfert de courrier sortant purement factice (`setTimeout`) | Courrier sortant | `src/pages/documents/OutgoingDocumentsPage.tsx:375-385` | Blocage métier | Élevée | M | **P0** | L'utilisateur croit avoir transféré un courrier alors qu'aucune trace ni transmission n'existe. |
| L-12 | Restauration sauvegarde sans `mongorestore` et erreurs `unzip` avalées | Sauvegarde | `backend/controllers/backup.js:615-645` | Données perdues | Élevée | L | **P0** | Donne l'illusion d'une restauration complète alors que la base MongoDB reste inchangée. |
| L-13 | `server.ts` masque les pannes DB GET en HTTP 200 OK | Fiabilité | `server.ts:258-300` | Blocage métier | Moyenne | S | **P0** | Fait croire à des listes vides ou réinitialisées au lieu de signaler l'indisponibilité DB. |
| L-14 | JWT transmis dans l'URL `?token=` pour les iframes/téléchargements | Pièces jointes / Sécurité | `src/services/documentService.ts:505-508` ; `auth.js:23-25` | Faille | Élevée | M | **P1** | Le jeton d'authentification fuite dans les historiques navigateurs et journaux proxy. |
| L-15 | Mass assignment `{ ...req.body }` dans Users et RH | Utilisateurs / RH | `managementControllers.js:248` ; `rhStageController.js:226` ; `rhPersonnelHistoryController.js:115,281` | Faille | Moyenne | M | **P1** | Permet l'altération non voulue de champs internes du modèle lors d'un PUT. |
| L-16 | Lecture des courriers entrants sans `assignedTo` ouverte à tous | Courrier entrant | `backend/controllers/incomingDocuments/detailControllers.js:86-92` | Faille | Moyenne | S | **P1** | Expose tout courrier nouvellement scanné avant son affectation départementale. |
| L-17 | Numérotation non atomique & index uniques sans filtre `isDeleted` | Numérotation | `documentHelper.js:21-31` ; `serialNumber.js:45,91` ; `IncomingDocument.js:103` | Données perdues | Moyenne | M | **P1** | Risque de doublons simultanés et blocage de numéros/CIN après mise en corbeille. |
| L-18 | `Attendance.motif` figé par enum vs `LeaveReason` dynamique | Présence | `backend/models/Attendance.js:27-46` ; `attendanceDeclarationController.js:329-339` | Blocage métier | Élevée | M | **P1** | Tout nouveau motif créé par les RH est effacé à l'approbation ou rejeté au batch. |
| L-19 | `saveBatchAttendance` ignore `entry.date` & omet filtre `isDeleted` | Présence | `backend/controllers/attendanceController.js:106,176-184,260-264` | Données perdues | Moyenne | S | **P1** | Enregistre des présences à la mauvaise date et inclut les agents supprimés. |
| L-20 | Filtres, tri et export CSV limités à la page courante (10 lignes) | Courrier E/S | `IncomingDocumentsPage.tsx:231-285` ; `OutgoingDocumentsPage.tsx:221-276,462` | Blocage métier | Élevée | M | **P1** | Les filtres « en attente / urgent / type » et l'export CSV manquent les pages 2..N. |
| L-21 | Unification `server.ts` / `backend/server.js` (schedulers & sockets scan) | Exploitation / Scan / IA | `server.ts` vs `backend/server.js:323-325,377-421` | Blocage métier | Élevée | M | **P1** | Les crons (sauvegarde, purge temp, rattrapage RAG) et sockets scan sont inactifs sous `server.ts`. |
| L-22 | Crash 500 si `activeDepartment` nul dans détail sortant | Courrier sortant | `backend/controllers/outgoingDocuments/detailControllers.js:60,80,97` | Blocage métier | Moyenne | S | **P1** | Produit une erreur serveur 500 pour tout utilisateur sans département actif défini. |
| L-23 | Préférences sécurité `localStorage` & révocation sessions factice | Paramètres | `src/pages/settings/SettingsPage.tsx:212-241` | Gêne | Élevée | M | **P1** | Donne un faux sentiment de sécurité (2FA/timeout locaux au navigateur seulement). |
| L-24 | Incohérence roles `document-options` (`Admin` vs `AdminTuningDesk`) & `incomingDocuments` | Paramètres / Entrant | `App.tsx:223,456` ; `documentOptions.js:19-23` ; `incomingDocuments.js:58,86` | Blocage métier | Moyenne | S | **P1** | Un rôle autorisé dans l'UI reçoit un 403 API (ou inversement). |
| L-25 | Incohérence validation mot de passe UI (`<6`) vs modèle (`>=8`+complexité) | Auth / Setup | `SettingsPage.tsx:201` ; `SetupWizardPage.tsx:288` ; `User.js:16-20` | Gêne | Moyenne | S | **P2** | L'utilisateur reçoit une erreur serveur générique sur un mot de passe accepté par le front. |
| L-26 | `semanticIndexer.js` code `'nomic-embed-text'` & indexe les docs supprimés | Assistant IA | `semanticIndexer.js:99` ; `IncomingDocument.js:116-125` | Gêne | Élevée | S | **P2** | Fausse la traçabilité du modèle d'embedding et pollue le RAG (plafonné à 500 vecteurs). |
| L-27 | `globalSearchController.js` exclut `ocrText` et `AdminTuningDesk` | Recherche | `backend/controllers/globalSearchController.js:73,86-93` | Gêne | Élevée | M | **P2** | La barre globale ne retrouve pas les courriers par contenu scanné. |
| L-28 | `updateDeclaration` ne resynchronise pas tous les champs `Attendance` | Présence | `backend/controllers/attendanceDeclarationController.js:540-547` | Données perdues | Moyenne | S | **P2** | Le solde et les détails restent obsolètes après modification d'une déclaration approuvée. |
| L-29 | `offlineOcrService.ts` contient un stub PDF canvas factice | OCR | `src/services/offlineOcrService.ts:303-328` | Gêne | Faible | S | **P2** | Code mort trompeur qui ne réalise aucune extraction PDF réelle côté client. |
| L-30 | `auditLogs.js` limite l'export à 100 lignes et manque de police arabe PDF | Audit / Export | `backend/controllers/auditLogs.js:132,177-200` | Gêne | Élevée | M | **P2** | Les exports d'audit annuels sont tronqués et l'arabe PDF risque d'être illisible. |
| L-31 | `organizationChartController.js` tronque le personnel à 10 par service | Organigramme | `backend/controllers/organizationChartController.js:113` | Gêne | Moyenne | S | **P2** | Les départements de >10 agents apparaissent incomplets dans l'organigramme. |
| L-32 | `getBackupStats` fabrique `totalFileSize` par multiplication fixe | Sauvegarde | `backend/controllers/backup.js:59-60` | Gêne | Élevée | S | **P2** | Affiche une volumétrie disque fictive dans l'écran de sauvegarde. |
| L-33 | 37 pages UI avec texte arabe codé en dur hors `t()` | Multilingue | `src/pages/ScanDocumentPage.tsx:41-98` (+36 pages) | Gêne | Élevée | L | **P2** | L'interface en langue française reste mixée avec de l'arabe non traduit. |
| L-34 | `permanentDelete` message renvoie 200 OK même si non supprimé | Corbeille | `backend/controllers/trashController.js:445-475` | Gêne | Moyenne | S | **P3** | Toast trompeur pour l'utilisateur quand le correspondant garde le message. |
| L-35 | `RHStage.js` référence un modèle `RHSessionFormation` inexistant | RH | `backend/models/RHStage.js:14` | Gêne | Faible | S | **P3** | Tout `.populate('sessionFormationId')` échouerait sans modèle associé. |
| L-36 | Impression absente hors `ViewOutgoingDocument.tsx` | Impression | `src/pages/documents/ViewOutgoingDocument.tsx:210-212` | Gêne | Moyenne | M | **P3** | Impossibilité d'imprimer directement une fiche courrier entrant ou un état RH. |
| L-37 | Page morte `SecurityPrivacyPage.tsx` & 12 fichiers `.bak`/`.OLD` | Hygiène code | `src/pages/settings/SecurityPrivacyPage.tsx` ; `*.bak`/`*.OLD` | Gêne | Faible | S | **P3** | Code mort encombrant la base de code et source de confusion à l'audit. |

---

## ÉTAPE 4 — PLAN DE CORRECTION PAR LOTS

### Chemin critique et parallélisation
- **Chemin critique** : `Lot 1 (Sécurité & Entrypoint)` → `Lot 2 (Intégrité données & Corbeille)` → `Lot 3 (Workflows Courrier & Exports)` → `Lot 6 (Validation E2E globale)`.
- **Lots parallélisables** : Dès que `Lot 1` est validé, **`Lot 4 (RH & Présence)`** et **`Lot 5 (IA, OCR, Scan, i18n, Hygiène)`** peuvent être menés en parallèle de `Lot 2`/`Lot 3` car leurs modèles et contrôleurs sont découplés.

---

### Lot 1 — Durcissement Sécurité, RBAC et Unification Serveur (Prérequis : aucun)
- **Tâche 1.1** : Exiger et vérifier systématiquement `currentPassword` dans `updatePassword` (`backend/controllers/auth/passwordController.js`).
- **Tâche 1.2** : Supprimer le bypass `NODE_ENV !== 'production'` de `adminRoutes.js` et unifier l'authentification stricte.
- **Tâche 1.3** : Porter `helmet`, `globalLimiter`, `loginLimiter`, CORS configurable et la gestion `503` stricte (sans faux HTTP 200 GET) dans `server.ts`, ainsi que les schedulers (`startIndexRetryScheduler`, `startBackupScheduler`, `startCleanupScheduler`) et sockets scan.
- **Tâche 1.4** : Ajouter `authorize` + `checkRHAccess` sur les routes GET RH (`rhPersonnelHistoryRoutes.js`, `rhStageRoutes.js`, `rhStagePersonnelRoutes.js`) et corriger `activityNotifications.js` (`deleteNotification`) + `messages/managementControllers.js` (confidentialité messages privés).
- **Tâche 1.5** : Sécuriser `fileController.js` (`serveProtectedFile` + `serveCourrierStatic`), `folders/documentControllers.js` (RBAC source + destination) et `incomingDocuments/detailControllers.js` (`assignedTo` vide réservé Bureau d'Ordre/Admin), et remplacer `?token=` par en-tête `Authorization` / cookie `HttpOnly` sécurisé.
- **Tâche 1.6** : Remplacer `{ ...req.body }` par des listes blanches explicites (`managementControllers.js`, `rhStageController.js`, `rhPersonnelHistoryController.js`, `rhReferenceController.js`).
- **Critères de succès** :
  - `curl` sans `currentPassword` sur `/api/auth/updatepassword` → `400/401`.
  - `curl` anonyme sur `/api/admin/reindex-failed` → `401`.
  - `curl` rôle `User` sur `/api/hr/personnel/:id/full-history`, `/courrier/...`, `/api/folders/batch-move-documents`, `/api/activity-notifications/:otherId` → `403`.
  - `npm run lint && npm run build` sans erreur.

### Lot 2 — Intégrité des Données, Numérotation et Corbeille (Prérequis : Lot 1)
- **Tâche 2.1** : Corriger `outgoingDocuments/.../documentUpdateController.js` pour comparer l'ancienne référence avant mise à jour et avant `.populate()` sans écraser les IDs.
- **Tâche 2.2** : Préserver les liens `answer`/`reference` (ou un champ d'archive) lors du soft-delete (`documentDeleteController.js`) pour permettre une restauration intègre ; retourner un statut exact sur `permanentDelete` de message et bloquer `emptyTrash` sur dossiers non vides (`trashController.js`).
- **Tâche 2.3** : Remplacer la numérotation par un compteur atomique (`findOneAndUpdate` `$inc` sur collection `Counter`) excluant les collisions et migrer les index uniques (`IncomingDocument.js`, `OutgoingDocument.js`, `Personnel.js`) vers `partialFilterExpression: { isDeleted: false }`.
- **Tâche 2.4** : Sécuriser `outgoingDocuments/detailControllers.js` contre `activeDepartment === null`.
- **Tâche 2.5** : Implémenter un vrai calcul disque dans `backup.js:getBackupStats` et une restauration transactionnelle complète (`unzip` strict + `mongorestore` vérifié + mise à jour `safetyBackup`).
- **Critères de succès** :
  - Test d'intégration : création concurrente de 5 courriers → 5 `serialNumber` uniques sans `E11000`.
  - Soft-delete puis restauration d'un couple Entrant/Sortant → lien `answer`/`reference` conservé.
  - Suppression logique d'un dossier contenant un document actif → rejet `400` dans `emptyTrash`.

### Lot 3 — Workflows Courrier, Pagination, Exports et Paramètres (Prérequis : Lot 2)
- **Tâche 3.1** : Brancher le transfert de courrier sortant (`OutgoingDocumentsPage.tsx`) sur un endpoint backend réel (audit + notification + historique) ou le retirer si hors périmètre (`DÉCISION DU PROPRIÉTAIRE`).
- **Tâche 3.2** : Déplacer les filtres (`statusFilter`, `selectedType`, `folderFilter`) et le tri côté API MongoDB (`IncomingDocumentsPage.tsx`, `OutgoingDocumentsPage.tsx`, contrôleurs associés) et faire pointer les exports CSV sur une route/requête non paginée.
- **Tâche 3.3** : Aligner les rôles UI/API sur `document-options`, `incomingDocuments` (`PUT /:id`, `POST /:id/answer`) et `globalSearchController.js` (`AdminTuningDesk` + recherche sur `ocrText`).
- **Tâche 3.4** : Supprimer le faux stockage `localStorage` des préférences critiques et la fausse action `handleTerminateAllOtherSessions` dans `SettingsPage.tsx` (brancher backend ou retirer), supprimer `SecurityPrivacyPage.tsx` et aligner la validation mot de passe (`>=8` + complexité) dans `SettingsPage.tsx` et `SetupWizardPage.tsx`.
- **Tâche 3.5** : Lever la limite fixe à 100 sur `auditLogs.js:exportAuditLogs`, embarquer une police TTF arabe (`Amiri`) pour l'export PDF d'audit, et étendre `window.print()` aux fiches entrantes/RH.
- **Critères de succès** :
  - Filtre `urgent` / `pending` sur >10 documents renvoie les résultats des pages 2+.
  - Export CSV sortant de 25 documents contient 25 lignes + en-tête.
  - Mot de passe de 6 caractères rejeté dès le front avant l'appel API.

### Lot 4 — Module RH et Présence / Congés (Prérequis : Lot 1 ; parallélisable avec Lots 2–3)
- **Tâche 4.1** : Supprimer l'enum figé sur `Attendance.motif` (ou le synchroniser dynamiquement via référence `LeaveReason` validée en base) pour supporter les motifs RH personnalisés dans `saveBatchAttendance` et `approveDeclaration`.
- **Tâche 4.2** : Corriger `saveBatchAttendance` pour enregistrer sur `entry.date` (normalisé UTC) et filtrer `Personnel.find` selon `isDeleted: { $ne: true }` (tout en gardant les statuts inactifs si souhaité).
- **Tâche 4.3** : Compléter `updateDeclaration` (`attendanceDeclarationController.js`) pour resynchroniser `impacteSolde`, `leaveReasonId`, `detailsMotif`, `heureArrivee` et `date` dans `Attendance`.
- **Tâche 4.4** : Aligner `RHStagesPage.tsx` (`canManageStages` avec vérification département RH) et supprimer ou créer le modèle `RHSessionFormation` référencé dans `RHStage.js:14`.
- **Tâche 4.5** : Paginer ou lever la troncature `.slice(0, 10)` dans `organizationChartController.js`.
- **Critères de succès** :
  - Création d'un `LeaveReason` custom + approbation déclaration associée → `Attendance` enregistré avec le motif custom et solde déduit si `impacteSolde: true`.
  - Organigramme d'un service de 15 agents retourne les 15 agents.

### Lot 5 — IA (RAG), OCR, Scan, Multilingue et Hygiène Dépôt (Prérequis : Lot 1 ; parallélisable avec Lots 2–4)
- **Tâche 5.1** : Corriger `semanticIndexer.js` (`embeddingModel` dynamique issu de `ollamaService.js`, exclusion `isDeleted` dans les hooks post-save de `IncomingDocument`/`OutgoingDocument`) et gérer la scalabilité au-delà de 500 vecteurs dans `chatController.js`.
- **Tâche 5.2** : Supprimer le stub canvas `pdfToImageData` de `offlineOcrService.ts` et clarifier l'UI de progression OCR serveur dans `useOfflineOcr.ts`.
- **Tâche 5.3** : Vérifier en conditions réelles WIA/SANE + GGUF + Tesseract (`[À TESTER EN LOCAL]`).
- **Tâche 5.4** : Migrer les chaînes arabes codées en dur des 37 pages UI vers `fr.json` et `ar.json` via `t()` (dont `ScanDocumentPage.tsx`, `SettingsPage.tsx`, `RHStagesPage.tsx`, `AttendancePage.tsx`, `DepartmentsPage.tsx`).
- **Tâche 5.5** : Nettoyer les 12 fichiers `.bak`/`.OLD` après confirmation propriétaire.
- **Critères de succès** :
  - Zéro caractère arabe hors dictionnaires i18n / données utilisateur dans `src/pages/`.
  - `git status` propre sans fichiers `.bak`/`.OLD`.

---

## ÉTAPE 5 — 10 SCÉNARIOS DE TESTS D'ACCEPTATION E2E

| # | Scénario & Rôle | Étapes & Données fictives | Résultat attendu | Commande / Vérification locale |
|---|---|---|---|---|
| **T1** | **Changement de mot de passe sécurisé** (`User`) | 1. Se connecter avec `user_test` / `Azerty123`.<br>2. Appeler `PUT /api/auth/updatepassword` sans `currentPassword`, puis avec un mauvais `currentPassword`, puis avec le bon et `NewPass123`. | HTTP `400`/`401` si `currentPassword` absent ou faux ; HTTP `200` uniquement si `currentPassword` valide et nouveau `>=8` avec maj+chiffre. | `curl -i -X PUT http://localhost:3000/api/auth/updatepassword -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"newPassword":"NewPass123"}'` |
| **T2** | **Cloisonnement pièces jointes & courriers non affectés** (`User` Dept A vs Dept B) | 1. Créer un courrier entrant `subject: "Confidentiel B"` affecté au Dept B (`1.pdf`) et un courrier sans affectation.<br>2. Tenter `GET /api/files/...`, `GET /courrier/...`, `GET /api/incoming-documents/:id` avec token Dept A. | HTTP `403` sur toutes ces lectures ; aucun téléchargement PDF possible sans autorisation sur le département. | `curl -i http://localhost:3000/courrier/2026/Incoming-Doc/1.pdf -H "Authorization: Bearer $USER_A_TOK"` |
| **T3** | **Protection données RH & sanctions** (`User` simple) | 1. Avec token rôle `User`, appeler `GET /api/hr/personnel/:id/sanctions`, `/full-history` et `GET /api/hr/stages`. | HTTP `403 Forbidden` (sauf sur `/my-profile/full-history` pour son propre profil). | `curl -i http://localhost:3000/api/hr/personnel/$PERS_ID/sanctions -H "Authorization: Bearer $USER_TOK"` |
| **T4** | **Protection dossiers inter-services** (`AdminDepartment` Dept A) | 1. Tenter `PUT /api/folders/assign-document` (`folderId: null`) et `PUT /api/folders/batch-move-documents` sur un courrier du Dept B. | HTTP `403 Forbidden` ; le champ `folder` du courrier du Dept B reste inchangé. | `curl -i -X PUT http://localhost:3000/api/folders/batch-move-documents -H "Authorization: Bearer $DEPT_A_TOK" -H "Content-Type: application/json" -d '{"documentIds":["'$DOC_B'"],"folderId":null,"type":"incoming"}'` |
| **T5** | **Cycle Courrier Entrant → Réponse Sortante → Modification → Corbeille → Restauration** (`AdminTuningDesk` + `AdminDepartment`) | 1. Créer entrant `E-100`.<br>2. Créer réponse sortante `S-50` liée à `E-100`.<br>3. Modifier `S-50` vers `E-101`, puis revenir à `E-100`.<br>4. Soft-delete `S-50`, puis restaurer depuis `/trash`. | Liens `E-100.answer` et `E-101.answer` toujours cohérents ; après restauration de `S-50`, le lien avec `E-100` est intact. | Vérifier `GET /api/incoming-documents/$E100` et `/api/outgoing-documents/$S50` après chaque étape. |
| **T6** | **Filtres, pagination et export CSV complet** (`Admin`) | 1. Créer 15 courriers sortants (10 page 1, 5 page 2) dont 8 `typeDocument: "note"`.<br>2. Filtrer sur `typeDocument=note` et cliquer Export CSV. | Le tableau retourne les 8 notes (y compris celles créées en premier sur la page 2) et le CSV contient 8 lignes de données. | `curl -s "http://localhost:3000/api/outgoing-documents?page=1&limit=10&typeDocument=note" -H "Authorization: Bearer $ADMIN_TOK"` |
| **T7** | **Numérotation concurrente et réutilisation post-corbeille** (`AdminTuningDesk`) | 1. Lancer 5 créations `POST /api/incoming-documents` en parallèle sur l'année `2026`.<br>2. Supprimer définitivement le dernier et en recréer un. | Aucune erreur `E11000 duplicate key`, 5 numéros séquentiels distincts générés atomiquement. | Script `for i in 1 2 3 4 5; do curl -s -X POST ... & done; wait` |
| **T8** | **Motif de présence personnalisé & déclaration** (`Admin` RH + `User`) | 1. Créer un `LeaveReason` code `mission_speciale` (`impacteSolde: true`).<br>2. User déclare `absent` avec `mission_speciale`.<br>3. RH approuve puis consulte le bilan annuel. | `Attendance` créé avec `motif: "mission_speciale"`, `impacteSolde: true` et 1 jour déduit dans `/api/attendance/report/yearly`. | `curl -s "http://localhost:3000/api/attendance/report/yearly?year=2026" -H "Authorization: Bearer $ADMIN_TOK"` |
| **T9** | **Sauvegarde et restauration intégrale** (`Admin`) | 1. Créer une sauvegarde via `POST /api/backup/create`.<br>2. Modifier un document test.<br>3. Restaurer la sauvegarde via `POST /api/backup/restore`. | L'archive ZIP + dump MongoDB sont restaurés, `safetyBackup` est `completed`, et le document retrouve son état d'avant modification. | `curl -s -X POST http://localhost:3000/api/backup/create -H "Authorization: Bearer $ADMIN_TOK"` |
| **T10** | **Numérisation physique, OCR asynchrone et RAG bilingue** (`AdminTuningDesk`) | 1. Brancher scanner WIA/SANE, lancer scan 2 pages (`POST /api/scan/temp`).<br>2. Vérifier aperçu PDF immédiat puis fin OCR.<br>3. Interroger `POST /api/ai/chat` sur un mot-clé du PDF. | Aperçu PDF servi sans attendre la fin Tesseract ; `ocrText` indexé avec `bge-m3` ; le chat IA cite la source du courrier scanné. | `curl -s http://localhost:3000/api/scan/devices -H "Authorization: Bearer $ADMIN_TOK" && curl -s http://localhost:3000/api/ai/health -H "Authorization: Bearer $ADMIN_TOK"` |
