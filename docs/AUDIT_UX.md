# Audit Ergonomique et Visuel — Frontend DMS

> **Nature du document :** Audit statique **read-only** du code frontend (`index.html`, `src/`, `public/`). Aucun fichier applicatif existant n'a été modifié.
> **Distinction méthodologique :**
> - **`FAIT`** : constat lu et vérifié directement dans le code actuel avec référence `fichier:ligne`.
> - **`[À VÉRIFIER À L'ÉCRAN]`** : comportement visuel, contraste calculé au rendu, débordement réel selon la résolution, comportement tactile ou rendu de police à contrôler dans un navigateur en exécution.

---

## 1. Inventaire technique et architectural

| Dimension | Constat (`FAIT`) | Références |
|---|---|---|
| **Framework UI & composants** | React 18 + Vite + Tailwind CSS v3 (`tailwindcss-animate`) + **shadcn/ui** basé sur **Radix UI** (`Dialog`, `AlertDialog`, `DropdownMenu`, `Select`, `Tabs`, `Switch`, `Avatar`, `Badge`, `Table`, `Tooltip`, etc.). Pas de MUI ni d'Ant Design. Coexistence d'un ancien fichier `src/styles/adminlte.css` (règles `[dir="rtl"] .sidebar`) et de `src/App.css` résiduel de template Vite (`#root { max-width: 1280px; padding: 2rem; text-align: center; }`). | `tailwind.config.ts:1-156`, `src/index.css:1-532`, `src/styles/adminlte.css:695-750`, `src/App.css:1-43`, `src/components/ui/button.tsx:1-59` |
| **Bibliothèque d'icônes** | **`lucide-react`** utilisée de façon homogène dans l'ensemble des pages et composants. Quelques emojis Unicode persistent dans des toasts ou libellés (`⚠️`, `❌`, `✅`, `⏱️`, `🚫`, `📎`). | `src/components/documents/forms/IncomingDocumentForm.tsx:89,112,121,128,134,148`, `src/pages/trash/TrashPage.tsx:436` |
| **Polices** | **`Cairo`** déclarée comme police principale (`fontFamily.cairo` et `sans` dans Tailwind, `body { font-family: 'Cairo', sans-serif; }`), chargée **exclusivement via Google Fonts CDN** dans `index.html`. Deux fichiers TTF locaux **`Amiri-Regular.ttf`** et **`Amiri-Bold.ttf`** existent dans `public/fonts/`, mais ne sont utilisés que pour l'export PDF `jsPDF` (pas via `@font-face` CSS pour l'UI web). | `index.html:12-14`, `tailwind.config.ts:23-24`, `src/index.css:95,102`, `public/fonts/`, `src/utils/pdfExportUtils.ts:57-67` |
| **Thème clair / sombre** | `tailwind.config.ts` active `darkMode: ["class"]` et `src/index.css` définit les variables CSS `.dark { ... }`, **mais aucun `ThemeProvider` / sélecteur de thème n'est monté** dans `src/App.tsx`. De plus, la quasi-totalité des pages contourne les tokens sémantiques (`bg-card`, `text-foreground`, `border-border`) au profit de couleurs hexadécimales en dur (`bg-[#f7fafc]`, `bg-white`, `text-[#1a202c]`, `bg-[#2c5282]`, `bg-[#FFCB56]`, `bg-[#FFD758]`), ce qui rendrait un basculement en mode sombre inutilisable en l'état. | `tailwind.config.ts:5`, `src/index.css:50-86`, `src/App.tsx`, `src/pages/documents/IncomingDocumentsPage.tsx:402-406`, `src/pages/settings/SettingsPage.tsx:244-275` |
| **Système de traduction (`i18n`)** | **`i18next`** + **`react-i18next`** avec 2 locales (`ar`, `fr`), défaut `'ar'`, persistance `localStorage('dms-language')`, exposées via `LanguageProvider` et `LanguageSwitcher`. **Couverture très partielle** : de nombreux écrans majeurs restent codés en dur en arabe uniquement ou mélangent arabe et français (`DepartmentsPage`, `TrashPage`, `SettingsPage`, `BackupSettingsPage`, `MessageRetentionPage`, `AttendancePage`, `AttendanceDeclarationsPage`, `PersonnelFormPage`, `DocumentAIAssistant`, et certains messages de `LoginPage`, `DashboardPage`, `HubLayout`, `HubLayouts`, `IncomingDocumentForm`). | `src/i18n/config.ts:1-36`, `src/contexts/LanguageProvider.tsx:1-21`, `src/components/common/LanguageSwitcher.tsx:1-25`, `src/pages/DepartmentsPage.tsx:412-955`, `src/pages/trash/TrashPage.tsx:203-620`, `src/pages/settings/SettingsPage.tsx:253-900` |
| **Gestion RTL / LTR** | `src/i18n/config.ts` met à jour dynamiquement `document.documentElement.lang` et `dir` (`ar` → `rtl`, `fr` → `ltr`) et `useDirection()` expose `isRTL` / `dir`. **Contradictions et défauts structurels dans le code :** 1) `index.html` fige `<html lang="ar" dir="rtl">` avec `<title>` et `<meta description>` en français ; 2) **Double inversion RTL** dans `Sidebar.tsx` (`isRTL ? "flex-row-reverse" : "flex-row"` à l'intérieur d'un conteneur déjà `dir={dir}`) ; 3) Des dizaines de pages/modales forcent **`dir="rtl"` en dur** (notamment `IncomingDocumentsPage`, `OutgoingDocumentsPage`, `TrashPage`, `UsersPage`, `DepartmentsPage`, `SettingsPage`, `BackupSettingsPage`, `MessageRetentionPage`, `PersonnelListPage`, `PersonnelFormPage`, `AttendancePage`, `DocumentAIAssistant`, modales `AlertDialogContent`/`SelectContent`) ; 4) Usage massif de classes physiques (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `border-r-`, `text-right`) au lieu de propriétés logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `border-s-`, `text-start`). | `index.html:3,8-11`, `src/i18n/config.ts:14-17,32-33`, `src/i18n/useDirection.ts:1-12`, `src/components/navigation/Sidebar.tsx:236,251,321`, `src/pages/documents/IncomingDocumentsPage.tsx:402`, `src/pages/documents/OutgoingDocumentsPage.tsx:403,414,418`, `src/pages/UsersPage.tsx:273,282`, `src/pages/DepartmentsPage.tsx:321,331`, `src/pages/settings/SettingsPage.tsx:244` |
| **Toasts / Retours système** | **Deux systèmes de notifications concurrents** montés simultanément : `sonner` (`<Toaster position="top-right" />` dans `App.tsx:596`, position physique droite non inversée en RTL) utilisé dans la majorité des pages, et `@/hooks/use-toast` (Radix Toast) utilisé dans `MessagesPage` et importé en doublon avec `sonner` dans `BackupSettingsPage`. | `src/App.tsx:596`, `src/pages/messages/MessagesPage.tsx:19`, `src/pages/settings/BackupSettingsPage.tsx:24-25` |
| **Layout principal** | `DashboardLayout.tsx` assemble `<Sidebar />`, `<Header />`, `<main>` scrollable et `<FloatingAIChat />`. `Header.tsx` inclut bouton menu, titre d'entité (`useSetupStatus`), `GlobalSearch` (`Ctrl+K`), `LanguageSwitcher`, `NotificationBell`, compteur messages non lus et menu profil. `Sidebar.tsx` passe de `w-64` à `w-16` sur clic **sans tiroir modal mobile (`Sheet`/`Drawer`)**, occupant une colonne permanente même sur petit écran. `HubLayout.tsx` / `HubLayouts.tsx` servent d'écrans d'accueil par module. | `src/components/layouts/DashboardLayout.tsx:1-87`, `src/components/navigation/Header.tsx:86-203`, `src/components/navigation/Sidebar.tsx:228-374`, `src/components/layouts/HubLayout.tsx:1-165`, `src/components/layouts/HubLayouts.tsx:1-297` |

### Inventaire des écrans principaux (`src/pages/` & `src/components/`)

- **Entrée & Auth :** `LandingPage.tsx`, `LoginPage.tsx`, `SetupWizardPage.tsx`
- **Tableaux de bord :** `DashboardPage.tsx`, `AdminDepartmentDashboardPage.tsx` (via `DashboardLayout` / `HubLayouts`)
- **Courrier :** `IncomingDocumentsPage.tsx`, `CreateIncomingDocument.tsx`, `EditIncomingDocument.tsx`, `ViewIncomingDocument.tsx`, `OutgoingDocumentsPage.tsx`, `CreateOutgoingDocument.tsx`, `EditOutgoingDocument.tsx`, `ViewOutgoingDocument.tsx`, `ScanDocumentPage.tsx`, `DocumentOptionsPage.tsx` (+ `IncomingDocumentForm.tsx`, `DocumentPreviewModal.tsx`, `PDFViewer.tsx`)
- **Dossiers & Classement :** `FolderManagementPage.tsx` (`FolderManagement.tsx`, `EnhancedFolderTree.tsx`, `DocumentCategoryManager.tsx`, `FolderDocumentsModal.tsx`)
- **Messagerie :** `MessagesPage.tsx` (`ConversationList.tsx`, `ConversationThread.tsx`, `ComposeMessage.tsx`, `MessageComposer.tsx`, `ContactsList.tsx`, `MessageHistoryStats.tsx`, `CrossRoleMessagingInfo.tsx`)
- **RH / Personnel & Présence :** `PersonnelListPage.tsx`, `PersonnelFormPage.tsx` (`PersonnelForm.tsx`, `wizard/Step1Identity`..`Step4Contacts`), `PersonnelDetailPage.tsx`, `AllPersonnelSituationPage.tsx`, `MyProfilePage.tsx`, `AttendancePage.tsx`, `AttendanceDeclarationsPage.tsx`, `MyAttendanceCalendarPage.tsx`, `LeaveReasonsManagementPage.tsx`, `RHStagesPage.tsx`
- **Administration & Paramètres :** `TrashPage.tsx`, `UsersPage.tsx` (`CreateUser.tsx`, `UserForm.tsx`), `DepartmentsPage.tsx` (`DepartmentForm.tsx`), `OrganizationChartPage.tsx`, `SettingsPage.tsx`, `BackupSettingsPage.tsx`, `MessageRetentionPage.tsx`
- **IA :** `FloatingAIChat.tsx` (global dans `DashboardLayout`), `DocumentAIAssistant.tsx` (embarqué dans la fiche courrier)

---

## 2. Analyse détaillée par écran principal

### 2.1 Navigation transversale (`Header.tsx`, `Sidebar.tsx`, `GlobalSearch.tsx`, `HubLayout.tsx`, `HubLayouts.tsx`)
- **`FAIT` — Double inversion RTL dans la barre latérale (`Sidebar.tsx:236,251,321`) :** Le conteneur parent dans `DashboardLayout.tsx:38` applique déjà `dir={dir}` (`rtl` en arabe), mais `Sidebar.tsx` ajoute `isRTL ? "flex-row-reverse" : "flex-row"` sur le header et les liens de navigation. En arabe, cela annule le flux RTL naturel et inverse l'ordre attendu icône/libellé/flèche.
- **`FAIT` — Absence de tiroir mobile sur `Sidebar` (`Sidebar.tsx:228`) :** La largeur reste `w-64` (ou `w-16` repliée) en flux flex horizontal sans overlay mobile (`< 768px`), réduisant fortement l'espace utile du `<main>` sur smartphone/tablette étroite. `[À VÉRIFIER À L'ÉCRAN]`
- **`FAIT` — Avatar sidebar non accessible au clavier & logs console actifs (`Sidebar.tsx:252-274`) :** `ContextMenuTrigger` enveloppe un `<Avatar>` non focusable (`div`), sans bouton ni alternative clavier ; deux `console.log` de debug d'image restent actifs (`Sidebar.tsx:263,267`).
- **`FAIT` — Bouton profil sans indicateur de focus clavier (`Header.tsx:157`) :** `outline-none` est posé sur le `<button>` déclencheur du menu utilisateur sans `focus-visible:ring-*`. De plus, `border-e border-s` (`Header.tsx:152`) trace deux bordures verticales autour du bloc profil et le titre/sous-titre (`Header.tsx:105-112`) n'a pas `truncate`, exposant un risque de débordement en largeur sur petit écran `[À VÉRIFIER À L'ÉCRAN]`.
- **`FAIT` — Classe focus CSS globale défectueuse (`src/index.css:373`) :** `.focus-visible:focus-visible` ne cible que les éléments portant la classe littérale `focus-visible`, au lieu de `*:focus-visible`, laissant des boutons personnalisés (onglets, paginations brutes) sans anneau de focus visible.
- **`FAIT` — Libellés non traduits dans les hubs (`HubLayout.tsx:74`, `HubLayouts.tsx`) :** Libellés et descriptions de cartes en français ou arabe en dur selon les fichiers ; `GlobalSearch.tsx:171,174,182` utilise `isRtl ? ... : ...` en dur au lieu de `t()`, avec `aria-label` uniquement en français (`"Recherche globale"`, `"Effacer la recherche"`).

### 2.2 Connexion (`src/pages/LoginPage.tsx`) & Accueil (`src/pages/LandingPage.tsx`)
- **`FAIT` — Accessibilité clavier cassée sur le bouton "afficher le mot de passe" (`LoginPage.tsx:196-198`) :** Le `<button>` possède `tabIndex={-1}` et `focus:outline-none`, le rendant totalement inatteignable au clavier (Tab), et son `aria-label` est codé en dur en français (`"Afficher/Masquer le mot de passe"`).
- **`FAIT` — Textes mixtes non traduits et identifiants exposés (`LoginPage.tsx:247,250`) :** Le pied de page affiche les identifiants par défaut `admin / Admin123!` et la mention française non traduite `"(N'oubliez pas de changer...)"` même lorsque l'interface est en arabe.
- **`FAIT` — Cohérence de style (`LoginPage.tsx` vs `LandingPage.tsx`) :** `LandingPage.tsx:58-68` utilise des badges en pilules `rounded-full` et `shadow-md`, alors que `LoginPage` suit le style rectangulaire sobre (`rounded`, bordure `#e2e8f0`). Pas d'état de focus visible explicite sur certains liens/boutons personnalisés `[À VÉRIFIER À L'ÉCRAN]`.

### 2.3 Tableau de bord (`src/pages/DashboardPage.tsx`)
- **`FAIT` — Marges/bordures physiques & texte en dur (`DashboardPage.tsx:118,122`) :** Le bandeau d'erreur utilise `border-l-4 rounded-r-md` (orienté LTR même en arabe `rtl`) et contient le message français non traduit `"Impossible de charger certaines données..."` avec un `<button>` sans `focus-visible`.
- **`FAIT` — Absence de pagination/détail sur erreur partielle :** Si `errorDocStats || errorUsers || errorFolders || errorDepartments` survient, un bandeau générique s'affiche en haut tout en laissant des compteurs à `0` en dessous (`DashboardPage.tsx`), ce qui peut prêter à confusion pour un agent `[À VÉRIFIER À L'ÉCRAN]`.

### 2.4 Courrier entrant & sortant (`IncomingDocumentsPage.tsx`, `OutgoingDocumentsPage.tsx`, `CreateIncomingDocument.tsx`, `IncomingDocumentForm.tsx`, `ViewIncomingDocument.tsx`)
- **`FAIT` — Direction `dir="rtl"` forcée en dur :** `IncomingDocumentsPage.tsx:402,1093,1321,1401` et `OutgoingDocumentsPage.tsx:403,414,418` forcent `dir="rtl"` (et classes `text-right`, `right-3.5`, `pr-10`, `ml-1`, `ml-2`, `mr-1`, `border-r`), cassant l'alignement lorsque l'utilisateur passe en Français (`fr`).
- **`FAIT` — Filtrage et tri trompeurs sur page courante uniquement (`IncomingDocumentsPage.tsx:231-285`, `OutgoingDocumentsPage.tsx:220-275`) :** La requête API renvoie déjà une page de 10 éléments (`page`, `limit`), puis `statusFilter` (`pending`/`answered`/`urgent`), `sortField`/`sortBy` (côté entrant) et `selectedType`/`folderFilter` (côté sortant) ne filtrent/trient **que ces 10 éléments en mémoire**. Un utilisateur filtrant sur « Urgent » en page 1 peut voir « Aucun document » alors que d'autres pages contiennent des courriers urgents.
- **`FAIT` — Transfert sortant simulé par `setTimeout` (`OutgoingDocumentsPage.tsx:374-384`) :** `handleTransferSubmit` simule un succès après `400ms` sans appel backend réel (risque majeur de perte de trace métier / faux sentiment de confirmation).
- **`FAIT` — Absence d'affichage d'erreur API sur `OutgoingDocumentsPage` (`OutgoingDocumentsPage.tsx:176`) :** `isError` est destructuré de `useQuery`, mais aucune vue d'erreur ni bouton « Réessayer » n'est rendu (à l'inverse de `IncomingDocumentsPage.tsx:493`).
- **`FAIT` — Éléments cliquables non accessibles au clavier :**
  - Sujets cliquables rendus en `<div onClick>` ou `<h3 onClick>` sans `role="button"`, `tabIndex={0}` ni gestion `Enter`/`Space` (`IncomingDocumentsPage.tsx:931-937,1181-1187`, `OutgoingDocumentsPage.tsx:842-848,1078-1084`).
  - En-têtes de colonnes triables rendus avec `onClick` directement sur `<th>` sans `<button>` interne (`IncomingDocumentsPage.tsx:856-899`, `OutgoingDocumentsPage.tsx:803-813`).
- **`FAIT` — Densité de la colonne Actions & cibles :** Chaque ligne de tableau affiche jusqu'à **5 boutons texte + 1 menu `...`** côte à côte (`IncomingDocumentsPage.tsx:1007-1141`, `OutgoingDocumentsPage.tsx:924-1039`), ce qui génère une largeur horizontale importante et impose un défilement horizontal sur écrans `< 1440px` `[À VÉRIFIER À L'ÉCRAN]`. Dans la pagination, le `SelectTrigger` fait `h-9` (`36px`, `IncomingDocumentsPage.tsx:1318`) sous le seuil tactile `40-44px`, à côté de boutons `h-11` (`44px`).
- **`FAIT` — Libellés arabe en dur dans le formulaire (`IncomingDocumentForm.tsx:89-150,195,213,227,241`) :** Les titres de sections (`معلومات الرقم التسلسلي`, `معلومات المراسلة`, `تفاصيل الوثيقة`, `مرفقات الوثيقة`) et les messages d'erreur IA sont en arabe en dur, ignorant la langue `fr`.

### 2.5 Dossiers & Classement (`FolderManagementPage.tsx`, `FolderManagement.tsx`)
- **`FAIT` — Absence de gestion d'état chargement / erreur au niveau conteneur (`FolderManagement.tsx:39-43`) :** `useQuery(['folders', targetDepartmentId])` ne récupère ni `isLoading` ni `isError` ; le compteur d'onglet affiche `0` pendant le chargement ou en cas d'échec réseau.
- **`FAIT` — Onglets sans sémantique ARIA (`FolderManagement.tsx:150-183`) :** Deux `<button>` bruts sans `role="tablist"` / `role="tab"` / `aria-selected`.
- **`FAIT` — Direction et espacements :** `FolderManagement.tsx` utilise majoritairement `t()` (sauf le séparateur/formatteur `formatArabicDate` qui reste arabe quel que soit le choix `fr`). L'accessibilité clavier interne de `EnhancedFolderTree` et de la grille `[À VÉRIFIER À L'ÉCRAN]`.

### 2.6 Messagerie (`src/pages/messages/MessagesPage.tsx`)
- **`FAIT` — Onglets non sémantiques & cibles petites (`MessagesPage.tsx:372-418`) :** Les onglets Boîte de réception / Envoyés / Contacts sont des `<button>` sans `role="tablist"`/`role="tab"`/`aria-selected`, avec `px-3.5 py-1.5 text-xs` (hauteur ~28px, bien inférieure à `44px`).
- **`FAIT` — Classe Tailwind invalide & taille de police microscopique (`MessagesPage.tsx:381`) :** Classe inexistante `py-0.2` sur le badge compteur, et usage généralisé de `text-xs` / `text-[10px]` pouvant nuire à la lisibilité sur une journée de travail `[À VÉRIFIER À L'ÉCRAN]`.
- **`FAIT` — Absence d'état d'erreur (`MessagesPage.tsx:59-71`) :** `useQuery(['messages', 'all'])` ne gère ni `isError` ni bannière de reprise en cas d'échec API.
- **`FAIT` — Système de toast divergent (`MessagesPage.tsx:19`) :** Utilise `@/hooks/use-toast` au lieu de `sonner` utilisé dans le reste de l'application, générant deux styles visuels et emplacements différents.

### 2.7 RH / Personnel (`PersonnelListPage.tsx`, `PersonnelFormPage.tsx`, `PersonnelForm.tsx`)
- **`FAIT` — `dir="rtl"` en dur & traduction incomplète :**
  - `PersonnelListPage.tsx:175,266,287,526,567` force `dir="rtl"`, `text-right`, `right-3.5`, `pr-10 pl-3`, `ml-2` malgré l'usage de `t()` sur la majorité des libellés.
  - `PersonnelFormPage.tsx:48-163` est **100% en arabe codé en dur** (titres, sous-titres, toasts, chargement, erreur) et force `dir="rtl"` (`:116`), ainsi que `PersonnelForm.tsx:303-358` (messages d'erreur `اللقب إجباري`, `الاسم إجباري`, erreurs upload photo).
- **`FAIT` — Tableau sans tri ni état d'erreur (`PersonnelListPage.tsx:124-134,306-325`) :** `useQuery(['personnel'])` ne gère pas `isError` ; aucune colonne du tableau (`Nom`, `CIN`, `Poste`, `Département`, `Statut`) n'est triable. En revanche, la pagination serveur (`page`, `limit`) est bien présente (`:508-562`) et les boutons d'action font `h-11 w-11` (`44px`) avec `aria-label`.
- **`FAIT` — Validation formulaire minimaliste (`PersonnelForm.tsx:352-362`) :** Seuls `nom` et `prenom` (étape 1) sont validés côté client ; aucun contrôle visible de format pour `emailPersonnel`, `telephone`, `cin` ou dates incohérentes aux étapes 1 à 4.

### 2.8 Présence & Calendrier (`AttendancePage.tsx`, `AttendanceDeclarationsPage.tsx`, `MyAttendanceCalendarPage.tsx`)
- **`FAIT` — Non traduit & `dir="rtl"` forcé (`AttendancePage.tsx:400,494,756`, `AttendanceDeclarationsPage.tsx`) :** Interface entièrement codée en arabe en dur (`wrقة تسجيل الحضور اليومي`, etc.) avec classes physiques (`pr-9`, `right-3`, `mr-2`, `ml-3`, `sm:text-left`).
- **`FAIT` — Cibles tactiles incohérentes (`AttendancePage.tsx:566-600,733`) :** Les filtres `الكل / الحاضرون / الغائبون` font `h-7 text-xs` (`28px`, trop petit) alors que les boutons `حاضر / غائب` font `h-11` (`44px`), et le champ heure d'arrivée fait `h-9` (`36px`).
- **`FAIT` — Absence de pagination sur la liste d'émargement (`AttendancePage.tsx:620-913`) :** Tous les agents du département/organisation sont rendus d'un bloc (risque de lenteur et défilement très long si l'effectif est élevé `[À VÉRIFIER À L'ÉCRAN]`).
- **`FAIT` — Absence d'état d'erreur persistant (`AttendancePage.tsx:204-207`, `MyAttendanceCalendarPage.tsx:121-153`) :** Les erreurs se limitent à un `toast.error` éphémère (ou `console.error` silencieux pour le calendrier/solde dans `MyAttendanceCalendarPage.tsx:122,151,174`), sans encart d'erreur avec bouton « Réessayer ».

### 2.9 Corbeille (`src/pages/trash/TrashPage.tsx`)
- **`FAIT` — Aucune traduction (`i18n`) et `dir="rtl"` forcé (`TrashPage.tsx:195,534,583`) :** 100% des textes sont en arabe en dur ; recherche (`right-3`, `pr-9 pl-4`) et en-têtes (`text-right`) utilisent des classes physiques.
- **`FAIT` — Absence de pagination et de tri (`TrashPage.tsx:396-524`) :** Tableau `<table>` natif (au lieu du `<Table>` shadcn utilisé dans `UsersPage`/`DepartmentsPage`/`PersonnelListPage`), sans aucun tri de colonne ni pagination si la corbeille contient des centaines d'éléments.
- **`FAIT` — Points positifs vérifiés :** États chargement, erreur (avec bouton « إعادة المحاولة » `:364-381`) et vide présents ; confirmations modales `AlertDialog` pour suppression définitive et vidage.

### 2.10 Utilisateurs & Départements (`UsersPage.tsx`, `DepartmentsPage.tsx`)
- **`FAIT` — Absence totale de gestion d'erreur (`isError`) :** Ni `UsersPage` ni `DepartmentsPage` ne gèrent l'échec du `useQuery` principal (en cas d'erreur 500/403, la page affiche silencieusement « Aucun résultat »).
- **`FAIT` — Incohérence d'état de chargement et de traduction :**
  - `UsersPage` utilise `t()` et `TableSkeleton`, tandis que `DepartmentsPage` est codé en dur en arabe **avec des badges et menus en français** (`"Bureau Directeur"`, `"Bureau d'Ordre"`, `"Département RH"`, `"Marquer comme..."`, `"Démarquer"` à `DepartmentsPage.tsx:526-702`) et affiche un spinner basique (`DepartmentsPage.tsx:319-328`) au lieu de `TableSkeleton`.
- **`FAIT` — Cibles tactiles & accessibilité clavier :**
  - Les boutons d'actions des tableaux mesurent `h-9 w-9 min-w-[36px] sm:min-w-[44px]` (`36×36px` sur mobile, sous les 44px recommandés : `UsersPage.tsx:653,687,707`, `DepartmentsPage.tsx:584,598,611,630,644`).
  - Dans `UsersPage.tsx:475-529`, le tri se fait par `onClick` sur `<TableHead>` (`<th>`), inaccessible au clavier. `DepartmentsPage` n'a aucun tri de colonne.
  - Les boutons de pagination numérotés (`UsersPage.tsx:748`, `DepartmentsPage.tsx:744`) rendent TOUTES les pages d'un coup sans troncature (`1..N`) ni `aria-current="page"`.

### 2.11 Paramètres, Sauvegardes & Rétention (`SettingsPage.tsx`, `BackupSettingsPage.tsx`, `MessageRetentionPage.tsx`)
- **`FAIT` — `window.confirm()` natif (`BackupSettingsPage.tsx:163`, `DocumentOptionsPage.tsx:137`) :** Utilisation de boîtes de dialogue natives du navigateur alors que le reste de l'écran emploie `AlertDialog` (problématique en iframe, non traduisible, style incohérent).
- **`FAIT` — Paramètres sécurité/préférences stockés uniquement en `localStorage` (`SettingsPage.tsx:212-236`) :** Plusieurs réglages (délai de session, tentatives max, 2FA, audit, densité des tables) affichent un toast de succès en étant enregistrés uniquement en `localStorage` sans effet réel démontré côté backend/UI `[À VÉRIFIER À L'ÉCRAN]`.
- **`FAIT` — Cibles tactiles réduites (`BackupSettingsPage.tsx:904,914,923`) :** Boutons d'actions du tableau d'historique en `h-8 w-8` (`32×32px`), sans `aria-label` (seulement `title`), et double import toast (`BackupSettingsPage.tsx:24-25`).
- **`FAIT` — Non traduits & `dir="rtl"` forcé :** `SettingsPage.tsx:244` (`border-r-4 pr-3`, `ml-2`), `BackupSettingsPage.tsx:355,625,785` (`ml-1`, `ml-2`, `mr-2`), `MessageRetentionPage.tsx:126` sont 100% en arabe en dur.

### 2.12 Chat IA flottant & Assistant documentaire (`FloatingAIChat.tsx`, `DocumentAIAssistant.tsx`)
- **`FAIT` — Positionnement physique & bouton flottant (`FloatingAIChat.tsx:362-375`) :** Le bouton flottant est positionné avec la propriété CSS physique `right: '24px'` (en RTL arabe, `right` recouvre souvent la zone basse de la barre latérale ou du contenu à droite ; en LTR français, il reste à droite). Bouton `w-14 h-14` (`56×56px`) mais avec `focus:outline-none` (`:372`).
- **`FAIT` — Fenêtre de chat (`FloatingAIChat.tsx:428,439,478,496,505,528`) :** Boutons de l'en-tête (`Nouvelle conversation`, `Fermer`) en `p-1.5` (< 32px), bulles avec `text-right`, `rounded-tr-xs` / `rounded-tl-xs` physiques.
- **`FAIT` — Assistant documentaire (`DocumentAIAssistant.tsx:181,206,244,255,266,379,425`) :** `dir="rtl"` et `text-right` en dur, textes 100% en arabe non traduits, classes physiques `border-r` et `pr-2`, boutons d'action rapides `py-1` (< 36px).

---

## 3. Ressources externes et compatibilité réseau fermé

Dans un contexte **réseau fermé d'administration publique (intranet sans accès Internet)**, deux dépendances externes de `index.html` provoquent des blocages, erreurs réseau ou dégradations visuelles :

| Ressource | Emplacement (`FAIT`) | Impact en réseau fermé |
|---|---|---|
| **Script externe Lovable `https://cdn.gpteng.co/gptengineer.js`** | `index.html:24` (`<script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>`) | **Critique / Bloquant ou fuite réseau :** Requête externe systématique à chaque chargement vers un CDN tiers de prototypage ; timeout navigateur si pare-feu silencieux, et risque de sécurité/conformité en administration. |
| **Google Fonts (`Cairo`)** | `index.html:12-14` (`fonts.googleapis.com` et `fonts.gstatic.com`) | **Dégradation typographique & latence :** En réseau fermé, le chargement échoue (`ERR_CONNECTION_TIMED_OUT` ou `ERR_NAME_NOT_RESOLVED`), basculant l'interface sur la police système (`sans-serif`, Arial/Tahoma/DejaVu) sans police `Cairo` auto-hébergée (`public/fonts/` ne contient que `Amiri-Regular.ttf` et `Amiri-Bold.ttf` pour `jsPDF`). |
| **Autres URLs externes dans `src/` / `public/`** | Vérifié par grep sur `src/` et `public/` | Aucune autre URL `https://` active trouvée dans `src/` (seul un gradient SVG dans `public/placeholder.svg` référence le namespace XML W3C standard `http://www.w3.org/2000/svg` ou similaire, inoffensif). |

---

## 4. Tableau récapitulatif des problèmes constatés

| Problème | Écran / Portée | Fichier:Ligne | Statut | Gravité | Effort |
|---|---|---|---|---|---|
| Script tiers `cdn.gpteng.co` chargé au démarrage | Global | `index.html:24` | `FAIT` | **Haute** | **S** |
| Police `Cairo` chargée uniquement via Google Fonts (absente en local pour le CSS web) | Global | `index.html:12-14`, `src/index.css:95,102` | `FAIT` | **Haute** | **S** |
| Double inversion RTL dans la barre latérale (`dir="rtl"` + `flex-row-reverse`) | Layout / Sidebar | `src/components/navigation/Sidebar.tsx:236,251,321` | `FAIT` | **Haute** | **S** |
| `dir="rtl"` forcé en dur sur 10+ pages/modales (casse le mode Français `LTR`) | Courrier, RH, Corbeille, Users, Dépts, Paramètres, IA | `IncomingDocumentsPage.tsx:402`, `OutgoingDocumentsPage.tsx:414`, `UsersPage.tsx:273`, `DepartmentsPage.tsx:321`, `TrashPage.tsx:195`, `SettingsPage.tsx:244`, `PersonnelListPage.tsx:175` | `FAIT` | **Haute** | **M** |
| Transfert courrier sortant simulé via `setTimeout` sans appel API | Courrier sortant | `src/pages/documents/OutgoingDocumentsPage.tsx:374-384` | `FAIT` | **Haute** | **M** |
| Filtres et tri appliqués uniquement sur les 10 résultats déjà paginés côté serveur | Courrier entrant & sortant | `IncomingDocumentsPage.tsx:231-285`, `OutgoingDocumentsPage.tsx:220-275` | `FAIT` | **Haute** | **M** |
| Absence de tiroir mobile (`Drawer`) sur la Sidebar (colonne fixe sur petit écran) | Layout / Mobile | `src/components/navigation/Sidebar.tsx:228` | `FAIT` (comportement `[À VÉRIFIER À L'ÉCRAN]`) | **Haute** | **M** |
| Identifiants par défaut (`admin / Admin123!`) affichés dans le footer de connexion | Connexion | `src/pages/LoginPage.tsx:247` | `FAIT` | **Haute** | **S** |
| Bouton œil mot de passe avec `tabIndex={-1}` et `focus:outline-none` (inaccessible clavier) | Connexion | `src/pages/LoginPage.tsx:196-198` | `FAIT` | **Haute** | **S** |
| Absence d'état d'erreur UI (`isError`) sur plusieurs écrans majeurs | Courrier sortant, Users, Dépts, RH, Messagerie, Dossiers | `OutgoingDocumentsPage.tsx:176`, `UsersPage.tsx`, `DepartmentsPage.tsx`, `PersonnelListPage.tsx`, `MessagesPage.tsx:59`, `FolderManagement.tsx:39` | `FAIT` | **Haute** | **M** |
| Couverture `i18n` incomplète / mix AR+FR sur de nombreux écrans | Dépts, Corbeille, Paramètres, Sauvegarde, Présence, Formulaire RH, IA, Connexion | `DepartmentsPage.tsx:526-702`, `TrashPage.tsx:203`, `SettingsPage.tsx:253`, `AttendancePage.tsx:425`, `PersonnelFormPage.tsx:48-163`, `DocumentAIAssistant.tsx:181` | `FAIT` | **Haute** | **L** |
| Éléments cliquables non focusables/activables au clavier (`<div onClick>`, `<h3 onClick>`, `<th onClick>`) | Courrier entrant/sortant, Utilisateurs | `IncomingDocumentsPage.tsx:856,931,1181`, `OutgoingDocumentsPage.tsx:803,842,1078`, `UsersPage.tsx:475-529` | `FAIT` | **Moyenne** | **M** |
| Usage massif de classes physiques (`ml-`, `mr-`, `pr-`, `right-`, `border-r-`, `text-right`) | Quasi toutes les pages | `OutgoingDocumentsPage.tsx` (25 occ.), `IncomingDocumentsPage.tsx` (23 occ.), `SettingsPage.tsx` (19 occ.), `DashboardPage.tsx:118` | `FAIT` | **Moyenne** | **L** |
| `window.confirm()` natif (bloqué/dégradé en iframe et non stylé) | Sauvegardes, Options doc | `src/pages/settings/BackupSettingsPage.tsx:163`, `src/pages/documents/DocumentOptionsPage.tsx:137` | `FAIT` | **Moyenne** | **S** |
| Cibles tactiles `< 40px` (`h-7`, `h-8`, `h-9`, `p-1.5`, `py-1`) et `aria-label` manquants sur icônes | Présence, Sauvegardes, Messagerie, Users, Dépts, Chat IA | `AttendancePage.tsx:570`, `BackupSettingsPage.tsx:904`, `MessagesPage.tsx:372`, `UsersPage.tsx:653`, `DepartmentsPage.tsx:584`, `FloatingAIChat.tsx:428` | `FAIT` | **Moyenne** | **M** |
| Absence de pagination et de tri dans la Corbeille ; absence de pagination dans Présence ; pagination sans ellipsis dans Users/Dépts | Corbeille, Présence, Users, Dépts | `TrashPage.tsx:396-524`, `AttendancePage.tsx:620`, `UsersPage.tsx:747`, `DepartmentsPage.tsx:743` | `FAIT` | **Moyenne** | **M** |
| Deux systèmes de toast concurrents (`sonner` vs `use-toast`) + position `top-right` fixe | Global / Messagerie / Sauvegardes | `src/App.tsx:596`, `MessagesPage.tsx:19`, `BackupSettingsPage.tsx:24-25` | `FAIT` | **Moyenne** | **S** |
| Sélecteur CSS `.focus-visible:focus-visible` inopérant et `outline-none` sans fallback | Global / Header / Chat IA | `src/index.css:373`, `Header.tsx:157`, `FloatingAIChat.tsx:372` | `FAIT` | **Moyenne** | **S** |
| Couleurs hex en dur contournant les tokens CSS (mode sombre `.dark` inutilisable) | Global | `tailwind.config.ts:5`, `src/index.css:50-86`, pages diverses | `FAIT` | **Basse** | **L** |
| Onglets sans attributs ARIA `tablist` / `tab` / `aria-selected` | Dossiers, Messagerie | `FolderManagement.tsx:150-183`, `MessagesPage.tsx:372-418` | `FAIT` | **Basse** | **S** |
| Réglages Sécurité/Affichage persistés uniquement en `localStorage` (impact réel sur densité tables) | Paramètres | `SettingsPage.tsx:212-236` | `FAIT` (`[À VÉRIFIER À L'ÉCRAN]`) | **Basse** | **M** |
| Classe Tailwind invalide `py-0.2` et polices `text-[10px]` / `text-xs` répétées | Messagerie, GlobalSearch | `MessagesPage.tsx:381`, `GlobalSearch.tsx:188,230` | `FAIT` | **Basse** | **S** |
| Résidu CSS template Vite (`#root { max-width: 1280px; text-align: center; }`) dans `src/App.css` | Global (si importé) | `src/App.css:1-6` | `FAIT` (`[À VÉRIFIER À L'ÉCRAN]`) | **Basse** | **S** |
| Contraste effectif des badges dorés (`#FFCB56`/`#FFD758`), lisibilité sur écrans 1366×768 et superposition de `FloatingAIChat` sur les boutons bas de page | Courrier, RH, Layout | `FloatingAIChat.tsx:362`, `AttendancePage.tsx:919`, `IncomingDocumentsPage.tsx:1007` | `[À VÉRIFIER À L'ÉCRAN]` | **Moyenne** | — |
| Alignement visuel réel des formulaires longs (`PersonnelForm` 4 étapes, `CreateIncomingDocument`) en mode `FR / LTR` vs `AR / RTL` | Formulaires RH & Courrier | `PersonnelForm.tsx`, `CreateIncomingDocument.tsx` | `[À VÉRIFIER À L'ÉCRAN]` | **Moyenne** | — |

---

## 5. Trois propositions de directions visuelles sobres (Administration publique, bilingue AR/FR)

Aucune direction n'est imposée ici ; les trois options ci-dessous sont pensées pour un usage intensif (8 h/jour), une compatibilité stricte **RTL (Arabe) / LTR (Français)** par propriétés CSS logiques, un hébergement **100 % local des polices** (aucun appel Google Fonts/CDN), et une **accessibilité WCAG AA** :

### Direction A — « Registre Officiel » (Institutionnelle classique)
- **Identité & Palette :** Conservation et assainissement de la palette institutionnelle existante : bleu marine administratif profond (`#1E3A5F` / `#2C5282`) sur fond papier chaud très léger (`#F8FAFC`) et cartes blanches bordées (`#CBD5E1`), avec l'ocre doré officiel (`#D97706` / `#FFCB56` en accent uniquement sur l'indicateur de statut actif ou le filigrane d'en-tête, texte toujours `#111827`).
- **Typographie & Densité :** Duo auto-hébergé **`Cairo`** (ou `IBM Plex Sans Arabic`) + **`Inter`/`Source Sans 3`** pour le français, corps à `15px–16px` (`line-height: 1.65` pour l'arabe), en-têtes sobres sans majuscules forcées (respectant les ligatures arabes).
- **Ergonomie clé :** Tableaux aérés à bordures fines horizontales, colonne « Actions » regroupée (2 actions principales + menu `...`), zéro `rounded-full` décoratif sur les badges d'état (rectangles `4px`), bandeau d'en-tête sobre avec fil d'Ariane logique (`start` → `end`).
- **Atout principal :** Continuité rassurante pour les agents déjà habitués à l'outil, coût d'adaptation minimal.

### Direction B — « Poste de Travail Haute Densité » (Épurée & Productivité Bureau d'Ordre)
- **Identité & Palette :** Esthétique neutre type « poste de gestion documentaire » : ardoise froide (`#0F172A` texte, `#F1F5F9` surface secondaire, `#FFFFFF` zone de travail), un seul bleu fonctionnel (`#1D4ED8`) pour les actions primaires et liens, statuts sémantiques désaturés (vert forêt, ambre foncé, rouge brique) pour éviter la fatigue visuelle sur 8 heures.
- **Typographie & Densité :** Police **`IBM Plex Sans Arabic`** + **`IBM Plex Sans`** en local (excellente géométrie commune entre chiffres latins/indicatifs de courrier `#2026/041` et texte arabe), alignement tabulaire des chiffres (`tabular-nums`).
- **Ergonomie clé :** Filtres compacts sur une seule ligne repliable, barre d'actions contextuelle fixe, tableaux avec densité réglable fonctionnelle (Standard / Compacte) et panneau latéral ou split-view pour aperçu PDF sans quitter la liste.
- **Atout principal :** Maximise le nombre de dossiers lisibles sans défilement sur écrans 1366×768 / 1080p des postes administratifs.

### Direction C — « Clarté & Accessibilité Maximale » (Contraste élevé, sans ambiguïté)
- **Identité & Palette :** Fond blanc pur / gris perle (`#FAFAFA`), contrastes renforcés (`>= 7:1` sur tous les textes de formulaires et libellés de tableaux), bordures nettes (`1.5px` sur les champs de saisie pour distinguer immédiatement les zones éditables des zones en lecture seule), bleu souverain (`#0B3C5D`) + vert émeraude foncé pour les validations.
- **Typographie & Densité :** Corps de texte minimum `16px` (`1rem`), étiquettes de champs systématiquement au-dessus des champs, suppression de tous les micro-textes `< 13px` (`text-[10px]`, `text-xs` dans les tableaux).
- **Ergonomie clé :** Cibles de clic uniformes `44×44px` minimum partout, anneaux de focus clavier très visibles (`3px`), icônes toujours accompagnées d'un libellé textuel dans les barres d'actions critiques (Courrier, RH, Corbeille) et zéro ambiguïté sur la navigation RTL/LTR.
- **Atout principal :** Réduit les erreurs de saisie et la fatigue oculaire sur tous profils d'agents, y compris utilisateurs moins familiers avec les interfaces web.

---

*Fin de l'audit — En attente de votre choix (`suite`) avant toute intervention sur le code.*
