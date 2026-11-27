# Guide de Déploiement Complet — DMS (Document Management System) sur VM Ubuntu (`virt-manager` / KVM-QEMU)

Ce guide décrit étape par étape la création, la sécurisation et la mise en production de l'application **DMS (Document Management System)** sur une machine virtuelle Ubuntu Server (LTS 22.04 ou 24.04) hébergée sous **KVM/QEMU (`virt-manager`)**.

---

## 1. Architecture & Prérequis de la Machine Virtuelle (`virt-manager`)

### 1.1 Spécifications matérielles recommandées
L'application exécute simultanément un serveur unifié **Node.js (`server.ts`, port `5000`)**, **MongoDB**, l'extraction **OCR (Tesseract + Poppler)** et des modèles d'**IA locale (ALLaM 7B + BGE-M3)** via `node-llama-cpp`.

| Ressource | Minimum absolu | Recommandé (Production + IA locale) |
| :--- | :--- | :--- |
| **OS invité** | Ubuntu Server 22.04 LTS / 24.04 LTS | Ubuntu Server 24.04 LTS (64-bit) |
| **vCPU** | 4 vCPUs (mode `host-passthrough` recommandé) | 6 à 8 vCPUs (AVX2 activé pour `node-llama-cpp`) |
| **RAM** | 8 Go (avec 8 Go Swap obligatoire) | 16 Go (avec 8 Go Swap obligatoire) |
| **Stockage** | 40 Go qcow2 (`virtio`) | 80 à 120 Go qcow2 (`virtio` + `discard=unmap`) |
| **Réseau** | Bridge (`br0`) ou NAT + redirection de ports | Bridge LAN (`br0`) pour accès direct des postes clients |

### 1.2 Création de la VM dans `virt-manager`
1. Ouvrez **`virt-manager`** sur l'hôte Linux et cliquez sur **Créer une nouvelle machine virtuelle**.
2. Choisissez **Média d'installation local (image ISO)** et sélectionnez l'ISO **Ubuntu Server 22.04 / 24.04 LTS**.
3. Allouez la mémoire (**8192 MiB** minimum, idéalement **16384 MiB**) et les CPUs (**4+**).
4. Créez une image disque `qcow2` de **60 à 100 Go**.
5. Cochez **Personnaliser la configuration avant l'installation** :
   - **Processeurs → Configuration** : sélectionnez **`Copier la configuration du processeur hôte` (`host-passthrough`)** pour exposer les instructions AVX/AVX2 indispensables à l'inférence CPU locale.
   - **NIC (Réseau)** : sélectionnez un **Pont (Bridge)** sur votre interface LAN (ou un réseau dédié avec IP fixe) et le modèle de périphérique **`virtio`**.
6. Durant l'installation d'Ubuntu Server :
   - Activez **OpenSSH Server**.
   - Configurez une **adresse IP statique** (ex. `192.168.1.50/24`).
   - Créez un utilisateur administrateur non-root (ex. `dmsadmin`).

---

## 2. Préparation du Système & Swap Obligatoire (8 Go)

Connectez-vous en SSH à la VM (`ssh dmsadmin@192.168.1.50`), puis mettez à jour le système et configurez impérativement le fichier d'échange (**Swap 8 Go**) afin d'éviter les erreurs *Out-Of-Memory (OOM)* lors du chargement des modèles IA :

```bash
# Mise à jour système et outils de base
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git gnupg lsb-release ca-certificates build-essential python3 ufw
```

### 2.1 Création et persistance du Swap de 8 Go (OBLIGATOIRE)
```bash
# Créer un fichier swap de 8 Go
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendre le swap persistant après redémarrage
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimiser l'usage du swap (swappiness modéré pour serveur applicatif/IA)
sudo sysctl vm.swappiness=20
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf

# Vérification
free -h
swapon --show
```

### 2.2 Dépendances OCR (Tesseract FR/AR + Poppler)
```bash
sudo apt install -y \
  tesseract-ocr \
  tesseract-ocr-fra \
  tesseract-ocr-ara \
  poppler-utils

# Vérification des langues installées (doit afficher ara et fra)
tesseract --list-langs
pdftoppm -v
```

> **Note Scanner :** Dans une architecture VM serveur, `SCANNER_ENABLED` doit rester à `false` dans `.env` car la VM n'a pas accès direct aux ports USB des postes clients. Les utilisateurs téléversent leurs documents PDF/images numérisés depuis leur poste navigateur.

---

## 3. Installation de Node.js 20 LTS et MongoDB (APT + Secours SNAP)

### 3.1 Node.js 20 LTS & PM2
```bash
# Dépôt officiel NodeSource 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier les versions
node -v   # v20.x.x
npm -v

# Installer PM2 globalement pour la gestion de processus
sudo npm install -g pm2
```

### 3.2 Installation de MongoDB — Méthode A : Dépôt APT officiel (MongoDB 7.0)
```bash
# Importer la clé GPG MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Détecter le nom de code Ubuntu (jammy pour 22.04, noble pour 24.04)
# Note : si noble n'est pas encore publié pour un miroir, jammy reste compatible pour le paquet APT
CODENAME=$(lsb_release -cs)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org

sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager
```

### 3.3 Méthode de secours : Installation via SNAP (`mongodb-server-replicaset`)
Si `apt` ou `curl` échoue en raison de **timeouts réseau sur les serveurs GPG** ou de dépôts bloqués par un pare-feu/proxy :

```bash
# Nettoyer une éventuelle source APT incomplète
sudo rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB via Snap
sudo apt install -y snapd
sudo snap install mongodb-server-replicaset

# Vérifier que le service MongoDB Snap est actif sur 127.0.0.1:27017
sudo snap services mongodb-server-replicaset
```

> **Vérification de connectivité MongoDB (valable pour APT ou SNAP) :**
> ```bash
> ss -tulnp | grep 27017
> ```
> Si l'écoute sur `127.0.0.1:27017` est confirmée, l'URI `mongodb://127.0.0.1:27017/document-management` fonctionnera immédiatement.

---

## 4. Déploiement de l'Application DMS & Build Production

### 4.1 Récupération du code et installation des dépendances
```bash
# Créer le répertoire applicatif
sudo mkdir -p /opt/dms
sudo chown -R $USER:$USER /opt/dms
cd /opt/dms

# Cloner le dépôt (ou copier les fichiers via scp/rsync)
git clone <URL_DU_DEPOT_DMS> .

# Installer les dépendances npm (inclut postinstall et compilation native si nécessaire)
npm ci --omit=dev=false
```

### 4.2 Téléchargement / Vérification des modèles IA locaux (ALLaM 7B + BGE-M3)
```bash
# Télécharger les modèles GGUF configurés dans le projet
npm run download-models

# Vérifier le chemin et l'intégrité des modèles détectés
npm run check-models
```

### 4.3 Configuration des variables d'environnement (`.env`)
Générez un secret JWT robuste :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Créez `/opt/dms/.env` (et si besoin un lien symbolique ou copie identique dans `/opt/dms/backend/.env`, car `server.ts` lit `backend/.env` puis `.env` à la racine) :

```env
# Serveur unifié
NODE_ENV=production
PORT=5000

# Base de données MongoDB locale
MONGODB_URI=mongodb://127.0.0.1:27017/document-management

# Authentification JWT (remplacer par la clé générée ci-dessus)
JWT_SECRET=REMPLACER_PAR_CLE_HEX_64_OCTETS
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Matériel / Scanner (OBLIGATOIRE : désactivé sur VM serveur sans USB client)
SCANNER_ENABLED=false

# IA locale (optionnel : ajuster selon le nombre de cœurs physiques alloués à la VM)
LLAMA_THREADS=4
DISABLE_AI_WARMUP=false

# URL publique (adapter selon l'IP ou nom de domaine)
FRONTEND_URL=http://192.168.1.50
```

Sécurisez les permissions du fichier `.env` :
```bash
chmod 600 /opt/dms/.env
```

### 4.4 Compilation Frontend (Vite) & Dossiers de stockage
```bash
cd /opt/dms

# Compiler le bundle React/Vite dans dist/
npm run build

# S'assurer que les répertoires d'upload et sauvegardes existent avec les bons droits
mkdir -p uploads/documents uploads/users uploads/messages uploads/temp backups logs
```

---

## 5. Exécution Permanente avec PM2 & Reverse Proxy Nginx

### 5.1 Configuration PM2 (`ecosystem.config.cjs`)
Créez `/opt/dms/ecosystem.config.cjs` :

```js
module.exports = {
  apps: [
    {
      name: 'dms-server',
      script: 'npx',
      args: 'tsx server.ts',
      cwd: '/opt/dms',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '6G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/opt/dms/logs/pm2-error.log',
      out_file: '/opt/dms/logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
```

> **Pourquoi `instances: 1` et `npx tsx server.ts` ?**
> `server.ts` est écrit en TypeScript et charge l'IA locale (`node-llama-cpp`) + les schedulers cron (`backupScheduler`, `indexRetryScheduler`, `cleanupScheduler`) en mémoire. Une instance unique évite de dupliquer le chargement de ~5 Go de modèles en RAM et les tâches planifiées.

Démarrez et activez PM2 au démarrage de la VM :
```bash
cd /opt/dms
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $USER --hp $HOME
# Exécutez ensuite la commande `sudo env PATH=...` affichée par pm2 startup
```

Vérifiez que l'application répond localement :
```bash
pm2 status
curl -fsS http://127.0.0.1:5000/api/health
```

### 5.2 Installation et configuration de Nginx (Port 80 / WebSockets / Gros PDFs)
```bash
sudo apt install -y nginx
```

Créez `/etc/nginx/sites-available/dms` :

```nginx
server {
    listen 80;
    server_name _;

    # Taille maximale d'upload pour courriers numérisés et pièces jointes
    client_max_body_size 100M;

    # Délais étendus pour OCR / traitement IA synchrone
    proxy_connect_timeout 300s;
    proxy_send_timeout    300s;
    proxy_read_timeout    300s;
    send_timeout          300s;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Support Socket.IO / WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez le site et redémarrez Nginx :
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dms /etc/nginx/sites-enabled/dms
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

### 5.3 Pare-feu UFW
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## 6. Vérification Post-Déploiement, Exploitation & Dépannage

### 6.1 Checklist de validation
- [ ] **Healthcheck API** : `curl -s http://127.0.0.1:5000/api/health` retourne `readyState: 1` (MongoDB connecté).
- [ ] **Accès navigateur** : `http://<IP_VM>/` charge l'interface DMS via Nginx.
- [ ] **Assistant de premier démarrage (`/setup`)** : Lors de la première connexion administrateur, renseigner le nom de l'administration ainsi que les départements RH, Bureau d'Ordre et Bureau Directeur.
- [ ] **OCR fonctionnel** : Importer un PDF scanné et vérifier que le texte OCR arabe/français est extrait sans erreur.
- [ ] **Scanner désactivé** : Vérifier dans `.env` que `SCANNER_ENABLED=false`.
- [ ] **Swap actif** : `free -h` affiche bien `8.0Gi` de Swap disponible.

### 6.2 Commandes d'exploitation courantes
```bash
# Consulter les journaux en temps réel
pm2 logs dms-server --lines 100

# Redémarrer proprement le serveur après une mise à jour
cd /opt/dms
git pull
npm ci
npm run build
pm2 restart dms-server

# Sauvegarde manuelle rapide de la base MongoDB
mongodump --db document-management --out /opt/dms/backups/manual_$(date +%F)
```

### 6.3 Dépannage rapide
- **Erreur `503 Service temporairement indisponible`** : MongoDB n'est pas démarré (`sudo systemctl status mongod` ou `sudo snap services mongodb-server-replicaset`).
- **Processus Node redémarré brutalement (OOM Kill)** : Vérifiez `dmesg -T | grep -i oom` et assurez-vous que le `/swapfile` de **8 Go** est monté (`swapon --show`).
- **Timeouts lors des requêtes IA ou uploads volumineux** : Vérifiez `client_max_body_size` et `proxy_read_timeout` dans `/etc/nginx/sites-available/dms`, puis `sudo nginx -t && sudo systemctl reload nginx`.
