# Guide d'installation et de déploiement DMS — Ubuntu 24.04 LTS VM (QEMU/KVM) & Windows Server

> **AVERTISSEMENT CRITIQUE DE RECETTE ET DE SÉCURITÉ — DONNÉES FICTIVES UNIQUEMENT**  
> **Ne pas exposer l'application en production réelle ni importer de données réelles (courriers, pièces jointes, dossiers RH, comptes nominatifs réels) tant que vous n'avez pas testé sur des données fictives et validé les lots S1, S2 et RBAC directement sur `https://192.168.100.131`.**  
> - Les remédiations de sécurité `server.ts`, du worker IA isolé (`aiWorker.js`), du versioning documentaire (`documentVersionHelper.js`) et des scripts `deploy/ubuntu/` sont marquées **`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`** : elles sont présentes dans le code source actuel du dépôt, mais toute procédure d'installation reste **`[NON TESTÉ EN RÉEL]`** sur la VM cible jusqu'à exécution de la recette complète (Étape 7).  
> - Chaque assertion technique distingue **`FAIT`** (vérifié dans le code avec `fichier:ligne`), **`HYPOTHÈSE`** (comportement système déduit), et **`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`**.

---

## Environnement cible Ubuntu VM confirmé

| Paramètre | Valeur confirmée pour la VM cible | Impact direct dans ce guide |
|---|---|---|
| **OS & Hyperviseur** | **Ubuntu 24.04 LTS (`noble`) Desktop** sous **QEMU/KVM** (`virt-manager`) | Nom de domaine KVM : **`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`**. Gestion veille GNOME + `NetworkManager` + `apt` détaillés dès l'**Étape 0**. |
| **Compte système / connexion** | Utilisateur existant **`dms`** | Déploiement **strictement sous `/var/www/dms`** détenu par `dms:dms` — **ne jamais déployer dans `/home/dms/Desktop`**. |
| **Interface réseau & IP** | Interface **`enp1s0`**, actuellement en `192.168.100.131/24` (DHCP) | Épinglage en **IP fixe `192.168.100.131/24`** via `nmcli` / Netplan à l'**Étape 0**, impérativement **avant** la génération des certificats TLS. |
| **Base de données** | **MongoDB 8.0** pour Ubuntu 24.04 (`noble`) | Installée et durcie via `deploy/ubuntu/install-mongodb.sh` (`?authSource=document-management`, `bindIp: 127.0.0.1`). |
| **URL d'accès & CORS** | **`https://192.168.100.131`** (port interne Node `5000`, HTTPS `443` via Nginx) | `ALLOWED_ORIGINS=https://192.168.100.131` dans `/var/www/dms/.env`, certificat SAN `IP:192.168.100.131`, UFW bloque `3000`, `5000`, `27017`. |

---

## Sommaire du guide

- **Partie 1 — Prérequis communs & référence technique** (Matériel, Node 22, MongoDB 8.0, paquets, variables `.env`, `tsx` vs `node server.ts`)
- **Partie 2 — Déploiement linéaire sur Ubuntu 24.04 LTS Desktop en VM (`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`) : Étape 0 → Étape 7**
  - **Étape 0** : Préparation VM QEMU/KVM, IP fixe `192.168.100.131/24` sur `enp1s0` (`nmcli`/Netplan), RAM/énergie (veille/GNOME), SSH, agents & verrous `apt`
  - **Étape 1** : Initialisation système via `deploy/ubuntu/setup-system.sh`
  - **Étape 2** : Installation et sécurisation de MongoDB 8.0 (`noble`) via `deploy/ubuntu/install-mongodb.sh`
  - **Étape 3** : Déploiement dans `/var/www/dms` (`dms:dms`), `npm ci`, `.env` unique (`chmod 600`) avec `ALLOWED_ORIGINS=https://192.168.100.131`
  - **Étape 4** : Modèles `.gguf`, `npm run build` et création du premier administrateur (`backend/scripts/create-superadmin.js`)
  - **Étape 5** : Supervision PM2 (`ecosystem.config.cjs`), `pm2 startup` et validation reboot sans session GNOME
  - **Étape 6** : Nginx, certificat auto-signé SAN `IP:192.168.100.131`, import sur poste client et pare-feu `ufw`
  - **Étape 7** : `logrotate`, sauvegarde `/var/backups/dms`, test de restauration, scanner USB QEMU/KVM et recette `smoke-test.mjs` / S1 / S2 / RBAC sur données fictives
- **Partie 3 — Exploitation, dépannage VM Ubuntu 24.04 & consolidation des correctifs**
- **Partie 4 — Déploiement sur Windows Server & recette Windows** (`[NON TESTÉ EN RÉEL]`)

---

# PARTIE 1 : PRÉREQUIS COMMUNS & RÉFÉRENCE TECHNIQUE

## 1. Matériel requis (déduit du code et de l'environnement Ubuntu 24.04 Desktop)

| Ressource | Exigence déduite du code | Source vérifiée (`fichier:ligne`) | Recommandation VM cible (`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`) |
|---|---|---|---|
| **RAM** | **16 Go minimum** sur serveur sans bureau ; **18 à 24 Go recommandés** avec GNOME Desktop actif | `ecosystem.config.cjs:34` (`max_memory_restart: '6G'`) ; `server.ts:81` (~5 Go préchargés) ; `MODELS.md:18` | Allouer **18 à 24 Go** tant que GNOME est actif (ou **16 Go** en basculant en `multi-user.target` à l'Étape 0), plus 2–4 Go de swap de secours. |
| **CPU** | **4 cœurs physiques minimum** (`LLAMA_THREADS` calculé à `os.cpus().length / 2`) | `server.ts:42-47` ; `MODELS.md:18,76` | **4 à 8 vCPU** en mode KVM **`host-passthrough`** (expose AVX/AVX2 pour `node-llama-cpp`), sans surallouer par rapport aux cœurs physiques de l'hôte. |
| **GPU** | Optionnel (`LLAMA_GPU_LAYERS=0` = 100 % CPU ; `>0` = CUDA/Vulkan) | `backend/workers/aiWorker.js` ; `MODELS.md:78-79` | **`LLAMA_GPU_LAYERS=0`** (inférence CPU pure en VM sans GPU PCI passthrough VFIO). |
| **Disque (`qcow2`)** | ~5 Go pour les 2 `.gguf` + `node_modules` + build C++ + OS Desktop + MongoDB + `courrier/` + `uploads/` + `/var/backups/dms` | `scripts/download-models.js` ; `MODELS.md:11-12` ; `deploy/scripts/backup-all.sh:99-111` | **120 Go à 250 Go+ `qcow2`** (`preallocation=metadata` recommandé en exploitation) selon la volumétrie PDF annuelle et 14 jours de rétention backup. |

---

## 2. Système d'exploitation, Node.js, Mongoose et MongoDB

- **OS cible Ubuntu VM (`FAIT`)** : **Ubuntu 24.04 LTS (`noble`) Desktop** sous QEMU/KVM (`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`).
- **OS cible Windows Server** : **Windows Server 2019 / 2022** (traité en Partie 4).
- **Runtime Node.js (`FAIT`)** : `deploy/scripts/check-env.mjs:48-56` exige **Node.js `>= 22.x`**. `deploy/ubuntu/setup-system.sh:112-121` installe **Node.js 22.x LTS** via NodeSource (ne jamais installer Node via Snap).
- **Alignement Mongoose & Express (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : `package.json:70,81` (racine) et `backend/package.json:15,21` sont alignés sur **`"express": "^5.2.1"`** et **`"mongoose": "^9.10.2"`**. Toutes les installations NPM doivent être exécutées **uniquement à la racine** (`/var/www/dms`) afin de conserver un unique `node_modules/`.
- **Version MongoDB (`FAIT` — `[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : sur Ubuntu 24.04 (`noble`), `deploy/ubuntu/install-mongodb.sh:48-61` détecte `noble` et installe automatiquement **MongoDB 8.0 Community** + `mongodb-database-tools` (`mongodump`, `mongorestore`).

---

## 3. Ports réseau, URL cible et stratégie TLS

| Paramètre réseau | Valeur / Règle | Preuve vérifiée (`fichier:ligne`) |
|---|---|---|
| **Port interne Node.js (`PORT`)** | **`5000`** (écoute sur `0.0.0.0:5000`, `server.ts:511`) | `ecosystem.config.cjs:42` (`PORT: 5000`), `deploy/ubuntu/dms.nginx.conf:7,73,83,94,114,130`, `deploy/ubuntu/deploy.sh:48`, `deploy/ubuntu/rollback.sh:31`, `deploy/scripts/check-env.mjs:38` (`EXPECTED_PORT = '5000'`), `deploy/windows/web.config:30`. *(Note : `server.ts:436` utilise `3000` uniquement si `PORT` est absent ou vaut `8080`.)* |
| **Ports exposés via Nginx / IIS** | **`80/tcp`** (redirection `301` → HTTPS) et **`443/tcp`** (HTTPS) | `deploy/ubuntu/dms.nginx.conf:17-36`, `deploy/ubuntu/setup-system.sh:144-146`. |
| **Ports bloqués de l'extérieur** | **`3000/tcp`**, **`5000/tcp`** et **`27017/tcp`** (MongoDB sur `127.0.0.1`) | `deploy/ubuntu/setup-system.sh:148-150` (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`), `deploy/ubuntu/install-mongodb.sh:121`. |
| **Adresse et origine HTTPS** | **`https://192.168.100.131`** (`server_name 192.168.100.131`, SAN `IP:192.168.100.131`) | `deploy/ubuntu/scripts/gen-selfsigned-cert.sh:18,48-63`, `server.ts:139-159,218-232`. Obligatoire en HTTPS car `NODE_ENV=production` force `cookie.secure = true` (`backend/controllers/auth/utils.js:17-19`). |

---

## 4. Liste des paquets et dépendances système selon l'architecture réelle

| Rôle dans le DMS | Preuve code (`fichier:ligne`) | Composants Ubuntu 24.04 (`setup-system.sh` / `install-mongodb.sh`) | Composants Windows Server (`install-prereqs.ps1`) |
|---|---|---|---|
| **Runtime JS/TS** | `package.json:7,9,137` ; `ecosystem.config.cjs:15-27` | `nodejs` (`22.x` NodeSource), `pm2` (`npm i -g pm2`), `git`, `curl` (`setup-system.sh:66-127`) | `nodejs-lts` (`22.14.0`), `git`, `nssm` (`install-prereqs.ps1:42-43,71`) |
| **Compilation native IA (`node-llama-cpp`)** | `package.json:85` ; `backend/workers/aiWorker.js` | `build-essential`, `cmake`, `pkg-config` (`setup-system.sh:72-74`) | `visualstudio2022buildtools` (`VCTools`), `cmake` (`install-prereqs.ps1:47-48`) |
| **Base de données & dump/restore** | `backend/config/db.js:58` ; `backup-all.sh:60` ; `restore-all.sh:136` | **`mongodb-org` 8.0**, `mongodb-database-tools` (`install-mongodb.sh:53-55,73`) | `mongodb`, `mongodb-database-tools` (`install-prereqs.ps1:52-53`) |
| **OCR & conversion PDF** | `backend/utils/ocrProcessor.js:11,64` | `tesseract-ocr`, `tesseract-ocr-ara`, `tesseract-ocr-fra`, `poppler-utils`, **`imagemagick`** (`setup-system.sh:81-86`, `[INTÉGRÉ DANS LE DÉPÔT]`), + `tesseract-ocr-eng` (complément recommandé) | `tesseract` (`ara`, `fra`, `eng` dans `tessdata`), `poppler`, `imagemagick` (optionnel) |
| **Numérisation physique (Scanner)** | `backend/utils/scanner/index.js` ; `linux/scannerDetection.js` ; `windows/scannerDetection.js` | **SANE** : **`sane-utils`**, **`img2pdf`**, utilisateur **`dms`** dans **`scanner,lp`** (`setup-system.sh:87-103`, `[INTÉGRÉ DANS LE DÉPÔT]`) | **WIA via PowerShell** : service `stisvc` + pilote WIA constructeur |
| **Reverse Proxy HTTPS & rotation** | `deploy/ubuntu/dms.nginx.conf` ; `deploy/windows/web.config` | `nginx`, `ufw`, `openssl` (`setup-system.sh:75-76`, `gen-selfsigned-cert.sh`), + `logrotate` | IIS (`Web-Server`, `Web-WebSockets`), **URL Rewrite 2.1**, **ARR 3.0** |
| **Redis / Bull** | `backend/jobs/ocrQueue.js` ; `package.json` | **NON REQUIS** (files non branchées dans `server.ts`) | **NON REQUIS** |

---

## 5. Variables d'environnement (`.env` racine unique)

> **Règle impérative (`FAIT`)** : `server.ts:38-39` lit `backend/.env` puis `.env` à la racine en fallback (`dotenv` n'écrase pas une variable déjà définie), tandis que `deploy/ubuntu/deploy.sh:32,38-45`, `deploy/ubuntu/rollback.sh:25-30`, `deploy/scripts/backup-all.sh:24-29` et `deploy/scripts/restore-all.sh:49-54` utilisent **le fichier `.env` à la racine**. Utilisez **un unique fichier `/var/www/dms/.env`** (`chmod 600`, propriétaire `dms:dms`) et supprimez tout `backend/.env`.

### Tableau de référence des variables `.env`

| Variable | Obligatoire | Rôle vérifié dans le code (`fichier:ligne`) | Valeur cible VM Ubuntu (`192.168.100.131`) |
|---|---|---|---|
| `NODE_ENV` | **Oui** | Sert `dist/` (`server.ts:496-501`), exige `JWT_SECRET` (`server.ts:53-58`), exige MongoDB au boot (`server.ts:470-480`), active `cookie.secure=true` (`auth/utils.js:17-19`) et HSTS (`server.ts:189-193`). | `production` |
| `PORT` | **Oui** | Port d'écoute Express (`server.ts:436,511`) et contrôle `check-env.mjs:38,69-76`. | `5000` |
| `MONGODB_URI` | **Oui** | Connexion Mongoose (`backend/config/db.js:27-62`) + `mongodump`/`mongorestore`. **`authSource` doit correspondre à `document-management`** (`install-mongodb.sh:106-113,141`). | `mongodb://dms_app_user:<MOT_DE_PASSE_APP>@127.0.0.1:27017/document-management?authSource=document-management` |
| `JWT_SECRET` | **Oui** | Signature/vérification JWT (`server.ts:53-58`, `auth.js:34-40`, `sockets/index.js`). Minimum 32 car. (`check-env.mjs:37`), recommandé 96 car. hex (`openssl rand -hex 48`). | `<SORTIE_OPENSSL_RAND_HEX_48>` |
| `JWT_EXPIRE` | Recommandée | Durée du jeton JWT (`server.ts:63`, `User.js` ; défaut code `30d`). | `8h` |
| `JWT_COOKIE_EXPIRE` | Recommandée | Durée du cookie HTTP-only en jours (`server.ts:64`, `auth/utils.js:8` ; défaut code `30`). | `1` |
| `ALLOWED_ORIGINS` | **Oui** | **Actif (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : liste blanche CORS Express & Socket.IO séparée par virgules (`server.ts:139-159,161-175,218-232`). | `https://192.168.100.131` |
| `DOCUMENT_PATH` | Recommandée | Lecture fichiers (`fileController.js`), `check-env.mjs:148`, `backup-all.sh:70`, `restore-all.sh:152`. *(Note : l'écriture de nouveaux courriers utilise `backend/courrier` via `documentHelper.js` — garder cette valeur exacte.)* | `/var/www/dms/backend/courrier` |
| `UPLOAD_DIR` | Recommandée | Téléversements & scans (`check-env.mjs:149`, `backup-all.sh:71`, `restore-all.sh:153`). *(Multer écrit dans `backend/uploads` — garder cette valeur exacte.)* | `/var/www/dms/backend/uploads` |
| `UPLOAD_PATH` | Recommandée | Module scanner (`scannerConfig.js:11`). Aligner sur `UPLOAD_DIR`. | `/var/www/dms/backend/uploads` |
| `BACKUP_DIR` / `BACKUP_PATH` / `BACKUP_ROOT` | **Oui (aligner)** | Utilisées respectivement par `backupScheduler.js` / `check-env.mjs:150` / `deploy.sh:49`, `backend/controllers/backup.js` et `scripts/backup-mongo.sh`. **Les trois doivent être strictement identiques.** | `/var/backups/dms` |
| `LLAMA_CHAT_MODEL_PATH` | Recommandée | Modèle GGUF Chat (`ollamaService.js:17-20`, `server.ts:444`, `check-env.mjs:173`). | `/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` |
| `LLAMA_EMBEDDING_MODEL_PATH` | Recommandée | Modèle GGUF Embedding (`ollamaService.js:22-25`, `server.ts:445`, `check-env.mjs:174`). | `/var/www/dms/models/bge-m3-q4_k_m.gguf` |
| `LLAMA_THREADS` | Non | Cœurs CPU pour `node-llama-cpp` (`server.ts:42-47`, défaut `os.cpus().length / 2`). | `4` |
| `LLAMA_GPU_LAYERS` | Non | `0` = exécution 100 % CPU sans GPU (`aiWorker.js`). | `0` |
| `DISABLE_AI_WARMUP` | Non | Si `true`, désactive le préchargement IA 5s après le boot (`server.ts:67`). *(Note : la variable s'appelle `DISABLE_AI_WARMUP`, pas `AI_WARMUP`.)* | `false` *(ou omis)* |
| `SCANNER_ENABLED` / `SCANNER_DEVICE_ID` / `SCANNER_RESOLUTION` / `SCANNER_FORMAT` | Non | Pilotage SANE/WIA côté serveur (`scannerConfig.js:15-18`). Laisser `SCANNER_ENABLED=false` tant qu'aucun scanner USB n'est branché en passthrough. | `false` / *(vide)* / `300` / `pdf` |
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | Non | Proxy sortant éventuel pour `scripts/download-models.js`. | *(vide si accès direct)* |
| `VITE_API_URL` | Non | Compilé dans le frontend Vite (`src/services/apiService.ts`, défaut `/api`). Laisser vide derrière Nginx même origine. | *(vide)* |

### Note d'exécution : `tsx` vs `npm start` (`node server.ts`)
- **`FAIT`** : `ecosystem.config.cjs:15-27` et `deploy/windows/install-service.ps1:55-62` démarrent `server.ts` via **`tsx`** (`./node_modules/.bin/tsx server.ts`). `package.json:9` définit `"start": "node server.ts"`, mais `server.ts` contient des annotations TypeScript (`err: Error`, `interface AppError`, `server.ts:34,370`). Conserver **`tsx`** via `ecosystem.config.cjs` en production.

---

# PARTIE 2 : DÉPLOIEMENT LINÉAIRE SUR VM UBUNTU 24.04 LTS DESKTOP (`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`)

> **Statut global** : **`[NON TESTÉ EN RÉEL]`** sur la VM cible.  
> **Convention stricte** : Exécuter les étapes dans l'ordre exact **Étape 0 → Étape 7**. L'application vit **exclusivement dans `/var/www/dms`** sous **`dms:dms`** — **jamais dans `/home/dms/Desktop`**.

---

## Étape 0 — Préparation VM QEMU/KVM, IP fixe `192.168.100.131` sur `enp1s0`, énergie/GNOME et verrous `apt` (`[NON TESTÉ EN RÉEL]`)

> **Objectif** : Transformer un Ubuntu 24.04 Desktop fraîchement installé dans la VM QEMU/KVM **`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`** en hôte serveur fiable avant toute installation de paquets DMS. **L'IP `192.168.100.131/24` sur `enp1s0` doit être épinglée en statique avant de générer le certificat TLS à l'Étape 6.**

### 0.1 Réglages hyperviseur QEMU/KVM sur l'hôte physique
1. **CPU, Firmware, Disque & Réseau (`virt-manager` / `virsh`)** :
   - **CPU** : mode **`host-passthrough`** (expose AVX/AVX2 pour `node-llama-cpp`), **4 à 8 vCPU** sans dépasser les cœurs physiques de l'hôte.
   - **RAM** : **18 à 24 Go** si le bureau GNOME reste actif (ou **16 Go** si bascule en `multi-user.target` au §0.3), et désactiver le *Memory Ballooning* (`<memballoon model='none'/>` dans `sudo virsh edit dms-Ubuntu-24-04-PC-Q35-ICH9-2009`) pour éviter les conflits OOM avec les ~5 Go de modèles GGUF chargés en permanence.
   - **Disque** : format **`qcow2`** sur bus **VirtIO** (`/dev/vda`).
   - **Réseau KVM** : vérifier que la VM est en mode **Bridge** sur le LAN (si elle est déjà joignable en `192.168.100.131` depuis les postes clients, vérifier simplement que la passerelle et le sous-réseau `192.168.100.0/24` correspondent au LAN cible).
2. **Démarrage automatique de la VM avec l'hôte KVM** (sur l'hôte physique) :
   ```bash
   sudo virsh autostart dms-Ubuntu-24-04-PC-Q35-ICH9-2009
   virsh dominfo dms-Ubuntu-24-04-PC-Q35-ICH9-2009 | grep -iE 'Name|State|Autostart|CPU|Max memory'
   ```

### 0.2 Épingler l'IP fixe `192.168.100.131/24` sur `enp1s0` (`nmcli` / Netplan) — OBLIGATOIRE AVANT TLS
> Sur Ubuntu 24.04 Desktop, `NetworkManager` pilote souvent l'interface via un profil `netplan-enp1s0` ou `"Wired connection 1"`. Un renouvellement DHCP qui changerait `192.168.100.131` casserait l'URL applicative, `ALLOWED_ORIGINS` et le certificat TLS.

1. **Relever la passerelle, le DNS et le profil actif actuels dans la VM** :
   ```bash
   ip -br addr show dev enp1s0
   ip route show default
   resolvectl status enp1s0 | grep -E 'DNS Servers|Current DNS'
   nmcli -t -f NAME,UUID,DEVICE,STATE con show
   ```
   *(Noter la passerelle `<PASSERELLE>`, ex. `192.168.100.1`, et le(s) serveur(s) DNS `<DNS>`, ex. `192.168.100.1` ou votre DNS interne.)*

2. **Méthode A — Via `nmcli` (si `NetworkManager` gère `enp1s0`)** :
   ```bash
   # Identifier le nom exact du profil actif attaché à enp1s0 :
   CON_NAME="$(nmcli -t -f NAME,DEVICE con show --active | awk -F: '$2=="enp1s0"{print $1; exit}')"
   echo "Profil actif : ${CON_NAME}"

   # Épingler 192.168.100.131/24 en manuel (remplacer <PASSERELLE> et <DNS> par les valeurs relevées ci-dessus) :
   sudo nmcli con mod "${CON_NAME}" \
     connection.interface-name enp1s0 \
     ipv4.method manual \
     ipv4.addresses "192.168.100.131/24" \
     ipv4.gateway "<PASSERELLE>" \
     ipv4.dns "<DNS>" \
     ipv4.ignore-auto-dns yes \
     connection.autoconnect yes

   sudo nmcli con up "${CON_NAME}"
   ```
   *(Si `nmcli con show` révèle un doublon de profil DHCP résiduel sur `enp1s0`, le supprimer avec `sudo nmcli con delete "<ANCIEN_PROFIL>"`.)*

3. **Méthode B — Via Netplan (`/etc/netplan/`) si un YAML Netplan réécrit le profil au boot (`renderer: NetworkManager`)** :
   ```bash
   ls -la /etc/netplan/
   # Sauvegarder les fichiers existants avant modification :
   sudo cp -a /etc/netplan /etc/netplan.bak.$(date +%Y%m%d)
   ```
   Écrire `/etc/netplan/01-dms-static.yaml` (adapter `<PASSERELLE>` et `<DNS>`, permissions strictes `600`) :
   ```bash
   sudo tee /etc/netplan/01-dms-static.yaml > /dev/null <<'EOF'
   network:
     version: 2
     renderer: NetworkManager
     ethernets:
       enp1s0:
         dhcp4: false
         addresses:
           - 192.168.100.131/24
         routes:
           - to: default
             via: <PASSERELLE>
         nameservers:
           addresses: [<DNS>]
   EOF
   sudo chmod 600 /etc/netplan/01-dms-static.yaml
   # Tester (rollback auto après 120s si non confirmé) puis valider :
   sudo netplan try
   ```

4. **Nom d'hôte & `/etc/hosts`, puis vérification réseau** :
   ```bash
   sudo hostnamectl set-hostname dms-vm
   grep -q "192.168.100.131" /etc/hosts || echo "192.168.100.131 dms-vm dms.local" | sudo tee -a /etc/hosts

   ip -br addr show dev enp1s0
   ip route
   nmcli -f ipv4.method,ipv4.addresses,ipv4.gateway,ipv4.dns con show "${CON_NAME}"
   ```
   Attendu : `192.168.100.131/24` en `manual`, passerelle par défaut active, résolution DNS OK (`getent hosts dms-vm`).

### 0.3 RAM, énergie (veille/hibernation/GNOME), agents invité & locales
1. **Empêcher toute mise en veille ou hibernation (obligatoire sur Ubuntu Desktop)** :
   ```bash
   sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

   sudo mkdir -p /etc/systemd/logind.conf.d
   sudo tee /etc/systemd/logind.conf.d/99-dms-no-sleep.conf > /dev/null <<'EOF'
   [Login]
   HandleSuspendKey=ignore
   HandleSuspendKeyLongPress=ignore
   HandleHibernateKey=ignore
   HandleHibernateKeyLongPress=ignore
   HandleLidSwitch=ignore
   HandleLidSwitchExternalPower=ignore
   HandleLidSwitchDocked=ignore
   IdleAction=ignore
   EOF
   sudo systemctl restart systemd-logind
   ```
   Dans une session terminal du bureau GNOME (pour désactiver la veille et le verrouillage de session graphique) :
   ```bash
   gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing'
   gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing'
   gsettings set org.gnome.desktop.session idle-delay 0
   gsettings set org.gnome.desktop.screensaver lock-enabled false
   ```
2. **Option RAM — Basculer sans interface graphique après configuration (`multi-user.target`)** *(recommandé si RAM VM ≤ 16 Go, libère ~1,5 Go de RAM GNOME)* :
   ```bash
   # À activer une fois la configuration initiale terminée (réversible via graphical.target) :
   # sudo systemctl set-default multi-user.target && sudo reboot
   ```
3. **Agents KVM, fuseau horaire & locales `fr`/`ar`** :
   ```bash
   sudo apt-get update
   sudo apt-get install -y qemu-guest-agent spice-vdagent locales
   sudo systemctl enable --now qemu-guest-agent

   sudo timedatectl set-timezone Africa/Tunis
   sudo timedatectl set-ntp true

   sudo sed -i 's/^# *\(fr_FR.UTF-8 UTF-8\)/\1/' /etc/locale.gen
   sudo sed -i 's/^# *\(ar_TN.UTF-8 UTF-8\)/\1/' /etc/locale.gen
   sudo locale-gen
   sudo update-locale LANG=fr_FR.UTF-8
   ```

### 0.4 SSH (`dms`), vérification Snap, verrous `apt` et snapshot initial
1. **Installer `openssh-server` et sécuriser l'accès SSH du compte `dms`** :
   ```bash
   sudo apt-get install -y openssh-server
   sudo systemctl enable --now ssh
   ```
   Depuis le poste d'administration (copier votre clé SSH avant de désactiver l'auth par mot de passe) :
   ```bash
   ssh-keygen -t ed25519 -C "admin-dms"   # Si vous n'avez pas encore de clé
   ssh-copy-id dms@192.168.100.131
   ssh dms@192.168.100.131                # Vérifier que la connexion par clé fonctionne !
   ```
   Une fois la connexion par clé confirmée dans un second terminal, durcir SSH dans la VM :
   ```bash
   sudo tee /etc/ssh/sshd_config.d/99-dms-hardening.conf > /dev/null <<'EOF'
   PermitRootLogin no
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PubkeyAuthentication yes
   EOF
   sudo sshd -t && sudo systemctl restart ssh
   ```
2. **Vérifier l'absence de Snap `node` / `mongo` et libérer les verrous `apt` (`unattended-upgrades` / `packagekitd`)** :
   ```bash
   snap list 2>/dev/null | grep -iE 'node|mongo' && echo "ALERTE : purger avec sudo snap remove node" || echo "OK : aucun snap node/mongo"

   while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
     echo "Verrou apt actif, attente 5s..."
     sleep 5
   done
   sudo systemctl stop unattended-upgrades apt-daily.timer apt-daily-upgrade.timer 2>/dev/null || true
   sudo systemctl disable apt-daily.timer apt-daily-upgrade.timer 2>/dev/null || true
   sudo apt-get check
   ```
3. **Snapshot KVM à froid avant installation applicative** (sur l'hôte physique) :
   ```bash
   sudo virsh shutdown dms-Ubuntu-24-04-PC-Q35-ICH9-2009
   watch -n 2 virsh domstate dms-Ubuntu-24-04-PC-Q35-ICH9-2009   # Attendre "shut off"
   sudo virsh snapshot-create-as --domain dms-Ubuntu-24-04-PC-Q35-ICH9-2009 \
     --name "etape0-vm-prete-$(date +%Y%m%d-%H%M)" \
     --description "Ubuntu 24.04 Desktop pret, IP 192.168.100.131 figee, SSH durci"
   sudo virsh start dms-Ubuntu-24-04-PC-Q35-ICH9-2009
   ```

---

## Étape 1 — Initialisation système (`deploy/ubuntu/setup-system.sh`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source (`FAIT`)** : `deploy/ubuntu/setup-system.sh:1-157`.
- **Ce que le script intègre déjà (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** :
  - Boucle d'attente de verrou APT/DPKG `wait_for_apt_lock()` (`:29-45`, jusqu'à 300s).
  - Fuseau `Africa/Tunis` (`:53`), `apt-get update && apt-get upgrade -y` (`:58-61`).
  - Outils système et compilation C++ : `ca-certificates curl gnupg lsb-release git build-essential cmake pkg-config nginx ufw` (`:66-76`).
  - Outils OCR, PDF et scan : `tesseract-ocr`, `tesseract-ocr-ara`, `tesseract-ocr-fra`, `poppler-utils`, **`imagemagick`**, **`sane-utils`**, **`img2pdf`** (`:81-88`).
  - Gestion du compte **`dms`** (`:92-104`) : détecte que le compte `dms` existe déjà sur la VM (`id "dms"`), puis lui ajoute les groupes **`scanner` et `lp`**. *(Note : le compte `dms` garde son répertoire `/home/dms` existant pour SSH, mais tout le déploiement applicatif vit strictement dans **`/var/www/dms`**.)*
  - Node.js **`22.x`** via NodeSource (`:112-121`) + **`pm2`** global (`:124-127`).
  - Création de `/var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}` (`:131-134`) et **`/var/backups/dms`** détenu par **`dms:dms`** (`chmod 750`, `:136-138`).
  - Pare-feu **UFW** (`:142-151`) : autorise `22/tcp`, `80/tcp`, `443/tcp` ; **bloque `3000/tcp`, `5000/tcp` et `27017/tcp`**.
- **Compléments recommandés** : installer `tesseract-ocr-eng` (OCR trilingue `ara+fra+eng` utilisé par `backend/utils/ocrProcessor.js`) et `logrotate` (pour l'Étape 7).

### Commandes (dans la VM en SSH sous `dms` avec `sudo`, depuis le dossier où les sources sont extraites temporairement ou déjà placées dans `/var/www/dms`)
```bash
# Si le dépôt est déjà cloné/copié dans /var/www/dms :
cd /var/www/dms
sudo bash deploy/ubuntu/setup-system.sh

# Compléments recommandés (OCR anglais + logrotate) :
sudo apt-get install -y tesseract-ocr-eng logrotate
```

### Vérification
```bash
node -v && npm -v && pm2 -v
id dms
tesseract --list-langs | grep -E 'ara|fra|eng'
command -v pdftoppm convert img2pdf scanimage
sudo ufw status verbose
ls -ld /var/www/dms /var/backups/dms
```
Attendu : `node` en `v22.x`, `dms` membre de `scanner` et `lp`, `ara`/`fra`/`eng` présents, `ufw` `active` (`22`, `80`, `443` `ALLOW` ; `3000`, `5000`, `27017` `DENY`), `/var/www/dms` et `/var/backups/dms` détenus par `dms:dms`.

---

## Étape 2 — Installation et sécurisation de MongoDB 8.0 (`noble`) (`deploy/ubuntu/install-mongodb.sh`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source (`FAIT`)** : `deploy/ubuntu/install-mongodb.sh:1-144`.
- **Ce que le script intègre déjà (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** :
  - Détection automatique d'Ubuntu 24.04 (`noble`) → **MongoDB 8.0** (`:48-61`).
  - Attente des verrous APT (`:25-41`) et installation de `mongodb-org` + `mongodb-database-tools` (`mongodump`, `mongorestore`, `:73`).
  - Création interactive (sans mot de passe codé en dur) de `admin_dms` (base `admin`, `:97-104`) et `dms_app_user` (base `document-management`, `:106-113`).
  - Verrouillage strict `bindIp: 127.0.0.1` (`:121`), activation de `security.authorization: enabled` (`:123-131`) et affichage de l'URI avec **`?authSource=document-management`** (`:141`).

### Commandes
```bash
# Préparer deux mots de passe forts distincts (ex: openssl rand -hex 24)
# sans caractères spéciaux non encodés dans URI (éviter @ / : ? # % dans le mot de passe)
cd /var/www/dms
sudo bash deploy/ubuntu/install-mongodb.sh
```

### Vérification
```bash
sudo systemctl is-active mongod
sudo systemctl is-enabled mongod
ss -ltnp | grep 27017
grep -nE 'bindIp|authorization' /etc/mongod.conf
mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" --password --eval "db.runCommand({ connectionStatus: 1 })"
```
Attendu : `active`, `enabled`, écoute exclusivement sur `127.0.0.1:27017`, `connectionStatus` retourne `ok: 1` avec `authenticatedUsers` contenant `dms_app_user`.

---

## Étape 3 — Déploiement dans `/var/www/dms` (`dms:dms`), `npm ci` et `.env` unique (`chmod 600`) (`[NON TESTÉ EN RÉEL]`)

- **Règle d'emplacement stricte** : le code applicatif et les données (`backend/courrier`, `backend/uploads`, `models`, `dist`, `logs`) doivent résider **strictement dans `/var/www/dms`** sous **`dms:dms`**, **jamais dans `/home/dms/Desktop`**.
- **État du dépôt (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** :
  - `package.json:70,81` et `backend/package.json:15,21` sont alignés sur `express ^5.2.1` et `mongoose ^9.10.2` (installation racine unique pour `npm ci`).
  - `server.ts:127-159,161-175,217-232` applique la liste blanche dynamique **`ALLOWED_ORIGINS`** sur Express et Socket.IO : fixer **`ALLOWED_ORIGINS=https://192.168.100.131`** dans `/var/www/dms/.env`.

### Commandes
```bash
# 1) Vérifier l'emplacement, supprimer tout backend/.env concurrent et garantir dms:dms sur /var/www/dms
sudo mkdir -p /var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}
sudo rm -f /var/www/dms/backend/.env
sudo chown -R dms:dms /var/www/dms

# 2) Installer les dépendances depuis la racine sous l'utilisateur dms (jamais dans backend/)
sudo -u dms -H bash -c '
  cd /var/www/dms
  if [ ! -f package-lock.json ]; then
    npm install --package-lock-only
  fi
  npm ci
  npm ls mongoose
'

# 3) Générer une clé JWT_SECRET forte (96 car. hex) :
JWT_GEN="$(openssl rand -hex 48)"
echo "JWT_SECRET généré (ne pas le partager) : ${JWT_GEN}"
```

Créer l'unique fichier **`/var/www/dms/.env`** (remplacer `<MOT_DE_PASSE_APP>` par le mot de passe saisi pour `dms_app_user` à l'Étape 2, et `<JWT_SECRET_96_HEX>` par la sortie d'`openssl rand -hex 48`) :
```bash
sudo -u dms -H tee /var/www/dms/.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb://dms_app_user:<MOT_DE_PASSE_APP>@127.0.0.1:27017/document-management?authSource=document-management

JWT_SECRET=<JWT_SECRET_96_HEX>
JWT_EXPIRE=8h
JWT_COOKIE_EXPIRE=1

ALLOWED_ORIGINS=https://192.168.100.131

DOCUMENT_PATH=/var/www/dms/backend/courrier
UPLOAD_DIR=/var/www/dms/backend/uploads
UPLOAD_PATH=/var/www/dms/backend/uploads

BACKUP_DIR=/var/backups/dms
BACKUP_PATH=/var/backups/dms
BACKUP_ROOT=/var/backups/dms

LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf
LLAMA_THREADS=4
LLAMA_GPU_LAYERS=0

SCANNER_ENABLED=false
SCANNER_DEVICE_ID=
SCANNER_RESOLUTION=300
SCANNER_FORMAT=pdf
EOF

sudo chown dms:dms /var/www/dms/.env
sudo chmod 600 /var/www/dms/.env
```

### Vérification
```bash
ls -la /var/www/dms/.env
test ! -f /var/www/dms/backend/.env && echo "OK : aucun backend/.env concurrent"
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && node deploy/scripts/check-env.mjs'
```
Attendu : `-rw------- 1 dms dms ... .env`, `check-env.mjs` valide `NODE_ENV=production`, `PORT=5000`, `JWT_SECRET`, `MONGODB_URI`, et l'accès écriture de `dms` sur `courrier`, `uploads` et `/var/backups/dms` (seuls les modèles `.gguf` affichent un avertissement avant l'Étape 4).

---

## Étape 4 — Modèles `.gguf`, `npm run build` et premier administrateur (`create-superadmin.js`) (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources (`FAIT`)** : `package.json:11,20-21`, `scripts/download-models.js`, `backend/scripts/checkModelPath.js`, `backend/scripts/create-superadmin.js:1-175`, `MODELS.md:1-113`.
- **Premier administrateur (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : `backend/scripts/create-superadmin.js:1-175` crée interactivement le premier compte **`Admin`** (rôle maximal défini dans `backend/models/User.js`, car `'SuperAdmin'` n'existe pas) en terminal TTY avec mot de passe masqué `>= 12` caractères (minuscule + majuscule + chiffre). Aucun compte ou mot de passe par défaut n'est créé automatiquement.

### Commandes
```bash
# 1) Télécharger les modèles GGUF (~4.26 Go + ~417 Mo) et vérifier les chemins
# (Si hors-ligne : copier les deux .gguf dans /var/www/dms/models/ avec chown dms:dms, puis lancer check-models)
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && npm run download-models && npm run check-models'

# 2) Compiler le frontend React/Vite dans /var/www/dms/dist/
sudo -u dms -H bash -c 'cd /var/www/dms && npm run build'

# 3) Re-contrôler check-env.mjs (0 erreur, 0 avertissement attendu)
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && node deploy/scripts/check-env.mjs'

# 4) Créer le premier compte Admin de recette (terminal TTY interactif requis)
cd /var/www/dms && sudo -u dms -H node backend/scripts/create-superadmin.js
```

### Vérification
```bash
ls -lh /var/www/dms/models/*.gguf
test -f /var/www/dms/dist/index.html && echo "dist/index.html OK"
mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" --password --quiet --eval "db.users.find({role:'Admin'}, {username:1, role:1, isActive:1})"
```
*(Si `npm run build` échoue par manque de RAM alors que GNOME est ouvert, vérifier `free -h` et ajouter un swap temporaire ou passer en `multi-user.target`.)*

---

## Étape 5 — Supervision PM2 (`ecosystem.config.cjs`), `pm2 startup` et reboot sans session GNOME (`[NON TESTÉ EN RÉEL]`)

- **Fichier source (`FAIT`)** : `ecosystem.config.cjs:15-50` exécute `server.ts` via `./node_modules/.bin/tsx`, en mode **`fork`**, **`instances: 1`** (obligatoire pour ne pas dupliquer les ~5 Go de modèles GGUF ni casser la map Socket.IO en mémoire), `max_memory_restart: '6G'`, `PORT: 5000`, logs dans `/var/www/dms/logs/`.
- **Impératif Ubuntu Desktop** : exécuter PM2 sous `dms` et installer l'unité systemd système **`pm2-dms.service`** (`--hp /var/www/dms`) afin que le backend démarre au boot **sans aucune session graphique GNOME ouverte**.

### Commandes
```bash
# 1) Démarrer dms-backend sous PM2 et sauvegarder la liste
sudo -u dms -H bash -c 'cd /var/www/dms && pm2 start ecosystem.config.cjs && pm2 save'

# 2) Générer et activer le service systemd au démarrage (indépendant de GNOME)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u dms --hp /var/www/dms
sudo systemctl enable pm2-dms
```

### Vérification immédiate puis validation après reboot SANS session GNOME
```bash
sudo systemctl status pm2-dms --no-pager
sudo -u dms -H pm2 status
ss -ltnp | grep ':5000'
curl -sf http://127.0.0.1:5000/api/health

# Test obligatoire : redémarrer la VM, NE PAS se connecter sur l'écran GNOME, et vérifier via SSH :
sudo reboot
```
Après reconnexion SSH uniquement :
```bash
systemctl is-active mongod pm2-dms
sudo -u dms -H pm2 status
curl -sf http://127.0.0.1:5000/api/health
```
Attendu : `mongod` et `pm2-dms` `active`, `dms-backend` `online` (`1` instance `fork`), `/api/health` retourne `"database":"connected"` sans session GNOME ouverte.

---

## Étape 6 — Nginx, certificat auto-signé SAN `IP:192.168.100.131`, import poste client et `ufw` (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources (`FAIT`)** : `deploy/ubuntu/scripts/gen-selfsigned-cert.sh:1-73`, `deploy/ubuntu/dms.nginx.conf:1-148`.
- **Points intégrés (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** :
  - `gen-selfsigned-cert.sh 192.168.100.131` génère un certificat RSA 4096 bits valide 3 ans avec **`IP.2 = 192.168.100.131`** dans l'extension **Subject Alternative Name (SAN)** (`:55-63`), exigé par Chrome/Edge.
  - `deploy/ubuntu/dms.nginx.conf:72,82` inclut le préfixe **`^~`** sur `location ^~ /courrier/` et `location ^~ /uploads/` afin qu'aucune règle regex statique (`:142`) ne contourne l'authentification Express (`protect`).

### Commandes (dans la VM)
```bash
# 1) Générer le certificat auto-signé SAN pour 192.168.100.131
sudo bash /var/www/dms/deploy/ubuntu/scripts/gen-selfsigned-cert.sh 192.168.100.131

# Vérifier que IP Address:192.168.100.131 figure bien dans le SAN :
openssl x509 -in /etc/ssl/certs/dms-selfsigned.crt -noout -text | grep -A3 "Subject Alternative Name"

# 2) Installer et adapter la configuration Nginx pour 192.168.100.131
sudo cp /var/www/dms/deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.conf
sudo sed -i 's|server_name dms.local;|server_name 192.168.100.131;|g' /etc/nginx/sites-available/dms.conf

sudo ln -sf /etc/nginx/sites-available/dms.conf /etc/nginx/sites-enabled/dms.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

# 3) Vérifier le pare-feu UFW (configuré par setup-system.sh:142-151)
sudo ufw status verbose
```

### Import obligatoire du certificat sur chaque poste client (et navigateur local)
> `NODE_ENV=production` active `cookie.secure = true` (`backend/controllers/auth/utils.js:17-19`). Sans confiance TLS sur le certificat, le navigateur bloquera l'accès ou refusera les cookies/WebSockets (`wss://192.168.100.131`).

- **Récupérer le certificat public depuis la VM** : `/etc/ssl/certs/dms-selfsigned.crt` (ne **jamais** copier `.key` !).
  - Exemple depuis un poste admin : `scp dms@192.168.100.131:/etc/ssl/certs/dms-selfsigned.crt ./dms-selfsigned.crt`
- **Poste client Windows (PowerShell Administrateur)** :
  ```powershell
  certutil -addstore -f "Root" .\dms-selfsigned.crt
  ```
  *(Firefox Windows : activer `security.enterprise_roots.enabled = true` dans `about:config` ou importer `dms-selfsigned.crt` dans Paramètres → Vie privée et sécurité → Certificats → Autorités.)*
- **Poste client Ubuntu / Linux (et navigateur local sur la VM si utilisé)** :
  ```bash
  sudo cp dms-selfsigned.crt /usr/local/share/ca-certificates/dms-selfsigned.crt
  sudo update-ca-certificates
  ```
  *(Chrome/Chromium/Edge utilisent aussi la base NSS utilisateur `~/.pki/nssdb` si besoin ; Firefox utilise son propre magasin d'autorités.)*

### Vérification
```bash
sudo nginx -t
sudo nginx -T | grep -nE 'server_name|location \^~ /(courrier|uploads)'
ss -ltnp | grep -E ':(80|443)\b'
curl -skI https://192.168.100.131/api/health
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.131/uploads/attachments/test.jpg
```
Attendu : `/api/health` retourne `200` ; `/uploads/attachments/test.jpg` sans jeton retourne `401` ou `403` (jamais `404` Nginx).

---

## Étape 7 — Logrotate, sauvegarde `/var/backups/dms`, restauration, scanner USB et recette sur données fictives (`[NON TESTÉ EN RÉEL]`)

### 7.1 Rotation des journaux (`logrotate`)
- **Fichier source** : `deploy/ubuntu/logrotate/dms:1-15`. Sur Ubuntu 24.04, ajouter `su dms dms` car `/var/www/dms/logs` appartient à `dms:dms`.
```bash
sudo cp /var/www/dms/deploy/ubuntu/logrotate/dms /etc/logrotate.d/dms
sudo sed -i '1i su dms dms' /etc/logrotate.d/dms
sudo chown root:root /etc/logrotate.d/dms
sudo chmod 644 /etc/logrotate.d/dms
sudo logrotate -d /etc/logrotate.d/dms
```

### 7.2 Sauvegarde quotidienne `systemd` (`/var/backups/dms`) et test de restauration
- **Fichiers sources (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : `deploy/ubuntu/systemd/dms-backup.service:1-16`, `dms-backup.timer:1-13`, `deploy/scripts/backup-all.sh:1-151`, `deploy/scripts/restore-all.sh:1-184`.
```bash
# 1) Activer le timer quotidien (02:00) et lancer une première sauvegarde manuelle
sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.service /etc/systemd/system/dms-backup.service
sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.timer /etc/systemd/system/dms-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now dms-backup.timer
sudo systemctl start dms-backup.service

# 2) Vérifier l'archive créée dans /var/backups/dms
systemctl list-timers --all | grep dms-backup
sudo journalctl -u dms-backup.service -n 30 --no-pager
LATEST_BKP="$(ls -1t /var/backups/dms/dms_full_backup_*.tar.gz | head -n1)"
echo "Archive : ${LATEST_BKP}"
tar -tzf "${LATEST_BKP}" | head -n 30

# 3) Test de restauration NON DESTRUCTIF vers 'document-management-test' (sans --target-prod)
# Note : dms_app_user n'a droits que sur 'document-management' ; utiliser admin_dms pour la base de test :
sudo -u dms -H bash -c "
  cd /var/www/dms
  MONGODB_URI='mongodb://admin_dms:<MOT_DE_PASSE_ADMIN>@127.0.0.1:27017/document-management-test?authSource=admin' \
    bash deploy/scripts/restore-all.sh '${LATEST_BKP}'
"
```
> **Rappel sauvegarde hors VM (`DÉCISION D'EXPLOITATION`)** : `/var/backups/dms` reste sur le disque virtuel de la VM. Répliquez régulièrement `/var/backups/dms/*.tar.gz` **et** l'image `.qcow2` (via `virsh` à froid ou `--quiesce` avec `qemu-guest-agent`) vers un stockage externe (NAS/disque chiffré/serveur distant).

### 7.3 Scanner USB en VM QEMU/KVM (`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`) *(uniquement si un scanner physique est raccordé à l'hôte KVM)*
> Si aucun scanner physique n'est raccordé à la VM, laisser `SCANNER_ENABLED=false` dans `/var/www/dms/.env` et passer directement au §7.4.

1. **Passthrough USB hôte → VM** :
   - Sur l'hôte KVM (`virt-manager`), ouvrir **`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`** → **Détails** → vérifier que le contrôleur USB est **USB 3 (`nec-xhci`)** ou **USB 2**, puis **Ajouter un matériel → Périphérique hôte USB** et sélectionner le scanner.
   - Alternative CLI sur l'hôte (`lsusb` pour relever `idVendor`/`idProduct`) :
     ```bash
     cat <<'EOF' > /tmp/scanner-usb.xml
     <hostdev mode='subsystem' type='usb' managed='yes'>
       <source>
         <vendor id='0x<VENDOR>'/>
         <product id='0x<PRODUCT>'/>
       </source>
     </hostdev>
     EOF
     sudo virsh attach-device dms-Ubuntu-24-04-PC-Q35-ICH9-2009 /tmp/scanner-usb.xml --live --config
     ```
2. **Activation & contrôle SANE dans la VM sous le compte `dms`** :
   ```bash
   lsusb
   id dms                              # Doit inclure scanner et lp (setup-system.sh:99-103)
   sudo -u dms -H scanimage -L         # Doit lister device `<backend>:<adresse>' ...

   # Si scanimage -L OK sous dms, activer le scanner dans .env et redémarrer pm2-dms :
   sudo sed -i 's/^SCANNER_ENABLED=.*/SCANNER_ENABLED=true/' /var/www/dms/.env
   sudo systemctl restart pm2-dms
   ```
   *(Vigilance Ubuntu Desktop : ne pas laisser **Document Scanner / `simple-scan`** ouvert sur le bureau GNOME, et vérifier `sudo fuser -v /dev/bus/usb/*/*` en cas d'erreur `device busy` / conflit `ipp-usb`.)*

### 7.4 Recette complète (`smoke-test.mjs` + tests S1 / S2 / RBAC sur `https://192.168.100.131` avec données fictives)

1. **Suite automatisée `deploy/scripts/smoke-test.mjs`** :
   ```bash
   # Depuis la VM (NODE_TLS_REJECT_UNAUTHORIZED=0 uniquement pour le test local du certificat auto-signé) :
   NODE_TLS_REJECT_UNAUTHORIZED=0 node /var/www/dms/deploy/scripts/smoke-test.mjs "https://192.168.100.131" --strict-security
   ```
   - **Attendu avec le code actuel (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** :
     - **Groupe 1 Déploiement (`DEP-01`..`DEP-04`)** : `4/4 PASS` (`/api/health` 200 `connected`, `/api/departments` sans jeton `401`, `GET /` HTML SPA, route inconnue `404`).
     - **Groupe 2 Sécurité (`SEC-01`..`SEC-09`)** :
       - `SEC-01/02` (`reset-admin`, `test-admin` → `404`), `SEC-03/04` (`helmet` masque `X-Powered-By` et injecte `X-Content-Type-Options: nosniff`),
       - `SEC-05` (CORS `Origin: http://evil.test` rejeté grâce à `ALLOWED_ORIGINS` dans `server.ts:139-159,218-232`),
       - `SEC-06/07` (`/uploads/usersphoto/...` et `/uploads/attachments/...` → `401`/`403` via `server.ts:282-295` et `^~` dans `dms.nginx.conf:82`),
       - `SEC-08` (`loginLimiter` `server.ts:255-268` bloque au bout de 5 échecs avec HTTP `429`),
       - `SEC-09` (`/api/departments?x=/messages` sans jeton → `401`).
   - *Note opérationnelle (`server.ts:124,255-268`)* : `SEC-08` déclenche volontairement le rate-limiter `loginLimiter` (fenêtre de 15 minutes par IP) depuis l'IP qui lance `smoke-test.mjs`. Si vous testez ensuite le login depuis la même IP, attendez 15 minutes ou exécutez `sudo -u dms -H pm2 reload dms-backend` pour réinitialiser le compteur en mémoire.

2. **Matrice de recette fonctionnelle et sécurité sur données fictives (`https://192.168.100.131`)** :

| Contrôle à valider avant toute donnée réelle | Commande / Action de vérification | Résultat attendu (critère de passage) |
|---|---|---|
| **R-01 : Protection fichiers (`/courrier/`, `/uploads/`)** | `for p in /courrier/2026/test.pdf /uploads/attachments/test.pdf /uploads/attachments/test.jpg /uploads/usersphoto/test.jpg /uploads/personnelphoto/test.jpg; do printf "$p -> "; curl -sk -o /dev/null -w "%{http_code}\n" "https://192.168.100.131$p"; done` | HTTP **`401` ou `403`** sur les 5 chemins (jamais `404` Nginx ni `200`). |
| **R-02 : Swagger Admin-only (`/api-docs`)** | `curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.100.131/api-docs` *(sans jeton puis avec jeton rôle `User`)* | `401` sans jeton ; `403` avec rôle `User` ; accessible uniquement avec rôle `Admin` (`server.ts:301-305`). |
| **R-03 : Coupure MongoDB → refus strict (S1)** | `sudo systemctl stop mongod && sleep 2 && curl -sk -w " (HTTP %{http_code})\n" https://192.168.100.131/api/health && curl -sk -o /dev/null -w "LOGIN:%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"username":"x","password":"y"}' https://192.168.100.131/api/auth/login` *(puis `sudo systemctl start mongod`)* | `/api/health` indique `"database":"disconnected"` ; `POST /api/auth/login` retourne **`503`** (aucun login hors ligne ni fallback `200` en production, `server.ts:418-421`). |
| **R-04 : Validation S1 / S2 / RBAC dans le navigateur (données fictives)** | Depuis un poste client ayant importé `dms-selfsigned.crt`, ouvrir **`https://192.168.100.131`**, vérifier l'absence de compte par défaut, créer des départements/utilisateurs **fictifs** (`Admin`, `AdminDepartment`, `AdminTuningDesk`, `User`), créer un courrier et un agent RH fictifs, tester la mise à jour d'un PDF scanné (versioning `v1`/`v2`), le chat RAG IA, et l'isolation RBAC entre départements. | Cadenas HTTPS valide, cookie `Secure` conservé, chaque rôle ne voit/modifie que son périmètre, l'ancien PDF n'est pas écrasé (`documentVersionHelper`), `pm2 logs dms-backend` sans erreur critique. |
| **R-05 : Isolation réseau externe** | Depuis un poste du LAN : `curl -sI http://192.168.100.131/` et `nc -zv 192.168.100.131 5000` / `27017` / `3000` | Port `80` redirige `301` vers `https://192.168.100.131/...` ; ports `3000`, `5000` et `27017` filtrés/refusés. |

---

# PARTIE 3 : EXPLOITATION, DÉPANNAGE VM UBUNTU 24.04 & CONSOLIDATION DES CORRECTIFS

## 3.1 Mise à jour applicative et retour arrière (`deploy.sh` & `rollback.sh`) (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)** : `deploy/ubuntu/deploy.sh:1-106`, `deploy/ubuntu/rollback.sh:1-59`.
- `deploy.sh` source `/var/www/dms/.env` (`:43-46`), exécute `check-env.mjs` (`:51`), lance une sauvegarde préalable dans `/var/backups/dms` (`:55-57`), conserve `dist.bak` (`:60-63`), exécute `npm ci` (`:67`) et `npm run build` (`:71`), recharge `dms-backend` (`:75-82`), puis lance `smoke-test.mjs` (`:91`) avec **rollback automatique** en cas d'échec (`:95-100`).

```bash
# Mise à jour applicative (sous l'utilisateur dms) :
sudo -u dms -H bash /var/www/dms/deploy/ubuntu/deploy.sh

# Retour arrière manuel d'urgence :
sudo -u dms -H bash /var/www/dms/deploy/ubuntu/rollback.sh
```

---

## 3.2 Dépannage spécifique VM Ubuntu 24.04 Desktop

| Symptôme | Cause probable vérifiée | Diagnostic et résolution |
|---|---|---|
| **Erreur `apt` / `dpkg` verrouillé** | `unattended-upgrades` ou `packagekitd` détient `/var/lib/dpkg/lock-frontend`. | `sudo lsof /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock` ; attendre ou désactiver `unattended-upgrades` (Étape 0.4). Si `dpkg` interrompu : `sudo dpkg --configure -a`. |
| **Changement d'IP ou conflit DNS sur `enp1s0`** | Profil DHCP résiduel ou conflit Netplan/NetworkManager. | `ip -br a && nmcli -f NAME,UUID,DEVICE,STATE con show` ; supprimer l'ancien profil DHCP et réappliquer `192.168.100.131/24` (Étape 0.2). |
| **HTTP `502 Bad Gateway` sur `https://192.168.100.131`** | `dms-backend` arrêté (crash `JWT_SECRET` absent, MongoDB arrêté, OOM) ou désaccord de port (`5000`). | `sudo -u dms -H pm2 status && tail -n 50 /var/www/dms/logs/err.log` ; `ss -ltnp \| grep ':5000'` ; `sudo systemctl status mongod`. |
| **CORS bloqué (`Origine non autorisée par CORS`)** | Requête depuis une origine non listée dans `ALLOWED_ORIGINS` (`server.ts:139-159`). | Vérifier `grep ALLOWED_ORIGINS /var/www/dms/.env` (`https://192.168.100.131`) puis `sudo -u dms -H pm2 reload dms-backend --update-env`. |
| **HTTP `429` au login après `smoke-test.mjs`** | `loginLimiter` (`server.ts:255-268`, max 5 échecs / 15 min) activé par `SEC-08`. | Attendre 15 min ou recharger PM2 (`sudo -u dms -H pm2 reload dms-backend`). |
| **Cookie de session rejeté / TLS avertissement** | Certificat `dms-selfsigned.crt` non importé dans les autorités racines du poste client (`cookie.secure=true`). | Réimporter `/etc/ssl/certs/dms-selfsigned.crt` sur le poste client (Étape 6) et vérifier la présence de `IP:192.168.100.131` dans le SAN. |
| **OOM / PM2 redémarre (`↺` augmente)** | GNOME Desktop + `.gguf` (~5 Go) + build Vite dépassent la RAM VM. | `free -h && sudo dmesg -T \| grep -iE 'oom|killed process'`. Basculer la VM en `sudo systemctl set-default multi-user.target` ou augmenter la RAM VM à 24 Go. |
| **Écran noir console `virt-manager`** | Veille `gdm3` / pilote QXL/Virtio sous Wayland. | Tester en SSH (`ssh dms@192.168.100.131`), vérifier Étape 0.3 (cibles `sleep`/`suspend` masquées), basculer TTY (`Ctrl+Alt+F3`) ou passer en `multi-user.target`. |
| **Scanner USB non vu sous `dms`** | Passthrough absent, droits `/dev/bus/usb`, ou conflit *Simple Scan* / `ipp-usb`. | `lsusb`, `sudo -u dms -H scanimage -L`, fermer *Simple Scan*, vérifier `id dms` (`scanner,lp`) et `SCANNER_ENABLED=true` dans `.env`. |

---

## 3.3 État consolidé des remédiations dans le dépôt (`[INTÉGRÉ DANS LE DÉPÔT — À VALIDER SUR VM]`)

1. **Sécurité & serveur unifié (`server.ts`)** :
   - CORS strict par liste blanche `ALLOWED_ORIGINS` + même hôte sur Express et Socket.IO (`server.ts:127-175,217-232`).
   - En-têtes `helmet` (`hsts` en production, `server.ts:183-195`), sanitisation NoSQL `express-mongo-sanitize` (`:202-215`), rate limiting global et `loginLimiter` sur `POST /api/auth/login` (`:234-268`), `app.set('trust proxy', 1)` (`:124`).
   - Protection de `/api/files/:type/:id/:filename`, `/courrier`, `/uploads/usersphoto`, `/uploads/personnelphoto`, `/uploads` par `protect`, et blocage `403` sur `/uploads/attachments|temp|templates` (`:276-296`).
   - Documentation `/api-docs` et `/api-docs.json` restreinte à `protect, authorize('Admin')` (`:298-308`).
   - Arrêt immédiat (`exit(1)`) en production si `JWT_SECRET` absent (`:53-58`) ou MongoDB injoignable (`:470-480`) ; gestionnaire d'erreur DB renvoyant `503` en production (`:385-422`).
2. **IA isolée & indexation (`backend/services/ollamaService.js`, `backend/workers/aiWorker.js`, `server.ts`)** :
   - Exécution de `node-llama-cpp` isolée en processus fils IPC (`child_process.fork` dans `ollamaService.js:27,86`), arrêt propre `shutdownAIWorker()` (`server.ts:539-543`), et ordonnanceur `startIndexRetryScheduler()` / `stopIndexRetryScheduler()` câblé dans `server.ts:87-95,533-537`.
3. **Versioning documentaire (`backend/controllers/incomingDocuments/managementControllers/documentUpdateController.js`, `backend/utils/documentVersionHelper.js`)** :
   - Archivage et incrément immuable des versions (`isSameDocumentPath`, `prepareNextVersionState`, `appendNewVersion`) lors de la mise à jour d'un document numérisé.
4. **Scripts d'infrastructure Ubuntu (`deploy/ubuntu/` & `deploy/scripts/`)** :
   - `setup-system.sh` : `wait_for_apt_lock`, `imagemagick`, `sane-utils`, `img2pdf`, `dms` dans `scanner,lp`, `/var/backups/dms`, `ufw deny 3000/tcp` et `5000/tcp`.
   - `install-mongodb.sh` : détection dynamique `jammy -> 7.0` / `noble -> 8.0` et `?authSource=document-management`.
   - `deploy/ubuntu/dms.nginx.conf` : modificateur **`^~`** devant `/courrier/` et `/uploads/`.
   - `deploy.sh`, `rollback.sh`, `backup-all.sh`, `restore-all.sh`, `check-env.mjs`, `create-superadmin.js`, `backend/package.json` alignés et prêts pour validation sur la VM cible.
5. **Points résiduels à garder à l'esprit (hors périmètre bloquant VM)** :
   - Garder `DOCUMENT_PATH=/var/www/dms/backend/courrier` et `UPLOAD_DIR=/var/www/dms/backend/uploads` sur leurs dossiers natifs (l'écriture contrôleur/Multer pointe sur `backend/courrier` et `backend/uploads`).
   - `backend/server.js` / `Dockerfile.backend` sont des artefacts secondaires non utilisés par le déploiement VM (`ecosystem.config.cjs` lance `server.ts` via `tsx`).

---

## 3.4 Résumé exécutif Ubuntu 24.04 VM

1. La VM cible **`dms-Ubuntu-24-04-PC-Q35-ICH9-2009`** tourne sous **Ubuntu 24.04 LTS (`noble`) Desktop**, avec le compte **`dms`**, l'interface **`enp1s0`** épinglée en IP fixe **`192.168.100.131/24`**, et **MongoDB 8.0**.
2. Avant toute donnée réelle, tout déploiement se fait sur **données fictives** jusqu'à validation de **S1, S2 et RBAC** sur **`https://192.168.100.131`**.
3. Le déploiement applicatif vit exclusivement sous **`/var/www/dms`** (`dms:dms`, jamais dans `/home/dms/Desktop`), avec un unique **`.env`** (`chmod 600`), `PORT=5000`, `ALLOWED_ORIGINS=https://192.168.100.131` et `BACKUP_*=/var/backups/dms`.
4. L'enchaînement complet suit linéairement **Étape 0** (VM, `enp1s0` statique, énergie/GNOME, SSH, `apt`) → **Étape 1** (`setup-system.sh`) → **Étape 2** (`install-mongodb.sh`) → **Étape 3** (`npm ci` & `.env`) → **Étape 4** (`.gguf`, `build`, `create-superadmin.js`) → **Étape 5** (PM2 + `pm2 startup` + reboot sans GNOME) → **Étape 6** (Nginx `^~`, certificat SAN `192.168.100.131`, import client, `ufw`) → **Étape 7** (`logrotate`, backups, restauration test, scanner USB, recette `smoke-test.mjs`).

---

# PARTIE 4 : DÉPLOIEMENT SUR WINDOWS SERVER & RECETTE WINDOWS (`[NON TESTÉ EN RÉEL]`)

> **Statut global de la Partie 4** : **`[NON TESTÉ EN RÉEL]`** (aucune commande n'a été exécutée sur un serveur Windows cible).  
> **Ordre suivi** : scripts fournis dans `deploy/windows/` (`install-prereqs.ps1`, `install-service.ps1`, `web.config`) et `deploy/backup/backup-mongo.ps1`, complétés par les procédures manuelles pour les éléments **`[FICHIER ABSENT]`** sous Windows.

---

### Étape 4.1 — Prérequis système Windows (`install-prereqs.ps1`) (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `deploy/windows/install-prereqs.ps1:1-85`, `backend/utils/ocrProcessor.js:11,64`.
- **Ce que fait le script (`FAIT`)** : exige PowerShell Administrateur (`:19-23`), installe Chocolatey (`:30-35`), `nodejs-lts` `22.14.0` (`:42`), `git` (`:43`), `visualstudio2022buildtools` (`VCTools`, `:47`), `cmake` (`:48`), `mongodb` et `mongodb-database-tools` (`:52-53`), tente `bindIp: 127.0.0.1` dans `mongod.cfg` (`:56-62`), puis installe `tesseract` (`:66`), `poppler` (`:67`) et `nssm` (`:71`).
- **Éléments manuels (`FAIT`)** :
  1. Installeurs IIS, URL Rewrite 2.1 et ARR 3.0 : **`[FICHIER ABSENT]`** dans `install-prereqs.ps1`.
  2. Vérifier la présence de `ara.traineddata`, `fra.traineddata` et `eng.traineddata` dans `tessdata` et du `PATH` système.
  3. `imagemagick` (`magick`) est optionnel (`choco install imagemagick -y`).
- **Commande (PowerShell Administrateur)** :
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force
  .\deploy\windows\install-prereqs.ps1
  ```
- **Vérification** : `node -v`, `npm -v`, `nssm version`, `tesseract --list-langs`, `where.exe pdftoppm`, `where.exe mongodump`.

---

### Étape 4.2 — MongoDB authentifié sur `127.0.0.1` (`[NON TESTÉ EN RÉEL]`)

- **Script automatisé de durcissement Windows** : **`[FICHIER ABSENT]`** (l'équivalent de `deploy/ubuntu/install-mongodb.sh` n'existe pas sous `deploy/windows/`).
- **Commande (PowerShell Administrateur)** :
  ```powershell
  # 1) Vérifier bindIp: 127.0.0.1 dans mongod.cfg
  $cfg = (Resolve-Path "C:\Program Files\MongoDB\Server\*\bin\mongod.cfg")[0].Path
  Select-String -Path $cfg -Pattern "bindIp"

  # 2) Créer admin_dms (admin) et dms_app_user (document-management) avant d'activer authorization :
  mongosh --quiet --eval @"
  use admin;
  db.createUser({ user: 'admin_dms', pwd: '<ADMIN_PWD>', roles: [ { role: 'userAdminAnyDatabase', db: 'admin' }, { role: 'readWriteAnyDatabase', db: 'admin' } ] });
  use document-management;
  db.createUser({ user: 'dms_app_user', pwd: '<APP_PWD>', roles: [ { role: 'readWrite', db: 'document-management' }, { role: 'dbAdmin', db: 'document-management' } ] });
  "@

  # 3) Activer security.authorization: enabled puis redémarrer MongoDB :
  Add-Content -Path $cfg -Value "`r`nsecurity:`r`n  authorization: enabled"
  Restart-Service -Name "MongoDB"
  ```
- **Vérification** : `Get-Service MongoDB`, `netstat -ano | findstr ":27017"`, `mongosh "mongodb://dms_app_user@127.0.0.1:27017/document-management?authSource=document-management" --password --eval "db.runCommand({ connectionStatus: 1 })"`.

---

### Étape 4.3 — Code source, `npm ci`, `.env`, ACL (`icacls`), modèles IA, build et Admin (`[NON TESTÉ EN RÉEL]`)

- **Chemin recommandé (`FAIT`)** : `C:\dms` (attention : `install-prereqs.ps1:80` cite `C:\inetpub\wwwroot\dms` ; quel que soit le dossier retenu, seul `dist\` doit être lisible par `IIS_IUSRS`, jamais `.env`, `backend\courrier`, `backend\uploads` ni `backups`).
- **Commande (PowerShell Administrateur)** :
  ```powershell
  Set-Location C:\dms
  New-Item -ItemType Directory -Path ".\backend\courrier", ".\backend\uploads\attachments", ".\backend\uploads\usersphoto", ".\backend\uploads\personnelphoto", ".\models", ".\logs", "C:\backups\dms" -Force | Out-Null

  if (-not (Test-Path ".\package-lock.json")) { npm install --package-lock-only }
  npm ci
  npm ls mongoose

  # Créer C:\dms\.env (NODE_ENV=production, PORT=5000, MONGODB_URI ?authSource=document-management,
  # JWT_SECRET >= 32 car., ALLOWED_ORIGINS=https://<DOMAINE_OU_IP>, BACKUP_DIR=BACKUP_PATH=BACKUP_ROOT=C:\backups\dms)

  # Durcir les permissions NTFS (icacls) :
  icacls "C:\dms\.env" /inheritance:r /grant:r "Administrators:(F)" "SYSTEM:(F)"
  icacls "C:\dms\backend\courrier" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  icacls "C:\dms\backend\uploads" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  icacls "C:\backups\dms" /inheritance:r /grant:r "Administrators:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)"
  New-Item -ItemType Directory -Path ".\dist" -Force | Out-Null
  icacls "C:\dms\dist" /grant "IIS_IUSRS:(OI)(CI)(RX)"

  # Charger .env dans la session et valider :
  Get-Content .\.env | Where-Object { $_ -match '^\s*[^#=]+=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
  }
  node .\deploy\scripts\check-env.mjs

  npm run download-models
  npm run check-models
  npm run build
  node .\deploy\scripts\check-env.mjs

  # Créer le premier compte Admin interactivement :
  node .\backend\scripts\create-superadmin.js
  ```

---

### Étape 4.4 — Service Windows via NSSM (`install-service.ps1`) (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/windows/install-service.ps1:1-116` (crée `DMSBackend` exécutant `node_modules\.bin\tsx.cmd server.ts` sur `PORT=5000` par défaut).
- **Commande (PowerShell Administrateur)** :
  ```powershell
  Set-Location C:\dms
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\deploy\windows\install-service.ps1
  ```
- **Vérification** : `Get-Service DMSBackend`, `netstat -ano | findstr ":5000"`, `Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health"`.

---

### Étape 4.5 — IIS, URL Rewrite, ARR, `web.config`, HTTPS et Pare-feu Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/windows/web.config:1-88` (l'ordre des règles proxy `/api/`, `/socket.io/`, `/api-docs`, `/courrier/`, `/uploads/` avant `React SPA Routes` doit rester strictement inchangé ; la variable serveur `HTTP_X_FORWARDED_PROTO` doit être autorisée dans IIS sous peine d'erreur `500.50`).
- **Éléments `[FICHIER ABSENT]`** : installeurs URL Rewrite 2.1 & ARR 3.0, script de liaison HTTPS IIS, script pare-feu `New-NetFirewallRule`.
- **Commande (PowerShell Administrateur)** :
  ```powershell
  Install-WindowsFeature -Name Web-Server, Web-WebSockets, Web-Http-Redirect, Web-Mgmt-Tools
  # Installer manuellement URL Rewrite 2.1 et ARR 3.0, puis activer le proxy ARR et autoriser HTTP_X_FORWARDED_PROTO :
  Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/proxy' -name 'enabled' -value 'True'
  Add-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/rewrite/allowedServerVariables' -name '.' -value @{name='HTTP_X_FORWARDED_PROTO'}

  Copy-Item "C:\dms\deploy\windows\web.config" "C:\dms\dist\web.config" -Force

  Import-Module WebAdministration
  New-Website -Name "DMS" -PhysicalPath "C:\dms\dist" -Port 80 -HostHeader "<VOTRE_DOMAINE_OU_IP>"

  # Liaison HTTPS auto-signée (ou certificat PKI) + pare-feu Windows :
  $cert = New-SelfSignedCertificate -DnsName "<VOTRE_DOMAINE>", "dms.local", "localhost" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(3)
  New-WebBinding -Name "DMS" -Protocol "https" -Port 443 -IPAddress "*" -SslFlags 0
  Get-WebBinding -Name "DMS" -Protocol "https" | ForEach-Object { $_.AddSslCertificate($cert.Thumbprint, "My") }

  New-NetFirewallRule -DisplayName "DMS HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
  New-NetFirewallRule -DisplayName "DMS HTTPS (443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
  New-NetFirewallRule -DisplayName "DMS Block Direct Node" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Block
  New-NetFirewallRule -DisplayName "DMS Block Direct MongoDB" -Direction Inbound -Protocol TCP -LocalPort 27017 -Action Block
  ```

---

### Étape 4.6 — Scanner WIA sous Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichiers sources** : `backend/utils/scanner/windows/scannerDetection.js`, `scannerConfig.js:15-18`.
```powershell
Get-Service -Name "stisvc"
Set-Service -Name "stisvc" -StartupType Automatic
Start-Service -Name "stisvc"

$dm = New-Object -ComObject WIA.DeviceManager
$dm.DeviceInfos | Where-Object { $_.Type -eq 1 } | ForEach-Object {
  [PSCustomObject]@{ ID = $_.DeviceID; Name = $_.Properties("Name").Value }
}
```

---

### Étape 4.7 — Sauvegarde planifiée, restauration et recette Windows (`[NON TESTÉ EN RÉEL]`)

- **Fichier source** : `deploy/backup/backup-mongo.ps1:1-161` (écrit dans `<ProjectRoot>\backups` avec 14 jours de rétention). Les scripts Windows `restore-all.ps1`, `deploy.ps1` et `rollback.ps1` restent **`[FICHIER ABSENT]`**.
```powershell
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\dms\deploy\backup\backup-mongo.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"
Register-ScheduledTask -TaskName "DMS_Daily_Backup" -Action $Action -Trigger $Trigger -User "SYSTEM" -RunLevel Highest -Force
Start-ScheduledTask -TaskName "DMS_Daily_Backup"

# Validation post-déploiement Windows :
node C:\dms\deploy\scripts\smoke-test.mjs "https://<DOMAINE_OU_IP>" --strict-security
```
