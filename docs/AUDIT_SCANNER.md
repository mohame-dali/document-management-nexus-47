# Audit du module de numérisation (Scanner) — Cause racine de l'erreur HTTP 400 sur Windows

> **Note de provenance (périmètre lu)** : le prompt énumérait 12 fichiers sans en coller le texte dans le message ; aucune modification n'a été apportée au dépôt. Cet audit s'appuie sur la lecture directe des 12 fichiers cités présents dans le workspace `/app/applet`, complétée par les fichiers de liaison indispensables dans la chaîne d'appel (identifiés explicitement ci-dessous : `backend/utils/scanner/index.js`, `scannerBase.js`, `devices/deviceManager.js`, `config/devices.json`, `status/statusManager.js`, `windows/pdfProcessor.js`, `backend/controllers/scan/index.js`, `mainControllers.js`, `backend/middleware/error.js`, `server.ts`, `backend/sockets/index.js`, `src/hooks/forms/useIncomingDocumentForm.ts`, `src/hooks/forms/useOutgoingDocumentForm.ts`, `src/pages/documents/ScanDocumentPage.tsx`). Aucun correctif appliqué ; aucun test exécuté sur la machine Windows du propriétaire.

---

## 1. Chaîne d'appel complète (HTTP route → contrôleur → `scanIntegration` → `WindowsScanner` → simulateur / WIA)

```text
[UI]
  ScannerTab.tsx:124-127 (onClick -> handleScanClick -> handleStartScan)
    ├─ Formulaire Courrier Entrant/Sortant :
    │    useIncomingDocumentForm.ts:223-245 / useOutgoingDocumentForm.ts:215-237
    │      -> scanTemporaryDocumentMutation.mutate(scanOptions)
    │      -> scannerService.ts:129-145 : axios.post(`${API_URL}/scan/temp`, requestData)
    └─ Page dédiée /dashboard/scan :
         ScanDocumentPage.tsx:118-123, 158-179
           -> scanTemporaryDocument() (POST /api/scan/temp)  [scannerService.ts:142]
           -> scanDocument()          (POST /api/scan/document) [scannerService.ts:111]

[Express / Auth]
  server.ts:211 : app.use('/api/scan', require('./backend/routes/scan'))
    -> backend/routes/scan.js:17  : router.use(protect)
    -> backend/routes/scan.js:27  : router.post('/document', authorize('Admin', 'AdminTuningDesk'), scanForDocument)
    -> backend/routes/scan.js:28  : router.post('/temp',     authorize('Admin', 'AdminTuningDesk'), scanTemporaryDocument)

[Contrôleur]
  backend/controllers/scan/index.js:14-15 -> documentScanController.js
    ├─ scanForDocument (documentScanController.js:11-57)
    │    -> :26 scanIntegration.scanForDocument({ documentType, year, user, format, resolution })
    └─ scanTemporaryDocument (documentScanController.js:64-98)
         -> :71 scanIntegration.scanDocument({ documentType, format, resolution, userId })

[Intégration]
  backend/utils/scanIntegration.js
    ├─ :2  require('./scanner') -> backend/utils/scanner/index.js:9-18 (os.platform() === 'win32' => new WindowsScanner())
    ├─ :37-44 / :175-186 : status = scannerService.getStatus()
    │    Si status.deviceId === "panamfs:libusb:003:003" (non vide, !== 'Not selected')
    │    => autoDetectScanner() EST SAUTÉ !
    └─ :56 / :191 : scannerService.startScan(...)

[WindowsScanner]
  backend/utils/scanner/windows/windowsScanner.js
    ├─ Constructeur (:18, :22) : this.hasWindowsScanTools = false; this._detectWIATools(); (async NON awaité !)
    │    + super() -> ScannerBase (:17) -> DeviceManager (:13, :24-27) lit config/devices.json:2
    │      => currentDeviceId = "panamfs:libusb:003:003"
    ├─ startScan (:77-159) :
    │    :79 deviceId = this.getDeviceManager().getCurrentDeviceId()  // "panamfs:libusb:003:003"
    │    :96 if (this.hasWindowsScanTools && deviceId !== 'simulated-scanner')
    │      ├─ [Cas 1 : WIA disponible (hasWindowsScanTools === true)]
    │      │    :102 ScanExecutor.executeScan("panamfs:libusb:003:003", tempImagePath, resolution, ...)
    │      │      -> windows/scanExecutor.js:24-42 écrit scan_script_<ts>.ps1 et lance powershell -File ...
    │      │      -> scanExecutor.js:78-87 : ($dev.DeviceID -eq 'panamfs:libusb:003:003') FAUX pour tout scanner WIA
    │      │      -> "Scanner not found: panamfs:libusb:003:003" -> exit 1
    │      │      -> scanExecutor.js:55 throw Error('Windows scanning failed: ...')
    │      │    :119-123 catch (realScanError) -> console.error('Real scan failed, falling back to simulation:')
    │      │      -> this.simulator.simulateScan(outputPath, options)
    │      └─ [Cas 2 : WIA indisponible OU race condition au démarrage (hasWindowsScanTools === false)]
    │           :124-128 else -> console.log('Using simulated scanner')
    │             -> this.simulator.simulateScan(outputPath, options)
    └─ ScanSimulator.simulateScan (windows/scanSimulator.js:22-27) :
         :24 this.emit('scanError', new Error('No physical scanner detected. Please connect a scanner and install drivers.'))
         :25 reject(new Error('Scanner hardware required. No scan operation performed.'))

[Retour HTTP 400 & UI]
  windowsScanner.js:157       throw error
    -> scanIntegration.js:60 / :207  throw Error('Scan operation failed: Scanner hardware required. No scan operation performed.')
    -> scanIntegration.js:150 / :237 return { success: false, error: error.message }
    -> documentScanController.js:36 / :80 next(new ErrorResponse(`Scanning failed: ${scanResult.error}`, 400))
    -> backend/middleware/error.js:38-41 res.status(400).json({ success: false, error: ... })
    -> scannerService.ts:124 / :155 throw error (AxiosError brut)
    -> useIncomingDocumentForm.ts:284 / useOutgoingDocumentForm.ts:276 / ScanDocumentPage.tsx:134
       toast.error(`${t.scanFailed}: ${error.message}`)  ==>  "Request failed with status code 400"
```

---

## 2. Réponses détaillées aux questions d'audit (Q1 à Q11)

### Q2. Origine de l'identifiant `"panamfs:libusb:003:003"` sur Windows
- **FAIT** : `"panamfs:libusb:003:003"` est un identifiant **SANE/libusb Linux** pour un scanner Panasonic (`panamfs`), confirmé par `backend/utils/scanner/linux/scannerDetection.js:103-107` (`if (line.includes('panamfs:'))`) et `.env.production.example:90` (`# Identifiant du périphérique détecté (ex: panamfs:libusb:003:003 ou nom WIA)`).
- **FAIT** : Il est **codé/persisté dans le dépôt** dans `backend/utils/scanner/config/devices.json:1-6` :
  `"currentDeviceId": "panamfs:libusb:003:003"`, `"lastUsedDevices": ["panamfs:libusb:003:003"]`.
- **FAIT** : Au démarrage de `WindowsScanner`, `ScannerBase` (`scannerBase.js:17`) instancie `DeviceManager` (`devices/deviceManager.js:13, 16, 22-28`), qui charge `config/devices.json` et affecte `this.currentDeviceId = "panamfs:libusb:003:003"`. Si `SCANNER_DEVICE_ID` est vide dans `.env` (`scannerConfig.js:16` : `process.env.SCANNER_DEVICE_ID || ''`), `scannerBase.js:21-23` n'écrase pas cette valeur.
- **FAIT** : Au démarrage du serveur, `autoDetectScannerOnStartup` (`backend/utils/scanner/index.js:87-92`) voit `if (currentDeviceId) return;` et **court-circuite toute détection WIA**. Puis `scanIntegration.js:38` et `:176` testent `if (!status.deviceId || status.deviceId === 'Not selected')` : comme `status.deviceId` vaut `"panamfs:libusb:003:003"`, la détection est de nouveau court-circuitée.

### Q3. Contradiction : « No physical scanner detected » alors qu'un scan a démarré sur un périphérique
- **FAIT (Double contradiction dans le code)** :
  1. `scanIntegration.js:38, 176` et `scanner/index.js:87-92` considèrent qu'un `deviceId` non vide en cache (`"panamfs:libusb:003:003"`) prouve qu'un scanner physique valide est sélectionné, **sans vérifier son existence via WIA** (`ScannerDetection.checkScannerExists` n'est appelé que dans `selectScannerDevice` à `windowsScanner.js:215`).
  2. Quand `WindowsScanner.startScan()` tente d'utiliser `"panamfs:libusb:003:003"` (`windowsScanner.js:96-109`), le script WIA PowerShell échoue (`$dev.DeviceID -eq 'panamfs:libusb:003:003'` est faux → `Scanner not found` → `exit 1`). Le bloc `catch (realScanError)` (`windowsScanner.js:119-123`) **masque l'erreur réelle** en appelant `this.simulator.simulateScan()`, lequel rejette systématiquement avec `'No physical scanner detected...'` / `'Scanner hardware required...'` (`windows/scanSimulator.js:24-25`).
  3. À cela s'ajoute une **race condition** au démarrage (`windowsScanner.js:18, 22`) : `this.hasWindowsScanTools = false;` et `this._detectWIATools();` sans `await`. Et dans `listScanners()` (`:168`) / `selectScannerDevice()` (`:210`), la condition `if (this.hasWindowsScanTools === null)` est **toujours fausse** car la valeur initiale est `false`, pas `null`.

### Q4. Quand et pourquoi le simulateur est-il utilisé ?
- **FAIT** : `this.simulator.simulateScan()` (`windows/scanSimulator.js:22-27`) est appelé dans **deux cas** (`windowsScanner.js:96-128`) :
  - `!this.hasWindowsScanTools || deviceId === 'simulated-scanner'` (`:96, 124-128`, log : `'Using simulated scanner'`) ;
  - Toute exception levée par `ScanExecutor.executeScan` ou `PDFProcessor.processToFormat` (`:119-123`, log : `'Real scan failed, falling back to simulation:'`).
- **FAIT (Variables d'environnement)** : `SCANNER_ENABLED` est lu dans `scannerConfig.js:15` (`this.scannerEnabled = process.env.SCANNER_ENABLED === 'true'`), mais **`WindowsScanner` ne le consulte jamais** (seul `linux/scanExecutor.js:36` le vérifie). Aucune variable d'environnement ne contrôle le simulateur (`statusManager.js:36` lit `config.simulate || false`, jamais renseigné par `scannerConfig.js:49-58`).
- **FAIT (Silencieux ? Production ?)** : Le simulateur ne génère pas de faux document : il rejette toujours avec `'Scanner hardware required'` (`scanSimulator.js:25`), mais il **remplace silencieusement** la véritable erreur WIA/PowerShell/PDFKit dans la réponse HTTP (seule la console serveur reçoit `realScanError`). De plus, `windowsScanner.js:181-190` retourne un faux périphérique `'simulated-scanner'` si `listScanners()` lève une erreur, et `testScanner()` (`:243-246`) renvoie `true` quand `!this.hasWindowsScanTools`. Aucun garde `NODE_ENV` n'empêche son exécution en **production**.

### Q5. Exécution réelle WIA sur Windows, injection PowerShell, session interactive / service
- **FAIT (Mécanisme WIA)** :
  - `windows/scannerDetection.js:17-29, 58-87` exécute `powershell -Command "${script}"` via `execAsync` pour instancier `New-Object -ComObject WIA.DeviceManager` et lister `$deviceManager.DeviceInfos` où `$deviceInfo.Type -eq 1`.
  - `windows/scanExecutor.js:24-42, 70-113` écrit un fichier temporaire `.ps1` (`scan_script_${Date.now()}.ps1`) et l'exécute avec `execAsync(\`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"\`)`. Le script boucle sur `$deviceManager.DeviceInfos`, compare `$dev.DeviceID -eq '${scannerDevice}'`, prend `$device.Items[1]`, fixe les propriétés `"6146"` (DPI), `"6147"` (chaîne `"Color"` passée à une propriété WIA attendant un entier `WIA_IPS_CUR_INTENT`, rattrapée en silence par `try/catch` à `:94-96`), `"6148"` (chaîne `"Flatbed"` également rattrapée à `:98-102`), puis exécute `$item.Transfer()` et `$img.SaveFile("${outputPath}")` (attention : WIA `Transfer()` sans GUID produit souvent du BMP malgré l'extension `.png` passée à `PDFKit` à `windowsScanner.js:90, 112`).
- **FAIT (Risque d'injection de commandes)** :
  - `windows/scanExecutor.js:79, 85, 89, 93, 99, 105` et `:142, 148` interpolent directement `scannerDevice`, `resolution` (`req.body.resolution` non validé dans `documentScanController.js:31, 74` !), `colorMode`, `documentSource` et `outputPath` dans du code PowerShell. Un utilisateur `Admin`/`AdminTuningDesk` peut injecter du code PowerShell arbitraire via `resolution`.
  - `linux/scanExecutor.js:68, 75-77, 134, 142-144, 216` interpole également `scannerDevice`, `resolution`, `format`, `outputPath` dans `exec()` sans échappement shell de `resolution`/`format`/`$(...)`.
- **HYPOTHÈSE (Session Windows / Service NSSM)** :
  - Sous Windows, l'objet COM `WIA.DeviceManager` dépend du service système **Windows Image Acquisition (`stisvc`)** et de pilotes WIA installés (un pilote **TWAIN uniquement** n'apparaît pas dans `WIA.DeviceManager`).
  - Si Node.js tourne en **service Windows (Session 0, ex. NSSM / LocalSystem)**, `WIA.DeviceManager` ou `$item.Transfer()` peut échouer par manque de droits sur le périphérique USB, absence de session interactive si le pilote tente d'afficher une fenêtre, ou blocage de stratégie PowerShell.

### Q6. Statut HTTP, traitement côté frontend et texte technique anglais
- **FAIT** : `documentScanController.js:36` et `:80` renvoient `new ErrorResponse(\`Scanning failed: ${scanResult.error}\`, 400)`, sérialisé par `backend/middleware/error.js:38-41` en HTTP **400** `{ success: false, error: "Scanning failed: Scan operation failed: Scanner hardware required. No scan operation performed." }`.
- **FAIT** : `src/services/scannerService.ts:2` importe `axios` brut (pas l'instance `api`). Aux lignes `:120-125` et `:150-156`, `catch (error)` ne lit jamais `error.response?.data?.error` et fait `throw error;` (sauf timeout `AbortError`/`ECONNABORTED`).
- **FAIT** : `useIncomingDocumentForm.ts:284`, `useOutgoingDocumentForm.ts:276` et `ScanDocumentPage.tsx:134` affichent `toast.error(\`${t.scanFailed}: ${error.message}\`)`. Or la propriété native `AxiosError.message` d'Axios pour tout HTTP 400 est littéralement `"Request failed with status code 400"`.

### Q7. Protection par rôle et validation de chemin (Path Traversal)
- **FAIT (Rôles)** :
  - `backend/routes/scan.js:17` applique `router.use(protect)`.
  - `:20-28` restreignent `/status`, `/devices`, `/recent`, `/start`, `/select-device`, `POST /document`, `POST /temp` à `authorize('Admin', 'AdminTuningDesk')`.
  - **Faille** : `GET /api/scan/document/:id/:type` (`backend/routes/scan.js:31`) et `POST /api/scan/ocr-upload` (`:68-114`) n'ont **aucun `authorize(...)` ni contrôle départemental** (ouverts à tout utilisateur connecté). De plus, `backend/controllers/scan/index.js:6-19` **n'exporte pas `getDocumentScan`**, rendant `getDocumentScan` `undefined` dans `backend/routes/scan.js:13, 31`.
- **FAIT (Path Traversal)** :
  - `documentScanController.js:148-151` (`determineDocumentPath`) : pour `type === 'temp'`, retourne `id` tel quel (`return id;`) puis `:122` fait `path.join(__dirname, '../..', filePath)` + `fs.existsSync(fullPath)` (oracle d'existence de fichiers arbitraires hors dossier `temp`).
- **FAIT (Incohérence `selectScanner`)** : `scannerService.ts:73` envoie `{ deviceId }` alors que `mainControllers.js:187` lit `const { scannerId } = req.body;` → toujours `undefined` (400 `'Scanner ID is required'`).

### Q8. Concurrence, timeout et nettoyage des fichiers temporaires
- **FAIT (Concurrence)** : `WindowsScanner.startScan()` (`windowsScanner.js:77-159`) n'a **aucun verrou** (`getScanning()` non vérifié). Deux appels simultanés à `POST /api/scan/document` ou `/temp` lancent deux scripts PowerShell concurrents sur le même scanner ; en outre `scan_script_${Date.now()}.ps1` (`windows/scanExecutor.js:33`) peut entrer en collision à la milliseconde. (Sur Linux, `linux/scanExecutor.js:131, 171-174` écrit `scanned_page_%d.jpg` directement dans le `tempDir` partagé sans sous-dossier par job.)
- **FAIT (Timeouts)** :
  - Backend Windows : `windowsScanner.js:106-108` (`Promise.race` 180 s) et `scanIntegration.js:199-201` (180 s pour `scanDocument` uniquement ; `scanForDocument` n'a pas de `Promise.race` propre). **Mais** `windows/scanExecutor.js:42` appelle `execAsync(...)` **sans option `timeout`**, laissant le processus `powershell.exe` orphelin si le `Promise.race` expire.
  - Frontend : `scannerService.ts:109-113, 140-144` fixe `240 000 ms` (4 min).
- **FAIT (Nettoyage)** :
  - `windows/scanExecutor.js:50-58` supprime le `.ps1` en `catch`/`finally` (sauf tant qu'un PowerShell bloqué sur timeout détient le handle).
  - `windowsScanner.js:115-117` ne supprime `tempImagePath` qu'après succès de `PDFProcessor.processToFormat` (fuite si échec PDFKit).
  - `scanIntegration.js:107-111` ne supprime `tempFilePath` que si copie + sérial réussissent ; `scanDocument` (`POST /api/scan/temp`) conserve le fichier temporaire après réponse. Sur Linux, `linux/scanExecutor.js:171-197` ne nettoie jamais `scanned_page_%d.jpg`.

### Q9. Progression (Socket.IO / polling) et aperçu
- **FAIT (Progression)** : Aucune progression réelle n'est transmise au client. `windowsScanner.js` et `linux/scanExecutor.js` émettent des événements `EventEmitter` locaux (`scanStart`, `scanProgress`, `scanComplete`, `scanError`) qui ne font que `console.log` (`scanner/index.js:48-62`, `scannerBase.js:26-46`). `backend/sockets/index.js:1-86` ne gère que la messagerie. `GET /api/scan/status` (`statusManager.js:24-43`) ne renvoie que `isScanning: boolean`. Côté UI, `useIncomingDocumentForm.ts:234-243`, `useOutgoingDocumentForm.ts:226-235` et `ScanDocumentPage.tsx:167-177` **simulent la barre de progression par `setInterval`**.
- **FAIT (Aperçu)** : `ScannedDocumentPreview.tsx:30-37` ouvre `${API_URL}/${scanResult.filePath}` via `window.open(..., '_blank')`. Or pour un scan temporaire (`POST /api/scan/temp`), `filePath` est un chemin disque local (`./uploads/temp/scan_...pdf`), pas une route HTTP valide, et `/uploads` exige `protect` (`server.ts:176`) sans jeton dans `window.open`. Aucune prévisualisation PDF/image intégrée n'est rendue dans `ScannedDocumentPreview.tsx`. De plus, `scannerService.ts:182, 195, 205` appelle `GET /api/scan/download/:scanId`, `DELETE /api/scan/:scanId` et `GET /api/scan/metadata/:scanId` qui **n'existent pas** dans `backend/routes/scan.js`.

### Q10. Le scanner doit-il être branché sur le SERVEUR ?
- **FAIT** : **Oui, à 100 %.** Toute l'exécution matérielle se fait côté backend Node (`scanner/index.js:10-22` inspecte `os.platform()` du serveur ; `windows/scanExecutor.js:42` exécute PowerShell WIA sur le serveur ; `linux/scanExecutor.js:75` exécute `scanimage` sur le serveur). Le navigateur ne dialogue avec aucun pont local poste-client (ni WebUSB, ni service TWAIN/WIA local). Un scanner branché sur le poste d'un agent n'est pas détectable par le serveur (sauf partage réseau reconnu par WIA/SANE côté serveur).

### Q11. i18n : textes codés en dur ou non traduits
- **FAIT** :
  - `ScannerTab.tsx:70` (`Format`), `:77` (`Select format`), `:88` (fallback `'Resolution'`), `:95` (`Select resolution`), `:121` (`Loading scanner status...`), `:133, 138, 145, 155, 170` (fallbacks anglais `'Scanning...'`, `'Scan Document'`, `'Scanner not configured'`, `'Configure Scanner'`, `'Complete'`), `:146-148` (`Please connect your scanner, install drivers, and configure it first.`).
  - `ScannedDocumentPreview.tsx:45, 52, 78, 88, 103, 105` : chaînes et `aria-label="حذف المسح الضوئي"` codés en arabe sans i18n (cassent l'affichage FR).
  - `scannerService.ts:122, 153` : message timeout codé en anglais ; `:124, 155` remonte `AxiosError.message` (`"Request failed with status code 400"`).
  - Backend (`scanSimulator.js:24-25`, `scanIntegration.js:42, 60, 181, 184, 207`, `documentScanController.js:17, 36, 80`, `windows/scanExecutor.js:45, 55`) : tous les messages sont en anglais technique.
  - `ScanDocumentPage.tsx:26-48` : objet `translations` entièrement codé en arabe sans `useTranslation()`.

---

## 3. Tableau récapitulatif des constats

| Constat | `fichier:ligne` | Statut | Sévérité | Effort |
|---|---|---|---|---|
| `devices.json` impose l'ID Linux SANE `panamfs:libusb:003:003` sur Windows ; startup et `scanIntegration` sautent l'auto-détection | `backend/utils/scanner/config/devices.json:2-4`, `deviceManager.js:24-27`, `scanner/index.js:87-92`, `scanIntegration.js:38, 176` | **FAIT** | **Critique** | **S** |
| `WindowsScanner` attrape toute erreur réelle (`realScanError`) et appelle `ScanSimulator` qui masque la cause et rejette en `'Scanner hardware required'` | `windowsScanner.js:119-128`, `windows/scanSimulator.js:24-25` | **FAIT** | **Critique** | **S** |
| Race condition `_detectWIATools()` non `await` dans constructeur (`false` initial, jamais `null` malgré le test `=== null` à `:168, :210`) | `windowsScanner.js:18, 22, 168, 210` | **FAIT** | **Haute** | **S** |
| Injection PowerShell/Shell via `resolution`, `scannerDevice`, `outputPath` dans `createScanScript` / `scanToImage` / `scanToPdf` | `windows/scanExecutor.js:79, 89, 105, 142`, `linux/scanExecutor.js:75-77, 142-144, 216`, `documentScanController.js:31, 74` | **FAIT** | **Critique** | **M** |
| `SCANNER_ENABLED` ignoré sur Windows ; aucun garde `NODE_ENV` sur le simulateur | `scannerConfig.js:15`, `windowsScanner.js:96, 124-128` | **FAIT** | **Moyenne** | **S** |
| Propriétés WIA `"6147"`/`"6148"` reçoivent des chaînes (`"Color"`, `"Flatbed"`) au lieu d'entiers ; extension `.png` alors que WIA `Transfer()` produit souvent du BMP | `windows/scanExecutor.js:93, 99`, `windowsScanner.js:90, 112` | **FAIT** | **Moyenne** | **M** |
| Service Windows Session 0 / `stisvc` / pilote TWAIN-only peut empêcher `WIA.DeviceManager` de voir ou piloter le scanner | `windows/scannerDetection.js:19, 60-65`, `windows/scanExecutor.js:76-105` | **HYPOTHÈSE** | **Haute** | **M** |
| UI remonte `AxiosError.message` brut (`"Request failed with status code 400"`) au lieu de `error.response.data.error` | `scannerService.ts:124, 155`, `useIncomingDocumentForm.ts:284`, `useOutgoingDocumentForm.ts:276`, `ScanDocumentPage.tsx:134` | **FAIT** | **Haute** | **S** |
| `selectScanner` envoie `{ deviceId }` mais le backend attend `{ scannerId }` | `scannerService.ts:73`, `mainControllers.js:187` | **FAIT** | **Haute** | **S** |
| `GET /api/scan/document/:id/:type` et `POST /api/scan/ocr-upload` sans `authorize` ; `getDocumentScan` non exporté (`undefined`) ; Path Traversal sur `type === 'temp'` | `backend/routes/scan.js:13, 31, 68`, `controllers/scan/index.js:6-19`, `documentScanController.js:122, 148-151` | **FAIT** | **Critique** | **M** |
| Pas de verrou de concurrence dans `WindowsScanner.startScan` ; `execAsync` sans `timeout` (processus PowerShell orphelin) ; fuites de fichiers temp | `windowsScanner.js:77-118`, `windows/scanExecutor.js:33, 42`, `linux/scanExecutor.js:131, 171-197` | **FAIT** | **Haute** | **M** |
| Progression simulée par `setInterval` (Socket.IO non câblé) ; aperçu `ScannedDocumentPreview` ouvre un chemin disque invalide ; 3 routes mortes dans `scannerService.ts` | `useIncomingDocumentForm.ts:234-243`, `backend/sockets/index.js:1-86`, `ScannedDocumentPreview.tsx:30-37`, `scannerService.ts:182-213` | **FAIT** | **Moyenne** | **M** |
| Architecture 100 % serveur-centrée (scanner obligatoirement branché sur le serveur Node, pas sur les PC clients) | `scanner/index.js:10-22`, `windows/scanExecutor.js:42, 76`, `linux/scanExecutor.js:75` | **FAIT** | **Critique (archi)** | **L** |
| Libellés anglais/arabes codés en dur (`Format`, `Select format`, `Loading scanner status...`, etc.) | `ScannerTab.tsx:70, 77, 88, 95, 121, 146-148`, `ScannedDocumentPreview.tsx:45-105`, `ScanDocumentPage.tsx:26-48` | **FAIT** | **Moyenne** | **S** |

---

## 4. CAUSE RACINE (Root Cause)

**Cause racine :** Le fichier versionné `backend/utils/scanner/config/devices.json:2` force `currentDeviceId` à l'identifiant Linux SANE `"panamfs:libusb:003:003"`, ce qui fait que l'auto-détection au démarrage (`backend/utils/scanner/index.js:87-92`) et au scan (`backend/utils/scanIntegration.js:38, 176`) ignorent WIA sur Windows ; lors du scan, soit `ScanExecutor.executeScan` échoue car aucun périphérique WIA ne porte l'ID `"panamfs:libusb:003:003"` (`windows/scanExecutor.js:79-87`), soit `hasWindowsScanTools` vaut encore `false` (`windowsScanner.js:18, 22, 96`), déclenchant dans les deux cas `ScanSimulator.simulateScan` (`windows/scanSimulator.js:24-25`) qui masque l'erreur réelle sous `"Scanner hardware required"`, renvoyée en HTTP `400` (`documentScanController.js:36, 80`) et affichée telle quelle par Axios sous la forme `"Request failed with status code 400"` (`scannerService.ts:124, 155`, `useIncomingDocumentForm.ts:284`).

**Explications alternatives non écartables à distance (sans exécution sur votre machine Windows) :**
1. Le scanner Panasonic sur Windows ne possède qu'un pilote **TWAIN** (sans pilote **WIA**) ou le service Windows **`stisvc`** est arrêté/bloqué → même après correction de `devices.json`, `WIA.DeviceManager` renverrait 0 périphérique.
2. Node.js s'exécute en **service Windows (Session 0)** sous un compte sans accès au bus USB/WIA ou avec un pilote qui tente d'ouvrir une boîte de dialogue interactive.
3. Le scanner est branché sur un **PC client d'agent** plutôt que sur le **serveur hébergeant Node.js**.

---

## 5. Tests à exécuter localement sur la machine Windows du propriétaire

### Test 1 — Vérifier le service WIA (`stisvc`) et la visibilité du scanner en WIA (PowerShell)
```powershell
Get-Service stisvc | Select-Object Name, Status, StartType
$dm = New-Object -ComObject WIA.DeviceManager
$dm.DeviceInfos | ForEach-Object {
  [PSCustomObject]@{
    DeviceID    = $_.DeviceID
    Type        = $_.Type
    Name        = $_.Properties("Name").Value
    Description = $_.Properties("Description").Value
  }
} | Format-Table -AutoSize
```
- **Attendu si WIA OK** : `stisvc` est `Running` et le tableau affiche au moins une ligne avec `Type = 1` et un `DeviceID` WIA Windows du type `{6BDD1FC6-810F-11D0-BEC7-08002BE2092F}\0000` (jamais `panamfs:libusb:003:003`).
- **Attendu si cause alternative (pilote TWAIN-only / scanner non branché sur ce PC / `stisvc` arrêté)** : `stisvc` `Stopped` ou aucune ligne `Type = 1` retournée.

### Test 2 — Confirmer l'échec exact provoqué par `panamfs:libusb:003:003` vs un vrai `DeviceID` WIA (PowerShell)
```powershell
$dm = New-Object -ComObject WIA.DeviceManager
$found = $false
foreach ($d in $dm.DeviceInfos) { if ($d.DeviceID -eq 'panamfs:libusb:003:003') { $found = $true } }
"Match panamfs:libusb:003:003 => $found"
```
- **Attendu (preuve directe de la cause racine)** : `Match panamfs:libusb:003:003 => False`.

### Test 3 — Tester une acquisition WIA directe dans la session courante vs session service (PowerShell)
*(Remplacer `<WIA_DEVICE_ID>` par le `DeviceID` obtenu au Test 1.)*
```powershell
$dm = New-Object -ComObject WIA.DeviceManager
$dev = ($dm.DeviceInfos | Where-Object { $_.DeviceID -eq '<WIA_DEVICE_ID>' }).Connect()
$item = $dev.Items[1]
$item.Properties("6146").Value = 300
$img = $item.Transfer()
$out = "$env:TEMP\test_wia_scan.bmp"
$img.SaveFile($out)
Get-Item $out | Select-Object FullName, Length
```
- **Attendu si le pilote WIA + permissions fonctionnent** : création du fichier `%TEMP%\test_wia_scan.bmp` avec `Length > 0`.
- **Attendu si problème Session 0 / pilote / WIA `Transfer()`** : exception COM PowerShell (ex. `0x80210015`, `0x80070005` Access Denied, ou gel si UI attendue).

### Test 4 — Vérifier sous quel compte / session tourne le processus Node.js et la config lue (PowerShell)
```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId, SessionId, CommandLine
Get-Content .\backend\utils\scanner\config\devices.json
powershell -NoProfile -Command "Get-ExecutionPolicy -List"
```
- **Attendu (preuve `devices.json` + contexte service)** : `devices.json` affiche `"currentDeviceId": "panamfs:libusb:003:003"`. Si `SessionId -eq 0`, Node tourne comme service Windows (risque d'incompatibilité WIA interactive).

### Test 5 — Reproduire l'appel HTTP et constater le JSON complet masqué par Axios (PowerShell)
```powershell
$headers = @{ Authorization = "Bearer <JETON_ADMIN>" }
$body = @{ documentType = "temp"; format = "pdf"; resolution = 300 } | ConvertTo-Json
try {
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5000/api/scan/temp" -Headers $headers -ContentType "application/json" -Body $body
} catch {
  $_.Exception.Response.StatusCode.value__
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $reader.ReadToEnd()
}
```
- **Attendu** : code `400` et corps `{"success":false,"error":"Scanning failed: Scan operation failed: Scanner hardware required. No scan operation performed."}`.

---

## 6. Questions pour le propriétaire (décisions attendues avant correctif)

1. **Modèle exact et pilote du scanner** : Quel est le modèle exact (ex. Panasonic KV-S... / MFP...) et quel pilote est installé sur Windows (**WIA** + **TWAIN**, ou TWAIN uniquement) ?
2. **Emplacement physique du scanner** : Le scanner est-il branché directement (USB/réseau) sur le **serveur hébergeant Node.js**, ou bien sur les **PC individuels des agents** (auquel cas une architecture serveur WIA ne pourra pas piloter un scanner USB local sur le poste client sans agent local ou numérisation vers dossier/PDF) ?
3. **Mode de démarrage de Node.js sur Windows** : Le serveur est-il lancé en session utilisateur interactive (`npm start` / terminal) ou comme **service Windows** (NSSM / Planificateur de tâches en Session 0, et sous quel compte Windows) ?
4. **Politique souhaitée en production** : En l'absence de scanner ou `SCANNER_ENABLED=false`, souhaitez-vous masquer l'onglet « Scanner » côté UI, ou afficher un message fonctionnel localisé (AR/FR) sans jamais invoquer de mode simulé ?

Audit of the pasted text only; not run on the owner's machine
