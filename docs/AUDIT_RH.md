# AUDIT FONCTIONNEL, SÉCURITÉ ET INTÉGRITÉ — MODULE RH (DMS)

- **Répertoire de travail (`pwd`) :** `/app/applet`
- **Nature de la copie :** `COPIE CLOUD (/app/applet)`
- **Périmètre analysé :** Sous-modules Ressources Humaines (Personnel, Profil, Documents liés au personnel, Historique de carrière, Stages & Référentiels, Présences / Soldes / Motifs / Rapports, Déclarations de présence, Organigramme), middlewares d'accès, sauvegarde/restauration, index et corbeille.
- **Conventions de preuve appliquées :**
  - **`FAIT`** : constat directement vérifié dans le code source avec citation `fichier:ligne` et extrait court (sans secret).
  - **`HYPOTHÈSE`** : comportement probable ou conséquence déduite nécessitant confirmation ou exécution locale.
  - **`DÉCISION DU PROPRIÉTAIRE`** : choix métier, juridique, organisationnel ou produit appartenant exclusivement au propriétaire.
  - **`[NON VÉRIFIÉ]`** : élément non lu ou absent du périmètre observé.
  - **`[À TESTER EN LOCAL]`** : comportement nécessitant un serveur Node.js/MongoDB en cours d'exécution, accompagné de la commande exacte.

---

## 1. Inventaire par sous-module RH et état des lots appliqués

### 1.1 Inventaire technique et fonctionnel

| Sous-module | Routes backend & Contrôleurs | Modèles principaux | Écrans & Services frontend | Rôles autorisés (Backend) | Statut & Preuve (`fichier:ligne`) |
|---|---|---|---|---|---|
| **Personnel & Mon Profil** | `/api/hr/personnel*`, `/api/hr/my-profile`, `/api/hr/my-documents` (`backend/routes/personnelRoutes.js:25-65`), `personnelController.js:1-920` | `Personnel` (`backend/models/Personnel.js:1-168`), `User` (`backend/models/User.js:1-140`) | `PersonnelListPage.tsx:1-250`, `PersonnelDetailPage.tsx:1-1335`, `MyProfilePage.tsx:1-367`, `PersonnelForm.tsx:1-500`, `carteInstructionService.ts:1-953` | `GET /personnel`: `Director, Admin, AdminDepartment, AdminTuningDesk` (`:55`) ; `GET /personnel/:id`: `protect + checkRHAccess` (`:59`) ; `POST/PUT/DELETE/restore/photo/link-user`: `Admin, AdminDepartment + checkRHAccess` (`:32-64`) ; `/my-*`: tout authentifié (`:25-26`) | **PARTIEL** — Fuite PII sur `GET /personnel` sans `checkRHAccess`, photos publiques (`server.ts:175-176`), désalignement champs UI/PDF (`PersonnelDetailPage.tsx:259-475`, `carteInstructionService.ts`). |
| **Documents liés au personnel** | `/api/hr/personnel/:personnelId/documents`, `/api/hr/personnel-documents/:associationId`, `/api/hr/documents/:documentType/:documentId/personnel` (`backend/routes/personnelDocumentRoutes.js:18-28`), `personnelDocumentController.js:1-399` | `PersonnelDocument` (`backend/models/PersonnelDocument.js`) | Onglet Documents dans `PersonnelDetailPage.tsx`, `MyProfilePage.tsx` | `POST/PUT/DELETE`: `Admin, AdminDepartment, AdminTuningDesk` + `canUserLinkPersonnel` (`:27-43`) ; `GET`: `Director, Admin, AdminDepartment, AdminTuningDesk` sans filtre département (`:20,28`) | **PARTIEL** — Écriture protégée par `canUserLinkPersonnel`, mais lecture `GET` expose les courriers et PII de tout personnel entre départements (`personnelDocumentController.js:172-290`). |
| **Carrière / Historique RH** | `/api/hr/personnel/:personnelId/promotions\|postes\|diplomes\|sanctions\|historique`, `/api/hr/my-history` (`backend/routes/rhPersonnelHistoryRoutes.js:13-97`), `rhPersonnelHistoryController.js:1-835` | `RHPromotion`, `RHPoste`, `RHDiplome`, `RHSanction` (`backend/models/rh/`) | Onglets Carrière de `PersonnelDetailPage.tsx:925-1335`, `MyProfilePage.tsx` | `GET`: `User` restreint à son propre dossier, sinon `Admin, Director, AdminDepartment + checkRHAccess` (`:13-55`) ; `POST/PUT/DELETE`: `Admin, AdminDepartment + checkRHAccess` (`:60-97`) | **PARTIEL** — RBAC corrigé (`FERMÉ`), mais accepte les fiches `Personnel` supprimées (`isDeleted: true`) en création/lecture (`rhPersonnelHistoryController.js:55,230,408,589,780`) et ne synchronise pas `grade`/`poste` sur `Personnel`. |
| **Stages & Référentiels RH** | `/api/hr/stages*`, `/api/hr/personnel/:personnelId/stages*` (`backend/routes/rhStageRoutes.js:14-83`, `rhStagePersonnelRoutes.js:13-67`), `/api/hr/ecoles*`, `/api/hr/types-formation*` (`rhReferenceRoutes.js:11-51`), `rhStageController.js:1-465`, `rhReferenceController.js:1-466` | `RHStage` (`backend/models/RHStage.js:1-167`), `RHEcole`, `RHTypeFormation` | `RHStagesPage.tsx:1-250`, onglet Stages dans `PersonnelDetailPage.tsx` | `GET` stages: `User` (son dossier) ou `Admin, Director, AdminDepartment + checkRHAccess` ; Écriture stages: `Admin, AdminDepartment + checkRHAccess` ; Écriture référentiels: `Admin, AdminDepartment` **sans** `checkRHAccess` (`rhReferenceRoutes.js:17,22,27,39,44,49`) | **PARTIEL** — Modèle `RHSessionFormation` référencé dans `RHStage.js:14` et `rhStageController.js:386` **ABSENT** du codebase (`FAIT`), référentiels modifiables hors RH. |
| **Présences, Soldes, Motifs & Rapports** | `/api/hr/attendance*` (`attendanceRoutes.js:1-41`), `/api/hr/leave-reasons*` (`leaveReasonRoutes.js:1-32`), `/api/hr/monthly-report*` (`hr/monthlyReportRoutes.js:1-16`), `attendanceController.js:1-890`, `leaveReasonController.js:1-239`, `monthlyReportController.js:1-286` | `Attendance` (`Attendance.js:1-123`), `LeaveReason` (`LeaveReason.js:1-83`), `PresenceSettings` (`PresenceSettings.js:1-59`) | `AttendancePage.tsx:1-450`, `AllPersonnelSituationPage.tsx:1-714`, `LeaveReasonsManagementPage.tsx:1-470`, `MonthlyAttendanceReport.tsx:1-348`, `MyAttendanceCalendarPage.tsx:1-180`, `attendanceService.ts:1-261`, `leaveReasonService.ts:1-128` | `protect + checkAttendanceAccess` (`attendanceRoutes.js`) : `Director/Admin` (tous dépts), `AdminDepartment` (RH = tous, autre dépt = son dépt, `attendanceAccess.js:40-71`) ; `my-calendar`/`my-balance`: tout utilisateur lié | **CASSÉ / PARTIEL** — Enum `motif` rigide à 14 codes vs motifs personnalisés (`Attendance.js:27-46`), `entry.date` ignoré en batch (`attendanceController.js:260-264`), clés `detailsMotif` incompatibles (`AttendancePage.tsx:261-272` vs `Attendance.js:57-76`), casse `FORMATION`/`MISSION`/`SERVICE` cassée dans `AllPersonnelSituationPage.tsx:189-198`, week-ends/fériés non déduits des congés (`attendanceController.js:415-452`). |
| **Déclarations de présence** | `/api/hr/attendance-declarations*` (`attendanceDeclarationRoutes.js:1-19`), `attendanceDeclarationController.js:1-631` | `AttendanceDeclaration` (`backend/models/AttendanceDeclaration.js:1-95`) | `AttendanceDeclarationsPage.tsx:1-800`, `AttendanceDeclarationDialog.tsx:1-481` | `POST /` & `GET /my`: tout authentifié lié à un personnel ; `GET /`, `/pending/count`, `/:id/approve\|reject`: `Admin, Director, AdminDepartment + checkRHAccess` (`attendanceDeclarationRoutes.js:8-15`) | **PARTIEL** — `populate('leaveReasonId', 'nom code categorie impacteSolde')` (`:197,254`) vise des champs inexistants ; `safeMotif = null` sur motif personnalisé empêche le décompte du solde (`:329-339`) ; aucune pièce jointe malgré `requiresDocument`. |
| **Organigramme** | `/api/organization/chart` (`organizationChartRoutes.js:1-10`), `/api/organization/settings` (`organizationSettingsRoutes.js:1-28`), `organizationChartController.js:1-163` | `Department`, `Personnel`, `User`, `OrganizationSettings` (`OrganizationSettings.js:1-48`) | `OrganizationChartPage.tsx:1-332`, `DepartmentNode.tsx:1-153` | `protect` (tout utilisateur authentifié, `organizationChartRoutes.js`) | **PARTIEL** — Plafonné à 10 agents/dépt (`.slice(0, 10)` `:113`), arborescence plate à 2 niveaux, clic agent mène à `/dashboard/hr/personnel/:id` bloqué 403/redirigé hors RH (`App.tsx:239-248`). |
| **Paie / Salaires / Bulletins** | — | — | — | — | **ABSENT** (`FAIT` : `grep -rnE "salaire\|salary\|paie\|bulletin" backend src --exclude-dir=node_modules --exclude-dir=dist` = 0 résultat). |

### 1.2 État de vérification des lots RBAC et Intégrité sur le code actuel

| Point vérifié (Lots RBAC & Intégrité) | Statut | Preuve exacte (`fichier:ligne` + extrait court) |
|---|---|---|
| Middleware `checkRHAccess` bloquant les `AdminDepartment` hors RH | **FERMÉ** | `backend/middleware/auth.js:178-205` : `if (['Admin', 'Director'].includes(req.user.role)) return next();` (`:178`) ; `AdminDepartment` vérifie `userActiveDeptId.toString() === rhDeptId.toString()` (`:199-200`), sinon `403` (`:202-205`). |
| Contrôle d'accès `GET` Historique RH & Stages (`User` = son propre dossier uniquement) | **FERMÉ** | `backend/routes/rhPersonnelHistoryRoutes.js:13-55`, `rhStageRoutes.js:14-83`, `rhStagePersonnelRoutes.js:13-67` : vérification `user.personnelId` ou `Personnel.exists({ _id, userId, isDeleted: { $ne: true } })` pour `User` ; `authorize('Admin','Director','AdminDepartment')` + `checkRHAccess` pour les autres. |
| Index unique partiel `{ cin: 1 }` sur fiches actives | **FERMÉ** (code) / `[À TESTER EN LOCAL]` (base) | `backend/models/Personnel.js:160-163` (`partialFilterExpression: { isDeleted: false, cin: { $type: 'string' } }`) ; `backend/scripts/migrate-indexes.js:166-176`. |
| Whitelist `updatePersonnel` contre le mass assignment (`statut`, `userId`) | **FERMÉ** | `backend/controllers/personnelController.js:345-408` : liste explicite `allowedFields` (`:346-378`) ; commentaire `:345` excluant `statut` et `userId`. |
| Protection des photos du personnel (`/uploads/personnelphoto`, `/uploads/usersphoto`) | **OUVERT** | `server.ts:175-179` : `app.use('/uploads/personnelphoto', express.static(...))` (`:176`) est monté **avant** `app.use('/uploads', protect, ...)` (`:179`). |
| Liste complète du personnel (`GET /api/hr/personnel`) restreinte en confidentialité | **OUVERT** | `backend/routes/personnelRoutes.js:55` : `.get(authorize('Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'), getPersonnelList)` sans `checkRHAccess` ; `personnelController.js:220` exempte `AdminTuningDesk` du filtre département et renvoie tous les champs PII (`:243-267`). |
| Référentiels RH (`RHEcole`, `RHTypeFormation`) restreints au département RH | **OUVERT** | `backend/routes/rhReferenceRoutes.js:15-51` : `authorize('Admin', 'AdminDepartment')` sans `checkRHAccess`. |
| Lecture des documents liés au personnel (`PersonnelDocument`) cloisonnée par département/RH | **OUVERT** | `backend/routes/personnelDocumentRoutes.js:20,28` : `GET` ouvert à `'Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'` sans `checkRHAccess` ni vérification département dans `personnelDocumentController.js:172-290`. |
| Traçabilité `AuditLog` des opérations RH | **OUVERT** | `backend/models/AuditLog.js:8-32` n'inclut ni `'attendance_batch_save'`, ni `'presence_settings_balance_change'`, ni `'Attendance'`, ni `'PresenceSettings'` (appelés dans `attendanceController.js:290-301,833-845`, rejetés silencieusement par `auditLogger.js:48-50`) ; zéro audit sur `Personnel`, `RHStage`, `rhPersonnelHistory`, `AttendanceDeclaration`. |
| Filtrage systématique `isDeleted: { $ne: true }` dans les requêtes RH | **OUVERT** | Absent sur `Personnel.find`/`findById` dans `attendanceController.js:101,106,208,321,389,512,517,597,602,693,698`, `personnelController.js:599,607,637,643` et `User.findById` `:741`, `rhPersonnelHistoryController.js:55,230,408,589,780,787`, `attendanceDeclarationController.js:102,105,169`, `personnelDocumentController.js:36,61,96,183`. |
| Suppression définitive (`hard delete`) en cascade des enregistrements RH | **OUVERT** | `backend/controllers/trashController.js:82,601-610,733-741` : supprime uniquement `item.photo` (`:82`) puis `Personnel` via `findByIdAndDelete`, laissant orphelins `RHStage`, `RHPromotion`, `RHPoste`, `RHDiplome`, `RHSanction`, `Attendance`, `AttendanceDeclaration`, `PersonnelDocument`. |

---

## 2. Lacunes détaillées

### a) Sécurité et confidentialité

1. **Inventaire des données personnelles sensibles stockées (`FAIT`) :**
   `backend/models/Personnel.js` stocke : identité et `cin` (`:28`), `groupeSanguin` (`:88`), `numeroPasseport` et `dateValiditePasseport` (`:119-120`), situation familiale, noms/prénoms des parents et nombre d'enfants (`:85-87,108-116`), contacts d'urgence `personnesAPrevenir` (`:123-130`), affectations militaires (`arme`, `numeroUnite`, `:96-104`), photo (`:133`), ainsi que les sanctions disciplinaires (`RHSanction`) et congés maladie (`Attendance.motif = 'conge_maladie'`, `Attendance.js:34`).
   *Note :* aucune donnée salariale/paie n'est présente dans l'application (`FAIT`, grep 0 résultat sur `salaire|salary|paie|bulletin`).
2. **Photos d'identité accessibles sans authentification (`FAIT` — `P0`) :**
   `server.ts:175-176` expose `/uploads/usersphoto` et `/uploads/personnelphoto` via `express.static` **avant** le middleware `protect` appliqué à `/uploads` (`server.ts:179`). Tout utilisateur non authentifié connaissant ou devinant un nom de fichier peut télécharger une photo de personnel.
3. **Exposition intégrale des fiches personnelles via `GET /api/hr/personnel` (`FAIT` — `P0`) :**
   `backend/routes/personnelRoutes.js:55` n'applique pas `checkRHAccess` (contrairement à `GET /api/hr/personnel/:id` à la ligne `:59`). Dans `personnelController.js:220-231`, un utilisateur `AdminTuningDesk` ne subit pas le filtre `req.user.activeDepartment` et reçoit les fiches complètes de tous les départements (CIN, groupe sanguin, passeport, famille, contacts d'urgence). Un `AdminDepartment` non-RH reçoit également toutes les données sensibles de son département au lieu d'un annuaire restreint.
4. **Fuite inter-départements sur `PersonnelDocument` (`FAIT` — `P0`) :**
   `backend/routes/personnelDocumentRoutes.js:20,28` autorise `'Director', 'Admin', 'AdminDepartment', 'AdminTuningDesk'` sur les routes `GET` sans `checkRHAccess`. `listerDocumentsDuPersonnel` (`personnelDocumentController.js:172-244`) renvoie les métadonnées des courriers entrants/sortants associés à un agent sans vérifier que le demandeur appartient au département du document ou au RH ; inversement, `listerPersonnelDuDocument` (`:249-290`) renvoie `cin`, `emailPersonnel`, `telephone`, `statut` (`:268`) à tout `AdminDepartment` ou `AdminTuningDesk`.
5. **Référentiels RH modifiables par n'importe quel `AdminDepartment` (`FAIT` — `P0`) :**
   `backend/routes/rhReferenceRoutes.js:15-51` protège `POST/PUT/DELETE` sur `/ecoles` et `/types-formation` par `authorize('Admin', 'AdminDepartment')` sans `checkRHAccess`.
6. **Journalisation `AuditLog` défectueuse et absente (`FAIT` — `P0`) :**
   - `attendanceController.js:290-301` et `:833-845` appellent `logAuditAction` avec les actions `'attendance_batch_save'` et `'presence_settings_balance_change'` et les entités `'Attendance'` et `'PresenceSettings'`. Aucune de ces valeurs n'existe dans les énumérations `action` et `entityType` de `backend/models/AuditLog.js:8-32` ; l'insertion Mongoose échoue donc silencieusement dans le `catch` de `backend/utils/auditLogger.js:48-50` (`console.error` uniquement).
   - Aucune écriture `logAuditAction` n'existe sur `Personnel` (création, lecture de fiche sensible, modification, export/impression carte d'instruction), `RHStage`, `rhPersonnelHistory`, `AttendanceDeclaration`, ni `PersonnelDocument`.
7. **Écart entre protections frontend et backend (`FAIT`) :**
   - `PersonnelDetailPage.tsx:311` affiche le bouton « Modifier » pour `Director` (`user?.role === 'Admin' || user?.role === 'Director'`), alors que `PUT /api/hr/personnel/:id` (`personnelRoutes.js:60`) interdit `Director` et renvoie `403`.
   - `OrganizationChartPage.tsx:41` autorise tout utilisateur authentifié à cliquer vers `/dashboard/hr/personnel/:id`, alors que `App.tsx:239-248` restreint `/dashboard/hr/*` à `Admin`/`AdminDepartment`/`Director` et que l'API exige `checkRHAccess`.
   - À l'inverse, `AttendanceDeclarationDialog.tsx:235` bloque côté UI les dates passées (`min={todayStr}`), alors que `declareAttendance` (`attendanceDeclarationController.js:115`) ne valide pas cette règle côté serveur.
8. **Politique de conservation et suppression (`FAIT` / `DÉCISION DU PROPRIÉTAIRE`) :**
   Le mécanisme repose sur le soft delete (`isDeleted: true`) et la purge manuelle en corbeille (`trashController.js`), sans durée de rétention ni purge automatique configurée (`DÉCISION DU PROPRIÉTAIRE` requise sur les durées légales).

### b) Intégrité des données

1. **`Attendance.motif` restreint à 14 codes face aux `LeaveReason` personnalisés (`FAIT` — `P0`) :**
   `backend/models/Attendance.js:27-46` et `VALID_ATTENDANCE_MOTIFS` (`attendanceDeclarationController.js:10-25`) limitent `motif` à 14 valeurs figées. Conséquences mesurées :
   - Lorsqu'un administrateur crée un motif personnalisé via `LeaveReasonsManagementPage.tsx`, `saveBatchAttendance` (`attendanceController.js:269`) échoue sur l'enum Mongoose `Attendance.motif` si ce code est sélectionné.
   - `approveDeclaration` (`attendanceDeclarationController.js:329-339`) contourne l'erreur en enregistrant `motif: null` tout en conservant `impacteSolde: true` (`:315`), mais `getPersonnelBalance` (`attendanceController.js:446`) filtre par `motif: { $in: codesDeductibles }`. **Les congés approuvés sur un motif personnalisé ne sont donc pas déduits du solde.**
   - `monthlyReportController.js:58` affiche `'غ'` (absence injustifiée) pour tout code inconnu ou `null`.
2. **Date par ligne ignorée lors du pointage groupé (`FAIT` — `P0`) :**
   `saveBatchAttendance` (`attendanceController.js:176-199`) valide `entry.date` pour chaque entrée, mais l'écriture `findOneAndUpdate` (`:260-264`) force `date: targetDate` (l'en-tête `req.body.date`), écrasant silencieusement les dates individuelles.
3. **Incompatibilité des clés `detailsMotif` entre frontend et schéma (`FAIT` — `P0`) :**
   `Attendance.js:57-76` définit `serviceNom`, `missionLieu`, `missionObjet`, `formationIntitule`, `formationOrganisme`, `formationDuree`. Or `attendanceService.ts:3-12` et `AttendancePage.tsx:261-272` envoient `nomService`, `lieuMission`, `objetMission`, `intituleFormation`, `organismeFormation`, `dureeFormation`. `saveBatchAttendance` (`attendanceController.js:269-271`) passant directement `entry.detailsMotif` à Mongoose (`strict: true`), ces détails sont **silencieusement supprimés à l'enregistrement** (à la différence de `approveDeclaration` aux lignes `:362-388` qui effectue une table de traduction).
4. **Fiches `Personnel` supprimées (`isDeleted: true`) acceptées dans les requêtes RH (`FAIT` — `P0`) :**
   Les contrôleurs suivants omettent `isDeleted: { $ne: true }` sur `Personnel` (ou `User` / documents associés) :
   - `attendanceController.js:101,106,208,321,389,512,517,597,602,693,698` (alors que `monthlyReportController.js:111` l'applique bien) ;
   - `personnelController.js:599,607` (`getMyProfile`), `:637,643` (`getMyDocuments`), `:741` (`linkUserToPersonnel` sur `User.findById`) ;
   - `rhPersonnelHistoryController.js:55,230,408,589,780,787` ;
   - `attendanceDeclarationController.js:102,105,169` ;
   - `personnelDocumentController.js:36,61,183` (et `:96` sur `IncomingDocument`/`OutgoingDocument`).
5. **Suppression définitive sans cascade (`FAIT` — `P0`) :**
   `trashController.js:82,601-610,733-741` détruit le document `Personnel` (et `item.photo`), laissant des enregistrements orphelins dans `RHStage`, `RHPromotion`, `RHPoste`, `RHDiplome`, `RHSanction`, `Attendance`, `AttendanceDeclaration` et `PersonnelDocument`.
6. **Modèle `RHSessionFormation` inexistant (`FAIT` — `P1`) :**
   `RHStage.js:14` référence `ref: 'RHSessionFormation'` et `rhStageController.js:386` l'utilise en population/condition, mais aucun fichier `RHSessionFormation.js` n'existe dans `backend/models/`.
7. **Doublons et index CIN (`FAIT`) :**
   L'index partiel `{ cin: 1 }` (`Personnel.js:160-163`) protège contre les doublons de CIN sur fiches actives (`[À TESTER EN LOCAL]` sur la base existante), mais aucune règle d'unicité ou d'alerte n'empêche la création de doublons sans CIN (d'où la déduplication manuelle par `nom_prenom` dans `organizationChartController.js:20-28`).
8. **Champs `populate` invalides dans les déclarations (`FAIT` — `P1`) :**
   `attendanceDeclarationController.js:197,253-254` appelle `.populate('personnelId', 'nom prenom cin photo department matricule')` (or `matricule` n'existe pas sur `Personnel.js`) et `.populate('leaveReasonId', 'nom code categorie impacteSolde')` (or `LeaveReason.js:11-24` utilise `labelAr`, `labelFr`, `category`).

### c) Manques et défauts fonctionnels

1. **Calcul des congés ignorant week-ends et jours fériés (`FAIT` — `P1`) :**
   `grep -rn "PresenceSettings" backend src` montre que `joursWeekend` et `joursFeries` (`PresenceSettings.js`) ne sont que stockés et retournés dans `monthlyReportController.js:256-264`. `getPersonnelBalance` (`attendanceController.js:415-452`) compte tous les enregistrements `Attendance` sans exclure les week-ends ou jours fériés, et aucun contrôle n'empêche le pointage sur ces jours.
2. **Filtres et KPI cassés par erreur de casse et de contrat API dans `AllPersonnelSituationPage.tsx` (`FAIT` — `P1`) :**
   - `AllPersonnelSituationPage.tsx:189-198,300-310,338-341,371-372,399-400` compare `att.motif` aux chaînes majuscules `'FORMATION'`, `'MISSION'`, `'SERVICE'`, alors que le backend stocke `'formation'`, `'mission'`, `'service'` (`Attendance.js:37-39`). Les filtres et compteurs correspondants restent à zéro.
   - `AllPersonnelSituationPage.tsx:73-74` appelle `getLeaveReasons({ actif: true })` (paramètre ignoré par `leaveReasonController.js:10` qui attend `isActive`) puis lit `res.data`, alors que `leaveReasonService.ts:67` retourne déjà `response.data.data` (un tableau) : la liste `leaveReasons` reste donc vide (`[]`).
   - `attendanceService.ts:73-82` type `PersonnelBalanceResponse` avec `{ annee, soldeAnnuel, joursUtilises, soldeRestant }`, alors que `attendanceController.js:469-476` renvoie `{ personnelId, year, totalDays, usedDays, remainingDays, byMotif }`.
3. **Déclarations de présence limitées (`FAIT`) :**
   - Mono-jour uniquement (`AttendanceDeclaration.js:21`, `AttendanceDeclarationDialog.tsx:228-238` : pas de plage `dateDebut`/`dateFin` ni de demi-journée).
   - Un seul niveau de validation (`pending` → `approved`/`rejected`), sans délégation ni circuit hiérarchique configurable.
   - Le champ `LeaveReason.requiresDocument` (`LeaveReason.js:34`) n'est relié à aucun upload de justificatif dans `AttendanceDeclarationDialog.tsx` ni `AttendancePage.tsx`.
   - Aucune notification temps réel ou applicative sur les sous-modules RH (`FAIT` : grep `Notification|socket|emit` sur les routes/contrôleurs RH = 0 résultat).
4. **Absence de pagination sur rapports et déclarations (`FAIT`) :**
   `getMonthlyReport`, `getYearlyReport` (`attendanceController.js:570-768`), `monthlyReportController.js` et `getAllDeclarations` (`attendanceDeclarationController.js:218-271`) chargent toutes les lignes sans pagination (`page`/`limit`).
5. **Suivi de carrière déconnecté de la fiche `Personnel` (`FAIT`) :**
   `rhPersonnelHistoryController.js:79-90` crée une `RHPromotion` sans mettre à jour `Personnel` (qui ne possède d'ailleurs pas de champ `grade` dans `Personnel.js`), et aucune piste d'audit champ par champ (avant/après) n'existe sur les modifications de `Personnel`.
6. **Absence d'import/export de masse RH (`FAIT`) :**
   Aucun import CSV/Excel d'agents ni export global des soldes de congés ou historiques n'existe (hors fiche individuelle et impression mensuelle).

### d) Organigramme

1. **Plafond codé en dur à 10 agents par département (`FAIT` — `P1`) :**
   `organizationChartController.js:113` tronque les membres via `.slice(0, 10)`, et `DepartmentNode.tsx:139-143` affiche une mention statique non cliquable `+ N موظفين آخرين`.
2. **Hiérarchie aplatie à 2 niveaux (`FAIT`) :**
   `organizationChartController.js` regroupe selon `type` (`bureau_ordre`/`rh` vs `service`) sans exploiter d'arborescence multi-niveaux de sous-départements.
3. **Lien vers une fiche protégée provoquant 403 / redirection (`FAIT` — `P1`) :**
   `OrganizationChartPage.tsx:41` navigue au clic sur un agent vers `/dashboard/hr/personnel/:id`, inaccessible pour un utilisateur standard (`App.tsx:239-248` et `checkRHAccess` sur l'API).
4. **Mode lecture seule sans export (`FAIT`) :**
   Aucune réorganisation (glisser-déposer), ni recherche avancée sur l'arbre, ni export image/PDF structuré de l'organigramme.

### e) Interface utilisateur (UI/UX) et alignement modèle

1. **Champs inexistants ou omis dans `PersonnelDetailPage.tsx` (`FAIT` — `P1`) :**
   `PersonnelDetailPage.tsx` lit des champs absents de `Personnel.js` : `status` (`:259,475` au lieu de `statut`), `matricule` (`:263,421`), `sexe === 'M'/'F'` (`:356` au lieu de `'Homme'/'Femme'` dans `Personnel.js:25`), `email` (`:405` au lieu de `emailPersonnel`), `grade` (`:426`), `categorie` (`:436`), `echelon` (`:441`), `dateRecrutement` (`:454` au lieu de `dateEmbauche`), `dateTitularisation` (`:461`), `dateFinService` (`:468`), et omet les sections Groupe A/D/E (`groupeSanguin`, parents, passeport, `personnesAPrevenir`).
2. **Export PDF `carteInstructionService.ts` désaligné (`FAIT` — `P1`) :**
   `src/services/carteInstructionService.ts` lit `p.armee`/`p.army` (au lieu de `arme` dans `Personnel.js:104`), `p.unite`/`p.unit` (au lieu de `numeroUnite` `:96`), `p.matricule` et `p.grade` (absents), produisant des valeurs `'—'` sur la carte générée.
3. **Incohérences d'affichage entre pages (`FAIT`) :**
   `MyProfilePage.tsx:182` affiche `{nom} {prenom}` alors que `PersonnelDetailPage.tsx:257` affiche `{prenom} {nom}` ; `PersonnelDetailPage.tsx:259` passe `status` au composant `PersonnelStatusBadge` au lieu de `statut` (`MyProfilePage.tsx:184`).
4. **Validation de saisie insuffisante (`FAIT`) :**
   `PersonnelForm.tsx:352-362` ne vérifie que la présence non vide de `nom` et `prenom` (aucun contrôle de format CIN, email, téléphone, ni cohérence entre date de naissance, embauche et validité passeport).
5. **Multilinguisme partiel et mélange FR/AR (`FAIT`) :**
   Plusieurs écrans RH contiennent des libellés arabes codés en dur même en interface française, et `AttendancePage.tsx:444` affiche un bouton français `'Imprimer la fiche mensuelle'` au sein d'une interface arabe.

### f) Exploitation, sauvegarde et résilience

1. **Sauvegarde ZIP incomplète pour les données et photos RH (`FAIT` — `P0`) :**
   `backend/controllers/backup.js:171-326` (`runBackupArchive`) exporte en JSON et archive les PDF des seuls `IncomingDocument` et `OutgoingDocument` (`:246-284`). Les collections RH (`Personnel`, `Attendance`, `RHStage`, etc.) dépendent uniquement du binaire externe `mongodump` (si absent, `backupScheduler.js:19-21` journalise un avertissement et retourne `success: false` ; `[À TESTER EN LOCAL]` selon l'hôte). De plus, **`/uploads/personnelphoto` et `/uploads/usersphoto` ne sont jamais ajoutés à l'archive**, alors que `restoreBackup` (`backup.js:828-831`) tente de copier `tempRestoreDir/uploads` vers `backend/uploads`.
2. **Migration d'index à valider sur la base locale (`FAIT` / `[À TESTER EN LOCAL]`) :**
   `backend/scripts/migrate-indexes.js:166-176` définit la migration de l'index partiel `{ cin: 1 }`, mais son application effective sur la base locale MongoDB n'est pas exécutable depuis cette copie statique.
   Commande exacte `[À TESTER EN LOCAL]` :
   `node backend/scripts/migrate-indexes.js --dry-run` puis `node backend/scripts/migrate-indexes.js`
3. **Scalabilité des rapports et listes (`FAIT`) :**
   L'absence de pagination sur `getAllDeclarations`, `getMonthlyReport`, `getYearlyReport` et `monthlyReportController` expose le serveur à des temps de réponse élevés lorsque l'effectif ou l'historique annuel augmente.

---

## 3. Tableau de priorisation

*Règle : toute fuite de données personnelles et toute corruption/perte silencieuse de données sont classées `P0`.*

| ID | Lacune | Fichier:ligne | Impact principal | Effort | Priorité |
|---|---|---|---|---|---|
| **RH-01** | Photos `/uploads/personnelphoto` et `/uploads/usersphoto` publiques sans auth | `server.ts:175-179` | Confidentialité | **S** | **P0** |
| **RH-02** | `GET /api/hr/personnel` sans `checkRHAccess` + `AdminTuningDesk` lit toutes les PII | `personnelRoutes.js:55`, `personnelController.js:220-267` | Confidentialité | **S** | **P0** |
| **RH-03** | `GET PersonnelDocument` expose courriers & PII entre départements | `personnelDocumentRoutes.js:20,28`, `personnelDocumentController.js:172-290` | Confidentialité | **M** | **P0** |
| **RH-04** | Référentiels `RHEcole`/`RHTypeFormation` modifiables hors RH | `rhReferenceRoutes.js:15-51` | Confidentialité / Intégrité | **S** | **P0** |
| **RH-05** | `AuditLog` silencieux (enums invalides) sur présences et absent sur tout le module RH | `AuditLog.js:8-32`, `attendanceController.js:290-301,833-845` | Confidentialité / Traçabilité | **M** | **P0** |
| **RH-06** | `Attendance.motif` figé à 14 codes : casse le pointage et annule le décompte solde des motifs personnalisés (`motif: null`) | `Attendance.js:27-46`, `attendanceDeclarationController.js:329-339`, `attendanceController.js:446` | Données (corruptions soldes) | **M** | **P0** |
| **RH-07** | `entry.date` ignoré dans `saveBatchAttendance` (force `req.body.date`) | `attendanceController.js:176-199,260-264` | Données | **S** | **P0** |
| **RH-08** | Clés `detailsMotif` frontend (`nomService`…) supprimées silencieusement par Mongoose (`serviceNom`…) | `AttendancePage.tsx:261-272`, `attendanceService.ts:3-12`, `Attendance.js:57-76` | Données | **S** | **P0** |
| **RH-09** | Fiches `Personnel` (`isDeleted: true`) non filtrées dans présences, carrière, déclarations, profil, documents | `attendanceController.js:101+`, `personnelController.js:599+`, `rhPersonnelHistoryController.js:55+` | Données | **M** | **P0** |
| **RH-10** | Suppression définitive `Personnel` sans cascade (orphelins carrière/présences/docs) | `trashController.js:601-610,733-741` | Données | **M** | **P0** |
| **RH-11** | Backup ZIP ignore `/uploads/personnelphoto` et dépend du seul `mongodump` pour le RH | `backup.js:171-326,828-831`, `backupScheduler.js:19-21` | Données / Exploitation | **M** | **P0** |
| **RH-12** | `AllPersonnelSituationPage` : comparaison majuscule `FORMATION`/`MISSION`/`SERVICE` + `actif` + `res.data` | `AllPersonnelSituationPage.tsx:73-74,189-198,300-400` | Blocage métier | **S** | **P1** |
| **RH-13** | `populate('leaveReasonId')` et `'matricule'` pointant vers des champs inexistants | `attendanceDeclarationController.js:197,253-254` | Blocage métier | **S** | **P1** |
| **RH-14** | `PersonnelDetailPage.tsx` & `carteInstructionService.ts` désalignés avec `Personnel.js` | `PersonnelDetailPage.tsx:259-475`, `carteInstructionService.ts` | Blocage métier | **M** | **P1** |
| **RH-15** | Week-ends et jours fériés (`PresenceSettings`) non exclus du calcul des soldes de congés | `attendanceController.js:415-452`, `monthlyReportController.js:256-264` | Blocage métier / Données | **M** | **P1** |
| **RH-16** | Contrat `PersonnelBalanceResponse` (`annee`/`soldeRestant` vs `year`/`remainingDays`) | `attendanceService.ts:73-82`, `attendanceController.js:469-476` | Blocage métier | **S** | **P1** |
| **RH-17** | Modèle `RHSessionFormation` référencé mais absent du codebase | `RHStage.js:14`, `rhStageController.js:386` | Blocage métier | **S** | **P1** |
| **RH-18** | Organigramme tronqué à 10 agents + lien vers fiche protégée (403) | `organizationChartController.js:113`, `OrganizationChartPage.tsx:41` | Gêne / Blocage métier | **M** | **P1** |
| **RH-19** | Bouton « Modifier » affiché à `Director` (`403` backend) + `min={todayStr}` uniquement UI | `PersonnelDetailPage.tsx:311`, `AttendanceDeclarationDialog.tsx:235` | Gêne | **S** | **P2** |
| **RH-20** | Rapports mensuel/annuel et déclarations non paginés | `attendanceController.js:570-768`, `attendanceDeclarationController.js:218-271` | Exploitation | **M** | **P2** |
| **RH-21** | Validation minimale `PersonnelForm` (CIN, email, téléphone, dates) & i18n mixte FR/AR | `PersonnelForm.tsx:352-362`, `AttendancePage.tsx:444` | Gêne | **M** | **P2** |
| **RH-22** | Déclarations mono-jour sans upload justificatif (`requiresDocument`), zéro notification RH | `AttendanceDeclaration.js:21`, `AttendanceDeclarationDialog.tsx:228-238`, `LeaveReason.js:34` | Gêne / Fonctionnel | **L** | **P2** |
| **RH-23** | Déduplication agents sans CIN, arborescence multi-niveaux & export organigramme, import/export masse | `organizationChartController.js:20-28`, `Personnel.js` | Amélioration | **L** | **P3** |

---

## 4. RECOMMANDATIONS D'AMÉLIORATION

### 4.1 Corrections concrètes (P0 à P2, sans modification de code dans cet audit)

| Lacunes | Correction concrète recommandée | Critère de réussite mesurable | Lot cible |
|---|---|---|---|
| **RH-01, RH-02, RH-03, RH-04** | Déplacer le montage statique `/uploads/personnelphoto` et `/uploads/usersphoto` sous `protect` (et contrôle d'accès par dossier/propriétaire) ; créer une projection annuaire minimale (id, nom, prénom, département, poste) pour `GET /personnel` hors RH et réserver les PII complètes à `checkRHAccess` ; restreindre `GET PersonnelDocument` au département de l'agent/document ou au RH ; ajouter `checkRHAccess` sur l'écriture des référentiels RH. | `curl -I /uploads/personnelphoto/<fichier>` sans session retourne `401` ; un `AdminTuningDesk` ne reçoit aucun `cin`, `groupeSanguin` ni `numeroPasseport` sur `GET /api/hr/personnel` ; un `AdminDepartment` non-RH reçoit `403` sur les documents ou référentiels d'un autre service. | **Lot A** |
| **RH-05** | Étendre les énumérations `action` et `entityType` de `AuditLog.js` aux entités et opérations RH (`Personnel`, `Attendance`, `PresenceSettings`, `AttendanceDeclaration`, `RHStage`, `PersonnelDocument`, consultation/export PDF) et appeler `logAuditAction` dans chaque contrôleur RH de lecture sensible et d'écriture. | 100 % des créations, modifications, consultations de fiches sensibles, exports PDF, validations de déclarations et changements de paramètres créent un document valide dans `AuditLog` sans erreur Mongoose en console. | **Lot A** |
| **RH-06, RH-07, RH-08** | Supprimer la contrainte d'enum figée à 14 valeurs sur `Attendance.motif` au profit de la validation dynamique contre les codes actifs de `LeaveReason` (avec conservation des codes système) ; appliquer `entry.date` lors de l'enregistrement en lot ; unifier les noms de clés `detailsMotif` entre `Attendance.js`, `attendanceService.ts`, `AttendancePage.tsx` et `approveDeclaration` ; migrer les déclarations/présences historiques ayant `motif: null`. | Création d'un motif personnalisé avec `impacteSolde: true` → pointage direct et approbation d'une déclaration enregistrent le code réel, décomptent le solde annuel et affichent le libellé dans le rapport mensuel ; les champs `serviceNom`/`missionLieu`/`formationIntitule` sont persistés. | **Lot B** |
| **RH-09, RH-10** | Injecter systématiquement `isDeleted: { $ne: true }` dans toutes les requêtes `Personnel`, `User` et documents des contrôleurs RH ; implémenter dans `trashController` une suppression en cascade transactionnelle (ou ordonnée avec journal d'audit) des collections RH liées lors d'un `hard delete` (ou interdire la purge physique si l'historique doit être archivé selon la décision du propriétaire). | Aucun pointage, carrière ou document ne peut être créé sur un agent archivé ; après purge définitive d'un agent test, `countDocuments({ personnelId })` retourne `0` sur toutes les collections RH liées. | **Lot B** |
| **RH-11** | Compléter `runBackupArchive` dans `backup.js` pour inclure l'export JSON structuré des collections RH (en complément de `mongodump`) ainsi que la copie intégrale de `backend/uploads/personnelphoto` et `backend/uploads/usersphoto`, alignée avec le chemin lu par `restoreBackup`. | Une sauvegarde générée sans `mongodump` contient bien les JSON RH et 100 % des photos ; une restauration sur base vide restitue fiches, soldes, carrière et photos sans image cassée. | **Lot C** |
| **RH-12, RH-13, RH-16, RH-17** | Corriger la casse des motifs (`formation`, `mission`, `service`), le paramètre `isActive` et le typage de retour dans `AllPersonnelSituationPage.tsx` et `attendanceService.ts` ; corriger les `.populate()` dans `attendanceDeclarationController.js` (`labelAr labelFr category`) ; créer le modèle `RHSessionFormation` ou retirer les références mortes dans `RHStage`. | 0 erreur console/TS sur les écrans Présences, Déclarations et Stages ; les KPI Formation/Mission/Service affichent les totaux réels de la base. | **Lot D** |
| **RH-14, RH-15, RH-19, RH-21** | Aligner tous les champs de `PersonnelDetailPage.tsx` et `carteInstructionService.ts` sur `Personnel.js` (ajouter `grade`/`matricule` au schéma si décidé par le propriétaire) ; soustraire `PresenceSettings.joursWeekend` et `joursFeries` dans `getPersonnelBalance` ; masquer le bouton Modifier à `Director` ; ajouter la validation CIN/email/téléphone/dates et unifier les clés i18n FR/AR. | Tous les champs saisis dans `PersonnelForm` s'affichent sans `'—'` dans la fiche et la carte PDF ; un congé posé à cheval sur un week-end ou jour férié ne décompte que les jours ouvrés. | **Lot D / Lot E** |
| **RH-18, RH-20, RH-22** | Supprimer ou paginer la limite `.slice(0, 10)` de l'organigramme via un tiroir/modale de liste complète et adapter le clic selon les droits de l'utilisateur ; paginer `getAllDeclarations`, `getMonthlyReport` et `getYearlyReport` ; ajouter l'upload de justificatif quand `requiresDocument` est vrai et les notifications internes de demande/validation. | Tous les agents d'un département >10 membres sont consultables dans l'organigramme ; aucun `403` involontaire au clic ; rapports paginés < 500 ms sur 500 agents ; pièce jointe requise bloquante quand activée. | **Lot E** |

### 4.2 Fonctionnalités RH manquantes à envisager (`DÉCISION DU PROPRIÉTAIRE`)

| Fonctionnalité envisageable | Valeur métier | Effort | Décision requise |
|---|---|---|---|
| **Congés multi-jours, demi-journées et soldes reportables N-1** | Évite de saisir 15 déclarations individuelles pour un congé annuel et automatise le report/reliquat annuel. | **M** | `DÉCISION DU PROPRIÉTAIRE` |
| **Circuit de validation hiérarchique à 2 niveaux (Chef de département → RH/Direction)** | Responsabilise les chefs de service avant validation définitive par les RH. | **M** | `DÉCISION DU PROPRIÉTAIRE` |
| **Notifications temps réel / centre d'alertes RH** (nouvelle déclaration, fin de passeport/stage, décision congé) | Réduit les délais de traitement et prévient les expirations de documents. | **M** | `DÉCISION DU PROPRIÉTAIRE` |
| **Import/Export Excel/CSV massif + tableau de bord RH agrégé** (absentéisme, pyramide, formations) | Facilite l'initialisation des effectifs et le pilotage Direction. | **M** | `DÉCISION DU PROPRIÉTAIRE` |
| **Dossier médical/habilitations ou gestion de paie/indemnités** | Couverture SIRH complète (actuellement **ABSENT**). | **L** | `DÉCISION DU PROPRIÉTAIRE` |

---

## 5. Plan en lots, chemin critique et scénarios de recette

### 5.1 Plan d'exécution en lots (maximum 6 tâches par lot)

- **Lot A — Sécurité & Confidentialité RH (P0) — 5 tâches :**
  1. Protéger `/uploads/personnelphoto` et `/uploads/usersphoto` par session et autorisation (`server.ts:175-179`).
  2. Restreindre `GET /api/hr/personnel` (projection annuaire hors RH, PII complètes sous `checkRHAccess`).
  3. Cloisonner `GET` de `personnelDocumentRoutes` / `personnelDocumentController` par département/RH.
  4. Ajouter `checkRHAccess` sur l'écriture de `rhReferenceRoutes`.
  5. Corriger les énumérations `AuditLog.js` et instrumenter `logAuditAction` sur toutes les actions sensibles RH.

- **Lot B — Intégrité des données RH & Présences (P0) — 6 tâches :**
  1. Remplacer l'enum figé `Attendance.motif` par la validation dynamique sur `LeaveReason` + script de reprise des `motif: null`.
  2. Corriger `saveBatchAttendance` pour respecter `entry.date`.
  3. Aligner les clés `detailsMotif` entre backend (`Attendance.js`) et frontend (`AttendancePage.tsx`, `attendanceService.ts`).
  4. Ajouter `isDeleted: { $ne: true }` dans tous les contrôleurs RH et liens `User`↔`Personnel`.
  5. Implémenter la cascade / garde-fou de suppression définitive dans `trashController.js`.
  6. Exécuter et valider en local la migration d'index `backend/scripts/migrate-indexes.js` `[À TESTER EN LOCAL]`.

- **Lot C — Résilience Sauvegarde / Restauration RH (P0) — 3 tâches :**
  1. Ajouter l'export JSON des collections RH dans `backup.js:runBackupArchive`.
  2. Inclure `/uploads/personnelphoto` et `/uploads/usersphoto` dans l'archive ZIP de sauvegarde.
  3. Valider la procédure complète sauvegarde → restauration sur base vierge `[À TESTER EN LOCAL]`.

- **Lot D — Contrats API, Modèles & Affichages cassés (P1) — 6 tâches :**
  1. Corriger `AllPersonnelSituationPage.tsx` (casse `formation`/`mission`/`service`, filtre `isActive`, lecture directe du tableau `getLeaveReasons`).
  2. Corriger les `.populate()` de `attendanceDeclarationController.js` et le contrat `PersonnelBalanceResponse` dans `attendanceService.ts`.
  3. Créer `RHSessionFormation.js` ou assainir `RHStage.js` / `rhStageController.js`.
  4. Aligner `PersonnelDetailPage.tsx` et `carteInstructionService.ts` sur le schéma exact `Personnel.js` (et afficher Groupes A/D/E).
  5. Exclure `joursWeekend` et `joursFeries` (`PresenceSettings`) du calcul `getPersonnelBalance`.
  6. Masquer le bouton Modifier pour `Director` dans `PersonnelDetailPage.tsx` (`:311`).

- **Lot E — Organigramme, Pagination, Ergonomie & Workflows (P1–P2) — 5 tâches :**
  1. Lever la limite `.slice(0, 10)` de l'organigramme (modale/tiroir de département) et adapter l'action au clic selon le rôle.
  2. Paginer `getAllDeclarations`, `getMonthlyReport` et `getYearlyReport`.
  3. Ajouter l'upload de pièce justificative lorsque `LeaveReason.requiresDocument` est actif.
  4. Ajouter la validation de format (`PersonnelForm.tsx`) et harmoniser i18n FR/AR (`AttendancePage.tsx:444`, etc.).
  5. Étendre les déclarations (plages multi-jours) et notifications selon les réponses du propriétaire.

### 5.2 Chemin critique

`Lot A (Confidentialité & Audit)` → `Lot B (Intégrité Motifs/Dates/isDeleted/Index)` → `Lot C (Backup/Restore complet)` → `Lot D (Contrats UI/PDF/Congés)` → `Lot E (Organigramme & Pagination)`.
*Justification :* les lots A, B et C éliminent les expositions de données personnelles, la perte de données de pointage/solde et le risque de perte définitive à la restauration avant de corriger les écrans et d'étendre les usages en Lots D et E.

### 5.3 Huit (8) scénarios de recette RH (`[À TESTER EN LOCAL]` sur serveur démarré)

*Commande préalable de démarrage local `[À TESTER EN LOCAL]` : `npm run dev` (puis requêtes via navigateur ou `curl` avec jeton Bearer d'un compte de test dédié — ne jamais utiliser d'identifiants codés en dur).*

1. **Test 1 — Protection des photos (Anonyme / Sans session) :**
   - *Préconditions :* Une photo existante `agent-test.jpg` dans `backend/uploads/personnelphoto/`.
   - *Étapes :* Exécuter `curl -i http://localhost:3000/uploads/personnelphoto/agent-test.jpg` sans cookie/token.
   - *Résultat attendu (après Lot A) :* HTTP `401 Unauthorized` (actuellement `200 OK` = échec `OUVERT`).
2. **Test 2 — Isolation de la liste du personnel (`AdminTuningDesk` et `AdminDepartment` non-RH) :**
   - *Préconditions :* Comptes de test `bo_test` (`AdminTuningDesk`) et `dept_test` (`AdminDepartment` hors RH), et une fiche `Personnel` avec `cin`, `groupeSanguin`, `numeroPasseport`.
   - *Étapes :* Appeler `GET /api/hr/personnel` puis `GET /api/hr/personnel/:id` avec chacun des jetons.
   - *Résultat attendu (après Lot A) :* Aucun champ PII sensible (`cin`, `groupeSanguin`, `numeroPasseport`) exposé hors RH ; `403` sur la fiche détaillée hors RH.
3. **Test 3 — Cloisonnement des documents liés (`AdminDepartment` hors RH) :**
   - *Préconditions :* Un document du département A associé à un agent du département A ; utilisateur de test du département B.
   - *Étapes :* Appeler `GET /api/hr/personnel/:personnelId/documents` et `GET /api/hr/documents/incoming/:docId/personnel` avec le jeton B.
   - *Résultat attendu (après Lot A) :* HTTP `403 Forbidden`.
4. **Test 4 — Motif de congé personnalisé et décompte de solde (`AdminDepartment` RH) :**
   - *Préconditions :* Création d'un motif `LeaveReason` personnalisé `CONGE_SPEC` avec `impacteSolde: true`, `User` standard lié à un agent ayant 30 jours de solde annuel.
   - *Étapes :* L'agent soumet une déclaration sur `CONGE_SPEC` ; le RH l'approuve ; consulter `GET /api/hr/attendance/personnel/:id/balance`.
   - *Résultat attendu (après Lot B) :* `Attendance.motif === 'CONGE_SPEC'` (non `null`), `usedDays === 1`, `remainingDays === 29`.
5. **Test 5 — Pointage groupé avec `entry.date` et `detailsMotif` (`AdminDepartment` RH) :**
   - *Préconditions :* 2 agents actifs dans un service ; date d'en-tête `J`, ligne 2 sur date `J-1` avec motif `mission` (`lieuMission`, `objetMission`).
   - *Étapes :* Enregistrer via `POST /api/hr/attendance/batch` puis relire le calendrier des 2 agents.
   - *Résultat attendu (après Lots B & D) :* La ligne 2 est bien enregistrée à `J-1` avec lieu et objet conservés, et le filtre `Mission` dans `AllPersonnelSituationPage` compte `1`.
6. **Test 6 — Exclusion week-ends / jours fériés du décompte (`AdminDepartment` RH) :**
   - *Préconditions :* `PresenceSettings` configuré avec samedi/dimanche en week-end et un jour férié `F` ; agent pointé en congé annuel sur vendredi, samedi, dimanche, lundi.
   - *Étapes :* Consulter le solde de l'agent via `GET /api/hr/attendance/personnel/:id/balance`.
   - *Résultat attendu (après Lot D) :* Seuls 2 jours ouvrés (vendredi, lundi) sont déduits du solde.
7. **Test 7 — Cycle corbeille (`isDeleted: true`) et suppression définitive (`Admin` / RH) :**
   - *Préconditions :* Fiche `Personnel` archivée (`isDeleted: true`) ayant 1 promotion `RHPromotion` et 1 présence `Attendance`.
   - *Étapes :* Tenter un pointage sur cet agent, puis exécuter la suppression définitive depuis la corbeille.
   - *Résultat attendu (après Lot B) :* Pointage refusé (`404`/`400`) tant que la fiche est archivée ; après purge définitive, zéro document orphelin dans `RHPromotion` et `Attendance`.
8. **Test 8 — Sauvegarde et restauration complète du module RH (`Admin`) :**
   - *Préconditions :* Base contenant 1 fiche `Personnel` avec photo, 1 `RHStage` et 1 `Attendance`.
   - *Étapes :* Déclencher une sauvegarde ZIP (`POST /api/backup/create`), inspecter le contenu de l'archive, puis tester une restauration sur base de test isolée `[À TESTER EN LOCAL]`.
   - *Résultat attendu (après Lot C) :* L'archive contient les données RH et la photo ; après restauration, la fiche et sa photo s'affichent intégralement.

---

## 6. Questions pour le propriétaire

Les points suivants relèvent exclusivement d'une **`DÉCISION DU PROPRIÉTAIRE`** et ne peuvent pas être déduits du code :

1. **Cadre légal et protection des données personnelles :** À quelle réglementation nationale ou interne l'application est-elle soumise pour les données sensibles (`cin`, `groupeSanguin`, `numeroPasseport`, sanctions, congés maladie), et quelles mentions/habilitations formelles sont requises ?
2. **Durées de conservation et politique de purge :** Combien de temps doivent être conservés les fiches d'agents partis/retraités, les sanctions disciplinaires, les journaux de présence, les déclarations et les logs d'audit avant anonymisation ou suppression définitive ?
3. **Visibilité inter-services sur les fiches et l'organigramme :** Un chef de département hors RH ou le Bureau d'Ordre doit-il voir uniquement un annuaire minimal (nom, fonction, poste interne) sans coordonnées privées ni CIN, ou ne rien voir du tout hors affectation de courrier ?
4. **Règles de congés et présence officielles :** Quels sont les jours de week-end officiels, le calendrier des jours fériés (nationaux/religieux mobiles), le solde annuel par défaut, le report de solde d'une année sur l'autre, et la gestion des demi-journées ou congés multi-jours ?
5. **Circuit de validation des déclarations :** Un seul niveau (RH/Admin) suffit-il, ou le responsable hiérarchique direct du département doit-il pré-valider avant les RH ? Les agents doivent-ils pouvoir déclarer une régularisation rétroactive (date passée) ?
6. **Référentiel `Personnel` et cartes officielles :** Souhaitez-vous ajouter officiellement les champs `matricule`, `grade`, `categorie`, `echelon`, `dateTitularisation` et `dateFinService` au modèle `Personnel`, ou supprimer ces mentions de `PersonnelDetailPage.tsx` et de la carte d'instruction PDF ?
7. **Volumétrie et formats officiels :** Quel est l'effectif total cible (100, 1 000, 5 000+ agents) et quels formats exacts (PDF/Excel, entêtes bilingues FR/AR) sont attendus pour les fiches mensuelles et rapports annuels ?

---

## 7. Résumé en 20 lignes

1. `pwd` vérifié : `/app/applet` (`COPIE CLOUD (/app/applet)`), lecture complète des routes, contrôleurs, modèles et vues RH.
2. Les correctifs RBAC sur `checkRHAccess` (`auth.js:165-216`) et `GET` Carrière/Stages (`rhPersonnelHistoryRoutes.js`, `rhStageRoutes.js`) sont **FERMÉS**.
3. Le whitelist d'édition `updatePersonnel` (`personnelController.js:346-408`) et l'index partiel `{ cin: 1 }` (`Personnel.js:160-163`) sont **FERMÉS** côté code (`[À TESTER EN LOCAL]` en base).
4. **P0 Confidentialité :** `/uploads/personnelphoto` et `/uploads/usersphoto` sont exposés sans session avant `protect` (`server.ts:175-179`).
5. **P0 Confidentialité :** `GET /api/hr/personnel` (`personnelRoutes.js:55`) omet `checkRHAccess` et divulgue toutes les PII aux `AdminTuningDesk` et admins non-RH.
6. **P0 Confidentialité :** `GET` sur `PersonnelDocument` (`personnelDocumentRoutes.js:20,28`) divulgue courriers et CIN/téléphones entre départements.
7. **P0 Confidentialité :** `rhReferenceRoutes.js:15-51` laisse tout `AdminDepartment` modifier écoles et types de formation sans `checkRHAccess`.
8. **P0 Traçabilité :** `AuditLog.js:8-32` rejette silencieusement les logs de présence (`attendanceController.js:290-301,833-845`) et aucun autre contrôleur RH n'audite.
9. **P0 Intégrité :** L'enum figé `Attendance.motif` (14 valeurs) annule le décompte de solde des motifs personnalisés (`motif: null`, `attendanceDeclarationController.js:329-339`).
10. **P0 Intégrité :** `saveBatchAttendance` ignore `entry.date` (`attendanceController.js:260-264`) et Mongoose rejette les clés `detailsMotif` du frontend (`AttendancePage.tsx:261-272`).
11. **P0 Intégrité :** `isDeleted: { $ne: true }` manque sur de nombreuses requêtes `Personnel`/`User` et le hard delete (`trashController.js`) laisse des orphelins RH.
12. **P0 Exploitation :** `backup.js:171-326` n'archive ni les JSON RH (hors `mongodump`) ni les photos `/uploads/personnelphoto`.
13. **P1 Fonctionnel :** `AllPersonnelSituationPage.tsx:189-198` compare en majuscules (`FORMATION`/`MISSION`/`SERVICE`) et passe `actif` au lieu de `isActive`.
14. **P1 Fonctionnel :** `attendanceDeclarationController.js:197,253-254` peuple des champs inexistants et `RHSessionFormation` (`RHStage.js:14`) est absent du codebase.
15. **P1 Fonctionnel :** `PresenceSettings` (`joursWeekend`, `joursFeries`) n'est jamais déduit dans le calcul de solde (`attendanceController.js:415-452`).
16. **P1 UI/PDF :** `PersonnelDetailPage.tsx` et `carteInstructionService.ts` référencent des champs absents de `Personnel.js` (`grade`, `matricule`, `armee`, `status`).
17. **P1 Organigramme :** Troncature à 10 agents (`.slice(0, 10)`, `organizationChartController.js:113`) et liens vers fiches protégées provoquant 403/redirection.
18. **ABSENT (`FAIT`) :** Aucun module paie/salaires ni notification temps réel RH n'existe dans l'application.
19. Plan correctif structuré en 5 lots séquentiels (max 6 tâches/lot) de `Lot A` (confidentialité/audit) à `Lot E` (ergonomie/organigramme), avec 8 scénarios de recette locale.
20. Les choix légaux, durées de conservation, validations hiérarchiques et évolutions fonctionnelles relèvent d'une `DÉCISION DU PROPRIÉTAIRE`.

Aucun fichier de code modifié
COPIE CLOUD (/app/applet) : à confirmer par le propriétaire dans le dossier local
