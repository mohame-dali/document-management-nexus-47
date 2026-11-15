# Audit de la qualité linguistique de l'arabe — Frontend DMS

> **Nature du document :** Audit statique **read-only** du frontend (`src/`). Aucun fichier applicatif existant n'a été modifié ; seul ce rapport (`docs/AUDIT_ARABE.md`) a été créé.
> **Méthode :** Extraction automatique et lecture directe de `src/i18n/locales/ar.json`, comparaison croisée avec `src/i18n/locales/fr.json`, et analyse de toutes les chaînes contenant des caractères arabes (`[\u0600-\u06FF]`) dans `src/` hors `src/i18n/locales/`. Chaque constat est rattaché à une référence exacte `fichier:ligne`.

---

## 1. Inventaire complet

### 1.1 Synthèse chiffrée

| Source | Volume vérifié | Observations |
|---|---:|---|
| **`src/i18n/locales/ar.json`** | **1 261 clés** (lignes `2` à `1264`) | Réparties sur **20 espaces de noms** ; contient 2 clés entièrement en français (`ar.json:835`, `ar.json:859`) et plusieurs valeurs bilingues `Arabe (Français)` ou `Arabe (Anglais)`. |
| **Chaînes arabes codées en dur dans `src/`** *(hors `locales/`)* | **3 730 lignes UI/code actives** sur **175 fichiers** | Total brut avec commentaires : **3 854 lignes** sur **178 fichiers**. La majorité des modules RH, Présence, Paramètres, Sauvegardes, Corbeille, Départements, Assistant d'installation et Assistant IA contourne `i18next` (`t()`). |

### 1.2 Répartition de `src/i18n/locales/ar.json` par domaine

| Espace de noms (`namespace`) | Nb de clés | Plage de lignes | Aperçu du contenu |
|---|---:|---|---|
| `dashboard` | 59 | `ar.json:2-1221` | Accueil par rôle, statistiques documents/utilisateurs, journal d'audit, fonctionnalités |
| `search` | 2 | `ar.json:60-61` | Titre et sous-titre de la recherche avancée |
| `documents` | 385 | `ar.json:62-468` | Création/vue entrant et sortant, bordereau d'impression, affectation responsable/réponse, dossiers, RH lié |
| `folders` | 62 | `ar.json:160-1240` | Gestion des dossiers, badges de droits, onglets, modales, états vides/erreurs |
| `common` | 28 | `ar.json:469-1246` | Actions communes, unités (`ك.ب`, `م.ب`), pagination, erreurs génériques |
| `landing` | 26 | `ar.json:470-495` | Page d'accueil publique |
| `login` | 23 | `ar.json:496-677` | Écran de connexion et erreurs réseau (port `5000` codé en dur à `ar.json:511`) |
| `messages` | 113 | `ar.json:513-1262` | Messagerie interne, contacts, rôles, pièces jointes, statuts |
| `roles` | 5 | `ar.json:617-621` | Libellés de base des 5 rôles (`Director` à `User`) |
| `sidebar` | 39 | `ar.json:622-1242` | Menu latéral, sections et accessibilité |
| `header` | 17 | `ar.json:637-671` | En-tête principal, notifications, menu utilisateur |
| `ai` | 22 | `ar.json:726-747` | Assistant IA flottant, requêtes suggérées, infobulles |
| `users` | 196 | `ar.json:762-1225` | Liste, filtres, rôles, création/édition utilisateur, mot de passe, suppression |
| `incoming` | 104 | `ar.json:957-1060` | Liste des courriers entrants, filtres, export PDF, actions, pagination, suppression |
| `outgoing` | 106 | `ar.json:1061-1223` | Liste des courriers sortants, filtres, export PDF, transfert, suppression |
| `personnel` | 44 | `ar.json:1165-1232` | Liste du personnel RH, filtres, tableau, création rapide de compte |
| `hr` | 11 | `ar.json:1207-1217` | Étapes et navigation du formulaire RH |
| `departments` | 12 | `ar.json:1226-1253` | États vides/erreurs, pagination et `aria-label` des départements |
| `backup` | 5 | `ar.json:1254-1258` | `aria-label` des actions de sauvegarde |
| `attendance` | 2 | `ar.json:1259-1260` | `aria-label` des déclarations de présence |

### 1.3 Principaux fichiers à chaînes arabes codées en dur dans `src/`

Les 175 fichiers actifs (hors commentaires) incluent notamment les écrans suivants (nombre de lignes actives contenant de l'arabe) :
- **Paramètres, Sauvegardes, Installation & Corbeille :** `src/pages/settings/SettingsPage.tsx` (161), `src/pages/setup/SetupWizardPage.tsx` (135), `src/pages/settings/BackupSettingsPage.tsx` (121), `src/pages/settings/MessageRetentionPage.tsx` (70), `src/pages/trash/TrashPage.tsx` (56), `src/pages/settings/SecurityPrivacyPage.tsx` (56), `src/pages/guide/InstallationGuidePage.tsx` (28), `src/components/backup/RestoreBackupDialog.tsx` (10).
- **RH, Personnel, Stages & Présence :** `src/pages/hr/PersonnelDetailPage.tsx` (146), `src/pages/hr/RHStagesPage.tsx` (83), `src/pages/hr/AttendanceDeclarationsPage.tsx` (81), `src/components/hr/StageFormDialog.tsx` (75), `src/utils/attendanceExportUtils.ts` (65), `src/services/carteInstructionService.ts` (62), `src/pages/hr/AttendancePage.tsx` (62), `src/pages/hr/MyAttendanceCalendarPage.tsx` (51), `src/pages/hr/LeaveReasonsManagementPage.tsx` (49), `src/components/hr/wizard/Step1Identity.tsx` (45), `src/components/attendance/LeaveReasonFormDialog.tsx` (39), `src/hooks/useAttendanceExport.ts` (35), `src/components/attendance/MyCalendarMonthView.tsx` (34), `src/components/attendance/AllPersonnelDayView.tsx` (33), `src/components/hr/AddPersonnelDocumentDialog.tsx` (30), `src/pages/hr/MyProfilePage.tsx` (30), `src/components/attendance/AllPersonnelMonthView.tsx` (30), `src/components/hr/wizard/Step4Contacts.tsx` (28), `src/components/attendance/AttendanceDeclarationDialog.tsx` (28), `src/components/hr/wizard/Step3Admin.tsx` (26), `src/components/attendance/LeaveReasonsList.tsx` (26), `src/components/hr/PersonnelDocumentsList.tsx` (25).
- **Courrier, Options, Dossiers & Recherche :** `src/pages/documents/ViewOutgoingDocument.tsx` (93), `src/components/documents/options/DocumentOptionsList.tsx` (73), `src/components/folders/EnhancedFolderTree.tsx` (54), `src/pages/documents/DocumentOptionsPage.tsx` (39), `src/components/search/SearchResults.tsx` (36), `src/components/folders/FolderTreeView.tsx` (36), `src/components/documents/forms/EditOutgoingDocumentForm.tsx` (30), `src/components/documents/forms/EditIncomingDocumentForm.tsx` (27), `src/components/search/AdvancedSearch.tsx` (26), `src/pages/documents/ScanDocumentPage.tsx` (25), `src/components/documents/forms/IncomingDocumentForm.tsx` (24).
- **Départements, Utilisateurs, Audit, IA & Utilitaires :** `src/pages/DepartmentsPage.tsx` (55), `src/components/users/UserForm.tsx` (51), `src/utils/errorMessages.ts` (49), `src/components/ai/DocumentAIAssistant.tsx` (42), `src/pages/users/EditUser.tsx` (32), `src/components/audit/AuditFilters.tsx` (31), `src/components/audit/AuditTable.tsx` (30), `src/config/hubsConfig.ts` (29), `src/pages/templates/TemplatesPage.tsx` (24), `src/utils/arabicDateFormatter.ts` (22).

### 1.4 Inventaire intégral détaillé (`ar.json` et `src/` `fichier:ligne`)

<details>
<summary><strong>1.4.1 Inventaire intégral de <code>src/i18n/locales/ar.json</code> (1261 clés, lignes 2–1264)</strong></summary>

- `ar.json:2` `dashboard.header.welcomeAdmin` : مرحباً بك في لوحة تحكم الإدارة. لديك وصول كامل للنظام.
- `ar.json:3` `dashboard.header.welcomeBureauOrdre` : مرحباً بك في مركز رقمنة الوثائق. إدارة رقمنة الوثائق عبر جميع الأقسام.
- `ar.json:4` `dashboard.header.welcomeDepartmentHead` : مرحباً بك في لوحة تحكم {{name}}. إدارة وثائق ومستخدمي قسمك.
- `ar.json:5` `dashboard.header.welcomeUser` : مرحباً بك! يمكنك عرض الوثائق المخصصة لـ {{name}}.
- `ar.json:6` `dashboard.header.welcomeDefault` : مرحباً بك في نظام إدارة الوثائق.
- `ar.json:7` `dashboard.header.defaultDepartment` : القسم
- `ar.json:8` `dashboard.header.yourDepartment` : قسمك
- `ar.json:9` `dashboard.header.today` : اليوم
- `ar.json:10` `dashboard.stats.totalDocuments` : إجمالي الوثائق
- `ar.json:11` `dashboard.stats.forYear` : للعام {{year}}
- `ar.json:12` `dashboard.stats.incomingDocuments` : الوثائق الواردة
- `ar.json:13` `dashboard.stats.incomingDocUnit` : مستند وارد
- `ar.json:14` `dashboard.stats.outgoingDocuments` : الوثائق الصادرة
- `ar.json:15` `dashboard.stats.outgoingDocUnit` : مستند صادر
- `ar.json:16` `dashboard.stats.departments` : الأقسام
- `ar.json:17` `dashboard.stats.activeDepartmentUnit` : قسم نشط
- `ar.json:18` `dashboard.stats.activeUsers` : المستخدمون النشطون
- `ar.json:19` `dashboard.stats.activeUserUnit` : مستخدم نشط
- `ar.json:20` `dashboard.stats.folders` : المجلدات
- `ar.json:21` `dashboard.stats.organizedFolderUnit` : مجلد منظم
- `ar.json:22` `dashboard.userStats.title` : إحصائيات المستخدمين
- `ar.json:23` `dashboard.userStats.inactiveUsers` : المستخدمون غير النشطون
- `ar.json:24` `dashboard.userStats.admins` : المدراء
- `ar.json:25` `dashboard.userStats.departmentAdmins` : مدراء الأقسام
- `ar.json:26` `dashboard.userStats.tuningDeskAdmins` : مدراء المكاتب
- `ar.json:27` `dashboard.userStats.regularUsers` : المستخدمون العاديون
- `ar.json:28` `dashboard.userStats.totalActive` : إجمالي النشطين
- `ar.json:29` `dashboard.audit.title` : آخر أنشطة النظام
- `ar.json:30` `dashboard.audit.subtitle` : مراقبة العمليات الحديثة في النظام
- `ar.json:31` `dashboard.audit.viewAll` : عرض الكل
- `ar.json:32` `dashboard.audit.noRecentActivities` : لا توجد أنشطة حديثة
- `ar.json:33` `dashboard.audit.noActivitiesDescription` : لم يتم تسجيل أي أنشطة في النظام حتى الآن
- `ar.json:34` `dashboard.audit.action.documentCreate` : إنشاء مستند
- `ar.json:35` `dashboard.audit.action.documentUpdate` : تحديث مستند
- `ar.json:36` `dashboard.audit.action.documentDelete` : حذف مستند
- `ar.json:37` `dashboard.audit.action.folderCreate` : إنشاء مجلد
- `ar.json:38` `dashboard.audit.action.folderUpdate` : تحديث مجلد
- `ar.json:39` `dashboard.audit.action.folderDelete` : حذف مجلد
- `ar.json:40` `dashboard.audit.action.userCreate` : إنشاء مستخدم
- `ar.json:41` `dashboard.audit.action.userUpdate` : تحديث مستخدم
- `ar.json:42` `dashboard.audit.action.userDelete` : حذف مستخدم
- `ar.json:43` `dashboard.features.titleForRole` : الميزات المتاحة لـ {{role}}
- `ar.json:44` `dashboard.features.manageUsersAndDepts` : إدارة المستخدمين والأقسام
- `ar.json:45` `dashboard.features.accessAllDocs` : الوصول لجميع الوثائق في النظام
- `ar.json:46` `dashboard.features.advancedSearchAllDepts` : البحث المتقدم عبر جميع الأقسام
- `ar.json:47` `dashboard.features.systemSettings` : إعدادات النظام
- `ar.json:48` `dashboard.features.scanAndDigitizeDocs` : رقمنة ومسح الوثائق
- `ar.json:49` `dashboard.features.ocrExtraction` : استخراج النصوص OCR
- `ar.json:50` `dashboard.features.assignDocsToDepts` : تخصيص الوثائق للأقسام
- `ar.json:51` `dashboard.features.switchGridListView` : التبديل بين عرض الشبكة والقائمة
- `ar.json:52` `dashboard.features.manageDeptUsers` : إدارة مستخدمي القسم
- `ar.json:53` `dashboard.features.assignAndReplyDocs` : تخصيص والرد على الوثائق
- `ar.json:54` `dashboard.features.manageAndClassifyFolders` : إدارة وتصنيف المجلدات
- `ar.json:55` `dashboard.features.searchWithinDept` : البحث داخل القسم
- `ar.json:56` `dashboard.features.assignDocResponsible` : تحديد المسؤولين عن الوثائق
- `ar.json:57` `dashboard.features.viewDeptDocs` : عرض وثائق القسم
- `ar.json:58` `dashboard.features.viewDocClassification` : عرض تصنيف الوثائق
- `ar.json:59` `dashboard.features.messagingSystem` : نظام المراسلة
- `ar.json:60` `search.pageTitle` : البحث المتقدم في المراسلات
- `ar.json:61` `search.pageSubtitle` : محرك استعلام إداري متقدم للبحث في نصوص وفهارس المراسلات الواردة والصادرة والنصوص المقروءة آلياً (OCR)
- `ar.json:62` `documents.createIncoming.title` : إنشاء وثيقة واردة جديدة
- `ar.json:63` `documents.createIncoming.back` : الرجوع
- `ar.json:64` `documents.createIncoming.serialNumber` : الرقم التسلسلي
- `ar.json:65` `documents.createIncoming.serialNumberDesc` : الرقم التسلسلي الفريد للوثيقة
- `ar.json:66` `documents.createIncoming.subject` : الموضوع
- `ar.json:67` `documents.createIncoming.subjectDesc` : موضوع الوثيقة
- `ar.json:68` `documents.createIncoming.source` : المصدر
- `ar.json:69` `documents.createIncoming.sourceDesc` : مصدر الوثيقة (الشخص أو المؤسسة)
- `ar.json:70` `documents.createIncoming.arrivalDate` : تاريخ الوصول
- `ar.json:71` `documents.createIncoming.arrivalDateDesc` : تاريخ استلام الوثيقة
- `ar.json:72` `documents.createIncoming.correspondenceNumber` : رقم المراسلة
- `ar.json:73` `documents.createIncoming.correspondenceDate` : تاريخ المراسلة
- `ar.json:74` `documents.createIncoming.typeDocument` : نوع الوثيقة
- `ar.json:75` `documents.createIncoming.activity` : النشاط
- `ar.json:76` `documents.createIncoming.status` : الحالة
- `ar.json:77` `documents.createIncoming.statusDesc` : حالة معالجة الوثيقة
- `ar.json:78` `documents.createIncoming.department` : القسم
- `ar.json:79` `documents.createIncoming.departmentDesc` : القسم المسؤول عن الوثيقة
- `ar.json:80` `documents.createIncoming.priority` : الأولوية
- `ar.json:81` `documents.createIncoming.priorityDesc` : أولوية معالجة الوثيقة
- `ar.json:82` `documents.createIncoming.description` : الوصف
- `ar.json:83` `documents.createIncoming.descriptionDesc` : تفاصيل إضافية عن الوثيقة
- `ar.json:84` `documents.createIncoming.attachments` : المرفقات
- `ar.json:85` `documents.createIncoming.attachmentsDesc` : إرفاق الملفات المتعلقة بالوثيقة
- `ar.json:86` `documents.createIncoming.cancel` : إلغاء
- `ar.json:87` `documents.createIncoming.submit` : إنشاء الوثيقة
- `ar.json:88` `documents.createIncoming.selectDate` : اختر التاريخ
- `ar.json:89` `documents.createIncoming.errorLoading` : حدث خطأ أثناء تحميل البيانات
- `ar.json:90` `documents.createIncoming.required` : هذا الحقل مطلوب
- `ar.json:91` `documents.createIncoming.loadingData` : جاري تحميل البيانات...
- `ar.json:92` `documents.createIncoming.subtitle` : أضف وثيقة واردة جديدة إلى النظام
- `ar.json:93` `documents.createIncoming.cardTitle` : تفاصيل الوثيقة الواردة
- `ar.json:94` `documents.createIncoming.status.pending` : قيد الانتظار
- `ar.json:95` `documents.createIncoming.status.processing` : قيد المعالجة
- `ar.json:96` `documents.createIncoming.status.reviewed` : تمت المراجعة
- `ar.json:97` `documents.createIncoming.status.completed` : مكتمل
- `ar.json:98` `documents.createIncoming.priority.low` : منخفضة
- `ar.json:99` `documents.createIncoming.priority.normal` : عادية
- `ar.json:100` `documents.createIncoming.priority.high` : عالية
- `ar.json:101` `documents.createIncoming.priority.urgent` : عاجلة
- `ar.json:102` `documents.createIncoming.selectDepartment` : اختر القسم
- `ar.json:103` `documents.createIncoming.selectStatus` : اختر الحالة
- `ar.json:104` `documents.createIncoming.selectPriority` : اختر الأولوية
- `ar.json:105` `documents.createIncoming.createSuccess` : تم إنشاء الوثيقة بنجاح
- `ar.json:106` `documents.createIncoming.createError` : حدث خطأ أثناء إنشاء الوثيقة
- `ar.json:107` `documents.createIncoming.uploadTab` : تحميل ملف
- `ar.json:108` `documents.createIncoming.scanTab` : مسح ضوئي
- `ar.json:109` `documents.createIncoming.scanDocument` : مسح المستند ضوئيًا
- `ar.json:110` `documents.createIncoming.scanning` : جاري المسح الضوئي...
- `ar.json:111` `documents.createIncoming.scanComplete` : تم المسح الضوئي بنجاح
- `ar.json:112` `documents.createIncoming.scanFailed` : فشل المسح الضوئي
- `ar.json:113` `documents.createIncoming.noScanner` : لم يتم العثور على ماسح ضوئي
- `ar.json:114` `documents.createIncoming.scannerNotConfigured` : الماسح الضوئي غير مهيأ
- `ar.json:115` `documents.createIncoming.configureScanner` : قم بتهيئة الماسح الضوئي
- `ar.json:116` `documents.createIncoming.scanResults` : نتائج المسح الضوئي
- `ar.json:117` `documents.createIncoming.resolution` : الدقة
- `ar.json:118` `documents.createIncoming.format` : الصيغة
- `ar.json:119` `documents.createOutgoing.title` : إنشاء وثيقة صادرة جديدة
- `ar.json:120` `documents.createOutgoing.back` : الرجوع
- `ar.json:121` `documents.createOutgoing.serialNumber` : الرقم التسلسلي
- `ar.json:122` `documents.createOutgoing.serialNumberDesc` : الرقم التسلسلي الفريد للوثيقة
- `ar.json:123` `documents.createOutgoing.subject` : الموضوع
- `ar.json:124` `documents.createOutgoing.subjectDesc` : موضوع الوثيقة
- `ar.json:125` `documents.createOutgoing.destination` : الوجهة
- `ar.json:126` `documents.createOutgoing.destinationDesc` : وجهة الوثيقة (الشخص أو المؤسسة)
- `ar.json:127` `documents.createOutgoing.issueDate` : تاريخ الإصدار
- `ar.json:128` `documents.createOutgoing.issueDateDesc` : تاريخ إنشاء الوثيقة
- `ar.json:129` `documents.createOutgoing.department` : القسم
- `ar.json:130` `documents.createOutgoing.departmentDesc` : القسم المسؤول عن الوثيقة
- `ar.json:131` `documents.createOutgoing.priority` : الأولوية
- `ar.json:132` `documents.createOutgoing.priorityDesc` : أولوية معالجة الوثيقة
- `ar.json:133` `documents.createOutgoing.description` : الوصف
- `ar.json:134` `documents.createOutgoing.descriptionDesc` : تفاصيل إضافية عن الوثيقة
- `ar.json:135` `documents.createOutgoing.attachments` : المرفقات
- `ar.json:136` `documents.createOutgoing.attachmentsDesc` : إرفاق الملفات المتعلقة بالوثيقة
- `ar.json:137` `documents.createOutgoing.cancel` : إلغاء
- `ar.json:138` `documents.createOutgoing.submit` : إنشاء الوثيقة
- `ar.json:139` `documents.createOutgoing.selectDate` : اختر التاريخ
- `ar.json:140` `documents.createOutgoing.errorLoading` : حدث خطأ أثناء تحميل البيانات
- `ar.json:141` `documents.createOutgoing.required` : هذا الحقل مطلوب
- `ar.json:142` `documents.createOutgoing.selectDepartment` : اختر القسم
- `ar.json:143` `documents.createOutgoing.loadingData` : جاري تحميل البيانات...
- `ar.json:144` `documents.createOutgoing.subtitle` : أضف وثيقة صادرة جديدة إلى النظام
- `ar.json:145` `documents.createOutgoing.cardTitle` : تفاصيل الوثيقة الصادرة
- `ar.json:146` `documents.createOutgoing.createSuccess` : تم إنشاء الوثيقة بنجاح
- `ar.json:147` `documents.createOutgoing.createError` : حدث خطأ أثناء إنشاء الوثيقة
- `ar.json:148` `documents.createOutgoing.uploadTab` : تحميل ملف
- `ar.json:149` `documents.createOutgoing.scanTab` : مسح ضوئي
- `ar.json:150` `documents.createOutgoing.scanDocument` : مسح المستند ضوئيًا
- `ar.json:151` `documents.createOutgoing.scanning` : جاري المسح الضوئي...
- `ar.json:152` `documents.createOutgoing.scanComplete` : تم المسح الضوئي بنجاح
- `ar.json:153` `documents.createOutgoing.scanFailed` : فشل المسح الضوئي
- `ar.json:154` `documents.createOutgoing.noScanner` : لم يتم العثور على ماسح ضوئي
- `ar.json:155` `documents.createOutgoing.scannerNotConfigured` : الماسح الضوئي غير مهيأ
- `ar.json:156` `documents.createOutgoing.configureScanner` : قم بتهيئة الماسح الضوئي
- `ar.json:157` `documents.createOutgoing.scanResults` : نتائج المسح الضوئي
- `ar.json:158` `documents.createOutgoing.resolution` : الدقة
- `ar.json:159` `documents.createOutgoing.format` : الصيغة
- `ar.json:160` `folders.page.accessDenied.title` : ليس لديك صلاحية
- `ar.json:161` `folders.page.accessDenied.description` : ليس لديك الصلاحية لعرض إدارة مجلدات الأرشيف في هذا القسم الإداري
- `ar.json:162` `folders.page.title` : إدارة المجلدات وتصنيف المستندات
- `ar.json:163` `folders.page.subtitleReadOnly` : تصفح هيكل المجلدات والوثائق الإدارية المصنفة
- `ar.json:164` `folders.page.subtitleManage` : إنشاء وتعديل وتنظيم الهيكل الشجري للمجلدات وتصنيف المراسلات
- `ar.json:165` `folders.page.allDepartments` : جميع الأقسام
- `ar.json:166` `folders.page.activeDepartmentFallback` : القسم النشط
- `ar.json:167` `folders.page.badgeReadOnly` : للعرض فقط
- `ar.json:168` `folders.page.badgeFullAccess` : إدارة كاملة
- `ar.json:169` `folders.badge.manageDepartment` : إدارة كاملة للقسم
- `ar.json:170` `folders.badge.director` : مدير الإدارة (اطلاع شامل)
- `ar.json:171` `folders.badge.allDepartmentsMonitoring` : مراقبة شاملة للأقسام
- `ar.json:172` `folders.badge.readOnly` : عرض واستعلام فقط
- `ar.json:173` `folders.badge.leadership` : صلاحيات قيادية
- `ar.json:174` `folders.accessDenied.title` : غير مصرح بالوصول
- `ar.json:175` `folders.accessDenied.description` : ليس لديك الصلاحية لعرض نظام تصنيف المجلدات في هذا القسم.
- `ar.json:176` `folders.banner.title` : نظام تصنيف وأرشفة المجلدات
- `ar.json:177` `folders.banner.subtitle` : تنظيم وتصنيف المراسلات الإدارية الرسمية بطريقة هرمية آمنة ومنهجية
- `ar.json:178` `folders.allDepartments` : جميع الأقسام الإدارية
- `ar.json:179` `folders.activeDepartmentFallback` : القسم الإداري
- `ar.json:180` `folders.tab.tree` : الهيكل الهرمي للمجلدات
- `ar.json:181` `folders.tab.categorization` : تصنيف المراسلات غير المصنفة
- `ar.json:182` `documents.viewIncoming.toast.ocrCopied` : تم نسخ النص المستخرج بنجاح
- `ar.json:183` `documents.viewIncoming.toast.pdfDownloadStart` : بدأ تحميل ملف PDF
- `ar.json:184` `documents.viewIncoming.toast.pdfDownloadError` : تعذر تحميل ملف PDF
- `ar.json:185` `documents.viewIncoming.toast.pdfMissing` : لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة
- `ar.json:186` `documents.viewIncoming.loading.title` : جاري تحميل تفاصيل الوثيقة الواردة...
- `ar.json:187` `documents.viewIncoming.loading.description` : يرجى الانتظار ريثما يتم جلب بيانات المراسلة وسجلاتها
- `ar.json:188` `documents.viewIncoming.notFound.title` : تعذر العثور على الوثيقة
- `ar.json:189` `documents.viewIncoming.notFound.description` : الوثيقة الواردة المطلوبة غير موجودة أو ليس لديك الصلاحيات الكافية للاطلاع عليها.
- `ar.json:190` `documents.viewIncoming.notFound.backButton` : العودة إلى قائمة الوثائق الواردة
- `ar.json:191` `documents.viewIncoming.fallback.noFolder` : غير مصنفة في مجلد
- `ar.json:192` `documents.viewIncoming.fallback.specificFolder` : مجلد محدد
- `ar.json:193` `documents.viewIncoming.fallback.noResponsible` : لم يُعيّن مسؤول بعد
- `ar.json:194` `documents.viewIncoming.fallback.untitled` : وثيقة رقم #{{serialNumber}}
- `ar.json:195` `documents.viewIncoming.breadcrumb.home` : الرئيسية
- `ar.json:196` `documents.viewIncoming.breadcrumb.incomingDocuments` : المستندات الواردة
- `ar.json:197` `documents.viewIncoming.button.backToList` : العودة إلى القائمة
- `ar.json:198` `documents.viewIncoming.title.incomingNumber` : الوثيقة الواردة #{{serialNumber}}
- `ar.json:199` `documents.viewIncoming.title.yearSuffix` : / لسنة {{year}}
- `ar.json:200` `documents.viewIncoming.subtitle` : بطاقة المعاينة والتدقيق الإداري للمراسلة الواردة
- `ar.json:201` `documents.viewIncoming.button.previewPdf` : معاينة المرفق PDF
- `ar.json:202` `documents.viewIncoming.button.editDocument` : تعديل الوثيقة
- `ar.json:203` `documents.viewIncoming.badge.incomingNumber` : وارد رقم: #{{serialNumber}} / {{year}}
- `ar.json:204` `documents.viewIncoming.badge.director` : مدير الإدارة (اطلاع شامل)
- `ar.json:205` `documents.viewIncoming.badge.processedAndReplied` : تمت المعالجة والرد عليها
- `ar.json:206` `documents.viewIncoming.badge.pendingProcessing` : بانتظار المعالجة / الرد
- `ar.json:207` `documents.viewIncoming.badge.priority` : درجة الأهمية: {{priority}}
- `ar.json:208` `documents.viewIncoming.badge.registeredOn` : سُجلت في: {{date}}
- `ar.json:209` `documents.viewIncoming.subject.title` : موضوع المراسلة الواردة
- `ar.json:210` `documents.viewIncoming.metric.source` : المصدر / الجهة المرسلة
- `ar.json:211` `documents.viewIncoming.fallback.unspecified` : غير محدد
- `ar.json:212` `documents.viewIncoming.metric.arrivalDate` : تاريخ الوصول
- `ar.json:213` `documents.viewIncoming.metric.originalCorrespondence` : رقم وتاريخ المراسلة الأصلية
- `ar.json:214` `documents.viewIncoming.fallback.notRecorded` : غير مدون
- `ar.json:215` `documents.viewIncoming.metric.responsible` : المسؤول عن المتابعة
- `ar.json:216` `documents.viewIncoming.adminInfo.sectionTitle` : المعلومات الإدارية والمراسلة
- `ar.json:217` `documents.viewIncoming.adminInfo.internalSerial` : رقم التسلسل الداخلي:
- `ar.json:218` `documents.viewIncoming.adminInfo.arrivalDateAtInstitution` : تاريخ الوصول إلى المؤسسة:
- `ar.json:219` `documents.viewIncoming.adminInfo.senderCorrespondenceNumber` : رقم مراسلة الجهة الصادرة:
- `ar.json:220` `documents.viewIncoming.fallback.none` : لا يوجد
- `ar.json:221` `documents.viewIncoming.adminInfo.originalIssueDate` : تاريخ تحرير المراسلة الأصلية:
- `ar.json:222` `documents.viewIncoming.adminInfo.documentType` : نوع الوثيقة:
- `ar.json:223` `documents.viewIncoming.fallback.unclassified` : غير مصنف
- `ar.json:224` `documents.viewIncoming.adminInfo.relatedActivity` : النشاط أو الإجراء المرتبط:
- `ar.json:225` `documents.viewIncoming.adminInfo.onDate` : (بتاريخ {{date}})
- `ar.json:226` `documents.viewIncoming.fallback.noActivity` : لا يوجد نشاط مسجل
- `ar.json:227` `documents.viewIncoming.sender.sectionTitle` : الجهة المرسلة والتوجيه الداخلي
- `ar.json:228` `documents.viewIncoming.sender.sourceLabel` : المصدر / الجهة الراسلة:
- `ar.json:229` `documents.viewIncoming.sender.assignedDepartments` : المصالح والأقسام الموجهة إليها:
- `ar.json:230` `documents.viewIncoming.sender.noDepartments` : لم يتم توجيه هذه الوثيقة إلى قسم محدد بعد.
- `ar.json:231` `documents.viewIncoming.ocr.title` : النص المستخرج آلياً (OCR)
- `ar.json:232` `documents.viewIncoming.ocr.subtitle` : تم التعرف على النص عبر خوارزميات المسح الضوئي
- `ar.json:233` `documents.viewIncoming.ocr.copy` : نسخ النص
- `ar.json:234` `documents.viewIncoming.ocr.copied` : تم النسخ
- `ar.json:235` `documents.viewIncoming.answer.title` : الوثيقة الصادرة المرتبطة (الرد الرسمي)
- `ar.json:236` `documents.viewIncoming.answer.subtitle` : تم تسجيل ومعالجة الرد الصادر على هذه المراسلة
- `ar.json:237` `documents.viewIncoming.answer.viewDetails` : عرض تفاصيل الرد
- `ar.json:238` `documents.viewIncoming.answer.outgoingNumberAndDate` : رقم وتاريخ الصادر:
- `ar.json:239` `documents.viewIncoming.answer.issueDatePrefix` : بتاريخ {{date}}
- `ar.json:240` `documents.viewIncoming.answer.subject` : موضوع الرد:
- `ar.json:241` `documents.viewIncoming.sidebar.folder.title` : تصنيف المجلد
- `ar.json:242` `documents.viewIncoming.sidebar.folder.change` : تغيير
- `ar.json:243` `documents.viewIncoming.sidebar.folder.current` : المجلد الحالي:
- `ar.json:244` `documents.viewIncoming.sidebar.folder.description` : يساعد التصنيف في تنظيم المراسلات وسهولة استرجاعها حسب الملفات والمشاريع.
- `ar.json:245` `documents.viewIncoming.sidebar.responsible.title` : المسؤول عن المعالجة
- `ar.json:246` `documents.viewIncoming.sidebar.responsible.assign` : تعيين
- `ar.json:247` `documents.viewIncoming.sidebar.responsible.assignedTo` : المكلف بالمتابعة:
- `ar.json:248` `documents.viewIncoming.sidebar.summary.title` : ملخص المسار الإداري
- `ar.json:249` `documents.viewIncoming.sidebar.summary.arrivalRegistration` : تسجيل الوصول:
- `ar.json:250` `documents.viewIncoming.sidebar.summary.responsibleAssignment` : تعيين المسؤول:
- `ar.json:251` `documents.viewIncoming.sidebar.summary.pending` : قيد الانتظار
- `ar.json:252` `documents.viewIncoming.sidebar.summary.outgoingAnswer` : الرد الصادر:
- `ar.json:253` `documents.viewIncoming.sidebar.summary.answerReady` : تم إعداد الرد
- `ar.json:254` `documents.viewIncoming.sidebar.summary.noAnswerYet` : لم يتم الرد بعد
- `ar.json:255` `documents.viewIncoming.actions.title` : الإجراءات الإدارية المتاحة
- `ar.json:256` `documents.viewIncoming.actions.subtitle` : العمليات الإدارية المباشرة المتاحة على هذه المراسلة الواردة
- `ar.json:257` `documents.viewIncoming.actions.previewPdf` : معاينة ملف PDF
- `ar.json:258` `documents.viewIncoming.actions.processAndReply` : معالجة وإضافة رد
- `ar.json:259` `documents.viewIncoming.actions.editOrReplaceAnswer` : تعديل أو استبدال الرد
- `ar.json:260` `documents.viewIncoming.actions.archiveInFolder` : أرشفة وتنظيم في مجلد
- `ar.json:261` `documents.viewIncoming.actions.assignResponsible` : تحويل / تعيين مسؤول
- `ar.json:262` `documents.viewIncoming.actions.backToList` : العودة إلى قائمة الوثائق
- `ar.json:263` `documents.viewIncoming.attachments.title` : الوثائق المرفقة والممسوحة ضوئياً
- `ar.json:264` `documents.viewIncoming.attachments.subtitle` : معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة
- `ar.json:265` `documents.viewIncoming.viewer.tab.incoming` : الوثيقة الواردة
- `ar.json:266` `documents.viewIncoming.viewer.tab.answer` : الرد الصادر
- `ar.json:267` `documents.viewIncoming.viewer.tab.split` : عرض مقارن جنباً إلى جنب
- `ar.json:268` `documents.viewIncoming.viewer.label.originalIncoming` : الوثيقة الواردة الأصلية
- `ar.json:269` `documents.viewIncoming.viewer.label.outgoingAnswer` : الوثيقة الصادرة (الرد)
- `ar.json:270` `documents.viewIncoming.viewer.label.answerAttachment` : مرفق الرد الصادر #{{serialNumber}} / {{year}}
- `ar.json:271` `documents.viewIncoming.viewer.label.incomingAttachment` : مرفق الوثيقة الواردة #{{serialNumber}} / {{year}}
- `ar.json:272` `documents.viewIncoming.viewer.button.download` : تحميل
- `ar.json:273` `documents.viewIncoming.viewer.button.downloadPdf` : تحميل ملف PDF
- `ar.json:274` `documents.viewIncoming.attachments.empty.title` : لا توجد وثيقة ممسوحة ضوئياً مرفقة
- `ar.json:275` `documents.viewIncoming.attachments.empty.description` : لم يتم رفع نسخة رقمية (PDF) لهذه المراسلة بعد. يمكنك تعديل الوثيقة لإرفاق النسخة الممسوحة ضوئياً.
- `ar.json:276` `documents.viewIncoming.attachments.empty.attachButton` : إرفاق وثيقة ممسوحة ضوئياً
- `ar.json:277` `documents.viewIncoming.timeline.title` : سجل المتابعة والتاريخ الإداري
- `ar.json:278` `documents.viewIncoming.timeline.subtitle` : التتبع الزمني لكافة الإجراءات والعمليات التي تمت على هذه المراسلة
- `ar.json:279` `documents.viewIncoming.timeline.fallback.action` : إجراء إداري
- `ar.json:280` `documents.viewIncoming.timeline.performedBy` : قام بالإجراء:
- `ar.json:281` `documents.viewIncoming.timeline.fallback.systemUser` : مستخدم النظام
- `ar.json:282` `documents.viewIncoming.timeline.lifecycle.step1.title` : تسجيل وقيد الوثيقة في سجل الوارد
- `ar.json:283` `documents.viewIncoming.timeline.lifecycle.step1.description` : تم تسجيل المراسلة تحت رقم تسلسلي #{{serialNumber}} لسنة {{year}} من المصدر: {{source}}.
- `ar.json:284` `documents.viewIncoming.timeline.lifecycle.step2.title` : توجيه المراسلة إلى المصالح المختصة
- `ar.json:285` `documents.viewIncoming.timeline.lifecycle.step2.description` : وجهت المراسلة إلى: {{departments}}
- `ar.json:286` `documents.viewIncoming.timeline.lifecycle.step3.title` : تعيين الموظف المسؤول عن المتابعة
- `ar.json:287` `documents.viewIncoming.timeline.lifecycle.step3.description` : عُيّن الزميل {{name}} مسؤولاً عن متابعة ومعالجة هذه المراسلة.
- `ar.json:288` `documents.viewIncoming.timeline.lifecycle.step4.title` : أرشفة وتصنيف المراسلة في مجلد
- `ar.json:289` `documents.viewIncoming.timeline.lifecycle.step4.description` : تم إدراج الوثيقة ضمن مجلد: {{folder}}.
- `ar.json:290` `documents.viewIncoming.timeline.lifecycle.step5.title` : إتمام المعالجة وإصدار الرد الرسمي
- `ar.json:291` `documents.viewIncoming.timeline.lifecycle.step5.description` : تم تحرير وإصدار وثيقة الرد الصادر رقم #{{serialNumber}} / {{year}}.
- `ar.json:292` `documents.viewOutgoing.toast.deleteSuccess` : تم حذف الوثيقة الصادرة بنجاح
- `ar.json:293` `documents.viewOutgoing.toast.deleteError` : حدث خطأ أثناء محاولة حذف الوثيقة
- `ar.json:294` `documents.viewOutgoing.toast.subjectCopied` : تم نسخ موضوع الوثيقة
- `ar.json:295` `documents.viewOutgoing.reference.outgoingNumber` : صادر رقم {{serialNumber}}/{{year}}
- `ar.json:296` `documents.viewOutgoing.toast.referenceCopied` : تم نسخ المرجع الإداري للوثيقة
- `ar.json:297` `documents.viewOutgoing.toast.ocrCopied` : تم نسخ النص المستخرج بنجاح
- `ar.json:298` `documents.viewOutgoing.toast.pdfDownloadStart` : بدأ تحميل ملف PDF
- `ar.json:299` `documents.viewOutgoing.toast.pdfDownloadError` : تعذر تحميل ملف PDF
- `ar.json:300` `documents.viewOutgoing.toast.pdfMissing` : لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة
- `ar.json:301` `documents.viewOutgoing.loading.title` : جاري تحميل تفاصيل الوثيقة الصادرة...
- `ar.json:302` `documents.viewOutgoing.loading.description` : يرجى الانتظار ريثما يتم جلب بيانات المراسلة وسجلاتها
- `ar.json:303` `documents.viewOutgoing.notFound.title` : تعذر العثور على الوثيقة
- `ar.json:304` `documents.viewOutgoing.notFound.description` : الوثيقة الصادرة المطلوبة غير موجودة أو ليس لديك الصلاحيات الكافية للاطلاع عليها.
- `ar.json:305` `documents.viewOutgoing.notFound.backButton` : العودة إلى قائمة الوثائق الصادرة
- `ar.json:306` `documents.viewOutgoing.fallback.specificFolder` : مجلد محدد
- `ar.json:307` `documents.viewOutgoing.fallback.noFolder` : غير مصنفة في مجلد
- `ar.json:308` `documents.viewOutgoing.fallback.unspecified` : غير محدد
- `ar.json:309` `documents.viewOutgoing.breadcrumb.home` : الرئيسية
- `ar.json:310` `documents.viewOutgoing.breadcrumb.outgoingDocuments` : المستندات الصادرة
- `ar.json:311` `documents.viewOutgoing.fallback.untitled` : وثيقة رقم #{{serialNumber}}
- `ar.json:312` `documents.viewOutgoing.fallback.unclassified` : غير مصنف
- `ar.json:313` `documents.viewOutgoing.print.republic` : الجمهورية الجزائرية الديمقراطية الشعبية
- `ar.json:314` `documents.viewOutgoing.print.ministry` : وزارة العدل - منظومة إدارة المراسلات والوثائق
- `ar.json:315` `documents.viewOutgoing.print.title` : بطاقة تقنية لمراسلة صادرة
- `ar.json:316` `documents.viewOutgoing.print.outgoingNumber` : رقم القيد الصادر:
- `ar.json:317` `documents.viewOutgoing.print.issueDate` : تاريخ الإصدار:
- `ar.json:318` `documents.viewOutgoing.print.issuingService` : المصلحة المصدرة:
- `ar.json:319` `documents.viewOutgoing.print.documentType` : نوع الوثيقة:
- `ar.json:320` `documents.viewOutgoing.print.subject` : موضوع المراسلة:
- `ar.json:321` `documents.viewOutgoing.print.recipients` : الموجه إليهم:
- `ar.json:322` `documents.viewOutgoing.print.pourInfo` : نسخ للإعلام:
- `ar.json:323` `documents.viewOutgoing.print.replyToIncoming` : رد على المراسلة الواردة:
- `ar.json:324` `documents.viewOutgoing.print.visa.issuingService` : المصلحة المصدرة للمراسلة
- `ar.json:325` `documents.viewOutgoing.print.visa.stampAndSignature` : الختم والتوقيع
- `ar.json:326` `documents.viewOutgoing.print.visa.registryOffice` : مكتب الضبط والتوثيق
- `ar.json:327` `documents.viewOutgoing.print.visa.visaAndDate` : التأشيرة وتاريخ الإرسال
- `ar.json:328` `documents.viewOutgoing.listSeparator` : ، 
- `ar.json:329` `documents.viewOutgoing.button.backToList` : العودة إلى القائمة
- `ar.json:330` `documents.viewOutgoing.title.outgoingNumber` : الوثيقة الصادرة #{{serialNumber}}
- `ar.json:331` `documents.viewOutgoing.title.yearSuffix` : / لسنة {{year}}
- `ar.json:332` `documents.viewOutgoing.subtitle` : بطاقة المعاينة والتدقيق الإداري للمراسلة الصادرة
- `ar.json:333` `documents.viewOutgoing.button.previewPdf` : معاينة المرفق PDF
- `ar.json:334` `documents.viewOutgoing.button.printCard` : طباعة البطاقة
- `ar.json:335` `documents.viewOutgoing.button.editDocument` : تعديل الوثيقة
- `ar.json:336` `documents.viewOutgoing.badge.outgoingNumber` : صادر رقم: #{{serialNumber}} / {{year}}
- `ar.json:337` `documents.viewOutgoing.badge.director` : مدير الإدارة (اطلاع شامل)
- `ar.json:338` `documents.viewOutgoing.badge.replyToIncoming` : رد على مراسلة واردة (#{{serialNumber}}/{{year}})
- `ar.json:339` `documents.viewOutgoing.badge.initialOutgoing` : مراسلة صادرة ابتدائية
- `ar.json:340` `documents.viewOutgoing.badge.issueDate` : تاريخ الإصدار:
- `ar.json:341` `documents.viewOutgoing.subject.title` : موضوع المراسلة الصادرة:
- `ar.json:342` `documents.viewOutgoing.tooltip.copyReference` : نسخ المرجع الإداري
- `ar.json:343` `documents.viewOutgoing.button.copied` : تم النسخ
- `ar.json:344` `documents.viewOutgoing.button.copyReference` : نسخ المرجع
- `ar.json:345` `documents.viewOutgoing.tooltip.copySubject` : نسخ موضوع المراسلة
- `ar.json:346` `documents.viewOutgoing.button.subjectCopied` : تم نسخ الموضوع
- `ar.json:347` `documents.viewOutgoing.button.copySubject` : نسخ الموضوع
- `ar.json:348` `documents.viewOutgoing.metric.issuingService` : المصلحة المصدرة
- `ar.json:349` `documents.viewOutgoing.metric.actualIssueDate` : تاريخ الإصدار الفعلي
- `ar.json:350` `documents.viewOutgoing.metric.recipients` : الجهات الموجه إليها
- `ar.json:351` `documents.viewOutgoing.metric.recipientsCount` : {{count}} جهة محددة
- `ar.json:352` `documents.viewOutgoing.metric.pourInfo` : نسخ للإعلام (Pour Info)
- `ar.json:353` `documents.viewOutgoing.metric.pourInfoCount` : {{count}} جهة للإعلام
- `ar.json:354` `documents.viewOutgoing.metric.noCopies` : لا توجد نسخ
- `ar.json:355` `documents.folderDialog.roles.adminDepartment.title` : تنظيم المستند في مجلد
- `ar.json:356` `documents.folderDialog.roles.adminDepartment.subtitle` : يمكنك تنظيم المستند في المجلدات أو نقله بين المجلدات
- `ar.json:357` `documents.folderDialog.roles.adminDepartment.badge` : إدارة كاملة
- `ar.json:358` `documents.folderDialog.roles.adminTuningDesk.title` : عرض تصنيف المستند
- `ar.json:359` `documents.folderDialog.roles.adminTuningDesk.subtitle` : يمكنك عرض تصنيف المستند في المجلدات فقط
- `ar.json:360` `documents.folderDialog.roles.adminTuningDesk.badge` : مراقبة التصنيف
- `ar.json:361` `documents.folderDialog.roles.user.title` : عرض تصنيف المستند
- `ar.json:362` `documents.folderDialog.roles.user.subtitle` : يمكنك عرض تصنيف المستند في قسمك
- `ar.json:363` `documents.folderDialog.roles.user.badge` : للعرض فقط
- `ar.json:364` `documents.folderDialog.roles.default.title` : إدارة تصنيف المستند
- `ar.json:365` `documents.folderDialog.roles.default.subtitle` : إدارة شاملة لتصنيف المستند
- `ar.json:366` `documents.folderDialog.roles.default.badge` : إدارة شاملة
- `ar.json:367` `documents.folderDialog.documentSubject` : موضوع المستند:
- `ar.json:368` `documents.folderDialog.incoming` : وارد
- `ar.json:369` `documents.folderDialog.outgoing` : صادر
- `ar.json:370` `documents.folderDialog.lastUpdate` : آخر تحديث: اليوم
- `ar.json:371` `documents.folderDialog.serverConnected` : متصل بالخادم
- `ar.json:372` `documents.assignResponsible.title` : تعيين مسؤول عن الوثيقة
- `ar.json:373` `documents.assignResponsible.subtitle` : اختر المستخدم المناسب لتولي مسؤولية هذه الوثيقة
- `ar.json:374` `documents.assignResponsible.defaultAssigner` : النظام
- `ar.json:375` `documents.assignResponsible.success` : تم تعيين المسؤول بنجاح
- `ar.json:376` `documents.assignResponsible.error` : فشل في تعيين المسؤول
- `ar.json:377` `documents.assignResponsible.selectUserPrompt` : يرجى اختيار مستخدم
- `ar.json:378` `documents.assignResponsible.docInfo` : معلومات الوثيقة
- `ar.json:379` `documents.assignResponsible.serialNumber` : الرقم التسلسلي
- `ar.json:380` `documents.assignResponsible.subject` : الموضوع
- `ar.json:381` `documents.assignResponsible.responsibleUser` : المستخدم المسؤول
- `ar.json:382` `documents.assignResponsible.selectPlaceholder` : اختر مستخدم...
- `ar.json:383` `documents.assignResponsible.loadingUsers` : جاري التحميل...
- `ar.json:384` `documents.assignResponsible.noUsersInDepartment` : لا يوجد مستخدمون في القسم
- `ar.json:385` `documents.assignResponsible.userSelectedSuccess` : تم اختيار المستخدم بنجاح
- `ar.json:386` `documents.assignResponsible.activeDepartment` : القسم النشط: {{department}}
- `ar.json:387` `documents.assignResponsible.departmentConstraintNotice` : يتم حصر وتعيين المسؤولين من ضمن أعضاء هذا القسم فقط
- `ar.json:388` `documents.assignResponsible.submitting` : جاري التعيين...
- `ar.json:389` `documents.assignResponsible.confirm` : تعيين المسؤول
- `ar.json:390` `documents.assignResponsible.cancel` : إلغاء
- `ar.json:391` `documents.assignResponse.title` : إضافة رد على الوثيقة
- `ar.json:392` `documents.assignResponse.subtitle` : اختر الوثيقة الصادرة المناسبة كرد على هذه الوثيقة
- `ar.json:393` `documents.assignResponse.toast.success` : تم ربط الرد بنجاح
- `ar.json:394` `documents.assignResponse.toast.error` : فشل في ربط الرد
- `ar.json:395` `documents.assignResponse.toast.selectPrompt` : يرجى اختيار وثيقة صادرة
- `ar.json:396` `documents.assignResponse.searchSection.title` : فلترة وبحث الوثائق الصادرة
- `ar.json:397` `documents.assignResponse.searchSection.yearLabel` : السنة
- `ar.json:398` `documents.assignResponse.searchSection.yearPlaceholder` : أدخل السنة (مثال: 2025)
- `ar.json:399` `documents.assignResponse.searchSection.yearWarning` : يجب أن تكون السنة مكونة من 4 أرقام
- `ar.json:400` `documents.assignResponse.searchSection.serialLabel` : البحث بالرقم التسلسلي
- `ar.json:401` `documents.assignResponse.searchSection.serialPlaceholder` : رقم تسلسلي...
- `ar.json:402` `documents.assignResponse.searchSection.searchButtonAria` : بحث بالرقم التسلسلي
- `ar.json:403` `documents.assignResponse.searchSection.clear` : مسح
- `ar.json:404` `documents.assignResponse.resultsSummary.year` : السنة: {{year}}
- `ar.json:405` `documents.assignResponse.resultsSummary.unspecified` : غير محدد
- `ar.json:406` `documents.assignResponse.resultsSummary.count` : النتائج: {{count}} وثيقة
- `ar.json:407` `documents.assignResponse.resultsSummary.selected` : تم اختيار الوثيقة
- `ar.json:408` `documents.assignResponse.selection.label` : الوثيقة الصادرة كـ رد
- `ar.json:409` `documents.assignResponse.emptyState.enterYearTitle` : ابدأ بإدخال السنة
- `ar.json:410` `documents.assignResponse.emptyState.enterYearDesc` : يرجى إدخال السنة للبحث عن الوثائق المتاحة
- `ar.json:411` `documents.assignResponse.emptyState.completeYearTitle` : أكمل إدخال السنة
- `ar.json:412` `documents.assignResponse.emptyState.completeYearDesc` : يرجى إكمال إدخال السنة (4 أرقام) للبحث
- `ar.json:413` `documents.assignResponse.loading.searching` : جاري البحث...
- `ar.json:414` `documents.assignResponse.loading.loadingDocs` : يتم تحميل الوثائق المتاحة
- `ar.json:415` `documents.assignResponse.emptyState.noMatchesTitle` : لا توجد وثائق متطابقة
- `ar.json:416` `documents.assignResponse.emptyState.noMatchesSerial` : لم يتم العثور على وثائق تطابق الرقم التسلسلي \"{{serial}}\" في عام {{year}}
- `ar.json:417` `documents.assignResponse.emptyState.noDocsYear` : لا توجد وثائق صادرة متاحة في عام {{year}}
- `ar.json:418` `documents.assignResponse.item.assignedTo` : موجه إلى: {{departments}}
- `ar.json:419` `documents.assignResponse.button.submitting` : جاري التعيين...
- `ar.json:420` `documents.assignResponse.button.confirm` : تعيين الرد
- `ar.json:421` `documents.assignResponse.button.cancel` : إلغاء
- `ar.json:422` `documents.assignResponse.listSeparator` : ، 
- `ar.json:423` `documents.personnel.validation.selectPersonnel` : يرجى اختيار موظف للربط
- `ar.json:424` `documents.personnel.validation.selectType` : يرجى تحديد طبيعة الوثيقة / نوع الربط
- `ar.json:425` `documents.personnel.toast.addSuccess` : تم ربط الموظف بالوثيقة بنجاح
- `ar.json:426` `documents.personnel.toast.addError` : فشل في ربط الموظف
- `ar.json:427` `documents.personnel.toast.deleteSuccess` : تم إلغاء ربط الموظف بنجاح
- `ar.json:428` `documents.personnel.toast.deleteError` : فشل في إلغاء ربط الموظف
- `ar.json:429` `documents.personnel.toast.editSuccess` : تم تعديل بيانات الربط بنجاح
- `ar.json:430` `documents.personnel.toast.editError` : فشل في تعديل بيانات الربط
- `ar.json:431` `documents.personnel.title` : الموظفون المرتبطون بهذه الوثيقة
- `ar.json:432` `documents.personnel.subtitle` : ملفات الموارد البشرية ذات الصلة بهذه المراسلة (شواهد، تكوينات، قرارات)
- `ar.json:433` `documents.personnel.addBtn` : ربط موظف
- `ar.json:434` `documents.personnel.loading` : جاري تحميل الموظفين المرتبطين...
- `ar.json:435` `documents.personnel.loadError` : فشل في تحميل الموظفين المرتبطين
- `ar.json:436` `documents.personnel.empty.title` : لم يتم ربط أي موظف بهذه الوثيقة بعد
- `ar.json:437` `documents.personnel.empty.description` : يمكن ربط هذه المراسلة بملف موظف لتسجيل شهادة تدريب، دورة تكوينية، أو قرار إداري في سجله الوظيفي.
- `ar.json:438` `documents.personnel.empty.action` : ربط موظف الآن
- `ar.json:439` `documents.personnel.unknownPersonnel` : موظف غير معرف
- `ar.json:440` `documents.personnel.associationDate` : تاريخ الربط: {{date}}
- `ar.json:441` `documents.personnel.editAria` : تعديل الربط
- `ar.json:442` `documents.personnel.deleteAria` : إلغاء الربط
- `ar.json:443` `documents.personnel.noPoste` : بدون منصب
- `ar.json:444` `documents.personnel.dialog.addTitle` : ربط موظف بالوثيقة الحالية
- `ar.json:445` `documents.personnel.dialog.addDescription` : اختر الموظف وحدد طبيعة المراسلة لإدراجها تلقائياً في ملفه الإداري
- `ar.json:446` `documents.personnel.dialog.step1` : 1. اختيار الموظف
- `ar.json:447` `documents.personnel.dialog.changeCandidate` : تغيير
- `ar.json:448` `documents.personnel.dialog.searchPlaceholder` : ابحث بالاسم أو بطاقة الهوية CIN...
- `ar.json:449` `documents.personnel.dialog.loadingCandidates` : جاري تحميل قائمة الموظفين...
- `ar.json:450` `documents.personnel.dialog.noCandidatesFound` : لا يوجد موظف مطابق للبحث أو أن جميعهم مرتبطون بالوثيقة
- `ar.json:451` `documents.personnel.dialog.selectCandidate` : تحديد
- `ar.json:452` `documents.personnel.dialog.step2` : 2. طبيعة الوثيقة / نوع الربط
- `ar.json:453` `documents.personnel.dialog.selectTypePlaceholder` : -- اختر طبيعة الوثيقة --
- `ar.json:454` `documents.personnel.dialog.step3` : 3. ملاحظات إضافية (اختياري)
- `ar.json:455` `documents.personnel.dialog.commentPlaceholder` : تفاصيل تكميلية عن هذه الوثيقة...
- `ar.json:456` `documents.personnel.dialog.submittingAdd` : جاري الربط...
- `ar.json:457` `documents.personnel.dialog.confirmAdd` : تأكيد ربط الموظف
- `ar.json:458` `documents.personnel.dialog.cancel` : إلغاء
- `ar.json:459` `documents.personnel.dialog.editTitle` : تعديل بيانات الربط
- `ar.json:460` `documents.personnel.dialog.editTypeLabel` : طبيعة الوثيقة / نوع الربط
- `ar.json:461` `documents.personnel.dialog.editCommentLabel` : ملاحظات أو تفاصيل إضافية
- `ar.json:462` `documents.personnel.dialog.submittingEdit` : جاري الحفظ...
- `ar.json:463` `documents.personnel.dialog.confirmEdit` : حفظ التعديلات
- `ar.json:464` `documents.personnel.dialog.deleteConfirmTitle` : تأكيد فك ارتباط الموظف بهذه الوثيقة
- `ar.json:465` `documents.personnel.dialog.deleteConfirmDesc` : هل أنت متأكد من رغبتك في إزالة هذا الموظف من سجل الوثيقة؟ لن يتم حذف أي بيانات أو وثائق من المنظومة.
- `ar.json:466` `documents.personnel.dialog.deletingAction` : جاري الإلغاء...
- `ar.json:467` `documents.personnel.dialog.confirmDelete` : نعم، إزالة الارتباط
- `ar.json:468` `documents.personnel.dialog.back` : تراجع
- `ar.json:469` `common.loading` : جاري التحميل...
- `ar.json:470` `landing.headerTitle` : نظام إدارة الوثائق
- `ar.json:471` `landing.loginButton` : تسجيل الدخول
- `ar.json:472` `landing.heroTitle` : حل فعال لإدارة الوثائق
- `ar.json:473` `landing.heroSubtitle` : نظام متكامل لإدارة المراسلات الإدارية والموارد البشرية
- `ar.json:474` `landing.heroDescription1` : قم بتبسيط تدفق وثائق مؤسستك مع نظام الإدارة الشامل لدينا.
- `ar.json:475` `landing.heroDescription2` : تتبع ومعالجة وأرشفة الوثائق بسهولة.
- `ar.json:476` `landing.ctaStart` : ابدأ الآن
- `ar.json:477` `landing.badgeFast` : سريع
- `ar.json:478` `landing.badgeSecure` : آمن
- `ar.json:479` `landing.badgeComplete` : متكامل
- `ar.json:480` `landing.featuresTitle` : الميزات الرئيسية
- `ar.json:481` `landing.feature1Title` : تتبع الوثائق
- `ar.json:482` `landing.feature1Description` : تتبع الوثائق الواردة والصادرة خلال دورة حياتها داخل مؤسستك.
- `ar.json:483` `landing.feature1Tags` : تتبع فوري • إشعارات آلية • أرشيف مركزي
- `ar.json:484` `landing.feature2Title` : إدارة الأقسام
- `ar.json:485` `landing.feature2Description` : تعيين الوثائق لأقسام محددة ومراقبة حالة المعالجة.
- `ar.json:486` `landing.feature2Tags` : صلاحيات دقيقة • توزيع المهام • تقارير الأداء
- `ar.json:487` `landing.feature3Title` : مسح الوثائق
- `ar.json:488` `landing.feature3Description` : مسح الوثائق الورقية مباشرة إلى النظام مع حل المسح المتكامل لدينا.
- `ar.json:489` `landing.feature3Tags` : OCR ذكي • ربط تلقائي • حفظ سحابي
- `ar.json:490` `landing.ctaTitle` : هل أنت مستعد لتبسيط إدارة وثائقك؟
- `ar.json:491` `landing.ctaDescription` : يساعد نظامنا المؤسسات على تقليل الأعمال الورقية وتحسين الكفاءة.
- `ar.json:492` `landing.ctaLoginButton` : تسجيل الدخول للبدء
- `ar.json:493` `landing.ctaContactNote` : اتصل بمسؤول النظام للحصول على حساب
- `ar.json:494` `landing.footerTitle` : نظام إدارة الوثائق
- `ar.json:495` `landing.footerCopyright` : © 2025 جميع الحقوق محفوظة
- `ar.json:496` `login.title` : تسجيل الدخول
- `ar.json:497` `login.welcome` : مرحباً
- `ar.json:498` `login.username` : اسم المستخدم
- `ar.json:499` `login.password` : كلمة المرور
- `ar.json:500` `login.showPassword` : إظهار كلمة المرور
- `ar.json:501` `login.hidePassword` : إخفاء كلمة المرور
- `ar.json:502` `login.submit` : تسجيل الدخول
- `ar.json:503` `login.rememberMe` : تذكرني
- `ar.json:504` `login.error` : بيانات اعتماد غير صحيحة
- `ar.json:505` `login.enterUsername` : أدخل اسم المستخدم
- `ar.json:506` `login.enterPassword` : أدخل كلمة المرور
- `ar.json:507` `login.backToHome` : العودة للرئيسية
- `ar.json:508` `login.credentials` : حساب المدير الافتراضي
- `ar.json:509` `login.serverNote` : تأكد من تشغيل الخادم على
- `ar.json:510` `login.loggingIn` : جاري تسجيل الدخول...
- `ar.json:511` `login.networkError` : خطأ في الشبكة. تأكد من تشغيل الخادم على المنفذ 5000
- `ar.json:512` `login.connectionError` : غير قادر على الاتصال بالخادم
- `ar.json:513` `messages.title` : الرسائل
- `ar.json:514` `messages.compose` : إنشاء رسالة
- `ar.json:515` `messages.inbox` : صندوق الوارد
- `ar.json:516` `messages.contacts` : جهات الاتصال
- `ar.json:517` `messages.search` : البحث في الرسائل...
- `ar.json:518` `messages.noMessages` : لا توجد رسائل بعد
- `ar.json:519` `messages.selectMessage` : اختر محادثة لعرض الرسائل
- `ar.json:520` `messages.reply` : رد
- `ar.json:521` `messages.delete` : حذف
- `ar.json:522` `messages.send` : إرسال
- `ar.json:523` `messages.subject` : الموضوع
- `ar.json:524` `messages.content` : الرسالة
- `ar.json:525` `messages.recipients` : المستقبلون
- `ar.json:526` `messages.attachments` : المرفقات
- `ar.json:527` `messages.newMessage` : رسالة جديدة
- `ar.json:528` `messages.refresh` : تحديث
- `ar.json:529` `messages.backToMessages` : العودة للرسائل
- `ar.json:530` `messages.messageNotFound` : الرسالة غير موجودة
- `ar.json:531` `messages.loading` : جاري التحميل...
- `ar.json:532` `messages.error` : خطأ في تحميل الرسائل
- `ar.json:533` `messages.tryAgain` : حاول مرة أخرى
- `ar.json:534` `messages.networkError` : كان هناك مشكلة في الاتصال بخدمة الرسائل
- `ar.json:535` `messages.unread` : غير مقروءة
- `ar.json:536` `messages.total` : إجمالي الرسائل
- `ar.json:537` `messages.oneToOne` : رسائل فردية
- `ar.json:538` `messages.group` : رسائل جماعية
- `ar.json:539` `messages.cancel` : إلغاء
- `ar.json:540` `messages.sending` : جاري الإرسال...
- `ar.json:541` `messages.sent` : تم إرسال الرسالة
- `ar.json:542` `messages.sentSuccess` : تم إرسال رسالتك بنجاح
- `ar.json:543` `messages.sendError` : فشل في إرسال الرسالة
- `ar.json:544` `messages.enterSubject` : أدخل موضوع الرسالة...
- `ar.json:545` `messages.typeMessage` : اكتب رسالتك هنا...
- `ar.json:546` `messages.addFiles` : إضافة ملفات
- `ar.json:547` `messages.addAttachments` : إضافة مرفقات
- `ar.json:548` `messages.selectRecipient` : يرجى اختيار مستقبل واحد على الأقل
- `ar.json:549` `messages.fillFields` : يرجى ملء الموضوع والمحتوى
- `ar.json:550` `messages.quickMessage` : رسالة سريعة
- `ar.json:551` `messages.clickCompose` : اضغط + لإنشاء رسالة جديدة
- `ar.json:552` `messages.crossRoleEnabled` : المراسلة متاحة بين جميع الأدوار
- `ar.json:553` `messages.searchUsers` : البحث في جميع المستخدمين (أي دور، أي قسم)...
- `ar.json:554` `messages.enhancedMessaging` : ✅ إمكانيات مراسلة محسنة
- `ar.json:555` `messages.canSendToAny` : يمكنك إرسال هذه الرسالة إلى أي مجموعة من المستخدمين عبر جميع الأدوار والأقسام
- `ar.json:556` `messages.allContacts` : جميع جهات الاتصال
- `ar.json:557` `messages.searchContact` : البحث في المستخدمين والأدوار والأقسام...
- `ar.json:558` `messages.noContactsFound` : لم يتم العثور على جهات اتصال
- `ar.json:559` `messages.adjustSearch` : جرب تعديل البحث
- `ar.json:560` `messages.selected` : محدد
- `ar.json:561` `messages.crossRoleInfo` : ✨ مراسلة محسنة بين الأدوار
- `ar.json:562` `messages.canMessageAny` : • إرسال رسائل لأي مستخدم بغض النظر عن الدور أو القسم
- `ar.json:563` `messages.allUsersCanCommunicate` : • جميع المستخدمين يمكنهم التواصل: المديرون، مديرو الأقسام، مكتب التنسيق، المستخدمون العاديون
- `ar.json:564` `messages.noDepartmentRestriction` : • حدود الأقسام لا تقيد المراسلة
- `ar.json:565` `messages.messageHistory` : سجل الرسائل
- `ar.json:566` `messages.fullHistory` : ✓ سجل كامل للرسائل
- `ar.json:567` `messages.new` : جديد
- `ar.json:568` `messages.unknownUser` : مستخدم مجهول
- `ar.json:569` `messages.unknownTime` : وقت غير معروف
- `ar.json:570` `messages.noSubject` : بدون موضوع
- `ar.json:571` `messages.noContent` : بدون محتوى
- `ar.json:572` `messages.to` : إلى
- `ar.json:573` `messages.from` : من
- `ar.json:574` `messages.admin` : مدير النظام
- `ar.json:575` `messages.adminDepartment` : مدير القسم
- `ar.json:576` `messages.adminTuningDesk` : مكتب التنسيق
- `ar.json:577` `messages.user` : مستخدم
- `ar.json:578` `messages.inactive` : غير نشط
- `ar.json:579` `messages.messageDeleted` : تم حذف الرسالة
- `ar.json:580` `messages.messageDeletedPermanently` : تم حذف الرسالة نهائياً
- `ar.json:581` `messages.messagesUpdated` : تم تحديث الرسائل
- `ar.json:582` `messages.messagesListUpdated` : تم تحديث قائمة الرسائل الخاصة بك
- `ar.json:583` `folders.title` : إدارة المجلدات
- `ar.json:584` `folders.createFolder` : إنشاء مجلد
- `ar.json:585` `folders.folderName` : اسم المجلد
- `ar.json:586` `folders.selectDepartment` : اختر القسم
- `ar.json:587` `folders.create` : إنشاء
- `ar.json:588` `folders.cancel` : إلغاء
- `ar.json:589` `folders.edit` : تعديل
- `ar.json:590` `folders.delete` : حذف
- `ar.json:591` `folders.confirmDelete` : هل أنت متأكد من رغبتك في حذف هذا المجلد؟
- `ar.json:592` `folders.folderCreated` : تم إنشاء المجلد بنجاح
- `ar.json:593` `folders.folderUpdated` : تم تحديث المجلد بنجاح
- `ar.json:594` `folders.folderDeleted` : تم حذف المجلد بنجاح
- `ar.json:595` `folders.createFolderFailed` : فشل في إنشاء المجلد
- `ar.json:596` `folders.updateFolderFailed` : فشل في تحديث المجلد
- `ar.json:597` `folders.deleteFolderFailed` : فشل في حذف المجلد
- `ar.json:598` `folders.errorLoading` : خطأ في تحميل المجلدات. يرجى المحاولة مرة أخرى.
- `ar.json:599` `folders.selectFolder` : اختر مجلداً لعرض التفاصيل
- `ar.json:600` `folders.folderDetails` : تفاصيل المجلد
- `ar.json:601` `folders.folderInformation` : معلومات المجلد
- `ar.json:602` `folders.folderDocuments` : مستندات المجلد
- `ar.json:603` `folders.name` : الاسم
- `ar.json:604` `folders.status` : الحالة
- `ar.json:605` `folders.documents` : المستندات
- `ar.json:606` `folders.created` : تاريخ الإنشاء
- `ar.json:607` `folders.department` : القسم
- `ar.json:608` `folders.createdBy` : أنشئ بواسطة
- `ar.json:609` `folders.statusInProgress` : قيد التقدم
- `ar.json:610` `folders.statusClosed` : مغلق
- `ar.json:611` `folders.createNewFolder` : إنشاء مجلد جديد
- `ar.json:612` `folders.editFolderName` : تعديل اسم المجلد
- `ar.json:613` `folders.update` : تحديث
- `ar.json:614` `folders.enterFolderName` : أدخل اسم المجلد
- `ar.json:615` `folders.enterFolderNameAndDepartment` : يرجى إدخال اسم المجلد واختيار قسم
- `ar.json:616` `folders.docs` : مستند
- `ar.json:617` `roles.Director` : المدير العام
- `ar.json:618` `roles.Admin` : مدير النظام
- `ar.json:619` `roles.AdminDepartment` : مدير القسم
- `ar.json:620` `roles.AdminTuningDesk` : مكتب التنسيق
- `ar.json:621` `roles.User` : مستخدم
- `ar.json:622` `sidebar.dmsSystem` : نظام إدارة المستندات
- `ar.json:623` `sidebar.documentManagement` : إدارة المستندات
- `ar.json:624` `sidebar.dashboard` : لوحة التحكم
- `ar.json:625` `sidebar.departments` : الأقسام
- `ar.json:626` `sidebar.users` : المستخدمون
- `ar.json:627` `sidebar.incomingDocuments` : المستندات الواردة
- `ar.json:628` `sidebar.outgoingDocuments` : المستندات الصادرة
- `ar.json:629` `sidebar.folders` : المجلدات
- `ar.json:630` `sidebar.advancedSearch` : البحث المتقدم
- `ar.json:631` `sidebar.messages` : الرسائل
- `ar.json:632` `sidebar.documentOptions` : خيارات المستندات
- `ar.json:633` `sidebar.departmentDashboard` : لوحة تحكم القسم
- `ar.json:634` `sidebar.toggle` : تبديل الشريط الجانبي
- `ar.json:635` `sidebar.collapse` : طي الشريط الجانبي
- `ar.json:636` `sidebar.expand` : توسيع الشريط الجانبي
- `ar.json:637` `header.title` : نظام إدارة المستندات
- `ar.json:638` `header.departmentDashboard` : لوحة تحكم القسم
- `ar.json:639` `header.notifications` : الإشعارات
- `ar.json:640` `header.profile` : الملف الشخصي
- `ar.json:641` `header.logout` : تسجيل الخروج
- `ar.json:642` `header.menu` : القائمة
- `ar.json:643` `header.user` : المستخدم
- `ar.json:644` `header.welcome` : مرحباً
- `ar.json:645` `header.unreadMessages` : رسائل غير مقروءة
- `ar.json:646` `header.viewMessages` : عرض الرسائل
- `ar.json:647` `header.toggleSidebar` : تبديل الشريط الجانبي
- `ar.json:648` `sidebar.organizationChart` : الهيكل التنظيمي
- `ar.json:649` `sidebar.auditTrail` : سجل المراجعة
- `ar.json:650` `sidebar.setupGuide` : دليل الإعداد
- `ar.json:651` `sidebar.myProfile` : ملفي الشخصي
- `ar.json:652` `sidebar.myAttendance` : حضوري
- `ar.json:653` `sidebar.trash` : سلة المحذوفات
- `ar.json:654` `sidebar.settings` : الإعدادات
- `ar.json:655` `sidebar.systemSetup` : تهيئة النظام
- `ar.json:656` `sidebar.templates` : النماذج
- `ar.json:657` `sidebar.profileSettings` : إعدادات الملف الشخصي
- `ar.json:658` `sidebar.humanResources` : الموارد البشرية
- `ar.json:659` `sidebar.employees` : الموظفون
- `ar.json:660` `sidebar.addEmployee` : إضافة موظف
- `ar.json:661` `sidebar.absenceTypes` : أنواع الغياب
- `ar.json:662` `sidebar.attendanceRecord` : تسجيل الحضور
- `ar.json:663` `sidebar.pendingAnnouncements` : الإعلانات المعلقة
- `ar.json:664` `sidebar.employeeStatus` : وضعية الموظفين
- `ar.json:665` `sidebar.internships` : التربصات
- `ar.json:666` `header.sidebarFallback` : القائمة الجانبية
- `ar.json:667` `header.subtitle` : نظام متكامل لإدارة المراسلات الإدارية والموارد البشرية
- `ar.json:668` `header.unreadMessagesCount` : الرسائل غير المقروءة
- `ar.json:669` `header.userMenu` : قائمة المستخدم
- `ar.json:670` `header.myProfile` : ملفي الشخصي
- `ar.json:671` `header.organizationChart` : الهيكل التنظيمي
- `ar.json:672` `login.usernameRequired` : اسم المستخدم مطلوب
- `ar.json:673` `login.passwordRequired` : كلمة المرور مطلوبة
- `ar.json:674` `login.authFailed` : فشل في المصادقة
- `ar.json:675` `login.loginFailed` : فشل تسجيل الدخول
- `ar.json:676` `login.subtitle` : تسجيل الدخول إلى نظام إدارة المراسلات
- `ar.json:677` `login.appDescription` : نظام إدارة المراسلات والوثائق
- `ar.json:678` `messages.updated` : تم التحديث
- `ar.json:679` `messages.allMarkedAsRead` : تم تحديد كافة الرسائل كمقروءة
- `ar.json:680` `messages.cannotUpdateReadStatus` : تعذر تحديث حالة القراءة
- `ar.json:681` `messages.instantChat` : محادثة فورية
- `ar.json:682` `messages.pageSubtitle` : منظومة المراسلات الإدارية الرسمية والتنسيق بين الأقسام
- `ar.json:683` `messages.markAllAsRead` : تحديد الكل كمقروء
- `ar.json:684` `messages.conversationsAndInbox` : المحادثات والوارد
- `ar.json:685` `messages.sentTab` : المرسلة (Envoyés)
- `ar.json:686` `messages.contactsDirectory` : دليل جهات الاتصال
- `ar.json:687` `messages.selectInterlocutorDesc` : اختر زميلاً أو مسؤولاً من القائمة الجانبية لبدء المحادثة الفورية وعرض سجل المراسلات المتبادلة
- `ar.json:688` `messages.backToList` : العودة للقائمة
- `ar.json:689` `messages.conversationOptions` : خيارات المحادثة
- `ar.json:690` `messages.noPreviousMessages` : لا توجد رسائل سابقة في هذه المحادثة. أرسل الرسالة الأولى أدناه.
- `ar.json:691` `messages.onlineNow` : متصل الآن
- `ar.json:692` `messages.offline` : غير متصل
- `ar.json:693` `messages.maxFilesError` : الحد الأقصى هو {{max}} ملفات لكل رسالة
- `ar.json:694` `messages.fileTooLargeError` : الملف \"{{name}}\" يتجاوز الحجم المسموح به ({{maxSize}} ميغابايت)
- `ar.json:695` `messages.unsupportedFileFormat` : صيغة الملف \"{{name}}\" غير مدعومة
- `ar.json:696` `messages.attachFileCount` : إرفاق ملف ({{current}}/{{max}})
- `ar.json:697` `messages.addEmoji` : إضافة رمز تعبيري
- `ar.json:698` `messages.like` : إعجاب (👍)
- `ar.json:699` `messages.attachmentsHint` : الحد الأقصى: 3 ملفات، 10 ميغا لكل ملف
- `ar.json:700` `messages.searchConversationsOrNames` : بحث في المحادثات أو الأسماء...
- `ar.json:701` `messages.loadingConversations` : جارٍ تحميل المحادثات...
- `ar.json:702` `messages.noMatchingResults` : لا توجد نتائج بحث مطابقة
- `ar.json:703` `messages.noConversationsYet` : لا توجد محادثات حتى الآن
- `ar.json:704` `messages.tryOtherSearch` : جرب البحث بكلمات أخرى
- `ar.json:705` `messages.clickNewMessageToStart` : انقر على \"رسالة جديدة\" لبدء محادثة
- `ar.json:706` `messages.attachmentOrDoc` : مرفق أو مستند
- `ar.json:707` `messages.confirmDeleteSingle` : هل أنت متأكد من حذف هذه الرسالة؟
- `ar.json:708` `messages.deleteError` : خطأ في الحذف
- `ar.json:709` `messages.recipientFallback` : المستلم
- `ar.json:710` `messages.readStatus` : تمت القراءة
- `ar.json:711` `messages.sentStatus` : تم الإرسال
- `ar.json:712` `messages.attachmentLoadError` : تعذر تحميل الملف المرفق
- `ar.json:713` `messages.imageAttachment` : صورة
- `ar.json:714` `messages.fileAttachment` : ملف مرفق
- `ar.json:715` `common.today` : اليوم
- `ar.json:716` `common.yesterday` : أمس
- `ar.json:717` `common.kb` : ك.ب
- `ar.json:718` `common.mb` : م.ب
- `ar.json:719` `common.bytes` : بايت
- `ar.json:720` `common.remove` : إزالة
- `ar.json:721` `common.view` : عرض
- `ar.json:722` `common.download` : تحميل
- `ar.json:723` `common.error` : خطأ
- `ar.json:724` `messages.selectContacts` : اختر المستلمين...
- `ar.json:725` `messages.searchContacts` : البحث في جهات الاتصال...
- `ar.json:726` `ai.suggestedQuery1` : مشاريع SICDA 2025
- `ar.json:727` `ai.suggestedQuery2` : فواتير STEG
- `ar.json:728` `ai.suggestedQuery3` : طلبات التربص
- `ar.json:729` `ai.requestProcessed` : تمت معالجة الطلب.
- `ar.json:730` `ai.errorMessage` : حدث خطأ أثناء الاتصال بالمساعد الذكي.
- `ar.json:731` `ai.assistant.title` : المساعد الذكي
- `ar.json:732` `ai.assistant.subtitle` : اسأل باللغة الطبيعية عن أي وثيقة أو مراسلة واردة أو صادرة
- `ar.json:733` `ai.assistant.placeholder` : اسأل عن الوثائق...
- `ar.json:734` `ai.assistant.empty` : كيف يمكنني مساعدتك؟
- `ar.json:735` `ai.assistant.loading` : جاري البحث وتحليل الوثائق...
- `ar.json:736` `ai.assistant.searchExamples` : أمثلة للبحث :
- `ar.json:737` `ai.assistant.sourcesCount` : الوثائق
- `ar.json:738` `ai.assistant.untitled` : بدون عنوان
- `ar.json:739` `ai.assistant.clearHistory` : تم مسح السجل
- `ar.json:740` `ai.assistant.clearHistoryAria` : مسح السجل
- `ar.json:741` `ai.assistant.resetPosition` : تم إعادة التعيين
- `ar.json:742` `ai.assistant.openAria` : فتح المساعد الذكي
- `ar.json:743` `ai.assistant.iconTooltip` : انقر للفتح • اسحب للتحريك • دبل-كليك للتصفير
- `ar.json:744` `ai.assistant.dragTooltip` : اسحب لتحريك النافذة
- `ar.json:745` `ai.assistant.send` : إرسال
- `ar.json:746` `ai.assistant.close` : إغلاق
- `ar.json:747` `ai.assistant.noResults` : لم أجد أي وثيقة مطابقة
- `ar.json:748` `sidebar.mailAndDocuments` : البريد والمستندات
- `ar.json:749` `sidebar.tools` : الأدوات
- `ar.json:750` `sidebar.profileAndAttendance` : الملف والحضور
- `ar.json:751` `sidebar.administration` : الإدارة
- `ar.json:752` `common.refresh` : تحديث
- `ar.json:753` `common.cancel` : إلغاء
- `ar.json:754` `common.previous` : السابق
- `ar.json:755` `common.next` : التالي
- `ar.json:756` `common.optional` : اختياري
- `ar.json:757` `common.back` : العودة
- `ar.json:758` `common.save` : حفظ
- `ar.json:759` `common.delete` : حذف
- `ar.json:760` `common.edit` : تعديل
- `ar.json:761` `common.actions` : الإجراءات
- `ar.json:762` `users.title` : إدارة المستخدمين
- `ar.json:763` `users.subtitle` : إدارة حسابات المستخدمين والأدوار وصلاحيات الوصول
- `ar.json:764` `users.addUser` : إضافة مستخدم جديد
- `ar.json:765` `users.refreshList` : تحديث القائمة
- `ar.json:766` `users.totalUsers` : إجمالي المستخدمين
- `ar.json:767` `users.activeAccounts` : الحسابات النشطة
- `ar.json:768` `users.inactiveAccounts` : الحسابات المعطلة
- `ar.json:769` `users.supervisorsAndManagers` : المشرفون والمدراء
- `ar.json:770` `users.showingResults` : عرض من {{from}} إلى {{to}} من أصل {{total}}
- `ar.json:771` `users.filterAndSearch` : تصفية وبحث المستخدمين
- `ar.json:772` `users.searchPlaceholder` : بحث باسم المستخدم...
- `ar.json:773` `users.filterByRole` : تصفية حسب الدور
- `ar.json:774` `users.allRoles` : جميع الأدوار
- `ar.json:775` `users.filterByDepartment` : تصفية حسب القسم
- `ar.json:776` `users.allDepartments` : جميع الأقسام
- `ar.json:777` `users.filterByStatus` : تصفية حسب الحالة
- `ar.json:778` `users.allStatuses` : جميع الحالات
- `ar.json:779` `users.activeOnly` : حسابات نشطة فقط
- `ar.json:780` `users.inactiveOnly` : حسابات معطلة فقط
- `ar.json:781` `users.resetFilters` : إعادة ضبط التصفية
- `ar.json:782` `users.table.photo` : الصورة
- `ar.json:783` `users.table.username` : اسم المستخدم
- `ar.json:784` `users.table.role` : الدور
- `ar.json:785` `users.table.departments` : القسم / الأقسام
- `ar.json:786` `users.table.status` : الحالة
- `ar.json:787` `users.table.createdAt` : تاريخ الإنشاء
- `ar.json:788` `users.table.actions` : الإجراءات
- `ar.json:789` `users.table.noDepartment` : لا يوجد قسم
- `ar.json:790` `users.table.noUsersFound` : لا توجد نتائج مطابقة لمعايير البحث والتصفية المحددة.
- `ar.json:791` `users.table.statusActive` : نشط
- `ar.json:792` `users.table.statusInactive` : معطل
- `ar.json:793` `users.actions.editOptions` : خيارات التعديل
- `ar.json:794` `users.actions.editUser` : تعديل المستخدم
- `ar.json:795` `users.actions.changePassword` : تغيير كلمة المرور
- `ar.json:796` `users.actions.activateAccount` : تنشيط الحساب
- `ar.json:797` `users.actions.deactivateAccount` : تعطيل الحساب
- `ar.json:798` `users.actions.deleteUser` : حذف المستخدم نهائياً
- `ar.json:799` `users.deleteDialog.title` : تأكيد حذف حساب المستخدم
- `ar.json:800` `users.deleteDialog.description` : سيؤدي هذا الإجراء إلى حذف حساب المستخدم نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.
- `ar.json:801` `users.deleteDialog.confirm` : نعم، تأكيد الحذف
- `ar.json:802` `users.deleteDialog.deleting` : جاري الحذف...
- `ar.json:803` `users.notifications.listUpdated` : تم تحديث قائمة المستخدمين
- `ar.json:804` `users.notifications.deleteSuccess` : تم حذف حساب المستخدم بنجاح
- `ar.json:805` `users.notifications.deleteFailed` : فشل في حذف المستخدم
- `ar.json:806` `users.notifications.statusUpdated` : تم تحديث حالة المستخدم بنجاح
- `ar.json:807` `users.notifications.statusUpdateFailed` : فشل في تحديث حالة المستخدم
- `ar.json:808` `users.roles.director` : مدير الإدارة (Director)
- `ar.json:809` `users.roles.admin` : مدير (Admin)
- `ar.json:810` `users.roles.adminDepartment` : مدير قسم (AdminDepartment)
- `ar.json:811` `users.roles.adminTuningDesk` : مدير المكتب (AdminTuningDesk)
- `ar.json:812` `users.roles.user` : مستخدم عادي (User)
- `ar.json:813` `users.roles.directorShort` : مدير الإدارة
- `ar.json:814` `users.roles.adminShort` : مدير
- `ar.json:815` `users.roles.adminDepartmentShort` : مدير قسم
- `ar.json:816` `users.roles.adminTuningDeskShort` : مدير المكتب
- `ar.json:817` `users.roles.userShort` : مستخدم
- `ar.json:818` `users.create.title` : إضافة مستخدم جديد
- `ar.json:819` `users.create.subtitle` : إنشاء حساب مستخدم جديد وتحديد دوره والأقسام التابع لها
- `ar.json:820` `users.create.backToList` : العودة لقائمة المستخدمين
- `ar.json:821` `users.create.photoTitle` : الصورة الشخصية
- `ar.json:822` `users.create.optionalBadge` : اختيارية
- `ar.json:823` `users.create.photoPreview` : معاينة الصورة
- `ar.json:824` `users.create.removePhoto` : حذف الصورة
- `ar.json:825` `users.create.changePhoto` : تغيير الصورة المحددة
- `ar.json:826` `users.create.choosePhoto` : اختيار صورة من الجهاز
- `ar.json:827` `users.create.cancelSelection` : إلغاء التحديد
- `ar.json:828` `users.create.photoSizeInfo` : الحد الأقصى المسموح به لحجم الصورة 5 ميجابايت • الصيغ المدعومة: JPG, PNG, GIF
- `ar.json:829` `users.create.photoSize` : الحجم: {{size}} ميجابايت
- `ar.json:830` `users.create.successToast` : تم إنشاء المستخدم بنجاح
- `ar.json:831` `users.create.errorToast` : فشل في إنشاء المستخدم
- `ar.json:832` `users.create.photoTooLarge` : حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت
- `ar.json:833` `users.create.invalidPhotoType` : يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF)
- `ar.json:834` `users.create.loadingDepts` : جاري تحميل بيانات الأقسام والصلاحيات...
- `ar.json:835` `users.create.accessDenied` : Accès refusé — Seul l'administrateur système peut créer des comptes
- `ar.json:836` `users.create.linkedPersonnelSuccess` : تم إنشاء الحساب وربط بطاقة الموظف بنجاح
- `ar.json:837` `users.create.linkedPersonnelWarning` : تم إنشاء الحساب، ولكن فشل الربط ببطاقة الموظف. يرجى إعادة المحاولة من وحدة الموارد البشرية
- `ar.json:838` `users.edit.title` : تعديل بيانات المستخدم: {{username}}
- `ar.json:839` `users.edit.subtitle` : تحديث الدور والصلاحيات والأقسام التابعة للحساب
- `ar.json:840` `users.edit.backToList` : العودة للمستخدمين
- `ar.json:841` `users.edit.photoTitle` : الصورة الشخصية للحساب
- `ar.json:842` `users.edit.changePhoto` : تغيير الصورة المحددة
- `ar.json:843` `users.edit.chooseNewPhoto` : اختيار صورة جديدة
- `ar.json:844` `users.edit.uploadingPhoto` : جاري رفع الصورة...
- `ar.json:845` `users.edit.savePhoto` : حفظ الصورة الجديدة
- `ar.json:846` `users.edit.selectedPhoto` : الصورة المختارة: {{name}}
- `ar.json:847` `users.edit.additionalInfo` : معلومات الحساب الإضافية
- `ar.json:848` `users.edit.createdAt` : تاريخ الإنشاء
- `ar.json:849` `users.edit.currentStatus` : الحالة الحالية
- `ar.json:850` `users.edit.accountActive` : حساب نشط
- `ar.json:851` `users.edit.accountInactive` : حساب معطل
- `ar.json:852` `users.edit.registeredRole` : الدور المسجل
- `ar.json:853` `users.edit.linkedDepartments` : الأقسام المرتبطة
- `ar.json:854` `users.edit.noDepartmentSpecified` : لا يوجد قسم محدد
- `ar.json:855` `users.edit.userNotFound` : المستخدم غير موجود
- `ar.json:856` `users.edit.userNotFoundDesc` : تعذر العثور على الحساب المطلوب في قاعدة البيانات.
- `ar.json:857` `users.edit.unauthorized` : غير مصرح لك بالوصول
- `ar.json:858` `users.edit.unauthorizedDesc` : ليس لديك الصلاحيات الكافية لتعديل بيانات هذا المستخدم.
- `ar.json:859` `users.edit.accessDenied` : Accès refusé — Seul l'administrateur système peut modifier des comptes
- `ar.json:860` `users.edit.loadingUser` : جاري تحميل بيانات المستخدم...
- `ar.json:861` `users.edit.updateSuccess` : تم تحديث المستخدم بنجاح
- `ar.json:862` `users.edit.updateFailed` : فشل في تحديث المستخدم
- `ar.json:863` `users.edit.photoUploadSuccess` : تم رفع وتحديث الصورة الشخصية بنجاح
- `ar.json:864` `users.edit.photoUploadFailed` : فشل في رفع الصورة
- `ar.json:865` `users.form.basicInfo` : المعلومات الأساسية
- `ar.json:866` `users.form.username` : اسم المستخدم
- `ar.json:867` `users.form.usernamePlaceholder` : أدخل اسم المستخدم (مثال: ahmad_ali)
- `ar.json:868` `users.form.usernameHelp` : اسم فريد يُستخدم لتسجيل الدخول والتعريف في النظام
- `ar.json:869` `users.form.password` : كلمة المرور
- `ar.json:870` `users.form.passwordPlaceholder` : أدخل كلمة المرور (6 أحرف على الأقل)
- `ar.json:871` `users.form.passwordHelp` : يُفضل استخدام مزيج من الأحرف والأرقام لضمان حماية الحساب
- `ar.json:872` `users.form.roleAndPermissions` : الدور والصلاحيات
- `ar.json:873` `users.form.roleLabel` : الدور الوظيفي في النظام
- `ar.json:874` `users.form.selectRole` : اختر الدور
- `ar.json:875` `users.form.currentSelectedRole` : الدور الحالي المحدد:
- `ar.json:876` `users.form.directorNotice` : ملاحظة: يُسمح بمدير إدارة واحد فقط. يرجى التأكد من عدم وجود مدير إدارة آخر.
- `ar.json:877` `users.form.departments` : الأقسام التابعة
- `ar.json:878` `users.form.departmentPlural` : أقسام
- `ar.json:879` `users.form.departmentSingle` : قسم
- `ar.json:880` `users.form.noDepartmentsAvailable` : لا توجد أقسام متاحة
- `ar.json:881` `users.form.personnelCard` : بطاقة الموظف المرتبطة (Fiche Personnel associée)
- `ar.json:882` `users.form.hrModule` : الموارد البشرية
- `ar.json:883` `users.form.selectPersonnel` : اختر موظفًا
- `ar.json:884` `users.form.choosePersonnelFile` : اختيار ملف الموظف
- `ar.json:885` `users.form.createNewPersonnel` : إنشاء بطاقة موظف جديدة
- `ar.json:886` `users.form.personnelRequired` : بطاقة الموظف إلزامية لهذا الدور. يرجى اختيار بطاقة من القائمة.
- `ar.json:887` `users.form.fullName` : الاسم الكامل:
- `ar.json:888` `users.form.cin` : رقم البطاقة الوطنية (CIN):
- `ar.json:889` `users.form.noCin` : بدون رقم ب.ت.و
- `ar.json:890` `users.form.administrativeDept` : القسم الإداري:
- `ar.json:891` `users.form.positionRank` : المنصب / الرتبة:
- `ar.json:892` `users.form.cancelAndBack` : إلغاء والعودة
- `ar.json:893` `users.form.createUser` : إنشاء المستخدم
- `ar.json:894` `users.form.saveChanges` : حفظ التعديلات
- `ar.json:895` `users.form.saving` : جاري الحفظ...
- `ar.json:896` `users.form.resetPassword` : إعادة تعيين كلمة المرور
- `ar.json:897` `users.passwordDialog.title` : تحديث كلمة المرور
- `ar.json:898` `users.passwordDialog.newPassword` : كلمة المرور الجديدة
- `ar.json:899` `users.passwordDialog.newPasswordPlaceholder` : أدخل كلمة المرور الجديدة
- `ar.json:900` `users.passwordDialog.confirmPassword` : تأكيد كلمة المرور
- `ar.json:901` `users.passwordDialog.confirmPasswordPlaceholder` : أعد إدخال كلمة المرور للتأكيد
- `ar.json:902` `users.passwordDialog.updating` : جاري التحديث...
- `ar.json:903` `users.passwordDialog.updateButton` : تحديث كلمة المرور
- `ar.json:904` `users.passwordDialog.successToast` : تم تحديث كلمة المرور بنجاح
- `ar.json:905` `users.passwordDialog.errorToast` : فشل في تحديث كلمة المرور
- `ar.json:906` `users.passwordDialog.mismatchError` : كلمة المرور وتأكيدها غير متطابقين
- `ar.json:907` `users.passwordDialog.minLengthError` : كلمة المرور يجب أن تكون 6 أحرف على الأقل
- `ar.json:908` `users.passwordDialog.requiredError` : يرجى إدخال كلمة المرور الجديدة
- `ar.json:909` `users.delete.success` : تم حذف حساب المستخدم بنجاح
- `ar.json:910` `users.delete.error` : فشل في حذف المستخدم
- `ar.json:911` `users.status.updateSuccess` : تم تحديث حالة المستخدم بنجاح
- `ar.json:912` `users.status.updateError` : فشل في تحديث حالة المستخدم
- `ar.json:913` `users.refresh.success` : تم تحديث قائمة المستخدمين
- `ar.json:914` `users.page.title` : إدارة المستخدمين
- `ar.json:915` `users.page.subtitle` : عرض وإدارة حسابات المستخدمين وصلاحياتهم وأقسامهم في المنظومة
- `ar.json:916` `users.metrics.total` : إجمالي المستخدمين
- `ar.json:917` `users.metrics.active` : الحسابات النشطة
- `ar.json:918` `users.metrics.inactive` : الحسابات المعطلة
- `ar.json:919` `users.metrics.admins` : المشرفون والمدراء
- `ar.json:920` `users.filters.title` : تصفية وبحث المستخدمين
- `ar.json:921` `users.filters.reset` : إعادة ضبط التصفية
- `ar.json:922` `users.filters.searchPlaceholder` : بحث باسم المستخدم...
- `ar.json:923` `users.filters.byRole` : تصفية حسب الدور
- `ar.json:924` `users.filters.allRoles` : جميع الأدوار
- `ar.json:925` `users.role.director` : مدير الإدارة (Director)
- `ar.json:926` `users.role.admin` : مدير (Admin)
- `ar.json:927` `users.role.adminDepartment` : مدير قسم (AdminDepartment)
- `ar.json:928` `users.role.adminTuningDesk` : مدير المكتب (AdminTuningDesk)
- `ar.json:929` `users.role.user` : مستخدم عادي (User)
- `ar.json:930` `users.filters.byDepartment` : تصفية حسب القسم
- `ar.json:931` `users.filters.allDepartments` : جميع الأقسام
- `ar.json:932` `users.filters.byStatus` : تصفية حسب الحالة
- `ar.json:933` `users.filters.allStatuses` : جميع الحالات
- `ar.json:934` `users.filters.activeOnly` : حسابات نشطة فقط
- `ar.json:935` `users.filters.inactiveOnly` : حسابات معطلة فقط
- `ar.json:936` `users.filters.noResults` : لا توجد نتائج مطابقة لمعايير البحث والتصفية المحددة.
- `ar.json:937` `users.badge.director` : مدير الإدارة
- `ar.json:938` `users.badge.admin` : مدير
- `ar.json:939` `users.badge.adminDepartment` : مدير قسم
- `ar.json:940` `users.badge.adminTuningDesk` : مدير المكتب
- `ar.json:941` `users.badge.user` : مستخدم
- `ar.json:942` `users.noDepartment` : لا يوجد قسم
- `ar.json:943` `users.status.active` : نشط
- `ar.json:944` `users.status.inactive` : معطل
- `ar.json:945` `users.menu.editOptions` : خيارات التعديل
- `ar.json:946` `users.menu.edit` : تعديل المستخدم
- `ar.json:947` `users.menu.changePassword` : تغيير كلمة المرور
- `ar.json:948` `users.status.deactivate` : تعطيل الحساب
- `ar.json:949` `users.status.activate` : تنشيط الحساب
- `ar.json:950` `users.delete.userLabel` : حذف المستخدم نهائياً
- `ar.json:951` `users.paginationInfo` : عرض {{from}} إلى {{to}} من أصل {{total}} مستخدم
- `ar.json:952` `users.delete.confirmTitle` : تأكيد حذف حساب المستخدم
- `ar.json:953` `users.delete.confirmDescription` : هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً من المنظومة؟ هذا الإجراء غير قابل للتراجع وسيؤدي إلى إلغاء صلاحيات المستخدم بالكامل.
- `ar.json:954` `users.delete.deleting` : جاري الحذف...
- `ar.json:955` `users.delete.confirmButton` : نعم، تأكيد الحذف
- `ar.json:956` `common.home` : الرئيسية
- `ar.json:957` `incoming.page.title` : الوثائق والمراسلات الواردة
- `ar.json:958` `incoming.page.subtitle` : تسجيل ومتابعة المراسلات الإدارية الواردة، معالجة الردود، التعيين والأرشفة
- `ar.json:959` `incoming.page.breadcrumb` : الوثائق والمراسلات الواردة
- `ar.json:960` `incoming.page.home` : الرئيسية
- `ar.json:961` `incoming.toasts.deleteSuccess` : تم حذف الوثيقة الواردة بنجاح
- `ar.json:962` `incoming.toasts.deleteError` : فشل في حذف الوثيقة الواردة
- `ar.json:963` `incoming.toasts.noDocsToExport` : لا توجد وثائق لتصديرها في القائمة الحالية
- `ar.json:964` `incoming.toasts.downloadStarting` : جاري بدء تحميل ملف PDF...
- `ar.json:965` `incoming.toasts.downloadSuccess` : تم تحميل الملف بنجاح
- `ar.json:966` `incoming.toasts.downloadError` : تعذر تحميل ملف PDF
- `ar.json:967` `incoming.toasts.noScannedDoc` : لا يوجد ملف ممسوح ضوئياً لهذه الوثيقة
- `ar.json:968` `incoming.exportPdf.title` : قائمة الوثائق والمراسلات الواردة
- `ar.json:969` `incoming.exportPdf.subtitle` : سنة {{year}} - العدد الإجمالي: {{count}} وثيقة
- `ar.json:970` `incoming.exportPdf.fileName` : الوثائق_الواردة_{{year}}
- `ar.json:971` `incoming.exportPdf.footer` : نظام إدارة المراسلات والوثائق الإدارية
- `ar.json:972` `incoming.exportPdf.colSerial` : الرقم التسلسلي
- `ar.json:973` `incoming.exportPdf.colArrivalDate` : تاريخ الوصول
- `ar.json:974` `incoming.exportPdf.colSubject` : الموضوع
- `ar.json:975` `incoming.exportPdf.colSource` : المصدر
- `ar.json:976` `incoming.exportPdf.colType` : نوع الوثيقة
- `ar.json:977` `incoming.exportPdf.colStatus` : الحالة
- `ar.json:978` `incoming.yearModal.title` : تحديد سنة التسجيل
- `ar.json:979` `incoming.yearModal.description` : يرجى إدخال سنة كاملة مكونة من 4 أرقام (مثال: {{year}}) لعرض وثائق ومراسلات الوارد.
- `ar.json:980` `incoming.yearModal.incomplete` : يرجى إكمال إدخال السنة (4 أرقام)
- `ar.json:981` `incoming.yearModal.confirmButton` : تأكيد وعرض الوثائق
- `ar.json:982` `incoming.yearModal.quickYears` : سنوات سريعة:
- `ar.json:983` `incoming.error.title` : حدث خطأ أثناء تحميل المستندات
- `ar.json:984` `incoming.error.description` : تعذر الاتصال بقاعدة البيانات لاسترجاع الوثائق الواردة. يرجى التحقق من الاتصال وإعادة المحاولة.
- `ar.json:985` `incoming.error.retry` : إعادة المحاولة
- `ar.json:986` `incoming.stats.totalDocs` : {{count}} وثيقة واردة
- `ar.json:987` `incoming.stats.totalDocsTooltip` : إجمالي الوثائق المسجلة في هذه السنة
- `ar.json:988` `incoming.stats.allDepartments` : كافة الأقسام (مدير الإدارة)
- `ar.json:989` `incoming.stats.allDepartmentsTooltip` : اطلاع شامل على كافة وثائق ومراسلات الإدارة
- `ar.json:990` `incoming.stats.activeYear` : سنة {{year}}
- `ar.json:991` `incoming.stats.activeYearTooltip` : السنة الحالية المفعلة
- `ar.json:992` `incoming.actions.exportPdf` : تصدير PDF
- `ar.json:993` `incoming.actions.exportPdfTooltip` : تصدير القائمة الحالية كملف PDF
- `ar.json:994` `incoming.actions.add` : إضافة وثيقة واردة
- `ar.json:995` `incoming.filters.searchPlaceholder` : ابحث بالرقم، الموضوع، المصدر، النشاط...
- `ar.json:996` `incoming.filters.yearPlaceholder` : السنة (مثال: 2026)
- `ar.json:997` `incoming.filters.sourcePlaceholder` : المصدر / الجهة
- `ar.json:998` `incoming.filters.allSources` : جميع المصادر
- `ar.json:999` `incoming.filters.statusPlaceholder` : حالة المعالجة
- `ar.json:1000` `incoming.filters.allStatuses` : جميع الحالات
- `ar.json:1001` `incoming.filters.pending` : بانتظار المعالجة / الرد
- `ar.json:1002` `incoming.filters.answered` : تم الرد عليها (مُجاب)
- `ar.json:1003` `incoming.filters.urgent` : المراسلات العاجلة
- `ar.json:1004` `incoming.filters.departmentLabel` : القسم:
- `ar.json:1005` `incoming.filters.departmentPlaceholder` : كافة الأقسام
- `ar.json:1006` `incoming.filters.allDepartments` : كافة الأقسام
- `ar.json:1007` `incoming.filters.reset` : إعادة ضبط الفلاتر
- `ar.json:1008` `incoming.filters.refreshingData` : تحديث البيانات...
- `ar.json:1009` `incoming.sort.label` : الترتيب:
- `ar.json:1010` `incoming.sort.newestArrival` : الأحدث وصولاً
- `ar.json:1011` `incoming.sort.oldestArrival` : الأقدم وصولاً
- `ar.json:1012` `incoming.sort.serialDesc` : رقم التسلسل (تنازلي)
- `ar.json:1013` `incoming.sort.serialAsc` : رقم التسلسل (تصاعدي)
- `ar.json:1014` `incoming.view.table` : جدول
- `ar.json:1015` `incoming.view.tableLabel` : عرض كجدول بيانات
- `ar.json:1016` `incoming.view.cards` : بطاقات
- `ar.json:1017` `incoming.view.cardsLabel` : عرض كبطاقات
- `ar.json:1018` `incoming.empty.title` : لا توجد وثائق واردة مطابقة
- `ar.json:1019` `incoming.empty.filtered` : لم يتم العثور على وثائق تطابق معايير الفرز أو البحث المحددة. يمكنك تعديل أو إعادة ضبط الفلاتر للاطلاع على باقي المراسلات.
- `ar.json:1020` `incoming.empty.noDocsYear` : لم يتم تسجيل أي وثائق واردة لسنة {{year}} حتى الآن.
- `ar.json:1021` `incoming.empty.showAllYear` : عرض كافة وثائق سنة {{year}}
- `ar.json:1022` `incoming.table.serialNumber` : رقم التسلسل
- `ar.json:1023` `incoming.table.subjectAndType` : الموضوع والنوع
- `ar.json:1024` `incoming.table.arrivalDate` : تاريخ الوصول
- `ar.json:1025` `incoming.table.source` : المصدر / الجهة
- `ar.json:1026` `incoming.table.status` : حالة المتابعة والرد
- `ar.json:1027` `incoming.table.actions` : الإجراءات
- `ar.json:1028` `incoming.status.answered` : تم الرد
- `ar.json:1029` `incoming.status.answeredBadge` : مُجاب
- `ar.json:1030` `incoming.status.pending` : بانتظار المعالجة
- `ar.json:1031` `incoming.source.unspecified` : غير محدد
- `ar.json:1032` `incoming.source.unspecifiedSource` : مصدر غير محدد
- `ar.json:1033` `incoming.type.general` : عام
- `ar.json:1034` `incoming.responsible.label` : المسؤول: {{name}}
- `ar.json:1035` `incoming.actions.view` : عرض
- `ar.json:1036` `incoming.actions.viewTooltip` : عرض تفاصيل الوثيقة
- `ar.json:1037` `incoming.actions.preview` : معاينة
- `ar.json:1038` `incoming.actions.previewTooltip` : معاينة الوثيقة
- `ar.json:1039` `incoming.actions.previewModal` : معاينة الوثيقة
- `ar.json:1040` `incoming.actions.process` : معالجة
- `ar.json:1041` `incoming.actions.processTooltip` : معالجة وإضافة رد
- `ar.json:1042` `incoming.actions.archive` : أرشفة
- `ar.json:1043` `incoming.actions.archiveTooltip` : أرشفة وتنظيم في مجلد
- `ar.json:1044` `incoming.actions.archiveViewTooltip` : عرض المجلد والأرشفة
- `ar.json:1045` `incoming.actions.transfer` : تحويل
- `ar.json:1046` `incoming.actions.transferTooltip` : تعيين مسؤول ومتابعة التحويل
- `ar.json:1047` `incoming.actions.more` : المزيد من الإجراءات
- `ar.json:1048` `incoming.actions.downloadPdf` : تحميل ملف PDF
- `ar.json:1049` `incoming.actions.downloading` : جاري التحميل...
- `ar.json:1050` `incoming.actions.editDoc` : تعديل الوثيقة
- `ar.json:1051` `incoming.actions.deleteDoc` : حذف الوثيقة
- `ar.json:1052` `incoming.pagination.info` : عرض {{from}} إلى {{to}} من أصل {{total}} وثيقة
- `ar.json:1053` `incoming.pagination.loadedOfTotal` : (محمّل {{loaded}} من إجمالي {{total}})
- `ar.json:1054` `incoming.pagination.loadMore` : تحميل دفعة إضافية من الخادم
- `ar.json:1055` `incoming.pagination.loadingMore` : جاري التحميل...
- `ar.json:1056` `incoming.pagination.perPage` : في كل صفحة:
- `ar.json:1057` `incoming.delete.dialogTitle` : تأكيد حذف الوثيقة الواردة
- `ar.json:1058` `incoming.delete.confirmMessage` : هل أنت متأكد من رغبتك في حذف الوثيقة رقم #{{serialNumber}} لسنة {{year}}؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
- `ar.json:1059` `incoming.delete.confirmButton` : تأكيد الحذف
- `ar.json:1060` `incoming.delete.deleting` : جاري الحذف...
- `ar.json:1061` `outgoing.page.title` : الوثائق والمراسلات الصادرة
- `ar.json:1062` `outgoing.page.headerTitle` : الوثائق الصادرة
- `ar.json:1063` `outgoing.page.headerSubtitle` : إدارة، متابعة وتوزيع المراسلات والوثائق الصادرة الرسمية لمكتب الضبط
- `ar.json:1064` `outgoing.toasts.deleteSuccess` : تم حذف الوثيقة الصادرة بنجاح
- `ar.json:1065` `outgoing.toasts.deleteError` : حدث خطأ أثناء محاولة حذف الوثيقة
- `ar.json:1066` `outgoing.toasts.noDocsToExport` : لا توجد وثائق لتصديرها في القائمة الحالية
- `ar.json:1067` `outgoing.toasts.downloadStarting` : جاري بدء تحميل الوثيقة...
- `ar.json:1068` `outgoing.toasts.downloadSuccess` : تم تحميل الوثيقة بنجاح
- `ar.json:1069` `outgoing.toasts.downloadError` : تعذر تحميل الوثيقة الرقمية
- `ar.json:1070` `outgoing.toasts.noScannedDoc` : لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة
- `ar.json:1071` `outgoing.toasts.transferSuccess` : تم تسجيل تحويل وتوجيه الوثيقة الصادرة #{{serialNumber}} بنجاح
- `ar.json:1072` `outgoing.exportPdf.title` : قائمة الوثائق والمراسلات الصادرة
- `ar.json:1073` `outgoing.exportPdf.subtitle` : سنة {{year}} - العدد الإجمالي: {{count}} وثيقة
- `ar.json:1074` `outgoing.exportPdf.colSerial` : الرقم التسلسلي
- `ar.json:1075` `outgoing.exportPdf.colIssueDate` : تاريخ الإرسال
- `ar.json:1076` `outgoing.exportPdf.colSubject` : الموضوع
- `ar.json:1077` `outgoing.exportPdf.colRecipient` : المرسل إليه
- `ar.json:1078` `outgoing.exportPdf.colType` : نوع الوثيقة
- `ar.json:1079` `outgoing.exportPdf.fileName` : الوثائق_الصادرة_{{year}}
- `ar.json:1080` `outgoing.exportPdf.footer` : نظام إدارة المراسلات والوثائق الإدارية
- `ar.json:1081` `outgoing.actions.exportPdf` : تصدير PDF
- `ar.json:1082` `outgoing.actions.exportPdfTooltip` : تصدير القائمة الحالية كملف PDF
- `ar.json:1083` `outgoing.actions.refreshTooltip` : تحديث البيانات
- `ar.json:1084` `outgoing.actions.create` : إضافة وثيقة صادرة
- `ar.json:1085` `outgoing.actions.viewTooltip` : عرض تفاصيل الوثيقة
- `ar.json:1086` `outgoing.actions.preview` : معاينة
- `ar.json:1087` `outgoing.actions.previewTooltip` : معاينة الوثيقة
- `ar.json:1088` `outgoing.actions.editTooltip` : تعديل بيانات الوثيقة
- `ar.json:1089` `outgoing.actions.archive` : أرشفة
- `ar.json:1090` `outgoing.actions.archiveTooltip` : أرشفة وتنظيم في مجلد
- `ar.json:1091` `outgoing.actions.viewArchiveTooltip` : عرض المجلد والأرشفة
- `ar.json:1092` `outgoing.actions.transfer` : تحويل
- `ar.json:1093` `outgoing.actions.transferTooltip` : تحويل وتوجيه المراسلة
- `ar.json:1094` `outgoing.actions.downloadPdfTooltip` : تحميل ملف PDF
- `ar.json:1095` `outgoing.actions.downloadPdfAria` : تحميل ملف PDF
- `ar.json:1096` `outgoing.actions.moreActions` : المزيد من الإجراءات
- `ar.json:1097` `outgoing.actions.deleteDocument` : حذف الوثيقة
- `ar.json:1098` `outgoing.filters.searchLabel` : البحث السريع
- `ar.json:1099` `outgoing.filters.searchPlaceholder` : ابحث برقم التسلسل، الموضوع، المصدر، أو الوجهة...
- `ar.json:1100` `outgoing.filters.clear` : مسح
- `ar.json:1101` `outgoing.filters.yearLabel` : سنة التسجيل
- `ar.json:1102` `outgoing.filters.departmentLabel` : القسم المصدر
- `ar.json:1103` `outgoing.filters.allDepartments` : كافة الأقسام
- `ar.json:1104` `outgoing.filters.typeLabel` : نوع الوثيقة
- `ar.json:1105` `outgoing.filters.allTypes` : كافة أنواع الوثائق
- `ar.json:1106` `outgoing.filters.allTypesPlaceholder` : كافة الأنواع
- `ar.json:1107` `outgoing.filters.folderFilterLabel` : حالة التصنيف بالأرشيف
- `ar.json:1108` `outgoing.filters.folderPlaceholder` : حالة المجلد
- `ar.json:1109` `outgoing.filters.folderAll` : الكل (مصنفة وغير مصنفة)
- `ar.json:1110` `outgoing.filters.folderCategorized` : مصنفة في مجلد
- `ar.json:1111` `outgoing.filters.folderUncategorized` : غير مصنفة بعد
- `ar.json:1112` `outgoing.filters.sortLabel` : ترتيب العرض
- `ar.json:1113` `outgoing.filters.reset` : إعادة ضبط المرشحات
- `ar.json:1114` `outgoing.sort.newestIssue` : الأحدث تاريخ إصدار
- `ar.json:1115` `outgoing.sort.oldestIssue` : الأقدم تاريخ إصدار
- `ar.json:1116` `outgoing.sort.serialDesc` : رقم التسلسل (تنازلي)
- `ar.json:1117` `outgoing.sort.serialAsc` : رقم التسلسل (تصاعدي)
- `ar.json:1118` `outgoing.stats.yearBadge` : سنة: {{year}}
- `ar.json:1119` `outgoing.stats.resultsCount` : إجمالي النتائج: {{filtered}} من {{total}} وثيقة
- `ar.json:1120` `outgoing.stats.syncing` : جاري المزامنة...
- `ar.json:1121` `outgoing.view.table` : جدول
- `ar.json:1122` `outgoing.view.tableLabel` : عرض كجدول بيانات
- `ar.json:1123` `outgoing.view.grid` : بطاقات
- `ar.json:1124` `outgoing.view.gridLabel` : عرض كبطاقات
- `ar.json:1125` `outgoing.yearValidation.title` : يرجى إدخال سنة صحيحة
- `ar.json:1126` `outgoing.yearValidation.description` : أدخل سنة كاملة مكونة من 4 أرقام (مثال: 2026) لعرض الوثائق الصادرة الخاصة بها.
- `ar.json:1127` `outgoing.empty.title` : لا توجد وثائق صادرة مطابقة
- `ar.json:1128` `outgoing.empty.filtered` : لم يتم العثور على وثائق تطابق معايير الفرز أو البحث المحددة. يمكنك تعديل أو إعادة ضبط الفلاتر للاطلاع على باقي المراسلات.
- `ar.json:1129` `outgoing.empty.noDocsYear` : لم يتم تسجيل أي وثائق صادرة لسنة {{year}} حتى الآن.
- `ar.json:1130` `outgoing.empty.showAll` : عرض كافة وثائق سنة {{year}}
- `ar.json:1131` `outgoing.table.serialNumber` : رقم التسلسل
- `ar.json:1132` `outgoing.table.subjectAndType` : الموضوع والنوع
- `ar.json:1133` `outgoing.table.issueDate` : تاريخ الإصدار
- `ar.json:1134` `outgoing.table.source` : المصدر (القسم)
- `ar.json:1135` `outgoing.table.recipients` : الموجه إليهم
- `ar.json:1136` `outgoing.table.classification` : التصنيف والأرشيف
- `ar.json:1137` `outgoing.table.attachedFile` : ملف مرفق
- `ar.json:1138` `outgoing.table.otherRecipients` : +{{count}} أخرى
- `ar.json:1139` `outgoing.status.categorizedInFolder` : مصنفة في مجلد
- `ar.json:1140` `outgoing.status.categorized` : مؤرشفة
- `ar.json:1141` `outgoing.status.uncategorized` : غير مصنفة
- `ar.json:1142` `outgoing.source.unspecified` : غير محدد
- `ar.json:1143` `outgoing.type.general` : عام
- `ar.json:1144` `outgoing.cards.issueDate` : تاريخ الإصدار: {{date}}
- `ar.json:1145` `outgoing.cards.source` : المصدر: {{source}}
- `ar.json:1146` `outgoing.pagination.info` : عرض {{from}} إلى {{to}} من أصل {{total}} وثيقة صادرة
- `ar.json:1147` `outgoing.pagination.itemsLabel` : العناصر:
- `ar.json:1148` `outgoing.delete.title` : تأكيد حذف الوثيقة الصادرة
- `ar.json:1149` `outgoing.delete.description` : هل أنت متأكد من رغبتك في حذف الوثيقة الصادرة رقم #{{serialNumber}} بشأن \"{{subject}}\"؟
- `ar.json:1150` `outgoing.delete.warning` : تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه.
- `ar.json:1151` `outgoing.delete.confirmButton` : تأكيد الحذف
- `ar.json:1152` `outgoing.delete.deleting` : جاري الحذف...
- `ar.json:1153` `outgoing.transfer.title` : تحويل وتوجيه الوثيقة الصادرة
- `ar.json:1154` `outgoing.transfer.description` : تسجيل مسار الإرسال والتوجيه الإداري للمراسلة الصادرة رقم #{{serialNumber}}
- `ar.json:1155` `outgoing.transfer.subjectLabel` : الموضوع: {{subject}}
- `ar.json:1156` `outgoing.transfer.issueDateLabel` : تاريخ الإصدار: {{date}}
- `ar.json:1157` `outgoing.transfer.sourceLabel` : المصدر: {{source}}
- `ar.json:1158` `outgoing.transfer.targetDeptLabel` : الجهة أو القسم المستهدف للتحويل
- `ar.json:1159` `outgoing.transfer.targetDeptPlaceholder` : اختر القسم أو المصلحة...
- `ar.json:1160` `outgoing.transfer.notesLabel` : تعليمات وملاحظات التوجيه
- `ar.json:1161` `outgoing.transfer.notesPlaceholder` : مثال: للإجراء والمتابعة، للتنفيذ، للإطلاع والإفادة...
- `ar.json:1162` `outgoing.transfer.defaultNotes` : للإجراء والمتابعة
- `ar.json:1163` `outgoing.transfer.confirmButton` : تأكيد التحويل والتوجيه
- `ar.json:1164` `outgoing.transfer.submitting` : جاري التسجيل...
- `ar.json:1165` `personnel.toasts.deleteSuccess` : تم حذف ملف الموظف بنجاح
- `ar.json:1166` `personnel.toasts.deleteError` : تعذر حذف ملف الموظف
- `ar.json:1167` `personnel.page.title` : إدارة الموارد البشرية
- `ar.json:1168` `personnel.page.subtitle` : سجل بطاقات الموظفين والمستخدمين وتدبير الوثائق الإدارية المرتبطة بهم
- `ar.json:1169` `personnel.actions.create` : إضافة موظف
- `ar.json:1170` `personnel.filters.title` : البحث والتصفية
- `ar.json:1171` `personnel.filters.reset` : إعادة ضبط التصفية
- `ar.json:1172` `personnel.filters.searchPlaceholder` : البحث بالاسم، اللقب، أو رقم ب.ت.و (CIN)...
- `ar.json:1173` `personnel.filters.statusPlaceholder` : تصفية حسب الحالة
- `ar.json:1174` `personnel.filters.allStatuses` : جميع الحالات
- `ar.json:1175` `personnel.filters.statusPending` : في الانتظار (En attente)
- `ar.json:1176` `personnel.filters.statusActive` : نشط (Actif)
- `ar.json:1177` `personnel.filters.statusInactive` : غير نشط (Inactif)
- `ar.json:1178` `personnel.filters.departmentPlaceholder` : تصفية حسب القسم
- `ar.json:1179` `personnel.filters.allDepartments` : جميع الأقسام
- `ar.json:1180` `personnel.table.fullName` : الاسم الكامل (Nom & Prénom)
- `ar.json:1181` `personnel.table.cin` : رقم ب.ت.و (CIN)
- `ar.json:1182` `personnel.table.position` : الوظيفة (Poste)
- `ar.json:1183` `personnel.table.department` : القسم (Département)
- `ar.json:1184` `personnel.table.status` : الحالة (Statut)
- `ar.json:1185` `personnel.table.specificDept` : قسم محدد
- `ar.json:1186` `personnel.empty.title` : لا توجد بطاقات موظفين مطابقة
- `ar.json:1187` `personnel.empty.filtered` : جرب تعديل معايير البحث والتصفية أعلاه
- `ar.json:1188` `personnel.empty.start` : يمكنك البدء بإضافة موظف جديد
- `ar.json:1189` `personnel.actions.viewTooltip` : عرض التفاصيل
- `ar.json:1190` `personnel.actions.editTooltip` : تعديل البطاقة
- `ar.json:1191` `personnel.account.linkedActive` : حساب مستخدم مرتبط ومفعّل
- `ar.json:1192` `personnel.account.linkedBadge` : حساب مرتبط
- `ar.json:1193` `personnel.account.createAccountTooltip` : إنشاء حساب مستخدم سريع للبطاقة مع بيانات الدخول (PDF)
- `ar.json:1194` `personnel.account.createAccountAria` : إنشاء حساب مستخدم
- `ar.json:1195` `personnel.actions.cannotDeleteActive` : لا يمكن حذف موظف في حالة نشط
- `ar.json:1196` `personnel.actions.deleteTooltip` : حذف بطاقة الموظف
- `ar.json:1197` `personnel.pagination.totalResults` : إجمالي النتائج: {{total}} موظف
- `ar.json:1198` `personnel.pagination.totalResultsPrefix` : إجمالي النتائج:
- `ar.json:1199` `personnel.pagination.employeeCount` : موظف
- `ar.json:1200` `personnel.pagination.perPage` : عرض:
- `ar.json:1201` `personnel.pagination.pageInfo` : الصفحة {{current}} من {{total}}
- `ar.json:1202` `personnel.delete.title` : تأكيد حذف بطاقة الموظف
- `ar.json:1203` `personnel.delete.description` : هل أنت متأكد من رغبتك في حذف بطاقة الموظف {{name}}{{cin}}؟
- `ar.json:1204` `personnel.delete.warning` : هذا الإجراء نهائي ولا يمكن التراجع عنه.
- `ar.json:1205` `personnel.delete.confirmButton` : تأكيد الحذف
- `ar.json:1206` `personnel.delete.deleting` : جاري الحذف...
- `ar.json:1207` `hr.form.steps.identity` : الهوية والمعلومات الشخصية
- `ar.json:1208` `hr.form.steps.family` : الوضع العائلي
- `ar.json:1209` `hr.form.steps.admin` : الوضع الإداري والمهني
- `ar.json:1210` `hr.form.steps.contacts` : جهات الاتصال للطوارئ
- `ar.json:1211` `hr.form.steps.stepCount` : الخطوة {{current}} من {{total}}
- `ar.json:1212` `hr.form.nav.previous` : السابق
- `ar.json:1213` `hr.form.nav.next` : التالي
- `ar.json:1214` `hr.form.nav.save` : حفظ الموظف
- `ar.json:1215` `hr.form.nav.cancel` : إلغاء
- `ar.json:1216` `hr.form.nav.saving` : جاري الحفظ...
- `ar.json:1217` `hr.form.validation.requiredStep1` : يرجى ملء الحقول الإلزامية في هذه الخطوة قبل المتابعة
- `ar.json:1218` `common.retry` : إعادة المحاولة
- `ar.json:1219` `common.loadErrorTitle` : تعذر تحميل البيانات
- `ar.json:1220` `common.loadErrorDescription` : حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.
- `ar.json:1221` `dashboard.error.serverConnection` : خطأ في الاتصال بالخادم. تعذر تحميل الإحصائيات.
- `ar.json:1222` `outgoing.error.title` : تعذر تحميل الوثائق الصادرة
- `ar.json:1223` `outgoing.error.description` : حدث خطأ أثناء تحميل قائمة الوثائق الصادرة.
- `ar.json:1224` `users.error.title` : تعذر تحميل قائمة المستخدمين
- `ar.json:1225` `users.error.description` : حدث خطأ أثناء جلب بيانات حسابات المستخدمين.
- `ar.json:1226` `departments.error.title` : تعذر تحميل قائمة الأقسام
- `ar.json:1227` `departments.error.description` : حدث خطأ أثناء جلب بيانات الأقسام.
- `ar.json:1228` `departments.empty.title` : لا توجد أقسام مطابقة
- `ar.json:1229` `departments.empty.filtered` : لا توجد أقسام مطابقة لمعايير البحث والتصفية المحددة.
- `ar.json:1230` `departments.empty.reset` : إعادة ضبط التصفية
- `ar.json:1231` `personnel.error.title` : تعذر تحميل قائمة الموظفين
- `ar.json:1232` `personnel.error.description` : حدث خطأ أثناء تحميل بطاقات الموظفين.
- `ar.json:1233` `messages.error.title` : تعذر تحميل الرسائل
- `ar.json:1234` `messages.error.description` : حدث خطأ أثناء تحميل المحادثات.
- `ar.json:1235` `folders.error.title` : تعذر تحميل المجلدات
- `ar.json:1236` `folders.error.description` : حدث خطأ أثناء تحميل هيكل المجلدات.
- `ar.json:1237` `folders.empty.searchTitle` : لا توجد مجلدات مطابقة لمعايير البحث
- `ar.json:1238` `folders.empty.noFoldersTitle` : لا توجد مجلدات مسجلة في هذا القسم
- `ar.json:1239` `folders.empty.createFirst` : إنشاء المجلد الأول الآن
- `ar.json:1240` `folders.loading` : جاري تحميل هيكل المجلدات...
- `ar.json:1241` `sidebar.openMenu` : فتح قائمة التنقل
- `ar.json:1242` `sidebar.closeMenu` : إغلاق قائمة التنقل
- `ar.json:1243` `common.preview` : معاينة
- `ar.json:1244` `common.close` : إغلاق
- `ar.json:1245` `common.pagination` : التنقل بين الصفحات
- `ar.json:1246` `common.pageNumber` : الصفحة {{page}}
- `ar.json:1247` `departments.actions.viewAria` : عرض تفاصيل ومنسوبي القسم
- `ar.json:1248` `departments.actions.editAria` : تعديل بيانات القسم
- `ar.json:1249` `departments.actions.deactivateAria` : تعطيل القسم
- `ar.json:1250` `departments.actions.activateAria` : تنشيط القسم
- `ar.json:1251` `departments.actions.deleteAria` : حذف القسم نهائياً
- `ar.json:1252` `departments.actions.assignUnitAria` : تخصيص الوحدة الوظيفية أو قسم الموارد البشرية
- `ar.json:1253` `departments.paginationInfo` : عرض {{from}} إلى {{to}} من أصل {{total}} قسم
- `ar.json:1254` `backup.backToSettingsAria` : العودة للإعدادات
- `ar.json:1255` `backup.actions.restoreAria` : استعادة هذه النسخة
- `ar.json:1256` `backup.actions.downloadAria` : تحميل النسخة الاحتياطية
- `ar.json:1257` `backup.actions.deleteAria` : حذف النسخة نهائياً
- `ar.json:1258` `backup.actions.savePathAria` : حفظ كمسار افتراضي
- `ar.json:1259` `attendance.declarations.editAria` : تعديل التصريح
- `ar.json:1260` `attendance.declarations.clearDateAria` : مسح تصفية التاريخ
- `ar.json:1261` `messages.deselectUserAria` : إلغاء تحديد {{username}}
- `ar.json:1262` `messages.removeRecipientAria` : إزالة {{username}}

</details>

<details>
<summary><strong>1.4.2 Inventaire intégral des chaînes arabes codées en dur dans <code>src/</code> (175 fichiers actifs)</strong></summary>

#### `src/components/ai/DocumentAIAssistant.tsx` (42 lignes)
- `src/components/ai/DocumentAIAssistant.tsx:80` : النص قصير جداً لإنشاء تلخيص (الحد الأدنى 50 حرفاً)
- `src/components/ai/DocumentAIAssistant.tsx:97` : تم إنشاء الملخص الذكي بنجاح
- `src/components/ai/DocumentAIAssistant.tsx:110` : النص قصير جداً للترجمة
- `src/components/ai/DocumentAIAssistant.tsx:127` : تمت ترجمة النص بنجاح
- `src/components/ai/DocumentAIAssistant.tsx:148` : تم نسخ النص إلى الحافظة
- `src/components/ai/DocumentAIAssistant.tsx:150` : تعذر النسخ إلى الحافظة
- `src/components/ai/DocumentAIAssistant.tsx:160` : عاجل جداً
- `src/components/ai/DocumentAIAssistant.tsx:168` : عاجل
- `src/components/ai/DocumentAIAssistant.tsx:175` : عادي
- `src/components/ai/DocumentAIAssistant.tsx:190` : المساعد الذكي للوثائق
- `src/components/ai/DocumentAIAssistant.tsx:192` : ذكاء اصطناعي محلي
- `src/components/ai/DocumentAIAssistant.tsx:196` : التلخيص التلقائي والترجمة الفورية المعتمدة للنصوص الإدارية (AR ↔ FR)
- `src/components/ai/DocumentAIAssistant.tsx:213` : التلخيص الذكي
- `src/components/ai/DocumentAIAssistant.tsx:225` : الترجمة الإدارية
- `src/components/ai/DocumentAIAssistant.tsx:239` : طول الملخص :
- `src/components/ai/DocumentAIAssistant.tsx:250` : موجز (~100 كلمة)
- `src/components/ai/DocumentAIAssistant.tsx:261` : عادي (~200 كلمة)
- `src/components/ai/DocumentAIAssistant.tsx:272` : مفصل (~350 كلمة)
- `src/components/ai/DocumentAIAssistant.tsx:287` : جاري التلخيص بالذكاء الاصطناعي...
- `src/components/ai/DocumentAIAssistant.tsx:292` : إعادة التلخيص | توليد ملخص المراسلة
- `src/components/ai/DocumentAIAssistant.tsx:311` : إعادة المحاولة
- `src/components/ai/DocumentAIAssistant.tsx:323` : جاري تحليل النص واستخراج جوهر المراسلة الرسمية...
- `src/components/ai/DocumentAIAssistant.tsx:326` : يتم المعالجة عبر النموذج الإداري المحلي (Qwen) في سرية وأمان تام
- `src/components/ai/DocumentAIAssistant.tsx:337` : ملخص المراسلة الرسمية :
- `src/components/ai/DocumentAIAssistant.tsx:342` : العربية | الفرنسية | مزدوجة
- `src/components/ai/DocumentAIAssistant.tsx:357` : تم النسخ
- `src/components/ai/DocumentAIAssistant.tsx:362` : نسخ الملخص
- `src/components/ai/DocumentAIAssistant.tsx:377` : أهم النقاط والقرارات الواردة بالمراسلة :
- `src/components/ai/DocumentAIAssistant.tsx:395` : توليد ملخص المراسلة | "توليد ملخص المراسلة"
- `src/components/ai/DocumentAIAssistant.tsx:409` : اتجاه الترجمة :
- `src/components/ai/DocumentAIAssistant.tsx:420` : إلى الفرنسية (Vers le français)
- `src/components/ai/DocumentAIAssistant.tsx:431` : إلى العربية (Vers l'arabe)
- `src/components/ai/DocumentAIAssistant.tsx:446` : جاري الترجمة الفورية...
- `src/components/ai/DocumentAIAssistant.tsx:451` : إعادة الترجمة | ترجمة نص الوثيقة
- `src/components/ai/DocumentAIAssistant.tsx:470` : إعادة المحاولة
- `src/components/ai/DocumentAIAssistant.tsx:482` : جاري ترجمة المراسلة الإدارية مع الحفاظ على الصياغة الرسمية...
- `src/components/ai/DocumentAIAssistant.tsx:485` : ترجمة مطابقة للمصطلحات الإدارية التونسية المعتمدة
- `src/components/ai/DocumentAIAssistant.tsx:496` : باللغة الفرنسية | باللغة العربية
- `src/components/ai/DocumentAIAssistant.tsx:499` : عربي | فرنسي | عربي | فرنسي
- `src/components/ai/DocumentAIAssistant.tsx:513` : تم النسخ
- `src/components/ai/DocumentAIAssistant.tsx:518` : نسخ الترجمة
- `src/components/ai/DocumentAIAssistant.tsx:535` : ترجمة نص الوثيقة | "ترجمة نص الوثيقة"

#### `src/components/attendance/AllPersonnelDayView.tsx` (33 lignes)
- `src/components/attendance/AllPersonnelDayView.tsx:104` : اليوم السابق
- `src/components/attendance/AllPersonnelDayView.tsx:107` : اليوم السابق
- `src/components/attendance/AllPersonnelDayView.tsx:116` : اليوم
- `src/components/attendance/AllPersonnelDayView.tsx:124` : اليوم الموالي
- `src/components/attendance/AllPersonnelDayView.tsx:126` : اليوم الموالي
- `src/components/attendance/AllPersonnelDayView.tsx:152` : بحث بالاسم أو اللقب أو ب.ت.و...
- `src/components/attendance/AllPersonnelDayView.tsx:165` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelDayView.tsx:170` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelDayView.tsx:185` : كل الحالات
- `src/components/attendance/AllPersonnelDayView.tsx:189` : كل الحالات
- `src/components/attendance/AllPersonnelDayView.tsx:192` : حاضر فقط
- `src/components/attendance/AllPersonnelDayView.tsx:195` : غائب فقط
- `src/components/attendance/AllPersonnelDayView.tsx:198` : في تكوين
- `src/components/attendance/AllPersonnelDayView.tsx:201` : في خدمة / مهمة
- `src/components/attendance/AllPersonnelDayView.tsx:204` : غير مسجل بعد
- `src/components/attendance/AllPersonnelDayView.tsx:215` : جاري تحميل سجل الحضور لليوم...
- `src/components/attendance/AllPersonnelDayView.tsx:221` : لا يوجد موظفون يطابقون معايير البحث المحددة
- `src/components/attendance/AllPersonnelDayView.tsx:224` : يرجى ضبط معايير البحث أو اختيار قسم مختلف
- `src/components/attendance/AllPersonnelDayView.tsx:232` : الصورة
- `src/components/attendance/AllPersonnelDayView.tsx:233` : الموظف (الاسم واللقب)
- `src/components/attendance/AllPersonnelDayView.tsx:234` : الوظيفة
- `src/components/attendance/AllPersonnelDayView.tsx:235` : القسم / المصلحة
- `src/components/attendance/AllPersonnelDayView.tsx:236` : الحالة اليومية
- `src/components/attendance/AllPersonnelDayView.tsx:237` : تفاصيل السبب
- `src/components/attendance/AllPersonnelDayView.tsx:238` : خصم من الرصيد
- `src/components/attendance/AllPersonnelDayView.tsx:303` : حاضر في مقر العمل
- `src/components/attendance/AllPersonnelDayView.tsx:309` : الجهة: {details.nomService}
- `src/components/attendance/AllPersonnelDayView.tsx:314` : المكان: {details.lieuMission} {details.objetMission && `— ${details.objetMission}`}
- `src/components/attendance/AllPersonnelDayView.tsx:319` : التكوين: {details.intituleFormation}
- `src/components/attendance/AllPersonnelDayView.tsx:344` : نعم (يخصم)
- `src/components/attendance/AllPersonnelDayView.tsx:348` : لا يخصم
- `src/components/attendance/AllPersonnelDayView.tsx:365` : إجمالي السجلات المعروضة : | موظف
- `src/components/attendance/AllPersonnelDayView.tsx:368` : تظهر النتائج المطابقة للتاريخ والقسم والحالة المحددة

#### `src/components/attendance/AllPersonnelKPICards.tsx` (12 lignes)
- `src/components/attendance/AllPersonnelKPICards.tsx:47` : إجمالي الموظفين
- `src/components/attendance/AllPersonnelKPICards.tsx:49` : موظف
- `src/components/attendance/AllPersonnelKPICards.tsx:57` : الحاضرون
- `src/components/attendance/AllPersonnelKPICards.tsx:59` : حاضر
- `src/components/attendance/AllPersonnelKPICards.tsx:67` : الغائبون
- `src/components/attendance/AllPersonnelKPICards.tsx:69` : غائب
- `src/components/attendance/AllPersonnelKPICards.tsx:77` : في تكوين
- `src/components/attendance/AllPersonnelKPICards.tsx:79` : موظف
- `src/components/attendance/AllPersonnelKPICards.tsx:87` : في خدمة / مهمة
- `src/components/attendance/AllPersonnelKPICards.tsx:89` : موظف
- `src/components/attendance/AllPersonnelKPICards.tsx:97` : غير مسجل
- `src/components/attendance/AllPersonnelKPICards.tsx:99` : موظف

#### `src/components/attendance/AllPersonnelMonthView.tsx` (30 lignes)
- `src/components/attendance/AllPersonnelMonthView.tsx:54` : جانفي (Janvier)
- `src/components/attendance/AllPersonnelMonthView.tsx:55` : فيفري (Février)
- `src/components/attendance/AllPersonnelMonthView.tsx:56` : مارس (Mars)
- `src/components/attendance/AllPersonnelMonthView.tsx:57` : أفريل (Avril)
- `src/components/attendance/AllPersonnelMonthView.tsx:58` : ماي (Mai)
- `src/components/attendance/AllPersonnelMonthView.tsx:59` : جوان (Juin)
- `src/components/attendance/AllPersonnelMonthView.tsx:60` : جويلية (Juillet)
- `src/components/attendance/AllPersonnelMonthView.tsx:61` : أوت (Août)
- `src/components/attendance/AllPersonnelMonthView.tsx:62` : سبتمبر (Septembre)
- `src/components/attendance/AllPersonnelMonthView.tsx:63` : أكتوبر (Octobre)
- `src/components/attendance/AllPersonnelMonthView.tsx:64` : نوفمبر (Novembre)
- `src/components/attendance/AllPersonnelMonthView.tsx:65` : ديسمبر (Décembre)
- `src/components/attendance/AllPersonnelMonthView.tsx:155` : الشهر السابق
- `src/components/attendance/AllPersonnelMonthView.tsx:158` : الشهر السابق
- `src/components/attendance/AllPersonnelMonthView.tsx:167` : الشهر الحالي
- `src/components/attendance/AllPersonnelMonthView.tsx:175` : الشهر الموالي
- `src/components/attendance/AllPersonnelMonthView.tsx:177` : الشهر الموالي
- `src/components/attendance/AllPersonnelMonthView.tsx:224` : بحث بالاسم أو اللقب أو ب.ت.و...
- `src/components/attendance/AllPersonnelMonthView.tsx:236` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelMonthView.tsx:241` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelMonthView.tsx:257` : جاري تحميل التقرير الشهري...
- `src/components/attendance/AllPersonnelMonthView.tsx:262` : لا يوجد موظفون مطابقون لمعايير البحث
- `src/components/attendance/AllPersonnelMonthView.tsx:274` : الموظف
- `src/components/attendance/AllPersonnelMonthView.tsx:283` : القسم / المصلحة
- `src/components/attendance/AllPersonnelMonthView.tsx:292` : أيام الحضور
- `src/components/attendance/AllPersonnelMonthView.tsx:301` : أيام الغياب
- `src/components/attendance/AllPersonnelMonthView.tsx:305` : تفاصيل أسباب الغياب خلال الشهر
- `src/components/attendance/AllPersonnelMonthView.tsx:306` : نسبة الحضور
- `src/components/attendance/AllPersonnelMonthView.tsx:348` : {item.joursPresents} يوم
- `src/components/attendance/AllPersonnelMonthView.tsx:361` : {item.joursAbsents} يوم

#### `src/components/attendance/AllPersonnelWeekView.tsx` (23 lignes)
- `src/components/attendance/AllPersonnelWeekView.tsx:49` : الأحد
- `src/components/attendance/AllPersonnelWeekView.tsx:50` : الإثنين
- `src/components/attendance/AllPersonnelWeekView.tsx:51` : الثلاثاء
- `src/components/attendance/AllPersonnelWeekView.tsx:52` : الأربعاء
- `src/components/attendance/AllPersonnelWeekView.tsx:53` : الخميس
- `src/components/attendance/AllPersonnelWeekView.tsx:54` : الجمعة
- `src/components/attendance/AllPersonnelWeekView.tsx:55` : السبت
- `src/components/attendance/AllPersonnelWeekView.tsx:113` : من ${weekDays[0].date} إلى ${weekDays[6].date}
- `src/components/attendance/AllPersonnelWeekView.tsx:157` : الأسبوع السابق
- `src/components/attendance/AllPersonnelWeekView.tsx:160` : الأسبوع السابق
- `src/components/attendance/AllPersonnelWeekView.tsx:169` : الأسبوع الحالي
- `src/components/attendance/AllPersonnelWeekView.tsx:177` : الأسبوع الموالي
- `src/components/attendance/AllPersonnelWeekView.tsx:179` : الأسبوع الموالي
- `src/components/attendance/AllPersonnelWeekView.tsx:197` : بحث بالاسم أو اللقب أو ب.ت.و...
- `src/components/attendance/AllPersonnelWeekView.tsx:210` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelWeekView.tsx:215` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelWeekView.tsx:231` : جاري تحميل بيانات الأسبوع لكافة الموظفين...
- `src/components/attendance/AllPersonnelWeekView.tsx:236` : لا يوجد موظفون مطابقون لمعايير البحث
- `src/components/attendance/AllPersonnelWeekView.tsx:243` : الموظف
- `src/components/attendance/AllPersonnelWeekView.tsx:313` : إجمالي الحضور والغياب اليومي :
- `src/components/attendance/AllPersonnelWeekView.tsx:321` : ح: {tot.presents}
- `src/components/attendance/AllPersonnelWeekView.tsx:322` : غ: {tot.absents}
- `src/components/attendance/AllPersonnelWeekView.tsx:325` : غ.م: {tot.unrecorded}

#### `src/components/attendance/AllPersonnelYearView.tsx` (22 lignes)
- `src/components/attendance/AllPersonnelYearView.tsx:128` : السنة السابقة
- `src/components/attendance/AllPersonnelYearView.tsx:131` : السنة السابقة
- `src/components/attendance/AllPersonnelYearView.tsx:140` : السنة الحالية
- `src/components/attendance/AllPersonnelYearView.tsx:148` : السنة الموالية
- `src/components/attendance/AllPersonnelYearView.tsx:150` : السنة الموالية
- `src/components/attendance/AllPersonnelYearView.tsx:157` : السنة المالية / الإدارية:
- `src/components/attendance/AllPersonnelYearView.tsx:182` : بحث بالاسم أو اللقب أو ب.ت.و...
- `src/components/attendance/AllPersonnelYearView.tsx:194` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelYearView.tsx:199` : كل الأقسام والمصالح
- `src/components/attendance/AllPersonnelYearView.tsx:215` : جاري تحميل التقرير السنوي والأرصدة...
- `src/components/attendance/AllPersonnelYearView.tsx:220` : لا يوجد موظفون مطابقون لمعايير البحث
- `src/components/attendance/AllPersonnelYearView.tsx:232` : الموظف
- `src/components/attendance/AllPersonnelYearView.tsx:236` : القسم / المصلحة
- `src/components/attendance/AllPersonnelYearView.tsx:237` : الرصيد الأولي
- `src/components/attendance/AllPersonnelYearView.tsx:243` : المستهلك (خصم)
- `src/components/attendance/AllPersonnelYearView.tsx:252` : الرصيد المتبقي
- `src/components/attendance/AllPersonnelYearView.tsx:256` : أيام الحضور الفعلية
- `src/components/attendance/AllPersonnelYearView.tsx:262` : نسبة الانضباط والحضور
- `src/components/attendance/AllPersonnelYearView.tsx:302` : {item.soldeInitial} يوماً
- `src/components/attendance/AllPersonnelYearView.tsx:308` : {item.joursDeduits} يوماً
- `src/components/attendance/AllPersonnelYearView.tsx:323` : {item.soldeRestant} يوماً
- `src/components/attendance/AllPersonnelYearView.tsx:329` : {item.joursPresents} يوم

#### `src/components/attendance/AttendanceDeclarationDialog.tsx` (28 lignes)
- `src/components/attendance/AttendanceDeclarationDialog.tsx:52` : التاريخ مطلوب
- `src/components/attendance/AttendanceDeclarationDialog.tsx:68` : يرجى اختيار سبب الغياب
- `src/components/attendance/AttendanceDeclarationDialog.tsx:186` : تم إرسال تصريح الحضور / الغياب بنجاح، بانتظار مراجعة الإدارة
- `src/components/attendance/AttendanceDeclarationDialog.tsx:194` : تعذر إرسال التصريح، يرجى المحاولة لاحقاً
- `src/components/attendance/AttendanceDeclarationDialog.tsx:195` : تعذر إرسال التصريح، يرجى المحاولة لاحقاً
- `src/components/attendance/AttendanceDeclarationDialog.tsx:211` : تصريح مسبق بالحضور / الغياب
- `src/components/attendance/AttendanceDeclarationDialog.tsx:216` : سجّل تصريحك المسبق لتأكيد حضورك أو تقديم مبرر غيابك ليتم اعتماده من طرف مصلحة الموارد البشرية.
- `src/components/attendance/AttendanceDeclarationDialog.tsx:226` : التاريخ المعني *
- `src/components/attendance/AttendanceDeclarationDialog.tsx:248` : ساعة الحضور المتوقعة
- `src/components/attendance/AttendanceDeclarationDialog.tsx:268` : نوع التصريح *
- `src/components/attendance/AttendanceDeclarationDialog.tsx:281` : حاضر (مداومة عادية)
- `src/components/attendance/AttendanceDeclarationDialog.tsx:294` : غائب / مبرر / مصلحة
- `src/components/attendance/AttendanceDeclarationDialog.tsx:304` : سبب أو نوع الغياب
- `src/components/attendance/AttendanceDeclarationDialog.tsx:307` : ⚠️ يخصم من رصيد الإجازات السنوية
- `src/components/attendance/AttendanceDeclarationDialog.tsx:326` : جاري تحميل الأسباب... | اختر سبب الغياب / المصلحة
- `src/components/attendance/AttendanceDeclarationDialog.tsx:353` : اسم المصلحة / الإدارة المستقبلة *
- `src/components/attendance/AttendanceDeclarationDialog.tsx:361` : مثال: مصلحة الضرائب، وزارة الشؤون الاجتماعية...
- `src/components/attendance/AttendanceDeclarationDialog.tsx:375` : مكان المأمورية *
- `src/components/attendance/AttendanceDeclarationDialog.tsx:383` : المدينة / المقر
- `src/components/attendance/AttendanceDeclarationDialog.tsx:390` : موضوع المأمورية
- `src/components/attendance/AttendanceDeclarationDialog.tsx:397` : طبيعة العمل المكلف به
- `src/components/attendance/AttendanceDeclarationDialog.tsx:411` : عنوان الدورة التكوينية أو التدريب *
- `src/components/attendance/AttendanceDeclarationDialog.tsx:419` : مثال: دورة السلامة المهنية، تدريب إدارة النظم...
- `src/components/attendance/AttendanceDeclarationDialog.tsx:431` : ملاحظات أو تفاصيل إضافية
- `src/components/attendance/AttendanceDeclarationDialog.tsx:440` : أية توضيحات إضافية للإدارة...
- `src/components/attendance/AttendanceDeclarationDialog.tsx:457` : إلغاء
- `src/components/attendance/AttendanceDeclarationDialog.tsx:467` : جاري الإرسال...
- `src/components/attendance/AttendanceDeclarationDialog.tsx:470` : تأكيد وإرسال التصريح

#### `src/components/attendance/AttendanceStatusBadge.tsx` (5 lignes)
- `src/components/attendance/AttendanceStatusBadge.tsx:35` : غير مسجل
- `src/components/attendance/AttendanceStatusBadge.tsx:49` : حاضر
- `src/components/attendance/AttendanceStatusBadge.tsx:61` : غائب
- `src/components/attendance/AttendanceStatusBadge.tsx:86` : يخصم من رصيد الإجازات السنوية
- `src/components/attendance/AttendanceStatusBadge.tsx:88` : خصم

#### `src/components/attendance/LeaveReasonFormDialog.tsx` (39 lignes)
- `src/components/attendance/LeaveReasonFormDialog.tsx:38` : عطلة (Congé)
- `src/components/attendance/LeaveReasonFormDialog.tsx:39` : مهمة (Mission)
- `src/components/attendance/LeaveReasonFormDialog.tsx:40` : تكوين (Formation)
- `src/components/attendance/LeaveReasonFormDialog.tsx:41` : خدمة (Service)
- `src/components/attendance/LeaveReasonFormDialog.tsx:42` : أخرى (Autre)
- `src/components/attendance/LeaveReasonFormDialog.tsx:114` : الرمز التعريفي (Code) إجباري
- `src/components/attendance/LeaveReasonFormDialog.tsx:119` : الاسم بالعربية إجباري
- `src/components/attendance/LeaveReasonFormDialog.tsx:141` : تم تحديث نوع الغياب بنجاح
- `src/components/attendance/LeaveReasonFormDialog.tsx:152` : تم إنشاء نوع الغياب الجديد بنجاح
- `src/components/attendance/LeaveReasonFormDialog.tsx:159` : حدث خطأ أثناء حفظ نوع الغياب
- `src/components/attendance/LeaveReasonFormDialog.tsx:172` : تعديل نوع الغياب | إضافة نوع غياب جديد
- `src/components/attendance/LeaveReasonFormDialog.tsx:181` : 1. التعريف والبيانات الأساسية
- `src/components/attendance/LeaveReasonFormDialog.tsx:187` : الرمز البرمجي (Code) *
- `src/components/attendance/LeaveReasonFormDialog.tsx:200` : لا يمكن تعديل الرمز التعريفي بعد إنشائه.
- `src/components/attendance/LeaveReasonFormDialog.tsx:206` : التصنيف (Category) *
- `src/components/attendance/LeaveReasonFormDialog.tsx:213` : اختر التصنيف
- `src/components/attendance/LeaveReasonFormDialog.tsx:229` : التسمية بالعربية *
- `src/components/attendance/LeaveReasonFormDialog.tsx:235` : مثال: عطلة سنوية
- `src/components/attendance/LeaveReasonFormDialog.tsx:243` : التسمية بالفرنسية (اختياري)
- `src/components/attendance/LeaveReasonFormDialog.tsx:258` : الوصف والملاحظات
- `src/components/attendance/LeaveReasonFormDialog.tsx:264` : تفاصيل إضافية حول شروط وطبيعة هذا الغياب...
- `src/components/attendance/LeaveReasonFormDialog.tsx:274` : 2. الإعدادات والخصم
- `src/components/attendance/LeaveReasonFormDialog.tsx:281` : يخصم من رصيد العطل السنوي (Déduit du solde)
- `src/components/attendance/LeaveReasonFormDialog.tsx:284` : إذا تم التفعيل، سيتم استقطاع أيام هذا الغياب تلقائياً من رصيد العطل السنوية للموظف.
- `src/components/attendance/LeaveReasonFormDialog.tsx:297` : يتطلب وثيقة تبرير (شهادة/تقرير)
- `src/components/attendance/LeaveReasonFormDialog.tsx:308` : يتطلب تحديد المكان (خاص بالمهمات)
- `src/components/attendance/LeaveReasonFormDialog.tsx:319` : يتطلب اسم المصلحة (خاص بالخدمة)
- `src/components/attendance/LeaveReasonFormDialog.tsx:330` : يتطلب تفاصيل التكوين
- `src/components/attendance/LeaveReasonFormDialog.tsx:346` : 3. المظهر والعرض
- `src/components/attendance/LeaveReasonFormDialog.tsx:352` : لون الشارة (Couleur)
- `src/components/attendance/LeaveReasonFormDialog.tsx:375` : أيقونة Lucide (اختياري)
- `src/components/attendance/LeaveReasonFormDialog.tsx:389` : ترتيب العرض (Ordre)
- `src/components/attendance/LeaveReasonFormDialog.tsx:408` : 4. الحالة
- `src/components/attendance/LeaveReasonFormDialog.tsx:414` : مفعل (نشط) | معطل
- `src/components/attendance/LeaveReasonFormDialog.tsx:417` : عند التعطيل، لن يظهر هذا النوع في قوائم تسجيل الغياب الجديدة مع بقاء البيانات القديمة سليمة.
- `src/components/attendance/LeaveReasonFormDialog.tsx:436` : إلغاء
- `src/components/attendance/LeaveReasonFormDialog.tsx:446` : جاري الحفظ...
- `src/components/attendance/LeaveReasonFormDialog.tsx:449` : حفظ التعديلات
- `src/components/attendance/LeaveReasonFormDialog.tsx:451` : إضافة النوع

#### `src/components/attendance/LeaveReasonsList.tsx` (26 lignes)
- `src/components/attendance/LeaveReasonsList.tsx:40` : عطلة (Congé)
- `src/components/attendance/LeaveReasonsList.tsx:41` : مهمة (Mission)
- `src/components/attendance/LeaveReasonsList.tsx:42` : تكوين (Formation)
- `src/components/attendance/LeaveReasonsList.tsx:43` : خدمة (Service)
- `src/components/attendance/LeaveReasonsList.tsx:44` : أخرى (Autre)
- `src/components/attendance/LeaveReasonsList.tsx:58` : جاري تحميل قائمة أنواع الغياب...
- `src/components/attendance/LeaveReasonsList.tsx:67` : لا توجد أنواع غياب مطابقة
- `src/components/attendance/LeaveReasonsList.tsx:68` : قم بتعديل خيارات البحث أو الفلترة أو أضف نوع غياب جديد.
- `src/components/attendance/LeaveReasonsList.tsx:78` : الترتيب
- `src/components/attendance/LeaveReasonsList.tsx:79` : الرمز (Code)
- `src/components/attendance/LeaveReasonsList.tsx:80` : المسمى بالعربية والفرنسية
- `src/components/attendance/LeaveReasonsList.tsx:81` : التصنيف
- `src/components/attendance/LeaveReasonsList.tsx:82` : خصم من الرصيد
- `src/components/attendance/LeaveReasonsList.tsx:83` : الحالة
- `src/components/attendance/LeaveReasonsList.tsx:84` : الإجراءات
- `src/components/attendance/LeaveReasonsList.tsx:114` : نظامي
- `src/components/attendance/LeaveReasonsList.tsx:134` : يتطلب وثيقة
- `src/components/attendance/LeaveReasonsList.tsx:152` : يخصم
- `src/components/attendance/LeaveReasonsList.tsx:157` : لا يخصم
- `src/components/attendance/LeaveReasonsList.tsx:168` : تغيير الحالة
- `src/components/attendance/LeaveReasonsList.tsx:171` : نشط | معطل
- `src/components/attendance/LeaveReasonsList.tsx:187` : تعديل نوع الغياب
- `src/components/attendance/LeaveReasonsList.tsx:193` : تعديل
- `src/components/attendance/LeaveReasonsList.tsx:209` : نوع نظامي محمي لا يمكن حذفه
- `src/components/attendance/LeaveReasonsList.tsx:210` : حذف نوع الغياب
- `src/components/attendance/LeaveReasonsList.tsx:227` : الأنواع النظامية محمية من الحذف | حذف النوع

#### `src/components/attendance/MyAttendanceLegend.tsx` (9 lignes)
- `src/components/attendance/MyAttendanceLegend.tsx:23` : غير مسجل
- `src/components/attendance/MyAttendanceLegend.tsx:36` : حاضر
- `src/components/attendance/MyAttendanceLegend.tsx:52` : غائب
- `src/components/attendance/MyAttendanceLegend.tsx:94` : دليل الألوان والرموز (Légende des statuts)
- `src/components/attendance/MyAttendanceLegend.tsx:97` : يتم تحميل أسباب الغياب ديناميكياً بحسب إعدادات المؤسسة
- `src/components/attendance/MyAttendanceLegend.tsx:105` : حاضر (Présent)
- `src/components/attendance/MyAttendanceLegend.tsx:111` : غير مسجل بعد
- `src/components/attendance/MyAttendanceLegend.tsx:135` : مخصوم
- `src/components/attendance/MyAttendanceLegend.tsx:139` : غير مخصوم

#### `src/components/attendance/MyCalendarDayView.tsx` (21 lignes)
- `src/components/attendance/MyCalendarDayView.tsx:71` : اليوم السابق
- `src/components/attendance/MyCalendarDayView.tsx:74` : اليوم السابق
- `src/components/attendance/MyCalendarDayView.tsx:83` : اليوم
- `src/components/attendance/MyCalendarDayView.tsx:91` : اليوم الموالي
- `src/components/attendance/MyCalendarDayView.tsx:93` : اليوم الموالي
- `src/components/attendance/MyCalendarDayView.tsx:100` : اختر التاريخ:
- `src/components/attendance/MyCalendarDayView.tsx:114` : جاري تحميل بيانات اليوم...
- `src/components/attendance/MyCalendarDayView.tsx:128` : تاريخ المعاينة اليومية
- `src/components/attendance/MyCalendarDayView.tsx:157` : وقت الوصول : {dayAttendance.heureArrivee}
- `src/components/attendance/MyCalendarDayView.tsx:170` : يخصم من رصيد الإجازات
- `src/components/attendance/MyCalendarDayView.tsx:178` : لا يخصم من الرصيد السنوي
- `src/components/attendance/MyCalendarDayView.tsx:191` : البيانات التفصيلية لسبب الغياب
- `src/components/attendance/MyCalendarDayView.tsx:200` : المصلحة أو الوجهة:
- `src/components/attendance/MyCalendarDayView.tsx:211` : مكان المهمة:
- `src/components/attendance/MyCalendarDayView.tsx:221` : موضوع المهمة:
- `src/components/attendance/MyCalendarDayView.tsx:232` : عنوان الدورة التكوينية:
- `src/components/attendance/MyCalendarDayView.tsx:240` : الهيئة المؤطرة:
- `src/components/attendance/MyCalendarDayView.tsx:247` : مدة التكوين:
- `src/components/attendance/MyCalendarDayView.tsx:257` : ملاحظات إضافية:
- `src/components/attendance/MyCalendarDayView.tsx:270` : لم يتم تسجيل حالة الحضور لهذا اليوم بعد
- `src/components/attendance/MyCalendarDayView.tsx:273` : يقوم مسؤول الموارد البشرية أو رئيس المصلحة بتسجيل وتأكيد الحضور اليومي.

#### `src/components/attendance/MyCalendarMonthView.tsx` (34 lignes)
- `src/components/attendance/MyCalendarMonthView.tsx:39` : جانفي (Janvier)
- `src/components/attendance/MyCalendarMonthView.tsx:40` : فيفري (Février)
- `src/components/attendance/MyCalendarMonthView.tsx:41` : مارس (Mars)
- `src/components/attendance/MyCalendarMonthView.tsx:42` : أفريل (Avril)
- `src/components/attendance/MyCalendarMonthView.tsx:43` : ماي (Mai)
- `src/components/attendance/MyCalendarMonthView.tsx:44` : جوان (Juin)
- `src/components/attendance/MyCalendarMonthView.tsx:45` : جويلية (Juillet)
- `src/components/attendance/MyCalendarMonthView.tsx:46` : أوت (Août)
- `src/components/attendance/MyCalendarMonthView.tsx:47` : سبتمبر (Septembre)
- `src/components/attendance/MyCalendarMonthView.tsx:48` : أكتوبر (Octobre)
- `src/components/attendance/MyCalendarMonthView.tsx:49` : نوفمبر (Novembre)
- `src/components/attendance/MyCalendarMonthView.tsx:50` : ديسمبر (Décembre)
- `src/components/attendance/MyCalendarMonthView.tsx:53` : الأحد | الإثنين | الثلاثاء | الأربعاء | الخميس | الجمعة | السبت
- `src/components/attendance/MyCalendarMonthView.tsx:183` : الشهر السابق
- `src/components/attendance/MyCalendarMonthView.tsx:186` : الشهر السابق
- `src/components/attendance/MyCalendarMonthView.tsx:195` : الشهر الحالي
- `src/components/attendance/MyCalendarMonthView.tsx:203` : الشهر الموالي
- `src/components/attendance/MyCalendarMonthView.tsx:205` : الشهر الموالي
- `src/components/attendance/MyCalendarMonthView.tsx:250` : جاري تحميل بيانات الشهر...
- `src/components/attendance/MyCalendarMonthView.tsx:308` : حاضر
- `src/components/attendance/MyCalendarMonthView.tsx:349` : حصيلة الشهر :
- `src/components/attendance/MyCalendarMonthView.tsx:351` : حضور : {monthStats.presents} أيام
- `src/components/attendance/MyCalendarMonthView.tsx:354` : غياب : {monthStats.absents} أيام
- `src/components/attendance/MyCalendarMonthView.tsx:358` : أيام مخصومة من الرصيد : {monthStats.deducted}
- `src/components/attendance/MyCalendarMonthView.tsx:375` : تفاصيل اليوم المحدد : {formatArabicDateWithDay(selectedDate)}
- `src/components/attendance/MyCalendarMonthView.tsx:398` : وقت الوصول : {selectedDayAttendance.heureArrivee}
- `src/components/attendance/MyCalendarMonthView.tsx:407` : يخصم من رصيد الإجازات السنوية
- `src/components/attendance/MyCalendarMonthView.tsx:412` : لا يخصم من الرصيد السنوي
- `src/components/attendance/MyCalendarMonthView.tsx:426` : المصلحة:
- `src/components/attendance/MyCalendarMonthView.tsx:438` : مكان المهمة:
- `src/components/attendance/MyCalendarMonthView.tsx:450` : موضوع المهمة:
- `src/components/attendance/MyCalendarMonthView.tsx:462` : التكوين:
- `src/components/attendance/MyCalendarMonthView.tsx:472` : ملاحظة:
- `src/components/attendance/MyCalendarMonthView.tsx:483` : لم يتم تسجيل أي حضور أو غياب لهذا اليوم بعد.

#### `src/components/attendance/MyCalendarWeekView.tsx` (20 lignes)
- `src/components/attendance/MyCalendarWeekView.tsx:18` : الأحد
- `src/components/attendance/MyCalendarWeekView.tsx:19` : الإثنين
- `src/components/attendance/MyCalendarWeekView.tsx:20` : الثلاثاء
- `src/components/attendance/MyCalendarWeekView.tsx:21` : الأربعاء
- `src/components/attendance/MyCalendarWeekView.tsx:22` : الخميس
- `src/components/attendance/MyCalendarWeekView.tsx:23` : الجمعة
- `src/components/attendance/MyCalendarWeekView.tsx:24` : السبت
- `src/components/attendance/MyCalendarWeekView.tsx:111` : من ${first.date} إلى ${last.date}
- `src/components/attendance/MyCalendarWeekView.tsx:124` : الأسبوع السابق
- `src/components/attendance/MyCalendarWeekView.tsx:127` : الأسبوع السابق
- `src/components/attendance/MyCalendarWeekView.tsx:136` : الأسبوع الحالي
- `src/components/attendance/MyCalendarWeekView.tsx:144` : الأسبوع الموالي
- `src/components/attendance/MyCalendarWeekView.tsx:146` : الأسبوع الموالي
- `src/components/attendance/MyCalendarWeekView.tsx:161` : جاري تحميل بيانات الأسبوع...
- `src/components/attendance/MyCalendarWeekView.tsx:187` : اليوم
- `src/components/attendance/MyCalendarWeekView.tsx:220` : يخصم من الرصيد
- `src/components/attendance/MyCalendarWeekView.tsx:233` : حصيلة هذا الأسبوع :
- `src/components/attendance/MyCalendarWeekView.tsx:236` : حضور : {weekStats.presents} أيام
- `src/components/attendance/MyCalendarWeekView.tsx:240` : غياب : {weekStats.absents} أيام
- `src/components/attendance/MyCalendarWeekView.tsx:243` : غير مسجل : {weekStats.unrecorded} أيام

#### `src/components/attendance/MyCalendarYearView.tsx` (32 lignes)
- `src/components/attendance/MyCalendarYearView.tsx:25` : جانفي (Jan)
- `src/components/attendance/MyCalendarYearView.tsx:26` : فيفري (Fév)
- `src/components/attendance/MyCalendarYearView.tsx:27` : مارس (Mar)
- `src/components/attendance/MyCalendarYearView.tsx:28` : أفريل (Avr)
- `src/components/attendance/MyCalendarYearView.tsx:29` : ماي (Mai)
- `src/components/attendance/MyCalendarYearView.tsx:30` : جوان (Juin)
- `src/components/attendance/MyCalendarYearView.tsx:31` : جويلية (Juil)
- `src/components/attendance/MyCalendarYearView.tsx:32` : أوت (Août)
- `src/components/attendance/MyCalendarYearView.tsx:33` : سبتمبر (Sep)
- `src/components/attendance/MyCalendarYearView.tsx:34` : أكتوبر (Oct)
- `src/components/attendance/MyCalendarYearView.tsx:35` : نوفمبر (Nov)
- `src/components/attendance/MyCalendarYearView.tsx:36` : ديسمبر (Déc)
- `src/components/attendance/MyCalendarYearView.tsx:120` : السنة السابقة
- `src/components/attendance/MyCalendarYearView.tsx:123` : السنة السابقة
- `src/components/attendance/MyCalendarYearView.tsx:132` : السنة الحالية
- `src/components/attendance/MyCalendarYearView.tsx:140` : السنة الموالية
- `src/components/attendance/MyCalendarYearView.tsx:142` : السنة الموالية
- `src/components/attendance/MyCalendarYearView.tsx:148` : السنة المعروضة :
- `src/components/attendance/MyCalendarYearView.tsx:159` : إجمالي أيام الحضور
- `src/components/attendance/MyCalendarYearView.tsx:161` : يوم
- `src/components/attendance/MyCalendarYearView.tsx:169` : إجمالي أيام الغياب
- `src/components/attendance/MyCalendarYearView.tsx:171` : يوم
- `src/components/attendance/MyCalendarYearView.tsx:179` : أيام الغياب المخصومة من الرصيد
- `src/components/attendance/MyCalendarYearView.tsx:181` : يوم
- `src/components/attendance/MyCalendarYearView.tsx:192` : جاري تحميل بيانات السنة...
- `src/components/attendance/MyCalendarYearView.tsx:226` : عرض
- `src/components/attendance/MyCalendarYearView.tsx:234` : أيام الحضور :
- `src/components/attendance/MyCalendarYearView.tsx:239` : أيام الغياب :
- `src/components/attendance/MyCalendarYearView.tsx:245` : خصم من الرصيد :
- `src/components/attendance/MyCalendarYearView.tsx:246` : {m.deductibles} يوم
- `src/components/attendance/MyCalendarYearView.tsx:254` : أسباب الغياب :
- `src/components/attendance/MyCalendarYearView.tsx:274` : نسبة الانضباط

#### `src/components/attendance/MyLeaveBalanceCard.tsx` (17 lignes)
- `src/components/attendance/MyLeaveBalanceCard.tsx:60` : رصيد الإجازات السنوية (Solde de congés)
- `src/components/attendance/MyLeaveBalanceCard.tsx:63` : متابعة الأيام المستحقة، المستنفذة والرصيد المتبقي لسنة {year}
- `src/components/attendance/MyLeaveBalanceCard.tsx:68` : السنة المالية : {year}
- `src/components/attendance/MyLeaveBalanceCard.tsx:78` : الرصيد الإجمالي السنوي
- `src/components/attendance/MyLeaveBalanceCard.tsx:82` : يوم
- `src/components/attendance/MyLeaveBalanceCard.tsx:94` : الأيام المستهلكة (الغياب المخصوم)
- `src/components/attendance/MyLeaveBalanceCard.tsx:98` : يوم
- `src/components/attendance/MyLeaveBalanceCard.tsx:110` : الرصيد المتبقي المتاح
- `src/components/attendance/MyLeaveBalanceCard.tsx:114` : يوم
- `src/components/attendance/MyLeaveBalanceCard.tsx:126` : نسبة استهلاك الرصيد السنوي
- `src/components/attendance/MyLeaveBalanceCard.tsx:127` : {percentUsed}% ({used} من {total} يوم)
- `src/components/attendance/MyLeaveBalanceCard.tsx:142` : تفاصيل الاستهلاك :
- `src/components/attendance/MyLeaveBalanceCard.tsx:147` : عطلة سنوية
- `src/components/attendance/MyLeaveBalanceCard.tsx:148` : غياب غير مبرر
- `src/components/attendance/MyLeaveBalanceCard.tsx:149` : استرجاع
- `src/components/attendance/MyLeaveBalanceCard.tsx:150` : عطلة استثنائية
- `src/components/attendance/MyLeaveBalanceCard.tsx:157` : {label}: {count} يوم

#### `src/components/audit/AuditExport.tsx` (19 lignes)
- `src/components/audit/AuditExport.tsx:48` : تم تصدير سجل التدقيق بصيغة ${exportFormat.toUpperCase()} بنجاح
- `src/components/audit/AuditExport.tsx:51` : فشل في تصدير سجل التدقيق. يرجى المحاولة مرة أخرى.
- `src/components/audit/AuditExport.tsx:74` : تصدير سجل التدقيق
- `src/components/audit/AuditExport.tsx:81` : ملخص التصدير
- `src/components/audit/AuditExport.tsx:83` : {totalRecords} سجل
- `src/components/audit/AuditExport.tsx:91` : البداية
- `src/components/audit/AuditExport.tsx:97` : النهاية
- `src/components/audit/AuditExport.tsx:105` : المرشحات النشطة:
- `src/components/audit/AuditExport.tsx:106` : {activeFiltersCount} مرشح
- `src/components/audit/AuditExport.tsx:114` : تنسيق التصدير
- `src/components/audit/AuditExport.tsx:123` : CSV - جدول بيانات
- `src/components/audit/AuditExport.tsx:129` : PDF - مستند محمول
- `src/components/audit/AuditExport.tsx:143` : تصدير CSV:
- `src/components/audit/AuditExport.tsx:144` : سيتم تصدير البيانات كجدول بيانات يمكن فتحه في Excel أو Google Sheets لتحليل أفضل ومعالجة البيانات.
- `src/components/audit/AuditExport.tsx:148` : تصدير PDF:
- `src/components/audit/AuditExport.tsx:149` : سيتم إنشاء تقرير مفصل بتنسيق PDF مناسب للأرشفة والطباعة والمشاركة الرسمية.
- `src/components/audit/AuditExport.tsx:166` : جاري التصدير...
- `src/components/audit/AuditExport.tsx:171` : تصدير بصيغة {exportFormat.toUpperCase()}
- `src/components/audit/AuditExport.tsx:178` : لا توجد سجلات للتصدير. يرجى تعديل المرشحات أو إضافة بيانات جديدة.

#### `src/components/audit/AuditFilters.tsx` (31 lignes)
- `src/components/audit/AuditFilters.tsx:30` : إنشاء مستند
- `src/components/audit/AuditFilters.tsx:31` : تحديث مستند
- `src/components/audit/AuditFilters.tsx:32` : حذف مستند
- `src/components/audit/AuditFilters.tsx:33` : عرض مستند
- `src/components/audit/AuditFilters.tsx:34` : تحميل مستند
- `src/components/audit/AuditFilters.tsx:35` : إنشاء مجلد
- `src/components/audit/AuditFilters.tsx:36` : تحديث مجلد
- `src/components/audit/AuditFilters.tsx:37` : حذف مجلد
- `src/components/audit/AuditFilters.tsx:38` : تسجيل دخول
- `src/components/audit/AuditFilters.tsx:39` : تسجيل خروج
- `src/components/audit/AuditFilters.tsx:43` : مستند
- `src/components/audit/AuditFilters.tsx:44` : مجلد
- `src/components/audit/AuditFilters.tsx:45` : مستخدم
- `src/components/audit/AuditFilters.tsx:63` : مرشحات سجل التدقيق
- `src/components/audit/AuditFilters.tsx:66` : {getActiveFiltersCount()} نشط
- `src/components/audit/AuditFilters.tsx:75` : من تاريخ
- `src/components/audit/AuditFilters.tsx:80` : اختر التاريخ
- `src/components/audit/AuditFilters.tsx:95` : إلى تاريخ
- `src/components/audit/AuditFilters.tsx:100` : اختر التاريخ
- `src/components/audit/AuditFilters.tsx:117` : نوع العملية
- `src/components/audit/AuditFilters.tsx:123` : اختر نوع العملية
- `src/components/audit/AuditFilters.tsx:126` : جميع العمليات
- `src/components/audit/AuditFilters.tsx:138` : نوع الكيان
- `src/components/audit/AuditFilters.tsx:144` : اختر نوع الكيان
- `src/components/audit/AuditFilters.tsx:147` : جميع الكيانات
- `src/components/audit/AuditFilters.tsx:159` : معرف المستخدم
- `src/components/audit/AuditFilters.tsx:161` : أدخل معرف المستخدم
- `src/components/audit/AuditFilters.tsx:171` : تطبيق المرشحات
- `src/components/audit/AuditFilters.tsx:173` : إعادة تعيين المرشحات
- `src/components/audit/AuditFilters.tsx:183` : من: {format(filters.startDate, 'dd/MM/yyyy', { locale: ar })}
- `src/components/audit/AuditFilters.tsx:192` : إلى: {format(filters.endDate, 'dd/MM/yyyy', { locale: ar })}

#### `src/components/audit/AuditTable.tsx` (30 lignes)
- `src/components/audit/AuditTable.tsx:86` : إنشاء مستند
- `src/components/audit/AuditTable.tsx:87` : تحديث مستند
- `src/components/audit/AuditTable.tsx:88` : حذف مستند
- `src/components/audit/AuditTable.tsx:89` : عرض مستند
- `src/components/audit/AuditTable.tsx:90` : تحميل مستند
- `src/components/audit/AuditTable.tsx:91` : نقل مستند إلى مجلد
- `src/components/audit/AuditTable.tsx:92` : إزالة مستند من مجلد
- `src/components/audit/AuditTable.tsx:93` : إنشاء مجلد
- `src/components/audit/AuditTable.tsx:94` : تحديث مجلد
- `src/components/audit/AuditTable.tsx:95` : حذف مجلد
- `src/components/audit/AuditTable.tsx:96` : إنشاء مستخدم
- `src/components/audit/AuditTable.tsx:97` : تحديث مستخدم
- `src/components/audit/AuditTable.tsx:98` : حذف مستخدم
- `src/components/audit/AuditTable.tsx:99` : تسجيل دخول
- `src/components/audit/AuditTable.tsx:100` : تسجيل خروج
- `src/components/audit/AuditTable.tsx:108` : مستند
- `src/components/audit/AuditTable.tsx:109` : مجلد
- `src/components/audit/AuditTable.tsx:110` : مستخدم
- `src/components/audit/AuditTable.tsx:125` : جاري التحميل...
- `src/components/audit/AuditTable.tsx:126` : يتم تحميل سجل التدقيق، يرجى الانتظار
- `src/components/audit/AuditTable.tsx:141` : لا توجد سجلات
- `src/components/audit/AuditTable.tsx:142` : لم يتم العثور على سجلات تدقيق للمعايير المحددة
- `src/components/audit/AuditTable.tsx:158` : الوقت والتاريخ
- `src/components/audit/AuditTable.tsx:164` : العملية
- `src/components/audit/AuditTable.tsx:170` : نوع الكيان
- `src/components/audit/AuditTable.tsx:176` : المستخدم
- `src/components/audit/AuditTable.tsx:182` : التفاصيل
- `src/components/audit/AuditTable.tsx:186` : عنوان IP
- `src/components/audit/AuditTable.tsx:270` : لا توجد تفاصيل
- `src/components/audit/AuditTable.tsx:278` : غير متوفر

#### `src/components/audit/AuditTrailViewer.tsx` (17 lignes)
- `src/components/audit/AuditTrailViewer.tsx:35` : تم تطبيق المرشحات بنجاح
- `src/components/audit/AuditTrailViewer.tsx:38` : فشل في تطبيق المرشحات
- `src/components/audit/AuditTrailViewer.tsx:47` : تم إعادة تعيين المرشحات
- `src/components/audit/AuditTrailViewer.tsx:53` : تم تحديث البيانات
- `src/components/audit/AuditTrailViewer.tsx:56` : فشل في تحديث البيانات
- `src/components/audit/AuditTrailViewer.tsx:65` : غير مصرح
- `src/components/audit/AuditTrailViewer.tsx:66` : ليس لديك صلاحية لعرض سجل التدقيق
- `src/components/audit/AuditTrailViewer.tsx:87` : سجل التدقيق والمراجعة
- `src/components/audit/AuditTrailViewer.tsx:89` : مراقبة شاملة لجميع العمليات والأنشطة في النظام
- `src/components/audit/AuditTrailViewer.tsx:92` : عرض {auditLogs.length} من أصل {pagination.total} سجل
- `src/components/audit/AuditTrailViewer.tsx:93` : (الصفحة {pagination.current} من {pagination.pages})
- `src/components/audit/AuditTrailViewer.tsx:106` : تحديث
- `src/components/audit/AuditTrailViewer.tsx:136` : سجل العمليات المفصل
- `src/components/audit/AuditTrailViewer.tsx:149` : الصفحة {pagination.current} من {pagination.pages}
- `src/components/audit/AuditTrailViewer.tsx:150` : ({pagination.total} سجل إجمالي)
- `src/components/audit/AuditTrailViewer.tsx:159` : السابق
- `src/components/audit/AuditTrailViewer.tsx:167` : التالي

#### `src/components/audit/DocumentTimeline.tsx` (8 lignes)
- `src/components/audit/DocumentTimeline.tsx:77` : تم إنشاء المستند
- `src/components/audit/DocumentTimeline.tsx:79` : تم تحديث المستند
- `src/components/audit/DocumentTimeline.tsx:81` : تم حذف المستند
- `src/components/audit/DocumentTimeline.tsx:83` : تم نقل المستند إلى مجلد
- `src/components/audit/DocumentTimeline.tsx:85` : تم إزالة المستند من المجلد
- `src/components/audit/DocumentTimeline.tsx:100` : الجدول الزمني للمستند
- `src/components/audit/DocumentTimeline.tsx:110` : جاري تحميل الجدول الزمني...
- `src/components/audit/DocumentTimeline.tsx:172` : لا يوجد سجل زمني لهذا المستند

#### `src/components/backup/RestoreBackupDialog.tsx` (10 lignes)
- `src/components/backup/RestoreBackupDialog.tsx:48` : استعادة نسخة احتياطية
- `src/components/backup/RestoreBackupDialog.tsx:51` : تحذير | : هذه العملية ستقوم | باستبدال البيانات الحالية
- `src/components/backup/RestoreBackupDialog.tsx:53` : سيتم إنشاء نسخة أمان تلقائياً قبل الاستعادة.
- `src/components/backup/RestoreBackupDialog.tsx:60` : الملف :
- `src/components/backup/RestoreBackupDialog.tsx:65` : التاريخ :
- `src/components/backup/RestoreBackupDialog.tsx:73` : الحجم :
- `src/components/backup/RestoreBackupDialog.tsx:84` : للتأكيد، اكتب كلمة RESTORE بالأسفل :
- `src/components/backup/RestoreBackupDialog.tsx:107` : جاري الاستعادة...
- `src/components/backup/RestoreBackupDialog.tsx:112` : تأكيد الاستعادة
- `src/components/backup/RestoreBackupDialog.tsx:123` : إلغاء

#### `src/components/common/AutoRefreshIndicator.tsx` (1 lignes)
- `src/components/common/AutoRefreshIndicator.tsx:22` : جاري التحديث...

#### `src/components/common/ErrorBoundary.tsx` (5 lignes)
- `src/components/common/ErrorBoundary.tsx:53` : حدث خطأ غير متوقع
- `src/components/common/ErrorBoundary.tsx:57` : نعتذر عن هذا الخطأ. لقد واجه التطبيق مشكلة غير متوقعة. يرجى إعادة تحميل الصفحة للمتابعة.
- `src/components/common/ErrorBoundary.tsx:63` : تفاصيل الخطأ التقني
- `src/components/common/ErrorBoundary.tsx:78` : إعادة تحميل التطبيق
- `src/components/common/ErrorBoundary.tsx:87` : الرئيسية

#### `src/components/common/LanguageSwitcher.tsx` (2 lignes)
- `src/components/common/LanguageSwitcher.tsx:15` : التبديل إلى العربية
- `src/components/common/LanguageSwitcher.tsx:16` : التبديل إلى العربية

#### `src/components/common/OnlineIndicator.tsx` (2 lignes)
- `src/components/common/OnlineIndicator.tsx:29` : متصل الآن | غير متصل
- `src/components/common/OnlineIndicator.tsx:35` : متصل الآن | غير متصل

#### `src/components/dashboard/AuditStats.tsx` (4 lignes)
- `src/components/dashboard/AuditStats.tsx:54` : أنشطة اليوم
- `src/components/dashboard/AuditStats.tsx:61` : أنشطة الأسبوع
- `src/components/dashboard/AuditStats.tsx:68` : عمليات المستندات
- `src/components/dashboard/AuditStats.tsx:75` : عمليات المجلدات

#### `src/components/department/DepartmentSwitcher.tsx` (10 lignes)
- `src/components/department/DepartmentSwitcher.tsx:44` : خطأ: معرف القسم غير صالح
- `src/components/department/DepartmentSwitcher.tsx:50` : تم تغيير القسم النشط بنجاح
- `src/components/department/DepartmentSwitcher.tsx:53` : فشل في تغيير القسم
- `src/components/department/DepartmentSwitcher.tsx:91` : لا يوجد قسم
- `src/components/department/DepartmentSwitcher.tsx:98` : لا يوجد قسم
- `src/components/department/DepartmentSwitcher.tsx:115` : إدارة الأقسام:
- `src/components/department/DepartmentSwitcher.tsx:121` : القسم النشط
- `src/components/department/DepartmentSwitcher.tsx:133` : تبديل القسم النشط
- `src/components/department/DepartmentSwitcher.tsx:153` : نشط | غير نشط
- `src/components/department/DepartmentSwitcher.tsx:171` : {validDepartments.length} أقسام متاحة

#### `src/components/documents/DocumentActions.tsx` (13 lignes)
- `src/components/documents/DocumentActions.tsx:77` : تم حذف المستند بنجاح
- `src/components/documents/DocumentActions.tsx:83` : فشل في حذف المستند
- `src/components/documents/DocumentActions.tsx:116` : تنظيم في مجلد
- `src/components/documents/DocumentActions.tsx:118` : عرض التصنيف
- `src/components/documents/DocumentActions.tsx:125` : إجراءات الوثيقة
- `src/components/documents/DocumentActions.tsx:145` : تعديل
- `src/components/documents/DocumentActions.tsx:152` : حذف
- `src/components/documents/DocumentActions.tsx:173` : إضافة رد
- `src/components/documents/DocumentActions.tsx:178` : تعيين مسؤول
- `src/components/documents/DocumentActions.tsx:189` : تأكيد الحذف
- `src/components/documents/DocumentActions.tsx:191` : هل أنت متأكد من أنك تريد حذف هذا المستند؟ هذا الإجراء لا يمكن التراجع عنه.
- `src/components/documents/DocumentActions.tsx:200` : جاري الحذف... | حذف
- `src/components/documents/DocumentActions.tsx:203` : إلغاء

#### `src/components/documents/DocumentDataGrid.tsx` (16 lignes)
- `src/components/documents/DocumentDataGrid.tsx:23` : رقم التسلسل
- `src/components/documents/DocumentDataGrid.tsx:24` : الموضوع
- `src/components/documents/DocumentDataGrid.tsx:25` : التاريخ
- `src/components/documents/DocumentDataGrid.tsx:26` : المصدر
- `src/components/documents/DocumentDataGrid.tsx:27` : المسؤول
- `src/components/documents/DocumentDataGrid.tsx:28` : مُوجه إلى
- `src/components/documents/DocumentDataGrid.tsx:29` : الإجراءات
- `src/components/documents/DocumentDataGrid.tsx:30` : النشاط
- `src/components/documents/DocumentDataGrid.tsx:31` : تفاصيل الوثيقة
- `src/components/documents/DocumentDataGrid.tsx:32` : عرض التفاصيل الكاملة
- `src/components/documents/DocumentDataGrid.tsx:33` : تحميل PDF
- `src/components/documents/DocumentDataGrid.tsx:34` : لا توجد وثائق
- `src/components/documents/DocumentDataGrid.tsx:35` : تاريخ الوصول
- `src/components/documents/DocumentDataGrid.tsx:36` : تاريخ الإصدار
- `src/components/documents/DocumentDataGrid.tsx:37` : النوع
- `src/components/documents/DocumentDataGrid.tsx:38` : لا توجد معاينة متاحة

#### `src/components/documents/DocumentFolderDisplay.tsx` (11 lignes)
- `src/components/documents/DocumentFolderDisplay.tsx:35` : غير مصنف
- `src/components/documents/DocumentFolderDisplay.tsx:37` : لم يتم تصنيف هذا المستند في أي مجلد
- `src/components/documents/DocumentFolderDisplay.tsx:59` : تصنيف المستند
- `src/components/documents/DocumentFolderDisplay.tsx:66` : تعديل تصنيف المستند
- `src/components/documents/DocumentFolderDisplay.tsx:67` : تعديل تصنيف المستند
- `src/components/documents/DocumentFolderDisplay.tsx:88` : نشط | مؤرشف
- `src/components/documents/DocumentFolderDisplay.tsx:97` : معلومات التصنيف
- `src/components/documents/DocumentFolderDisplay.tsx:103` : تاريخ الإنشاء:
- `src/components/documents/DocumentFolderDisplay.tsx:110` : الحالة:
- `src/components/documents/DocumentFolderDisplay.tsx:112` : نشط | مؤرشف
- `src/components/documents/DocumentFolderDisplay.tsx:121` : للعرض فقط - يمكن لمدير القسم تعديل التصنيف

#### `src/components/documents/DocumentList.tsx` (5 lignes)
- `src/components/documents/DocumentList.tsx:27` : لا توجد مستندات في هذا المجلد
- `src/components/documents/DocumentList.tsx:44` : الرقم التسلسلي: {doc.serialNumber}/{doc.year}
- `src/components/documents/DocumentList.tsx:48` : تاريخ الوصول:
- `src/components/documents/DocumentList.tsx:49` : تاريخ الإصدار:
- `src/components/documents/DocumentList.tsx:54` : وارد | صادر

#### `src/components/documents/DocumentPreview.tsx` (16 lignes)
- `src/components/documents/DocumentPreview.tsx:92` : الرقم:
- `src/components/documents/DocumentPreview.tsx:101` : التاريخ:
- `src/components/documents/DocumentPreview.tsx:113` : النوع:
- `src/components/documents/DocumentPreview.tsx:123` : المصدر:
- `src/components/documents/DocumentPreview.tsx:127` : غير معروف
- `src/components/documents/DocumentPreview.tsx:128` : غير معروف
- `src/components/documents/DocumentPreview.tsx:138` : النشاط:
- `src/components/documents/DocumentPreview.tsx:151` : رقم المراسلة:
- `src/components/documents/DocumentPreview.tsx:160` : تاريخ المراسلة:
- `src/components/documents/DocumentPreview.tsx:173` : مُوجه إلى:
- `src/components/documents/DocumentPreview.tsx:186` : للعلم:
- `src/components/documents/DocumentPreview.tsx:199` : مُعيّن إلى:
- `src/components/documents/DocumentPreview.tsx:212` : المسؤول:
- `src/components/documents/DocumentPreview.tsx:228` : فشل في تحميل المعاينة
- `src/components/documents/DocumentPreview.tsx:235` : معاينة الوثيقة
- `src/components/documents/DocumentPreview.tsx:246` : معاينة سريعة

#### `src/components/documents/DocumentPreviewModal.tsx` (4 lignes)
- `src/components/documents/DocumentPreviewModal.tsx:25` : معاينة الوثيقة الواردة
- `src/components/documents/DocumentPreviewModal.tsx:26` : معاينة الوثيقة الصادرة
- `src/components/documents/DocumentPreviewModal.tsx:76` : لا يوجد ملف مرفق بهذه الوثيقة
- `src/components/documents/DocumentPreviewModal.tsx:86` : إغلاق

#### `src/components/documents/DocumentTableHeader.tsx` (2 lignes)
- `src/components/documents/DocumentTableHeader.tsx:29` : تاريخ الوصول | تاريخ الإصدار
- `src/components/documents/DocumentTableHeader.tsx:37` : النشاط

#### `src/components/documents/DocumentTableRow.tsx` (3 lignes)
- `src/components/documents/DocumentTableRow.tsx:134` : مُجاب
- `src/components/documents/DocumentTableRow.tsx:155` : غير معروف
- `src/components/documents/DocumentTableRow.tsx:156` : غير معروف

#### `src/components/documents/DocumentUpload.tsx` (10 lignes)
- `src/components/documents/DocumentUpload.tsx:100` : اسحب وأفلت الملفات هنا
- `src/components/documents/DocumentUpload.tsx:101` : أو
- `src/components/documents/DocumentUpload.tsx:107` : استعرض الملفات
- `src/components/documents/DocumentUpload.tsx:123` : تم اختيار {files.length} ملفات
- `src/components/documents/DocumentUpload.tsx:139` : إزالة الملف
- `src/components/documents/DocumentUpload.tsx:140` : إزالة الملف
- `src/components/documents/DocumentUpload.tsx:152` : الملفات الموجودة
- `src/components/documents/DocumentUpload.tsx:155` : ملف
- `src/components/documents/DocumentUpload.tsx:170` : إزالة الملف
- `src/components/documents/DocumentUpload.tsx:171` : إزالة الملف

#### `src/components/documents/DocumentUploadWithOcr.tsx` (11 lignes)
- `src/components/documents/DocumentUploadWithOcr.tsx:51` : بدء معالجة النص من ${file.name}...
- `src/components/documents/DocumentUploadWithOcr.tsx:63` : تم استخراج النص من ${file.name} بنجاح
- `src/components/documents/DocumentUploadWithOcr.tsx:68` : فشل في استخراج النص من ${file.name}
- `src/components/documents/DocumentUploadWithOcr.tsx:121` : أفلت الملفات هنا | اسحب الملفات أو انقر للتحديد
- `src/components/documents/DocumentUploadWithOcr.tsx:124` : يدعم ملفات PDF والصور (JPG, PNG) حتى {maxSize / (1024 * 1024)}MB
- `src/components/documents/DocumentUploadWithOcr.tsx:134` : جاري استخراج النص...
- `src/components/documents/DocumentUploadWithOcr.tsx:137` : مكتمل
- `src/components/documents/DocumentUploadWithOcr.tsx:148` : خطأ في معالجة النص
- `src/components/documents/DocumentUploadWithOcr.tsx:158` : الملفات المحددة:
- `src/components/documents/DocumentUploadWithOcr.tsx:174` : معالجة...
- `src/components/documents/DocumentUploadWithOcr.tsx:195` : النص المستخرج:

#### `src/components/documents/forms/EditIncomingDocumentForm.tsx` (27 lignes)
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:137` : تم المسح بنجاح
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:151` : /الموضوع\s*:?\s*(.+)/i,
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:167` : /من\s*:?\s*(.+)/i,
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:168` : /المرسل\s*:?\s*(.+)/i,
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:186` : فشل في المسح: ${error.message}
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:244` : تم تحديث الوثيقة بنجاح
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:248` : فشل في تحديث الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:257` : تعديل الوثيقة الواردة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:258` : معلومات الرقم التسلسلي
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:259` : معلومات المراسلة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:260` : تفاصيل الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:261` : مرفقات الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:262` : رفع وثيقة جديدة أو إعادة مسح ضوئي لاستبدال الموجودة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:263` : إلغاء
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:264` : تحديث الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:265` : رفع ملف
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:266` : مسح ضوئي
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:267` : تم المسح بنجاح
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:268` : فشل في المسح
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:269` : الموضوع
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:270` : موضوع الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:271` : المصدر
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:272` : مصدر الوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:273` : الرقم التسلسلي
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:274` : الرقم التسلسلي للوثيقة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:275` : السنة
- `src/components/documents/forms/EditIncomingDocumentForm.tsx:276` : سنة الوثيقة

#### `src/components/documents/forms/EditOutgoingDocumentForm.tsx` (30 lignes)
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:111` : تم المسح بنجاح
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:125` : /الموضوع\s*:?\s*(.+)/i,
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:143` : فشل في المسح: ${error.message}
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:194` : تم تحديث الوثيقة بنجاح
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:198` : فشل في تحديث الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:207` : تعديل الوثيقة الصادرة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:208` : الموضوع
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:209` : موضوع الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:210` : الوجهة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:211` : إلغاء
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:212` : تحديث الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:213` : مرفق الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:214` : رفع وثيقة جديدة أو إعادة مسح ضوئي لاستبدال الموجودة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:215` : رفع ملف
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:216` : مسح ضوئي
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:217` : تم المسح بنجاح
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:218` : فشل في المسح
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:219` : مطلوب
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:220` : الرقم التسلسلي
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:221` : الرقم التسلسلي للوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:222` : السنة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:223` : سنة الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:224` : تاريخ الإصدار
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:225` : تاريخ إصدار الوثيقة
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:226` : القسم
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:227` : القسم المصدر
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:228` : اختر القسم
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:229` : اختر التاريخ
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:249` : المعلومات الأساسية
- `src/components/documents/forms/EditOutgoingDocumentForm.tsx:267` : مرفقات الوثيقة

#### `src/components/documents/forms/IncomingDocumentForm.tsx` (24 lignes)
- `src/components/documents/forms/IncomingDocumentForm.tsx:89` : ⚠️ لا يوجد نص OCR لتحليله
- `src/components/documents/forms/IncomingDocumentForm.tsx:90` : يرجى مسح الوثيقة أولاً لاستخراج النص
- `src/components/documents/forms/IncomingDocumentForm.tsx:112` : ✅ تم استخراج المعلومات
- `src/components/documents/forms/IncomingDocumentForm.tsx:113` : درجة الثقة: ${Math.round(extracted.confidence * 100)}%
- `src/components/documents/forms/IncomingDocumentForm.tsx:121` : ❌ خدمة الذكاء الاصطناعي غير متاحة
- `src/components/documents/forms/IncomingDocumentForm.tsx:122` : يرجى التحقق من تشغيل خدمة الذكاء الاصطناعي على الخادم.
- `src/components/documents/forms/IncomingDocumentForm.tsx:128` : ⏱️ انتهت مدة التحليل
- `src/components/documents/forms/IncomingDocumentForm.tsx:129` : النص كبير جداً. يرجى المحاولة مرة أخرى.
- `src/components/documents/forms/IncomingDocumentForm.tsx:134` : 🚫 عدد كبير من الطلبات
- `src/components/documents/forms/IncomingDocumentForm.tsx:135` : يرجى الانتظار دقيقة واحدة قبل إعادة المحاولة.
- `src/components/documents/forms/IncomingDocumentForm.tsx:140` : تم إلغاء الاستخراج
- `src/components/documents/forms/IncomingDocumentForm.tsx:143` : ⚠️ استجابة غير صالحة
- `src/components/documents/forms/IncomingDocumentForm.tsx:144` : يرجى إعادة المحاولة.
- `src/components/documents/forms/IncomingDocumentForm.tsx:148` : ❌ فشل الاستخراج الذكي
- `src/components/documents/forms/IncomingDocumentForm.tsx:149` : خطأ غير متوقع
- `src/components/documents/forms/IncomingDocumentForm.tsx:195` : معلومات الرقم التسلسلي
- `src/components/documents/forms/IncomingDocumentForm.tsx:213` : معلومات المراسلة
- `src/components/documents/forms/IncomingDocumentForm.tsx:227` : تفاصيل الوثيقة
- `src/components/documents/forms/IncomingDocumentForm.tsx:241` : مرفقات الوثيقة
- `src/components/documents/forms/IncomingDocumentForm.tsx:274` : استخراج ذكي
- `src/components/documents/forms/IncomingDocumentForm.tsx:284` : جاري الاستخراج... ( {progressTime}s )
- `src/components/documents/forms/IncomingDocumentForm.tsx:293` : إلغاء
- `src/components/documents/forms/IncomingDocumentForm.tsx:306` : {Math.round(extractionConfidence * 100)}% ثقة
- `src/components/documents/forms/IncomingDocumentForm.tsx:311` : يقوم الذكاء الاصطناعي المحلي بتحليل النص واستخراج البيانات تلقائياً

#### `src/components/documents/forms/MultiDepartmentSelectField.tsx` (5 lignes)
- `src/components/documents/forms/MultiDepartmentSelectField.tsx:125` : ${selectedDepartments.length} قسم محدد
- `src/components/documents/forms/MultiDepartmentSelectField.tsx:133` : البحث في الأقسام...
- `src/components/documents/forms/MultiDepartmentSelectField.tsx:135` : لا توجد أقسام.
- `src/components/documents/forms/MultiDepartmentSelectField.tsx:146` : تحديد الكل
- `src/components/documents/forms/MultiDepartmentSelectField.tsx:155` : إلغاء التحديد

#### `src/components/documents/forms/OutgoingDocumentForm.tsx` (2 lignes)
- `src/components/documents/forms/OutgoingDocumentForm.tsx:91` : المعلومات الأساسية
- `src/components/documents/forms/OutgoingDocumentForm.tsx:110` : مرفقات الوثيقة

#### `src/components/documents/forms/ScannedDocumentPreview.tsx` (6 lignes)
- `src/components/documents/forms/ScannedDocumentPreview.tsx:45` : نتائج المسح الضوئي
- `src/components/documents/forms/ScannedDocumentPreview.tsx:52` : حذف المسح الضوئي
- `src/components/documents/forms/ScannedDocumentPreview.tsx:78` : عرض المستند
- `src/components/documents/forms/ScannedDocumentPreview.tsx:88` : النص المستخرج
- `src/components/documents/forms/ScannedDocumentPreview.tsx:103` : تم المسح في
- `src/components/documents/forms/ScannedDocumentPreview.tsx:105` : الصيغة

#### `src/components/documents/forms/incoming/DocumentDetailsFields.tsx` (11 lignes)
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:61` : اختر المصدر...
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:77` : نوع الوثيقة
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:84` : اختر نوع الوثيقة...
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:87` : نوع الوثيقة (رسالة، تقرير، الخ.)
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:98` : النشاط (اختياري)
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:111` : اختر النشاط (اختياري)...
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:114` : النشاط المتعلق بالوثيقة (يمكن تركه فارغاً)
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:129` : تاريخ النشاط
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:130` : تاريخ تنفيذ النشاط المحدد
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:131` : اختر تاريخ النشاط
- `src/components/documents/forms/incoming/DocumentDetailsFields.tsx:147` : اختر الأقسام...

#### `src/components/documents/forms/outgoing/BasicInfoFields.tsx` (9 lignes)
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:92` : الوجهة
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:99` : اختر الوجهات...
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:102` : الجهات المستلمة للوثيقة
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:114` : نوع الوثيقة
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:121` : اختر نوع الوثيقة...
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:124` : نوع الوثيقة (رسالة، تقرير، الخ.)
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:135` : للإعلام
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:142` : اختر للإعلام...
- `src/components/documents/forms/outgoing/BasicInfoFields.tsx:145` : معلومات إضافية للإعلام

#### `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx` (16 lignes)
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:72` : الدقة (DPI)
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:75` : اختر الدقة
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:79` : 600 DPI (موصى به للعربية)
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:80` : 800 DPI (جودة عالية)
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:86` : صيغة الملف
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:89` : اختر الصيغة
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:104` : جاري فحص الماسح الضوئي...
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:111` : حالة الماسح الضوئي
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:114` : متصل: ${scannerStatus.deviceId}
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:115` : غير محدد
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:136` : جاري المسح...
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:141` : بدء المسح
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:153` : جاري المسح...
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:170` : تم المسح بنجاح
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:177` : حذف المسح الضوئي
- `src/components/documents/forms/outgoing/DocumentAttachmentSection.tsx:187` : النص المستخرج (OCR)

#### `src/components/documents/options/DocumentOptionDialog.tsx` (21 lignes)
- `src/components/documents/options/DocumentOptionDialog.tsx:37` : قيمة الخيار مطلوبة | يجب أن لا تتجاوز القيمة 100 حرف
- `src/components/documents/options/DocumentOptionDialog.tsx:95` : النشاط | تصنيفات الأنشطة والمهام الإدارية
- `src/components/documents/options/DocumentOptionDialog.tsx:96` : المصدر / الجهة | الجهات والمصالح المرسلة أو المستقبلة
- `src/components/documents/options/DocumentOptionDialog.tsx:97` : نوع الوثيقة | مذكرة، مراسلة، تقرير، قرار، إلخ
- `src/components/documents/options/DocumentOptionDialog.tsx:98` : مخصص إلى | المصالح والوحدات المعنية بالتوجيه
- `src/components/documents/options/DocumentOptionDialog.tsx:99` : للإعلام | الجهات الموجه إليها للإعلام والمتابعة
- `src/components/documents/options/DocumentOptionDialog.tsx:103` : كلا النوعين (الوثائق الواردة والصادرة)
- `src/components/documents/options/DocumentOptionDialog.tsx:104` : الوثائق الواردة فقط
- `src/components/documents/options/DocumentOptionDialog.tsx:105` : الوثائق الصادرة فقط
- `src/components/documents/options/DocumentOptionDialog.tsx:121` : تعديل خيار الوثيقة | إضافة خيار وثيقة جديد
- `src/components/documents/options/DocumentOptionDialog.tsx:125` : تحديث بيانات الخيار المتاح في القوائم المنسدلة للوثائق
- `src/components/documents/options/DocumentOptionDialog.tsx:126` : تحديد فئة ونوع المراسلة وتسمية الخيار الجديد لإضافته للنظام
- `src/components/documents/options/DocumentOptionDialog.tsx:137` : الخيارات المضافة هنا تظهر للمستخدمين عند تسجيل المراسلات، وتساعد في توحيد تصنيف البيانات وسهولة استرجاعها.
- `src/components/documents/options/DocumentOptionDialog.tsx:150` : الفئة الإدارية *
- `src/components/documents/options/DocumentOptionDialog.tsx:155` : اختر الفئة الإدارية
- `src/components/documents/options/DocumentOptionDialog.tsx:181` : نوع المراسلة المعنية *
- `src/components/documents/options/DocumentOptionDialog.tsx:186` : اختر نوع المراسلة
- `src/components/documents/options/DocumentOptionDialog.tsx:209` : تسمية / قيمة الخيار *
- `src/components/documents/options/DocumentOptionDialog.tsx:213` : أدخل نص الخيار كما سيظهر بالقائمة...
- `src/components/documents/options/DocumentOptionDialog.tsx:232` : جاري الحفظ... | حفظ التعديلات | إنشاء الخيار
- `src/components/documents/options/DocumentOptionDialog.tsx:242` : إلغاء

#### `src/components/documents/options/DocumentOptionsList.tsx` (73 lignes)
- `src/components/documents/options/DocumentOptionsList.tsx:83` : النشاط
- `src/components/documents/options/DocumentOptionsList.tsx:84` : المصدر
- `src/components/documents/options/DocumentOptionsList.tsx:85` : نوع الوثيقة
- `src/components/documents/options/DocumentOptionsList.tsx:86` : مخصص إلى
- `src/components/documents/options/DocumentOptionsList.tsx:87` : للإعلام
- `src/components/documents/options/DocumentOptionsList.tsx:94` : وثائق واردة
- `src/components/documents/options/DocumentOptionsList.tsx:95` : وثائق صادرة
- `src/components/documents/options/DocumentOptionsList.tsx:96` : كلا النوعين
- `src/components/documents/options/DocumentOptionsList.tsx:220` : قائمة خيارات وحقول الوثائق
- `src/components/documents/options/DocumentOptionsList.tsx:223` : استعراض، فرز وتعديل الخيارات المفعلة في نماذج المراسلات الإدارية
- `src/components/documents/options/DocumentOptionsList.tsx:229` : {totalFiltered} &nbsp;خيار متاح
- `src/components/documents/options/DocumentOptionsList.tsx:237` : عرض كجدول بيانات
- `src/components/documents/options/DocumentOptionsList.tsx:243` : عرض كجدول بيانات
- `src/components/documents/options/DocumentOptionsList.tsx:246` : جدول
- `src/components/documents/options/DocumentOptionsList.tsx:251` : عرض كبطاقات
- `src/components/documents/options/DocumentOptionsList.tsx:257` : عرض كبطاقات
- `src/components/documents/options/DocumentOptionsList.tsx:260` : بطاقات
- `src/components/documents/options/DocumentOptionsList.tsx:273` : ابحث بقيمة الخيار...
- `src/components/documents/options/DocumentOptionsList.tsx:287` : الفئة
- `src/components/documents/options/DocumentOptionsList.tsx:290` : جميع الفئات
- `src/components/documents/options/DocumentOptionsList.tsx:291` : النشاط
- `src/components/documents/options/DocumentOptionsList.tsx:292` : المصدر
- `src/components/documents/options/DocumentOptionsList.tsx:293` : نوع الوثيقة
- `src/components/documents/options/DocumentOptionsList.tsx:294` : مخصص إلى
- `src/components/documents/options/DocumentOptionsList.tsx:295` : للإعلام
- `src/components/documents/options/DocumentOptionsList.tsx:310` : نوع الوثيقة
- `src/components/documents/options/DocumentOptionsList.tsx:313` : جميع أنواع المراسلات
- `src/components/documents/options/DocumentOptionsList.tsx:314` : واردة فقط
- `src/components/documents/options/DocumentOptionsList.tsx:315` : صادرة فقط
- `src/components/documents/options/DocumentOptionsList.tsx:316` : كلا النوعين
- `src/components/documents/options/DocumentOptionsList.tsx:331` : الحالة
- `src/components/documents/options/DocumentOptionsList.tsx:334` : جميع الحالات
- `src/components/documents/options/DocumentOptionsList.tsx:335` : نشط فقط
- `src/components/documents/options/DocumentOptionsList.tsx:336` : غير نشط فقط
- `src/components/documents/options/DocumentOptionsList.tsx:347` : الترتيب:
- `src/components/documents/options/DocumentOptionsList.tsx:354` : الأحدث تاريخاً
- `src/components/documents/options/DocumentOptionsList.tsx:355` : الأقدم تاريخاً
- `src/components/documents/options/DocumentOptionsList.tsx:356` : أبجدياً (أ إلى ي)
- `src/components/documents/options/DocumentOptionsList.tsx:357` : أبجدياً (ي إلى أ)
- `src/components/documents/options/DocumentOptionsList.tsx:371` : إعادة ضبط الفلاتر
- `src/components/documents/options/DocumentOptionsList.tsx:385` : لا توجد خيارات مطابقة
- `src/components/documents/options/DocumentOptionsList.tsx:388` : لم يتم العثور على خيارات تطابق معايير الفرز أو البحث الحالية. يمكنك إعادة ضبط الفلاتر للاطلاع على باقي الخيارات.
- `src/components/documents/options/DocumentOptionsList.tsx:389` : لم يتم تسجيل أي خيارات في النظام حتى الآن. استخدم زر إضافة خيار جديد للبدء.
- `src/components/documents/options/DocumentOptionsList.tsx:398` : عرض كافة الخيارات
- `src/components/documents/options/DocumentOptionsList.tsx:408` : قيمة الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:409` : الفئة الإدارية
- `src/components/documents/options/DocumentOptionsList.tsx:410` : نوع المراسلة
- `src/components/documents/options/DocumentOptionsList.tsx:411` : الحالة
- `src/components/documents/options/DocumentOptionsList.tsx:412` : تاريخ الإنشاء والمنشئ
- `src/components/documents/options/DocumentOptionsList.tsx:413` : الإجراءات
- `src/components/documents/options/DocumentOptionsList.tsx:456` : نشط
- `src/components/documents/options/DocumentOptionsList.tsx:461` : معطّل
- `src/components/documents/options/DocumentOptionsList.tsx:492` : تعطيل الخيار | تفعيل الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:502` : تعطيل
- `src/components/documents/options/DocumentOptionsList.tsx:507` : تفعيل
- `src/components/documents/options/DocumentOptionsList.tsx:519` : تعديل هذا الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:523` : تعديل
- `src/components/documents/options/DocumentOptionsList.tsx:533` : حذف هذا الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:534` : حذف هذا الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:538` : حذف
- `src/components/documents/options/DocumentOptionsList.tsx:569` : نشط
- `src/components/documents/options/DocumentOptionsList.tsx:574` : معطّل
- `src/components/documents/options/DocumentOptionsList.tsx:626` : تعطيل
- `src/components/documents/options/DocumentOptionsList.tsx:631` : تفعيل
- `src/components/documents/options/DocumentOptionsList.tsx:645` : تعديل
- `src/components/documents/options/DocumentOptionsList.tsx:654` : حذف هذا الخيار
- `src/components/documents/options/DocumentOptionsList.tsx:669` : عرض{' '}
- `src/components/documents/options/DocumentOptionsList.tsx:670` : >{startIndex + 1}</bdi></span> إلى{
- `src/components/documents/options/DocumentOptionsList.tsx:671` : >{endIndex}</bdi></span> من أصل{
- `src/components/documents/options/DocumentOptionsList.tsx:672` : {totalFiltered} خيار
- `src/components/documents/options/DocumentOptionsList.tsx:678` : في كل صفحة:
- `src/components/documents/options/DocumentOptionsList.tsx:708` : السابق
- `src/components/documents/options/DocumentOptionsList.tsx:723` : التالي

#### `src/components/folders/DocumentCategorization.tsx` (16 lignes)
- `src/components/folders/DocumentCategorization.tsx:50` : تم تصنيف المستند بنجاح
- `src/components/folders/DocumentCategorization.tsx:53` : فشل في تصنيف المستند
- `src/components/folders/DocumentCategorization.tsx:67` : غير مصنف
- `src/components/folders/DocumentCategorization.tsx:69` : غير مصنف
- `src/components/folders/DocumentCategorization.tsx:77` : تصنيف المستندات
- `src/components/folders/DocumentCategorization.tsx:81` : للعرض فقط
- `src/components/folders/DocumentCategorization.tsx:88` : المجلد الحالي:
- `src/components/folders/DocumentCategorization.tsx:96` : غير مصنف
- `src/components/folders/DocumentCategorization.tsx:104` : اختر المجلد الجديد
- `src/components/folders/DocumentCategorization.tsx:107` : اختر مجلداً أو اتركه فارغاً
- `src/components/folders/DocumentCategorization.tsx:113` : بدون تصنيف
- `src/components/folders/DocumentCategorization.tsx:126` : نشط | مغلق
- `src/components/folders/DocumentCategorization.tsx:140` : جاري التصنيف...
- `src/components/folders/DocumentCategorization.tsx:144` : تصنيف المستند
- `src/components/folders/DocumentCategorization.tsx:153` : يمكن لمدير القسم فقط تغيير تصنيف المستندات
- `src/components/folders/DocumentCategorization.tsx:156` : يمكنك عرض التصنيف الحالي للمستند فقط

#### `src/components/folders/DocumentCategoryManager.tsx` (22 lignes)
- `src/components/folders/DocumentCategoryManager.tsx:70` : تم تصنيف المستند في المجلد بنجاح | تمت إزالة المستند من المجلد
- `src/components/folders/DocumentCategoryManager.tsx:74` : فشل في تصنيف المستند
- `src/components/folders/DocumentCategoryManager.tsx:107` : وارد غير مصنف
- `src/components/folders/DocumentCategoryManager.tsx:111` : مراسلة
- `src/components/folders/DocumentCategoryManager.tsx:117` : صادر غير مصنف
- `src/components/folders/DocumentCategoryManager.tsx:121` : مراسلة
- `src/components/folders/DocumentCategoryManager.tsx:127` : إجمالي غير المصنف
- `src/components/folders/DocumentCategoryManager.tsx:133` : قيد التصنيف
- `src/components/folders/DocumentCategoryManager.tsx:139` : المجلدات المتاحة
- `src/components/folders/DocumentCategoryManager.tsx:143` : مجلد
- `src/components/folders/DocumentCategoryManager.tsx:164` : المراسلات الواردة ({unclassifiedIncoming.length})
- `src/components/folders/DocumentCategoryManager.tsx:177` : المراسلات الصادرة ({unclassifiedOutgoing.length})
- `src/components/folders/DocumentCategoryManager.tsx:185` : البحث في المراسلات غير المصنفة...
- `src/components/folders/DocumentCategoryManager.tsx:198` : تحديد مجلد الهدف للتصنيف السريع:
- `src/components/folders/DocumentCategoryManager.tsx:207` : -- اختر مجلداً من القائمة للتصنيف الفوري --
- `src/components/folders/DocumentCategoryManager.tsx:210` : (مغلق)
- `src/components/folders/DocumentCategoryManager.tsx:223` : جاري تحميل المستندات غير المصنفة...
- `src/components/folders/DocumentCategoryManager.tsx:229` : لا توجد مراسلات مطابقة لمعايير البحث | ممتاز! جميع المراسلات في هذا القسم مصنفة في مجلدات
- `src/components/folders/DocumentCategoryManager.tsx:232` : يمكنك مراجعة المجلدات وتصفح مستنداتها من خلال تبويب الهيكل الهرمي للمجلدات
- `src/components/folders/DocumentCategoryManager.tsx:288` : تصنيف في المجلد المحدد
- `src/components/folders/DocumentCategoryManager.tsx:302` : نقل إلى مجلد...
- `src/components/folders/DocumentCategoryManager.tsx:305` : (مغلق)

#### `src/components/folders/DocumentFolderAssignment.tsx` (10 lignes)
- `src/components/folders/DocumentFolderAssignment.tsx:52` : تم تصنيف المستند بنجاح
- `src/components/folders/DocumentFolderAssignment.tsx:55` : فشل في تصنيف المستند
- `src/components/folders/DocumentFolderAssignment.tsx:94` : حالة التصنيف الحالية
- `src/components/folders/DocumentFolderAssignment.tsx:102` : نشط | مغلق
- `src/components/folders/DocumentFolderAssignment.tsx:114` : هذا المستند غير مصنف في أي مجلد بعد
- `src/components/folders/DocumentFolderAssignment.tsx:124` : اختيار المجلد المراد التصنيف فيه
- `src/components/folders/DocumentFolderAssignment.tsx:129` : للعرض فقط
- `src/components/folders/DocumentFolderAssignment.tsx:152` : جاري التصنيف... | تصنيف في المجلد المحدد
- `src/components/folders/DocumentFolderAssignment.tsx:162` : إزالة التصنيف
- `src/components/folders/DocumentFolderAssignment.tsx:172` : يمكن لمدير القسم فقط تغيير تصنيف المستندات

#### `src/components/folders/EnhancedFolderTree.tsx` (54 lignes)
- `src/components/folders/EnhancedFolderTree.tsx:132` : تم إنشاء المجلد بنجاح
- `src/components/folders/EnhancedFolderTree.tsx:140` : فشل في إنشاء المجلد
- `src/components/folders/EnhancedFolderTree.tsx:149` : تم تحديث بيانات المجلد بنجاح
- `src/components/folders/EnhancedFolderTree.tsx:157` : فشل في تحديث المجلد
- `src/components/folders/EnhancedFolderTree.tsx:165` : تم حذف المجلد بنجاح
- `src/components/folders/EnhancedFolderTree.tsx:176` : فشل في حذف المجلد
- `src/components/folders/EnhancedFolderTree.tsx:185` : تم تحديث حالة المجلد بنجاح
- `src/components/folders/EnhancedFolderTree.tsx:189` : فشل في تغيير حالة المجلد
- `src/components/folders/EnhancedFolderTree.tsx:238` : يرجى إدخال اسم المجلد
- `src/components/folders/EnhancedFolderTree.tsx:242` : لم يتم العثور على القسم الإداري
- `src/components/folders/EnhancedFolderTree.tsx:264` : يرجى إدخال اسم المجلد
- `src/components/folders/EnhancedFolderTree.tsx:359` : طي المجلد | توسيع المجلد
- `src/components/folders/EnhancedFolderTree.tsx:402` : عرض المستندات المصنفة
- `src/components/folders/EnhancedFolderTree.tsx:414` : نشط | مغلق
- `src/components/folders/EnhancedFolderTree.tsx:423` : عرض المستندات
- `src/components/folders/EnhancedFolderTree.tsx:434` : إنشاء مجلد فرعي
- `src/components/folders/EnhancedFolderTree.tsx:443` : تعديل المجلد
- `src/components/folders/EnhancedFolderTree.tsx:452` : حذف المجلد
- `src/components/folders/EnhancedFolderTree.tsx:478` : إجمالي المجلدات
- `src/components/folders/EnhancedFolderTree.tsx:482` : مجلد
- `src/components/folders/EnhancedFolderTree.tsx:488` : المجلدات الرئيسية
- `src/components/folders/EnhancedFolderTree.tsx:492` : جذر
- `src/components/folders/EnhancedFolderTree.tsx:498` : المجلدات الفرعية
- `src/components/folders/EnhancedFolderTree.tsx:502` : فرعي
- `src/components/folders/EnhancedFolderTree.tsx:508` : المستندات المصنفة
- `src/components/folders/EnhancedFolderTree.tsx:512` : مستند
- `src/components/folders/EnhancedFolderTree.tsx:524` : البحث بالاسم أو الوصف في المجلدات...
- `src/components/folders/EnhancedFolderTree.tsx:541` : الكل
- `src/components/folders/EnhancedFolderTree.tsx:552` : نشط
- `src/components/folders/EnhancedFolderTree.tsx:563` : مغلق
- `src/components/folders/EnhancedFolderTree.tsx:574` : توسيع جميع المجلدات
- `src/components/folders/EnhancedFolderTree.tsx:577` : توسيع الكل
- `src/components/folders/EnhancedFolderTree.tsx:585` : طي جميع المجلدات
- `src/components/folders/EnhancedFolderTree.tsx:588` : طي الكل
- `src/components/folders/EnhancedFolderTree.tsx:598` : إنشاء مجلد رئيسي
- `src/components/folders/EnhancedFolderTree.tsx:666` : إنشاء مجلد فرعي | إنشاء مجلد رئيسي جديد
- `src/components/folders/EnhancedFolderTree.tsx:673` : اسم المجلد *
- `src/components/folders/EnhancedFolderTree.tsx:676` : أدخل اسم المجلد الإداري...
- `src/components/folders/EnhancedFolderTree.tsx:687` : وصف المجلد (اختياري)
- `src/components/folders/EnhancedFolderTree.tsx:690` : وصف مختصر لمحتوى هذا المجلد أو طبيعة الوثائق المودعة به...
- `src/components/folders/EnhancedFolderTree.tsx:703` : جاري الإنشاء... | حفظ وإنشاء
- `src/components/folders/EnhancedFolderTree.tsx:711` : إلغاء
- `src/components/folders/EnhancedFolderTree.tsx:726` : تعديل المجلد: {selectedFolder?.name}
- `src/components/folders/EnhancedFolderTree.tsx:733` : اسم المجلد *
- `src/components/folders/EnhancedFolderTree.tsx:736` : اسم المجلد...
- `src/components/folders/EnhancedFolderTree.tsx:747` : الوصف
- `src/components/folders/EnhancedFolderTree.tsx:750` : وصف محتوى المجلد...
- `src/components/folders/EnhancedFolderTree.tsx:763` : جاري التحديث... | حفظ التعديلات
- `src/components/folders/EnhancedFolderTree.tsx:771` : إلغاء
- `src/components/folders/EnhancedFolderTree.tsx:786` : تأكيد حذف المجلد
- `src/components/folders/EnhancedFolderTree.tsx:789` : هل أنت متأكد من حذف المجلد "{folderToDelete?.name}" ؟
- `src/components/folders/EnhancedFolderTree.tsx:792` : ملاحظة: لا يمكن حذف المجلد إذا كان يحتوي على مستندات أو مجلدات فرعية.
- `src/components/folders/EnhancedFolderTree.tsx:802` : جاري الحذف... | نعم، احذف المجلد
- `src/components/folders/EnhancedFolderTree.tsx:808` : إلغاء

#### `src/components/folders/FolderBreadcrumb.tsx` (1 lignes)
- `src/components/folders/FolderBreadcrumb.tsx:49` : الجذر (الكل)

#### `src/components/folders/FolderContextMenu.tsx` (7 lignes)
- `src/components/folders/FolderContextMenu.tsx:54` : تفاصيل وبيانات المجلد
- `src/components/folders/FolderContextMenu.tsx:63` : عرض المستندات المصنفة
- `src/components/folders/FolderContextMenu.tsx:76` : تعديل المجلد
- `src/components/folders/FolderContextMenu.tsx:84` : إنشاء مجلد فرعي بالداخل
- `src/components/folders/FolderContextMenu.tsx:92` : نقل المجلد في الهيكل
- `src/components/folders/FolderContextMenu.tsx:102` : إغلاق وأرشفة المجلد | تنشيط المجلد
- `src/components/folders/FolderContextMenu.tsx:112` : حذف المجلد

#### `src/components/folders/FolderDetailsDialog.tsx` (13 lignes)
- `src/components/folders/FolderDetailsDialog.tsx:50` : تفاصيل المجلد: {folder.name}
- `src/components/folders/FolderDetailsDialog.tsx:58` : المستندات المصنفة
- `src/components/folders/FolderDetailsDialog.tsx:62` : مستند
- `src/components/folders/FolderDetailsDialog.tsx:68` : حالة المجلد
- `src/components/folders/FolderDetailsDialog.tsx:71` : نشط (مفتوح) | مؤرشف (مغلق)
- `src/components/folders/FolderDetailsDialog.tsx:83` : اسم المجلد
- `src/components/folders/FolderDetailsDialog.tsx:92` : الوصف
- `src/components/folders/FolderDetailsDialog.tsx:101` : المستوى الهرمي
- `src/components/folders/FolderDetailsDialog.tsx:104` : مجلد فرعي | مجلد رئيسي (جذر)
- `src/components/folders/FolderDetailsDialog.tsx:111` : تاريخ الإنشاء
- `src/components/folders/FolderDetailsDialog.tsx:119` : وقت الإنشاء
- `src/components/folders/FolderDetailsDialog.tsx:128` : أنشئ بواسطة
- `src/components/folders/FolderDetailsDialog.tsx:138` : القسم الإداري

#### `src/components/folders/FolderDocumentsList.tsx` (25 lignes)
- `src/components/folders/FolderDocumentsList.tsx:62` : اختر مجلداً لعرض محتواه
- `src/components/folders/FolderDocumentsList.tsx:64` : انقر على أي مجلد في الشجرة الهرمية لعرض المستندات الواردة والصادرة المصنفة به
- `src/components/folders/FolderDocumentsList.tsx:74` : جاري تحميل مستندات المجلد...
- `src/components/folders/FolderDocumentsList.tsx:102` : نشط | مغلق
- `src/components/folders/FolderDocumentsList.tsx:114` : {totalDocuments} مستند محفوظ
- `src/components/folders/FolderDocumentsList.tsx:128` : المستندات الواردة
- `src/components/folders/FolderDocumentsList.tsx:133` : وارد
- `src/components/folders/FolderDocumentsList.tsx:143` : المستندات الصادرة
- `src/components/folders/FolderDocumentsList.tsx:148` : صادر
- `src/components/folders/FolderDocumentsList.tsx:158` : إجمالي المستندات
- `src/components/folders/FolderDocumentsList.tsx:163` : المجموع
- `src/components/folders/FolderDocumentsList.tsx:175` : المراسلات والوثائق الواردة
- `src/components/folders/FolderDocumentsList.tsx:186` : لا توجد مستندات واردة في هذا المجلد
- `src/components/folders/FolderDocumentsList.tsx:215` : الجهة المصدرة:
- `src/components/folders/FolderDocumentsList.tsx:225` : عرض المستند
- `src/components/folders/FolderDocumentsList.tsx:228` : عرض
- `src/components/folders/FolderDocumentsList.tsx:235` : تحميل الملف الممسوح
- `src/components/folders/FolderDocumentsList.tsx:238` : تحميل
- `src/components/folders/FolderDocumentsList.tsx:254` : المراسلات والوثائق الصادرة
- `src/components/folders/FolderDocumentsList.tsx:265` : لا توجد مستندات صادرة في هذا المجلد
- `src/components/folders/FolderDocumentsList.tsx:294` : الجهة الموجه إليها:
- `src/components/folders/FolderDocumentsList.tsx:304` : عرض المستند
- `src/components/folders/FolderDocumentsList.tsx:307` : عرض
- `src/components/folders/FolderDocumentsList.tsx:314` : تحميل الملف الممسوح
- `src/components/folders/FolderDocumentsList.tsx:317` : تحميل

#### `src/components/folders/FolderDocumentsModal.tsx` (2 lignes)
- `src/components/folders/FolderDocumentsModal.tsx:147` : مستندات المجلد: ${selectedFolder.name} | مستندات المجلد
- `src/components/folders/FolderDocumentsModal.tsx:149` : عرض وإدارة الوثائق الإدارية المودعة في هذا المجلد

#### `src/components/folders/FolderMoveDialog.tsx` (12 lignes)
- `src/components/folders/FolderMoveDialog.tsx:48` : تم نقل المجلد بنجاح
- `src/components/folders/FolderMoveDialog.tsx:54` : فشل في نقل المجلد
- `src/components/folders/FolderMoveDialog.tsx:114` : نشط
- `src/components/folders/FolderMoveDialog.tsx:119` : محدد
- `src/components/folders/FolderMoveDialog.tsx:143` : نقل المجلد: {folder?.name}
- `src/components/folders/FolderMoveDialog.tsx:146` : اختر المجلد الأصل الجديد، أو انقر على الجذر لجعله مجلداً رئيسياً
- `src/components/folders/FolderMoveDialog.tsx:164` : المستوى الرئيسي (الجذر)
- `src/components/folders/FolderMoveDialog.tsx:165` : جعل المجلد في المستوى الأول بدون مجلد أب
- `src/components/folders/FolderMoveDialog.tsx:169` : محدد
- `src/components/folders/FolderMoveDialog.tsx:175` : المجلدات المتاحة:
- `src/components/folders/FolderMoveDialog.tsx:191` : جاري النقل... | تأكيد النقل
- `src/components/folders/FolderMoveDialog.tsx:199` : إلغاء

#### `src/components/folders/FolderSidebar.tsx` (6 lignes)
- `src/components/folders/FolderSidebar.tsx:114` : نشط | مغلق
- `src/components/folders/FolderSidebar.tsx:138` : تصنيف المستندات
- `src/components/folders/FolderSidebar.tsx:141` : للعرض
- `src/components/folders/FolderSidebar.tsx:150` : جاري التحميل...
- `src/components/folders/FolderSidebar.tsx:155` : لا توجد مجلدات
- `src/components/folders/FolderSidebar.tsx:174` : عرض جميع المجلدات

#### `src/components/folders/FolderTreeView.tsx` (36 lignes)
- `src/components/folders/FolderTreeView.tsx:77` : تم إنشاء المجلد بنجاح
- `src/components/folders/FolderTreeView.tsx:85` : فشل في إنشاء المجلد
- `src/components/folders/FolderTreeView.tsx:94` : تم تحديث المجلد بنجاح
- `src/components/folders/FolderTreeView.tsx:102` : فشل في تحديث المجلد
- `src/components/folders/FolderTreeView.tsx:110` : تم حذف المجلد بنجاح
- `src/components/folders/FolderTreeView.tsx:123` : لا يمكن حذف مجلد يحتوي على مجلدات فرعية أو مستندات
- `src/components/folders/FolderTreeView.tsx:125` : المجلد غير موجود أو تم حذفه مسبقاً
- `src/components/folders/FolderTreeView.tsx:129` : فشل في حذف المجلد
- `src/components/folders/FolderTreeView.tsx:171` : يرجى إدخال اسم المجلد
- `src/components/folders/FolderTreeView.tsx:185` : يرجى إدخال اسم المجلد
- `src/components/folders/FolderTreeView.tsx:306` : نشط | مؤرشف
- `src/components/folders/FolderTreeView.tsx:316` : {documentCount} مستند
- `src/components/folders/FolderTreeView.tsx:407` : نشط | مؤرشف
- `src/components/folders/FolderTreeView.tsx:431` : جاري تحميل شجرة المجلدات...
- `src/components/folders/FolderTreeView.tsx:439` : الهيكل الهرمي للمجلدات
- `src/components/folders/FolderTreeView.tsx:452` : قائمة
- `src/components/folders/FolderTreeView.tsx:464` : شبكة
- `src/components/folders/FolderTreeView.tsx:474` : مجلد جديد
- `src/components/folders/FolderTreeView.tsx:486` : لا توجد مجلدات
- `src/components/folders/FolderTreeView.tsx:494` : إنشاء مجلد جديد
- `src/components/folders/FolderTreeView.tsx:507` : لا توجد مجلدات
- `src/components/folders/FolderTreeView.tsx:515` : إنشاء مجلد جديد
- `src/components/folders/FolderTreeView.tsx:530` : إنشاء مجلد فرعي | إنشاء مجلد جديد
- `src/components/folders/FolderTreeView.tsx:535` : اسم المجلد
- `src/components/folders/FolderTreeView.tsx:541` : سيتم إنشاء هذا المجلد كمجلد فرعي
- `src/components/folders/FolderTreeView.tsx:547` : إلغاء
- `src/components/folders/FolderTreeView.tsx:553` : جاري الإنشاء... | إنشاء
- `src/components/folders/FolderTreeView.tsx:562` : تعديل المجلد
- `src/components/folders/FolderTreeView.tsx:566` : اسم المجلد
- `src/components/folders/FolderTreeView.tsx:573` : إلغاء
- `src/components/folders/FolderTreeView.tsx:579` : جاري التحديث... | تحديث
- `src/components/folders/FolderTreeView.tsx:588` : تأكيد الحذف
- `src/components/folders/FolderTreeView.tsx:590` : هل أنت متأكد من حذف المجلد "{folderToDelete?.name}"؟
- `src/components/folders/FolderTreeView.tsx:591` : لا يمكن التراجع عن هذا الإجراء.
- `src/components/folders/FolderTreeView.tsx:595` : إلغاء
- `src/components/folders/FolderTreeView.tsx:601` : جاري الحذف... | حذف

#### `src/components/forms/DepartmentForm.tsx` (15 lignes)
- `src/components/forms/DepartmentForm.tsx:57` : حدث خطأ أثناء حفظ بيانات القسم
- `src/components/forms/DepartmentForm.tsx:71` : بيانات القسم الأساسية
- `src/components/forms/DepartmentForm.tsx:79` : اسم القسم *
- `src/components/forms/DepartmentForm.tsx:84` : اسم القسم مطلوب ولا يمكن تركه فارغاً
- `src/components/forms/DepartmentForm.tsx:85` : اسم القسم يجب أن يحتوي على حرفين على الأقل
- `src/components/forms/DepartmentForm.tsx:87` : مثال: قسم الشؤون القانونية والإدارية
- `src/components/forms/DepartmentForm.tsx:99` : الاسم الرسمي للقسم كما سيظهر في كافة المعاملات والمراسلات والمجلدات
- `src/components/forms/DepartmentForm.tsx:107` : وصف القسم والاختصاصات
- `src/components/forms/DepartmentForm.tsx:112` : أدخل نبذة مختصرة عن مهام واختصاصات هذا القسم (اختياري)...
- `src/components/forms/DepartmentForm.tsx:117` : معلومات إضافية توضح طبيعة عمل القسم لتسهيل توزيع المراسلات بدقة
- `src/components/forms/DepartmentForm.tsx:134` : قسم نشط ومفعل
- `src/components/forms/DepartmentForm.tsx:137` : الأقسام النشطة تظهر في خيارات التوجيه، وإحالة الوثائق، وتعيين المستخدمين، بينما تبقى الأقسام المعطلة محفوظة في السجلات دون إمكانية إسناد معاملات جديدة لها.
- `src/components/forms/DepartmentForm.tsx:153` : إلغاء والعودة
- `src/components/forms/DepartmentForm.tsx:165` : جاري الحفظ...
- `src/components/forms/DepartmentForm.tsx:170` : حفظ تعديلات القسم | إنشاء القسم الجديد

#### `src/components/hr/AddPersonnelDocumentDialog.tsx` (30 lignes)
- `src/components/hr/AddPersonnelDocumentDialog.tsx:119` : يرجى اختيار وثيقة للربط
- `src/components/hr/AddPersonnelDocumentDialog.tsx:122` : يرجى اختيار طبيعة الوثيقة / نوع الربط
- `src/components/hr/AddPersonnelDocumentDialog.tsx:132` : تم ربط الوثيقة بنجاح
- `src/components/hr/AddPersonnelDocumentDialog.tsx:139` : فشل في ربط الوثيقة
- `src/components/hr/AddPersonnelDocumentDialog.tsx:146` : يرجى تحديد وثيقة من القائمة
- `src/components/hr/AddPersonnelDocumentDialog.tsx:150` : يرجى اختيار نوع الربط
- `src/components/hr/AddPersonnelDocumentDialog.tsx:162` : ربط وثيقة بالملف الإداري للموظف
- `src/components/hr/AddPersonnelDocumentDialog.tsx:165` : ربط مستند أو مراسلة بملف: ${personnelName} | ربط وثيقة رسمية (واردة أو صادرة) بهذا الموظف
- `src/components/hr/AddPersonnelDocumentDialog.tsx:173` : 1. نوع المراسلة *
- `src/components/hr/AddPersonnelDocumentDialog.tsx:189` : مراسلة واردة (Incoming)
- `src/components/hr/AddPersonnelDocumentDialog.tsx:205` : مراسلة صادرة (Outgoing)
- `src/components/hr/AddPersonnelDocumentDialog.tsx:213` : 2. اختيار الوثيقة *
- `src/components/hr/AddPersonnelDocumentDialog.tsx:222` : مراسلة واردة | مراسلة صادرة
- `src/components/hr/AddPersonnelDocumentDialog.tsx:226` : بدون موضوع
- `src/components/hr/AddPersonnelDocumentDialog.tsx:230` : تاريخ: {formatArabicDate(selectedDoc.entryDate || selectedDoc.issueDate || selectedDoc.arrivalDate)}
- `src/components/hr/AddPersonnelDocumentDialog.tsx:243` : تغيير الوثيقة
- `src/components/hr/AddPersonnelDocumentDialog.tsx:254` : ابحث برقم الترتيب أو السنة أو الموضوع...
- `src/components/hr/AddPersonnelDocumentDialog.tsx:263` : جاري تحميل الوثائق...
- `src/components/hr/AddPersonnelDocumentDialog.tsx:267` : لا توجد وثائق مطابقة لخيارات البحث
- `src/components/hr/AddPersonnelDocumentDialog.tsx:282` : (مرجع: {doc.correspondenceNumber})
- `src/components/hr/AddPersonnelDocumentDialog.tsx:287` : بدون موضوع
- `src/components/hr/AddPersonnelDocumentDialog.tsx:291` : اختيار
- `src/components/hr/AddPersonnelDocumentDialog.tsx:304` : 3. طبيعة الوثيقة / نوع الربط *
- `src/components/hr/AddPersonnelDocumentDialog.tsx:313` : -- اختر طبيعة الوثيقة (تدريب، دبلوم، قرار، إلخ) --
- `src/components/hr/AddPersonnelDocumentDialog.tsx:321` : مثال: تدريب (Stage)، تكوين (Formation)، شهادة (Diplôme)، قرار إداري، إلخ.
- `src/components/hr/AddPersonnelDocumentDialog.tsx:328` : 4. ملاحظات أو تفاصيل إضافية (اختياري)
- `src/components/hr/AddPersonnelDocumentDialog.tsx:334` : مثال: شهادة تدريبية مسلمة من المركز الوطني، مرجع المراسلة الإدارية...
- `src/components/hr/AddPersonnelDocumentDialog.tsx:349` : جاري الربط...
- `src/components/hr/AddPersonnelDocumentDialog.tsx:352` : تأكيد الربط بالملف
- `src/components/hr/AddPersonnelDocumentDialog.tsx:362` : إلغاء

#### `src/components/hr/AssociationTypeBadge.tsx` (5 lignes)
- `src/components/hr/AssociationTypeBadge.tsx:14` : تدريب
- `src/components/hr/AssociationTypeBadge.tsx:25` : تكوين
- `src/components/hr/AssociationTypeBadge.tsx:36` : شهادة | دبلوم
- `src/components/hr/AssociationTypeBadge.tsx:47` : قرار
- `src/components/hr/AssociationTypeBadge.tsx:64` : أخرى

#### `src/components/hr/DiplomeFormDialog.tsx` (22 lignes)
- `src/components/hr/DiplomeFormDialog.tsx:87` : تم تعديل الشهادة بنجاح | تمت إضافة الشهادة بنجاح
- `src/components/hr/DiplomeFormDialog.tsx:93` : حدث خطأ أثناء حفظ الشهادة
- `src/components/hr/DiplomeFormDialog.tsx:100` : نوع الشهادة مطلوب
- `src/components/hr/DiplomeFormDialog.tsx:103` : موضوع / اختصاص الشهادة مطلوب
- `src/components/hr/DiplomeFormDialog.tsx:106` : تاريخ الحصول على الشهادة مطلوب
- `src/components/hr/DiplomeFormDialog.tsx:133` : تعديل بيانات الشهادة | إضافة شهادة علمية / مهنية جديدة
- `src/components/hr/DiplomeFormDialog.tsx:136` : سجل الشهادات الأكاديمية والمهنية والتكوينية المحرزة
- `src/components/hr/DiplomeFormDialog.tsx:144` : نوع الشهادة *
- `src/components/hr/DiplomeFormDialog.tsx:152` : مثال: الإجازة / الماجستير / شهادة ختم تكوين
- `src/components/hr/DiplomeFormDialog.tsx:167` : موضوع / اختصاص الشهادة *
- `src/components/hr/DiplomeFormDialog.tsx:175` : مثال: علوم التصرف / حقوق / هندسة الإعلامية
- `src/components/hr/DiplomeFormDialog.tsx:192` : تاريخ الحصول على الشهادة *
- `src/components/hr/DiplomeFormDialog.tsx:215` : المستوى التعليمي / الصنف
- `src/components/hr/DiplomeFormDialog.tsx:220` : مثال: صنف أ2 / بكالوريا + 3
- `src/components/hr/DiplomeFormDialog.tsx:229` : المؤسسة المانحة / الجامعة
- `src/components/hr/DiplomeFormDialog.tsx:234` : مثال: جامعة تونس المنار / معهد التكوين المستمر
- `src/components/hr/DiplomeFormDialog.tsx:241` : المرجع / رقم التسجيل
- `src/components/hr/DiplomeFormDialog.tsx:246` : مثال: رقم الشهادة أو المرجع 9874/2021
- `src/components/hr/DiplomeFormDialog.tsx:254` : ملاحظات إضافية
- `src/components/hr/DiplomeFormDialog.tsx:259` : أي ملاحظات حول الشهادة أو المعادلة...
- `src/components/hr/DiplomeFormDialog.tsx:273` : إلغاء
- `src/components/hr/DiplomeFormDialog.tsx:281` : جاري الحفظ... | حفظ الشهادة

#### `src/components/hr/InlineCreateUserModal.tsx` (31 lignes)
- `src/components/hr/InlineCreateUserModal.tsx:97` : تم إنشاء كلمة مرور جديدة
- `src/components/hr/InlineCreateUserModal.tsx:104` : تم نسخ ${field === | اسم المستخدم | كلمة المرور
- `src/components/hr/InlineCreateUserModal.tsx:112` : اسم المستخدم مطلوب
- `src/components/hr/InlineCreateUserModal.tsx:113` : كلمة المرور مطلوبة
- `src/components/hr/InlineCreateUserModal.tsx:142` : تم إنشاء حساب المستخدم (${username}) وربطه بنجاح
- `src/components/hr/InlineCreateUserModal.tsx:157` : الإدارة العامة للتشفير
- `src/components/hr/InlineCreateUserModal.tsx:160` : تم تحميل بطاقة الاتصال بالنظام (PDF)
- `src/components/hr/InlineCreateUserModal.tsx:163` : تعذر توليد ملف PDF للبطاقة، لكن تم إنشاء الحساب بنجاح
- `src/components/hr/InlineCreateUserModal.tsx:172` : فشل في إنشاء حساب المستخدم
- `src/components/hr/InlineCreateUserModal.tsx:189` : إنشاء حساب مستخدم سريع للبطاقة
- `src/components/hr/InlineCreateUserModal.tsx:192` : سيتم إنشاء حساب مستخدم للنظام وربطه تلقائياً ببطاقة الموظف:
- `src/components/hr/InlineCreateUserModal.tsx:203` : القسم:
- `src/components/hr/InlineCreateUserModal.tsx:210` : الرتبة / الخطة:
- `src/components/hr/InlineCreateUserModal.tsx:218` : اسم المستخدم (Nom d'utilisateur)
- `src/components/hr/InlineCreateUserModal.tsx:235` : نسخ اسم المستخدم
- `src/components/hr/InlineCreateUserModal.tsx:250` : كلمة المرور المؤقتة (Mot de passe)
- `src/components/hr/InlineCreateUserModal.tsx:260` : إعادة توليد
- `src/components/hr/InlineCreateUserModal.tsx:277` : نسخ كلمة المرور
- `src/components/hr/InlineCreateUserModal.tsx:291` : الدور الوظيفي في النظام (Rôle)
- `src/components/hr/InlineCreateUserModal.tsx:298` : اختر الدور
- `src/components/hr/InlineCreateUserModal.tsx:301` : مدير الإدارة (Director)
- `src/components/hr/InlineCreateUserModal.tsx:302` : مكتب الضبط (AdminTuningDesk)
- `src/components/hr/InlineCreateUserModal.tsx:303` : مدير قسم (AdminDepartment)
- `src/components/hr/InlineCreateUserModal.tsx:304` : موظف عادي (User)
- `src/components/hr/InlineCreateUserModal.tsx:315` : القسم الإداري المرتبط
- `src/components/hr/InlineCreateUserModal.tsx:322` : اختر القسم
- `src/components/hr/InlineCreateUserModal.tsx:325` : بدون قسم محدد (تنسيق عام)
- `src/components/hr/InlineCreateUserModal.tsx:349` : تحميل بطاقة بيانات الدخول بصيغة PDF فور الحفظ (نصف صفحة A4)
- `src/components/hr/InlineCreateUserModal.tsx:363` : إلغاء
- `src/components/hr/InlineCreateUserModal.tsx:374` : جاري الإنشاء والربط...
- `src/components/hr/InlineCreateUserModal.tsx:379` : تأكيد وإنشاء الحساب

#### `src/components/hr/MyDocumentsList.tsx` (11 lignes)
- `src/components/hr/MyDocumentsList.tsx:53` : جاري تحميل الوثائق المرتبطة...
- `src/components/hr/MyDocumentsList.tsx:63` : تعذر تحميل الوثائق المرتبطة
- `src/components/hr/MyDocumentsList.tsx:70` : إعادة المحاولة
- `src/components/hr/MyDocumentsList.tsx:87` : الوثائق الإدارية والتدريبية (Formation et Stage)
- `src/components/hr/MyDocumentsList.tsx:94` : قائمة الوثائق والمراسلات الإدارية والتكوينية المرتبطة بملفك الشخصي
- `src/components/hr/MyDocumentsList.tsx:108` : لا توجد أي وثائق تدريبية أو إدارية أو شواهد مرتبطة بملفك المهني في الوقت الحالي.
- `src/components/hr/MyDocumentsList.tsx:144` : مراسلة واردة | مراسلة صادرة
- `src/components/hr/MyDocumentsList.tsx:160` : بدون موضوع
- `src/components/hr/MyDocumentsList.tsx:175` : تاريخ الربط: {formatArabicDate(assoc.dateAssociation || assoc.createdAt || '')}
- `src/components/hr/MyDocumentsList.tsx:180` : • تاريخ الوثيقة: {formatArabicDate(doc.entryDate || doc.issueDate)}
- `src/components/hr/MyDocumentsList.tsx:197` : فتح الوثيقة

#### `src/components/hr/PersonnelCard.tsx` (3 lignes)
- `src/components/hr/PersonnelCard.tsx:33` : قسم محدد
- `src/components/hr/PersonnelCard.tsx:34` : غير محدد
- `src/components/hr/PersonnelCard.tsx:96` : عرض التفاصيل

#### `src/components/hr/PersonnelDocumentsList.tsx` (25 lignes)
- `src/components/hr/PersonnelDocumentsList.tsx:81` : تم إلغاء ربط الوثيقة بنجاح
- `src/components/hr/PersonnelDocumentsList.tsx:87` : فشل في إلغاء ربط الوثيقة
- `src/components/hr/PersonnelDocumentsList.tsx:102` : الوثائق الإدارية والمراسلات المرتبطة بالموظف
- `src/components/hr/PersonnelDocumentsList.tsx:105` : {documents.length} وثيقة
- `src/components/hr/PersonnelDocumentsList.tsx:109` : سجل الشواهد، التدريبات، القرارات والمراسلات الرسمية ذات الصلة بالملف الإداري
- `src/components/hr/PersonnelDocumentsList.tsx:121` : إضافة وثيقة للملف
- `src/components/hr/PersonnelDocumentsList.tsx:130` : جاري تحميل سجل وثائق الموظف...
- `src/components/hr/PersonnelDocumentsList.tsx:135` : فشل في تحميل وثائق الموظف
- `src/components/hr/PersonnelDocumentsList.tsx:141` : لا توجد وثائق أو مراسلات مرتبطة بهذا الموظف حالياً
- `src/components/hr/PersonnelDocumentsList.tsx:144` : يمكنك ربط مراسلات واردة أو صادرة (شواهد، تكوينات، قرارات تعيين، شواهد عمل) بأرشيف الموظف لتوثيق مساره الإداري.
- `src/components/hr/PersonnelDocumentsList.tsx:154` : ربط وثيقة الآن
- `src/components/hr/PersonnelDocumentsList.tsx:184` : مراسلة واردة | مراسلة صادرة
- `src/components/hr/PersonnelDocumentsList.tsx:204` : بدون موضوع
- `src/components/hr/PersonnelDocumentsList.tsx:219` : تاريخ الربط: {formatArabicDate(assoc.dateAssociation || assoc.createdAt || '')}
- `src/components/hr/PersonnelDocumentsList.tsx:225` : بواسطة: {assoc.associePar.username}
- `src/components/hr/PersonnelDocumentsList.tsx:231` : • تاريخ المراسلة: {formatArabicDate(doc.entryDate || doc.issueDate)}
- `src/components/hr/PersonnelDocumentsList.tsx:247` : عرض الوثيقة
- `src/components/hr/PersonnelDocumentsList.tsx:258` : تعديل الربط
- `src/components/hr/PersonnelDocumentsList.tsx:259` : تعديل الربط
- `src/components/hr/PersonnelDocumentsList.tsx:270` : إلغاء الربط
- `src/components/hr/PersonnelDocumentsList.tsx:271` : إلغاء الربط
- `src/components/hr/PersonnelDocumentsList.tsx:313` : تأكيد إلغاء ربط الوثيقة
- `src/components/hr/PersonnelDocumentsList.tsx:316` : هل أنت متأكد من رغبتك في إلغاء ربط هذه الوثيقة بملف الموظف؟ لن يتم حذف الوثيقة الأصلية من الأرشيف، بل سيتم فقط فك ارتباطها بهذا الملف الإداري.
- `src/components/hr/PersonnelDocumentsList.tsx:329` : جاري الإلغاء... | نعم، إلغاء الربط
- `src/components/hr/PersonnelDocumentsList.tsx:335` : تراجع

#### `src/components/hr/PersonnelForm.tsx` (7 lignes)
- `src/components/hr/PersonnelForm.tsx:303` : يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)
- `src/components/hr/PersonnelForm.tsx:311` : حجم الصورة يتجاوز الحد الأقصى المسموح به (2 ميغابايت)
- `src/components/hr/PersonnelForm.tsx:342` : تم تحديث صورة الموظف بنجاح
- `src/components/hr/PersonnelForm.tsx:345` : حدث خطأ أثناء رفع الصورة، يرجى المحاولة مرة أخرى
- `src/components/hr/PersonnelForm.tsx:346` : تعذر رفع الصورة
- `src/components/hr/PersonnelForm.tsx:355` : اللقب إجباري
- `src/components/hr/PersonnelForm.tsx:358` : الاسم إجباري

#### `src/components/hr/PersonnelStatusBadge.tsx` (3 lignes)
- `src/components/hr/PersonnelStatusBadge.tsx:16` : نشط
- `src/components/hr/PersonnelStatusBadge.tsx:24` : غير نشط
- `src/components/hr/PersonnelStatusBadge.tsx:33` : في الانتظار

#### `src/components/hr/PosteFormDialog.tsx` (19 lignes)
- `src/components/hr/PosteFormDialog.tsx:82` : تم تعديل الخطة بنجاح | تمت إضافة الخطة بنجاح
- `src/components/hr/PosteFormDialog.tsx:88` : حدث خطأ أثناء حفظ الخطة
- `src/components/hr/PosteFormDialog.tsx:95` : اسم الخطة الوظيفية مطلوب
- `src/components/hr/PosteFormDialog.tsx:98` : تاريخ التعيين أو المباشرة مطلوب
- `src/components/hr/PosteFormDialog.tsx:101` : تاريخ الانتهاء لا يمكن أن يكون قبل تاريخ البداية
- `src/components/hr/PosteFormDialog.tsx:127` : تعديل بيانات الخطة الوظيفية | إضافة خطة وظيفية جديدة
- `src/components/hr/PosteFormDialog.tsx:130` : سجل الخطط الوظيفية والتكليفات الإدارية الخاصة بالموظف
- `src/components/hr/PosteFormDialog.tsx:137` : الخطة الوظيفية / التكليف *
- `src/components/hr/PosteFormDialog.tsx:145` : مثال: رئيس مصلحة الموارد البشرية / كاتب تصرف
- `src/components/hr/PosteFormDialog.tsx:161` : تاريخ المباشرة / البداية *
- `src/components/hr/PosteFormDialog.tsx:184` : تاريخ الانتهاء (اختياري)
- `src/components/hr/PosteFormDialog.tsx:209` : المرجع / التكليف
- `src/components/hr/PosteFormDialog.tsx:214` : مثال: مذكرة تعيين عدد 12/2024
- `src/components/hr/PosteFormDialog.tsx:221` : مكان العمل / الإدارة
- `src/components/hr/PosteFormDialog.tsx:226` : مثال: الإدارة العامة للشؤون الإدارية
- `src/components/hr/PosteFormDialog.tsx:234` : ملاحظات إضافية
- `src/components/hr/PosteFormDialog.tsx:239` : أي تفاصيل أو ملاحظات حول الخطة الوظيفية...
- `src/components/hr/PosteFormDialog.tsx:253` : إلغاء
- `src/components/hr/PosteFormDialog.tsx:261` : جاري الحفظ... | حفظ الخطة

#### `src/components/hr/PromotionFormDialog.tsx` (19 lignes)
- `src/components/hr/PromotionFormDialog.tsx:84` : تم تعديل الترقية بنجاح | تمت إضافة الترقية بنجاح
- `src/components/hr/PromotionFormDialog.tsx:90` : حدث خطأ أثناء حفظ الترقية
- `src/components/hr/PromotionFormDialog.tsx:97` : الرتبة الجديدة مطلوبة
- `src/components/hr/PromotionFormDialog.tsx:100` : تاريخ الترقية مطلوب
- `src/components/hr/PromotionFormDialog.tsx:126` : تعديل بيانات الترقية | إضافة ترقية جديدة
- `src/components/hr/PromotionFormDialog.tsx:129` : سجل الترقيات الإدارية وتغييرات الرتب الخاصة بالموظف
- `src/components/hr/PromotionFormDialog.tsx:137` : الرتبة السابقة
- `src/components/hr/PromotionFormDialog.tsx:142` : مثال: متصرف مساعد
- `src/components/hr/PromotionFormDialog.tsx:149` : الرتبة الجديدة *
- `src/components/hr/PromotionFormDialog.tsx:157` : مثال: متصرف
- `src/components/hr/PromotionFormDialog.tsx:174` : تاريخ الترقية *
- `src/components/hr/PromotionFormDialog.tsx:197` : المرجع / القرار
- `src/components/hr/PromotionFormDialog.tsx:202` : مثال: قرار وزاري عدد 550
- `src/components/hr/PromotionFormDialog.tsx:210` : سبب أو نمط الترقية
- `src/components/hr/PromotionFormDialog.tsx:215` : مثال: بالمناظرة الداخلية / بالاختيار / بالامتحان المهني
- `src/components/hr/PromotionFormDialog.tsx:222` : ملاحظات إضافية
- `src/components/hr/PromotionFormDialog.tsx:227` : أي ملاحظات تخص هذه الترقية...
- `src/components/hr/PromotionFormDialog.tsx:241` : إلغاء
- `src/components/hr/PromotionFormDialog.tsx:249` : جاري الحفظ... | حفظ الترقية

#### `src/components/hr/SanctionFormDialog.tsx` (19 lignes)
- `src/components/hr/SanctionFormDialog.tsx:84` : تم تعديل العقوبة بنجاح | تمت إضافة العقوبة بنجاح
- `src/components/hr/SanctionFormDialog.tsx:90` : حدث خطأ أثناء حفظ العقوبة
- `src/components/hr/SanctionFormDialog.tsx:97` : تاريخ العقوبة مطلوب
- `src/components/hr/SanctionFormDialog.tsx:100` : سبب العقوبة مطلوب
- `src/components/hr/SanctionFormDialog.tsx:126` : تعديل بيانات العقوبة | إضافة عقوبة تأديبية جديدة
- `src/components/hr/SanctionFormDialog.tsx:129` : سجل العقوبات والإجراءات التأديبية الخاصة بالموظف
- `src/components/hr/SanctionFormDialog.tsx:137` : تاريخ العقوبة *
- `src/components/hr/SanctionFormDialog.tsx:160` : عدد الأيام (إن وجد)
- `src/components/hr/SanctionFormDialog.tsx:167` : مثال: 3
- `src/components/hr/SanctionFormDialog.tsx:175` : سبب العقوبة *
- `src/components/hr/SanctionFormDialog.tsx:183` : مثال: غياب غير مبرر / إخلال بالواجب المهني
- `src/components/hr/SanctionFormDialog.tsx:199` : نوع أو درجة العقوبة
- `src/components/hr/SanctionFormDialog.tsx:204` : مثال: إنذار / توبيخ / إيقاف مؤقت
- `src/components/hr/SanctionFormDialog.tsx:211` : المرجع / القرار التأديبي
- `src/components/hr/SanctionFormDialog.tsx:216` : مثال: قرار مجلس التأديب عدد 44
- `src/components/hr/SanctionFormDialog.tsx:224` : ملاحظات إضافية
- `src/components/hr/SanctionFormDialog.tsx:229` : أي تفاصيل أو ملاحظات حول العقوبة...
- `src/components/hr/SanctionFormDialog.tsx:243` : إلغاء
- `src/components/hr/SanctionFormDialog.tsx:251` : جاري الحفظ... | حفظ العقوبة

#### `src/components/hr/StageFormDialog.tsx` (75 lignes)
- `src/components/hr/StageFormDialog.tsx:70` : تونس
- `src/components/hr/StageFormDialog.tsx:88` : تونس
- `src/components/hr/StageFormDialog.tsx:122` : تونس
- `src/components/hr/StageFormDialog.tsx:144` : تونس
- `src/components/hr/StageFormDialog.tsx:174` : تم تعديل بيانات التربص بنجاح | تمت إضافة التربص بنجاح
- `src/components/hr/StageFormDialog.tsx:180` : تعذر حفظ بيانات التربص
- `src/components/hr/StageFormDialog.tsx:189` : تمت إضافة المدرسة بنجاح
- `src/components/hr/StageFormDialog.tsx:195` : تونس
- `src/components/hr/StageFormDialog.tsx:200` : تعذر إضافة المدرسة
- `src/components/hr/StageFormDialog.tsx:208` : تونس
- `src/components/hr/StageFormDialog.tsx:209` : تونس
- `src/components/hr/StageFormDialog.tsx:217` : يرجى اختيار الموظف المعني
- `src/components/hr/StageFormDialog.tsx:218` : موضوع التربص إجباري
- `src/components/hr/StageFormDialog.tsx:219` : مكان التربص إجباري
- `src/components/hr/StageFormDialog.tsx:220` : تاريخ البداية إجباري
- `src/components/hr/StageFormDialog.tsx:221` : تاريخ النهاية إجباري
- `src/components/hr/StageFormDialog.tsx:224` : تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية
- `src/components/hr/StageFormDialog.tsx:228` : يرجى تحديد الدولة
- `src/components/hr/StageFormDialog.tsx:242` : تونس
- `src/components/hr/StageFormDialog.tsx:263` : يرجى كتابة اسم المدرسة باللغتين
- `src/components/hr/StageFormDialog.tsx:269` : تونس
- `src/components/hr/StageFormDialog.tsx:285` : تعديل بيانات التربص / التكوين | إضافة تربص جديد (تسجيل تاريخي / مباشر)
- `src/components/hr/StageFormDialog.tsx:288` : تسجيل الدورات التكوينية والتربصات المنجزة بتونس أو بالخارج لفائدة موظفي الإدارة
- `src/components/hr/StageFormDialog.tsx:298` : الموظف المعني بالتربص
- `src/components/hr/StageFormDialog.tsx:312` : -- اختر الموظف --
- `src/components/hr/StageFormDialog.tsx:317` : (ب.ت.و: ${p.cin})
- `src/components/hr/StageFormDialog.tsx:335` : نطاق التربص الجغرافي *
- `src/components/hr/StageFormDialog.tsx:347` : تربص بتونس
- `src/components/hr/StageFormDialog.tsx:361` : تربص بالخارج
- `src/components/hr/StageFormDialog.tsx:369` : الدولة *
- `src/components/hr/StageFormDialog.tsx:374` : مثال: فرنسا، الصين، تونس...
- `src/components/hr/StageFormDialog.tsx:389` : موضوع التربص / التكوين *
- `src/components/hr/StageFormDialog.tsx:397` : مثال: إدارة خوادم الشبكات، القيادة الإدارية...
- `src/components/hr/StageFormDialog.tsx:407` : مكان التربص (المعهد / المركز / المدينة) *
- `src/components/hr/StageFormDialog.tsx:415` : مثال: مدرسة العوينة، معهد الدفاع الوطني، بكين...
- `src/components/hr/StageFormDialog.tsx:429` : المدرسة / الهيكل المكون (اختياري)
- `src/components/hr/StageFormDialog.tsx:439` : إضافة مدرسة
- `src/components/hr/StageFormDialog.tsx:444` : -- اختر المدرسة إن وجدت --
- `src/components/hr/StageFormDialog.tsx:447` : -- غير محدد --
- `src/components/hr/StageFormDialog.tsx:459` : نوع التكوين (اختياري)
- `src/components/hr/StageFormDialog.tsx:463` : -- اختر نوع التكوين --
- `src/components/hr/StageFormDialog.tsx:466` : -- غير محدد --
- `src/components/hr/StageFormDialog.tsx:482` : تاريخ بداية التربص
- `src/components/hr/StageFormDialog.tsx:502` : تاريخ نهاية التربص
- `src/components/hr/StageFormDialog.tsx:524` : رقم الإرسالية / Route (اختياري)
- `src/components/hr/StageFormDialog.tsx:529` : مثال: 2024/0981
- `src/components/hr/StageFormDialog.tsx:536` : رقم التربص / المرجع (اختياري)
- `src/components/hr/StageFormDialog.tsx:541` : مثال: STG-102
- `src/components/hr/StageFormDialog.tsx:550` : حالة التربص
- `src/components/hr/StageFormDialog.tsx:556` : مكتمل / منجز (Achevé)
- `src/components/hr/StageFormDialog.tsx:557` : قيد الإنجاز (En cours)
- `src/components/hr/StageFormDialog.tsx:558` : مسجل (Inscrit)
- `src/components/hr/StageFormDialog.tsx:559` : معلق (Suspendu)
- `src/components/hr/StageFormDialog.tsx:560` : ملغى / منسحب (Abandonné)
- `src/components/hr/StageFormDialog.tsx:566` : النتيجة
- `src/components/hr/StageFormDialog.tsx:572` : -- غير محددة --
- `src/components/hr/StageFormDialog.tsx:573` : ناجح / مؤهل (Admis)
- `src/components/hr/StageFormDialog.tsx:574` : راسب / غير مؤهل (Refusé)
- `src/components/hr/StageFormDialog.tsx:575` : في انتظار النتيجة (En attente)
- `src/components/hr/StageFormDialog.tsx:581` : الملاحظة / التقدير
- `src/components/hr/StageFormDialog.tsx:585` : مثال: حسن جداً، مشرف...
- `src/components/hr/StageFormDialog.tsx:593` : ملاحظات إضافية
- `src/components/hr/StageFormDialog.tsx:598` : أية توضيحات أو تفاصيل أخرى حول هذا التربص...
- `src/components/hr/StageFormDialog.tsx:610` : إلغاء
- `src/components/hr/StageFormDialog.tsx:618` : جاري الحفظ... | حفظ التعديلات | تسجيل التربص
- `src/components/hr/StageFormDialog.tsx:631` : إضافة مدرسة تكوين جديدة
- `src/components/hr/StageFormDialog.tsx:637` : اسم المدرسة بالعربية *
- `src/components/hr/StageFormDialog.tsx:642` : مثال: مدرسة ضباط الصف
- `src/components/hr/StageFormDialog.tsx:650` : اسم المدرسة بالفرنسية / اللاتينية *
- `src/components/hr/StageFormDialog.tsx:664` : الدولة
- `src/components/hr/StageFormDialog.tsx:668` : تونس
- `src/components/hr/StageFormDialog.tsx:673` : المدينة
- `src/components/hr/StageFormDialog.tsx:677` : تونس، بنزرت...
- `src/components/hr/StageFormDialog.tsx:690` : إلغاء
- `src/components/hr/StageFormDialog.tsx:697` : جاري الإضافة... | حفظ المدرسة

#### `src/components/hr/UpdateAssociationDialog.tsx` (14 lignes)
- `src/components/hr/UpdateAssociationDialog.tsx:61` : تم تعديل بيانات الربط بنجاح
- `src/components/hr/UpdateAssociationDialog.tsx:68` : حدث خطأ أثناء تعديل بيانات الربط
- `src/components/hr/UpdateAssociationDialog.tsx:75` : يرجى اختيار طبيعة الوثيقة / نوع الربط
- `src/components/hr/UpdateAssociationDialog.tsx:91` : تعديل بيانات ربط الوثيقة
- `src/components/hr/UpdateAssociationDialog.tsx:94` : تعديل طبيعة العلاقة الإدارية أو الملاحظات التوضيحية المرفقة بالوثيقة
- `src/components/hr/UpdateAssociationDialog.tsx:101` : وارد | صادر
- `src/components/hr/UpdateAssociationDialog.tsx:103` : بدون موضوع
- `src/components/hr/UpdateAssociationDialog.tsx:110` : طبيعة الوثيقة / نوع الربط *
- `src/components/hr/UpdateAssociationDialog.tsx:119` : -- اختر طبيعة الوثيقة --
- `src/components/hr/UpdateAssociationDialog.tsx:130` : ملاحظات أو تفاصيل إضافية (اختياري)
- `src/components/hr/UpdateAssociationDialog.tsx:136` : أدخل أي إيضاحات أو مرجعيات تكميلية...
- `src/components/hr/UpdateAssociationDialog.tsx:151` : جاري الحفظ...
- `src/components/hr/UpdateAssociationDialog.tsx:154` : حفظ التعديلات
- `src/components/hr/UpdateAssociationDialog.tsx:164` : إلغاء

#### `src/components/hr/wizard/Step1Identity.tsx` (45 lignes)
- `src/components/hr/wizard/Step1Identity.tsx:123` : المعلومات الشخصية والهوية (Identité)
- `src/components/hr/wizard/Step1Identity.tsx:135` : صورة الموظف
- `src/components/hr/wizard/Step1Identity.tsx:141` : بدون صورة
- `src/components/hr/wizard/Step1Identity.tsx:149` : جاري الرفع...
- `src/components/hr/wizard/Step1Identity.tsx:159` : تغيير الصورة
- `src/components/hr/wizard/Step1Identity.tsx:169` : صورة الموظف (Photo)
- `src/components/hr/wizard/Step1Identity.tsx:171` : JPG، PNG، WEBP
- `src/components/hr/wizard/Step1Identity.tsx:172` : 2 ميغابايت
- `src/components/hr/wizard/Step1Identity.tsx:173` : يُفضل استخدام صورة شخصية حديثة مربعة الأبعاد وواضحة الملامح.
- `src/components/hr/wizard/Step1Identity.tsx:198` : تغيير الصورة | اختيار صورة
- `src/components/hr/wizard/Step1Identity.tsx:213` : جاري الرفع...
- `src/components/hr/wizard/Step1Identity.tsx:218` : حفظ الصورة الآن
- `src/components/hr/wizard/Step1Identity.tsx:235` : حذف الصورة
- `src/components/hr/wizard/Step1Identity.tsx:255` : اللقب (Nom)
- `src/components/hr/wizard/Step1Identity.tsx:265` : مثال: بنعلي
- `src/components/hr/wizard/Step1Identity.tsx:281` : الاسم (Prénom)
- `src/components/hr/wizard/Step1Identity.tsx:291` : مثال: محمد
- `src/components/hr/wizard/Step1Identity.tsx:307` : اسم الأب (Nom du père)
- `src/components/hr/wizard/Step1Identity.tsx:313` : مثال: أحمد
- `src/components/hr/wizard/Step1Identity.tsx:321` : اسم الجد (Nom du grand-père)
- `src/components/hr/wizard/Step1Identity.tsx:327` : مثال: صالح
- `src/components/hr/wizard/Step1Identity.tsx:335` : اسم الأم (Nom de la mère)
- `src/components/hr/wizard/Step1Identity.tsx:341` : مثال: فاطمة
- `src/components/hr/wizard/Step1Identity.tsx:349` : الجنس (Sexe)
- `src/components/hr/wizard/Step1Identity.tsx:353` : اختر الجنس
- `src/components/hr/wizard/Step1Identity.tsx:356` : غير محدد
- `src/components/hr/wizard/Step1Identity.tsx:357` : ذكر (Homme)
- `src/components/hr/wizard/Step1Identity.tsx:358` : أنثى (Femme)
- `src/components/hr/wizard/Step1Identity.tsx:366` : الفصيلة الدموية (Groupe sanguin)
- `src/components/hr/wizard/Step1Identity.tsx:370` : اختر الفصيلة الدموية
- `src/components/hr/wizard/Step1Identity.tsx:373` : غير محدد
- `src/components/hr/wizard/Step1Identity.tsx:389` : تاريخ الازدياد (Date de naissance)
- `src/components/hr/wizard/Step1Identity.tsx:403` : مكان الازدياد (Lieu de naissance)
- `src/components/hr/wizard/Step1Identity.tsx:409` : مثال: تونس العاصمة / صفاقس...
- `src/components/hr/wizard/Step1Identity.tsx:417` : رقم بطاقة التعريف الوطنية (CIN)
- `src/components/hr/wizard/Step1Identity.tsx:423` : مثال: 08123456
- `src/components/hr/wizard/Step1Identity.tsx:431` : تاريخ إصدار بطاقة التعريف (Émission CIN)
- `src/components/hr/wizard/Step1Identity.tsx:445` : رقم جواز السفر (رقم ب.ت.ع / Passeport)
- `src/components/hr/wizard/Step1Identity.tsx:451` : مثال: T1234567
- `src/components/hr/wizard/Step1Identity.tsx:459` : تاريخ صلوحية جواز السفر (Validité passeport)
- `src/components/hr/wizard/Step1Identity.tsx:475` : الهاتف (Téléphone)
- `src/components/hr/wizard/Step1Identity.tsx:481` : مثال: 98123456
- `src/components/hr/wizard/Step1Identity.tsx:489` : البريد الإلكتروني الشخصي (Email)
- `src/components/hr/wizard/Step1Identity.tsx:504` : العنوان الشخصي (Adresse)
- `src/components/hr/wizard/Step1Identity.tsx:510` : العنوان الكامل للإقامة...

#### `src/components/hr/wizard/Step2Family.tsx` (12 lignes)
- `src/components/hr/wizard/Step2Family.tsx:38` : الحالة العائلية (Situation familiale)
- `src/components/hr/wizard/Step2Family.tsx:45` : الحالة المدنية (État civil)
- `src/components/hr/wizard/Step2Family.tsx:49` : اختر الحالة المدنية
- `src/components/hr/wizard/Step2Family.tsx:52` : غير محدد
- `src/components/hr/wizard/Step2Family.tsx:53` : أعزب / عزباء
- `src/components/hr/wizard/Step2Family.tsx:54` : متزوج / متزوجة
- `src/components/hr/wizard/Step2Family.tsx:55` : مطلق / مطلقة
- `src/components/hr/wizard/Step2Family.tsx:56` : أرمل / أرملة
- `src/components/hr/wizard/Step2Family.tsx:64` : اسم القرين (Nom du conjoint)
- `src/components/hr/wizard/Step2Family.tsx:70` : اسم ولقب الزوج أو الزوجة...
- `src/components/hr/wizard/Step2Family.tsx:78` : تاريخ الزواج (Date de mariage)
- `src/components/hr/wizard/Step2Family.tsx:92` : عدد الأبناء (Nombre d'enfants)

#### `src/components/hr/wizard/Step3Admin.tsx` (26 lignes)
- `src/components/hr/wizard/Step3Admin.tsx:83` : المعلومات المهنية والإدارية (Situation administrative)
- `src/components/hr/wizard/Step3Admin.tsx:90` : الخطة / المنصب الحالي (Poste actuel)
- `src/components/hr/wizard/Step3Admin.tsx:99` : مثال: رئيس مصلحة / متصرف...
- `src/components/hr/wizard/Step3Admin.tsx:107` : القسم الرئيسي (Département)
- `src/components/hr/wizard/Step3Admin.tsx:115` : اختر القسم
- `src/components/hr/wizard/Step3Admin.tsx:118` : غير محدد
- `src/components/hr/wizard/Step3Admin.tsx:131` : تاريخ التعيين أو الالتحاق (Date d'embauche)
- `src/components/hr/wizard/Step3Admin.tsx:145` : رقم الوحدة (Numéro d'unité)
- `src/components/hr/wizard/Step3Admin.tsx:151` : مثال: 104
- `src/components/hr/wizard/Step3Admin.tsx:159` : الرقم العسكري (Numéro d'armée)
- `src/components/hr/wizard/Step3Admin.tsx:165` : مثال: 12345/A
- `src/components/hr/wizard/Step3Admin.tsx:173` : تاريخ الانخراط (Date d'engagement)
- `src/components/hr/wizard/Step3Admin.tsx:187` : نوع الانخراط (Type d'engagement)
- `src/components/hr/wizard/Step3Admin.tsx:193` : مثال: مباشر / متعاقد / تطوع...
- `src/components/hr/wizard/Step3Admin.tsx:201` : أصل الانخراط (Origine d'engagement)
- `src/components/hr/wizard/Step3Admin.tsx:207` : مثال: الأكاديمية العسكرية / مدرسة الرقباء...
- `src/components/hr/wizard/Step3Admin.tsx:215` : المستوى الدراسي (Niveau d'étude)
- `src/components/hr/wizard/Step3Admin.tsx:221` : مثال: تعليم عالي / باكالوريا...
- `src/components/hr/wizard/Step3Admin.tsx:229` : المؤهل / الشهادة الأساسية (المؤهل)
- `src/components/hr/wizard/Step3Admin.tsx:235` : مثال: إجازة تطبيقية / ماجستير / مؤهل ضابط...
- `src/components/hr/wizard/Step3Admin.tsx:243` : الإختصاص (Spécialité)
- `src/components/hr/wizard/Step3Admin.tsx:249` : مثال: إعلامية / اتصالات / لوجستيك...
- `src/components/hr/wizard/Step3Admin.tsx:257` : السلاح (Arme)
- `src/components/hr/wizard/Step3Admin.tsx:263` : مثال: الإشارة / المشاة / النقل...
- `src/components/hr/wizard/Step3Admin.tsx:272` : ملاحظات إضافية (Notes)
- `src/components/hr/wizard/Step3Admin.tsx:279` : ملاحظات أو تعليقات تخص ملف الموظف...

#### `src/components/hr/wizard/Step4Contacts.tsx` (28 lignes)
- `src/components/hr/wizard/Step4Contacts.tsx:28` : الأشخاص الواجب إعلامهم عند الطوارئ (3 personnes à prévenir)
- `src/components/hr/wizard/Step4Contacts.tsx:36` : الشخص الأول (Personne 1)
- `src/components/hr/wizard/Step4Contacts.tsx:40` : الاسم واللقب
- `src/components/hr/wizard/Step4Contacts.tsx:45` : اسم ولقب الشخص...
- `src/components/hr/wizard/Step4Contacts.tsx:51` : صلة القرابة
- `src/components/hr/wizard/Step4Contacts.tsx:56` : مثال: أب / زوجة / أخ...
- `src/components/hr/wizard/Step4Contacts.tsx:62` : رقم الهاتف
- `src/components/hr/wizard/Step4Contacts.tsx:67` : مثال: 98123456
- `src/components/hr/wizard/Step4Contacts.tsx:74` : العنوان
- `src/components/hr/wizard/Step4Contacts.tsx:79` : عنوان الإقامة...
- `src/components/hr/wizard/Step4Contacts.tsx:89` : الشخص الثاني (Personne 2)
- `src/components/hr/wizard/Step4Contacts.tsx:93` : الاسم واللقب
- `src/components/hr/wizard/Step4Contacts.tsx:98` : اسم ولقب الشخص...
- `src/components/hr/wizard/Step4Contacts.tsx:104` : صلة القرابة
- `src/components/hr/wizard/Step4Contacts.tsx:109` : مثال: أم / أخت / صديق...
- `src/components/hr/wizard/Step4Contacts.tsx:115` : رقم الهاتف
- `src/components/hr/wizard/Step4Contacts.tsx:120` : مثال: 98123456
- `src/components/hr/wizard/Step4Contacts.tsx:127` : العنوان
- `src/components/hr/wizard/Step4Contacts.tsx:132` : عنوان الإقامة...
- `src/components/hr/wizard/Step4Contacts.tsx:142` : الشخص الثالث (Personne 3)
- `src/components/hr/wizard/Step4Contacts.tsx:146` : الاسم واللقب
- `src/components/hr/wizard/Step4Contacts.tsx:151` : اسم ولقب الشخص...
- `src/components/hr/wizard/Step4Contacts.tsx:157` : صلة القرابة
- `src/components/hr/wizard/Step4Contacts.tsx:162` : مثال: قريب / جار...
- `src/components/hr/wizard/Step4Contacts.tsx:168` : رقم الهاتف
- `src/components/hr/wizard/Step4Contacts.tsx:173` : مثال: 98123456
- `src/components/hr/wizard/Step4Contacts.tsx:180` : العنوان
- `src/components/hr/wizard/Step4Contacts.tsx:185` : عنوان الإقامة...

#### `src/components/layouts/HubLayout.tsx` (1 lignes)
- `src/components/layouts/HubLayout.tsx:74` : الرئيسية

#### `src/components/layouts/HubLayouts.tsx` (5 lignes)
- `src/components/layouts/HubLayouts.tsx:72` : إدارة المراسلات الواردة والصادرة والمجلدات
- `src/components/layouts/HubLayouts.tsx:145` : إدارة الموظفين والحضور والتربصات
- `src/components/layouts/HubLayouts.tsx:184` : النماذج وإعدادات الوثائق
- `src/components/layouts/HubLayouts.tsx:222` : معلوماتك الشخصية وسجل الحضور
- `src/components/layouts/HubLayouts.tsx:289` : إدارة النظام والمستخدمين والإعدادات

#### `src/components/messages/ComposeMessage.tsx` (12 lignes)
- `src/components/messages/ComposeMessage.tsx:68` : خطأ في الإرسال
- `src/components/messages/ComposeMessage.tsx:87` : تنبيه
- `src/components/messages/ComposeMessage.tsx:94` : تنبيه
- `src/components/messages/ComposeMessage.tsx:124` : إرسال رسالة رسمية جديدة إلى مستخدم أو مجموعة مستخدمين
- `src/components/messages/ComposeMessage.tsx:133` : إغلاق النافذة
- `src/components/messages/ComposeMessage.tsx:134` : إغلاق النافذة
- `src/components/messages/ComposeMessage.tsx:163` : أدخل موضوع الرسالة...
- `src/components/messages/ComposeMessage.tsx:174` : درجة الأولوية
- `src/components/messages/ComposeMessage.tsx:186` : عادية
- `src/components/messages/ComposeMessage.tsx:198` : مرتفعة
- `src/components/messages/ComposeMessage.tsx:210` : عاجلة
- `src/components/messages/ComposeMessage.tsx:240` : (PDF, صور، مستندات)

#### `src/components/messages/ContactSelector.tsx` (2 lignes)
- `src/components/messages/ContactSelector.tsx:125` : ${selectedContacts.length} مستلم محدد
- `src/components/messages/ContactSelector.tsx:126` : اختر المستلمين...

#### `src/components/messages/ContactsList.tsx` (7 lignes)
- `src/components/messages/ContactsList.tsx:113` : دليل المستخدمين ومسؤولي الأقسام المتاحين للمراسلة
- `src/components/messages/ContactsList.tsx:124` : مراسلة ({selectedUsers.length})
- `src/components/messages/ContactsList.tsx:154` : الكل ({Object.values(roleCounts).reduce((a, b) => a + b, 0)})
- `src/components/messages/ContactsList.tsx:180` : المستخدمون المحددون ({selectedUsers.length}):
- `src/components/messages/ContactsList.tsx:260` : قسم: {user.activeDepartment.name}
- `src/components/messages/ContactsList.tsx:274` : مراسلة فورية
- `src/components/messages/ContactsList.tsx:277` : مراسلة

#### `src/components/messages/CrossRoleMessagingInfo.tsx` (16 lignes)
- `src/components/messages/CrossRoleMessagingInfo.tsx:13` : النظام
- `src/components/messages/CrossRoleMessagingInfo.tsx:17` : كمستخدم في قسم ${currentDept}، يمكنك إرسال واستقبال المراسلات الرسمية مع جميع الأقسام والأدوار بدون قيود
- `src/components/messages/CrossRoleMessagingInfo.tsx:19` : كمدير قسم ${currentDept}، يمكنك التواصل المباشر مع جميع الإدارات والأقسام المعتمدة
- `src/components/messages/CrossRoleMessagingInfo.tsx:21` : كمدير مكتب التنسيق، يمكنك المراسلة والتنسيق عبر كافة أقسام ووحدات المنظومة
- `src/components/messages/CrossRoleMessagingInfo.tsx:23` : كمدير عام للمنظومة، تملك صلاحيات المراسلة الشاملة لجميع المستخدمين والأقسام
- `src/components/messages/CrossRoleMessagingInfo.tsx:25` : يمكنك التواصل والمراسلة مع جميع الأقسام والجهات المصرح لها
- `src/components/messages/CrossRoleMessagingInfo.tsx:41` : نظام المراسلات الإدارية الموحدة — قناة آمنة وموثقة للمراسلات بين مختلف الإدارات والأقسام
- `src/components/messages/CrossRoleMessagingInfo.tsx:51` : إخفاء التفاصيل | دليل الصلاحيات
- `src/components/messages/CrossRoleMessagingInfo.tsx:62` : الإدارة العامة (Admin)
- `src/components/messages/CrossRoleMessagingInfo.tsx:65` : مراسلات مركزية، توجيهات عامة وإعلانات رسمية لكافة المكاتب والأقسام.
- `src/components/messages/CrossRoleMessagingInfo.tsx:72` : مديرو الأقسام (Department)
- `src/components/messages/CrossRoleMessagingInfo.tsx:75` : مراسلات رسمية متبادلة وتنسيق مباشر بين الإدارات والأقسام المعتمدة.
- `src/components/messages/CrossRoleMessagingInfo.tsx:82` : مكتب التنسيق (TuningDesk)
- `src/components/messages/CrossRoleMessagingInfo.tsx:85` : متابعة سير المعاملات الإدارية وتبادل المذكرات التنسيقية المشتركة.
- `src/components/messages/CrossRoleMessagingInfo.tsx:92` : الموظفون (User)
- `src/components/messages/CrossRoleMessagingInfo.tsx:95` : رفع التقارير الميدانية والمراسلة المباشرة مع المسؤولين والمصالح المعنية.

#### `src/components/messages/MessageComposer.tsx` (8 lignes)
- `src/components/messages/MessageComposer.tsx:55` : خطأ
- `src/components/messages/MessageComposer.tsx:73` : تنبيه
- `src/components/messages/MessageComposer.tsx:80` : تنبيه
- `src/components/messages/MessageComposer.tsx:144` : الأولوية
- `src/components/messages/MessageComposer.tsx:151` : عادية
- `src/components/messages/MessageComposer.tsx:152` : مرتفعة
- `src/components/messages/MessageComposer.tsx:153` : عاجلة جداً
- `src/components/messages/MessageComposer.tsx:191` : إرفاق ملفات ({attachments.length})

#### `src/components/messages/MessageHistoryStats.tsx` (1 lignes)
- `src/components/messages/MessageHistoryStats.tsx:52` : جديد

#### `src/components/messages/MessageThreadHeader.tsx` (8 lignes)
- `src/components/messages/MessageThreadHeader.tsx:109` : عاجل جداً
- `src/components/messages/MessageThreadHeader.tsx:114` : أولوية مرتفعة
- `src/components/messages/MessageThreadHeader.tsx:122` : رسالة جماعية | رسالة فردية
- `src/components/messages/MessageThreadHeader.tsx:127` : عبر الأقسام
- `src/components/messages/MessageThreadHeader.tsx:138` : المرسل:
- `src/components/messages/MessageThreadHeader.tsx:158` : المستلمون:
- `src/components/messages/MessageThreadHeader.tsx:173` : مقروءة
- `src/components/messages/MessageThreadHeader.tsx:177` : غير مقروءة

#### `src/components/messages/MessagesList.tsx` (11 lignes)
- `src/components/messages/MessagesList.tsx:95` : إلى: ${names[0]}
- `src/components/messages/MessagesList.tsx:96` : إلى: ${names[0]} (+${names.length - 1})
- `src/components/messages/MessagesList.tsx:98` : إلى: مستلم غير معروف
- `src/components/messages/MessagesList.tsx:152` : عاجل
- `src/components/messages/MessagesList.tsx:159` : مرتفع
- `src/components/messages/MessagesList.tsx:205` : لم يتم العثور على أي رسائل مطابقة | لا توجد رسائل مرسلة | صندوق الوارد فارغ
- `src/components/messages/MessagesList.tsx:208` : جرّب تعديل كلمات البحث | ابدأ بكتابة رسالة جديدة للتواصل مع زملائك
- `src/components/messages/MessagesList.tsx:257` : غير مقروءة
- `src/components/messages/MessagesList.tsx:277` : مرسلة
- `src/components/messages/MessagesList.tsx:314` : عبر الأقسام
- `src/components/messages/MessagesList.tsx:321` : جديدة

#### `src/components/navigation/GlobalSearch.tsx` (9 lignes)
- `src/components/navigation/GlobalSearch.tsx:171` : بحث شامل في النظام... (Ctrl+K)
- `src/components/navigation/GlobalSearch.tsx:207` : جاري البحث...
- `src/components/navigation/GlobalSearch.tsx:215` : لا توجد نتائج مطابقة
- `src/components/navigation/GlobalSearch.tsx:219` : لم نتمكن من العثور على أي نتيجة تطابق
- `src/components/navigation/GlobalSearch.tsx:233` : البريد والوثائق الواردة
- `src/components/navigation/GlobalSearch.tsx:256` : رقم الإرسالية:
- `src/components/navigation/GlobalSearch.tsx:277` : البريد والوثائق الصادرة
- `src/components/navigation/GlobalSearch.tsx:319` : الموارد البشرية (الموظفين)
- `src/components/navigation/GlobalSearch.tsx:360` : حسابات المستخدمين

#### `src/components/navigation/MainNav.tsx` (1 lignes)
- `src/components/navigation/MainNav.tsx:141` : تبديل القائمة

#### `src/components/notifications/ActivityNotifications.tsx` (17 lignes)
- `src/components/notifications/ActivityNotifications.tsx:52` : إشعار نشاط
- `src/components/notifications/ActivityNotifications.tsx:128` : مستخدم | موظف | إجازة
- `src/components/notifications/ActivityNotifications.tsx:181` : نشاط: ${notification.activity}
- `src/components/notifications/ActivityNotifications.tsx:191` : الوثيقة
- `src/components/notifications/ActivityNotifications.tsx:197` : الموضوع: {notification.documentId.subject}
- `src/components/notifications/ActivityNotifications.tsx:219` : تعليم كمقروء
- `src/components/notifications/ActivityNotifications.tsx:232` : حذف
- `src/components/notifications/ActivityNotifications.tsx:250` : الإشعارات والتنبيهات
- `src/components/notifications/ActivityNotifications.tsx:253` : {unreadCount} جديد
- `src/components/notifications/ActivityNotifications.tsx:257` : محدث
- `src/components/notifications/ActivityNotifications.tsx:269` : تعيين الكل كمقروء
- `src/components/notifications/ActivityNotifications.tsx:279` : جاري تحميل الإشعارات...
- `src/components/notifications/ActivityNotifications.tsx:287` : لا توجد إشعارات جديدة
- `src/components/notifications/ActivityNotifications.tsx:288` : ستظهر هنا كافة تنبيهات النظام والمستندات والمهام
- `src/components/notifications/ActivityNotifications.tsx:292` : اليوم
- `src/components/notifications/ActivityNotifications.tsx:293` : أمس
- `src/components/notifications/ActivityNotifications.tsx:294` : سابقاً

#### `src/components/notifications/NotificationBell.tsx` (2 lignes)
- `src/components/notifications/NotificationBell.tsx:28` : إشعارات النظام
- `src/components/notifications/NotificationBell.tsx:29` : إشعارات النظام

#### `src/components/notifications/NotificationSystem.tsx` (5 lignes)
- `src/components/notifications/NotificationSystem.tsx:75` : إشعار جديد
- `src/components/notifications/NotificationSystem.tsx:77` : تاريخ النشاط: ${formatArabicDateTime(notification.createdAt)}
- `src/components/notifications/NotificationSystem.tsx:81` : تم قراءته
- `src/components/notifications/NotificationSystem.tsx:121` : لديك رسائل غير مقروءة
- `src/components/notifications/NotificationSystem.tsx:122` : ${messageCount.count} رسالة غير مقروءة

#### `src/components/notifications/ResponsibleAssignmentNotification.tsx` (3 lignes)
- `src/components/notifications/ResponsibleAssignmentNotification.tsx:22` : تم تعيينك كمسؤول عن وثيقة
- `src/components/notifications/ResponsibleAssignmentNotification.tsx:32` : تم التعيين بواسطة: {assignedBy}
- `src/components/notifications/ResponsibleAssignmentNotification.tsx:42` : تم الاطلاع

#### `src/components/notifications/ResponsibleNotificationPopup.tsx` (7 lignes)
- `src/components/notifications/ResponsibleNotificationPopup.tsx:42` : تم تعيينك كمسؤول
- `src/components/notifications/ResponsibleNotificationPopup.tsx:48` : إغلاق الإشعار
- `src/components/notifications/ResponsibleNotificationPopup.tsx:55` : إشعار مهم
- `src/components/notifications/ResponsibleNotificationPopup.tsx:69` : رقم الوثيقة: {documentSerialNumber}/{documentYear}
- `src/components/notifications/ResponsibleNotificationPopup.tsx:77` : تم التعيين بواسطة: {assignedBy}
- `src/components/notifications/ResponsibleNotificationPopup.tsx:96` : تم الاطلاع
- `src/components/notifications/ResponsibleNotificationPopup.tsx:103` : إخفاء مؤقت

#### `src/components/organization/AdministrationNode.tsx` (1 lignes)
- `src/components/organization/AdministrationNode.tsx:14` : الإدارة

#### `src/components/organization/DepartmentNode.tsx` (10 lignes)
- `src/components/organization/DepartmentNode.tsx:37` : مكتب الضبط
- `src/components/organization/DepartmentNode.tsx:42` : الموارد البشرية
- `src/components/organization/DepartmentNode.tsx:48` : مصلحة
- `src/components/organization/DepartmentNode.tsx:84` : ين
- `src/components/organization/DepartmentNode.tsx:90` : إخفاء
- `src/components/organization/DepartmentNode.tsx:95` : عرض
- `src/components/organization/DepartmentNode.tsx:116` : ${p.prenom} ${p.nom} - انقر لعرض الملف
- `src/components/organization/DepartmentNode.tsx:131` : بدون خطة
- `src/components/organization/DepartmentNode.tsx:137` : لا يوجد موظفين مسجلين
- `src/components/organization/DepartmentNode.tsx:141` : + {data.totalPersonnel - 10} موظفين آخرين

#### `src/components/organization/DirectorNode.tsx` (3 lignes)
- `src/components/organization/DirectorNode.tsx:38` : مدير الإدارة
- `src/components/organization/DirectorNode.tsx:40` : المستوى الأول
- `src/components/organization/DirectorNode.tsx:58` : مدير الإدارة

#### `src/components/search/AdvancedSearch.tsx` (26 lignes)
- `src/components/search/AdvancedSearch.tsx:164` : معايير وفلاتر البحث
- `src/components/search/AdvancedSearch.tsx:168` : نطاق البحث: {currentUser.activeDepartment.name}
- `src/components/search/AdvancedSearch.tsx:173` : حدد المعايير المطلوبة للبحث المتقدم في نصوص وفهارس المراسلات
- `src/components/search/AdvancedSearch.tsx:180` : {activeFiltersCount} فلاتر نشطة
- `src/components/search/AdvancedSearch.tsx:190` : طي الفلاتر الإضافية | توسيع الفلاتر الإضافية
- `src/components/search/AdvancedSearch.tsx:201` : نوع المراسلة
- `src/components/search/AdvancedSearch.tsx:214` : واردة
- `src/components/search/AdvancedSearch.tsx:227` : صادرة
- `src/components/search/AdvancedSearch.tsx:240` : الكل
- `src/components/search/AdvancedSearch.tsx:249` : البحث في النص والمحتوى
- `src/components/search/AdvancedSearch.tsx:254` : اكتب كلمات مفتاحية للبحث في الموضوع، المحتوى أو النصوص المستخرجة...
- `src/components/search/AdvancedSearch.tsx:270` : البحث أيضاً داخل النص المستخرج عبر قارئ النصوص (OCR)
- `src/components/search/AdvancedSearch.tsx:274` : مفهرس آلياً
- `src/components/search/AdvancedSearch.tsx:284` : السنوات الإدارية المتاحة
- `src/components/search/AdvancedSearch.tsx:289` : جاري التحميل...
- `src/components/search/AdvancedSearch.tsx:305` : كل السنوات
- `src/components/search/AdvancedSearch.tsx:334` : معايير تفصيلية إضافية
- `src/components/search/AdvancedSearch.tsx:343` : المصدر / الجهة / المصلحة
- `src/components/search/AdvancedSearch.tsx:350` : اختر الجهة المرسلة أو المصلحة
- `src/components/search/AdvancedSearch.tsx:351` : لا توجد جهات مطابقة
- `src/components/search/AdvancedSearch.tsx:360` : الرقم التسلسلي
- `src/components/search/AdvancedSearch.tsx:365` : مثال: 1045
- `src/components/search/AdvancedSearch.tsx:376` : موضوع المراسلة
- `src/components/search/AdvancedSearch.tsx:380` : ابحث في نص الموضوع مباشرة...
- `src/components/search/AdvancedSearch.tsx:397` : بحث متقدم
- `src/components/search/AdvancedSearch.tsx:405` : مسح الفلاتر

#### `src/components/search/DocumentPreviewModal.tsx` (12 lignes)
- `src/components/search/DocumentPreviewModal.tsx:64` : لا يوجد نص مستخرج متاح لهذه الوثيقة.
- `src/components/search/DocumentPreviewModal.tsx:96` : معاينة الوثيقة
- `src/components/search/DocumentPreviewModal.tsx:99` : الرقم التسلسلي: #{document.serialNumber} / {document.year}
- `src/components/search/DocumentPreviewModal.tsx:105` : وثيقة واردة | وثيقة صادرة
- `src/components/search/DocumentPreviewModal.tsx:114` : الموضوع:
- `src/components/search/DocumentPreviewModal.tsx:123` : التاريخ:
- `src/components/search/DocumentPreviewModal.tsx:130` : الجهة / المصدر:
- `src/components/search/DocumentPreviewModal.tsx:138` : نوع الوثيقة:
- `src/components/search/DocumentPreviewModal.tsx:146` : المسؤول:
- `src/components/search/DocumentPreviewModal.tsx:162` : النص المستخرج عبر القارئ الآلي (OCR)
- `src/components/search/DocumentPreviewModal.tsx:180` : إغلاق
- `src/components/search/DocumentPreviewModal.tsx:188` : عرض الصفحة الكاملة للوثيقة

#### `src/components/search/SearchResults.tsx` (36 lignes)
- `src/components/search/SearchResults.tsx:81` : جاري معالجة البحث المتقدم...
- `src/components/search/SearchResults.tsx:83` : يتم فحص الوثائق الواردة والصادرة وقواعد بيانات النصوص المفهرسة عبر OCR
- `src/components/search/SearchResults.tsx:97` : جاهز للبحث المتقدم
- `src/components/search/SearchResults.tsx:99` : استخدم النموذج أعلاه لتحديد الكلمات المفتاحية، السنوات الإدارية، أو الفلاتر الزمنية لعرض نتائج المطابقة.
- `src/components/search/SearchResults.tsx:114` : لم يتم العثور على أي نتائج
- `src/components/search/SearchResults.tsx:116` : لم تطابق أي وثيقة المعايير المحددة. جرب استخدام كلمات مفتاحية أخرى أو توسيع نطاق البحث الزمني.
- `src/components/search/SearchResults.tsx:133` : نتائج البحث
- `src/components/search/SearchResults.tsx:136` : تم العثور على وثائق مطابقة وفقاً للمعايير المدخلة
- `src/components/search/SearchResults.tsx:143` : {totalCount || combinedResultsCount} وثيقة متطابقة
- `src/components/search/SearchResults.tsx:156` : عرض كجدول
- `src/components/search/SearchResults.tsx:159` : جدول
- `src/components/search/SearchResults.tsx:169` : عرض كبطاقات
- `src/components/search/SearchResults.tsx:172` : بطاقات
- `src/components/search/SearchResults.tsx:185` : النوع
- `src/components/search/SearchResults.tsx:186` : الرقم / السنة
- `src/components/search/SearchResults.tsx:187` : الموضوع
- `src/components/search/SearchResults.tsx:188` : الجهة / المصدر
- `src/components/search/SearchResults.tsx:189` : التاريخ
- `src/components/search/SearchResults.tsx:190` : الإجراءات
- `src/components/search/SearchResults.tsx:206` : واردة
- `src/components/search/SearchResults.tsx:236` : معاينة
- `src/components/search/SearchResults.tsx:245` : فتح
- `src/components/search/SearchResults.tsx:266` : صادرة
- `src/components/search/SearchResults.tsx:296` : معاينة
- `src/components/search/SearchResults.tsx:305` : فتح
- `src/components/search/SearchResults.tsx:331` : واردة
- `src/components/search/SearchResults.tsx:370` : معاينة سريعة
- `src/components/search/SearchResults.tsx:379` : عرض الوثيقة
- `src/components/search/SearchResults.tsx:400` : صادرة
- `src/components/search/SearchResults.tsx:439` : معاينة سريعة
- `src/components/search/SearchResults.tsx:448` : عرض الوثيقة
- `src/components/search/SearchResults.tsx:460` : >{combinedResultsCount}</span> من أصل{
- `src/components/search/SearchResults.tsx:461` : {totalCount || combinedResultsCount} وثيقة
- `src/components/search/SearchResults.tsx:475` : جاري تحميل المزيد...
- `src/components/search/SearchResults.tsx:478` : تحميل المزيد من النتائج
- `src/components/search/SearchResults.tsx:485` : تم الوصول لنهاية النتائج

#### `src/components/templates/TemplateDialog.tsx` (21 lignes)
- `src/components/templates/TemplateDialog.tsx:53` : تم إنشاء النموذج بنجاح
- `src/components/templates/TemplateDialog.tsx:58` : فشل في إنشاء النموذج:
- `src/components/templates/TemplateDialog.tsx:65` : تم تحديث النموذج بنجاح
- `src/components/templates/TemplateDialog.tsx:70` : فشل في تحديث النموذج:
- `src/components/templates/TemplateDialog.tsx:78` : يرجى إدخال اسم النموذج
- `src/components/templates/TemplateDialog.tsx:83` : يرجى اختيار ملف النموذج
- `src/components/templates/TemplateDialog.tsx:108` : يرجى اختيار ملف Word فقط (.doc أو .docx)
- `src/components/templates/TemplateDialog.tsx:133` : يرجى اختيار ملف Word فقط (.doc أو .docx)
- `src/components/templates/TemplateDialog.tsx:153` : تعديل النموذج | إضافة نموذج جديد
- `src/components/templates/TemplateDialog.tsx:160` : اسم النموذج *
- `src/components/templates/TemplateDialog.tsx:166` : أدخل اسم النموذج...
- `src/components/templates/TemplateDialog.tsx:174` : الوصف
- `src/components/templates/TemplateDialog.tsx:180` : أدخل وصف النموذج (اختياري)...
- `src/components/templates/TemplateDialog.tsx:188` : ملف النموذج {!isEditing && * }
- `src/components/templates/TemplateDialog.tsx:189` : (اختياري - اتركه فارغاً للاحتفاظ بالملف الحالي)
- `src/components/templates/TemplateDialog.tsx:222` : اسحب وأفلت ملف Word هنا أو انقر للاختيار
- `src/components/templates/TemplateDialog.tsx:225` : يدعم فقط ملفات .doc و .docx
- `src/components/templates/TemplateDialog.tsx:239` : جاري الحفظ...
- `src/components/templates/TemplateDialog.tsx:241` : حفظ التغييرات
- `src/components/templates/TemplateDialog.tsx:242` : إنشاء النموذج
- `src/components/templates/TemplateDialog.tsx:251` : إلغاء

#### `src/components/ui/document-option-combobox.tsx` (4 lignes)
- `src/components/ui/document-option-combobox.tsx:37` : اختر...
- `src/components/ui/document-option-combobox.tsx:38` : لا توجد نتائج مطابقة
- `src/components/ui/document-option-combobox.tsx:127` : جاري التحميل...
- `src/components/ui/document-option-combobox.tsx:144` : ✕ إلغاء الاختيار (عرض الكل)

#### `src/components/ui/multi-document-option-select.tsx` (2 lignes)
- `src/components/ui/multi-document-option-select.tsx:24` : اختر الخيارات
- `src/components/ui/multi-document-option-select.tsx:49` : جاري تحميل الخيارات...

#### `src/components/users/ChangePasswordDialog.tsx` (15 lignes)
- `src/components/users/ChangePasswordDialog.tsx:40` : تم تحديث كلمة المرور بنجاح
- `src/components/users/ChangePasswordDialog.tsx:47` : فشل في تحديث كلمة المرور
- `src/components/users/ChangePasswordDialog.tsx:64` : يرجى إدخال كلمة المرور الجديدة
- `src/components/users/ChangePasswordDialog.tsx:69` : كلمة المرور يجب أن تكون 6 أحرف على الأقل
- `src/components/users/ChangePasswordDialog.tsx:74` : كلمة المرور وتأكيدها غير متطابقين
- `src/components/users/ChangePasswordDialog.tsx:89` : تغيير كلمة المرور
- `src/components/users/ChangePasswordDialog.tsx:92` : تغيير كلمة المرور للمستخدم: {user.username}
- `src/components/users/ChangePasswordDialog.tsx:98` : كلمة المرور الجديدة
- `src/components/users/ChangePasswordDialog.tsx:105` : أدخل كلمة المرور الجديدة
- `src/components/users/ChangePasswordDialog.tsx:126` : تأكيد كلمة المرور
- `src/components/users/ChangePasswordDialog.tsx:133` : أعد إدخال كلمة المرور للتأكيد
- `src/components/users/ChangePasswordDialog.tsx:156` : كلمة المرور يجب أن تتكون من 6 خانات على الأقل
- `src/components/users/ChangePasswordDialog.tsx:160` : يُفضل استخدام مزيج متوازن من الحروف والأرقام لضمان حماية أفضل
- `src/components/users/ChangePasswordDialog.tsx:170` : جاري التحديث... | تحديث كلمة المرور
- `src/components/users/ChangePasswordDialog.tsx:178` : إلغاء

#### `src/components/users/ProfileSettingsDialog.tsx` (29 lignes)
- `src/components/users/ProfileSettingsDialog.tsx:45` : تم تحديث كلمة المرور بنجاح
- `src/components/users/ProfileSettingsDialog.tsx:54` : فشل في تحديث كلمة المرور
- `src/components/users/ProfileSettingsDialog.tsx:62` : تم تحديث الصورة الشخصية بنجاح
- `src/components/users/ProfileSettingsDialog.tsx:76` : فشل في تحديث الصورة الشخصية
- `src/components/users/ProfileSettingsDialog.tsx:97` : يرجى إدخال كلمة المرور الحالية
- `src/components/users/ProfileSettingsDialog.tsx:102` : يرجى إدخال كلمة المرور الجديدة
- `src/components/users/ProfileSettingsDialog.tsx:107` : كلمة المرور يجب أن تكون 6 أحرف على الأقل
- `src/components/users/ProfileSettingsDialog.tsx:112` : كلمة المرور وتأكيدها غير متطابقين
- `src/components/users/ProfileSettingsDialog.tsx:124` : حجم الصورة يجب أن يكون أقل من 2 ميجابايت
- `src/components/users/ProfileSettingsDialog.tsx:130` : يرجى اختيار ملف صورة صالح
- `src/components/users/ProfileSettingsDialog.tsx:149` : يرجى اختيار صورة
- `src/components/users/ProfileSettingsDialog.tsx:179` : إعدادات الملف الشخصي
- `src/components/users/ProfileSettingsDialog.tsx:182` : تحديث كلمة المرور والصورة الشخصية للمستخدم {currentUser.username}
- `src/components/users/ProfileSettingsDialog.tsx:190` : الصورة الشخصية
- `src/components/users/ProfileSettingsDialog.tsx:194` : كلمة المرور
- `src/components/users/ProfileSettingsDialog.tsx:221` : اختيار صورة جديدة
- `src/components/users/ProfileSettingsDialog.tsx:231` : JPG, PNG, GIF (الحد الأقصى المسموح به 2 ميجابايت)
- `src/components/users/ProfileSettingsDialog.tsx:242` : جاري التحديث... | تحديث الصورة
- `src/components/users/ProfileSettingsDialog.tsx:245` : إلغاء
- `src/components/users/ProfileSettingsDialog.tsx:254` : كلمة المرور الحالية
- `src/components/users/ProfileSettingsDialog.tsx:261` : أدخل كلمة المرور الحالية
- `src/components/users/ProfileSettingsDialog.tsx:282` : كلمة المرور الجديدة
- `src/components/users/ProfileSettingsDialog.tsx:289` : أدخل كلمة المرور الجديدة
- `src/components/users/ProfileSettingsDialog.tsx:310` : تأكيد كلمة المرور الجديدة
- `src/components/users/ProfileSettingsDialog.tsx:317` : أعد إدخال كلمة المرور الجديدة للتأكيد
- `src/components/users/ProfileSettingsDialog.tsx:340` : كلمة المرور يجب أن تكون 6 أحرف على الأقل
- `src/components/users/ProfileSettingsDialog.tsx:344` : استخدم مزيجاً من الأحرف والأرقام لكلمة مرور قوية
- `src/components/users/ProfileSettingsDialog.tsx:354` : جاري التحديث... | تحديث كلمة المرور
- `src/components/users/ProfileSettingsDialog.tsx:357` : إلغاء

#### `src/components/users/UserForm.tsx` (50 lignes)
- `src/components/users/UserForm.tsx:113` : الموارد البشرية
- `src/components/users/UserForm.tsx:115` : الموارد البشرية
- `src/components/users/UserForm.tsx:166` : مدير الإدارة
- `src/components/users/UserForm.tsx:167` : مدير
- `src/components/users/UserForm.tsx:168` : مدير قسم
- `src/components/users/UserForm.tsx:169` : مدير المكتب
- `src/components/users/UserForm.tsx:170` : مستخدم
- `src/components/users/UserForm.tsx:231` : بطاقة الموظف إلزامية لهذا الدور. يرجى اختيار بطاقة من القائمة.
- `src/components/users/UserForm.tsx:254` : المعلومات الأساسية
- `src/components/users/UserForm.tsx:266` : اسم المستخدم
- `src/components/users/UserForm.tsx:272` : أدخل اسم المستخدم (مثال: ahmad_ali)
- `src/components/users/UserForm.tsx:277` : اسم فريد يُستخدم لتسجيل الدخول والتعريف في النظام
- `src/components/users/UserForm.tsx:292` : كلمة المرور
- `src/components/users/UserForm.tsx:299` : أدخل كلمة المرور (6 أحرف على الأقل)
- `src/components/users/UserForm.tsx:304` : يُفضل استخدام مزيج من الأحرف والأرقام لضمان حماية الحساب
- `src/components/users/UserForm.tsx:320` : بطاقة الموظف المرتبطة (Fiche Personnel associée)
- `src/components/users/UserForm.tsx:324` : اختيار من قائمة الموظفين
- `src/components/users/UserForm.tsx:334` : اختر ملف موظف من القائمة أدناه أو أنشئ ملفًا جديدًا
- `src/components/users/UserForm.tsx:338` : اختر ملف موظف موجود في قسمك لربطه بهذا الحساب
- `src/components/users/UserForm.tsx:350` : اختيار ملف الموظف
- `src/components/users/UserForm.tsx:354` : {personnels.length} بطاقة متاحة
- `src/components/users/UserForm.tsx:363` : اختر موظفًا
- `src/components/users/UserForm.tsx:368` : جاري تحميل القائمة...
- `src/components/users/UserForm.tsx:372` : لا يوجد موظفون في قسمك
- `src/components/users/UserForm.tsx:377` : بدون رقم ب.ت.و
- `src/components/users/UserForm.tsx:394` : تفاصيل البطاقة المختارة:
- `src/components/users/UserForm.tsx:397` : بطاقة محددة للربط
- `src/components/users/UserForm.tsx:403` : الاسم الكامل:
- `src/components/users/UserForm.tsx:410` : رقم البطاقة الوطنية (CIN):
- `src/components/users/UserForm.tsx:418` : المنصب / الرتبة:
- `src/components/users/UserForm.tsx:426` : القسم الإداري:
- `src/components/users/UserForm.tsx:439` : (تم تحديد هذا القسم تلقائياً أدناه، ويمكن تعديله من قبل الإدارة)
- `src/components/users/UserForm.tsx:459` : إنشاء بطاقة موظف جديدة
- `src/components/users/UserForm.tsx:469` : لا يوجد موظفون في قسمك. يرجى التواصل مع إدارة الموارد البشرية
- `src/components/users/UserForm.tsx:470` : لإنشاء بطاقات الموظفين.
- `src/components/users/UserForm.tsx:485` : الدور والصلاحيات
- `src/components/users/UserForm.tsx:494` : الدور الوظيفي في النظام
- `src/components/users/UserForm.tsx:502` : اختر الدور
- `src/components/users/UserForm.tsx:528` : الدور الحالي المحدد:
- `src/components/users/UserForm.tsx:536` : ملاحظة: يُسمح بمدير إدارة واحد فقط. يرجى التأكد من عدم وجود مدير إدارة آخر. (Un seul Directeur est autorisé. Vérifiez qu'aucun autre Directeur n'existe.)
- `src/components/users/UserForm.tsx:553` : الأقسام التابعة
- `src/components/users/UserForm.tsx:557` : محدد لقسمك الحالي
- `src/components/users/UserForm.tsx:617` : قسم | أقسام
- `src/components/users/UserForm.tsx:626` : المستخدمون المنشؤون من قبل مدير القسم يتم إسنادهم تلقائياً لقسمك النشط.
- `src/components/users/UserForm.tsx:657` : حساب نشط ومفعل
- `src/components/users/UserForm.tsx:660` : يمكن للمستخدم النشط تسجيل الدخول والوصول لكافة الصلاحيات الممنوحة له
- `src/components/users/UserForm.tsx:680` : إلغاء والعودة
- `src/components/users/UserForm.tsx:693` : إعادة تعيين كلمة المرور
- `src/components/users/UserForm.tsx:705` : جاري الحفظ...
- `src/components/users/UserForm.tsx:710` : حفظ التعديلات | إنشاء المستخدم

#### `src/config/hubsConfig.ts` (29 lignes)
- `src/config/hubsConfig.ts:56` : البريد والمستندات
- `src/config/hubsConfig.ts:64` : الواردة
- `src/config/hubsConfig.ts:71` : الصادرة
- `src/config/hubsConfig.ts:78` : المجلدات
- `src/config/hubsConfig.ts:85` : البحث المتقدم
- `src/config/hubsConfig.ts:98` : الموارد البشرية
- `src/config/hubsConfig.ts:107` : الموظفون
- `src/config/hubsConfig.ts:114` : إضافة موظف
- `src/config/hubsConfig.ts:122` : الحضور والغياب
- `src/config/hubsConfig.ts:129` : الوضعية العامة
- `src/config/hubsConfig.ts:136` : طلبات الحضور
- `src/config/hubsConfig.ts:143` : أسباب الغياب
- `src/config/hubsConfig.ts:150` : مراحل الموارد البشرية
- `src/config/hubsConfig.ts:163` : الأدوات
- `src/config/hubsConfig.ts:171` : النماذج
- `src/config/hubsConfig.ts:178` : خيارات المستندات
- `src/config/hubsConfig.ts:192` : الملف والحضور
- `src/config/hubsConfig.ts:200` : ملفي الشخصي
- `src/config/hubsConfig.ts:207` : جدول حضوري
- `src/config/hubsConfig.ts:220` : الإدارة
- `src/config/hubsConfig.ts:229` : المستخدمون
- `src/config/hubsConfig.ts:237` : الأقسام
- `src/config/hubsConfig.ts:245` : سجل العمليات
- `src/config/hubsConfig.ts:253` : الهيكل التنظيمي
- `src/config/hubsConfig.ts:260` : الإعدادات
- `src/config/hubsConfig.ts:268` : دليل التثبيت
- `src/config/hubsConfig.ts:294` : لوحة التحكم
- `src/config/hubsConfig.ts:301` : الرسائل
- `src/config/hubsConfig.ts:308` : سلة المحذوفات

#### `src/contexts/AuthContext.tsx` (12 lignes)
- `src/contexts/AuthContext.tsx:137` : تم تسجيل الدخول بنجاح
- `src/contexts/AuthContext.tsx:170` : فشل في تسجيل الدخول
- `src/contexts/AuthContext.tsx:174` : لا يمكن الاتصال بالخادم. يرجى التحقق من تشغيل الخادم الخلفي.
- `src/contexts/AuthContext.tsx:176` : خطأ في الشبكة. يرجى التحقق من تشغيل خادم النظام.
- `src/contexts/AuthContext.tsx:178` : فشل في المصادقة
- `src/contexts/AuthContext.tsx:180` : لا يوجد رد من الخادم. يرجى التحقق من الاتصال.
- `src/contexts/AuthContext.tsx:213` : تم تسجيل الخروج بنجاح
- `src/contexts/AuthContext.tsx:224` : تم تسجيل الخروج
- `src/contexts/AuthContext.tsx:264` : تم تغيير القسم بنجاح
- `src/contexts/AuthContext.tsx:267` : فشل في تغيير القسم
- `src/contexts/AuthContext.tsx:277` : تم تحديث كلمة المرور بنجاح
- `src/contexts/AuthContext.tsx:280` : فشل في تحديث كلمة المرور

#### `src/hooks/forms/useIncomingDocumentForm.ts` (3 lignes)
- `src/hooks/forms/useIncomingDocumentForm.ts:68` : تاريخ النشاط مطلوب عند تحديد نشاط
- `src/hooks/forms/useIncomingDocumentForm.ts:141` : يجب أن يكون الرقم التسلسلي رقماً صحيحاً موجباً
- `src/hooks/forms/useIncomingDocumentForm.ts:155` : هذا الرقم التسلسلي موجود بالفعل لهذا العام

#### `src/hooks/forms/useOutgoingDocumentForm.ts` (2 lignes)
- `src/hooks/forms/useOutgoingDocumentForm.ts:133` : يجب أن يكون الرقم التسلسلي رقماً صحيحاً موجباً
- `src/hooks/forms/useOutgoingDocumentForm.ts:147` : هذا الرقم التسلسلي موجود بالفعل لهذا العام

#### `src/hooks/useAttendanceExport.ts` (35 lignes)
- `src/hooks/useAttendanceExport.ts:73` : جاري إنشاء تقرير الحضور اليومي بصيغة PDF...
- `src/hooks/useAttendanceExport.ts:77` : لا توجد بيانات حضور لتصديرها لهذا اليوم
- `src/hooks/useAttendanceExport.ts:82` : تم تصدير تقرير الحضور اليومي بنجاح
- `src/hooks/useAttendanceExport.ts:84` : حدث خطأ أثناء تصدير التقرير اليومي
- `src/hooks/useAttendanceExport.ts:87` : فشل في تصدير تقرير الحضور اليومي
- `src/hooks/useAttendanceExport.ts:100` : جاري إنشاء تقرير الحضور الشهري بصيغة PDF...
- `src/hooks/useAttendanceExport.ts:104` : لا توجد سجلات حضور لتصديرها لهذا الشهر
- `src/hooks/useAttendanceExport.ts:109` : تم تصدير تقرير الحضور الشهري بنجاح
- `src/hooks/useAttendanceExport.ts:111` : حدث خطأ أثناء تصدير التقرير الشهري
- `src/hooks/useAttendanceExport.ts:114` : فشل في تصدير تقرير الحضور الشهري
- `src/hooks/useAttendanceExport.ts:127` : جاري إنشاء حصيلة الحضور السنوية بصيغة PDF...
- `src/hooks/useAttendanceExport.ts:131` : لا توجد سجلات حضور لتصديرها لهذه السنة
- `src/hooks/useAttendanceExport.ts:136` : تم تصدير الحصيلة السنوية للحضور بنجاح
- `src/hooks/useAttendanceExport.ts:138` : حدث خطأ أثناء تصدير الحصيلة السنوية
- `src/hooks/useAttendanceExport.ts:141` : فشل في تصدير الحصيلة السنوية
- `src/hooks/useAttendanceExport.ts:158` : جاري إنشاء جدول الحضور اليومي بصيغة PDF...
- `src/hooks/useAttendanceExport.ts:162` : لا يوجد موظفون في القائمة للتصدير
- `src/hooks/useAttendanceExport.ts:167` : تم تصدير جدول الحضور اليومي بنجاح
- `src/hooks/useAttendanceExport.ts:169` : حدث خطأ أثناء تصدير جدول الحضور
- `src/hooks/useAttendanceExport.ts:172` : فشل في تصدير جدول الحضور
- `src/hooks/useAttendanceExport.ts:189` : جاري استرجاع بيانات الحضور وتوليد ملف PDF...
- `src/hooks/useAttendanceExport.ts:198` : بيانات التقرير غير متوفرة
- `src/hooks/useAttendanceExport.ts:202` : تم تصدير تقرير الحضور اليومي بنجاح
- `src/hooks/useAttendanceExport.ts:204` : فشل في تحميل أو تصدير التقرير اليومي
- `src/hooks/useAttendanceExport.ts:207` : فشل في تصدير تقرير الحضور اليومي
- `src/hooks/useAttendanceExport.ts:225` : جاري استرجاع تقرير الشهر وتوليد ملف PDF...
- `src/hooks/useAttendanceExport.ts:234` : بيانات التقرير غير متوفرة
- `src/hooks/useAttendanceExport.ts:238` : تم تصدير تقرير الحضور الشهري بنجاح
- `src/hooks/useAttendanceExport.ts:240` : فشل في تحميل أو تصدير التقرير الشهري
- `src/hooks/useAttendanceExport.ts:243` : فشل في تصدير تقرير الحضور الشهري
- `src/hooks/useAttendanceExport.ts:260` : جاري استرجاع حصيلة السنة وتوليد ملف PDF...
- `src/hooks/useAttendanceExport.ts:269` : بيانات التقرير غير متوفرة
- `src/hooks/useAttendanceExport.ts:273` : تم تصدير حصيلة الحضور السنوية بنجاح
- `src/hooks/useAttendanceExport.ts:275` : فشل في تحميل أو تصدير الحصيلة السنوية
- `src/hooks/useAttendanceExport.ts:278` : فشل في تصدير الحصيلة السنوية

#### `src/hooks/useKeyboardShortcuts.ts` (1 lignes)
- `src/hooks/useKeyboardShortcuts.ts:16` : بحث | ابحث

#### `src/hooks/usePdfExport.ts` (4 lignes)
- `src/hooks/usePdfExport.ts:24` : لا توجد بيانات للتصدير في القائمة الحالية
- `src/hooks/usePdfExport.ts:29` : تم تصدير ملف PDF بنجاح
- `src/hooks/usePdfExport.ts:31` : حدث خطأ أثناء تصدير ملف PDF
- `src/hooks/usePdfExport.ts:34` : فشل في تصدير ملف PDF

#### `src/pages/DepartmentsPage.tsx` (55 lignes)
- `src/pages/DepartmentsPage.tsx:152` : تم تحديث إعدادات الوحدة الوظيفية بنجاح
- `src/pages/DepartmentsPage.tsx:158` : فشل في تحديث إعدادات الوحدة الوظيفية
- `src/pages/DepartmentsPage.tsx:168` : تم تحديث إعدادات قسم الموارد البشرية بنجاح
- `src/pages/DepartmentsPage.tsx:174` : فشل في تحديث إعدادات قسم الموارد البشرية
- `src/pages/DepartmentsPage.tsx:222` : تم حذف القسم بنجاح من النظام
- `src/pages/DepartmentsPage.tsx:230` : فشل في حذف القسم
- `src/pages/DepartmentsPage.tsx:240` : تم تحديث حالة القسم بنجاح
- `src/pages/DepartmentsPage.tsx:246` : فشل في تحديث حالة القسم
- `src/pages/DepartmentsPage.tsx:272` : تم تحديث بيانات الأقسام بنجاح
- `src/pages/DepartmentsPage.tsx:345` : إدارة الأقسام
- `src/pages/DepartmentsPage.tsx:347` : تنظيم الهيكل الإداري، وتحديد اختصاصات الأقسام وتوزيع المسؤوليات
- `src/pages/DepartmentsPage.tsx:360` : تحديث
- `src/pages/DepartmentsPage.tsx:369` : إضافة قسم جديد
- `src/pages/DepartmentsPage.tsx:399` : إجمالي الأقسام المسجلة
- `src/pages/DepartmentsPage.tsx:410` : الأقسام النشطة
- `src/pages/DepartmentsPage.tsx:421` : الأقسام المعطلة
- `src/pages/DepartmentsPage.tsx:436` : تصفية وبحث الأقسام
- `src/pages/DepartmentsPage.tsx:446` : إعادة ضبط التصفية
- `src/pages/DepartmentsPage.tsx:456` : البحث باسم القسم أو بالوصف...
- `src/pages/DepartmentsPage.tsx:476` : تصفية حسب الحالة
- `src/pages/DepartmentsPage.tsx:479` : جميع الحالات
- `src/pages/DepartmentsPage.tsx:480` : أقسام نشطة فقط
- `src/pages/DepartmentsPage.tsx:481` : أقسام معطلة فقط
- `src/pages/DepartmentsPage.tsx:494` : اسم القسم
- `src/pages/DepartmentsPage.tsx:495` : الوصف والاختصاصات
- `src/pages/DepartmentsPage.tsx:496` : الحالة
- `src/pages/DepartmentsPage.tsx:497` : تاريخ الإنشاء
- `src/pages/DepartmentsPage.tsx:498` : الإجراءات
- `src/pages/DepartmentsPage.tsx:582` : لا يوجد وصف مسجل
- `src/pages/DepartmentsPage.tsx:594` : نشط | معطل
- `src/pages/DepartmentsPage.tsx:600` : غير مسجل
- `src/pages/DepartmentsPage.tsx:834` : تفاصيل القسم ومنسوبوه: {selectedDepartmentForView?.name}
- `src/pages/DepartmentsPage.tsx:837` : لا يوجد وصف تفصيلي مسجل لهذا القسم
- `src/pages/DepartmentsPage.tsx:844` : الحالة التشغيلية
- `src/pages/DepartmentsPage.tsx:851` : قسم نشط | قسم معطل
- `src/pages/DepartmentsPage.tsx:856` : تاريخ الإنشاء
- `src/pages/DepartmentsPage.tsx:858` : غير مسجل
- `src/pages/DepartmentsPage.tsx:868` : المستخدمون المنتسبون للقسم ({departmentUsers.length})
- `src/pages/DepartmentsPage.tsx:875` : جاري تحميل قائمة المستخدمين...
- `src/pages/DepartmentsPage.tsx:880` : لا يوجد مستخدمون منتسبون لهذا القسم حالياً.
- `src/pages/DepartmentsPage.tsx:881` : يمكنك إسناد المستخدمين لهذا القسم عبر شاشة إدارة المستخدمين.
- `src/pages/DepartmentsPage.tsx:888` : الصورة
- `src/pages/DepartmentsPage.tsx:889` : اسم المستخدم
- `src/pages/DepartmentsPage.tsx:890` : الدور
- `src/pages/DepartmentsPage.tsx:891` : الحالة
- `src/pages/DepartmentsPage.tsx:914` : مدير الإدارة | مدير
- `src/pages/DepartmentsPage.tsx:918` : مدير قسم
- `src/pages/DepartmentsPage.tsx:922` : مستخدم
- `src/pages/DepartmentsPage.tsx:933` : نشط | معطل
- `src/pages/DepartmentsPage.tsx:951` : إغلاق النافذة
- `src/pages/DepartmentsPage.tsx:964` : تعديل هذا القسم
- `src/pages/DepartmentsPage.tsx:981` : تأكيد حذف القسم
- `src/pages/DepartmentsPage.tsx:984` : هل أنت متأكد من رغبتك في حذف هذا القسم نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء، وقد يؤثر حذف القسم على الوثائق والمراسلات والمجلدات المرتبطة به.
- `src/pages/DepartmentsPage.tsx:993` : جاري الحذف... | نعم، تأكيد الحذف
- `src/pages/DepartmentsPage.tsx:998` : إلغاء

#### `src/pages/ForbiddenPage.tsx` (8 lignes)
- `src/pages/ForbiddenPage.tsx:21` : خطأ 403 — وصول غير مسموح
- `src/pages/ForbiddenPage.tsx:24` : ليس لديك صلاحية للوصول إلى هذه الصفحة
- `src/pages/ForbiddenPage.tsx:27` : حسابك الحالي لا يمتلك الأذونات الكافية لعرض هذا المسار أو تنفيذ هذا الإجراء.
- `src/pages/ForbiddenPage.tsx:34` : المستخدم الحالي:
- `src/pages/ForbiddenPage.tsx:38` : الدور الوظيفي:
- `src/pages/ForbiddenPage.tsx:43` : المسار المطلوب:
- `src/pages/ForbiddenPage.tsx:56` : لوحة القيادة
- `src/pages/ForbiddenPage.tsx:64` : الرجوع للخلف

#### `src/pages/NotFound.tsx` (6 lignes)
- `src/pages/NotFound.tsx:18` : خطأ 404 — الصفحة غير موجودة
- `src/pages/NotFound.tsx:21` : الصفحة التي تبحث عنها غير متوفرة
- `src/pages/NotFound.tsx:24` : قد يكون الرابط خاطئاً أو تم نقل الصفحة أو حذفها من النظام.
- `src/pages/NotFound.tsx:29` : المسار المطلوب: {location.pathname}
- `src/pages/NotFound.tsx:39` : لوحة القيادة
- `src/pages/NotFound.tsx:48` : الرجوع للخلف

#### `src/pages/UnauthorizedPage.tsx` (4 lignes)
- `src/pages/UnauthorizedPage.tsx:16` : غير مصرح بالوصول
- `src/pages/UnauthorizedPage.tsx:18` : ليس لديك صلاحية للوصول إلى هذه الصفحة. يرجى التواصل مع مسؤول النظام إذا كنت تعتقد أن هذا خطأ.
- `src/pages/UnauthorizedPage.tsx:25` : الصفحة الرئيسية
- `src/pages/UnauthorizedPage.tsx:32` : العودة

#### `src/pages/audit/AuditTrailPage.tsx` (4 lignes)
- `src/pages/audit/AuditTrailPage.tsx:18` : ليس لديك صلاحية
- `src/pages/audit/AuditTrailPage.tsx:20` : ليس لديك الصلاحية لعرض سجل التدقيق والمراجعة
- `src/pages/audit/AuditTrailPage.tsx:35` : سجل التدقيق والمراجعة
- `src/pages/audit/AuditTrailPage.tsx:38` : مراقبة جميع العمليات والأنشطة في النظام مع إمكانية التصدير والتحليل

#### `src/pages/department/AdminDepartmentDashboard.tsx` (36 lignes)
- `src/pages/department/AdminDepartmentDashboard.tsx:31` : غير مخول للوصول لهذه الصفحة
- `src/pages/department/AdminDepartmentDashboard.tsx:41` : لا يوجد قسم نشط. يرجى التواصل مع المدير لتخصيص قسم لك.
- `src/pages/department/AdminDepartmentDashboard.tsx:53` : لوحة تحكم إدارة القسم
- `src/pages/department/AdminDepartmentDashboard.tsx:56` : إدارة الوثائق والمستخدمين في قسم {activeDepartment.name}
- `src/pages/department/AdminDepartmentDashboard.tsx:74` : القسم النشط
- `src/pages/department/AdminDepartmentDashboard.tsx:79` : قسم مفعل
- `src/pages/department/AdminDepartmentDashboard.tsx:90` : المستخدمين
- `src/pages/department/AdminDepartmentDashboard.tsx:93` : إدارة المستخدمين
- `src/pages/department/AdminDepartmentDashboard.tsx:95` : إنشاء وتعديل وإدارة حسابات المستخدمين التابعين لقسم {activeDepartment.name}.
- `src/pages/department/AdminDepartmentDashboard.tsx:104` : عرض
- `src/pages/department/AdminDepartmentDashboard.tsx:113` : إضافة
- `src/pages/department/AdminDepartmentDashboard.tsx:123` : الوارد
- `src/pages/department/AdminDepartmentDashboard.tsx:126` : الوثائق الواردة
- `src/pages/department/AdminDepartmentDashboard.tsx:128` : إدارة ومتابعة المراسلات الواردة للقسم وتعيين المسؤولين وإضافة الردود.
- `src/pages/department/AdminDepartmentDashboard.tsx:137` : عرض
- `src/pages/department/AdminDepartmentDashboard.tsx:146` : إدارة
- `src/pages/department/AdminDepartmentDashboard.tsx:156` : الصادر
- `src/pages/department/AdminDepartmentDashboard.tsx:159` : الوثائق الصادرة
- `src/pages/department/AdminDepartmentDashboard.tsx:161` : عرض وتنظيم المراسلات والوثائق الصادرة الرسمية من القسم.
- `src/pages/department/AdminDepartmentDashboard.tsx:170` : عرض
- `src/pages/department/AdminDepartmentDashboard.tsx:179` : إدارة
- `src/pages/department/AdminDepartmentDashboard.tsx:189` : التنظيم
- `src/pages/department/AdminDepartmentDashboard.tsx:192` : إدارة المجلدات
- `src/pages/department/AdminDepartmentDashboard.tsx:194` : تنظيم وفهرسة وثائق ومراسلات القسم ضمن مجلدات وتصنيفات مخصصة.
- `src/pages/department/AdminDepartmentDashboard.tsx:203` : إدارة المجلدات
- `src/pages/department/AdminDepartmentDashboard.tsx:213` : التواصل
- `src/pages/department/AdminDepartmentDashboard.tsx:216` : الرسائل والمحادثات
- `src/pages/department/AdminDepartmentDashboard.tsx:218` : إرسال واستقبال التنبيهات والرسائل الإدارية مع مستخدمي القسم.
- `src/pages/department/AdminDepartmentDashboard.tsx:227` : الرسائل
- `src/pages/department/AdminDepartmentDashboard.tsx:238` : صلاحيات إدارة القسم
- `src/pages/department/AdminDepartmentDashboard.tsx:245` : إنشاء وتعديل وإدارة حسابات المستخدمين التابعين للقسم
- `src/pages/department/AdminDepartmentDashboard.tsx:250` : تحديد وتعيين المسؤولين ومتابعة مسار الوثائق الواردة
- `src/pages/department/AdminDepartmentDashboard.tsx:255` : إضافة الردود والإجراءات الإدارية على المراسلات الواردة
- `src/pages/department/AdminDepartmentDashboard.tsx:260` : تنظيم الوثائق وفهرستها ضمن مجلدات وتصنيفات إدارية
- `src/pages/department/AdminDepartmentDashboard.tsx:265` : البحث والاستعلام المتقدم في أرشيف وثائق القسم النشط
- `src/pages/department/AdminDepartmentDashboard.tsx:270` : الوصول محصور بحدود القسم النشط مع إمكانية التبديل عند توفر الصلاحية

#### `src/pages/departments/CreateDepartment.tsx` (7 lignes)
- `src/pages/departments/CreateDepartment.tsx:17` : تم إنشاء القسم بنجاح
- `src/pages/departments/CreateDepartment.tsx:23` : فشل في إنشاء القسم
- `src/pages/departments/CreateDepartment.tsx:38` : إضافة قسم جديد
- `src/pages/departments/CreateDepartment.tsx:40` : تسجيل وحدة إدارية جديدة في الهيكل التنظيمي للمنظومة
- `src/pages/departments/CreateDepartment.tsx:50` : العودة لقائمة الأقسام
- `src/pages/departments/CreateDepartment.tsx:60` : ملاحظات حول الهيكل التنظيمي للأقسام
- `src/pages/departments/CreateDepartment.tsx:62` : يمثل القسم وحدة تنظيمية رئيسية في إدارة الوثائق والمراسلات. بمجرد إنشاء القسم، ستتمكن من ربط المستخدمين به، وتوجيه البريد الوارد والصادر إليه، وإنشاء مجلدات أرشيفية خاصة به.

#### `src/pages/departments/DepartmentUsers.tsx` (20 lignes)
- `src/pages/departments/DepartmentUsers.tsx:48` : جاري تحميل قائمة المستخدمين التابعين للقسم...
- `src/pages/departments/DepartmentUsers.tsx:64` : القسم المحدد
- `src/pages/departments/DepartmentUsers.tsx:67` : عرض كافة الحسابات والموظفين المرتبطين بهذا القسم وصلاحياتهم
- `src/pages/departments/DepartmentUsers.tsx:77` : العودة لقائمة الأقسام
- `src/pages/departments/DepartmentUsers.tsx:89` : لا يوجد وصف مسجل لهذا القسم
- `src/pages/departments/DepartmentUsers.tsx:93` : إجمالي المنسوبين:
- `src/pages/departments/DepartmentUsers.tsx:95` : مستخدم | مستخدمين
- `src/pages/departments/DepartmentUsers.tsx:106` : الصورة
- `src/pages/departments/DepartmentUsers.tsx:107` : اسم المستخدم
- `src/pages/departments/DepartmentUsers.tsx:108` : الدور الوظيفي
- `src/pages/departments/DepartmentUsers.tsx:109` : تاريخ الانضمام
- `src/pages/departments/DepartmentUsers.tsx:110` : حالة الحساب
- `src/pages/departments/DepartmentUsers.tsx:119` : لا يوجد أي مستخدم مرتبط بهذا القسم حالياً.
- `src/pages/departments/DepartmentUsers.tsx:151` : مدير الإدارة
- `src/pages/departments/DepartmentUsers.tsx:155` : مدير
- `src/pages/departments/DepartmentUsers.tsx:159` : مدير قسم
- `src/pages/departments/DepartmentUsers.tsx:163` : مدير المكتب
- `src/pages/departments/DepartmentUsers.tsx:167` : مستخدم
- `src/pages/departments/DepartmentUsers.tsx:174` : غير مسجل
- `src/pages/departments/DepartmentUsers.tsx:185` : نشط | معطل

#### `src/pages/departments/EditDepartment.tsx` (14 lignes)
- `src/pages/departments/EditDepartment.tsx:27` : تم تحديث بيانات القسم بنجاح
- `src/pages/departments/EditDepartment.tsx:33` : فشل في تحديث القسم
- `src/pages/departments/EditDepartment.tsx:44` : جاري تحميل بيانات القسم...
- `src/pages/departments/EditDepartment.tsx:58` : القسم غير موجود
- `src/pages/departments/EditDepartment.tsx:59` : تعذر العثور على القسم المطلوب في قاعدة البيانات.
- `src/pages/departments/EditDepartment.tsx:76` : تعديل بيانات القسم: {department.name}
- `src/pages/departments/EditDepartment.tsx:79` : تحديث تفاصيل ومعلومات الوحدة التنظيمية
- `src/pages/departments/EditDepartment.tsx:89` : العودة للأقسام
- `src/pages/departments/EditDepartment.tsx:100` : معلومات تعريفية عن القسم
- `src/pages/departments/EditDepartment.tsx:108` : تاريخ الإنشاء
- `src/pages/departments/EditDepartment.tsx:111` : غير مسجل
- `src/pages/departments/EditDepartment.tsx:118` : الحالة التشغيلية
- `src/pages/departments/EditDepartment.tsx:127` : قسم نشط ومتاح للمعاملات | قسم معطل حالياً
- `src/pages/departments/EditDepartment.tsx:135` : المعرف النظامي

#### `src/pages/documents/DocumentOptionsPage.tsx` (39 lignes)
- `src/pages/documents/DocumentOptionsPage.tsx:72` : تم إنشاء خيار الوثيقة بنجاح
- `src/pages/documents/DocumentOptionsPage.tsx:76` : فشل في إنشاء خيار الوثيقة
- `src/pages/documents/DocumentOptionsPage.tsx:85` : تم تحديث خيار الوثيقة بنجاح
- `src/pages/documents/DocumentOptionsPage.tsx:90` : فشل في تحديث خيار الوثيقة
- `src/pages/documents/DocumentOptionsPage.tsx:98` : تم حذف خيار الوثيقة بنجاح
- `src/pages/documents/DocumentOptionsPage.tsx:102` : فشل في حذف خيار الوثيقة
- `src/pages/documents/DocumentOptionsPage.tsx:111` : تم تحديث حالة خيار الوثيقة
- `src/pages/documents/DocumentOptionsPage.tsx:114` : فشل في تحديث الحالة
- `src/pages/documents/DocumentOptionsPage.tsx:126` : الوصول مقيّد بالصلاحيات
- `src/pages/documents/DocumentOptionsPage.tsx:128` : إدارة خيارات وحقول الوثائق تتطلب صلاحية مكتب الضبط (AdminTuningDesk). يرجى مراجعة مسؤول النظام للحصول على الصلاحيات المطلوبة.
- `src/pages/documents/DocumentOptionsPage.tsx:174` : النشاط
- `src/pages/documents/DocumentOptionsPage.tsx:175` : تصنيف مجالات الأنشطة والمهام
- `src/pages/documents/DocumentOptionsPage.tsx:181` : المصدر / الجهة
- `src/pages/documents/DocumentOptionsPage.tsx:182` : الهيئات والمؤسسات المتعامل معها
- `src/pages/documents/DocumentOptionsPage.tsx:188` : نوع الوثيقة
- `src/pages/documents/DocumentOptionsPage.tsx:189` : المراسلات، التقارير والمذكرات
- `src/pages/documents/DocumentOptionsPage.tsx:195` : مخصص إلى
- `src/pages/documents/DocumentOptionsPage.tsx:196` : المصالح والوحدات المعنية بالتوجيه
- `src/pages/documents/DocumentOptionsPage.tsx:202` : للإعلام
- `src/pages/documents/DocumentOptionsPage.tsx:203` : الجهات المعنية بالمتابعة والإعلام
- `src/pages/documents/DocumentOptionsPage.tsx:213` : جاري تحميل خيارات الوثائق...
- `src/pages/documents/DocumentOptionsPage.tsx:214` : يتم استرجاع فئات وخيارات حقول الوثائق من قاعدة البيانات
- `src/pages/documents/DocumentOptionsPage.tsx:226` : تعذر تحميل البيانات
- `src/pages/documents/DocumentOptionsPage.tsx:228` : حدث خطأ أثناء الاتصال بالخادم لجلب خيارات الوثائق. يرجى المحاولة مجدداً.
- `src/pages/documents/DocumentOptionsPage.tsx:234` : إعادة المحاولة
- `src/pages/documents/DocumentOptionsPage.tsx:251` : إدارة خيارات وحقول الوثائق
- `src/pages/documents/DocumentOptionsPage.tsx:254` : تخصيص وضبط القوائم المنسدلة للأنشطة، المصادر، أنواع الوثائق والجهات المسؤولة للوثائق الإدارية
- `src/pages/documents/DocumentOptionsPage.tsx:268` : إضافة خيار جديد
- `src/pages/documents/DocumentOptionsPage.tsx:279` : إجمالي الخيارات المسجلة
- `src/pages/documents/DocumentOptionsPage.tsx:289` : الخيارات المفعلة (نشطة)
- `src/pages/documents/DocumentOptionsPage.tsx:299` : الخيارات المعطلة
- `src/pages/documents/DocumentOptionsPage.tsx:303` : {inactiveCount} &nbsp;خيار
- `src/pages/documents/DocumentOptionsPage.tsx:313` : أقسام وتصنيفات خيارات الوثائق
- `src/pages/documents/DocumentOptionsPage.tsx:316` : اضغط على أي قسم للتصفية السريعة وعرض الخيارات التابعة له
- `src/pages/documents/DocumentOptionsPage.tsx:329` : عرض الكل ( {totalCount} )
- `src/pages/documents/DocumentOptionsPage.tsx:405` : تأكيد الحذف
- `src/pages/documents/DocumentOptionsPage.tsx:407` : هل أنت متأكد من حذف هذا الخيار نهائياً؟
- `src/pages/documents/DocumentOptionsPage.tsx:411` : إلغاء
- `src/pages/documents/DocumentOptionsPage.tsx:422` : جاري الحذف... | حذف نهائياً

#### `src/pages/documents/EditIncomingDocument.tsx` (5 lignes)
- `src/pages/documents/EditIncomingDocument.tsx:70` : الوثيقة غير موجودة
- `src/pages/documents/EditIncomingDocument.tsx:71` : الوثيقة التي تبحث عنها غير موجودة أو ليس لديك صلاحية لتعديلها.
- `src/pages/documents/EditIncomingDocument.tsx:73` : العودة للوثائق الواردة
- `src/pages/documents/EditIncomingDocument.tsx:91` : رجوع
- `src/pages/documents/EditIncomingDocument.tsx:93` : تعديل الوثيقة الواردة

#### `src/pages/documents/EditOutgoingDocument.tsx` (5 lignes)
- `src/pages/documents/EditOutgoingDocument.tsx:70` : الوثيقة غير موجودة
- `src/pages/documents/EditOutgoingDocument.tsx:71` : الوثيقة التي تبحث عنها غير موجودة أو ليس لديك صلاحية لتعديلها.
- `src/pages/documents/EditOutgoingDocument.tsx:73` : العودة للوثائق الصادرة
- `src/pages/documents/EditOutgoingDocument.tsx:91` : رجوع
- `src/pages/documents/EditOutgoingDocument.tsx:93` : تعديل الوثيقة الصادرة

#### `src/pages/documents/IncomingDocumentsPage.tsx` (2 lignes)
- `src/pages/documents/IncomingDocumentsPage.tsx:601` : تصدير Excel
- `src/pages/documents/IncomingDocumentsPage.tsx:604` : تصدير Excel

#### `src/pages/documents/OutgoingDocumentsPage.tsx` (2 lignes)
- `src/pages/documents/OutgoingDocumentsPage.tsx:465` : تصدير Excel
- `src/pages/documents/OutgoingDocumentsPage.tsx:468` : تصدير Excel

#### `src/pages/documents/ScanDocumentPage.tsx` (25 lignes)
- `src/pages/documents/ScanDocumentPage.tsx:25` : مسح الوثائق
- `src/pages/documents/ScanDocumentPage.tsx:26` : إعداد الماسح الضوئي
- `src/pages/documents/ScanDocumentPage.tsx:27` : الماسحات الضوئية المتاحة
- `src/pages/documents/ScanDocumentPage.tsx:28` : لم يتم اكتشاف أي ماسح ضوئي
- `src/pages/documents/ScanDocumentPage.tsx:29` : تحديث قائمة الماسحات الضوئية
- `src/pages/documents/ScanDocumentPage.tsx:30` : اختر ماسح ضوئي
- `src/pages/documents/ScanDocumentPage.tsx:31` : إعدادات المسح
- `src/pages/documents/ScanDocumentPage.tsx:32` : نوع المستند
- `src/pages/documents/ScanDocumentPage.tsx:33` : وارد
- `src/pages/documents/ScanDocumentPage.tsx:34` : صادر
- `src/pages/documents/ScanDocumentPage.tsx:35` : الدقة
- `src/pages/documents/ScanDocumentPage.tsx:36` : الصيغة
- `src/pages/documents/ScanDocumentPage.tsx:37` : بدء المسح
- `src/pages/documents/ScanDocumentPage.tsx:38` : جاري المسح...
- `src/pages/documents/ScanDocumentPage.tsx:39` : تم المسح بنجاح
- `src/pages/documents/ScanDocumentPage.tsx:40` : فشل المسح
- `src/pages/documents/ScanDocumentPage.tsx:41` : عرض المستند
- `src/pages/documents/ScanDocumentPage.tsx:42` : إنشاء سجل من المسح الضوئي
- `src/pages/documents/ScanDocumentPage.tsx:43` : عمليات المسح الأخيرة
- `src/pages/documents/ScanDocumentPage.tsx:44` : لا توجد عمليات مسح حديثة
- `src/pages/documents/ScanDocumentPage.tsx:45` : معلومات المسح
- `src/pages/documents/ScanDocumentPage.tsx:46` : نص مستخرج من التعرف الضوئي على الحروف (OCR)
- `src/pages/documents/ScanDocumentPage.tsx:47` : لم يتم استخراج أي نص
- `src/pages/documents/ScanDocumentPage.tsx:48` : حدث خطأ
- `src/pages/documents/ScanDocumentPage.tsx:49` : تم اختيار الماسح الضوئي

#### `src/pages/documents/ViewIncomingDocument.tsx` (1 lignes)
- `src/pages/documents/ViewIncomingDocument.tsx:63` : ،

#### `src/pages/documents/ViewOutgoingDocument.tsx` (93 lignes)
- `src/pages/documents/ViewOutgoingDocument.tsx:582` : بيانات الإصدار والتوثيق الإداري
- `src/pages/documents/ViewOutgoingDocument.tsx:588` : رقم القيد الصادر:
- `src/pages/documents/ViewOutgoingDocument.tsx:590` : >#{document.serialNumber}</bdi> لسنة <bdi dir= | لسنة
- `src/pages/documents/ViewOutgoingDocument.tsx:595` : تاريخ الإصدار / الإرسال:
- `src/pages/documents/ViewOutgoingDocument.tsx:602` : نوع الوثيقة:
- `src/pages/documents/ViewOutgoingDocument.tsx:604` : غير مصنف
- `src/pages/documents/ViewOutgoingDocument.tsx:609` : تاريخ الإنشاء والتسجيل بالمنظومة:
- `src/pages/documents/ViewOutgoingDocument.tsx:616` : المصلحة / القسم المصدر:
- `src/pages/documents/ViewOutgoingDocument.tsx:620` : >معرّف المصلحة: <bdi dir= | معرّف المصلحة:
- `src/pages/documents/ViewOutgoingDocument.tsx:634` : جهات التوجيه والتوزيع الإداري
- `src/pages/documents/ViewOutgoingDocument.tsx:644` : الجهات الموجه إليها (المستلمون الأساسيون):
- `src/pages/documents/ViewOutgoingDocument.tsx:647` : {assignedCount} جهة
- `src/pages/documents/ViewOutgoingDocument.tsx:665` : لم يتم تحديد جهات توجيه أساسية لهذه الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:677` : نسخ للإعلام والإطلاع (Pour Information):
- `src/pages/documents/ViewOutgoingDocument.tsx:680` : {pourInfoCount} جهة
- `src/pages/documents/ViewOutgoingDocument.tsx:698` : لا توجد نسخ محددة للإعلام مع هذه المراسلة
- `src/pages/documents/ViewOutgoingDocument.tsx:715` : النص المستخرج آلياً (OCR)
- `src/pages/documents/ViewOutgoingDocument.tsx:717` : تم التعرف على النص عبر خوارزميات المسح الضوئي
- `src/pages/documents/ViewOutgoingDocument.tsx:732` : تم النسخ
- `src/pages/documents/ViewOutgoingDocument.tsx:737` : نسخ النص
- `src/pages/documents/ViewOutgoingDocument.tsx:750` : بحث داخل النص المستخرج...
- `src/pages/documents/ViewOutgoingDocument.tsx:760` : مسح
- `src/pages/documents/ViewOutgoingDocument.tsx:772` : عدد الكلمات التقريبي: | كلمة
- `src/pages/documents/ViewOutgoingDocument.tsx:773` : الحروف: | حرف
- `src/pages/documents/ViewOutgoingDocument.tsx:797` : الوثيقة الواردة المرجعية
- `src/pages/documents/ViewOutgoingDocument.tsx:801` : مرتبط
- `src/pages/documents/ViewOutgoingDocument.tsx:810` : رقم القيد الوارد:
- `src/pages/documents/ViewOutgoingDocument.tsx:817` : موضوع الوارد:
- `src/pages/documents/ViewOutgoingDocument.tsx:824` : تاريخ الوصول:
- `src/pages/documents/ViewOutgoingDocument.tsx:835` : عرض بطاقة الوثيقة الواردة
- `src/pages/documents/ViewOutgoingDocument.tsx:842` : مراسلة صادرة ابتدائية
- `src/pages/documents/ViewOutgoingDocument.tsx:844` : هذه الوثيقة غير مرتبطة بوارد سابق، وصدرت مباشرة بمبادرة إدارية من المصلحة المصدرة.
- `src/pages/documents/ViewOutgoingDocument.tsx:855` : التصنيف الأرشيفي
- `src/pages/documents/ViewOutgoingDocument.tsx:865` : تعديل
- `src/pages/documents/ViewOutgoingDocument.tsx:873` : المجلد الحالي:
- `src/pages/documents/ViewOutgoingDocument.tsx:879` : تصنيف الوثيقة داخل مجلد يضمن سهولة الفهرسة والبحث والرجوع المستقبلي للوثائق المشتركة.
- `src/pages/documents/ViewOutgoingDocument.tsx:887` : ملخص مسار الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:894` : تسجيل الإصدار:
- `src/pages/documents/ViewOutgoingDocument.tsx:902` : تحديد الموجه إليهم:
- `src/pages/documents/ViewOutgoingDocument.tsx:903` : >{assignedCount}</bdi> جهة</> : | جهة
- `src/pages/documents/ViewOutgoingDocument.tsx:910` : الأرشفة في مجلد:
- `src/pages/documents/ViewOutgoingDocument.tsx:911` : لم تؤرشف بعد
- `src/pages/documents/ViewOutgoingDocument.tsx:918` : المسح الضوئي (PDF):
- `src/pages/documents/ViewOutgoingDocument.tsx:919` : مرفق وممسوح ضوئياً | غير مرفق
- `src/pages/documents/ViewOutgoingDocument.tsx:938` : الوثائق المرفقة والممسوحة ضوئياً
- `src/pages/documents/ViewOutgoingDocument.tsx:941` : معاينة مستندات PDF المرفقة مع إمكانية التحميل والطباعة المباشرة
- `src/pages/documents/ViewOutgoingDocument.tsx:956` : الوثيقة الصادرة
- `src/pages/documents/ViewOutgoingDocument.tsx:965` : الوارد المرجعي
- `src/pages/documents/ViewOutgoingDocument.tsx:974` : عرض مقارن جنباً إلى جنب
- `src/pages/documents/ViewOutgoingDocument.tsx:991` : الوثيقة الصادرة الحالية
- `src/pages/documents/ViewOutgoingDocument.tsx:1001` : تحميل
- `src/pages/documents/ViewOutgoingDocument.tsx:1015` : الوارد المرجعي ( #{referenceDocument.serialNumber} )
- `src/pages/documents/ViewOutgoingDocument.tsx:1026` : تحميل
- `src/pages/documents/ViewOutgoingDocument.tsx:1041` : ملف الوثيقة الواردة المرجعية ( #{referenceDocument.serialNumber}/{referenceDocument.year} )
- `src/pages/documents/ViewOutgoingDocument.tsx:1052` : تحميل الوارد
- `src/pages/documents/ViewOutgoingDocument.tsx:1066` : ملف الوثيقة الصادرة ( #{document.serialNumber}/{document.year} )
- `src/pages/documents/ViewOutgoingDocument.tsx:1078` : تحميل ملف PDF
- `src/pages/documents/ViewOutgoingDocument.tsx:1089` : لا يوجد ملف PDF ممسوح ضوئياً لهذه الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1099` : لا توجد وثائق ممسوحة ضوئياً مرفقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1101` : لم يتم تحميل أي ملف PDF ممسوح ضوئياً لهذه المراسلة الصادرة حتى الآن.
- `src/pages/documents/ViewOutgoingDocument.tsx:1109` : إرفاق وثيقة ممسوحة ضوئياً
- `src/pages/documents/ViewOutgoingDocument.tsx:1120` : الإجراءات الإدارية المتاحة
- `src/pages/documents/ViewOutgoingDocument.tsx:1123` : العمليات الإدارية المباشرة المتاحة على هذه المراسلة الصادرة
- `src/pages/documents/ViewOutgoingDocument.tsx:1137` : معاينة ملف PDF
- `src/pages/documents/ViewOutgoingDocument.tsx:1149` : أرشفة وتنظيم في مجلد
- `src/pages/documents/ViewOutgoingDocument.tsx:1162` : تحميل نسخة PDF
- `src/pages/documents/ViewOutgoingDocument.tsx:1174` : طباعة بطاقة الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1186` : تعديل بيانات الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1199` : حذف الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1211` : العودة إلى قائمة الوثائق
- `src/pages/documents/ViewOutgoingDocument.tsx:1233` : سجل المتابعة والتاريخ الإداري
- `src/pages/documents/ViewOutgoingDocument.tsx:1236` : التتبع الزمني لكافة الإجراءات والعمليات التي تمت على هذه المراسلة الصادرة
- `src/pages/documents/ViewOutgoingDocument.tsx:1251` : إجراء إداري
- `src/pages/documents/ViewOutgoingDocument.tsx:1258` : مستخدم النظام
- `src/pages/documents/ViewOutgoingDocument.tsx:1273` : تسجيل وقيد الوثيقة في سجل الصادر
- `src/pages/documents/ViewOutgoingDocument.tsx:1280` : >#{document.serialNumber}</bdi></span> لسنة <bdi dir= | >{document.year}</bdi> من المصلحة المصدرة: <span className= | لسنة | من المصلحة المصدرة:
- `src/pages/documents/ViewOutgoingDocument.tsx:1291` : توجيه وإرسال المراسلة إلى الجهات المعنية
- `src/pages/documents/ViewOutgoingDocument.tsx:1294` : وجهت المراسلة إلى:{' '}
- `src/pages/documents/ViewOutgoingDocument.tsx:1296` : ،
- `src/pages/documents/ViewOutgoingDocument.tsx:1309` : إرسال نسخ للإعلام والإطلاع (Pour Info)
- `src/pages/documents/ViewOutgoingDocument.tsx:1312` : أرسلت نسخ إعلامية إلى:{' '}
- `src/pages/documents/ViewOutgoingDocument.tsx:1314` : ،
- `src/pages/documents/ViewOutgoingDocument.tsx:1327` : أرشفة وتصنيف المراسلة في مجلد
- `src/pages/documents/ViewOutgoingDocument.tsx:1330` : تم إدراج الوثيقة ضمن مجلد: {folderName} .
- `src/pages/documents/ViewOutgoingDocument.tsx:1343` : الربط كإجابة ورد رسمي على مراسلة واردة
- `src/pages/documents/ViewOutgoingDocument.tsx:1346` : وارد رقم #{referenceDocument.serialNumber} / {referenceDocument.year}
- `src/pages/documents/ViewOutgoingDocument.tsx:1350` : تشكل هذه الوثيقة الصادرة رداً رسمياً على المراسلة الواردة موضوع:{' '}
- `src/pages/documents/ViewOutgoingDocument.tsx:1378` : تأكيد حذف الوثيقة الصادرة
- `src/pages/documents/ViewOutgoingDocument.tsx:1381` : هل أنت متأكد من رغبتك في حذف الوثيقة الصادرة رقم{' '}
- `src/pages/documents/ViewOutgoingDocument.tsx:1382` : >#{document.serialNumber}</bdi></span> لسنة{
- `src/pages/documents/ViewOutgoingDocument.tsx:1383` : {document.year} ؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
- `src/pages/documents/ViewOutgoingDocument.tsx:1392` : جاري الحذف... | نعم، حذف الوثيقة
- `src/pages/documents/ViewOutgoingDocument.tsx:1398` : إلغاء

#### `src/pages/guide/InstallationGuidePage.tsx` (28 lignes)
- `src/pages/guide/InstallationGuidePage.tsx:44` : الخطوة 1 — معالج الإعداد الأولي
- `src/pages/guide/InstallationGuidePage.tsx:45` : تشغيل معالج الإعداد لإنشاء الإدارة والأقسام وحسابات المدير ومدير الموارد البشرية.
- `src/pages/guide/InstallationGuidePage.tsx:48` : الذهاب إلى الإعداد
- `src/pages/guide/InstallationGuidePage.tsx:57` : الخطوة 2 — إكمال بطاقات الموظفين
- `src/pages/guide/InstallationGuidePage.tsx:58` : تسجيل الدخول بحساب مدير الموارد البشرية لإكمال بيانات الموظفين (المدير، مكتب الضبط، RH، المختبر...).
- `src/pages/guide/InstallationGuidePage.tsx:61` : الذهاب إلى الموظفين
- `src/pages/guide/InstallationGuidePage.tsx:70` : الخطوة 3 — إنشاء حسابات المستخدمين
- `src/pages/guide/InstallationGuidePage.tsx:71` : بصفة مدير النظام، استخدم زر 🔑 في جدول الموظفين لإنشاء حساب لكل موظف مع توليد كلمة مرور تلقائياً وطبع بطاقة الاتصال (PDF).
- `src/pages/guide/InstallationGuidePage.tsx:74` : الذهاب إلى الموظفين
- `src/pages/guide/InstallationGuidePage.tsx:83` : الخطوة 4 — إعداد الوثائق
- `src/pages/guide/InstallationGuidePage.tsx:84` : إنشاء النماذج والقوالب، ضبط خيارات الوثائق، وتجربة إسناد وثيقة إلى قسم.
- `src/pages/guide/InstallationGuidePage.tsx:87` : الوثائق الواردة
- `src/pages/guide/InstallationGuidePage.tsx:93` : خيارات الوثائق
- `src/pages/guide/InstallationGuidePage.tsx:102` : الخطوة 5 — التحقق النهائي
- `src/pages/guide/InstallationGuidePage.tsx:103` : التحقق من عمل كل دور : المدير، مدير النظام، مكتب الضبط، RH، الموظف. معاينة المخطط التنظيمي.
- `src/pages/guide/InstallationGuidePage.tsx:106` : المخطط التنظيمي
- `src/pages/guide/InstallationGuidePage.tsx:182` : دليل الإعداد والتثبيت
- `src/pages/guide/InstallationGuidePage.tsx:185` : دليل إرشادي تفصيلي خطوة بخطوة لتهيئة وتشغيل النظام بعد معالج الإعداد الأولي
- `src/pages/guide/InstallationGuidePage.tsx:196` : إعادة تعيين التقدم
- `src/pages/guide/InstallationGuidePage.tsx:199` : إعادة تعيين
- `src/pages/guide/InstallationGuidePage.tsx:209` : الرجوع
- `src/pages/guide/InstallationGuidePage.tsx:219` : نسبة الإنجاز :
- `src/pages/guide/InstallationGuidePage.tsx:220` : {completedCount} من {totalSteps} خطوات مكتملة
- `src/pages/guide/InstallationGuidePage.tsx:244` : تهانينا! لقد اكتملت جميع خطوات تهيئة وتثبيت النظام بنجاح. النظام جاهز للعمل بشكل متكامل.
- `src/pages/guide/InstallationGuidePage.tsx:272` : إلغاء التحديد | تحديد كـ مكتمل
- `src/pages/guide/InstallationGuidePage.tsx:294` : معالج الإعداد مكتمل
- `src/pages/guide/InstallationGuidePage.tsx:305` : ✅ مكتمل | ⭕ قيد الإنجاز
- `src/pages/guide/InstallationGuidePage.tsx:344` : إلغاء التحديد كـ مكتمل | وضع علامة مكتمل

#### `src/pages/hr/AllPersonnelSituationPage.tsx` (13 lignes)
- `src/pages/hr/AllPersonnelSituationPage.tsx:515` : الرئيسية
- `src/pages/hr/AllPersonnelSituationPage.tsx:518` : الموارد البشرية
- `src/pages/hr/AllPersonnelSituationPage.tsx:520` : وضعية الموظفين
- `src/pages/hr/AllPersonnelSituationPage.tsx:527` : وضعية الموظفين
- `src/pages/hr/AllPersonnelSituationPage.tsx:531` : إدارة الموارد البشرية
- `src/pages/hr/AllPersonnelSituationPage.tsx:535` : متابعة شاملة ومجمّعة لحالة حضور وغياب كافة موظفي الإدارة حسب اليوم، الأسبوع، الشهر، أو السنة
- `src/pages/hr/AllPersonnelSituationPage.tsx:552` : جاري التصدير... | تصدير PDF
- `src/pages/hr/AllPersonnelSituationPage.tsx:559` : تحديث البيانات
- `src/pages/hr/AllPersonnelSituationPage.tsx:562` : تحديث
- `src/pages/hr/AllPersonnelSituationPage.tsx:596` : عرض اليوم
- `src/pages/hr/AllPersonnelSituationPage.tsx:609` : عرض الأسبوع
- `src/pages/hr/AllPersonnelSituationPage.tsx:622` : عرض الشهر
- `src/pages/hr/AllPersonnelSituationPage.tsx:635` : عرض السنة

#### `src/pages/hr/AttendanceDeclarationsPage.tsx` (81 lignes)
- `src/pages/hr/AttendanceDeclarationsPage.tsx:142` : تعذر تحميل قائمة التصاريح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:198` : تم قبول التصريح واعتماد الحضور في السجل بنجاح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:203` : فشلت عملية اعتماد التصريح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:221` : يرجى تحديد سبب الرفض لتوضيحه للموظف
- `src/pages/hr/AttendanceDeclarationsPage.tsx:227` : تم رفض التصريح وإشعار صاحب الطلب
- `src/pages/hr/AttendanceDeclarationsPage.tsx:232` : فشلت عملية رفض التصريح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:273` : تم تحديث بيانات التصريح بنجاح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:278` : فشلت عملية تعديل التصريح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:291` : قيد المراجعة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:298` : مقبول ومعتمد
- `src/pages/hr/AttendanceDeclarationsPage.tsx:305` : مرفوض
- `src/pages/hr/AttendanceDeclarationsPage.tsx:312` : تم التعديل
- `src/pages/hr/AttendanceDeclarationsPage.tsx:326` : حاضر {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:335` : غياب مبرر
- `src/pages/hr/AttendanceDeclarationsPage.tsx:351` : الإعلانات والتصاريح في انتظار الموافقة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:354` : {kpis.pending} معلقة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:359` : مراجعة تصاريح الحضور والغياب والمأموريات المقدمة مسبقاً من طرف الموظفين واعتمادها في السجل اليومي.
- `src/pages/hr/AttendanceDeclarationsPage.tsx:373` : تحديث
- `src/pages/hr/AttendanceDeclarationsPage.tsx:390` : قيد المراجعة (معلقة)
- `src/pages/hr/AttendanceDeclarationsPage.tsx:397` : تتطلب اتخاذ قرار
- `src/pages/hr/AttendanceDeclarationsPage.tsx:411` : المقبولة والمعتمدة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:418` : تم ترحيلها للسجل
- `src/pages/hr/AttendanceDeclarationsPage.tsx:432` : المرفوضة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:439` : تم إشعار أصحابها
- `src/pages/hr/AttendanceDeclarationsPage.tsx:453` : بحث بالاسم أو الرقم الوظيفي...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:465` : تصفية حسب الحالة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:468` : كل الحالات ({declarations.length})
- `src/pages/hr/AttendanceDeclarationsPage.tsx:469` : قيد المراجعة فقط
- `src/pages/hr/AttendanceDeclarationsPage.tsx:470` : المقبولة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:471` : المرفوضة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:472` : المعدلة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:484` : كل الأقسام / المصالح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:487` : كل الأقسام والمصالح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:526` : جاري تحميل التصاريح...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:533` : لا توجد تصاريح مطابقة للشروط
- `src/pages/hr/AttendanceDeclarationsPage.tsx:535` : لم يقم أي موظف بتقديم تصريح في هذه الفترة أو تم البت في جميع الطلبات المقدمة مسبقاً.
- `src/pages/hr/AttendanceDeclarationsPage.tsx:543` : الموظف
- `src/pages/hr/AttendanceDeclarationsPage.tsx:544` : التاريخ المعني
- `src/pages/hr/AttendanceDeclarationsPage.tsx:545` : الحالة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:546` : نوع التصريح / السبب
- `src/pages/hr/AttendanceDeclarationsPage.tsx:547` : التفاصيل والملاحظات
- `src/pages/hr/AttendanceDeclarationsPage.tsx:548` : الإجراءات
- `src/pages/hr/AttendanceDeclarationsPage.tsx:575` : موظف غير معرف
- `src/pages/hr/AttendanceDeclarationsPage.tsx:592` : قُدم: {new Date(decl.createdAt || '').toLocaleDateString('fr-FR')}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:611` : المصلحة: {decl.detailsMotif.nomService}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:633` : سبب الرفض: {decl.rejectionReason}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:638` : ملاحظة الإدارة: {decl.adminComment}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:653` : موافقة واعتماد
- `src/pages/hr/AttendanceDeclarationsPage.tsx:656` : اعتماد
- `src/pages/hr/AttendanceDeclarationsPage.tsx:664` : رفض التصريح
- `src/pages/hr/AttendanceDeclarationsPage.tsx:667` : رفض
- `src/pages/hr/AttendanceDeclarationsPage.tsx:689` : مراجعة / تعديل
- `src/pages/hr/AttendanceDeclarationsPage.tsx:709` : تأكيد اعتماد التصريح وترحيله للسجل
- `src/pages/hr/AttendanceDeclarationsPage.tsx:714` : عند التأكيد، سيتم ترحيل هذه الوضعية مباشرة إلى سجل الحضور اليومي للمؤسسة ليوم{' '}
- `src/pages/hr/AttendanceDeclarationsPage.tsx:723` : ملاحظة الإدارة (اختياري)
- `src/pages/hr/AttendanceDeclarationsPage.tsx:729` : أية ملاحظة تود توثيقها في سجل المراجعة...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:741` : تراجع
- `src/pages/hr/AttendanceDeclarationsPage.tsx:750` : تأكيد القبول والاعتماد
- `src/pages/hr/AttendanceDeclarationsPage.tsx:762` : رفض تصريح الحضور / الغياب
- `src/pages/hr/AttendanceDeclarationsPage.tsx:767` : يرجى إدخال سبب الرفض ليتمكن الموظف من الاطلاع عليه وتصحيح وضعيته إذا لزم الأمر:
- `src/pages/hr/AttendanceDeclarationsPage.tsx:772` : سبب الرفض *
- `src/pages/hr/AttendanceDeclarationsPage.tsx:778` : مثال: تعارض مع مأمورية سابقة، عدم تقديم إذن مسبق، ضرورة الحضور للاجتماع...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:784` : ملاحظة داخلية إضافية (اختياري)
- `src/pages/hr/AttendanceDeclarationsPage.tsx:788` : ملاحظة للإدارة...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:800` : إلغاء
- `src/pages/hr/AttendanceDeclarationsPage.tsx:809` : تأكيد الرفض
- `src/pages/hr/AttendanceDeclarationsPage.tsx:821` : تعديل بيانات التصريح (إدارة الموارد البشرية)
- `src/pages/hr/AttendanceDeclarationsPage.tsx:827` : الوضعية
- `src/pages/hr/AttendanceDeclarationsPage.tsx:836` : حاضر
- `src/pages/hr/AttendanceDeclarationsPage.tsx:837` : غائب / مصلحة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:844` : ساعة الحضور
- `src/pages/hr/AttendanceDeclarationsPage.tsx:854` : سبب الغياب
- `src/pages/hr/AttendanceDeclarationsPage.tsx:860` : اختر السبب
- `src/pages/hr/AttendanceDeclarationsPage.tsx:877` : اسم المصلحة / الإدارة
- `src/pages/hr/AttendanceDeclarationsPage.tsx:881` : اسم المصلحة المستقبلة...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:887` : مكان المأمورية
- `src/pages/hr/AttendanceDeclarationsPage.tsx:895` : موضوع المأمورية
- `src/pages/hr/AttendanceDeclarationsPage.tsx:907` : ملاحظة التعديل للملف
- `src/pages/hr/AttendanceDeclarationsPage.tsx:912` : سبب التعديل من طرف الإدارة...
- `src/pages/hr/AttendanceDeclarationsPage.tsx:924` : إلغاء
- `src/pages/hr/AttendanceDeclarationsPage.tsx:932` : حفظ التعديلات

#### `src/pages/hr/AttendancePage.tsx` (62 lignes)
- `src/pages/hr/AttendancePage.tsx:119` : الموارد البشرية
- `src/pages/hr/AttendancePage.tsx:153` : حدث خطأ أثناء تحميل أنواع وأسباب الغياب
- `src/pages/hr/AttendancePage.tsx:206` : حدث خطأ أثناء تحميل لائحة الحضور
- `src/pages/hr/AttendancePage.tsx:308` : تم تحديد جميع الموظفين كحاضرين
- `src/pages/hr/AttendancePage.tsx:319` : يرجى تحديد سبب الغياب للموظف: ${invalidAbsent.personnel.nom} ${invalidAbsent.personnel.prenom}
- `src/pages/hr/AttendancePage.tsx:337` : تم حفظ جدول الحضور بنجاح
- `src/pages/hr/AttendancePage.tsx:344` : حدث خطأ أثناء حفظ الحضور
- `src/pages/hr/AttendancePage.tsx:389` : م
- `src/pages/hr/AttendancePage.tsx:409` : لوحة التحكم
- `src/pages/hr/AttendancePage.tsx:413` : الموارد البشرية
- `src/pages/hr/AttendancePage.tsx:416` : تسجيل الحضور
- `src/pages/hr/AttendancePage.tsx:425` : ورقة تسجيل الحضور اليومي
- `src/pages/hr/AttendancePage.tsx:428` : تسجيل إثبات الحضور والغياب واحتساب الخصم من الرصيد ديناميكياً
- `src/pages/hr/AttendancePage.tsx:446` : حفظ التسجيلات
- `src/pages/hr/AttendancePage.tsx:459` : تاريخ الحضور :
- `src/pages/hr/AttendancePage.tsx:473` : القسم / المصلحة :
- `src/pages/hr/AttendancePage.tsx:481` : القسم المخصص
- `src/pages/hr/AttendancePage.tsx:482` : القسم المخصص
- `src/pages/hr/AttendancePage.tsx:492` : اختر القسم
- `src/pages/hr/AttendancePage.tsx:495` : جميع الأقسام
- `src/pages/hr/AttendancePage.tsx:510` : بحث عن موظف :
- `src/pages/hr/AttendancePage.tsx:515` : الاسم، اللقب، رقم ب.ت.و...
- `src/pages/hr/AttendancePage.tsx:534` : تحديد الكل كحاضر
- `src/pages/hr/AttendancePage.tsx:542` : إجمالي الموظفين:
- `src/pages/hr/AttendancePage.tsx:547` : الحاضرون:
- `src/pages/hr/AttendancePage.tsx:552` : الغائبون:
- `src/pages/hr/AttendancePage.tsx:559` : (تم حفظ {stats.saved} مسبقاً لهذا اليوم)
- `src/pages/hr/AttendancePage.tsx:565` : تصفية العرض:
- `src/pages/hr/AttendancePage.tsx:574` : الكل ({stats.total})
- `src/pages/hr/AttendancePage.tsx:586` : الحاضرون ({stats.presents})
- `src/pages/hr/AttendancePage.tsx:598` : الغائبون ({stats.absents})
- `src/pages/hr/AttendancePage.tsx:609` : جاري تحميل قائمة الحضور...
- `src/pages/hr/AttendancePage.tsx:614` : لا يوجد موظفون للعرض
- `src/pages/hr/AttendancePage.tsx:616` : تأكد من اختيار القسم المناسب أو إضافة موظفين في قسم الموارد البشرية
- `src/pages/hr/AttendancePage.tsx:658` : تم تسجيل هذه الحالة مسبقاً
- `src/pages/hr/AttendancePage.tsx:660` : مُسجل
- `src/pages/hr/AttendancePage.tsx:667` : ب.ت.و: {row.personnel.cin}
- `src/pages/hr/AttendancePage.tsx:700` : حاضر
- `src/pages/hr/AttendancePage.tsx:713` : غائب
- `src/pages/hr/AttendancePage.tsx:723` : وقت الوصول
- `src/pages/hr/AttendancePage.tsx:747` : سبب الغياب * :
- `src/pages/hr/AttendancePage.tsx:754` : اختر سبب الغياب
- `src/pages/hr/AttendancePage.tsx:776` : تأثير الغياب على الرصيد :
- `src/pages/hr/AttendancePage.tsx:785` : يؤثر على الرصيد : نعم (مخصوم)
- `src/pages/hr/AttendancePage.tsx:793` : يؤثر على الرصيد : لا (غير مخصوم)
- `src/pages/hr/AttendancePage.tsx:805` : اسم المصلحة أو الوجهة الإدارية :
- `src/pages/hr/AttendancePage.tsx:809` : حدد اسم المصلحة المكلف بها...
- `src/pages/hr/AttendancePage.tsx:824` : مكان المهمة :
- `src/pages/hr/AttendancePage.tsx:828` : المدينة / المؤسسة...
- `src/pages/hr/AttendancePage.tsx:838` : موضوع المهمة :
- `src/pages/hr/AttendancePage.tsx:842` : الهدف من المهمة...
- `src/pages/hr/AttendancePage.tsx:858` : عنوان التكوين :
- `src/pages/hr/AttendancePage.tsx:862` : موضوع الدورة التكوينية...
- `src/pages/hr/AttendancePage.tsx:876` : الهيئة المؤطرة :
- `src/pages/hr/AttendancePage.tsx:880` : الجهة أو المركز المنظم...
- `src/pages/hr/AttendancePage.tsx:894` : مدة التكوين :
- `src/pages/hr/AttendancePage.tsx:898` : مثال: 3 أيام، أسبوع...
- `src/pages/hr/AttendancePage.tsx:924` : التاريخ المحدد:
- `src/pages/hr/AttendancePage.tsx:926` : عدد الموظفين:
- `src/pages/hr/AttendancePage.tsx:928` : الحاضرون:
- `src/pages/hr/AttendancePage.tsx:930` : الغائبون:
- `src/pages/hr/AttendancePage.tsx:944` : حفظ جدول الحضور لليوم

#### `src/pages/hr/LeaveReasonsManagementPage.tsx` (49 lignes)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:75` : حدث خطأ أثناء تحميل أنواع الغياب
- `src/pages/hr/LeaveReasonsManagementPage.tsx:156` : تم تفعيل نوع الغياب بنجاح
- `src/pages/hr/LeaveReasonsManagementPage.tsx:157` : تم تعطيل نوع الغياب بنجاح
- `src/pages/hr/LeaveReasonsManagementPage.tsx:160` : تعذر تغيير حالة نوع الغياب
- `src/pages/hr/LeaveReasonsManagementPage.tsx:166` : الأنواع النظامية الأساسية محمية ولا يمكن حذفها
- `src/pages/hr/LeaveReasonsManagementPage.tsx:178` : تم حذف نوع الغياب بنجاح
- `src/pages/hr/LeaveReasonsManagementPage.tsx:187` : حدث خطأ أثناء محاولة الحذف
- `src/pages/hr/LeaveReasonsManagementPage.tsx:211` : لوحة التحكم
- `src/pages/hr/LeaveReasonsManagementPage.tsx:215` : الموارد البشرية
- `src/pages/hr/LeaveReasonsManagementPage.tsx:218` : أنواع الغياب
- `src/pages/hr/LeaveReasonsManagementPage.tsx:227` : إدارة أنواع وأسباب الغياب
- `src/pages/hr/LeaveReasonsManagementPage.tsx:230` : تكوين أسباب الغياب والعطل، تحديد شروط الاستقطاع من الرصيد والوثائق المطلوبة
- `src/pages/hr/LeaveReasonsManagementPage.tsx:242` : إضافة نوع غياب جديد
- `src/pages/hr/LeaveReasonsManagementPage.tsx:252` : قواعد إدارة وحماية أنواع الغياب :
- `src/pages/hr/LeaveReasonsManagementPage.tsx:254` : الأنواع الـ 14 النظامية الأساسية محمية ولا يمكن حذفها نهائياً، بل يمكن تعديل بعض إعداداتها أو تعطيلها.
- `src/pages/hr/LeaveReasonsManagementPage.tsx:255` : الأنواع المرتبطة بسجلات حضور وغياب سابقة لا يمكن حذفها تجنباً لتلف البيانات التاريخية؛ يمكن تعطيلها لإخفائها من القوائم الجديدة.
- `src/pages/hr/LeaveReasonsManagementPage.tsx:256` : يخصم من الرصيد | الأنواع الموسومة بـ "يخصم من الرصيد" تؤثر تلقائياً على رصيد الإجازات السنوية المتبقية للموظف.
- `src/pages/hr/LeaveReasonsManagementPage.tsx:266` : إجمالي الأنواع
- `src/pages/hr/LeaveReasonsManagementPage.tsx:277` : الأنواع المفعلة
- `src/pages/hr/LeaveReasonsManagementPage.tsx:288` : الأنواع المعطلة
- `src/pages/hr/LeaveReasonsManagementPage.tsx:299` : تخصم من الرصيد السنوي
- `src/pages/hr/LeaveReasonsManagementPage.tsx:317` : البحث بالرمز، الاسم بالعربية أو بالفرنسية...
- `src/pages/hr/LeaveReasonsManagementPage.tsx:326` : كل التصنيفات
- `src/pages/hr/LeaveReasonsManagementPage.tsx:329` : كل التصنيفات
- `src/pages/hr/LeaveReasonsManagementPage.tsx:330` : عطلة (Congé)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:331` : مهمة (Mission)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:332` : تكوين (Formation)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:333` : خدمة (Service)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:334` : أخرى (Autre)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:343` : كل الحالات
- `src/pages/hr/LeaveReasonsManagementPage.tsx:346` : كل الحالات
- `src/pages/hr/LeaveReasonsManagementPage.tsx:347` : مفعل فقط
- `src/pages/hr/LeaveReasonsManagementPage.tsx:348` : معطل فقط
- `src/pages/hr/LeaveReasonsManagementPage.tsx:357` : خصم الرصيد
- `src/pages/hr/LeaveReasonsManagementPage.tsx:360` : الكل (خصم الرصيد)
- `src/pages/hr/LeaveReasonsManagementPage.tsx:361` : يخصم من الرصيد
- `src/pages/hr/LeaveReasonsManagementPage.tsx:362` : لا يخصم
- `src/pages/hr/LeaveReasonsManagementPage.tsx:370` : إعادة تعيين الفلاتر
- `src/pages/hr/LeaveReasonsManagementPage.tsx:371` : إعادة تعيين الفلاتر
- `src/pages/hr/LeaveReasonsManagementPage.tsx:393` : عرض {paginatedReasons.length} من أصل {filteredReasons.length} نوع
- `src/pages/hr/LeaveReasonsManagementPage.tsx:405` : السابق
- `src/pages/hr/LeaveReasonsManagementPage.tsx:409` : الصفحة {currentPage} من {totalPages}
- `src/pages/hr/LeaveReasonsManagementPage.tsx:420` : التالي
- `src/pages/hr/LeaveReasonsManagementPage.tsx:439` : تأكيد حذف نوع الغياب
- `src/pages/hr/LeaveReasonsManagementPage.tsx:442` : هل أنت متأكد من رغبتك في حذف نوع الغياب{' '}
- `src/pages/hr/LeaveReasonsManagementPage.tsx:443` : "{reasonToDelete?.labelAr}" ({reasonToDelete?.code})؟
- `src/pages/hr/LeaveReasonsManagementPage.tsx:445` : هذا الإجراء لا يمكن التراجع عنه إذا لم يكن النوع مرتبطاً بأي سجلات.
- `src/pages/hr/LeaveReasonsManagementPage.tsx:453` : إلغاء
- `src/pages/hr/LeaveReasonsManagementPage.tsx:460` : جاري الحذف... | نعم، حذف النوع

#### `src/pages/hr/MyAttendanceCalendarPage.tsx` (51 lignes)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:187` : تم حذف التصريح بنجاح
- `src/pages/hr/MyAttendanceCalendarPage.tsx:193` : تعذر حذف التصريح
- `src/pages/hr/MyAttendanceCalendarPage.tsx:194` : تعذر حذف التصريح
- `src/pages/hr/MyAttendanceCalendarPage.tsx:307` : سجل حضور شخصي - ${profilePersonnel.nom} ${profilePersonnel.prenom}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:342` : كشف حضور شهري شخصي - ${profilePersonnel.nom} ${profilePersonnel.prenom}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:384` : حصيلة الحضور السنوية الشخصية - ${profilePersonnel.nom} ${profilePersonnel.prenom}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:398` : جاري تحميل بيانات التقويم الشخصي...
- `src/pages/hr/MyAttendanceCalendarPage.tsx:412` : تقويم الحضور الشخصي (Mon Calendrier)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:416` : لا توجد بطاقة موظف مرتبطة بحسابك الحالي في الموارد البشرية.
- `src/pages/hr/MyAttendanceCalendarPage.tsx:419` : يرجى التواصل مع إدارة الموارد البشرية أو مسؤول النظام لربط حسابك ببطاقتك المهنية لتتمكن من متابعة حضورك ورصيد إجازاتك.
- `src/pages/hr/MyAttendanceCalendarPage.tsx:428` : إعادة المحاولة
- `src/pages/hr/MyAttendanceCalendarPage.tsx:445` : لوحة التحكم
- `src/pages/hr/MyAttendanceCalendarPage.tsx:449` : ملفي الشخصي
- `src/pages/hr/MyAttendanceCalendarPage.tsx:452` : تقويم حضوري
- `src/pages/hr/MyAttendanceCalendarPage.tsx:461` : حضوري — تقويم وسجل الحضور الشخصي
- `src/pages/hr/MyAttendanceCalendarPage.tsx:464` : متابعة حالة الحضور اليومي، فترات التكوين، المهمات، ورصيد الإجازات السنوية
- `src/pages/hr/MyAttendanceCalendarPage.tsx:476` : تصريح بالحضور / الغياب
- `src/pages/hr/MyAttendanceCalendarPage.tsx:490` : جاري التصدير... | تصدير PDF
- `src/pages/hr/MyAttendanceCalendarPage.tsx:502` : تحديث البيانات
- `src/pages/hr/MyAttendanceCalendarPage.tsx:527` : يوم (Jour)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:539` : أسبوع (Semaine)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:551` : شهر (Mois)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:563` : سنة (Année)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:570` : معاينة اليوم : ${selectedDate}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:571` : معاينة الأسبوع
- `src/pages/hr/MyAttendanceCalendarPage.tsx:572` : شهر ${currentMonth} / سنة ${currentYear}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:573` : سنة ${currentYear}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:635` : تصاريحي السابقة والمعلقة (بياناتي)
- `src/pages/hr/MyAttendanceCalendarPage.tsx:638` : {myDeclarations.filter((d) => d.validationStatus === 'en_attente').length} في انتظار الموافقة
- `src/pages/hr/MyAttendanceCalendarPage.tsx:643` : متابعة حالة تصاريح الحضور أو الغياب أو المأموريات التي قدمتها للإدارة.
- `src/pages/hr/MyAttendanceCalendarPage.tsx:653` : تقديم تصريح جديد
- `src/pages/hr/MyAttendanceCalendarPage.tsx:660` : جاري تحميل التصاريح...
- `src/pages/hr/MyAttendanceCalendarPage.tsx:665` : لم تقدم أي تصريح مسبق حتى الآن
- `src/pages/hr/MyAttendanceCalendarPage.tsx:667` : تصريح بالحضور / الغياب
- `src/pages/hr/MyAttendanceCalendarPage.tsx:675` : التاريخ المعني
- `src/pages/hr/MyAttendanceCalendarPage.tsx:676` : نوع التصريح / السبب
- `src/pages/hr/MyAttendanceCalendarPage.tsx:677` : التفاصيل المقدمة
- `src/pages/hr/MyAttendanceCalendarPage.tsx:678` : حالة المراجعة
- `src/pages/hr/MyAttendanceCalendarPage.tsx:679` : إلغاء الطلب
- `src/pages/hr/MyAttendanceCalendarPage.tsx:699` : حاضر {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:706` : غياب مبرر
- `src/pages/hr/MyAttendanceCalendarPage.tsx:714` : المصلحة: {decl.detailsMotif.nomService}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:717` : المكان: {decl.detailsMotif.lieuMission}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:723` : سبب الرفض: {decl.rejectionReason}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:726` : ملاحظة الإدارة: {decl.adminComment}
- `src/pages/hr/MyAttendanceCalendarPage.tsx:734` : قيد المراجعة
- `src/pages/hr/MyAttendanceCalendarPage.tsx:740` : مقبول ومعتمد
- `src/pages/hr/MyAttendanceCalendarPage.tsx:746` : مرفوض
- `src/pages/hr/MyAttendanceCalendarPage.tsx:751` : تم التعديل والاعتماد
- `src/pages/hr/MyAttendanceCalendarPage.tsx:762` : إلغاء التصريح
- `src/pages/hr/MyAttendanceCalendarPage.tsx:765` : إلغاء

#### `src/pages/hr/MyProfilePage.tsx` (30 lignes)
- `src/pages/hr/MyProfilePage.tsx:82` : تم إنشاء وتحميل بطاقة الإرشادات بنجاح
- `src/pages/hr/MyProfilePage.tsx:84` : Erreur génération بطاقة إرشادات:
- `src/pages/hr/MyProfilePage.tsx:85` : حدث خطأ أثناء إنشاء بطاقة الإرشادات
- `src/pages/hr/MyProfilePage.tsx:117` : جاري تحميل ملفك الشخصي...
- `src/pages/hr/MyProfilePage.tsx:134` : ملفي الشخصي (Mon Profil)
- `src/pages/hr/MyProfilePage.tsx:141` : لا توجد أي بطاقة موظف مرتبطة بحسابك الحالي في قسم الموارد البشرية. إذا كنت بحاجة إلى ربط حسابك، يرجى التواصل مع مسؤول النظام أو إدارة الموارد البشرية.
- `src/pages/hr/MyProfilePage.tsx:150` : تحديث الصفحة
- `src/pages/hr/MyProfilePage.tsx:186` : وضع القراءة فقط
- `src/pages/hr/MyProfilePage.tsx:192` : رقم ب.ت.و: {personnel.cin}
- `src/pages/hr/MyProfilePage.tsx:197` : الوظيفة: {personnel.poste}
- `src/pages/hr/MyProfilePage.tsx:202` : القسم: {departmentDisplayName}
- `src/pages/hr/MyProfilePage.tsx:221` : بطاقة إرشادات
- `src/pages/hr/MyProfilePage.tsx:230` : عرض تقويم حضوري
- `src/pages/hr/MyProfilePage.tsx:243` : المعلومات الشخصية
- `src/pages/hr/MyProfilePage.tsx:248` : اللقب
- `src/pages/hr/MyProfilePage.tsx:253` : الاسم
- `src/pages/hr/MyProfilePage.tsx:258` : الجنس
- `src/pages/hr/MyProfilePage.tsx:260` : ذكر | أنثى
- `src/pages/hr/MyProfilePage.tsx:265` : رقم ب.ت.و (CIN)
- `src/pages/hr/MyProfilePage.tsx:270` : تاريخ الازدياد
- `src/pages/hr/MyProfilePage.tsx:277` : مكان الازدياد
- `src/pages/hr/MyProfilePage.tsx:282` : العنوان الشخصي
- `src/pages/hr/MyProfilePage.tsx:290` : رقم الهاتف
- `src/pages/hr/MyProfilePage.tsx:298` : البريد الإلكتروني الشخصي
- `src/pages/hr/MyProfilePage.tsx:311` : المعلومات المهنية والإدارية
- `src/pages/hr/MyProfilePage.tsx:316` : الوظيفة / المنصب
- `src/pages/hr/MyProfilePage.tsx:321` : القسم الرئيسي
- `src/pages/hr/MyProfilePage.tsx:329` : تاريخ التعيين أو الالتحاق
- `src/pages/hr/MyProfilePage.tsx:339` : تاريخ إنشاء البطاقة
- `src/pages/hr/MyProfilePage.tsx:349` : ملاحظات إدارية

#### `src/pages/hr/PersonnelDetailPage.tsx` (146 lignes)
- `src/pages/hr/PersonnelDetailPage.tsx:162` : تم حذف التربص بنجاح
- `src/pages/hr/PersonnelDetailPage.tsx:166` : تعذر حذف التربص
- `src/pages/hr/PersonnelDetailPage.tsx:180` : تم الحذف بنجاح
- `src/pages/hr/PersonnelDetailPage.tsx:184` : تعذر إتمام عملية الحذف
- `src/pages/hr/PersonnelDetailPage.tsx:193` : تم إنشاء وتحميل بطاقة الإرشادات بنجاح
- `src/pages/hr/PersonnelDetailPage.tsx:195` : Erreur génération بطاقة إرشادات:
- `src/pages/hr/PersonnelDetailPage.tsx:196` : حدث خطأ أثناء إنشاء ملف PDF
- `src/pages/hr/PersonnelDetailPage.tsx:207` : جاري تحميل بطاقة الموظف...
- `src/pages/hr/PersonnelDetailPage.tsx:218` : بطاقة الموظف غير موجودة
- `src/pages/hr/PersonnelDetailPage.tsx:220` : تعذر العثور على البطاقة المطلوبة أو تم حذفها.
- `src/pages/hr/PersonnelDetailPage.tsx:226` : العودة إلى قائمة الموظفين
- `src/pages/hr/PersonnelDetailPage.tsx:265` : المعرف الوحيد: {personnel.matricule}
- `src/pages/hr/PersonnelDetailPage.tsx:270` : ب.ت.و: {personnel.cin}
- `src/pages/hr/PersonnelDetailPage.tsx:275` : الخطة: {personnel.poste}
- `src/pages/hr/PersonnelDetailPage.tsx:280` : القسم: {departmentObj.name}
- `src/pages/hr/PersonnelDetailPage.tsx:294` : العودة للقائمة
- `src/pages/hr/PersonnelDetailPage.tsx:308` : بطاقة إرشادات
- `src/pages/hr/PersonnelDetailPage.tsx:316` : تعديل البطاقة
- `src/pages/hr/PersonnelDetailPage.tsx:327` : المعلومات الشخصية
- `src/pages/hr/PersonnelDetailPage.tsx:332` : اللقب
- `src/pages/hr/PersonnelDetailPage.tsx:337` : الاسم
- `src/pages/hr/PersonnelDetailPage.tsx:342` : تاريخ الولادة
- `src/pages/hr/PersonnelDetailPage.tsx:349` : مكان الولادة
- `src/pages/hr/PersonnelDetailPage.tsx:354` : الجنس
- `src/pages/hr/PersonnelDetailPage.tsx:356` : ذكر | أنثى
- `src/pages/hr/PersonnelDetailPage.tsx:361` : الحالة المدنية
- `src/pages/hr/PersonnelDetailPage.tsx:364` : أعزب / عزباء
- `src/pages/hr/PersonnelDetailPage.tsx:366` : متزوج(ة)
- `src/pages/hr/PersonnelDetailPage.tsx:368` : مطلق(ة)
- `src/pages/hr/PersonnelDetailPage.tsx:370` : أرمل(ة)
- `src/pages/hr/PersonnelDetailPage.tsx:376` : رقم ب.ت.و
- `src/pages/hr/PersonnelDetailPage.tsx:381` : عدد الأبناء
- `src/pages/hr/PersonnelDetailPage.tsx:386` : العنوان
- `src/pages/hr/PersonnelDetailPage.tsx:394` : الهاتف الشخصي
- `src/pages/hr/PersonnelDetailPage.tsx:402` : البريد الإلكتروني
- `src/pages/hr/PersonnelDetailPage.tsx:415` : المعلومات المهنية والإدارية
- `src/pages/hr/PersonnelDetailPage.tsx:420` : المعرف الوحيد
- `src/pages/hr/PersonnelDetailPage.tsx:425` : الرتبة
- `src/pages/hr/PersonnelDetailPage.tsx:430` : الخطة الوظيفية
- `src/pages/hr/PersonnelDetailPage.tsx:435` : الصنف
- `src/pages/hr/PersonnelDetailPage.tsx:440` : الدرجة
- `src/pages/hr/PersonnelDetailPage.tsx:445` : القسم الفعلي
- `src/pages/hr/PersonnelDetailPage.tsx:452` : تاريخ الانتداب
- `src/pages/hr/PersonnelDetailPage.tsx:459` : تاريخ الترسيم
- `src/pages/hr/PersonnelDetailPage.tsx:466` : تاريخ نهاية الخدمة
- `src/pages/hr/PersonnelDetailPage.tsx:473` : الحالة المهنية
- `src/pages/hr/PersonnelDetailPage.tsx:481` : حساب المستخدم المرتبط بالنظام
- `src/pages/hr/PersonnelDetailPage.tsx:493` : لا يوجد حساب مستخدم مرتبط بهذه البطاقة
- `src/pages/hr/PersonnelDetailPage.tsx:506` : ملاحظات إدارية
- `src/pages/hr/PersonnelDetailPage.tsx:528` : سجل المسار الإداري والتكويني
- `src/pages/hr/PersonnelDetailPage.tsx:531` : سجل التربصات، الترقيات، الخطط الوظيفية، الشهادات العلمية، والعقوبات التأديبية
- `src/pages/hr/PersonnelDetailPage.tsx:542` : التربصات
- `src/pages/hr/PersonnelDetailPage.tsx:553` : الترقيات
- `src/pages/hr/PersonnelDetailPage.tsx:564` : الخطط
- `src/pages/hr/PersonnelDetailPage.tsx:575` : الشهادات
- `src/pages/hr/PersonnelDetailPage.tsx:586` : العقوبات
- `src/pages/hr/PersonnelDetailPage.tsx:602` : سجل الدورات التكوينية والتربصات المنجزة داخل تونس وبالخارج ({totalStages})
- `src/pages/hr/PersonnelDetailPage.tsx:614` : إضافة تربص
- `src/pages/hr/PersonnelDetailPage.tsx:624` : التربصات بتونس
- `src/pages/hr/PersonnelDetailPage.tsx:633` : لا توجد تربصات مسجلة داخل تونس لهذا الموظف
- `src/pages/hr/PersonnelDetailPage.tsx:641` : موضوع التربص
- `src/pages/hr/PersonnelDetailPage.tsx:642` : مكان التربص
- `src/pages/hr/PersonnelDetailPage.tsx:643` : بداية
- `src/pages/hr/PersonnelDetailPage.tsx:644` : إلى
- `src/pages/hr/PersonnelDetailPage.tsx:645` : المدة
- `src/pages/hr/PersonnelDetailPage.tsx:646` : النتيجة
- `src/pages/hr/PersonnelDetailPage.tsx:648` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:660` : ${st.duree} يوم
- `src/pages/hr/PersonnelDetailPage.tsx:663` : ناجح
- `src/pages/hr/PersonnelDetailPage.tsx:665` : راسب
- `src/pages/hr/PersonnelDetailPage.tsx:667` : في الانتظار
- `src/pages/hr/PersonnelDetailPage.tsx:683` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:692` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:712` : التربصات بالخارج
- `src/pages/hr/PersonnelDetailPage.tsx:721` : لا توجد تربصات مسجلة بالخارج لهذا الموظف
- `src/pages/hr/PersonnelDetailPage.tsx:729` : موضوع التربص
- `src/pages/hr/PersonnelDetailPage.tsx:730` : المكان / الدولة
- `src/pages/hr/PersonnelDetailPage.tsx:731` : بداية
- `src/pages/hr/PersonnelDetailPage.tsx:732` : إلى
- `src/pages/hr/PersonnelDetailPage.tsx:733` : المدة
- `src/pages/hr/PersonnelDetailPage.tsx:734` : النتيجة
- `src/pages/hr/PersonnelDetailPage.tsx:736` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:750` : ${st.duree} يوم
- `src/pages/hr/PersonnelDetailPage.tsx:753` : ناجح
- `src/pages/hr/PersonnelDetailPage.tsx:755` : راسب
- `src/pages/hr/PersonnelDetailPage.tsx:757` : في الانتظار
- `src/pages/hr/PersonnelDetailPage.tsx:773` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:782` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:806` : سجل الترقيات الإدارية وتغييرات الرتب ({promotions.length})
- `src/pages/hr/PersonnelDetailPage.tsx:818` : إضافة ترقية
- `src/pages/hr/PersonnelDetailPage.tsx:825` : لا توجد ترقيات مسجلة لهذا الموظف حتى الآن
- `src/pages/hr/PersonnelDetailPage.tsx:833` : الرتبة السابقة
- `src/pages/hr/PersonnelDetailPage.tsx:834` : الرتبة الجديدة
- `src/pages/hr/PersonnelDetailPage.tsx:835` : تاريخ الترقية
- `src/pages/hr/PersonnelDetailPage.tsx:836` : المرجع / القرار
- `src/pages/hr/PersonnelDetailPage.tsx:837` : السبب / الملاحظات
- `src/pages/hr/PersonnelDetailPage.tsx:839` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:873` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:884` : ترقية إلى رتبة: ${item.gradeNouveau}
- `src/pages/hr/PersonnelDetailPage.tsx:888` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:911` : سجل الخطط الوظيفية والتكليفات الإدارية ({postes.length})
- `src/pages/hr/PersonnelDetailPage.tsx:923` : إضافة خطة
- `src/pages/hr/PersonnelDetailPage.tsx:930` : لا توجد خطط أو تكليفات وظيفية مسجلة لهذا الموظف حتى الآن
- `src/pages/hr/PersonnelDetailPage.tsx:938` : الخطة الوظيفية
- `src/pages/hr/PersonnelDetailPage.tsx:939` : تاريخ التعيين
- `src/pages/hr/PersonnelDetailPage.tsx:940` : تاريخ الانتهاء
- `src/pages/hr/PersonnelDetailPage.tsx:941` : المرجع
- `src/pages/hr/PersonnelDetailPage.tsx:942` : مكان العمل / الإدارة
- `src/pages/hr/PersonnelDetailPage.tsx:944` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:961` : إلى حد الآن
- `src/pages/hr/PersonnelDetailPage.tsx:982` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:993` : خطة وظيفية: ${item.poste}
- `src/pages/hr/PersonnelDetailPage.tsx:997` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:1020` : سجل الشهادات والمؤهلات العلمية والتكوينية ({diplomes.length})
- `src/pages/hr/PersonnelDetailPage.tsx:1032` : إضافة شهادة
- `src/pages/hr/PersonnelDetailPage.tsx:1039` : لا توجد شهادات علمية أو مهنية مسجلة لهذا الموظف حتى الآن
- `src/pages/hr/PersonnelDetailPage.tsx:1047` : نوع الشهادة
- `src/pages/hr/PersonnelDetailPage.tsx:1048` : موضوع / اختصاص الشهادة
- `src/pages/hr/PersonnelDetailPage.tsx:1049` : تاريخ الشهادة
- `src/pages/hr/PersonnelDetailPage.tsx:1050` : المرجع
- `src/pages/hr/PersonnelDetailPage.tsx:1051` : المؤسسة المانحة / المستوى
- `src/pages/hr/PersonnelDetailPage.tsx:1053` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:1089` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:1100` : شهادة: ${item.typeDiplome} - ${item.sujetDiplome}
- `src/pages/hr/PersonnelDetailPage.tsx:1104` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:1127` : سجل العقوبات والإجراءات التأديبية ({sanctions.length})
- `src/pages/hr/PersonnelDetailPage.tsx:1139` : إضافة عقوبة
- `src/pages/hr/PersonnelDetailPage.tsx:1146` : لا توجد أي عقوبات أو تتبعات تأديبية مسجلة لهذا الموظف
- `src/pages/hr/PersonnelDetailPage.tsx:1154` : تاريخ العقوبة
- `src/pages/hr/PersonnelDetailPage.tsx:1155` : عدد الأيام
- `src/pages/hr/PersonnelDetailPage.tsx:1156` : السبب
- `src/pages/hr/PersonnelDetailPage.tsx:1157` : نوع العقوبة
- `src/pages/hr/PersonnelDetailPage.tsx:1158` : المرجع
- `src/pages/hr/PersonnelDetailPage.tsx:1160` : الإجراءات
- `src/pages/hr/PersonnelDetailPage.tsx:1172` : ${item.nombreJours} يوم
- `src/pages/hr/PersonnelDetailPage.tsx:1194` : تعديل
- `src/pages/hr/PersonnelDetailPage.tsx:1205` : عقوبة: ${item.raison}
- `src/pages/hr/PersonnelDetailPage.tsx:1209` : حذف
- `src/pages/hr/PersonnelDetailPage.tsx:1271` : تأكيد حذف التربص
- `src/pages/hr/PersonnelDetailPage.tsx:1274` : هل أنت متأكد من حذف هذا التربص من سجل الموظف؟
- `src/pages/hr/PersonnelDetailPage.tsx:1283` : إلغاء
- `src/pages/hr/PersonnelDetailPage.tsx:1288` : تأكيد الحذف
- `src/pages/hr/PersonnelDetailPage.tsx:1302` : تأكيد الحذف
- `src/pages/hr/PersonnelDetailPage.tsx:1305` : هل أنت متأكد من حذف هذا السجل نهائياً؟
- `src/pages/hr/PersonnelDetailPage.tsx:1314` : إلغاء
- `src/pages/hr/PersonnelDetailPage.tsx:1325` : تأكيد الحذف

#### `src/pages/hr/PersonnelFormPage.tsx` (15 lignes)
- `src/pages/hr/PersonnelFormPage.tsx:48` : تم تعديل بيانات الموظف وتحديث الصورة بنجاح
- `src/pages/hr/PersonnelFormPage.tsx:51` : تم تعديل بيانات الموظف، لكن تعذر رفع الصورة. يمكنك المحاولة مجددًا.
- `src/pages/hr/PersonnelFormPage.tsx:56` : تم تعديل بيانات الموظف بنجاح
- `src/pages/hr/PersonnelFormPage.tsx:65` : تعذر تعديل بيانات الموظف
- `src/pages/hr/PersonnelFormPage.tsx:80` : تم تسجيل بطاقة الموظف ورفع الصورة بنجاح
- `src/pages/hr/PersonnelFormPage.tsx:83` : تم تسجيل بطاقة الموظف، لكن تعذر رفع الصورة. يمكنك المحاولة مجددًا من شاشة التعديل.
- `src/pages/hr/PersonnelFormPage.tsx:88` : تمت إضافة الموظف بنجاح
- `src/pages/hr/PersonnelFormPage.tsx:100` : تعذر تسجيل بيانات الموظف
- `src/pages/hr/PersonnelFormPage.tsx:125` : تعديل بطاقة موظف | إضافة موظف جديد
- `src/pages/hr/PersonnelFormPage.tsx:129` : تحديث المعلومات الخاصة بالموظف ${initialData?.nom ||
- `src/pages/hr/PersonnelFormPage.tsx:130` : تسجيل بطاقة موظف جديدة في منظومة الموارد البشرية
- `src/pages/hr/PersonnelFormPage.tsx:141` : العودة إلى القائمة
- `src/pages/hr/PersonnelFormPage.tsx:150` : جاري تحميل بيانات الموظف...
- `src/pages/hr/PersonnelFormPage.tsx:155` : تعذر العثور على بطاقة الموظف المحددة
- `src/pages/hr/PersonnelFormPage.tsx:161` : الرجوع إلى القائمة

#### `src/pages/hr/RHStagesPage.tsx` (83 lignes)
- `src/pages/hr/RHStagesPage.tsx:139` : تم حذف التربص بنجاح
- `src/pages/hr/RHStagesPage.tsx:147` : تعذر حذف التربص
- `src/pages/hr/RHStagesPage.tsx:185` : مكتمل
- `src/pages/hr/RHStagesPage.tsx:187` : قيد الإنجاز
- `src/pages/hr/RHStagesPage.tsx:189` : مسجل
- `src/pages/hr/RHStagesPage.tsx:191` : معلق
- `src/pages/hr/RHStagesPage.tsx:193` : ملغى / منسحب
- `src/pages/hr/RHStagesPage.tsx:203` : ناجح
- `src/pages/hr/RHStagesPage.tsx:205` : راسب
- `src/pages/hr/RHStagesPage.tsx:207` : في الانتظار
- `src/pages/hr/RHStagesPage.tsx:224` : الموارد البشرية
- `src/pages/hr/RHStagesPage.tsx:226` : التربصات والتكوين
- `src/pages/hr/RHStagesPage.tsx:230` : جميع التربصات
- `src/pages/hr/RHStagesPage.tsx:233` : عرض شامل
- `src/pages/hr/RHStagesPage.tsx:237` : عرض وإدارة تربصات جميع الموظفين (بتونس وبالخارج)
- `src/pages/hr/RHStagesPage.tsx:252` : تحديث
- `src/pages/hr/RHStagesPage.tsx:261` : إضافة تربص جديد
- `src/pages/hr/RHStagesPage.tsx:271` : عرض شامل لجميع التربصات
- `src/pages/hr/RHStagesPage.tsx:273` : هذه الصفحة تعرض تربصات جميع الموظفين لإتاحة نظرة شاملة
- `src/pages/hr/RHStagesPage.tsx:274` : وإحصائيات. لإضافة تربص لموظف معين أو الاطلاع على مساره
- `src/pages/hr/RHStagesPage.tsx:275` : الكامل، افتح ملفه الشخصي وانتقل إلى تبويب &quot;تربصات هذا الموظف&quot;.
- `src/pages/hr/RHStagesPage.tsx:284` : إجمالي التربصات
- `src/pages/hr/RHStagesPage.tsx:288` : التربصات بتونس
- `src/pages/hr/RHStagesPage.tsx:294` : التربصات بالخارج
- `src/pages/hr/RHStagesPage.tsx:300` : الناجحون والمؤهلون
- `src/pages/hr/RHStagesPage.tsx:313` : البحث والتصفية
- `src/pages/hr/RHStagesPage.tsx:323` : إلغاء التصفيات
- `src/pages/hr/RHStagesPage.tsx:338` : البحث بالموضوع أو المكان...
- `src/pages/hr/RHStagesPage.tsx:353` : نطاق التربص
- `src/pages/hr/RHStagesPage.tsx:356` : جميع النطاقات (تونس والخارج)
- `src/pages/hr/RHStagesPage.tsx:357` : داخل تونس
- `src/pages/hr/RHStagesPage.tsx:358` : بالخارج
- `src/pages/hr/RHStagesPage.tsx:373` : حالة التربص
- `src/pages/hr/RHStagesPage.tsx:376` : جميع الحالات
- `src/pages/hr/RHStagesPage.tsx:377` : مكتمل
- `src/pages/hr/RHStagesPage.tsx:378` : قيد الإنجاز
- `src/pages/hr/RHStagesPage.tsx:379` : مسجل
- `src/pages/hr/RHStagesPage.tsx:380` : معلق
- `src/pages/hr/RHStagesPage.tsx:381` : ملغى / منسحب
- `src/pages/hr/RHStagesPage.tsx:396` : السنة
- `src/pages/hr/RHStagesPage.tsx:399` : جميع السنوات
- `src/pages/hr/RHStagesPage.tsx:416` : جاري تحميل سجل التربصات...
- `src/pages/hr/RHStagesPage.tsx:421` : لا توجد تربصات مسجلة
- `src/pages/hr/RHStagesPage.tsx:423` : لم يتم العثور على أي تربص يطابق معايير البحث الحالية.
- `src/pages/hr/RHStagesPage.tsx:430` : إضافة تربص جديد
- `src/pages/hr/RHStagesPage.tsx:440` : الموظف
- `src/pages/hr/RHStagesPage.tsx:443` : موضوع التربص
- `src/pages/hr/RHStagesPage.tsx:446` : مكان التربص / الدولة
- `src/pages/hr/RHStagesPage.tsx:449` : الفترة
- `src/pages/hr/RHStagesPage.tsx:452` : المدة
- `src/pages/hr/RHStagesPage.tsx:455` : الحالة
- `src/pages/hr/RHStagesPage.tsx:458` : النتيجة
- `src/pages/hr/RHStagesPage.tsx:461` : الإجراءات
- `src/pages/hr/RHStagesPage.tsx:477` : ب.ت.و: {personnel.cin}
- `src/pages/hr/RHStagesPage.tsx:489` : رقم الإرسالية: {stage.numeroRoute}
- `src/pages/hr/RHStagesPage.tsx:505` : الدولة: ${stage.pays} | تونس
- `src/pages/hr/RHStagesPage.tsx:511` : من: {formatArabicDate(stage.dateDebut)}
- `src/pages/hr/RHStagesPage.tsx:512` : إلى: {formatArabicDate(stage.dateFin)}
- `src/pages/hr/RHStagesPage.tsx:517` : ${stage.duree} يوم
- `src/pages/hr/RHStagesPage.tsx:538` : عرض التفاصيل
- `src/pages/hr/RHStagesPage.tsx:550` : تعديل
- `src/pages/hr/RHStagesPage.tsx:560` : حذف
- `src/pages/hr/RHStagesPage.tsx:580` : إجمالي النتائج: {pagination.total} (الصفحة {pagination.page} من {pagination.pages})
- `src/pages/hr/RHStagesPage.tsx:591` : السابق
- `src/pages/hr/RHStagesPage.tsx:600` : التالي
- `src/pages/hr/RHStagesPage.tsx:621` : تفاصيل التربص
- `src/pages/hr/RHStagesPage.tsx:628` : الموظف
- `src/pages/hr/RHStagesPage.tsx:638` : موضوع التربص
- `src/pages/hr/RHStagesPage.tsx:642` : المكان / الدولة
- `src/pages/hr/RHStagesPage.tsx:644` : (تونس)
- `src/pages/hr/RHStagesPage.tsx:651` : الفترة
- `src/pages/hr/RHStagesPage.tsx:653` : {formatArabicDate(stageToView.dateDebut)} إلى {formatArabicDate(stageToView.dateFin)}
- `src/pages/hr/RHStagesPage.tsx:657` : المدة المحتسبة
- `src/pages/hr/RHStagesPage.tsx:658` : {stageToView.duree || 0} يوم
- `src/pages/hr/RHStagesPage.tsx:664` : الحالة
- `src/pages/hr/RHStagesPage.tsx:668` : النتيجة
- `src/pages/hr/RHStagesPage.tsx:672` : الملاحظة / التقدير
- `src/pages/hr/RHStagesPage.tsx:679` : رقم الإرسالية (Route)
- `src/pages/hr/RHStagesPage.tsx:686` : ملاحظات
- `src/pages/hr/RHStagesPage.tsx:703` : تأكيد حذف التربص
- `src/pages/hr/RHStagesPage.tsx:706` : هل أنت متأكد من حذف هذا التربص نهائياً من سجل الموظف؟
- `src/pages/hr/RHStagesPage.tsx:715` : إلغاء
- `src/pages/hr/RHStagesPage.tsx:720` : تأكيد الحذف

#### `src/pages/organization/OrganizationChartPage.tsx` (18 lignes)
- `src/pages/organization/OrganizationChartPage.tsx:68` : الإدارة
- `src/pages/organization/OrganizationChartPage.tsx:182` : الهيكل التنظيمي للإدارة
- `src/pages/organization/OrganizationChartPage.tsx:184` : هيكل تراتبي هرمي تفاعلي (الإدارة العامة ← المصالح السيادية ← المصالح والدوائر العملياتية)
- `src/pages/organization/OrganizationChartPage.tsx:193` : تحديث البيانات
- `src/pages/organization/OrganizationChartPage.tsx:196` : تحديث
- `src/pages/organization/OrganizationChartPage.tsx:204` : العودة
- `src/pages/organization/OrganizationChartPage.tsx:213` : جاري تحميل الهيكل التنظيمي...
- `src/pages/organization/OrganizationChartPage.tsx:223` : تعذر تحميل الهيكل التنظيمي
- `src/pages/organization/OrganizationChartPage.tsx:225` : حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.
- `src/pages/organization/OrganizationChartPage.tsx:229` : إعادة المحاولة
- `src/pages/organization/OrganizationChartPage.tsx:240` : لا توجد أقسام مسجلة
- `src/pages/organization/OrganizationChartPage.tsx:242` : لم يتم العثور على أقسام نشطة في النظام لعرضها ضمن الهيكل التنظيمي.
- `src/pages/organization/OrganizationChartPage.tsx:290` : دليل المستويات والوحدات الإدارية
- `src/pages/organization/OrganizationChartPage.tsx:296` : إخفاء | عرض الدليل
- `src/pages/organization/OrganizationChartPage.tsx:306` : المستوى 1 : المدير (مدير الإدارة)
- `src/pages/organization/OrganizationChartPage.tsx:310` : >مكتب الضبط (Bureau d | مكتب الضبط (Bureau d'Ordre)
- `src/pages/organization/OrganizationChartPage.tsx:314` : الموارد البشرية (RH)
- `src/pages/organization/OrganizationChartPage.tsx:318` : المستوى 3 : الأقسام والمصالح العملياتية

#### `src/pages/settings/BackupSettingsPage.tsx` (121 lignes)
- `src/pages/settings/BackupSettingsPage.tsx:118` : خطأ غير معروف
- `src/pages/settings/BackupSettingsPage.tsx:124` : ✅ تم إعادة تحميل الجدول الزمني
- `src/pages/settings/BackupSettingsPage.tsx:126` : ❌ خطأ
- `src/pages/settings/BackupSettingsPage.tsx:140` : ✅ تمت الاستعادة بنجاح
- `src/pages/settings/BackupSettingsPage.tsx:146` : ❌ فشل الاستعادة
- `src/pages/settings/BackupSettingsPage.tsx:155` : ✅ بدأ التحميل
- `src/pages/settings/BackupSettingsPage.tsx:157` : ❌ فشل التحميل
- `src/pages/settings/BackupSettingsPage.tsx:172` : ✅ تم الحذف
- `src/pages/settings/BackupSettingsPage.tsx:176` : ❌ فشل الحذف
- `src/pages/settings/BackupSettingsPage.tsx:193` : مكتمل
- `src/pages/settings/BackupSettingsPage.tsx:195` : فشل
- `src/pages/settings/BackupSettingsPage.tsx:196` : جاري
- `src/pages/settings/BackupSettingsPage.tsx:201` : تلقائي
- `src/pages/settings/BackupSettingsPage.tsx:202` : يدوي
- `src/pages/settings/BackupSettingsPage.tsx:221` : خطأ
- `src/pages/settings/BackupSettingsPage.tsx:222` : خطأ في تحميل بيانات النسخ الاحتياطي
- `src/pages/settings/BackupSettingsPage.tsx:241` : نجح
- `src/pages/settings/BackupSettingsPage.tsx:242` : تم حفظ المسار الافتراضي بنجاح
- `src/pages/settings/BackupSettingsPage.tsx:251` : نجح
- `src/pages/settings/BackupSettingsPage.tsx:252` : تم حفظ إعدادات النسخ الاحتياطي بنجاح
- `src/pages/settings/BackupSettingsPage.tsx:255` : خطأ
- `src/pages/settings/BackupSettingsPage.tsx:256` : خطأ في حفظ الإعدادات
- `src/pages/settings/BackupSettingsPage.tsx:289` : تم إنشاء النسخة الاحتياطية لعام ${selectedYear} بنجاح
- `src/pages/settings/BackupSettingsPage.tsx:290` : تم إنشاء النسخة الاحتياطية بنجاح
- `src/pages/settings/BackupSettingsPage.tsx:292` : ${successMessage} - المحفوظة في: ${actualPath}
- `src/pages/settings/BackupSettingsPage.tsx:295` : نجح
- `src/pages/settings/BackupSettingsPage.tsx:303` : خطأ
- `src/pages/settings/BackupSettingsPage.tsx:304` : خطأ في إنشاء النسخة الاحتياطية: ${status.errorMessage ||
- `src/pages/settings/BackupSettingsPage.tsx:313` : خطأ
- `src/pages/settings/BackupSettingsPage.tsx:314` : خطأ في متابعة حالة النسخة الاحتياطية
- `src/pages/settings/BackupSettingsPage.tsx:321` : خطأ
- `src/pages/settings/BackupSettingsPage.tsx:322` : خطأ في إنشاء النسخة الاحتياطية
- `src/pages/settings/BackupSettingsPage.tsx:331` : يومياً
- `src/pages/settings/BackupSettingsPage.tsx:332` : أسبوعياً
- `src/pages/settings/BackupSettingsPage.tsx:333` : شهرياً
- `src/pages/settings/BackupSettingsPage.tsx:343` : جاري تحميل بيانات النسخ الاحتياطي...
- `src/pages/settings/BackupSettingsPage.tsx:369` : النسخ الاحتياطي وأرشفة البيانات
- `src/pages/settings/BackupSettingsPage.tsx:371` : أرشيف الوثائق
- `src/pages/settings/BackupSettingsPage.tsx:375` : إدارة وحماية الوثائق الواردة والصادرة مع ملفات PDF والمرفقات
- `src/pages/settings/BackupSettingsPage.tsx:387` : تحديث الإحصائيات
- `src/pages/settings/BackupSettingsPage.tsx:399` : إحصائيات البيانات المتوفرة للأرشفة
- `src/pages/settings/BackupSettingsPage.tsx:402` : نظرة تفصيلية على حجم الوثائق والمراسلات المتاحة للنسخ الاحتياطي
- `src/pages/settings/BackupSettingsPage.tsx:412` : الوثائق الواردة
- `src/pages/settings/BackupSettingsPage.tsx:420` : الوثائق الصادرة
- `src/pages/settings/BackupSettingsPage.tsx:428` : إجمالي حجم البيانات
- `src/pages/settings/BackupSettingsPage.tsx:436` : لا توجد بعد
- `src/pages/settings/BackupSettingsPage.tsx:438` : آخر نسخة احتياطية
- `src/pages/settings/BackupSettingsPage.tsx:447` : إحصائيات الوثائق المضافة مؤخراً
- `src/pages/settings/BackupSettingsPage.tsx:451` : اليوم: {stats.documentsCreatedToday}
- `src/pages/settings/BackupSettingsPage.tsx:454` : هذا الأسبوع: {stats.documentsCreatedThisWeek}
- `src/pages/settings/BackupSettingsPage.tsx:457` : هذا الشهر: {stats.documentsCreatedThisMonth}
- `src/pages/settings/BackupSettingsPage.tsx:472` : إنشاء نسخة احتياطية يدوية
- `src/pages/settings/BackupSettingsPage.tsx:475` : إنشاء وتصدير نسخة احتياطية فورية من جميع الوثائق مع ملفات PDF
- `src/pages/settings/BackupSettingsPage.tsx:485` : جاري إنشاء النسخة الاحتياطية...
- `src/pages/settings/BackupSettingsPage.tsx:498` : نسخة احتياطية مخصصة حسب السنة
- `src/pages/settings/BackupSettingsPage.tsx:500` : حصر التصدير لوثائق سنة مالية محددة
- `src/pages/settings/BackupSettingsPage.tsx:513` : السنة المالية المستهدفة
- `src/pages/settings/BackupSettingsPage.tsx:517` : مثال: 2025
- `src/pages/settings/BackupSettingsPage.tsx:528` : مسار مجلد التصدير
- `src/pages/settings/BackupSettingsPage.tsx:551` : المسار الافتراضي المسجل: {savedBackupPath}
- `src/pages/settings/BackupSettingsPage.tsx:560` : مسار مجلد التصدير على الخادم
- `src/pages/settings/BackupSettingsPage.tsx:583` : المسار الافتراضي المسجل: {savedBackupPath}
- `src/pages/settings/BackupSettingsPage.tsx:594` : سيتم إنشاء نسخة احتياطية لوثائق عام ${selectedYear} في مجلد courrier/${selectedYear}/ مع ملفات PDF وبيانات JSON الملحقة.
- `src/pages/settings/BackupSettingsPage.tsx:595` : سيتم تضمين كافة الوثائق الواردة والصادرة مع ملفات PDF والمرفقات في ملف الأرشيف.
- `src/pages/settings/BackupSettingsPage.tsx:604` : آخر نسخة تم إنشاؤها:
- `src/pages/settings/BackupSettingsPage.tsx:617` : جاري الإنشاء...
- `src/pages/settings/BackupSettingsPage.tsx:618` : إنشاء نسخة احتياطية لعام ${selectedYear} | إنشاء نسخة احتياطية الآن
- `src/pages/settings/BackupSettingsPage.tsx:626` : تأكيد إنشاء النسخة الاحتياطية
- `src/pages/settings/BackupSettingsPage.tsx:630` : هل تريد إنشاء وتصدير نسخة احتياطية لوثائق عام ${selectedYear}؟
- `src/pages/settings/BackupSettingsPage.tsx:631` : هل تريد إنشاء نسخة احتياطية شاملة لجميع الوثائق والمرفقات؟
- `src/pages/settings/BackupSettingsPage.tsx:632` : } قد تستغرق هذه العملية عدة دقائق بحسب حجم الملفات المرفقة.
- `src/pages/settings/BackupSettingsPage.tsx:636` : مسار التصدير:
- `src/pages/settings/BackupSettingsPage.tsx:640` : هيكل المجلد:
- `src/pages/settings/BackupSettingsPage.tsx:651` : تأكيد البدء
- `src/pages/settings/BackupSettingsPage.tsx:654` : إلغاء
- `src/pages/settings/BackupSettingsPage.tsx:669` : النسخ الاحتياطي التلقائي المجدول
- `src/pages/settings/BackupSettingsPage.tsx:672` : تكوين جدولة دورية لإنشاء النسخ الاحتياطية تلقائياً مع ملفات PDF
- `src/pages/settings/BackupSettingsPage.tsx:679` : تفعيل النسخ الاحتياطي التلقائي
- `src/pages/settings/BackupSettingsPage.tsx:682` : إنشاء نسخ احتياطية دورية بصورة آلية دون الحاجة لتدخل يدوي
- `src/pages/settings/BackupSettingsPage.tsx:697` : تكرار النسخ الاحتياطي
- `src/pages/settings/BackupSettingsPage.tsx:704` : يومياً (منتصف الليل)
- `src/pages/settings/BackupSettingsPage.tsx:705` : أسبوعياً (نهاية الأسبوع)
- `src/pages/settings/BackupSettingsPage.tsx:706` : شهرياً (أول كل شهر)
- `src/pages/settings/BackupSettingsPage.tsx:712` : مستوى ضغط الملفات
- `src/pages/settings/BackupSettingsPage.tsx:719` : منخفض (سريع)
- `src/pages/settings/BackupSettingsPage.tsx:720` : متوسط (موصى به للأداء المتوازن)
- `src/pages/settings/BackupSettingsPage.tsx:721` : عالي (حجم أصغر على القرص)
- `src/pages/settings/BackupSettingsPage.tsx:731` : تضمين المرفقات والـ PDF
- `src/pages/settings/BackupSettingsPage.tsx:734` : نسخ ملفات المستندات والمرفقات كاملة
- `src/pages/settings/BackupSettingsPage.tsx:745` : فترة الاحتفاظ بالنسخ (بالأيام)
- `src/pages/settings/BackupSettingsPage.tsx:764` : مع المرفقات وملفات PDF | بدون المرفقات
- `src/pages/settings/BackupSettingsPage.tsx:765` : والاحتفاظ بها لمدة {policy.retentionDays} يوم.
- `src/pages/settings/BackupSettingsPage.tsx:775` : جاري الحفظ... | حفظ إعدادات الجدولة
- `src/pages/settings/BackupSettingsPage.tsx:789` : سجل النسخ الاحتياطية
- `src/pages/settings/BackupSettingsPage.tsx:792` : {filteredHistory.length} من أصل {backupHistory.length} نسخة محفوظة
- `src/pages/settings/BackupSettingsPage.tsx:801` : إعادة تحميل المجدول الزمني للنسخ التلقائي
- `src/pages/settings/BackupSettingsPage.tsx:804` : إعادة تحميل الجدول
- `src/pages/settings/BackupSettingsPage.tsx:814` : تحديث السجل
- `src/pages/settings/BackupSettingsPage.tsx:824` : تصفية السجل:
- `src/pages/settings/BackupSettingsPage.tsx:828` : النوع:
- `src/pages/settings/BackupSettingsPage.tsx:834` : الكل
- `src/pages/settings/BackupSettingsPage.tsx:835` : يدوي
- `src/pages/settings/BackupSettingsPage.tsx:836` : تلقائي
- `src/pages/settings/BackupSettingsPage.tsx:842` : الحالة:
- `src/pages/settings/BackupSettingsPage.tsx:848` : الكل
- `src/pages/settings/BackupSettingsPage.tsx:849` : مكتمل
- `src/pages/settings/BackupSettingsPage.tsx:850` : جاري
- `src/pages/settings/BackupSettingsPage.tsx:851` : فشل
- `src/pages/settings/BackupSettingsPage.tsx:862` : جاري تحميل سجل النسخ الاحتياطية...
- `src/pages/settings/BackupSettingsPage.tsx:867` : لا توجد نسخ احتياطية مطابقة
- `src/pages/settings/BackupSettingsPage.tsx:868` : قم بإنشاء نسخة احتياطية جديدة أو تغيير معايير التصفية
- `src/pages/settings/BackupSettingsPage.tsx:875` : التاريخ والوقت
- `src/pages/settings/BackupSettingsPage.tsx:876` : اسم الملف
- `src/pages/settings/BackupSettingsPage.tsx:877` : النوع
- `src/pages/settings/BackupSettingsPage.tsx:878` : الحالة
- `src/pages/settings/BackupSettingsPage.tsx:879` : الحجم
- `src/pages/settings/BackupSettingsPage.tsx:880` : الإجراءات
- `src/pages/settings/BackupSettingsPage.tsx:964` : تأكيد حذف النسخة الاحتياطية
- `src/pages/settings/BackupSettingsPage.tsx:966` : هل أنت متأكد من حذف النسخة &ldquo;{backupToDelete?.fileName}&rdquo; نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
- `src/pages/settings/BackupSettingsPage.tsx:970` : إلغاء
- `src/pages/settings/BackupSettingsPage.tsx:979` : جاري الحذف... | حذف نهائياً

#### `src/pages/settings/MessageRetentionPage.tsx` (70 lignes)
- `src/pages/settings/MessageRetentionPage.tsx:82` : خطأ في تحميل البيانات
- `src/pages/settings/MessageRetentionPage.tsx:92` : تم حفظ سياسة الاحتفاظ بنجاح
- `src/pages/settings/MessageRetentionPage.tsx:94` : خطأ في حفظ سياسة الاحتفاظ
- `src/pages/settings/MessageRetentionPage.tsx:105` : تم حذف ${result.deletedCount} رسالة و ${result.deletedAttachments} مرفق بنجاح
- `src/pages/settings/MessageRetentionPage.tsx:108` : خطأ في حذف الرسائل
- `src/pages/settings/MessageRetentionPage.tsx:119` : جاري تحميل بيانات وسياسات الرسائل...
- `src/pages/settings/MessageRetentionPage.tsx:135` : العودة للإعدادات
- `src/pages/settings/MessageRetentionPage.tsx:144` : إدارة الرسائل والأرشفة
- `src/pages/settings/MessageRetentionPage.tsx:146` : سياسة الحفظ
- `src/pages/settings/MessageRetentionPage.tsx:150` : تحديد قواعد الحفظ التلقائي، تحليل سعة التخزين، والتنظيف الآمن للمراسلات القديمة
- `src/pages/settings/MessageRetentionPage.tsx:162` : تحديث البيانات
- `src/pages/settings/MessageRetentionPage.tsx:174` : إحصائيات الرسائل
- `src/pages/settings/MessageRetentionPage.tsx:182` : سياسة الحفظ التلقائية
- `src/pages/settings/MessageRetentionPage.tsx:190` : التنظيف اليدوي والأرشفة
- `src/pages/settings/MessageRetentionPage.tsx:204` : إجمالي المراسلات
- `src/pages/settings/MessageRetentionPage.tsx:205` : عدد الرسائل المسجلة في النظام
- `src/pages/settings/MessageRetentionPage.tsx:213` : رسالة نشطة
- `src/pages/settings/MessageRetentionPage.tsx:226` : إجمالي المرفقات
- `src/pages/settings/MessageRetentionPage.tsx:227` : الملفات والمستندات الملحقة بالرسائل
- `src/pages/settings/MessageRetentionPage.tsx:235` : ملف مرفق
- `src/pages/settings/MessageRetentionPage.tsx:250` : توزيع الرسائل حسب العمر
- `src/pages/settings/MessageRetentionPage.tsx:251` : تصنيف المراسلات بحسب الفترة الزمنية لانقضائها
- `src/pages/settings/MessageRetentionPage.tsx:259` : آخر شهر
- `src/pages/settings/MessageRetentionPage.tsx:263` : آخر 3 أشهر
- `src/pages/settings/MessageRetentionPage.tsx:267` : آخر 6 أشهر
- `src/pages/settings/MessageRetentionPage.tsx:271` : آخر سنة
- `src/pages/settings/MessageRetentionPage.tsx:275` : أقدم من سنة
- `src/pages/settings/MessageRetentionPage.tsx:283` : تأثير التخزين والأداء
- `src/pages/settings/MessageRetentionPage.tsx:288` : الرسائل الحديثة (آخر 3 أشهر)
- `src/pages/settings/MessageRetentionPage.tsx:289` : استهلاك منخفض
- `src/pages/settings/MessageRetentionPage.tsx:295` : الرسائل المؤرشفة والقديمة (أقدم من سنة)
- `src/pages/settings/MessageRetentionPage.tsx:296` : استهلاك مرتفع
- `src/pages/settings/MessageRetentionPage.tsx:315` : سياسة الحفظ التلقائي
- `src/pages/settings/MessageRetentionPage.tsx:317` : تكوين جدولة الحذف التلقائي للمراسلات والمرفقات القديمة
- `src/pages/settings/MessageRetentionPage.tsx:326` : تفعيل الحذف التلقائي للمراسلات
- `src/pages/settings/MessageRetentionPage.tsx:329` : حذف المراسلات والمرفقات تلقائياً بعد مرور فترة محددة لتوفير مساحة التخزين
- `src/pages/settings/MessageRetentionPage.tsx:344` : المدة الزمنية للاحتفاظ
- `src/pages/settings/MessageRetentionPage.tsx:358` : وحدة القياس
- `src/pages/settings/MessageRetentionPage.tsx:370` : أيام
- `src/pages/settings/MessageRetentionPage.tsx:371` : أشهر
- `src/pages/settings/MessageRetentionPage.tsx:372` : سنوات
- `src/pages/settings/MessageRetentionPage.tsx:381` : سيتم حذف الرسائل والمرفقات تلقائياً كل {policy.period} {
- `src/pages/settings/MessageRetentionPage.tsx:382` : أيام
- `src/pages/settings/MessageRetentionPage.tsx:383` : أشهر | سنوات
- `src/pages/settings/MessageRetentionPage.tsx:384` : }. هذا الإجراء سيوفر مساحة تخزين ويحافظ على كفاءة واستجابة قاعدة البيانات.
- `src/pages/settings/MessageRetentionPage.tsx:397` : جاري الحفظ...
- `src/pages/settings/MessageRetentionPage.tsx:402` : حفظ سياسة الحفظ
- `src/pages/settings/MessageRetentionPage.tsx:422` : تنظيف يدوي للرسائل
- `src/pages/settings/MessageRetentionPage.tsx:424` : حذف فوري للمراسلات والمرفقات الأقدم من فترة زمنية محددة
- `src/pages/settings/MessageRetentionPage.tsx:433` : المدة الزمنية
- `src/pages/settings/MessageRetentionPage.tsx:447` : وحدة القياس
- `src/pages/settings/MessageRetentionPage.tsx:459` : أيام
- `src/pages/settings/MessageRetentionPage.tsx:460` : أشهر
- `src/pages/settings/MessageRetentionPage.tsx:461` : سنوات
- `src/pages/settings/MessageRetentionPage.tsx:471` : تقدير التأثير المتوقع
- `src/pages/settings/MessageRetentionPage.tsx:481` : رسائل مؤهلة للحذف
- `src/pages/settings/MessageRetentionPage.tsx:484` : ~2.5 جيجابايت
- `src/pages/settings/MessageRetentionPage.tsx:485` : مساحة تخزينية متوقع توفيرها
- `src/pages/settings/MessageRetentionPage.tsx:493` : تحذير: سيتم حذف جميع المراسلات والمرفقات الأقدم من {deleteForm.period} {
- `src/pages/settings/MessageRetentionPage.tsx:494` : أيام
- `src/pages/settings/MessageRetentionPage.tsx:495` : أشهر | سنوات
- `src/pages/settings/MessageRetentionPage.tsx:496` : } نهائياً. تأكد من عمل نسخة احتياطية أولاً قبل تنفيذ الحذف.
- `src/pages/settings/MessageRetentionPage.tsx:508` : تنفيذ عملية الحذف
- `src/pages/settings/MessageRetentionPage.tsx:518` : تصدير نسخة احتياطية أولاً
- `src/pages/settings/MessageRetentionPage.tsx:536` : تأكيد حذف المراسلات نهائياً
- `src/pages/settings/MessageRetentionPage.tsx:539` : أنت على وشك حذف كافة المراسلات والمرفقات الأقدم من{' '}
- `src/pages/settings/MessageRetentionPage.tsx:541` : أيام | أشهر | سنوات
- `src/pages/settings/MessageRetentionPage.tsx:543` : . لا يمكن استرجاع هذه البيانات بعد تأكيد الحذف. هل ترغب بالتأكيد؟
- `src/pages/settings/MessageRetentionPage.tsx:552` : تأكيد الحذف النهائي
- `src/pages/settings/MessageRetentionPage.tsx:555` : إلغاء

#### `src/pages/settings/SecurityPrivacyPage.tsx` (56 lignes)
- `src/pages/settings/SecurityPrivacyPage.tsx:111` : كمبيوتر سطح المكتب (الإدارة)
- `src/pages/settings/SecurityPrivacyPage.tsx:113` : الرياض، السعودية
- `src/pages/settings/SecurityPrivacyPage.tsx:115` : الآن
- `src/pages/settings/SecurityPrivacyPage.tsx:121` : هاتف محمول (تطبيق الويب)
- `src/pages/settings/SecurityPrivacyPage.tsx:123` : جدة، السعودية
- `src/pages/settings/SecurityPrivacyPage.tsx:125` : منذ ساعتين
- `src/pages/settings/SecurityPrivacyPage.tsx:146` : خطأ في تحميل الإعدادات
- `src/pages/settings/SecurityPrivacyPage.tsx:194` : تم حفظ إعدادات الأمان والخصوصية بنجاح
- `src/pages/settings/SecurityPrivacyPage.tsx:196` : خطأ في حفظ الإعدادات
- `src/pages/settings/SecurityPrivacyPage.tsx:205` : تم إنهاء الجلسة بنجاح
- `src/pages/settings/SecurityPrivacyPage.tsx:207` : خطأ في إنهاء الجلسة
- `src/pages/settings/SecurityPrivacyPage.tsx:215` : تم تصدير سجلات الأمان بنجاح
- `src/pages/settings/SecurityPrivacyPage.tsx:217` : خطأ في تصدير البيانات
- `src/pages/settings/SecurityPrivacyPage.tsx:228` : تم حذف الحساب بنجاح
- `src/pages/settings/SecurityPrivacyPage.tsx:231` : خطأ في حذف الحساب
- `src/pages/settings/SecurityPrivacyPage.tsx:242` : جاري تحميل إعدادات الأمان...
- `src/pages/settings/SecurityPrivacyPage.tsx:258` : العودة للإعدادات
- `src/pages/settings/SecurityPrivacyPage.tsx:267` : الأمان والخصوصية
- `src/pages/settings/SecurityPrivacyPage.tsx:269` : الحماية وسياسة الدخول
- `src/pages/settings/SecurityPrivacyPage.tsx:273` : إدارة سياسات الدخول، تعقيد كلمات المرور، والتحكم بالجلسات النشطة
- `src/pages/settings/SecurityPrivacyPage.tsx:284` : جاري الحفظ... | حفظ الإعدادات
- `src/pages/settings/SecurityPrivacyPage.tsx:296` : سياسات الأمان
- `src/pages/settings/SecurityPrivacyPage.tsx:304` : الخصوصية وتصدير البيانات
- `src/pages/settings/SecurityPrivacyPage.tsx:312` : الجلسات النشطة
- `src/pages/settings/SecurityPrivacyPage.tsx:326` : سياسة تعقيد كلمات المرور
- `src/pages/settings/SecurityPrivacyPage.tsx:328` : تكوين شروط كلمة المرور الإلزامية للمستخدمين في النظام
- `src/pages/settings/SecurityPrivacyPage.tsx:336` : الحد الأدنى لطول كلمة المرور
- `src/pages/settings/SecurityPrivacyPage.tsx:345` : موصى به: 8 أحرف على الأقل
- `src/pages/settings/SecurityPrivacyPage.tsx:349` : دورة صلاحية كلمة المرور (أيام)
- `src/pages/settings/SecurityPrivacyPage.tsx:358` : إلزام المستخدمين بتغيير كلمة المرور كل 90 يوماً
- `src/pages/settings/SecurityPrivacyPage.tsx:365` : إلزام باحتواء أحرف كبيرة (A-Z)
- `src/pages/settings/SecurityPrivacyPage.tsx:375` : إلزام باحتواء أرقام (0-9)
- `src/pages/settings/SecurityPrivacyPage.tsx:385` : إلزام باحتواء رموز خاصة (@#$%...)
- `src/pages/settings/SecurityPrivacyPage.tsx:404` : المصادقة الثنائية (2FA)
- `src/pages/settings/SecurityPrivacyPage.tsx:406` : طبقة حماية إضافية تمنع الوصول غير المصرح به حتى عند تسرب كلمة المرور
- `src/pages/settings/SecurityPrivacyPage.tsx:414` : تفعيل المصادقة الثنائية للمستخدمين الإداريين
- `src/pages/settings/SecurityPrivacyPage.tsx:416` : إرسال رمز تحقق مؤقت للبريد الإلكتروني عند الدخول من عنوان IP أو متصفح جديد
- `src/pages/settings/SecurityPrivacyPage.tsx:429` : المصادقة الثنائية مفعلة لجميع الحسابات الإدارية.
- `src/pages/settings/SecurityPrivacyPage.tsx:446` : الخصوصية وتصدير البيانات
- `src/pages/settings/SecurityPrivacyPage.tsx:448` : خيارات الاحتفاظ بسجلات الأمان وتصدير البيانات الإدارية
- `src/pages/settings/SecurityPrivacyPage.tsx:458` : تفعيل تصدير سجلات الأمان
- `src/pages/settings/SecurityPrivacyPage.tsx:461` : السماح لمدير النظام بتنزيل تقرير بصيغة CSV لكافة عمليات الدخول
- `src/pages/settings/SecurityPrivacyPage.tsx:473` : إظهار حالة الاتصال (متصل الآن)
- `src/pages/settings/SecurityPrivacyPage.tsx:476` : إظهار شارة الاتصال في قائمة المستخدمين لزملائك في الإدارة
- `src/pages/settings/SecurityPrivacyPage.tsx:493` : تصدير سجلات الأمان
- `src/pages/settings/SecurityPrivacyPage.tsx:501` : إلغاء تنشيط الحساب
- `src/pages/settings/SecurityPrivacyPage.tsx:517` : الجلسات النشطة حالياً
- `src/pages/settings/SecurityPrivacyPage.tsx:519` : الأجهزة والمتصفحات المسجل الدخول إليها بحسابك في الوقت الراهن
- `src/pages/settings/SecurityPrivacyPage.tsx:529` : محمول
- `src/pages/settings/SecurityPrivacyPage.tsx:539` : الجلسة الحالية
- `src/pages/settings/SecurityPrivacyPage.tsx:544` : الموقع: {session.location} | آخر نشاط: {session.lastActivity}
- `src/pages/settings/SecurityPrivacyPage.tsx:554` : إنهاء الجلسة
- `src/pages/settings/SecurityPrivacyPage.tsx:575` : تأكيد إلغاء تنشيط الحساب
- `src/pages/settings/SecurityPrivacyPage.tsx:578` : هل أنت متأكد من رغبتك في إلغاء تنشيط هذا الحساب؟ لن تتمكن من تسجيل الدخول إلى المنظومة بعد تأكيد هذا الإجراء، وسيتم إخطار مدير النظام الرئيسي.
- `src/pages/settings/SecurityPrivacyPage.tsx:587` : تأكيد الإلغاء
- `src/pages/settings/SecurityPrivacyPage.tsx:590` : تراجع

#### `src/pages/settings/SettingsPage.tsx` (161 lignes)
- `src/pages/settings/SettingsPage.tsx:142` : لا يوجد مستخدم مسجل
- `src/pages/settings/SettingsPage.tsx:146` : تم تحديث الصورة الشخصية بنجاح
- `src/pages/settings/SettingsPage.tsx:153` : فشل في تحديث الصورة الشخصية
- `src/pages/settings/SettingsPage.tsx:162` : تم تحديث كلمة المرور بنجاح
- `src/pages/settings/SettingsPage.tsx:170` : فشل في تغيير كلمة المرور
- `src/pages/settings/SettingsPage.tsx:179` : حجم الصورة يجب أن لا يتجاوز 5 ميغابايت
- `src/pages/settings/SettingsPage.tsx:198` : يرجى إدخال كلمة المرور الحالية
- `src/pages/settings/SettingsPage.tsx:202` : كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل
- `src/pages/settings/SettingsPage.tsx:206` : كلمة المرور الجديدة غير متطابقة مع تأكيد كلمة المرور
- `src/pages/settings/SettingsPage.tsx:218` : تم حفظ إعدادات الأمان بنجاح
- `src/pages/settings/SettingsPage.tsx:227` : تم حفظ تفضيلات الإشعارات والتنبيهات بنجاح
- `src/pages/settings/SettingsPage.tsx:235` : تم حفظ تفضيلات العرض والنظام بنجاح
- `src/pages/settings/SettingsPage.tsx:240` : تم إنهاء جميع الجلسات النشطة الأخرى بنجاح
- `src/pages/settings/SettingsPage.tsx:254` : إعدادات المنظومة
- `src/pages/settings/SettingsPage.tsx:257` : الإعدادات العامة
- `src/pages/settings/SettingsPage.tsx:261` : إدارة إعدادات الحساب، معايير الأمان، قنوات الإشعارات والنسخ الاحتياطي للوثائق
- `src/pages/settings/SettingsPage.tsx:274` : النسخ الاحتياطي
- `src/pages/settings/SettingsPage.tsx:284` : إدارة الرسائل
- `src/pages/settings/SettingsPage.tsx:298` : الملف الشخصي
- `src/pages/settings/SettingsPage.tsx:306` : الأمان والخصوصية
- `src/pages/settings/SettingsPage.tsx:314` : الإشعارات
- `src/pages/settings/SettingsPage.tsx:322` : تفضيلات النظام
- `src/pages/settings/SettingsPage.tsx:330` : النسخ الاحتياطي
- `src/pages/settings/SettingsPage.tsx:338` : حفظ الرسائل
- `src/pages/settings/SettingsPage.tsx:347` : هوية المؤسسة
- `src/pages/settings/SettingsPage.tsx:362` : الصورة الشخصية
- `src/pages/settings/SettingsPage.tsx:365` : صورتك تظهر في التوقيعات وسجلات العمليات
- `src/pages/settings/SettingsPage.tsx:380` : المستخدم
- `src/pages/settings/SettingsPage.tsx:408` : اختيار صورة جديدة
- `src/pages/settings/SettingsPage.tsx:418` : جاري التحميل... | حفظ الصورة الجديدة
- `src/pages/settings/SettingsPage.tsx:431` : بيانات الحساب
- `src/pages/settings/SettingsPage.tsx:434` : المعلومات الإدارية المسجلة لحسابك في المنظومة
- `src/pages/settings/SettingsPage.tsx:442` : اسم المستخدم
- `src/pages/settings/SettingsPage.tsx:450` : اسم الدخول المسجل في النظام
- `src/pages/settings/SettingsPage.tsx:455` : الدور والصلاحية
- `src/pages/settings/SettingsPage.tsx:463` : مستوى الصلاحيات المعطى للحساب
- `src/pages/settings/SettingsPage.tsx:470` : القسم الحالي النشط
- `src/pages/settings/SettingsPage.tsx:474` : غير محدد
- `src/pages/settings/SettingsPage.tsx:482` : تاريخ إنشاء الحساب
- `src/pages/settings/SettingsPage.tsx:486` : غير متوفر
- `src/pages/settings/SettingsPage.tsx:495` : كلمة المرور والأمان
- `src/pages/settings/SettingsPage.tsx:497` : ينصح بتغيير كلمة المرور دورياً كل 90 يوماً للحفاظ على سرية النظام
- `src/pages/settings/SettingsPage.tsx:507` : تغيير كلمة المرور
- `src/pages/settings/SettingsPage.tsx:524` : سياسات الأمان والحماية
- `src/pages/settings/SettingsPage.tsx:527` : تكوين معايير الجلسات وحماية الدخول ضد المحاولات المشبوهة
- `src/pages/settings/SettingsPage.tsx:536` : مهلة انتهاء الجلسة عند عدم النشاط
- `src/pages/settings/SettingsPage.tsx:543` : 15 دقيقة
- `src/pages/settings/SettingsPage.tsx:544` : 30 دقيقة (موصى به)
- `src/pages/settings/SettingsPage.tsx:545` : ساعة واحدة
- `src/pages/settings/SettingsPage.tsx:546` : ساعتان
- `src/pages/settings/SettingsPage.tsx:549` : يتم قفل الشاشة تلقائياً بعد مرور هذه المدة دون نشاط
- `src/pages/settings/SettingsPage.tsx:554` : الحد الأقصى لمحاولات الدخول الخاطئة
- `src/pages/settings/SettingsPage.tsx:561` : 3 محاولات
- `src/pages/settings/SettingsPage.tsx:562` : 5 محاولات (قياسي)
- `src/pages/settings/SettingsPage.tsx:563` : 10 محاولات
- `src/pages/settings/SettingsPage.tsx:566` : يتم تعليق الحساب مؤقتاً عند تجاوز هذا العدد
- `src/pages/settings/SettingsPage.tsx:577` : فرض كلمات مرور قوية ومعقدة
- `src/pages/settings/SettingsPage.tsx:580` : إلزام المستخدمين بكلمات مرور تحتوي على حروف كبيرة وصغيرة وأرقام ورموز
- `src/pages/settings/SettingsPage.tsx:593` : سجل المراقبة والتدقيق الأمني
- `src/pages/settings/SettingsPage.tsx:596` : تسجيل كافة عمليات الدخول وتعديلات الوثائق في سجل التدقيق للنظام
- `src/pages/settings/SettingsPage.tsx:609` : التحقق بخطوتين (2FA)
- `src/pages/settings/SettingsPage.tsx:612` : طلب رمز تحقق إضافي عبر التطبيق أو البريد عند الدخول من جهاز جديد
- `src/pages/settings/SettingsPage.tsx:631` : إنهاء جميع الجلسات النشطة الأخرى
- `src/pages/settings/SettingsPage.tsx:640` : حفظ إعدادات الأمان
- `src/pages/settings/SettingsPage.tsx:655` : قنوات وتفضيلات التنبيهات
- `src/pages/settings/SettingsPage.tsx:658` : تخصيص الإشعارات الفورية والتنبيهات البريدية للأحداث الهامة
- `src/pages/settings/SettingsPage.tsx:667` : إشعارات فورية على الشاشة
- `src/pages/settings/SettingsPage.tsx:670` : إظهار إشعارات منبثقة عند استلام معاملات أو توجيهات جديدة
- `src/pages/settings/SettingsPage.tsx:683` : تنبيهات مواعيد المعالجة والتأخيرات
- `src/pages/settings/SettingsPage.tsx:686` : تنبيه عند اقتراب المهلة المحددة للرد على المعاملات الواردة
- `src/pages/settings/SettingsPage.tsx:699` : إشعارات البريد الإلكتروني
- `src/pages/settings/SettingsPage.tsx:702` : إرسال رسالة بريد إلكتروني عند إسناد وثيقة أو إحالتها إلى قسمك
- `src/pages/settings/SettingsPage.tsx:715` : التنبيه الصوتي
- `src/pages/settings/SettingsPage.tsx:718` : تشغيل نغمة تنبيه هادئة وموجزة عند ورود رسالة جديدة
- `src/pages/settings/SettingsPage.tsx:731` : التقرير الصباحي اليومي
- `src/pages/settings/SettingsPage.tsx:734` : تلقي ملخص يومي في بداية ساعات الدوام بجميع المعاملات المعلقة
- `src/pages/settings/SettingsPage.tsx:752` : حفظ تفضيلات الإشعارات
- `src/pages/settings/SettingsPage.tsx:767` : تفضيلات العرض والمظهر
- `src/pages/settings/SettingsPage.tsx:770` : ضبط كثافة الجداول، عدد النتائج الافتراضي، وطريقة ترتيب السجلات
- `src/pages/settings/SettingsPage.tsx:778` : كثافة العرض في جداول الوثائق
- `src/pages/settings/SettingsPage.tsx:785` : مريح (مسافات واسعة)
- `src/pages/settings/SettingsPage.tsx:786` : قياسي (متوازن 8 ساعات عمل)
- `src/pages/settings/SettingsPage.tsx:787` : مدمج (كثافة بيانات عالية)
- `src/pages/settings/SettingsPage.tsx:790` : يحدد ارتفاع أسطر الجداول وتناسق الخطوط
- `src/pages/settings/SettingsPage.tsx:795` : عدد العناصر الافتراضي في الصفحة
- `src/pages/settings/SettingsPage.tsx:802` : 10 عناصر
- `src/pages/settings/SettingsPage.tsx:803` : 25 عنصراً (موصى به)
- `src/pages/settings/SettingsPage.tsx:804` : 50 عنصراً
- `src/pages/settings/SettingsPage.tsx:805` : 100 عنصر
- `src/pages/settings/SettingsPage.tsx:808` : عدد سجلات المراسلات المعروضة قبل الانتقال للصفحة التالية
- `src/pages/settings/SettingsPage.tsx:815` : الترتيب الافتراضي للمراسلات
- `src/pages/settings/SettingsPage.tsx:822` : الأحدث تسجيلاً أولاً
- `src/pages/settings/SettingsPage.tsx:823` : الأقدم تسجيلاً أولاً
- `src/pages/settings/SettingsPage.tsx:831` : معاينة الـ PDF تلقائياً
- `src/pages/settings/SettingsPage.tsx:833` : فتح ملف الوثيقة الممسوحة عند النقر على السجل
- `src/pages/settings/SettingsPage.tsx:850` : حفظ تفضيلات العرض
- `src/pages/settings/SettingsPage.tsx:866` : النسخ الاحتياطي وأرشفة البيانات
- `src/pages/settings/SettingsPage.tsx:869` : متابعة وتأمين الوثائق والمرفقات بصيغة رقمية متكاملة
- `src/pages/settings/SettingsPage.tsx:877` : الانتقال لإدارة النسخ الاحتياطي الكاملة
- `src/pages/settings/SettingsPage.tsx:888` : الوثائق الواردة
- `src/pages/settings/SettingsPage.tsx:893` : مشمولة في الأرشيف
- `src/pages/settings/SettingsPage.tsx:899` : الوثائق الصادرة
- `src/pages/settings/SettingsPage.tsx:904` : مشمولة في الأرشيف
- `src/pages/settings/SettingsPage.tsx:910` : حجم البيانات الكلي
- `src/pages/settings/SettingsPage.tsx:915` : المستندات والمرفقات
- `src/pages/settings/SettingsPage.tsx:921` : آخر نسخة احتياطية
- `src/pages/settings/SettingsPage.tsx:924` : لا توجد بعد
- `src/pages/settings/SettingsPage.tsx:927` : محفوظة محلياً
- `src/pages/settings/SettingsPage.tsx:934` : النسخ الاحتياطي التلقائي المجدول
- `src/pages/settings/SettingsPage.tsx:936` : يمكنك ضبط التكرار الأسبوعي أو الشهري وتحديد مجلد التصدير من خلال صفحة النسخ الاحتياطي
- `src/pages/settings/SettingsPage.tsx:944` : فتح إعدادات الجدولة
- `src/pages/settings/SettingsPage.tsx:960` : سياسة حفظ وحذف المراسلات
- `src/pages/settings/SettingsPage.tsx:963` : إدارة سعة التخزين وتحديد فترة الاحتفاظ بالمراسلات والمرفقات
- `src/pages/settings/SettingsPage.tsx:971` : الانتقال لإدارة الرسائل الكاملة
- `src/pages/settings/SettingsPage.tsx:979` : إجمالي الرسائل في النظام
- `src/pages/settings/SettingsPage.tsx:984` : مراسلة مسجلة
- `src/pages/settings/SettingsPage.tsx:989` : إجمالي المرفقات
- `src/pages/settings/SettingsPage.tsx:994` : ملف مرفق
- `src/pages/settings/SettingsPage.tsx:999` : حالة الحذف التلقائي
- `src/pages/settings/SettingsPage.tsx:1001` : مفعّل | معطّل
- `src/pages/settings/SettingsPage.tsx:1006` : أشهر | سنوات | أيام
- `src/pages/settings/SettingsPage.tsx:1010` : الاحتفاظ دائم
- `src/pages/settings/SettingsPage.tsx:1019` : التنظيف اليدوي والأرشفة
- `src/pages/settings/SettingsPage.tsx:1021` : يمكنك حذف الرسائل الأقدم من مدة محددة أو تصديرها قبل الحذف من خلال صفحة إدارة الرسائل
- `src/pages/settings/SettingsPage.tsx:1029` : تخصيص سياسة الحفظ
- `src/pages/settings/SettingsPage.tsx:1050` : هوية المؤسسة والأقسام السيادية
- `src/pages/settings/SettingsPage.tsx:1053` : إدارة التسمية الرسمية، شعار المؤسسة، وتعيين الأقسام الوظيفية الرئيسية (RH، مكتب الضبط، الإدارة العامة)
- `src/pages/settings/SettingsPage.tsx:1062` : تشغيل معالج الإعداد (Setup Wizard)
- `src/pages/settings/SettingsPage.tsx:1071` : الهوية والتسمية الرسمية
- `src/pages/settings/SettingsPage.tsx:1075` : اسم الإدارة الحالي :
- `src/pages/settings/SettingsPage.tsx:1077` : غير محدد
- `src/pages/settings/SettingsPage.tsx:1081` : حالة التكوين الإجمالي :
- `src/pages/settings/SettingsPage.tsx:1084` : مكتمل وجاهز
- `src/pages/settings/SettingsPage.tsx:1088` : بحاجة إلى تهيئة
- `src/pages/settings/SettingsPage.tsx:1097` : الأقسام الوظيفية الرئيسية
- `src/pages/settings/SettingsPage.tsx:1101` : قسم الموارد البشرية (RH) :
- `src/pages/settings/SettingsPage.tsx:1104` : معرّف
- `src/pages/settings/SettingsPage.tsx:1105` : معرّف | غير معيّن
- `src/pages/settings/SettingsPage.tsx:1109` : مكتب الضبط (BO) :
- `src/pages/settings/SettingsPage.tsx:1112` : معرّف
- `src/pages/settings/SettingsPage.tsx:1113` : معرّف | غير معيّن
- `src/pages/settings/SettingsPage.tsx:1117` : الإدارة العامة (Direction) :
- `src/pages/settings/SettingsPage.tsx:1120` : معرّف
- `src/pages/settings/SettingsPage.tsx:1121` : معرّف | غير معيّن
- `src/pages/settings/SettingsPage.tsx:1131` : إعادة تشغيل معالج الإعداد الموجه
- `src/pages/settings/SettingsPage.tsx:1133` : يمكنك في أي وقت تحديث اسم المؤسسة أو إعادة توزيع الأقسام السيادية والوظائف الرئيسية من خلال المعالج الموجه المكون من 4 خطوات.
- `src/pages/settings/SettingsPage.tsx:1141` : تعديل عبر المعالج
- `src/pages/settings/SettingsPage.tsx:1162` : تغيير كلمة المرور
- `src/pages/settings/SettingsPage.tsx:1165` : أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة مع تأكيدها
- `src/pages/settings/SettingsPage.tsx:1172` : كلمة المرور الحالية *
- `src/pages/settings/SettingsPage.tsx:1180` : أدخل كلمة المرور الحالية
- `src/pages/settings/SettingsPage.tsx:1196` : كلمة المرور الجديدة *
- `src/pages/settings/SettingsPage.tsx:1204` : 6 أحرف على الأقل
- `src/pages/settings/SettingsPage.tsx:1220` : تأكيد كلمة المرور الجديدة *
- `src/pages/settings/SettingsPage.tsx:1228` : أعد كتابة كلمة المرور الجديدة
- `src/pages/settings/SettingsPage.tsx:1248` : جاري التحديث... | تأكيد التغيير
- `src/pages/settings/SettingsPage.tsx:1256` : إلغاء
- `src/pages/settings/SettingsPage.tsx:1275` : تأكيد إنهاء الجلسات النشطة الأخرى
- `src/pages/settings/SettingsPage.tsx:1278` : سيتم تسجيل الخروج الفوري من كافة الأجهزة والمتصفحات الأخرى المسجل الدخول إليها بحسابك، مع الإبقاء على الجلسة الحالية فقط.
- `src/pages/settings/SettingsPage.tsx:1287` : تأكيد إنهاء الجلسات
- `src/pages/settings/SettingsPage.tsx:1290` : إلغاء

#### `src/pages/setup/SetupWizardPage.tsx` (135 lignes)
- `src/pages/setup/SetupWizardPage.tsx:187` : حدث خطأ أثناء تحميل بيانات الإعدادات الحالية
- `src/pages/setup/SetupWizardPage.tsx:199` : يرجى إدخال اسم القسم
- `src/pages/setup/SetupWizardPage.tsx:211` : تم إنشاء القسم | بنجاح
- `src/pages/setup/SetupWizardPage.tsx:221` : فشل في إنشاء القسم. يرجى المحاولة ثانية
- `src/pages/setup/SetupWizardPage.tsx:230` : يرجى تعيين كافة الأقسام الرئيسية قبل المتابعة
- `src/pages/setup/SetupWizardPage.tsx:239` : لا يمكن اختيار نفس القسم لأكثر من وظيفة سيادية
- `src/pages/setup/SetupWizardPage.tsx:261` : تم حفظ الأقسام السيادية بنجاح
- `src/pages/setup/SetupWizardPage.tsx:265` : حدث خطأ أثناء حفظ الأقسام السيادية
- `src/pages/setup/SetupWizardPage.tsx:279` : الاسم واللقب لمدير الإدارة مطلوبان
- `src/pages/setup/SetupWizardPage.tsx:284` : اسم المستخدم مطلوب
- `src/pages/setup/SetupWizardPage.tsx:289` : كلمة المرور يجب ألا تقل عن 6 أحرف
- `src/pages/setup/SetupWizardPage.tsx:294` : كلمتا المرور غير متطابقتين
- `src/pages/setup/SetupWizardPage.tsx:299` : Département Direction non configuré / قسم الإدارة غير محدد
- `src/pages/setup/SetupWizardPage.tsx:347` : تم إنشاء حساب مدير الإدارة بنجاح
- `src/pages/setup/SetupWizardPage.tsx:354` : utilisateur déjà utilisé / اسم المستخدم مستخدم بالفعل
- `src/pages/setup/SetupWizardPage.tsx:356` : Un seul Directeur est autorisé / يسمح بمدير واحد فقط في النظام
- `src/pages/setup/SetupWizardPage.tsx:358` : فشل في إنشاء حساب المدير
- `src/pages/setup/SetupWizardPage.tsx:373` : الاسم واللقب لمسؤول الموارد البشرية مطلوبان
- `src/pages/setup/SetupWizardPage.tsx:378` : اسم المستخدم مطلوب
- `src/pages/setup/SetupWizardPage.tsx:383` : كلمة المرور يجب ألا تقل عن 6 أحرف
- `src/pages/setup/SetupWizardPage.tsx:388` : كلمتا المرور غير متطابقتين
- `src/pages/setup/SetupWizardPage.tsx:393` : Département RH non configuré / قسم الموارد البشرية غير محدد
- `src/pages/setup/SetupWizardPage.tsx:441` : تم إنشاء حساب مسؤول الموارد البشرية بنجاح
- `src/pages/setup/SetupWizardPage.tsx:448` : utilisateur déjà utilisé / اسم المستخدم مستخدم بالفعل
- `src/pages/setup/SetupWizardPage.tsx:450` : فشل في إنشاء حساب مسؤول الموارد البشرية
- `src/pages/setup/SetupWizardPage.tsx:468` : تم اكتمال الإعداد الأولي للنظام بنجاح!
- `src/pages/setup/SetupWizardPage.tsx:472` : حدث خطأ أثناء إنهاء الإعداد
- `src/pages/setup/SetupWizardPage.tsx:481` : غير محدد
- `src/pages/setup/SetupWizardPage.tsx:541` : جاري تحميل معالج الإعداد الأولي للنظام...
- `src/pages/setup/SetupWizardPage.tsx:557` : معالج الإعداد الأولي للنظام
- `src/pages/setup/SetupWizardPage.tsx:559` : تهيئة الهيكلية الإدارية والتعريفية وحسابات الإدارة في خطوات موجهة وبسيطة
- `src/pages/setup/SetupWizardPage.tsx:566` : صلاحية مسؤول النظام
- `src/pages/setup/SetupWizardPage.tsx:585` : اسم الإدارة
- `src/pages/setup/SetupWizardPage.tsx:599` : الأقسام
- `src/pages/setup/SetupWizardPage.tsx:613` : الأقسام السيادية
- `src/pages/setup/SetupWizardPage.tsx:627` : مدير الإدارة
- `src/pages/setup/SetupWizardPage.tsx:641` : مسؤول RH
- `src/pages/setup/SetupWizardPage.tsx:653` : الملخص والتأكيد
- `src/pages/setup/SetupWizardPage.tsx:669` : الخطوة 1 : تحديد اسم وهوية المؤسسة الإدارية
- `src/pages/setup/SetupWizardPage.tsx:672` : سيظهر هذا الاسم في أعلى الشريط العلوي (Header)، الهيكل التنظيمي، والتقارير الرسمية لنظام DMS.
- `src/pages/setup/SetupWizardPage.tsx:678` : اسم الإدارة أو المؤسسة *
- `src/pages/setup/SetupWizardPage.tsx:684` : مثال: إدارة التشفير والإعلام الآلي
- `src/pages/setup/SetupWizardPage.tsx:689` : حقل إجباري. يُرجى استخدام التسمية الرسمية المعتمدة للمؤسسة.
- `src/pages/setup/SetupWizardPage.tsx:695` : رابط أو مسار الشعار (اختياري)
- `src/pages/setup/SetupWizardPage.tsx:702` : /uploads/logo.png أو رابط صورة
- `src/pages/setup/SetupWizardPage.tsx:707` : يمكن تحديث أو رفع شعار المؤسسة لاحقاً من صفحة الإعدادات العامة.
- `src/pages/setup/SetupWizardPage.tsx:722` : الخطوة 2 : تأسيس الأقسام الإدارية (3 أقسام على الأقل)
- `src/pages/setup/SetupWizardPage.tsx:725` : يجب تسجيل ما لا يقل عن 3 أقسام (الإدارة العامة، مكتب الضبط، والموارد البشرية RH).
- `src/pages/setup/SetupWizardPage.tsx:734` : إضافة قسم جديد
- `src/pages/setup/SetupWizardPage.tsx:742` : عدد الأقسام المسجلة حالياً :
- `src/pages/setup/SetupWizardPage.tsx:747` : الشرط مستوفى (3 أقسام على الأقل)
- `src/pages/setup/SetupWizardPage.tsx:751` : يتبقى إضافة {3 - departments.length} قسم/أقسام إضافية
- `src/pages/setup/SetupWizardPage.tsx:761` : اسم القسم
- `src/pages/setup/SetupWizardPage.tsx:762` : الوصف
- `src/pages/setup/SetupWizardPage.tsx:763` : الحالة
- `src/pages/setup/SetupWizardPage.tsx:770` : إضافة قسم جديد
- `src/pages/setup/SetupWizardPage.tsx:781` : نشط
- `src/pages/setup/SetupWizardPage.tsx:800` : الخطوة 3 : تخصيص الأقسام السيادية والوظيفية (OrganizationSettings)
- `src/pages/setup/SetupWizardPage.tsx:803` : تحديد الأقسام المسؤولة عن الموارد البشرية، مكتب الضبط، وإدارة المؤسسة. يمنع اختيار نفس القسم لأكثر من وظيفة.
- `src/pages/setup/SetupWizardPage.tsx:812` : قسم الموارد البشرية (rhDepartmentId) *
- `src/pages/setup/SetupWizardPage.tsx:815` : القسم المخول بإدارة شؤون الموظفين، الحضور والانصراف، والمسار المهني.
- `src/pages/setup/SetupWizardPage.tsx:823` : -- اختر قسم الموارد البشرية --
- `src/pages/setup/SetupWizardPage.tsx:834` : مكتب الضبط (bureauOrdreDepartmentId) *
- `src/pages/setup/SetupWizardPage.tsx:837` : القسم المسؤول عن تسجيل وتوزيع البريد والمراسلات الصادرة والواردة.
- `src/pages/setup/SetupWizardPage.tsx:845` : -- اختر مكتب الضبط --
- `src/pages/setup/SetupWizardPage.tsx:856` : الإدارة العامة / مكتب المدير (bureauDirecteurDepartmentId) *
- `src/pages/setup/SetupWizardPage.tsx:859` : مكتب المدير العام المشرف على كامل المراسلات والمصالح الإدارية.
- `src/pages/setup/SetupWizardPage.tsx:867` : -- اختر قسم الإدارة العامة --
- `src/pages/setup/SetupWizardPage.tsx:882` : تنبيه: لا يمكن اختيار نفس القسم لأكثر من وظيفة سيادية. يرجى اختيار أقسام متباينة.
- `src/pages/setup/SetupWizardPage.tsx:895` : الخطوة 4 : إنشاء حساب مدير الإدارة
- `src/pages/setup/SetupWizardPage.tsx:907` : صلاحيات وطبيعة حساب المدير العام :
- `src/pages/setup/SetupWizardPage.tsx:910` : Le Directeur aura un accès en lecture seule à tous les documents et au personnel. (صلاحية قراءة واطلاع شاملة على كافة الوثائق والملفات).
- `src/pages/setup/SetupWizardPage.tsx:911` : Le RH Manager complétera sa fiche (CIN, poste, etc.) ultérieurement. (سيقوم مسؤول الموارد البشرية باستكمال بطاقة الموظف لاحقاً).
- `src/pages/setup/SetupWizardPage.tsx:918` : تم تأسيس حساب المدير بنجاح:
- `src/pages/setup/SetupWizardPage.tsx:926` : الهوية الإدارية الأساسية (Personnel partiel)
- `src/pages/setup/SetupWizardPage.tsx:931` : اللقب (Nom) *
- `src/pages/setup/SetupWizardPage.tsx:937` : لقب المدير
- `src/pages/setup/SetupWizardPage.tsx:944` : الاسم (Prénom) *
- `src/pages/setup/SetupWizardPage.tsx:950` : اسم المدير
- `src/pages/setup/SetupWizardPage.tsx:962` : بيانات تسجيل الدخول (User Account)
- `src/pages/setup/SetupWizardPage.tsx:967` : اسم المستخدم (Username) *
- `src/pages/setup/SetupWizardPage.tsx:979` : الاسم الافتراضي المقترح: directeur
- `src/pages/setup/SetupWizardPage.tsx:987` : كلمة المرور (6 أحرف على الأقل) *
- `src/pages/setup/SetupWizardPage.tsx:1002` : تأكيد كلمة المرور *
- `src/pages/setup/SetupWizardPage.tsx:1029` : الخطوة 5 : إنشاء حساب مسؤول الموارد البشرية
- `src/pages/setup/SetupWizardPage.tsx:1041` : صلاحيات ومسؤوليات مسؤول الموارد البشرية :
- `src/pages/setup/SetupWizardPage.tsx:1044` : Le RH Manager créera ensuite les autres fiches (BO, LABO, QT). (إنشاء بطاقات موظفي المصالح والأقسام الأخرى).
- `src/pages/setup/SetupWizardPage.tsx:1045` : Il pourra également compléter sa propre fiche et celle du Directeur (CIN, poste, etc.). (استكمال كافة البيانات الإدارية والمهنية لاحقاً).
- `src/pages/setup/SetupWizardPage.tsx:1052` : تم تأسيس حساب مسؤول الموارد البشرية بنجاح:
- `src/pages/setup/SetupWizardPage.tsx:1060` : الهوية الإدارية الأساسية (Personnel partiel)
- `src/pages/setup/SetupWizardPage.tsx:1065` : اللقب (Nom) *
- `src/pages/setup/SetupWizardPage.tsx:1071` : لقب مسؤول RH
- `src/pages/setup/SetupWizardPage.tsx:1078` : الاسم (Prénom) *
- `src/pages/setup/SetupWizardPage.tsx:1084` : اسم مسؤول RH
- `src/pages/setup/SetupWizardPage.tsx:1096` : بيانات تسجيل الدخول (User Account)
- `src/pages/setup/SetupWizardPage.tsx:1101` : اسم المستخدم (Username) *
- `src/pages/setup/SetupWizardPage.tsx:1113` : الاسم الافتراضي المقترح: rh_manager
- `src/pages/setup/SetupWizardPage.tsx:1121` : كلمة المرور (6 أحرف على الأقل) *
- `src/pages/setup/SetupWizardPage.tsx:1136` : تأكيد كلمة المرور *
- `src/pages/setup/SetupWizardPage.tsx:1163` : الخطوة 6 : مراجعة الملخص النهائي واعتماد التهيئة
- `src/pages/setup/SetupWizardPage.tsx:1166` : الملخص الشامل للهيكلية الإدارية، الحسابات المنشأة، والخطوات التالية
- `src/pages/setup/SetupWizardPage.tsx:1177` : الهوية الرسمية للمؤسسة
- `src/pages/setup/SetupWizardPage.tsx:1180` : اسم الإدارة :
- `src/pages/setup/SetupWizardPage.tsx:1185` : رابط الشعار :
- `src/pages/setup/SetupWizardPage.tsx:1196` : الأقسام الإدارية المؤسسة
- `src/pages/setup/SetupWizardPage.tsx:1199` : {departments.length} أقسام
- `src/pages/setup/SetupWizardPage.tsx:1215` : توزيع الصلاحيات الإدارية (Functions)
- `src/pages/setup/SetupWizardPage.tsx:1219` : الموارد البشرية (RH) :
- `src/pages/setup/SetupWizardPage.tsx:1223` : مكتب الضبط (BO) :
- `src/pages/setup/SetupWizardPage.tsx:1227` : الإدارة العامة (Direction) :
- `src/pages/setup/SetupWizardPage.tsx:1237` : الحسابات والبطاقات الإدارية المنشأة
- `src/pages/setup/SetupWizardPage.tsx:1242` : مدير الإدارة (Directeur) : {directorNom} {directorPrenom}
- `src/pages/setup/SetupWizardPage.tsx:1245` : اسم الدخول:
- `src/pages/setup/SetupWizardPage.tsx:1254` : مسؤول الموارد البشرية (RH Manager) : {rhNom} {rhPrenom}
- `src/pages/setup/SetupWizardPage.tsx:1257` : اسم الدخول:
- `src/pages/setup/SetupWizardPage.tsx:1272` : ⚠️ Prochaines étapes / الخطوات الموالية المقترحة :
- `src/pages/setup/SetupWizardPage.tsx:1277` : تسجيل الخروج من حساب المشرف الحالي، ثم الدخول بحساب مسؤول الموارد البشرية.
- `src/pages/setup/SetupWizardPage.tsx:1281` : استكمال البيانات الشخصية والمهنية لبطاقة مسؤول الموارد البشرية.
- `src/pages/setup/SetupWizardPage.tsx:1285` : استكمال ملف مدير الإدارة بالمعلومات الرسمية (رقم بطاقة التعريف، المنصب، إلخ).
- `src/pages/setup/SetupWizardPage.tsx:1289` : إنشاء بطاقات الموظفين لباقي الأقسام (مكتب الضبط BO، المخبر LABO، الجودة QT...).
- `src/pages/setup/SetupWizardPage.tsx:1293` : إنشاء حسابات المستخدمين وربطها بالبطاقات المهنية المنشأة.
- `src/pages/setup/SetupWizardPage.tsx:1313` : الخطوة السابقة
- `src/pages/setup/SetupWizardPage.tsx:1329` : جاري المعالجة...
- `src/pages/setup/SetupWizardPage.tsx:1333` : الخطوة التالية
- `src/pages/setup/SetupWizardPage.tsx:1348` : جاري إنهاء التهيئة...
- `src/pages/setup/SetupWizardPage.tsx:1353` : إنهاء الإعداد والبدء (Terminer la configuration)
- `src/pages/setup/SetupWizardPage.tsx:1369` : إضافة قسم إداري جديد
- `src/pages/setup/SetupWizardPage.tsx:1372` : أدخل اسم القسم ووصفه لإنشائه وإدراجه في الهيكل الإداري.
- `src/pages/setup/SetupWizardPage.tsx:1378` : اسم القسم *
- `src/pages/setup/SetupWizardPage.tsx:1384` : مثال: الموارد البشرية
- `src/pages/setup/SetupWizardPage.tsx:1391` : وصف القسم (اختياري)
- `src/pages/setup/SetupWizardPage.tsx:1397` : مثال: إدارة شؤون الموظفين والمسار المهني
- `src/pages/setup/SetupWizardPage.tsx:1410` : إلغاء
- `src/pages/setup/SetupWizardPage.tsx:1421` : جاري الإنشاء...
- `src/pages/setup/SetupWizardPage.tsx:1424` : حفظ القسم

#### `src/pages/templates/TemplatesPage.tsx` (24 lignes)
- `src/pages/templates/TemplatesPage.tsx:33` : تم حذف النموذج بنجاح
- `src/pages/templates/TemplatesPage.tsx:39` : فشل في حذف النموذج: | خطأ غير معروف
- `src/pages/templates/TemplatesPage.tsx:46` : تم تحميل النموذج بنجاح
- `src/pages/templates/TemplatesPage.tsx:49` : فشل في تحميل النموذج: | خطأ غير معروف
- `src/pages/templates/TemplatesPage.tsx:95` : النماذج
- `src/pages/templates/TemplatesPage.tsx:97` : إدارة نماذج الوثائق المتاحة للتحميل والاستخدام
- `src/pages/templates/TemplatesPage.tsx:108` : إضافة نموذج جديد
- `src/pages/templates/TemplatesPage.tsx:117` : كيفية استخدام النماذج:
- `src/pages/templates/TemplatesPage.tsx:119` : يمكن لجميع المستخدمين تحميل النماذج المتاحة وتعديلها حسب احتياجاتهم
- `src/pages/templates/TemplatesPage.tsx:120` : • يمكنك كمدير مكتب الضبط إضافة وتعديل وحذف النماذج
- `src/pages/templates/TemplatesPage.tsx:160` : {template.downloads} تحميل
- `src/pages/templates/TemplatesPage.tsx:165` : بواسطة: {template.uploadedBy.username}
- `src/pages/templates/TemplatesPage.tsx:177` : تحميل
- `src/pages/templates/TemplatesPage.tsx:189` : تعديل
- `src/pages/templates/TemplatesPage.tsx:198` : حذف
- `src/pages/templates/TemplatesPage.tsx:210` : لا توجد نماذج متاحة
- `src/pages/templates/TemplatesPage.tsx:213` : ابدأ بإضافة النموذج الأول للمستخدمين
- `src/pages/templates/TemplatesPage.tsx:214` : لم يتم رفع أي نماذج بعد
- `src/pages/templates/TemplatesPage.tsx:223` : إضافة نموذج جديد
- `src/pages/templates/TemplatesPage.tsx:245` : تأكيد الحذف
- `src/pages/templates/TemplatesPage.tsx:247` : هل أنت متأكد من حذف النموذج "{templateToDelete?.name}"؟
- `src/pages/templates/TemplatesPage.tsx:248` : هذا الإجراء لا يمكن التراجع عنه.
- `src/pages/templates/TemplatesPage.tsx:256` : حذف
- `src/pages/templates/TemplatesPage.tsx:259` : إلغاء

#### `src/pages/trash/TrashPage.tsx` (56 lignes)
- `src/pages/trash/TrashPage.tsx:85` : تمت استعادة العنصر بنجاح
- `src/pages/trash/TrashPage.tsx:90` : حدث خطأ أثناء استعادة العنصر
- `src/pages/trash/TrashPage.tsx:99` : تم الحذف النهائي للعنصر بنجاح
- `src/pages/trash/TrashPage.tsx:105` : حدث خطأ أثناء الحذف النهائي
- `src/pages/trash/TrashPage.tsx:114` : تم إفراغ سلة المحذوفات بنجاح
- `src/pages/trash/TrashPage.tsx:120` : حدث خطأ أثناء إفراغ السلة
- `src/pages/trash/TrashPage.tsx:158` : بريد وارد
- `src/pages/trash/TrashPage.tsx:166` : بريد صادر
- `src/pages/trash/TrashPage.tsx:174` : مجلد
- `src/pages/trash/TrashPage.tsx:182` : رسالة
- `src/pages/trash/TrashPage.tsx:203` : سلة المحذوفات
- `src/pages/trash/TrashPage.tsx:205` : إدارة العناصر المحذوفة واستعادتها أو حذفها نهائياً من النظام
- `src/pages/trash/TrashPage.tsx:219` : تحديث
- `src/pages/trash/TrashPage.tsx:230` : إفراغ السلة
- `src/pages/trash/TrashPage.tsx:249` : الكل
- `src/pages/trash/TrashPage.tsx:270` : البريد الوارد
- `src/pages/trash/TrashPage.tsx:291` : البريد الصادر
- `src/pages/trash/TrashPage.tsx:312` : المجلدات
- `src/pages/trash/TrashPage.tsx:333` : الرسائل
- `src/pages/trash/TrashPage.tsx:349` : بحث في العناصر المحذوفة...
- `src/pages/trash/TrashPage.tsx:362` : جاري تحميل عناصر سلة المحذوفات...
- `src/pages/trash/TrashPage.tsx:369` : تعذر تحميل سلة المحذوفات
- `src/pages/trash/TrashPage.tsx:371` : حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.
- `src/pages/trash/TrashPage.tsx:379` : إعادة المحاولة
- `src/pages/trash/TrashPage.tsx:387` : السلة فارغة
- `src/pages/trash/TrashPage.tsx:390` : لا توجد نتائج تطابق معايير البحث الحالية.
- `src/pages/trash/TrashPage.tsx:391` : لا توجد عناصر محذوفة حالياً.
- `src/pages/trash/TrashPage.tsx:399` : النوع
- `src/pages/trash/TrashPage.tsx:400` : الاسم / الموضوع
- `src/pages/trash/TrashPage.tsx:401` : تاريخ الحذف
- `src/pages/trash/TrashPage.tsx:402` : تم الحذف بواسطة
- `src/pages/trash/TrashPage.tsx:403` : الإجراءات
- `src/pages/trash/TrashPage.tsx:427` : بدون موضوع
- `src/pages/trash/TrashPage.tsx:437` : {item.attachments.length} مرفق
- `src/pages/trash/TrashPage.tsx:448` : رقم المرجع: {item.documentId}
- `src/pages/trash/TrashPage.tsx:465` : من:
- `src/pages/trash/TrashPage.tsx:470` : إلى:
- `src/pages/trash/TrashPage.tsx:473` : مستخدم
- `src/pages/trash/TrashPage.tsx:474` : ،
- `src/pages/trash/TrashPage.tsx:494` : استعادة العنصر
- `src/pages/trash/TrashPage.tsx:497` : استعادة
- `src/pages/trash/TrashPage.tsx:513` : حذف نهائي
- `src/pages/trash/TrashPage.tsx:516` : حذف نهائي
- `src/pages/trash/TrashPage.tsx:541` : تأكيد الحذف النهائي
- `src/pages/trash/TrashPage.tsx:545` : هل أنت متأكد من رغبتك في حذف{' '}
- `src/pages/trash/TrashPage.tsx:546` : "{itemToDelete?.label}" بشكل نهائي؟
- `src/pages/trash/TrashPage.tsx:549` : تحذير: هذا الإجراء لا يمكن التراجع عنه نهائياً وسيتم إزالة كافة الملفات المرتبطة به من القرص.
- `src/pages/trash/TrashPage.tsx:562` : جاري الحذف...
- `src/pages/trash/TrashPage.tsx:565` : حذف نهائي
- `src/pages/trash/TrashPage.tsx:572` : إلغاء
- `src/pages/trash/TrashPage.tsx:590` : تأكيد إفراغ سلة المحذوفات
- `src/pages/trash/TrashPage.tsx:594` : تحذير شديد: سيتم حذف جميع العناصر الموجودة في سلة المحذوفات نهائياً مع كافة المرفقات والملفات من الخادم.
- `src/pages/trash/TrashPage.tsx:597` : لا يمكن استرجاع أي من هذه العناصر أو التراجع عن هذه العملية بأي شكل!
- `src/pages/trash/TrashPage.tsx:610` : جاري الإفراغ...
- `src/pages/trash/TrashPage.tsx:613` : نعم، إفراغ السلة الآن
- `src/pages/trash/TrashPage.tsx:620` : تراجع

#### `src/pages/users/CreateUser.tsx` (17 lignes)
- `src/pages/users/CreateUser.tsx:67` : تم إنشاء المستخدم بنجاح
- `src/pages/users/CreateUser.tsx:76` : فشل في إنشاء المستخدم
- `src/pages/users/CreateUser.tsx:86` : حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت
- `src/pages/users/CreateUser.tsx:91` : يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF)
- `src/pages/users/CreateUser.tsx:127` : جاري تحميل بيانات الأقسام والصلاحيات...
- `src/pages/users/CreateUser.tsx:142` : إضافة مستخدم جديد
- `src/pages/users/CreateUser.tsx:143` : إنشاء حساب مستخدم جديد وتحديد دوره والأقسام التابع لها
- `src/pages/users/CreateUser.tsx:152` : العودة لقائمة المستخدمين
- `src/pages/users/CreateUser.tsx:164` : الصورة الشخصية
- `src/pages/users/CreateUser.tsx:167` : اختيارية
- `src/pages/users/CreateUser.tsx:176` : معاينة الصورة
- `src/pages/users/CreateUser.tsx:190` : حذف الصورة
- `src/pages/users/CreateUser.tsx:191` : حذف الصورة
- `src/pages/users/CreateUser.tsx:211` : تغيير الصورة المحددة | اختيار صورة من الجهاز
- `src/pages/users/CreateUser.tsx:222` : إلغاء التحديد
- `src/pages/users/CreateUser.tsx:230` : الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت
- `src/pages/users/CreateUser.tsx:236` : الحد الأقصى المسموح به لحجم الصورة 5 ميجابايت • الصيغ المدعومة: JPG, PNG, GIF

#### `src/pages/users/EditUser.tsx` (32 lignes)
- `src/pages/users/EditUser.tsx:42` : تم تحديث المستخدم بنجاح
- `src/pages/users/EditUser.tsx:49` : فشل في تحديث المستخدم
- `src/pages/users/EditUser.tsx:59` : تم رفع وتحديث الصورة الشخصية بنجاح
- `src/pages/users/EditUser.tsx:66` : فشل في رفع الصورة
- `src/pages/users/EditUser.tsx:75` : حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت
- `src/pages/users/EditUser.tsx:79` : يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF)
- `src/pages/users/EditUser.tsx:122` : جاري تحميل بيانات المستخدم...
- `src/pages/users/EditUser.tsx:134` : المستخدم غير موجود
- `src/pages/users/EditUser.tsx:135` : تعذر العثور على الحساب المطلوب في قاعدة البيانات.
- `src/pages/users/EditUser.tsx:148` : غير مصرح لك بالوصول
- `src/pages/users/EditUser.tsx:149` : ليس لديك الصلاحيات الكافية لتعديل بيانات هذا المستخدم.
- `src/pages/users/EditUser.tsx:166` : تعديل بيانات المستخدم: {user.username}
- `src/pages/users/EditUser.tsx:168` : تحديث الدور والصلاحيات والأقسام التابعة للحساب
- `src/pages/users/EditUser.tsx:177` : العودة للمستخدمين
- `src/pages/users/EditUser.tsx:188` : الصورة الشخصية للحساب
- `src/pages/users/EditUser.tsx:215` : تغيير الصورة المحددة | اختيار صورة جديدة
- `src/pages/users/EditUser.tsx:226` : جاري رفع الصورة... | حفظ الصورة الجديدة
- `src/pages/users/EditUser.tsx:233` : الصورة المختارة: {photoFile.name}
- `src/pages/users/EditUser.tsx:234` : الحجم: {(photoFile.size / 1024 / 1024).toFixed(2)} ميجابايت
- `src/pages/users/EditUser.tsx:249` : معلومات الحساب الإضافية
- `src/pages/users/EditUser.tsx:255` : تاريخ الإنشاء
- `src/pages/users/EditUser.tsx:260` : الحالة الحالية
- `src/pages/users/EditUser.tsx:266` : حساب نشط | حساب معطل
- `src/pages/users/EditUser.tsx:271` : الدور المسجل
- `src/pages/users/EditUser.tsx:275` : مدير الإدارة
- `src/pages/users/EditUser.tsx:279` : مدير
- `src/pages/users/EditUser.tsx:283` : مدير قسم
- `src/pages/users/EditUser.tsx:287` : مدير المكتب
- `src/pages/users/EditUser.tsx:291` : مستخدم
- `src/pages/users/EditUser.tsx:298` : الأقسام المرتبطة
- `src/pages/users/EditUser.tsx:301` : ،
- `src/pages/users/EditUser.tsx:302` : لا يوجد قسم محدد

#### `src/services/aiChatService.ts` (1 lignes)
- `src/services/aiChatService.ts:61` : وثيقة تجريبية: ${query}

#### `src/services/aiSummaryService.ts` (4 lignes)
- `src/services/aiSummaryService.ts:48` : خدمة الذكاء الاصطناعي المحلي غير مشغلة حالياً. يرجى التحقق من تشغيل الخدمة.
- `src/services/aiSummaryService.ts:51` : استغرقت عملية التلخيص وقتاً أطول من المتوقع. يرجى إعادة المحاولة.
- `src/services/aiSummaryService.ts:54` : النص المستخرج قصير جداً لإنشاء تلخيص ذكي (الحد الأدنى 50 حرفاً).
- `src/services/aiSummaryService.ts:57` : حدث خطأ في معالجة مخرجات النموذج الذكي. يرجى المحاولة مرة أخرى.

#### `src/services/aiTranslationService.ts` (4 lignes)
- `src/services/aiTranslationService.ts:47` : خدمة الذكاء الاصطناعي المحلي غير مشغلة حالياً. يرجى التحقق من تشغيل الخدمة.
- `src/services/aiTranslationService.ts:50` : استغرقت عملية الترجمة وقتاً أطول من المتوقع. يرجى إعادة المحاولة.
- `src/services/aiTranslationService.ts:53` : النص المطلوب ترجمته قصير جداً.
- `src/services/aiTranslationService.ts:56` : تعذر استخراج الترجمة من النموذج. يرجى إعادة المحاولة.

#### `src/services/auditService.ts` (7 lignes)
- `src/services/auditService.ts:102` : ليس لديك صلاحية لعرض سجلات التدقيق.
- `src/services/auditService.ts:105` : فشل في جلب سجلات التدقيق. يرجى المحاولة مرة أخرى.
- `src/services/auditService.ts:133` : انتهت مهلة التصدير. يرجى تقليل نطاق البيانات والمحاولة مرة أخرى.
- `src/services/auditService.ts:135` : معايير التصدير غير صحيحة. يرجى التحقق من المرشحات.
- `src/services/auditService.ts:137` : خطأ في الخادم أثناء التصدير. يرجى المحاولة لاحقاً.
- `src/services/auditService.ts:140` : فشل في تصدير سجلات التدقيق. يرجى المحاولة مرة أخرى.
- `src/services/auditService.ts:153` : فشل في جلب تاريخ المستند. يرجى المحاولة مرة أخرى.

#### `src/services/carteInstructionService.ts` (62 lignes)
- `src/services/carteInstructionService.ts:270` : صورة
- `src/services/carteInstructionService.ts:283` : صورة
- `src/services/carteInstructionService.ts:295` : بطاقة إرشادات
- `src/services/carteInstructionService.ts:313` : المعرف الوحيد: ${p.matricule || | }   |   ب.ت.و: ${p.cin ||
- `src/services/carteInstructionService.ts:321` : تاريخ الاستخراج: ${formatArabicDate(new Date())}
- `src/services/carteInstructionService.ts:357` : 1. المعطيات الشخصية والوضعية الإدارية
- `src/services/carteInstructionService.ts:370` : بـ ${p.lieuNaissance}
- `src/services/carteInstructionService.ts:374` : أعزب / عزباء
- `src/services/carteInstructionService.ts:375` : متزوج(ة)
- `src/services/carteInstructionService.ts:376` : مطلق(ة)
- `src/services/carteInstructionService.ts:377` : أرمل(ة)
- `src/services/carteInstructionService.ts:403` : الاسم | اللقب
- `src/services/carteInstructionService.ts:404` : وابن (اسم الجد) | ابن (اسم الأب)
- `src/services/carteInstructionService.ts:405` : فصيلة الدم | وأمه (اسم الأم)
- `src/services/carteInstructionService.ts:406` : الحالة المدنية | تاريخ ومكان الولادة
- `src/services/carteInstructionService.ts:407` : رقم ب.ت.و | عدد الأبناء
- `src/services/carteInstructionService.ts:408` : الرتبة الحالية | المعرف الوحيد
- `src/services/carteInstructionService.ts:409` : الوحدة / المصلحة | الجيش / السلاح
- `src/services/carteInstructionService.ts:410` : الخطة الوظيفية | تاريخ الانتداب / التطوع
- `src/services/carteInstructionService.ts:411` : الهاتف الشخصي | العنوان ومقر السكنى
- `src/services/carteInstructionService.ts:446` : 2. الأشخاص الواجب إعلامهم عند الحاجة
- `src/services/carteInstructionService.ts:471` : العنوان ومقر الإقامة | رقم الهاتف | صلة القرابة | الاسم واللقب
- `src/services/carteInstructionService.ts:525` : 3. التدرج في الرتب (الترقيات)
- `src/services/carteInstructionService.ts:532` : ملاحظات / السبب | المرجع / الأمر | تاريخ الترقية | الرتبة الجديدة | الرتبة السابقة
- `src/services/carteInstructionService.ts:543` : لا توجد ترقيات مسجلة
- `src/services/carteInstructionService.ts:591` : 4. الخطط الوظيفية والمسؤوليات المباشرة
- `src/services/carteInstructionService.ts:598` : المرجع / ملاحظات | إلى تاريخ | من تاريخ | مكان التعيين / الوحدة | الخطة الوظيفية / المسؤولية
- `src/services/carteInstructionService.ts:603` : إلى الآن
- `src/services/carteInstructionService.ts:609` : لا توجد خطط وظيفية مسجلة
- `src/services/carteInstructionService.ts:657` : 5. التربصات والتكوين المنجز (بتونس وبالخارج)
- `src/services/carteInstructionService.ts:688` : النتيجة / الملاحظات
- `src/services/carteInstructionService.ts:689` : المدة
- `src/services/carteInstructionService.ts:690` : تاريخ النهاية
- `src/services/carteInstructionService.ts:691` : تاريخ البداية
- `src/services/carteInstructionService.ts:692` : الموقع
- `src/services/carteInstructionService.ts:693` : المؤسسة / المكان
- `src/services/carteInstructionService.ts:694` : موضوع التربص / الدورة
- `src/services/carteInstructionService.ts:706` : بالخارج (${st.pays ||
- `src/services/carteInstructionService.ts:707` : بتونس
- `src/services/carteInstructionService.ts:710` : ناجح
- `src/services/carteInstructionService.ts:711` : راسب
- `src/services/carteInstructionService.ts:712` : في الانتظار
- `src/services/carteInstructionService.ts:718` : ${st.duree} يوم
- `src/services/carteInstructionService.ts:727` : لا توجد دورات تكوينية أو تربصات مسجلة
- `src/services/carteInstructionService.ts:778` : 6. الشهائد العلمية والتكوينية
- `src/services/carteInstructionService.ts:786` : المرجع / ملاحظات
- `src/services/carteInstructionService.ts:787` : المؤسسة المسندة
- `src/services/carteInstructionService.ts:788` : تاريخ الشهادة
- `src/services/carteInstructionService.ts:789` : موضوع الشهادة / الاختصاص
- `src/services/carteInstructionService.ts:790` : نوع الشهادة
- `src/services/carteInstructionService.ts:803` : لا توجد شهادات علمية مسجلة
- `src/services/carteInstructionService.ts:851` : 7. العقوبات التأديبية
- `src/services/carteInstructionService.ts:859` : المرجع / ملاحظات
- `src/services/carteInstructionService.ts:860` : سبب العقوبة
- `src/services/carteInstructionService.ts:861` : نوع العقوبة
- `src/services/carteInstructionService.ts:862` : عدد الأيام / المدة
- `src/services/carteInstructionService.ts:863` : تاريخ العقوبة
- `src/services/carteInstructionService.ts:872` : ${sc.nombreJours} يوم
- `src/services/carteInstructionService.ts:876` : لا توجد عقوبات تأديبية مسجلة
- `src/services/carteInstructionService.ts:933` : بطاقة إرشادات — ${p.prenom ||
- `src/services/carteInstructionService.ts:939` : صفحة ${i} من ${totalPages}
- `src/services/carteInstructionService.ts:950` : بطاقة_إرشادات_${sanitizedPrenom}_${sanitizedNom}.pdf

#### `src/services/dragDropService.ts` (2 lignes)
- `src/services/dragDropService.ts:37` : تم نقل المستند إلى المجلد بنجاح | تم إزالة المستند من المجلد بنجاح
- `src/services/dragDropService.ts:45` : فشل في نقل المستند

#### `src/services/hr/personnelDocumentApi.ts` (6 lignes)
- `src/services/hr/personnelDocumentApi.ts:45` : فشل في ربط الوثيقة بالموظف
- `src/services/hr/personnelDocumentApi.ts:58` : فشل في تحميل وثائق الموظف
- `src/services/hr/personnelDocumentApi.ts:72` : فشل في تحميل الموظفين المرتبطين بالوثيقة
- `src/services/hr/personnelDocumentApi.ts:86` : فشل في تحديث بيانات الربط
- `src/services/hr/personnelDocumentApi.ts:99` : فشل في إلغاء ربط الوثيقة
- `src/services/hr/personnelDocumentApi.ts:121` : فشل في تحميل وثائق حسابك

#### `src/services/offlineOcrService.ts` (11 lignes)
- `src/services/offlineOcrService.ts:131` : لا
- `src/services/offlineOcrService.ts:132` : الله
- `src/services/offlineOcrService.ts:133` : تع
- `src/services/offlineOcrService.ts:134` : لآ
- `src/services/offlineOcrService.ts:135` : لأ
- `src/services/offlineOcrService.ts:136` : لإ
- `src/services/offlineOcrService.ts:139` : ا
- `src/services/offlineOcrService.ts:140` : ي
- `src/services/offlineOcrService.ts:146` : ،
- `src/services/offlineOcrService.ts:147` : ؛
- `src/services/offlineOcrService.ts:148` : ؟

#### `src/services/trashService.ts` (2 lignes)
- `src/services/trashService.ts:57` : عنصر بدون عنوان
- `src/services/trashService.ts:66` : مستخدم

#### `src/utils/activityUtils.ts` (5 lignes)
- `src/utils/activityUtils.ts:18` : متأخر
- `src/utils/activityUtils.ts:26` : اليوم
- `src/utils/activityUtils.ts:34` : غداً
- `src/utils/activityUtils.ts:42` : خلال يومين
- `src/utils/activityUtils.ts:50` : خلال 3 أيام

#### `src/utils/arabicDateFormatter.ts` (22 lignes)
- `src/utils/arabicDateFormatter.ts:8` : جانفي | فيفري | مارس | أفريل | ماي | جوان
- `src/utils/arabicDateFormatter.ts:9` : جويلية | أوت | سبتمبر | أكتوبر | نوفمبر | ديسمبر
- `src/utils/arabicDateFormatter.ts:13` : الأحد | الإثنين | الثلاثاء | الأربعاء | الخميس | الجمعة | السبت
- `src/utils/arabicDateFormatter.ts:18` : تاريخ غير محدد
- `src/utils/arabicDateFormatter.ts:23` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:35` : تاريخ غير محدد
- `src/utils/arabicDateFormatter.ts:40` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:49` : ${day} ${month} ${year} في ${hours}:${minutes}
- `src/utils/arabicDateFormatter.ts:54` : تاريخ غير محدد
- `src/utils/arabicDateFormatter.ts:59` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:65` : ${weekDay}، ${formattedDate}
- `src/utils/arabicDateFormatter.ts:70` : تاريخ غير محدد
- `src/utils/arabicDateFormatter.ts:83` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:87` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:95` : تاريخ غير محدد
- `src/utils/arabicDateFormatter.ts:100` : تاريخ غير صحيح
- `src/utils/arabicDateFormatter.ts:112` : منذ ${diffInDays} ${diffInDays === 1 ? | أيام
- `src/utils/arabicDateFormatter.ts:114` : منذ ${diffInHours} ${diffInHours === 1 ? | ساعات
- `src/utils/arabicDateFormatter.ts:116` : منذ ${diffInMinutes} ${diffInMinutes === 1 ? | دقائق
- `src/utils/arabicDateFormatter.ts:118` : الآن
- `src/utils/arabicDateFormatter.ts:124` : غير محدد
- `src/utils/arabicDateFormatter.ts:129` : غير صحيح

#### `src/utils/attendanceExportUtils.ts` (65 lignes)
- `src/utils/attendanceExportUtils.ts:14` : تقرير الحضور اليومي
- `src/utils/attendanceExportUtils.ts:154` : عطلة سنوية (Congé annuel)
- `src/utils/attendanceExportUtils.ts:155` : عطلة مرضية (Maladie)
- `src/utils/attendanceExportUtils.ts:156` : غياب غير مبرر (Injustifiée)
- `src/utils/attendanceExportUtils.ts:157` : استرجاع (Récupération)
- `src/utils/attendanceExportUtils.ts:158` : مهمة عمل (Mission)
- `src/utils/attendanceExportUtils.ts:159` : تكوين (Formation)
- `src/utils/attendanceExportUtils.ts:160` : عطلة أمومة (Maternité)
- `src/utils/attendanceExportUtils.ts:161` : عطلة استثنائية (Exceptionnel)
- `src/utils/attendanceExportUtils.ts:162` : بدون راتب (Sans solde)
- `src/utils/attendanceExportUtils.ts:195` : نظام إدارة المستندات
- `src/utils/attendanceExportUtils.ts:233` : المصلحة / القسم : ${options.departmentName}
- `src/utils/attendanceExportUtils.ts:332` : صفحة ${i} من ${totalPages}
- `src/utils/attendanceExportUtils.ts:342` : تم الإنشاء بواسطة نظام إدارة المستندات
- `src/utils/attendanceExportUtils.ts:372` : تقرير الحضور اليومي
- `src/utils/attendanceExportUtils.ts:391` : إجمالي المستخدمين
- `src/utils/attendanceExportUtils.ts:392` : الحاضرون
- `src/utils/attendanceExportUtils.ts:393` : الغيابات
- `src/utils/attendanceExportUtils.ts:394` : غير مسجلين
- `src/utils/attendanceExportUtils.ts:395` : نسبة الحضور
- `src/utils/attendanceExportUtils.ts:415` : وصول: ${att.heureArrivee} | حاضر
- `src/utils/attendanceExportUtils.ts:422` : حاضر
- `src/utils/attendanceExportUtils.ts:431` : غياب
- `src/utils/attendanceExportUtils.ts:438` : غائب
- `src/utils/attendanceExportUtils.ts:452` : لم يسجل
- `src/utils/attendanceExportUtils.ts:459` : الرقم
- `src/utils/attendanceExportUtils.ts:460` : الاسم واللقب
- `src/utils/attendanceExportUtils.ts:461` : ر.ب.ت (CIN)
- `src/utils/attendanceExportUtils.ts:462` : الوظيفة / الرتبة
- `src/utils/attendanceExportUtils.ts:463` : المصلحة / القسم
- `src/utils/attendanceExportUtils.ts:464` : الحالة
- `src/utils/attendanceExportUtils.ts:465` : ملاحظات / السبب
- `src/utils/attendanceExportUtils.ts:527` : جانفي | فيفري | مارس | أفريل | ماي | جوان
- `src/utils/attendanceExportUtils.ts:528` : جويلية | أوت | سبتمبر | أكتوبر | نوفمبر | ديسمبر
- `src/utils/attendanceExportUtils.ts:541` : شهر ${data.month}
- `src/utils/attendanceExportUtils.ts:542` : تقرير الحضور الشهري
- `src/utils/attendanceExportUtils.ts:561` : إجمالي الموظفين
- `src/utils/attendanceExportUtils.ts:562` : مجموع أيام الحضور
- `src/utils/attendanceExportUtils.ts:563` : مجموع أيام الغياب
- `src/utils/attendanceExportUtils.ts:564` : نسبة الحضور الإجمالية
- `src/utils/attendanceExportUtils.ts:577` : ${formatMotifLabel(motif)}: ${count}ي
- `src/utils/attendanceExportUtils.ts:597` : الرقم
- `src/utils/attendanceExportUtils.ts:598` : الاسم واللقب
- `src/utils/attendanceExportUtils.ts:599` : ر.ب.ت
- `src/utils/attendanceExportUtils.ts:600` : الوظيفة / الرتبة
- `src/utils/attendanceExportUtils.ts:601` : المصلحة
- `src/utils/attendanceExportUtils.ts:602` : أيام الحضور
- `src/utils/attendanceExportUtils.ts:603` : أيام الغياب
- `src/utils/attendanceExportUtils.ts:604` : النسبة
- `src/utils/attendanceExportUtils.ts:605` : تفاصيل الغياب والخصم
- `src/utils/attendanceExportUtils.ts:676` : تقرير الحضور السنوي
- `src/utils/attendanceExportUtils.ts:693` : إجمالي الموظفين
- `src/utils/attendanceExportUtils.ts:694` : الرصيد الافتراضي | ${data.soldeAnnuelDefaut || 45} يوم
- `src/utils/attendanceExportUtils.ts:695` : مجموع الأيام المخصومة
- `src/utils/attendanceExportUtils.ts:696` : معدل الرصيد المتبقي | ${avgSolde} يوم
- `src/utils/attendanceExportUtils.ts:728` : الرقم
- `src/utils/attendanceExportUtils.ts:729` : الاسم واللقب
- `src/utils/attendanceExportUtils.ts:730` : ر.ب.ت
- `src/utils/attendanceExportUtils.ts:731` : الوظيفة
- `src/utils/attendanceExportUtils.ts:732` : المصلحة
- `src/utils/attendanceExportUtils.ts:733` : الرصيد الأولي
- `src/utils/attendanceExportUtils.ts:734` : الأيام المخصومة
- `src/utils/attendanceExportUtils.ts:735` : الرصيد المتبقي
- `src/utils/attendanceExportUtils.ts:736` : مجموع الغيابات
- `src/utils/attendanceExportUtils.ts:737` : تفاصيل الاستهلاك

#### `src/utils/credentialsGenerator.ts` (5 lignes)
- `src/utils/credentialsGenerator.ts:62` : مدير الإدارة
- `src/utils/credentialsGenerator.ts:63` : مدير النظام
- `src/utils/credentialsGenerator.ts:64` : مدير قسم
- `src/utils/credentialsGenerator.ts:65` : مكتب الضبط
- `src/utils/credentialsGenerator.ts:66` : موظف

#### `src/utils/dateFormatter.ts` (3 lignes)
- `src/utils/dateFormatter.ts:21` : اليوم
- `src/utils/dateFormatter.ts:23` : أمس
- `src/utils/dateFormatter.ts:25` : منذ ${diffInDays} أيام

#### `src/utils/departmentLabels.test.ts` (4 lignes)
- `src/utils/departmentLabels.test.ts:11` : traduit BO en مكتب الضبط
- `src/utils/departmentLabels.test.ts:12` : مكتب الضبط
- `src/utils/departmentLabels.test.ts:15` : traduit Direction en الإدارة العامة
- `src/utils/departmentLabels.test.ts:16` : الإدارة العامة

#### `src/utils/departmentLabels.ts` (6 lignes)
- `src/utils/departmentLabels.ts:46` : مكتب الضبط
- `src/utils/departmentLabels.ts:47` : الإدارة العامة
- `src/utils/departmentLabels.ts:48` : الموارد البشرية
- `src/utils/departmentLabels.ts:59` : مكتب الضبط
- `src/utils/departmentLabels.ts:62` : الإدارة العامة
- `src/utils/departmentLabels.ts:65` : الموارد البشرية

#### `src/utils/errorMessages.test.ts` (5 lignes)
- `src/utils/errorMessages.test.ts:7` : الموظف غير موجود
- `src/utils/errorMessages.test.ts:11` : ليس لديك صلاحية للقيام بهذا الإجراء
- `src/utils/errorMessages.test.ts:12` : العنصر المطلوب غير موجود
- `src/utils/errorMessages.test.ts:13` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.test.ts:17` : حدث خطأ غير متوقع

#### `src/utils/errorMessages.ts` (49 lignes)
- `src/utils/errorMessages.ts:9` : يجب تسجيل الدخول مرة أخرى
- `src/utils/errorMessages.ts:10` : يجب تسجيل الدخول مرة أخرى
- `src/utils/errorMessages.ts:11` : بيانات الدخول غير صحيحة
- `src/utils/errorMessages.ts:12` : البريد أو كلمة المرور غير صحيحة
- `src/utils/errorMessages.ts:13` : المستخدم غير موجود
- `src/utils/errorMessages.ts:14` : المستخدم غير موجود
- `src/utils/errorMessages.ts:15` : انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى
- `src/utils/errorMessages.ts:16` : الجلسة غير صالحة
- `src/utils/errorMessages.ts:19` : ليس لديك صلاحية للقيام بهذا الإجراء
- `src/utils/errorMessages.ts:20` : ليس لديك صلاحية للقيام بهذا الإجراء
- `src/utils/errorMessages.ts:21` : الوصول ممنوع
- `src/utils/errorMessages.ts:22` : الصلاحيات غير كافية
- `src/utils/errorMessages.ts:25` : العنصر المطلوب غير موجود
- `src/utils/errorMessages.ts:26` : الوثيقة غير موجودة
- `src/utils/errorMessages.ts:27` : الموظف غير موجود
- `src/utils/errorMessages.ts:28` : القسم غير موجود
- `src/utils/errorMessages.ts:29` : القسم غير موجود
- `src/utils/errorMessages.ts:32` : التاريخ غير صحيح
- `src/utils/errorMessages.ts:33` : التاريخ غير صحيح
- `src/utils/errorMessages.ts:34` : المعرف غير صحيح
- `src/utils/errorMessages.ts:35` : حقل مطلوب مفقود
- `src/utils/errorMessages.ts:36` : هذا الحقل مطلوب
- `src/utils/errorMessages.ts:37` : التنسيق غير صحيح
- `src/utils/errorMessages.ts:38` : هذا العنصر موجود مسبقاً
- `src/utils/errorMessages.ts:39` : هذا العنصر موجود مسبقاً
- `src/utils/errorMessages.ts:40` : قيمة مكررة
- `src/utils/errorMessages.ts:43` : لا يمكن الحذف
- `src/utils/errorMessages.ts:44` : لا يمكن التعديل
- `src/utils/errorMessages.ts:45` : لا يمكن لمدير الإدارة القيام بهذا الإجراء
- `src/utils/errorMessages.ts:46` : يُسمح بمدير إدارة واحد فقط
- `src/utils/errorMessages.ts:49` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.ts:50` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.ts:51` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.ts:52` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.ts:55` : خطأ في الاتصال بالشبكة
- `src/utils/errorMessages.ts:56` : انتهت مدة الطلب. يرجى المحاولة مرة أخرى
- `src/utils/errorMessages.ts:68` : حدث خطأ غير متوقع
- `src/utils/errorMessages.ts:113` : البيانات المدخلة غير صحيحة
- `src/utils/errorMessages.ts:114` : يجب تسجيل الدخول مرة أخرى
- `src/utils/errorMessages.ts:115` : ليس لديك صلاحية للقيام بهذا الإجراء
- `src/utils/errorMessages.ts:116` : العنصر المطلوب غير موجود
- `src/utils/errorMessages.ts:117` : هذا العنصر موجود مسبقاً
- `src/utils/errorMessages.ts:118` : حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت
- `src/utils/errorMessages.ts:119` : البيانات المدخلة غير مكتملة
- `src/utils/errorMessages.ts:120` : عدد الطلبات كبير جداً. يرجى المحاولة بعد قليل
- `src/utils/errorMessages.ts:121` : خطأ داخلي في النظام
- `src/utils/errorMessages.ts:122` : خطأ في الاتصال بالخدمة
- `src/utils/errorMessages.ts:123` : الخدمة غير متوفرة حالياً
- `src/utils/errorMessages.ts:124` : حدث خطأ غير متوقع

#### `src/utils/pdfExportUtils.ts` (3 lignes)
- `src/utils/pdfExportUtils.ts:145` : الجمهورية الجزائرية الديمقراطية الشعبية
- `src/utils/pdfExportUtils.ts:181` : تاريخ التصدير: ${formatArabicDateTime(new Date())}
- `src/utils/pdfExportUtils.ts:273` : صفحة ${i} من ${totalPages}

#### `src/utils/relativeTime.test.ts` (4 lignes)
- `src/utils/relativeTime.test.ts:5` : الآن
- `src/utils/relativeTime.test.ts:6` : الآن
- `src/utils/relativeTime.test.ts:9` : منذ X دقيقة
- `src/utils/relativeTime.test.ts:11` : منذ

#### `src/utils/relativeTime.ts` (5 lignes)
- `src/utils/relativeTime.ts:6` : الآن
- `src/utils/relativeTime.ts:7` : منذ ${Math.floor(diff / 60)} دقيقة
- `src/utils/relativeTime.ts:8` : منذ ${Math.floor(diff / 3600)} ساعة
- `src/utils/relativeTime.ts:9` : أمس
- `src/utils/relativeTime.ts:10` : منذ ${Math.floor(diff / 86400)} أيام

#### `src/utils/userAccessPdfGenerator.ts` (11 lignes)
- `src/utils/userAccessPdfGenerator.ts:96` : الإدارة العامة للتشفير
- `src/utils/userAccessPdfGenerator.ts:102` : بطاقة الاتصال بالنظام
- `src/utils/userAccessPdfGenerator.ts:147` : الاسم الكامل
- `src/utils/userAccessPdfGenerator.ts:148` : القسم الإداري
- `src/utils/userAccessPdfGenerator.ts:149` : الصفة الوظيفية | موظف
- `src/utils/userAccessPdfGenerator.ts:152` : اسم المستخدم
- `src/utils/userAccessPdfGenerator.ts:153` : كلمة المرور
- `src/utils/userAccessPdfGenerator.ts:157` : رابط الدخول
- `src/utils/userAccessPdfGenerator.ts:160` : تاريخ الإصدار
- `src/utils/userAccessPdfGenerator.ts:167` : ⚠ سري وشخصي — يُسلّم باليد لصاحبه ويجب تغيير كلمة المرور عند أول تسجيل دخول
- `src/utils/userAccessPdfGenerator.ts:215` : خط القص

</details>

---

## 2. Cohérence terminologique par concept métier

L'audit met en évidence une forte fragmentation lexicale entre `ar.json` et les chaînes codées en dur, ainsi qu'à l'intérieur même de `ar.json`.

### 2.1 Courrier entrant
- **Variantes constatées :**
  1. **الوثائق الواردة / الوثيقة الواردة / وثيقة واردة** — forme majoritaire dans `ar.json` (18 occ. : `ar.json:12,62,92,93,186,189,190,198,986`) et dans le code (`BackupSettingsPage.tsx:375,412,595`, `SettingsPage.tsx:888`, `ViewOutgoingDocument.tsx:797,835,1041`, `EditIncomingDocument.tsx:93`).
  2. **المراسلات الواردة / المراسلة الواردة / مراسلة واردة** — utilisée dans les sous-titres, fiches d'audit et RH (`ar.json:61,200,209,256,323,338,732`, `AdminDepartmentDashboard.tsx:128,255`, `DocumentCategoryManager.tsx:164`, `HubLayouts.tsx:72`, `MyDocumentsList.tsx:144`, `AddPersonnelDocumentDialog.tsx:189`, `PersonnelDocumentsList.tsx:184`).
  3. **الوثائق والمراسلات الواردة** — forme hybride redondante dans les titres de page/export (`ar.json:957,959,968`).
  4. **المستندات الواردة / مستند وارد** — utilisée dans le menu latéral et les fils d'Ariane (`ar.json:13,196,627`, `FolderDocumentsList.tsx:64,128`).
  5. **البريد الوارد** — utilisée uniquement dans la corbeille et la création de département (`TrashPage.tsx:158,270`, `CreateDepartment.tsx:62`).
  6. **المعاملات الواردة** — occurrence isolée (`SettingsPage.tsx:686`).
  7. **سجل الوارد / الوارد** (`ar.json:203,282,979`).

### 2.2 Courrier sortant
- **Variantes constatées :**
  1. **الوثائق الصادرة / الوثيقة الصادرة / وثيقة صادرة** — forme majoritaire (`ar.json:14,119,144,145,235,269,301,304,305,395,396,417,1127`, `BackupSettingsPage.tsx:420`, `SettingsPage.tsx:899`, `EditOutgoingDocument.tsx:93`, `ViewOutgoingDocument.tsx:956,991,1066,1350`).
  2. **المراسلات الصادرة / المراسلة الصادرة / مراسلة صادرة** (`ar.json:315,339,341`, `SetupWizardPage.tsx:837`, `DocumentCategoryManager.tsx:177`, `ViewOutgoingDocument.tsx:842,1101,1123,1236`, `AddPersonnelDocumentDialog.tsx:205`).
  3. **الوثائق والمراسلات الصادرة** — forme doublée dans `outgoing.page.title` et l'export PDF (`ar.json:1061,1072`).
  4. **المستندات الصادرة / مستند صادر** — menu latéral et fil d'Ariane (`ar.json:15,310,628`, `FolderDocumentsList.tsx:143`).
  5. **البريد الصادر** — uniquement dans la corbeille (`TrashPage.tsx:166,291`).

### 2.3 Bureau d'ordre
- **Variantes constatées (6 désignations différentes pour le même concept/rôle) :**
  1. **مكتب الضبط** — dominante dans le code dur (`DocumentOptionsPage.tsx:128`, `SettingsPage.tsx:1053,1109`, `SetupWizardPage.tsx:725,1223`, `OrganizationChartPage.tsx:310`, `TemplatesPage.tsx:120`, `departmentLabels.ts:46,59`, `InlineCreateUserModal.tsx:302`) et `ar.json:1063`.
  2. **مكتب الضبط والتوثيق** — bordereau d'impression (`ar.json:326`).
  3. **مكتب التنسيق** — module Messagerie et table des rôles (`ar.json:563,576,620`, `CrossRoleMessagingInfo.tsx:21,82`).
  4. **مدير المكتب** / **مدراء المكاتب** — gestion des utilisateurs et statistiques (`ar.json:26,811,816,928,940`, `EditUser.tsx:287`, `DepartmentUsers.tsx:163`, `UserForm.tsx:169`).
  5. **مركز رقمنة الوثائق** — message d'accueil du tableau de bord (`ar.json:3` pour `welcomeBureauOrdre`).
  6. **Libellés hybrides / anglais** : `مكتب الضبط (BO)` (`SettingsPage.tsx:1109`), `مكتب الضبط (AdminTuningDesk)` (`DocumentOptionsPage.tsx:128`, `InlineCreateUserModal.tsx:302`), `مدير المكتب (AdminTuningDesk)` (`ar.json:811,928`), `مكتب التنسيق (TuningDesk)` (`CrossRoleMessagingInfo.tsx:82`), `Bureau d'Ordre` en français (`DepartmentsPage.tsx:562,702`).

### 2.4 Département
- **Variantes constatées :**
  1. **قسم / القسم / الأقسام** — forme standard quasi générale (60 occ. dans `ar.json:4,7,8,16,17,78`, 153+ occ. dans `src/` : `DepartmentsPage.tsx:345`, `SettingsPage.tsx:1101`).
  2. **مصلحة / المصلحة / المصالح** — utilisée en parallèle dans les vues courrier et options (`ar.json:229,284,318,324,348,1158,1159`, `DocumentOptionsPage.tsx:196`, `ViewOutgoingDocument.tsx:620,1280`, `SetupWizardPage.tsx:1044`).
  3. **الوحدة الوظيفية / الوحدات** (`ar.json:1252`, `DepartmentsPage.tsx:152,158`, `DocumentOptionsPage.tsx:196`).
  4. **الإدارة / الإدارة العامة** — ambiguë car utilisée à la fois pour l'entité organisationnelle (`SettingsPage.tsx:1117`, `departmentLabels.ts:47,62`) et pour le rôle `Director` (`ar.json:170,808`).

### 2.5 Dossier
- **Variantes constatées :**
  1. **مجلد / المجلد / المجلدات** — forme dominante pour les dossiers de classement (`ar.json:20,21,54,162,191,241,243,260,583-615`, `TrashPage.tsx:174,312`, `EnhancedFolderTree.tsx`).
  2. **ملف / الملف / الملفات** — utilisé tantôt pour un fichier informatique (`ar.json:85,107,183`), tantôt pour un dossier thématique ou un dossier personnel RH (`ar.json:244,432,437`, `PersonnelListPage`, `users.form.choosePersonnelFile` à `ar.json:884`, `personnel.toasts.deleteSuccess` à `ar.json:1165`).
  3. **بطاقة** — employé dans « بطاقة الموظف » (`ar.json:881`, `PersonnelDetailPage.tsx:207`) et « بطاقة المعاينة / بطاقة تقنية » (`ar.json:200,315,332`).

### 2.6 Corbeille
- **Variantes constatées :**
  1. **سلة المحذوفات** — unique forme utilisée (`ar.json:653`, `TrashPage.tsx:114,203,362,369,590,594`).
  2. **السلة** — forme abrégée dans les actions/messages de la même page (`TrashPage.tsx:120,230,387,613`).

### 2.7 Assignation
- **Variantes constatées (8 verbes/noms différents) :**
  1. **تعيين** — assigner un responsable (`ar.json:246,250,261,286,372,389,419,420`, `ResponsibleAssignmentNotification.tsx:32`).
  2. **توجيه** — orienter vers des départements/services (`ar.json:227,230,284,1153,1160,1163`, `ViewOutgoingDocument.tsx:634,665,1291`, `SettingsPage.tsx:670`).
  3. **تحويل** — transférer un courrier (`ar.json:261,1045,1046,1091,1092,1153,1163`).
  4. **تخصيص** — attribuer aux départements ou rôle RH/BO (`ar.json:50,53,1252`, `SettingsPage.tsx:658,1029`, `AdminDepartmentDashboard.tsx:41`, `SetupWizardPage.tsx:800`).
  5. **ربط** — lier une réponse ou un employé ou un compte (`ar.json:393,394,423,425,433,836`, `ViewOutgoingDocument.tsx:1343`, `MyProfilePage.tsx:141`).
  6. **إسناد** — affecter des utilisateurs ou rôle (`SettingsPage.tsx:702`, `InstallationGuidePage.tsx:84`, `DepartmentsPage.tsx:881`, `UserForm.tsx:626`, `DepartmentForm.tsx:137`).
  7. **تكليف** — contexte poste RH (`PersonnelDetailPage.tsx:911,930`, `PosteFormDialog.tsx:130,137,209`).
  8. **تحديد المسؤول** (`ar.json:56`) et **إحالة** (`DepartmentForm.tsx:137`).

### 2.8 Réponse
- **Variantes constatées :**
  1. **رد / الرد / الردود** — forme très majoritaire (`ar.json:53,205,206,235,236,237,252,253,254,258,259,391,393,408,958`, `AdminDepartmentDashboard.tsx:128,255`).
  2. **الرد الرسمي** (`ar.json:235,290`).
  3. **مُجاب** — participe passif dans filtre/badge (`ar.json:1002,1029`, `DocumentTableRow.tsx:134`).
  4. **إجابة / رداً** — occurrence ponctuelle (`ViewOutgoingDocument.tsx:1343,1350`).

### 2.9 Archive
- **Variantes constatées :**
  1. **أرشيف / الأرشيف** — substantif (`ar.json:161,483,1107,1136`, `ViewOutgoingDocument.tsx:855`, `BackupSettingsPage.tsx:595`, `SettingsPage.tsx:893,904`, `PersonnelDocumentsList.tsx:316`).
  2. **أرشفة** — action ou nom verbal ; utilisé aussi à tort pour « sauvegarde » dans `BackupSettingsPage.tsx:369` (`للأرشفة`) (`ar.json:176,260,288,958,1042`, `ViewOutgoingDocument.tsx:910,1149,1327`).
  3. **مؤرشفة / مؤرشف** (`ar.json:1140`, `MessageRetentionPage.tsx:295`, `DocumentFolderDisplay.tsx:88,112`, `FolderDetailsDialog.tsx:71`, `FolderTreeView.tsx:306`).
  4. **تصنيف / مصنفة** — recouvre fréquemment la notion d'archivage dans un dossier (`ar.json:54,58,162,175,181,1107,1136,1139,1141`).

### 2.10 Utilisateur
- **Variantes constatées :**
  1. **مستخدم / المستخدم / المستخدمون / المستخدمين** — forme standard pour les comptes applicatifs (`ar.json:18,19,22,23,40,44,553,762-956`, `TemplatesPage.tsx:119`, `CreateUser.tsx:152`, `DepartmentsPage.tsx:868`).
  2. **موظف** — fiche RH, mais aussi parfois pour désigner un utilisateur dans les libellés de rôle (`ar.json:286,423,425,431`, `PersonnelFormPage.tsx:48`, `InlineCreateUserModal.tsx:304` : `موظف عادي (User)`).
  3. **حساب / حسابات المستخدمين** (`ar.json:493,508,763,767`, `PersonnelDetailPage.tsx:481,493`).
  4. **منسوبي القسم** — régionalisme du Golfe isolé (`ar.json:1247`, `DepartmentUsers.tsx:93`).
  5. **الزميل** (`ar.json:287`) et **المستخدمون العاديون** (`ar.json:27`).

### 2.11 Rôle
- **Variantes constatées :**
  1. **دور / الدور / الأدوار** — terme principal (`ar.json:552,553,555,557,562,773,784,839`, `EditUser.tsx:168`, `CreateUser.tsx:143`, `CrossRoleMessagingInfo.tsx:17`).
  2. **الدور الوظيفي** (`ar.json:872` — ambiguïté avec la fonction RH).
  3. **صلاحية / الصلاحيات** — parfois utilisé à la place de rôle (`ar.json:160,173,189,304`, `DocumentOptionsPage.tsx:126,128`, `SettingsPage.tsx:455` : `مستوى الصلاحيات`, `SecurityPrivacyPage.tsx:349`).
  4. **الوظيفة / المنصب / الرتبة** — pour le poste RH (`ar.json:891,1182`, `MyProfilePage.tsx:197`, `PersonnelDetailPage.tsx:425,833`).
  5. **Noms des rôles incohérents entre écrans :**
     - `Director` : `المدير العام` (`ar.json:617`) vs `مدير الإدارة` (`ar.json:170,808,925,937,988`, `errorMessages.ts:45-46`) vs `مدير` (`SetupWizardPage.tsx:356`).
     - `Admin` : `مدير النظام` (`ar.json:574,618`) vs `مدير` (`ar.json:809,814,926,938`) vs `الإدارة العامة (Admin)` (`CrossRoleMessagingInfo.tsx:62`).
     - `AdminDepartment` : `مدير القسم` (`ar.json:575,619`) vs `مدير قسم` (`ar.json:810,815,927,939`) vs `مديرو الأقسام` (`ar.json:563`, `CrossRoleMessagingInfo.tsx:72`) vs `مدراء الأقسام` (`ar.json:25`).
     - `AdminTuningDesk` : `مكتب التنسيق` / `مكتب الضبط` / `مدير المكتب` / `مدراء المكاتب` (cf. § 2.3).
     - `User` : `مستخدم` (`ar.json:621,817,941`) vs `مستخدم عادي (User)` (`ar.json:812,929`) vs `الموظفون (User)` (`CrossRoleMessagingInfo.tsx:92`) vs `موظف عادي (User)` (`InlineCreateUserModal.tsx:304`).

---

## 3. Défauts détectés

### 3.1 Français pur dans `ar.json` et mélange arabe / français / anglais dans une même phrase

#### A. Chaînes 100 % en français dans `ar.json` (`FAIT` critique)
- `ar.json:835` (`users.create.accessDenied`) : `"Accès refusé — Seul l'administrateur système peut créer des comptes"`
- `ar.json:859` (`users.edit.accessDenied`) : `"Accès refusé — Seul l'administrateur système peut modifier des comptes"`

#### B. Libellés hybrides Arabe + Français / Anglais dans `ar.json`
- `ar.json:352` (`documents.viewOutgoing.metric.pourInfo`) : `"نسخ للإعلام (Pour Info)"`
- `ar.json:685` (`messages.sentTab`) : `"المرسلة (Envoyés)"`
- `ar.json:881` (`users.form.personnelCard`) : `"بطاقة الموظف المرتبطة (Fiche Personnel associée)"`
- `ar.json:1175` (`personnel.filters.statusPending`) : `"في الانتظار (En attente)"`
- `ar.json:1176` (`personnel.filters.statusActive`) : `"نشط (Actif)"`
- `ar.json:1177` (`personnel.filters.statusInactive`) : `"غير نشط (Inactif)"`
- `ar.json:1180` (`personnel.table.fullName`) : `"الاسم الكامل (Nom & Prénom)"`
- `ar.json:1182` (`personnel.table.position`) : `"الوظيفة (Poste)"`
- `ar.json:1183` (`personnel.table.department`) : `"القسم (Département)"`
- `ar.json:1184` (`personnel.table.status`) : `"الحالة (Statut)"`

#### C. Mélange Arabe + Français / Anglais dans le code `src/`
- `src/pages/DepartmentsPage.tsx:554,562,570,689,702` : badges et menu en français (`"Bureau Directeur"`, `"Bureau d'Ordre"`, `"Département RH"`, `"Marquer comme Bureau Directeur"`, `"Marquer comme Bureau d'Ordre"`) au milieu d'une page 100 % en arabe.
- `src/pages/setup/SetupWizardPage.tsx:299,354,356,393,448,910,911,1044,1045,1272` : phrases bilingues juxtaposition français/arabe (ex. `:910` `"Le Directeur aura un accès en lecture seule... (صلاحية قراءة واطلاع شاملة...)"`, `:1272` `"⚠️ Prochaines étapes / الخطوات الموالية المقترحة :"`).
- `src/pages/settings/SettingsPage.tsx:1101,1109,1117` et `SetupWizardPage.tsx:1223,1227,1289` : `مكتب الضبط (BO)`, `الإدارة العامة (Direction)`, `مختبر LABO`, `الجودة QT`.
- `src/pages/hr/MyProfilePage.tsx:84` et `src/pages/hr/PersonnelDetailPage.tsx:195` : `console.error('Erreur génération بطاقة إرشادات:', err);`.
- `src/pages/hr/LeaveReasonsManagementPage.tsx:330-334`, `src/components/attendance/LeaveReasonsList.tsx:40-44`, `src/components/attendance/LeaveReasonFormDialog.tsx:38-42`, `src/utils/attendanceExportUtils.ts:154-162` : `عطلة (Congé)`, `مهمة (Mission)`, `تكوين (Formation)`, `خدمة (Service)`, `أخرى (Autre)`, `عطلة سنوية (Congé annuel)`, etc.
- `src/pages/hr/MyAttendanceCalendarPage.tsx:527,539,551,563` : `يوم (Jour)`, `أسبوع (Semaine)`, `شهر (Mois)`, `سنة (Année)`.
- `src/components/attendance/MyAttendanceLegend.tsx:105`, `MyCalendarYearView.tsx:25-36`, `MyCalendarMonthView.tsx:39-50`, `AllPersonnelMonthView.tsx:54-65` : `حاضر (Présent)`, `جانفي (Janvier)` ... `ديسمبر (Décembre)`.
- `src/components/hr/wizard/Step1Identity.tsx:123,169,255,281,357,358`, `Step2Family.tsx:38`, `Step3Admin.tsx:83`, `Step4Contacts.tsx:28,36,89,142` : parenthèses françaises partout (`اللقب (Nom)`, `الاسم (Prénom)`, `ذكر (Homme)`, `أنثى (Femme)`, `الشخص الأول (Personne 1)`...).
- `src/components/hr/AddPersonnelDocumentDialog.tsx:189,205` : `مراسلة واردة (Incoming)`, `مراسلة صادرة (Outgoing)`.
- `src/components/hr/StageFormDialog.tsx:556-560,573-575` : `مكتمل / منجز (Achevé)`, `قيد الإنجاز (En cours)`, `ناجح / مؤهل (Admis)`, `في انتظار النتيجة (En attente)`.
- `src/pages/hr/RHStagesPage.tsx:679` : `رقم الإرسالية (Route)`.
- `src/pages/documents/ViewOutgoingDocument.tsx:677,1309` : `نسخ للإعلام والإطلاع (Pour Information)`, `(Pour Info)`.
- `src/pages/organization/OrganizationChartPage.tsx:310` : `مكتب الضبط (Bureau d'Ordre)`.

### 3.2 Libellés de rôles bruts en anglais exposés à l'utilisateur
- `ar.json:808-812` et `ar.json:925-929` : `"مدير الإدارة (Director)"`, `"مدير (Admin)"`, `"مدير قسم (AdminDepartment)"`, `"مدير المكتب (AdminTuningDesk)"`, `"مستخدم عادي (User)"`.
- `src/pages/documents/DocumentOptionsPage.tsx:128` : `صلاحية مكتب الضبط (AdminTuningDesk)`.
- `src/components/users/UserForm.tsx:169` : mention explicite de `(AdminTuningDesk)` dans le code.
- `src/components/hr/InlineCreateUserModal.tsx:301-304` : `مدير الإدارة (Director)`, `مكتب الضبط (AdminTuningDesk)`, `مدير قسم (AdminDepartment)`, `موظف عادي (User)`.
- `src/components/messages/CrossRoleMessagingInfo.tsx:62,72,82,92` : `الإدارة العامة (Admin)`, `مديرو الأقسام (Department)`, `مكتب التنسيق (TuningDesk)`, `الموظفون (User)`.

### 3.3 Titres et libellés génériques
- `ar.json:723` (`common.error`) : `"خطأ"`
- `src/pages/documents/ScanDocumentPage.tsx:48` : `error: 'حدث خطأ'`
- `src/pages/settings/BackupSettingsPage.tsx:221,241,251,255,295,303,313,321` : titres de toast génériques `"خطأ"` et `"نجح"` (ex. `title: 'نجح'`, `title: 'خطأ'`) au lieu d'un titre explicite décrivant l'opération.
- `src/components/messages/MessageComposer.tsx:55,73,80` : titres de toast `"خطأ"` et `"تنبيه"`.
- `src/components/messages/ComposeMessage.tsx:87,94` : titre de toast `"تنبيه"`.
- `src/components/backup/RestoreBackupDialog.tsx:51` : titre `"تحذير"`.
- `src/components/attendance/MyCalendarMonthView.tsx:472` : `"ملاحظة:"`.

### 3.4 Ponctuation latine et typographie suspecte dans du texte arabe
- **Virgule latine `,` dans du texte arabe :**
  - `ar.json:828` (`users.create.photoSizeInfo`) : `"الصيغ المدعومة: JPG, PNG, GIF"` (virgules latines acceptables autour d'acronymes techniques, mais à noter)
  - `ar.json:833` (`users.create.invalidPhotoType`) : `"يرجى اختيار ملف صورة صحيح (JPG, PNG, GIF)"`
  - `src/pages/users/EditUser.tsx:79`, `src/pages/users/CreateUser.tsx:91,236`, `src/components/hr/PersonnelForm.tsx:303` : `(JPG, PNG, GIF)` / `(JPG, PNG, WEBP)`
  - `src/pages/setup/SetupWizardPage.tsx:911,1044,1045` : mélange de phrases françaises avec `,` suivies d'arabe entre parenthèses.
- **Espaces et deux-points à la française (` :` au lieu de `:` collé au mot précédent en arabe) :**
  - `ar.json:737` : `"أمثلة للبحث :"`
  - `src/pages/documents/ViewOutgoingDocument.tsx:620` (`معرّف المصلحة: `) vs `SettingsPage.tsx:1075,1101,1109,1117` (`اسم الإدارة الحالي :`, `مكتب الضبط (BO) :`) et `DocumentAIAssistant.tsx:239,409` (`طول الملخص :`, `اتجاه الترجمة :`).
- **Guillemets droits ASCII `"..."` au lieu des guillemets arabes/typographiques `« ... »` :**
  - `ar.json:416,694,695,705`, `RHStagesPage.tsx:275` (`&quot;تربصات هذا الموظف&quot;`).
- **Emojis décoratifs dans les textes d'interface / toasts :**
  - `ar.json:554,561,698`, `BackupSettingsPage.tsx:124` (`✅`), `SetupWizardPage.tsx:1272` (`⚠️`).

### 3.5 Orthographe : hamza, tanwīn, accord grammatical et unités
- **Hamza superflue sur un *alif waṣl* (`إ` sur un mot commençant par *hamzat al-waṣl*) :**
  - `ar.json:1161` (`outgoing.transfer.notesPlaceholder`) : `"للإطلاع والإفادة"` -> correct : **`للاطلاع`** (incohérent avec `ar.json:189,304,1019,1128` qui écrivent `للاطلاع`).
  - `src/pages/documents/ViewOutgoingDocument.tsx:677,1309` : `"للإعلام والإطلاع"` -> correct : **`والاطلاع`**.
  - `src/components/attendance/MyCalendarMonthView.tsx:53`, `MyCalendarWeekView.tsx:19`, `AllPersonnelWeekView.tsx:50`, `src/utils/arabicDateFormatter.ts:13` : `"الإثنين"` -> forme normative sans hamza : **`الاثنين`**.
- **Pluriel grammaticalement fautif (`مدراء` au lieu de `مديرون / مديرو`) :**
  - `ar.json:24` (`dashboard.userStats.admins`) : `"المدراء"` -> **`المديرون`**.
  - `ar.json:25` (`dashboard.userStats.departmentAdmins`) : `"مدراء الأقسام"` -> **`مديرو الأقسام`** (incohérent avec `ar.json:563` qui écrit correctement `المديرون، مديرو الأقسام`).
  - `ar.json:26` (`dashboard.userStats.tuningDeskAdmins`) : `"مدراء المكاتب"` -> **`مديرو المكاتب`** (ou `مسؤولو مكتب الضبط`).
  - `ar.json:769,919` (`users.supervisorsAndManagers`, `users.metrics.admins`) : `"المشرفون والمدراء"` -> **`المشرفون والمديرون`**.
- **Accord de l'annexion après `غير` (`المستخدمون غير النشطون`) :**
  - `ar.json:23` (`dashboard.userStats.inactiveUsers`) : `"المستخدمون غير النشطون"` -> faute d'accord ; après `غير`, l'adjectif doit être au génitif (`مضاف إليه`) : **`المستخدمون غير النشطين`** (ou `الحسابات المعطلة`).
- **Accord de genre du verbe `تم` devant un nom féminin (`تم إعادة` au lieu de `تمت إعادة`) :**
  - `ar.json:741` (`ai.assistant.resetPosition`) : `"تم إعادة التعيين"` -> **`تمت إعادة التعيين`**.
  - `src/pages/settings/BackupSettingsPage.tsx:124` : `"تم إعادة تحميل الجدول الزمني"` -> **`تمت إعادة تحميل الجدول الزمني`**.
  - `src/components/audit/AuditTrailViewer.tsx:47` : `"تم إعادة تعيين المرشحات"` -> **`تمت إعادة ضبط الفلاتر / المرشحات`**.
- **Erreur d'annexion coordonnée (`تخصيص والرد على الوثائق`) :**
  - `ar.json:53` (`dashboard.features.assignAndReplyDocs`) : `"تخصيص والرد على الوثائق"` -> faute syntaxique (rupture de l'iḍāfa entre un verbe transitif direct `تخصيص` et un verbe transitif indirect `الرد على`) -> **`تخصيص الوثائق والرد عليها`**.
- **Incohérence de placement du *tanwīn al-fatḥ* (`ًا` vs `اً`) :**
  - `ًا` après alif : `ar.json:109,150,883`, `PersonnelFormPage.tsx:51,83`, `UserForm.tsx:334,363` (`ضوئيًا`, `موظفًا`, `مجددًا`, `ملفًا جديدًا`).
  - `اً` avant alif dans le reste du projet (`آلياً`, `ضوئياً`, `نهائياً`, `مجدداً`).
- **Incohérence sur les unités informatiques (`ميغابايت` / `ميجابايت` / `ميغا` / `م.ب`) :**
  - `ميغابايت` (`ar.json:694`, `SettingsPage.tsx:179`, `Step1Identity.tsx:172`, `PersonnelForm.tsx:311`, `errorMessages.ts:49,51,118`).
  - `ميجابايت` (`ar.json:828,832`, `EditUser.tsx:75,234`, `CreateUser.tsx:86,230`, `ProfileSettingsDialog.tsx:124,231`).
  - `ميغا` familier (`ar.json:699`).
  - `م.ب` abrégé (`ar.json:718`).

### 3.6 Calques du français/anglais, tournures familières, littérales ou hétérogènes
- **Emprunt familier :** `ar.json:743` `"دبل-كليك للتصفير"` (calque phonétique de *double-clic*).
- **Calques syntaxiques et lexicaux du français/anglais :**
  - `ar.json:339` `"مراسلة صادرة ابتدائية"` (calque de *Courrier sortant initial* ; `ابتدائية` évoque le primaire ou un tribunal de 1ʳᵉ instance).
  - `ar.json:408` `"الوثيقة الصادرة كـ رد"` et `InstallationGuidePage.tsx:272,344` `"تحديد كـ مكتمل"` (calque de *en guise de / comme* avec `كـ` détachée par une espace).
  - `ar.json:609` `"قيد التقدم"` (calque mot à mot de *In progress*).
  - `ar.json:1056` `"في كل صفحة:"` (calque de *Par page :*).
  - `ar.json:1195` `"لا يمكن حذف موظف في حالة نشط"` (calque de *en statut actif*).
  - `ar.json:582` `"الرسائل الخاصة بك"` (calque de *votre liste de messages*, alors que l'arabe préfère le pronom suffixe `رسائلك`).
  - `ar.json:608`, `TemplatesPage.tsx:165`, `TrashPage.tsx:402`, `attendanceExportUtils.ts:342` : usage systématique de `"بواسطة"` pour traduire *par / créé par*.
  - `ar.json:228` `"الجهة الراسلة"` (au lieu de `الجهة المرسِلة`).
  - `ar.json:1002,1029` `"مُجاب"` pour traduire *Répondu* (peu idiomatique seul sans `عنها`).
  - `ar.json:1007,1019,1113,1128,771` : 4 équivalents concurrents pour *Filtres / Filtrer* (`الفلاتر`، `المرشحات`، `التصفية`، `فلترة`).
  - `src/utils/errorMessages.ts:35` : `"حقل مطلوب مفقود"` (calque littéral de *Required field missing*) et `:12` `"البريد أو كلمة المرور غير صحيحة"` (mentionne l'e-mail alors que la connexion se fait par `username`).
  - `src/pages/settings/SettingsPage.tsx:786` : `"قياسي (متوازن 8 ساعات عمل)"` pour décrire la densité d'affichage des lignes d'un tableau (texte incohérent hors contexte).
  - `src/pages/hr/RHStagesPage.tsx:679` : `"رقم الإرسالية (Route)"` (traduction littérale suspecte de `numeroRoute` / feuille de route).
  - `src/pages/settings/BackupSettingsPage.tsx:850` : `"جاري"` utilisé seul sans complément (orthographe normative à la fin : `جارٍ` ou `قيد التنفيذ`).
- **Mélange de référentiels géographiques et administratifs :**
  - `ar.json:313` mentionne `"الجمهورية الجزائرية الديمقراطية الشعبية"` et `وزارة العدل` (`ar.json:314`), alors que `ar.json:726-727` propose `"مشاريع SICDA 2025"` et `"فواتير STEG"` (références tunisiennes), que les calendriers utilisent les mois algéro-tunisiens (`جانفي، فيفري، أفريل، ماي، جوان، جويلية، أوت` dans `arabicDateFormatter.ts:8-9`, `MyCalendarMonthView.tsx:39-50`), et que `ar.json:1247` utilise `"منسوبي القسم"` (tournure du Golfe).

---

## 4. Proposition de glossaire unifié

> **Règle de gouvernance :** Toutes les entrées ci-dessous sont marquées **`[À VALIDER PAR LE PROPRIÉTAIRE]`**. Aucune option n'est imposée unilatéralement.

| Concept / Terme actuel | Variantes trouvées dans le code | Terme proposé | Remarque |
|---|---|---|---|
| **Courrier entrant** | الوثائق الواردة / المراسلات الواردة / المستندات الواردة / البريد الوارد / المعاملات الواردة / الوارد | المراسلات الواردة (ou الوثائق الواردة) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Trancher entre « المراسلات » (administratif) et « الوثائق » (générique) et éliminer « المستندات » et « البريد ». |
| **Courrier sortant** | الوثائق الصادرة / المراسلات الصادرة / المستندات الصادرة / البريد الصادر / الصادر | المراسلات الصادرة (ou الوثائق الصادرة) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — À aligner symétriquement sur le choix du courrier entrant. |
| **Bureau d'ordre** | مكتب الضبط / مكتب الضبط والتوثيق / مكتب التنسيق / مركز رقمنة الوثائق / مدير المكتب / مدراء المكاتب / BO / AdminTuningDesk | مكتب الضبط (et « مسؤول مكتب الضبط » pour le rôle) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Remplacer « مكتب التنسيق », « مركز رقمنة الوثائق » et « مدير المكتب » pour unifier avec `departmentLabels.ts`. |
| **Département** | قسم / مصلحة / وحدة وظيفية / إدارة | قسم (ou مصلحة selon l'organigramme) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Réserver « الإدارة العامة » exclusivement à la Direction générale, jamais au rôle `Admin`. |
| **Dossier** | مجلد / ملف / بطاقة | مجلد (classement) / ملف (dossier RH) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Distinguer clairement « مجلد » (arborescence d'archive), « ملف » (fichier numérique / dossier agent) et « بطاقة » (fiche). |
| **Corbeille** | سلة المحذوفات / السلة | سلة المحذوفات | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Déjà cohérent ; basculer `TrashPage.tsx` vers `ar.json` (`sidebar.trash`). |
| **Assignation** | تعيين / توجيه / تحويل / تخصيص / ربط / إسناد / تكليف / إحالة / تحديد المسؤول | تعيين مسؤول (agent) / توجيه (service) / إحالة ou تحويل (transfert) / ربط (liaison) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Attribuer un verbe unique à chaque action métier distincte. |
| **Réponse** | رد / الرد الرسمي / إجابة / مُجاب | رد (et « تم الرد عليها » au lieu de « مُجاب ») | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Éviter l'adjectif isolé « مُجاب » et le nom isolé « إجابة ». |
| **Archive** | أرشيف / الأرشيف / أرشفة / مؤرشفة / تصنيف / مصنفة | أرشفة / الأرشيف (et réserver « تصنيف » au classement en dossier) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Ne pas utiliser « أرشفة » pour désigner les sauvegardes (`BackupSettingsPage`). |
| **Utilisateur** | مستخدم / موظف / حساب / منسوبي / الزميل / مستخدم عادي | مستخدم (compte système) / موظف (fiche RH) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Supprimer « منسوبي » et éviter « الزميل » dans les journaux officiels ; distinguer compte et agent. |
| **Rôle** | دور / دور وظيفي / صلاحية / صلاحيات / وظيفة / رتبة | دور (rôle RBAC) / صلاحيات (droits d'accès) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Unifier les 5 rôles sans suffixe anglais (`المدير العام` / `مدير الإدارة`, `مدير النظام`, `مدير القسم`, `مسؤول مكتب الضبط`, `مستخدم`). |
| **Filtre / Filtrer** | الفلاتر / المرشحات / التصفية / فلترة | التصفية (ou الفرز والتصفية) / المرشحات | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Choisir un seul terme entre l'emprunt « الفلاتر » et le terme arabe « التصفية / المرشحات ». |
| **Unité Mo** | ميغابايت / ميجابايت / ميغا / م.ب | ميغابايت (ou ميجابايت, abrégé م.ب) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Uniformiser la translittération `غ` vs `ج` et supprimer « ميغا ». |
| **Mois du calendrier** | جانفي..أوت (algéro-tunisien) vs يناير..أغسطس | حسب البلد cible (Maghreb vs standard arabe) | **`[À VALIDER PAR LE PROPRIÉTAIRE]`** — Trancher la norme des mois et l'en-tête d'impression (`ar.json:313` vs `ar.json:726-727`). |

---

## 5. Phrases douteuses et reformulations proposées

> Aucune modification n'a été appliquée au code. Les reformulations ci-dessous sont des propositions à valider avant intégration.

| Fichier:Ligne | Texte actuel | Défaut identifié | Reformulation proposée |
|---|---|---|---|
| `ar.json:835` | `Accès refusé — Seul l'administrateur système peut créer des comptes` | Chaîne 100 % en français dans le fichier arabe `ar.json`. | `تم رفض الوصول — يقتصر إنشاء الحسابات على مدير النظام فقط` |
| `ar.json:859` | `Accès refusé — Seul l'administrateur système peut modifier des comptes` | Chaîne 100 % en français dans le fichier arabe `ar.json`. | `تم رفض الوصول — يقتصر تعديل الحسابات على مدير النظام فقط` |
| `ar.json:3` | `مرحباً بك في مركز رقمنة الوثائق. إدارة رقمنة الوثائق عبر جميع الأقسام.` | Désignation incohérente du bureau d'ordre + phrase nominale coupée (`إدارة رقمنة...`). | `مرحباً بك في مكتب الضبط. يمكنك من هنا إدارة رقمنة المراسلات وتوزيعها عبر جميع الأقسام.` |
| `ar.json:23` | `المستخدمون غير النشطون` | Faute d'accord grammatical après `غير` (le nom régi doit être au génitif). | `المستخدمون غير النشطين` |
| `ar.json:24-26,769,919` | `المدراء` / `مدراء الأقسام` / `مدراء المكاتب` | Pluriel fautif (`مدراء` sur `فعلاء`) ; incohérent avec `ar.json:563`. | `المديرون` / `مديرو الأقسام` / `مسؤولو مكتب الضبط` |
| `ar.json:53` | `تخصيص والرد على الوثائق` | Rupture syntaxique de l'annexion (`إضافة`) devant une conjonction. | `تخصيص الوثائق والرد عليها` |
| `ar.json:228` | `المصدر / الجهة الراسلة:` | Participe `الراسلة` inhabituel en style administratif. | `المصدر / الجهة المرسِلة:` |
| `ar.json:339` | `مراسلة صادرة ابتدائية` | Calque littéral de *Courrier sortant initial* (prête à confusion avec tribunal/école). | `مراسلة صادرة أصلية` *(ou `مراسلة صادرة مستقلة`)* |
| `ar.json:352` | `نسخ للإعلام (Pour Info)` | Mélange arabe/français inutile. | `نسخ للإعلام` |
| `ar.json:408` | `الوثيقة الصادرة كـ رد` | `كـ` détachée par une espace (calque de *en guise de*). | `الوثيقة الصادرة بوصفها رداً` *(ou `وثيقة الرد الصادرة`)* |
| `ar.json:511` | `خطأ في الشبكة. تأكد من تشغيل الخادم على المنفذ 5000` | Port `5000` figé dans le message utilisateur ; formulation technique pour l'utilisateur final. | `تعذر الاتصال بالخادم عبر الشبكة. يرجى التحقق من تشغيل الخدمة أو مراجعة الدعم الفني.` |
| `ar.json:582` | `تم تحديث قائمة الرسائل الخاصة بك` | Calque de *votre liste de messages* (`الخاصة بك`). | `تم تحديث قائمة رسائلك` |
| `ar.json:608` | `أنشئ بواسطة` | Calque passif de *Créé par* (`بواسطة`). | `أنشأه` *(ou `المُنشئ:`)* |
| `ar.json:609` | `قيد التقدم` | Calque de *In progress / En cours* pour un statut de dossier. | `قيد المعالجة` *(ou `مفتوح`)* |
| `ar.json:685` | `المرسلة (Envoyés)` | Mélange arabe/français. | `المرسلة` |
| `ar.json:739` | `تم مسح السجل` *(comparer à `fr.json`: Historique effacé)* | Vérifier selon le contexte (si infobulle de bouton, mettre un nom d'action ; si toast, garder l'accompli). | `مسح السجل` *(si bouton)* / `تم مسح السجل بنجاح` *(si notification)* |
| `ar.json:741` | `تم إعادة التعيين` | Faute d'accord en genre (`إعادة` est féminin). | `تمت إعادة الضبط` |
| `ar.json:743` | `انقر للفتح • اسحب للتحريك • دبل-كليك للتصفير` | Emprunt familier (`دبل-كليك`) + terme argotique (`للتصفير`). | `انقر للفتح • اسحب للتحريك • انقر نقراً مزدوجاً لإعادة الضبط` |
| `ar.json:808-812,925-929` | `مدير الإدارة (Director)` ... `مستخدم عادي (User)` | Exposition des identifiants techniques anglais de rôles dans l'UI. | `المدير العام` / `مدير النظام` / `مدير القسم` / `مسؤول مكتب الضبط` / `مستخدم` |
| `ar.json:881` | `بطاقة الموظف المرتبطة (Fiche Personnel associée)` | Mélange arabe/français. | `بطاقة الموظف المرتبطة` |
| `ar.json:1002` | `تم الرد عليها (مُجاب)` | Répétition inutile + participe passif `مُجاب` peu idiomatique sans préposition. | `تم الرد عليها` |
| `ar.json:1056` | `في كل صفحة:` | Calque littéral de *Par page :*. | `عدد العناصر في الصفحة:` *(ou `لكل صفحة:`)* |
| `ar.json:1161` | `مثال: للإجراء والمتابعة، للتنفيذ، للإطلاع والإفادة...` | Faute de hamza (`للإطلاع` sur *hamzat waṣl*). | `مثال: للإجراء والمتابعة، للتنفيذ، للاطلاع والإفادة...` |
| `ar.json:1175-1184` | `في الانتظار (En attente)` ... `الحالة (Statut)` | Mélange arabe/français systématique sur les filtres et colonnes RH. | Supprimer les parenthèses françaises (`قيد الانتظار`, `نشط`, `غير نشط`, `الاسم الكامل`, `الوظيفة`, `القسم`, `الحالة`). |
| `ar.json:1195` | `لا يمكن حذف موظف في حالة نشط` | Calque syntaxique de *en statut actif*. | `لا يمكن حذف موظف نشط` *(ou `لا يمكن حذف موظف حالته «نشط»`)* |
| `src/pages/DepartmentsPage.tsx:554,562,570,689,702` | `Bureau Directeur` / `Bureau d'Ordre` / `Département RH` / `Marquer comme...` | Chaînes purement françaises dans une page en arabe. | `الإدارة العامة` / `مكتب الضبط` / `قسم الموارد البشرية` / `تعيين بوصفه الإدارة العامة` / `تعيين بوصفه مكتب الضبط` |
| `src/pages/settings/BackupSettingsPage.tsx:124` | `✅ تم إعادة تحميل الجدول الزمني` | Faute d'accord (`تم` devant `إعادة`) + emoji dans le toast. | `تمت إعادة تحميل الجدول الزمني` |
| `src/pages/settings/BackupSettingsPage.tsx:221,241,251,255,295,303,313,321` | Titres `خطأ` / `نجح` | Titres génériques sans contexte. | `تمت العملية بنجاح` / `فشل تنفيذ العملية` *(avec intitulé précis : `تم إنشاء النسخة الاحتياطية` / `تعذر إنشاء النسخة الاحتياطية`)* |
| `src/pages/settings/SettingsPage.tsx:786` | `قياسي (متوازن 8 ساعات عمل)` | Texte hors contexte (mentionne `8 ساعات عمل` pour la densité visuelle d'un tableau). | `قياسي (تباعد متوازن)` |
| `src/pages/documents/ViewOutgoingDocument.tsx:677,1309` | `نسخ للإعلام والإطلاع (Pour Information)` | Hamza fautive (`الإطلاع`) + parenthèse française. | `نسخ للإعلام والاطلاع` |
| `src/pages/documents/DocumentOptionsPage.tsx:128` | `تتطلب صلاحية مكتب الضبط (AdminTuningDesk)` | Exposition du nom technique de rôle en anglais. | `تتطلب صلاحية مكتب الضبط` |
| `src/pages/hr/RHStagesPage.tsx:679` | `رقم الإرسالية (Route)` | Traduction douteuse de *numéro de route* + terme anglais. | `رقم وثيقة الإرسال` *(ou `رقم التوجيه` selon le document RH exact)* |
| `src/pages/guide/InstallationGuidePage.tsx:272,344` | `تحديد كـ مكتمل` / `إلغاء التحديد كـ مكتمل` | `كـ` détachée par une espace. | `تحديد كمكتمل` *(ou `وضع علامة «مكتمل»`)* / `إلغاء علامة الاكتمال` |
| `src/components/audit/AuditTrailViewer.tsx:47` | `تم إعادة تعيين المرشحات` | Faute d'accord (`تم` devant `إعادة`) + terme `المرشحات`. | `تمت إعادة ضبط التصفية` *(ou `تمت إعادة ضبط الفلاتر`)* |
| `src/utils/errorMessages.ts:12,35` | `البريد أو كلمة المرور غير صحيحة` / `حقل مطلوب مفقود` | Erreur fonctionnelle (connexion par `username` et non par e-mail) + calque de *Required field missing*. | `اسم المستخدم أو كلمة المرور غير صحيحة` / `يوجد حقل إلزامي فارغ` |
| `src/pages/setup/SetupWizardPage.tsx:910,911,1044,1045,1272` | Phrases bilingues FR + `(AR)` | Double langue dans une même chaîne. | Séparer via `i18next` (`t()`) en chaînes dédiées dans `fr.json` et `ar.json`. |
| `src/pages/hr/PersonnelDetailPage.tsx:660` | Caractères corrompus `` *(à l'affichage alternatif de durée)* | Caractères de remplacement Unicode (`U+FFFD` / encodage cassé) à la place du tiret long `—` (présent à la ligne `:750`). | `—` |

---

**STOP — Audit terminé (aucun fichier source modifié). En attente de `"suite"`.**
