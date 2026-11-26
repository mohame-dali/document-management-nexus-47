# Guide de Déploiement Production — Ubuntu 24.04 LTS Server VM (KVM/QEMU)

> **Environnement cible vérifié** : Ubuntu 24.04 LTS (`noble`) sous hyperviseur **QEMU/KVM** (`br0` bridged), IP fixe **`192.168.100.131/24`**, répertoire applicatif **`/var/www/dms`** (`dms:dms`), reverse proxy **Nginx HTTPS (`https://192.168.100.131`)** devant **Node.js/Express (`127.0.0.1:5000`)** piloté par **PM2 (`ecosystem.config.cjs`)** et **MongoDB 8.0 (`127.0.0.1:27017`)**.
>
> **Statut des procédures** : `[NON TESTÉ EN RÉEL]` sur la VM cible. Chaque chemin, script, port et variable `.env` ci-dessous a été vérifié directement dans le code source (`server.ts`, `package.json`, `ecosystem.config.cjs`, `deploy/**`, `backend/**`).

---

## Architecture Runtime Vérifiée

| Composant | Détail vérifié dans le dépôt | Source |
|---|---|---|
| **Point d'entrée serveur** | `ecosystem.config.cjs` lance `./node_modules/.bin/tsx server.ts` (`exec_mode: 'fork'`, `instances: 1`, `max_memory_restart: '6G'`). **Ne pas** utiliser `node server.ts` directement (annotations TS dans `server.ts`) ni le mode `cluster` (duplication des modèles GGUF ~5 Go en RAM et rupture de la map Socket.IO en mémoire). | `ecosystem.config.cjs:15-49`, `server.ts:34,370` |
| **Port interne unique** | `PORT=5000` (écoute Express + Socket.IO + service statique `dist/` en `NODE_ENV=production`). | `ecosystem.config.cjs:42`, `server.ts:436,496-511`, `deploy/scripts/check-env.mjs:38` |
| **Version Node.js** | **Node.js `22.x` LTS** (requis par `check-env.mjs >= 22.x` et installé par `setup-system.sh` ; minimum technique Node 20+ ESM dans `server.ts:14`). | `deploy/scripts/check-env.mjs:48-56`, `deploy/ubuntu/setup-system.sh:112-121` |
| **Base de données** | MongoDB **8.0** Community (`noble`), base `document-management`, auth activée, écoute stricte `127.0.0.1:27017`. | `deploy/ubuntu/install-mongodb.sh:48-141`, `backend/config/db.js:58-62` |
| **Reverse Proxy Nginx** | HTTPS (`443`) avec redirection HTTP (`80`), `client_max_body_size 100M`, certificats sous `/etc/ssl/dms/`, proxy `^~ /courrier/` & `^~ /uploads/` vers Express (jamais servis en statique direct par Nginx), `/api/` (SSE 300s), `/socket.io/` (WebSocket Upgrade). | `deploy/ubuntu/dms.nginx.conf:1-148`, `server.ts:276-296` |
| **Spécifications VM KVM** | **4 à 8 vCPU** (`host-passthrough` pour AVX/AVX2), **16 Go RAM minimum** (18–24 Go si interface graphique active) + `memballoon` désactivé, **120 Go+ `qcow2`** VirtIO. | `MODELS.md:11-18`, `ecosystem.config.cjs:34` |

---

## 1. Réseau Bridged KVM/QEMU (`br0`) & IP Statique (`192.168.100.131/24`)

### 1.1 Sur l'hôte physique KVM (Pont réseau `br0` et réglages VM)

Assurez-vous que l'hôte dispose d'un pont réseau **`br0`** rattaché à l'interface LAN physique afin que la VM soit directement joignable sur le sous-réseau `192.168.100.0/24` :

```bash
# Vérifier si un pont br0 existe déjà sur l'hôte KVM :
ip -br link show type bridge
nmcli connection show

# Exemple de création d'un pont br0 avec NetworkManager (adapter <NIC_PHYSIQUE>, ex: enp3s0) :
# sudo nmcli con add type bridge ifname br0 con-name br0 stp no
# sudo nmcli con add type bridge-slave ifname <NIC_PHYSIQUE> master br0
# sudo nmcli con up br0
```

Dans `virt-manager` (ou `virsh edit <NOM_VM>`), vérifier sur la VM :
- **Carte réseau** : Source réseau = **Périphérique ponté (`br0`)**, modèle **`virtio`**.
- **Processeur** : Mode **`host-passthrough`** (expose AVX/AVX2 indispensables à `node-llama-cpp`).
- **Mémoire** : **16 Go** minimum (désactiver le *Memory Ballooning* : `<memballoon model='none'/>`).
- **Démarrage automatique** :

```bash
sudo virsh autostart <NOM_VM>
```

### 1.2 Dans la VM Ubuntu 24.04 Server : IP statique `192.168.100.131/24`

> **Impératif** : Épingler `192.168.100.131/24` en IP fixe **avant** de générer le certificat TLS et de configurer `ALLOWED_ORIGINS`.

Relevez le nom de l'interface (ex. `enp1s0`), la passerelle et les serveurs DNS :

```bash
ip -br addr
ip route show default
resolvectl status
```

#### Option A — Netplan (`systemd-networkd`, standard Ubuntu 24.04 Server)

```bash
sudo cp -a /etc/netplan /etc/netplan.bak.$(date +%Y%m%d)

# Adapter enp1s0, <PASSERELLE> (ex: 192.168.100.1) et <DNS> (ex: 192.168.100.1, 1.1.1.1)
sudo tee /etc/netplan/01-dms-static.yaml > /dev/null <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    enp1s0:
      dhcp4: false
      addresses:
        - 192.168.100.131/24
      routes:
        - to: default
          via: 192.168.100.1
      nameservers:
        addresses: [192.168.100.1, 9.9.9.9]
EOF

sudo chmod 600 /etc/netplan/01-dms-static.yaml
sudo netplan try
sudo netplan apply
```

*(Si votre VM utilise Ubuntu Desktop avec `NetworkManager`, remplacez `renderer: networkd` par `renderer: NetworkManager` ou utilisez `nmcli con mod` comme décrit dans `docs/GUIDE_INSTALLATION_UBUNTU_WINDOWS.md` Étape 0.2.)*

#### Nom d'hôte, agent KVM & vérification réseau

```bash
sudo hostnamectl set-hostname dms-server
grep -q "192.168.100.131" /etc/hosts || echo "192.168.100.131 dms-server dms.local" | sudo tee -a /etc/hosts

sudo apt-get update && sudo apt-get install -y qemu-guest-agent openssh-server
sudo systemctl enable --now qemu-guest-agent ssh

# Vérification
ip -br addr show dev enp1s0
ip route
getent hosts dms-server
```

---

## 2. Dépendances Système (Node.js LTS, MongoDB 8.0, Nginx, PM2, OCR, UFW)

> **Précision sur Node.js** : `deploy/scripts/check-env.mjs:48-56` et `deploy/ubuntu/setup-system.sh:112-121` exigent **Node.js `>= 22.x` LTS** (installé ci-dessous via NodeSource `22.x`). Évitez toute installation via `snap`.

Vous pouvez utiliser directement les deux scripts idempotents fournis dans le dépôt (une fois les sources transférées à l'étape 3, ou en exécutant les blocs équivalents ci-dessous).

### 2.1 Via les scripts du dépôt (recommandé)

```bash
cd /var/www/dms
sudo bash deploy/ubuntu/setup-system.sh
sudo apt-get install -y tesseract-ocr-eng logrotate
sudo bash deploy/ubuntu/install-mongodb.sh
```

### 2.2 Détail manuel complet (référence vérifiée)

```bash
# 1. Fuseau horaire & utilitaires + compilation C++ (node-llama-cpp) + Nginx + UFW
sudo timedatectl set-timezone Africa/Tunis
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git \
  build-essential cmake pkg-config nginx ufw openssl logrotate

# 2. Outils OCR (ara + fra + eng), PDF, ImageMagick et scanner SANE
sudo apt-get install -y tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng \
  poppler-utils imagemagick sane-utils img2pdf

# 3. Node.js 22 LTS (NodeSource) + PM2 global
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | \
  sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt-get update && sudo apt-get install -y nodejs
sudo npm install -g pm2

# 4. MongoDB 8.0 Community (Ubuntu 24.04 noble) + mongodb-database-tools (mongodump/mongorestore)
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org mongodb-database-tools
sudo systemctl enable --now mongod
```

#### Sécurisation MongoDB (`127.0.0.1` + authentification `document-management`)

Si vous n'avez pas utilisé `deploy/ubuntu/install-mongodb.sh`, créez `admin_dms` (sur `admin`) et `dms_app_user` (sur `document-management`) puis verrouillez `/etc/mongod.conf` :

```bash
# Avant d'activer authorization, créer les comptes dans mongosh (remplacer les mots de passe forts) :
mongosh --quiet <<'EOF'
use admin;
db.createUser({
  user: "admin_dms",
  pwd: "<MOT_DE_PASSE_ADMIN_FORT>",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, { role: "readWriteAnyDatabase", db: "admin" } ]
});
use document-management;
db.createUser({
  user: "dms_app_user",
  pwd: "<MOT_DE_PASSE_APP_FORT>",
  roles: [ { role: "readWrite", db: "document-management" }, { role: "dbAdmin", db: "document-management" } ]
});
EOF

# Verrouiller bindIp sur 127.0.0.1 et activer security.authorization: enabled
sudo sed -i 's/bindIp: .*/bindIp: 127.0.0.1/' /etc/mongod.conf
grep -q '^security:' /etc/mongod.conf || printf "\nsecurity:\n  authorization: enabled\n" | sudo tee -a /etc/mongod.conf
sudo systemctl restart mongod
```

Vérification :

```bash
node -v && npm -v && pm2 -v
tesseract --list-langs | grep -E 'ara|fra|eng'
ss -ltnp | grep 27017   # Doit écouter uniquement sur 127.0.0.1:27017
```

---

## 3. Transfert Propre (`rsync`) & Permissions sous `/var/www/dms`

### 3.1 Créer le compte de service `dms` et l'arborescence cible (dans la VM)

```bash
# Créer l'utilisateur système 'dms' s'il n'existe pas encore
id dms >/dev/null 2>&1 || sudo useradd -r -m -d /var/www/dms -s /bin/bash dms
for grp in scanner lp; do
  getent group "$grp" >/dev/null 2>&1 && sudo usermod -aG "$grp" dms
done

# Créer les répertoires applicatifs et de sauvegarde
sudo mkdir -p /var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,backend/uploads/templates,backend/uploads/temp,models,backups,logs}
sudo mkdir -p /var/backups/dms
sudo chown -R dms:dms /var/www/dms /var/backups/dms
sudo chmod 750 /var/www/dms /var/backups/dms
```

### 3.2 Transfert propre depuis le poste source via `rsync`

Depuis votre poste de travail contenant le dépôt sain, synchronisez uniquement les sources vers `/var/www/dms` (en excluant `node_modules`, `dist`, `.env`, données locales, modèles lourds et journaux) :

```bash
rsync -avz --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='backend/node_modules/' \
  --exclude='dist/' \
  --exclude='dist.bak/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='backend/.env' \
  --exclude='backend/.env.*' \
  --exclude='models/*.gguf' \
  --exclude='*.gguf' \
  --exclude='backend/courrier/' \
  --exclude='backend/uploads/' \
  --exclude='backend/tmp/' \
  --exclude='backups/' \
  --exclude='logs/' \
  --exclude='*.log' \
  --exclude='*.bak*' \
  ./ dms@192.168.100.131:/var/www/dms/
```

Dans la VM, ré-appliquer la propriété stricte `dms:dms` et supprimer tout `backend/.env` concurrent (`server.ts:38-39` charge `backend/.env` avant `.env`) :

```bash
sudo rm -f /var/www/dms/backend/.env
sudo mkdir -p /var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,backend/uploads/templates,backend/uploads/temp,models,backups,logs}
sudo chown -R dms:dms /var/www/dms
sudo chmod 750 /var/www/dms /var/www/dms/{backend/courrier,backend/uploads,backups,logs}
```

---

## 4. Configuration `.env` de Production

Générez un secret JWT aléatoire fort (`openssl rand -hex 32` produit 64 caractères hexadécimaux, au-dessus du minimum de 32 exigé par `deploy/scripts/check-env.mjs:37`) :

```bash
openssl rand -hex 32
```

Créez l'unique fichier **`/var/www/dms/.env`** (toutes les variables ci-dessous sont vérifiées dans `server.ts`, `backend/` et `deploy/scripts/check-env.mjs`) :

```bash
sudo -u dms -H tee /var/www/dms/.env > /dev/null <<'EOF'
# --- Noyau serveur & sécurité ---
NODE_ENV=production
PORT=5000
JWT_SECRET=<COLLER_SORTIE_OPENSSL_RAND_HEX_32>
JWT_EXPIRE=8h
JWT_COOKIE_EXPIRE=1

# --- CORS & Origines autorisées (Express + Socket.IO) ---
ALLOWED_ORIGINS=https://192.168.100.131
FRONTEND_URL=https://192.168.100.131

# --- Base de données MongoDB 8.0 ---
MONGODB_URI=mongodb://dms_app_user:<MOT_DE_PASSE_APP>@127.0.0.1:27017/document-management?authSource=document-management

# --- Stockage physique & sauvegardes (les 3 variables BACKUP_* doivent être alignées) ---
DOCUMENT_PATH=/var/www/dms/backend/courrier
UPLOAD_DIR=/var/www/dms/backend/uploads
UPLOAD_PATH=/var/www/dms/backend/uploads
BACKUP_DIR=/var/backups/dms
BACKUP_PATH=/var/backups/dms
BACKUP_ROOT=/var/backups/dms

# --- Intelligence Artificielle locale (node-llama-cpp / GGUF) ---
LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf
LLAMA_THREADS=4
LLAMA_GPU_LAYERS=0
LLAMA_CONTEXT_SIZE=2048
DISABLE_AI_WARMUP=false
AI_WORKER_MAX_CONCURRENCY=1
AI_WORKER_STARTUP_TIMEOUT_MS=10000
INDEX_RETRY_CRON=*/10 * * * *

# --- OCR & Scanner physique Linux (SANE) ---
OCR_MAX_PAGES=50
OCR_PAGE_TIMEOUT_MS=60000
SCANNER_ENABLED=false
SCANNER_DEVICE_ID=
SCANNER_RESOLUTION=300
SCANNER_FORMAT=pdf

# --- Antivirus optionnel (ClamAV) ---
CLAMAV_ENABLED=false
EOF

sudo chown dms:dms /var/www/dms/.env
sudo chmod 600 /var/www/dms/.env
```

Validation préliminaire de l'environnement :

```bash
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && node deploy/scripts/check-env.mjs'
```

*(À ce stade, seuls les fichiers `.gguf` affichent un avertissement avant l'étape 5 ; aucune erreur bloquante ne doit apparaître.)*

---

## 5. Build Frontend, Modèles IA Hors-Ligne & Premier Administrateur (`Admin`)

```bash
# 1. Installer les dépendances depuis la racine uniquement (jamais dans backend/)
sudo -u dms -H bash -c 'cd /var/www/dms && npm ci'

# 2. Compiler le frontend Vite React dans /var/www/dms/dist/
sudo -u dms -H bash -c 'cd /var/www/dms && npm run build'

# 3. Télécharger les modèles GGUF (~4.26 Go ALLaM 7B + ~417 Mo BGE-M3)
#    En environnement hors-ligne : copiez les deux .gguf dans /var/www/dms/models/ (chown dms:dms)
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && npm run download-models && npm run check-models'

# 4. Vérification finale check-env.mjs (0 erreur, 0 avertissement attendu)
sudo -u dms -H bash -c 'cd /var/www/dms && set -a && source .env && set +a && node deploy/scripts/check-env.mjs'

# 5. Créer le premier compte technique 'Admin' de manière interactive (TTY requis, >= 12 car.)
cd /var/www/dms && sudo -u dms -H node backend/scripts/create-superadmin.js
```

*(Note : `backend/scripts/create-superadmin.js` crée le rôle `Admin`, qui est le rôle le plus élevé défini dans `backend/models/User.js`. Aucun compte ni mot de passe par défaut n'existe dans l'application.)*

---

## 6. Certificat SSL LAN (`/etc/ssl/dms/`), Nginx (`100M` + Socket.IO), PM2 & UFW

### 6.1 Générer le certificat SSL auto-signé avec SAN `192.168.100.131`

```bash
sudo bash /var/www/dms/deploy/ubuntu/scripts/gen-selfsigned-cert.sh 192.168.100.131

# Vérifier les fichiers générés sous /etc/ssl/dms/ et l'extension SAN :
ls -la /etc/ssl/dms/
openssl x509 -in /etc/ssl/dms/dms-selfsigned.crt -noout -text | grep -A3 "Subject Alternative Name"
```

> **Import client obligatoire (`cookie.secure=true`)** : copiez uniquement `/etc/ssl/dms/dms-selfsigned.crt` (jamais la clé `.key`) vers les postes utilisateurs :
> - **Windows (PowerShell Admin)** : `certutil -addstore -f "Root" .\dms-selfsigned.crt`
> - **Ubuntu/Linux** : `sudo cp dms-selfsigned.crt /usr/local/share/ca-certificates/dms-selfsigned.crt && sudo update-ca-certificates`

### 6.2 Installer la configuration Nginx (`client_max_body_size 100M` + WebSocket `/socket.io/`)

`deploy/ubuntu/dms.nginx.conf` est déjà configuré pour :
- Pointer vers `/etc/ssl/dms/dms-selfsigned.crt` et `/etc/ssl/dms/dms-selfsigned.key`
- Autoriser `client_max_body_size 100M;`
- Protéger `^~ /courrier/` et `^~ /uploads/` via proxy Express (jamais servis en direct par Nginx)
- Relayer `/socket.io/` avec `Upgrade $http_upgrade` et `Connection "upgrade"`

```bash
sudo cp /var/www/dms/deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.conf
sudo sed -i 's|server_name dms.local;|server_name 192.168.100.131;|g' /etc/nginx/sites-available/dms.conf

sudo ln -sf /etc/nginx/sites-available/dms.conf /etc/nginx/sites-enabled/dms.conf
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### 6.3 Démarrer PM2 (`ecosystem.config.cjs`), persistance reboot & `logrotate`

```bash
# 1. Démarrer l'application sous l'utilisateur dms
sudo -u dms -H bash -c 'cd /var/www/dms && pm2 start ecosystem.config.cjs && pm2 save'

# 2. Enregistrer le démarrage automatique systemd (pm2-dms.service)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u dms --hp /var/www/dms
sudo systemctl enable pm2-dms

# 3. Configurer logrotate pour /var/www/dms/logs/
sudo cp /var/www/dms/deploy/ubuntu/logrotate/dms /etc/logrotate.d/dms
sudo sed -i '1i su dms dms' /etc/logrotate.d/dms
sudo chown root:root /etc/logrotate.d/dms
sudo chmod 644 /etc/logrotate.d/dms
```

### 6.4 Pare-feu UFW (`22`, `80`, `443` ouverts ; `3000`, `5000`, `27017` bloqués)

Si `setup-system.sh` n'a pas été exécuté :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP Nginx'
sudo ufw allow 443/tcp comment 'HTTPS Nginx'
sudo ufw deny 3000/tcp comment 'Block direct Express dev'
sudo ufw deny 5000/tcp comment 'Block direct Express prod'
sudo ufw deny 27017/tcp comment 'Block direct MongoDB'
sudo ufw --force enable
sudo ufw status verbose
```

---

## 7. Vérifications Post-Déploiement (`Smoke Check`) & Sauvegarde Quotidienne

### 7.1 Contrôle de santé HTTP, Socket.IO, Sécurité & OCR

```bash
# 1. Santé backend + connexion MongoDB
curl -sf http://127.0.0.1:5000/api/health
echo ""
curl -sk https://192.168.100.131/api/health
echo ""

# 2. Vérifier la sécurité des répertoires protégés (attendu : 401 ou 403, jamais 200 ni 404 Nginx)
curl -sk -o /dev/null -w "courrier -> %{http_code}\n" https://192.168.100.131/courrier/2026/test.pdf
curl -sk -o /dev/null -w "uploads  -> %{http_code}\n" https://192.168.100.131/uploads/attachments/test.pdf

# 3. Vérifier le routage Socket.IO à travers Nginx (attendu : réponse JSON/HTTP d'Engine.IO/Auth, pas 404/502 Nginx)
curl -sk -i "https://192.168.100.131/socket.io/?EIO=4&transport=polling" | head -n 10

# 4. Suite automatisée complète (déploiement + sécurité stricte)
NODE_TLS_REJECT_UNAUTHORIZED=0 node /var/www/dms/deploy/scripts/smoke-test.mjs "https://192.168.100.131" --strict-security

# 5. Vérifier OCR & outils PDF (et scanner SANE si branché)
tesseract --list-langs | grep -E 'ara|fra|eng'
pdftoppm -v
sudo -u dms -H scanimage -L || true
```

*(Note : le test `SEC-08` de `smoke-test.mjs` déclenche le rate-limiter `loginLimiter` pendant 15 min sur l'IP locale ; exécutez `sudo -u dms -H pm2 reload dms-backend` après le test pour réinitialiser le compteur avant vos essais de connexion.)*

### 7.2 Sauvegarde Quotidienne Automatisée (`mongodump` + `courrier/` + `uploads/`)

`deploy/scripts/backup-all.sh` réalise un `mongodump --gzip`, archive `/var/www/dms/backend/courrier` et `/var/www/dms/backend/uploads`, génère un manifeste SHA256 des modèles `.gguf` et applique une rétention de 14 jours en protégeant toujours la dernière archive.

```bash
# Activer le timer systemd quotidien (02:00 du matin) :
sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.service /etc/systemd/system/dms-backup.service
sudo cp /var/www/dms/deploy/ubuntu/systemd/dms-backup.timer /etc/systemd/system/dms-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now dms-backup.timer

# Exécuter immédiatement une première sauvegarde et inspecter l'archive :
sudo systemctl start dms-backup.service
sudo journalctl -u dms-backup.service -n 20 --no-pager
ls -lh /var/backups/dms/
```

Pour tester une restauration non destructive dans une base isolée `document-management-test` :

```bash
LATEST_BKP="$(ls -1t /var/backups/dms/dms_full_backup_*.tar.gz | head -n1)"
sudo -u dms -H bash -c "
  cd /var/www/dms
  MONGODB_URI='mongodb://admin_dms:<MOT_DE_PASSE_ADMIN>@127.0.0.1:27017/document-management-test?authSource=admin' \
    bash deploy/scripts/restore-all.sh '${LATEST_BKP}'
"
```

### 7.3 Mises à jour & Rollback ultérieurs

```bash
# Déploiement d'une mise à jour (backup préalable + check-env + npm ci + build + pm2 reload + smoke-test) :
sudo -u dms -H bash /var/www/dms/deploy/ubuntu/deploy.sh

# Rollback d'urgence (restaure dist.bak et recharge PM2) :
sudo -u dms -H bash /var/www/dms/deploy/ubuntu/rollback.sh
```
