# GUIDE DE DÉPLOIEMENT DU DMS (SERVEUR LOCAL D'ADMINISTRATION)
**Portée :** Déploiement sur serveur local d'administration (Ubuntu Server & Windows Server)  
**Nature du document :** Guide technique basé strictement sur l'inventaire des fichiers réels du dépôt  
**Avertissement de statut :** `[NON TESTÉ EN RÉEL]` sur l'ensemble des procédures d'exécution dépendant des scripts  
**Date d'édition :** 2026-11-11  

---

## ⚠️ AVERTISSEMENT CRITIQUE DE SÉCURITÉ APPLICATIVE

> **NE PAS EXPOSER AU RÉSEAU TANT QUE LES POINTS DE SÉCURITÉ BLOQUANTS NE SONT PAS CORRIGÉS ET PROUVÉS.**
>
> Ce progiciel manipule des données administratives et des dossiers du personnel (RH) hautement sensibles. L'analyse statique du code source a révélé plusieurs vulnérabilités applicatives majeures (documentées dans `docs/PRET_DEPLOIEMENT.md`, statut : *non confirmé par le propriétaire*, notamment la réserve sur SEC-12).  
> **Les scripts de déploiement isolent et supervisent les processus, mais ils ne corrigent en aucun cas les failles intrinsèques du code applicatif.** Une exposition sans remédiation préalable expose l'administration à des contournements d'habilitation, des exfiltrations de données et des prises de compte.

---

## 1. Avertissement préalable et prérequis de déploiement

Le déploiement en environnement local exige le respect strict des principes suivants :
- **Principe de moindre privilège :** Ne jamais exécuter l'application sous le compte `root` (Linux) ou sous le compte `Administrateur` interactif (Windows).
- **Cloisonnement strict des flux :** Les bases de données (`MongoDB` port 27017) et le serveur applicatif interne Node.js ne doivent écouter **que sur `127.0.0.1`**. Seuls les ports Web standards (`80` et `443`) doivent être ouverts aux postes clients à travers le reverse proxy.
- **Zéro secret par défaut :** Aucun mot de passe générique, clé de test ou placeholder (`CHANGE_ME`) ne doit subsister dans le fichier `.env`.

---

## 2. Choix de la plateforme : Ubuntu Server vs Windows Server

Le choix du système d'exploitation hôte relève d'une **décision exclusive du propriétaire du système**. Voici un comparatif objectif basé uniquement sur les contraintes techniques réelles du code :

| Critère d'évaluation | Ubuntu Server (22.04 / 24.04 LTS) | Windows Server (2019 / 2022) |
| :--- | :--- | :--- |
| **Compilation native IA (`node-llama-cpp`)** | Directe via `build-essential` et `cmake` système standard. | Exige `Visual Studio Build Tools 2022 (C++)` (~3 à 6 Go) et CMake. |
| **Gestion mémoire des modèles GGUF** | Gestionnaire mémoire Linux très stable sous fortes charges RAM/VRAM. | Consommation mémoire de base de l'OS plus élevée ; gestion correcte si RAM >= 16 Go. |
| **Reverse Proxy & WebSockets** | Nginx natif, léger, configuration centralisée dans `deploy/ubuntu/dms.nginx.conf`. | IIS 10 avec modules externes obligatoires : *URL Rewrite 2.1* et *ARR 3.0*. |
| **Supervision de processus** | PM2 natif ou services `systemd` standards. | NSSM (Non-Sucking Service Manager) recommandé (`pm2-windows-service` instable sous Node 20+). |
| **Numérisation locale (Scanner)** | Outils SANE (`sane-utils`, pilotes Linux). | Pilotes WIA / TWAIN constructeur Windows. |
| **Compétences d'exploitation** | Nécessite des compétences d'administration système Linux (shell, UFW, logs). | Intégration aisée dans un domaine Active Directory existant et console IIS. |

---

## 3. Architecture cible de l'application

Toutes les requêtes des utilisateurs doivent impérativement transiter par le reverse proxy local. **Aucun document administratif, photo ou fichier scanné ne doit être distribué en direct par le serveur Web sans authentification applicative.**

```
                               Postes Clients de l'Administration
                                               │
                                               ▼  HTTPS (443) / HTTP (80)
                     ┌───────────────────────────────────────────────────┐
                     │           REVERSE PROXY LOCAL DURCI               │
                     │         (Nginx sous Linux / IIS sous Windows)     │
                     │  - Terminaison TLS / Certificat local SAN         │
                     │  - client_max_body_size 50M (Documents PDF)       │
                     │  - Support WebSockets (Socket.IO)                 │
                     │  - Routage Frontend SPA React (/ -> dist/)        │
                     └─────────┬───────────────────────────────┬─────────┘
                               │                               │
             Proxy /api/, /socket.io/             Proxy /courrier/, /uploads/
                               │                               │
                               ▼                               ▼
                     ┌───────────────────────────────────────────────────┐
                     │          SERVEUR APPLICATIF UNIQUE                │
                     │               (server.ts via tsx)                 │
                     │  - Écoute locale exclusive : 127.0.0.1:${PORT}    │
                     │  - Middleware Auth JWT & Contrôle d'accès         │
                     │  - Inférence IA locale (node-llama-cpp)           │
                     └─────────────────────────┬─────────────────────────┘
                                               │
                                               ▼  mongodb://127.0.0.1:27017
                     ┌───────────────────────────────────────────────────┐
                     │             BASE DE DONNÉES MONGODB               │
                     │  - bindIp: 127.0.0.1 (Ecoute externe interdite)   │
                     │  - Authentification activée (dms_app_user)        │
                     │  - Base : document-management                     │
                     └───────────────────────────────────────────────────┘
```

---

## 4. Spécifications matérielles

Valeurs déduites des exigences techniques du code (notamment l'empreinte mémoire de `node-llama-cpp` et des modèles IA) :

- **Processeur (CPU) :** 4 cœurs physiques minimum dédiés `[À CONFIRMER selon volume d'utilisateurs]`. Le fichier `server.ts:45` alloue automatiquement la moitié des cœurs physiques à `LLAMA_THREADS` s'il n'est pas spécifié.
- **Mémoire Vive (RAM) :** 
  - 16 Go de RAM physique minimum `[À CONFIRMER]`.
  - Empreinte estimée : Modèle ALLaM 7B (~4.2 Go en RAM) + Modèle BGE-M3 (~700 Mo) + Processus Node/Express (1 Go) + MongoDB (1 à 2 Go) + Système d'exploitation (2 à 4 Go).
  - Dans `ecosystem.config.cjs:34`, la limite de redémarrage mémoire PM2 (`max_memory_restart`) est fixée à `6G`.
- **Espace Disque :** 100 Go SSD minimum `[À CONFIRMER selon politique d'archivage des courriers]`. Prévoir l'espace pour l'OS, ~5 Go de modèles IA non compressés, le volume croissant des PDF numérisés et les archives de sauvegarde locales.

---

## 5. Variables d'environnement (`.env`)

Toutes les variables sont déclarées dans le fichier source `.env.production.example`.  
*(Le port interne `${PORT}` utilisé ci-dessous est une valeur d'exemple factice à définir par le propriétaire).*

| Variable | Obligatoire | Rôle technique | Exemple factice |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **OUI** | Fixe le mode d'exécution Express. Doit impérativement valoir `production`. | `production` |
| `PORT` | **OUI** | Port interne d'écoute Express (décision propriétaire, ex : 5000 ou 3000). | `5000` |
| `MONGODB_URI` | **OUI** | Chaîne de connexion MongoDB locale avec compte dédié et `authSource=admin`. | `mongodb://dms_app_user:CHANGE_ME_PASSWORD@127.0.0.1:27017/document-management?authSource=admin` |
| `JWT_SECRET` | **OUI** | Clé cryptographique forte (>= 64 caractères hexadécimaux). Rejette les clés par défaut. | `4a8f9b...CHANGE_ME...c2e1` |
| `JWT_EXPIRE` | **OUI** | Durée de validité du jeton de session. | `8h` |
| `JWT_COOKIE_EXPIRE` | **OUI** | Durée du cookie HTTP-only (en jours). | `1` |
| `ALLOWED_ORIGINS` | **OUI** | Liste blanche CORS des URLs clientes autorisées (séparées par une virgule). | `https://dms.local,https://192.168.1.50` |
| `DOCUMENT_PATH` | **OUI** | Chemin physique absolu de stockage des documents scannés. | `/var/www/dms/backend/courrier` |
| `UPLOAD_DIR` | **OUI** | Chemin physique absolu des pièces jointes et photos Multer. | `/var/www/dms/backend/uploads` |
| `BACKUP_DIR` | **OUI** | Chemin physique du répertoire de stockage des sauvegardes. | `/var/backups/dms` |
| `LLAMA_CHAT_MODEL_PATH` | Optionnel | Chemin absolu du modèle GGUF de chat (`server.ts:324`). | `/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` |
| `LLAMA_EMBEDDING_MODEL_PATH` | Optionnel | Chemin absolu du modèle GGUF d'embedding (`server.ts:325`). | `/var/www/dms/models/bge-m3-q4_k_m.gguf` |
| `LLAMA_THREADS` | Optionnel | Nombre de threads CPU dédiés à l'inférence locale (`server.ts:42`). | `4` |
| `LLAMA_GPU_LAYERS` | Optionnel | Nombre de couches déchargées sur GPU (0 = CPU pur). | `0` |
| `AI_WARMUP` | Optionnel | Préchargement du modèle en RAM au boot (`server.ts:67`). | `true` |
| `INDEX_RETRY_CRON` | Optionnel | Planification cron du rattrapage d'indexation vectorielle. | `0 2 * * *` |
| `SCANNER_ENABLED` | Optionnel | Active le sous-système de numérisation locale (`true`/`false`). | `false` |

---

## 6. Récupération du code source, installation et compilation

### A. Récupération et installation propre des dépendances
```bash
# Source : package.json
git clone <URL_DU_DEPOT_LOCAL> /var/www/dms
cd /var/www/dms

# Installation stricte basée sur package-lock.json
npm ci
```

### B. Compilation des composants Frontend (Vite)
```bash
# Source : package.json (script "build")
npm run build
```
- **Résultat attendu :** Création du dossier `/var/www/dms/dist/` contenant `index.html` et les bundles JavaScript/CSS hashés.
- **Vérification :** `test -f dist/index.html && echo "Build OK"`

### C. Démarrage du serveur backend : `npm start` vs `tsx`
- **Constat dans le dépôt :** `package.json:9` définit `"start": "node server.ts"`.
- **Avertissement :** `[À VÉRIFIER EN RÉEL]`. Dans un environnement Node.js standard, `node server.ts` échoue car Node ne compile pas nativement les fichiers TypeScript sans chargeur.  
  Commande de test :
  ```bash
  npm start
  ```
- **Recommandation formelle :** Tant que la prise en charge native n'est pas prouvée sur votre environnement, **utiliser impérativement `tsx server.ts`** (tel que configuré dans `package.json:7` (`"dev": "tsx server.ts"`), `ecosystem.config.cjs:27` et `deploy/windows/install-service.ps1:34`).

---

## 7. Modèles d'Intelligence Artificielle locaux (`.gguf`)

Le serveur intègre un moteur d'IA souverain local via `node-llama-cpp` exécuté directement sur le processeur/GPU local (sans aucune communication avec un cloud externe).

### A. Fichiers et chemins requis (lus dans `server.ts:321-325`)
Les fichiers doivent être placés dans le sous-dossier `models/` à la racine de l'application :
1. **Modèle de Chat & Synthèse :**  
   - Nom de fichier attendu : `ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf`  
   - Chemin par défaut : `models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf`  
   - Rôle : Traitement du langage naturel en arabe et français, analyse et résumé des courriers administratifs.
2. **Modèle d'Embedding sémantique :**  
   - Nom de fichier attendu : `bge-m3-q4_k_m.gguf`  
   - Chemin par défaut : `models/bge-m3-q4_k_m.gguf`  
   - Rôle : Vectorisation multilingue pour la recherche sémantique documentaire.

### B. Procédure de récupération des modèles
Les fichiers GGUF ne sont pas versionnés dans Git en raison de leur volume (~5 Go au total).
- Le script `scripts/download-models.js` est référencé dans `package.json:20` (`npm run download-models`) `[À VÉRIFIER EN RÉEL]`.
- En environnement d'administration totalement déconnecté d'Internet : copier manuellement les fichiers `.gguf` validés depuis un support sécurisé dans le répertoire `/var/www/dms/models/`.

---

## 8. Création du premier compte SuperAdmin

### A. Analyse du mécanisme existant dans le code source
Dans le fichier `backend/config/db.js:8-41`, une fonction `createDefaultAdmin()` s'exécute automatiquement lors de la première connexion à la base de données MongoDB :
```javascript
// Extrait de backend/config/db.js:8-14
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'Admin123!', // Haché automatiquement à l'insertion
  role: 'Admin',
  isActive: true,
  mustChangePassword: true
};
```

### B. Signalement : DÉFAUT BLOQUANT DE SÉCURITÉ
> 🚨 **DANGER MAJEUR :**  
> L'insertion automatique d'un compte avec le nom d'utilisateur `admin` et le mot de passe `Admin123!` constitue un **défaut de sécurité bloquant**. Si le serveur démarre, ce compte existe immédiatement avec des droits élevés.

### C. Procédure d'initialisation personnalisée : `[FICHIER ABSENT]`
Il n'existe actuellement **aucun script dédié d'initialisation interactive sécurisée** (ex: `seed-superadmin.mjs` invitant l'administrateur à saisir un identifiant et un mot de passe fort uniques avant le premier démarrage).  
**Action impérative requise pour le propriétaire :** Dès le premier démarrage, se connecter obligatoirement avec ce compte temporaire et **changer immédiatement le mot de passe** ou créer un compte SuperAdmin dédié et supprimer l'utilisateur `admin`.

---

## PARTIE 2/4 : DÉPLOIEMENT SUR UBUNTU SERVER (22.04 / 24.04 LTS)

> **Avertissement de statut :** Toutes les procédures de cette partie s'appuient sur les scripts sous `deploy/ubuntu/` et sont étiquetées `[NON TESTÉ EN RÉEL]`.  
> Le port d'écoute interne de l'application est désigné par la variable `${PORT}` (décision du propriétaire).

---

### 2.1. Initialisation du système d'exploitation, paquets et utilisateur dédié
*(Fichier source : `deploy/ubuntu/setup-system.sh`)* `[NON TESTÉ EN RÉEL]`

Le script `deploy/ubuntu/setup-system.sh` réalise la configuration de base de manière idempotente.

```bash
# Exécution avec les privilèges root (Source : deploy/ubuntu/setup-system.sh)
sudo bash deploy/ubuntu/setup-system.sh
```

#### Ce que fait le script :
1. **Fuseau horaire :** Configure l'horloge système sur `Africa/Tunis` (`timedatectl set-timezone Africa/Tunis`).
2. **Paquets système :** Met à jour APT et installe `ca-certificates`, `curl`, `gnupg`, `lsb-release`, `git`, `build-essential`, `cmake`, `pkg-config`, `nginx`, `ufw`.
3. **Outils OCR & Numérisation :** Installe `tesseract-ocr`, `tesseract-ocr-ara`, `tesseract-ocr-fra`, `poppler-utils` (`pdftoppm`), et `sane-utils`.
4. **Utilisateur de service :** Crée l'utilisateur système dédié `dms` (répertoire personnel `/var/www/dms`, shell `/bin/bash`).
5. **Node.js 22 LTS & PM2 :** Configure le dépôt officiel NodeSource 22.x et installe `nodejs` et `pm2` globalement.
6. **Arborescence & Droits :** Crée `/var/www/dms/{backend/courrier,backend/uploads/attachments,backend/uploads/usersphoto,backend/uploads/personnelphoto,models,backups,logs}` avec droits `chmod 750` et propriétaire `dms:dms`.
7. **Pare-feu UFW :** Active UFW en autorisant SSH (port 22), HTTP (port 80) et HTTPS (port 443).

#### ⚠️ Incohérence détectée dans le pare-feu UFW :
- Dans `deploy/ubuntu/setup-system.sh:106`, la commande exécutée est :
  ```bash
  ufw deny 3000/tcp comment 'Block direct Express access'
  ```
  Le port 3000 y est codé en dur pour être bloqué de l'extérieur. Si le propriétaire retient un port différent pour `${PORT}` (ex: 5000), ce port n'est pas explicitement mentionné dans la règle de blocage (bien que la politique par défaut soit `ufw default deny incoming`).  
  **Recommandation :** Ajuster la commande UFW pour bloquer explicitement le port retenu :
  ```bash
  sudo ufw deny ${PORT}/tcp comment "Block direct Express access"
  sudo ufw deny 27017/tcp comment "Block direct MongoDB access"
  ```

- **Résultat attendu :** Sortie `✅ SYSTÈME UBUNTU INITIALISÉ AVEC SUCCÈS !`.
- **Vérification :**
  ```bash
  node -v          # Doit afficher v22.x.x
  pm2 -v           # Doit afficher la version de PM2
  id dms           # Doit afficher l'utilisateur dms
  sudo ufw status  # Doit afficher 22, 80, 443 en ALLOW et 27017 en DENY
  ```
- **Si ça échoue :** Si la compilation de `cmake` ou `build-essential` échoue, vérifier l'espace disque disponible (`df -h`) et la connectivité réseau aux dépôts officiels Ubuntu.

---

### 2.2. Installation et durcissement de MongoDB Community
*(Fichier source : `deploy/ubuntu/install-mongodb.sh`)* `[NON TESTÉ EN RÉEL]`

```bash
# Exécution avec les privilèges root (Source : deploy/ubuntu/install-mongodb.sh)
sudo bash deploy/ubuntu/install-mongodb.sh
```

#### Ce que fait le script :
1. Ajoute le dépôt officiel MongoDB Community 7.0 et installe `mongodb-org` ainsi que `mongodb-database-tools` (`mongodump`, `mongorestore`).
2. Active et démarre le service systemd `mongod`.
3. **Sécurité interactive (zéro secret en clair) :** Invite l'administrateur à saisir interactivement deux mots de passe forts au clavier (masqués à la saisie) :
   - Mot de passe du compte d'administration global `admin_dms` (rôles `userAdminAnyDatabase`, `readWriteAnyDatabase`).
   - Mot de passe du compte applicatif dédié `dms_app_user` (rôles `readWrite`, `dbAdmin` sur la base `document-management`).
4. **Verrouillage réseau :** Modifie `/etc/mongod.conf` pour restreindre strictement l'écoute sur `bindIp: 127.0.0.1`.
5. **Authentification obligatoire :** Active `security.authorization: enabled` dans `/etc/mongod.conf` et redémarre le service `mongod`.

#### ⚠️ Point d'attention et compatibilité :
- **Compatibilité MongoDB 7.0 / Mongoose :** Le script installe MongoDB 7.0. La version de `mongoose` déclarée dans `package.json` (`^8.6.0`) est compatible avec MongoDB 7.0 `[À CONFIRMER par le propriétaire selon version précise d'Ubuntu Server : Jammy 22.04 vs Noble 24.04]`.
- **Résultat attendu :** Sortie `✅ MONGODB INSTALLÉ ET SÉCURISÉ AVEC SUCCÈS !`.
- **Vérification :**
  ```bash
  sudo systemctl status mongod --no-pager
  # Test de refus de connexion sans mot de passe :
  mongosh --eval "db.adminCommand('ping')" && echo "ALERTE: MongoDB accessible sans auth !" || echo "OK: Accès non authentifié rejeté"
  ```
- **Si ça échoue :** Si `mongod` ne démarre pas après modification de la configuration, inspecter le journal : `sudo journalctl -u mongod --lines 50`. Vérifier la syntaxe YAML de `/etc/mongod.conf` (notamment l'indentation de `security:`).

---

### 2.3. Configuration du fichier `.env` de production
*(Fichier source : `.env.production.example`)* `[NON TESTÉ EN RÉEL]`

Le fichier `.env` contient les secrets d'authentification et doit être strictement protégé en lecture.

```bash
# Se placer sous l'utilisateur de service (Source : .env.production.example)
su - dms
cd /var/www/dms

# Créer le fichier .env à partir du modèle
cp .env.production.example .env

# Génération d'un secret JWT fort (au moins 64 caractères hexadécimaux) :
openssl rand -hex 48

# Éditer le fichier .env
nano .env
```

Renseigner impérativement les valeurs suivantes :
- `PORT=${PORT}` (Port interne retenu par le propriétaire).
- `MONGODB_URI=mongodb://dms_app_user:<MOT_DE_PASSE_SAISI_A_L_ETAPE_2.2>@127.0.0.1:27017/document-management?authSource=admin`
- `JWT_SECRET=<CHAINE_HEX_GENEREE_PAR_OPENSSL>`
- `ALLOWED_ORIGINS=https://dms.local,https://<IP_SERVEUR_LOCAL>`
- `DOCUMENT_PATH=/var/www/dms/backend/courrier`
- `UPLOAD_DIR=/var/www/dms/backend/uploads`
- `BACKUP_DIR=/var/backups/dms`

```bash
# Verrouillage strict des permissions (seul l'utilisateur dms peut lire)
chmod 600 /var/www/dms/.env
```

- **Vérification :**
  ```bash
  ls -l /var/www/dms/.env  # Doit afficher : -rw------- 1 dms dms
  # Exécution du pre-flight check de validation :
  node deploy/scripts/check-env.mjs
  ```
- **Résultat attendu :** Sortie de `check-env.mjs` avec code 0 (`✅ CONTRÔLE RÉUSSI`).
- **Si ça échoue :** `check-env.mjs` signale en rouge les variables manquantes ou un `JWT_SECRET` trop court (< 32 car.) ou interdit (placeholder non remplacé). Corriger dans le fichier `.env`.

---

### 2.4. Génération du certificat HTTPS (SSL/TLS local)
*(Fichier source : `deploy/ubuntu/scripts/gen-selfsigned-cert.sh`)* `[NON TESTÉ EN RÉEL]`

- **État dans le dépôt concernant Let's Encrypt :**  
  Dans un environnement d'administration **local et fermé** (sans nom de domaine public qualifié FQDN exposé sur Internet), le challenge HTTP-01 de Let's Encrypt ne peut pas fonctionner. Le script `certbot` automatisé est absent du dépôt pour ce scénario fermé `[FICHIER ABSENT : script Let's Encrypt interne]`.
- **Solution présente dans le dépôt :** Certificat local d'autorité avec Subject Alternative Names (SAN) incluant l'IP locale du serveur :

```bash
# Générer le certificat SSL fort (Source : deploy/ubuntu/scripts/gen-selfsigned-cert.sh)
# Remplacer <IP_SERVEUR_LOCAL> par l'adresse IP statique (ex : 192.168.1.100)
sudo bash deploy/ubuntu/scripts/gen-selfsigned-cert.sh <IP_SERVEUR_LOCAL>
```

- **Ce que fait le script :** Génère un certificat RSA 4096 bits valide 3 ans (`/etc/ssl/certs/dms-selfsigned.crt`) et sa clé privée protégée (`/etc/ssl/private/dms-selfsigned.key` en `chmod 600`) contenant dans l'extension SAN l'IP locale, `127.0.0.1`, `localhost` et `dms.local`.
- **Vérification :**
  ```bash
  sudo openssl x509 -in /etc/ssl/certs/dms-selfsigned.crt -noout -text | grep -A 2 "Subject Alternative Name"
  ```

---

### 2.5. Configuration du Reverse Proxy Nginx
*(Fichier source : `deploy/ubuntu/dms.nginx.conf`)* `[NON TESTÉ EN RÉEL]`

```bash
# Déploiement de la configuration Nginx (Source : deploy/ubuntu/dms.nginx.conf)
sudo cp deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.conf

# Ajuster le port du proxy vers le ${PORT} retenu dans le fichier si différent :
# (proxy_pass http://127.0.0.1:${PORT};)

# Activer le site
sudo ln -sf /etc/nginx/sites-available/dms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration syntaxique Nginx
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

#### Points d'audit de cette configuration (`dms.nginx.conf`) :
1. **Zéro service statique non protégé (BLK-07 / BLK-08) :** Les blocs `location /courrier/` et `location /uploads/` ne comportent aucun `alias` direct vers le disque. Toutes les requêtes sont relayées vers `http://127.0.0.1:${PORT}` pour que le middleware Express vérifie les jetons JWT.
2. **Taille maximale des PDF :** `client_max_body_size 50M;` autorise le téléversement des courriers et scans volumineux.
3. **WebSockets :** `location /socket.io/` transmet les en-têtes `Upgrade` et `Connection "upgrade"` avec des timeouts étendus (86400s).
4. **Timeouts IA :** `proxy_read_timeout 300s;` et `proxy_buffering off;` configurés sur `location /api/` pour supporter le streaming de réponses longues par ALLaM 7B.
5. **Routage SPA React :** `location / { try_files $uri $uri/ /index.html; }` sert le frontend compilé depuis `/var/www/dms/dist`.

- **Vérification :** `sudo nginx -t` (doit retourner `syntax is ok` et `test is successful`).

---

### 2.6. Supervision de processus via PM2
*(Fichier source : `ecosystem.config.cjs`)* `[NON TESTÉ EN RÉEL]`

L'application est exécutée sous PM2 en mode `fork` (instance unique obligatoire pour ne pas dupliquer en mémoire vive les modèles GGUF de ~5 Go) :

```bash
# Lancement de l'application sous l'utilisateur dms (Source : ecosystem.config.cjs)
su - dms
cd /var/www/dms

# Démarrer le processus
pm2 start ecosystem.config.cjs

# Sauvegarder la liste des processus pour redémarrage automatique
pm2 save

# Configuration du service systemd PM2 au démarrage du serveur :
# Exécuter la commande générée par PM2 (sous sudo) :
pm2 startup systemd -u dms --hp /var/www/dms
```

- **Résultat attendu :** Le processus `dms-backend` apparaît avec le statut `online` dans `pm2 status`.
- **Vérification :**
  ```bash
  pm2 status dms-backend
  pm2 logs dms-backend --lines 20
  ```

---

### 2.7. Rotation des journaux (Logrotate)
*(Fichier source : `deploy/ubuntu/logrotate/dms`)* `[NON TESTÉ EN RÉEL]`

```bash
# Installation de la règle de rotation des logs (Source : deploy/ubuntu/logrotate/dms)
sudo cp deploy/ubuntu/logrotate/dms /etc/logrotate.d/dms
sudo chmod 644 /etc/logrotate.d/dms
```

#### ⚠️ Signalement d'incohérence : Chemins logrotate vs journaux réels PM2 :
- Dans `deploy/ubuntu/logrotate/dms:1`, la règle cible :
  ```
  /var/www/dms/logs/*.log /var/www/dms/logs/*.err
  ```
- Or, dans `ecosystem.config.cjs:45-46`, PM2 consigne ses journaux dans :
  - `./logs/err.log`
  - `./logs/out.log`
  (fichiers relatifs à la racine `/var/www/dms`, donc bien `/var/www/dms/logs/err.log` et `/var/www/dms/logs/out.log`).
- Les fichiers générés par PM2 lui-même dans son dossier personnel (`~/.pm2/logs/`) ne sont pas couverts par ce fichier `/etc/logrotate.d/dms`. Le module `pm2-logrotate` (`pm2 install pm2-logrotate`) est requis si le propriétaire souhaite également faire tourner les logs de `~/.pm2/logs/`.
- **Test de conformité syntaxique logrotate :**
  ```bash
  sudo logrotate -d /etc/logrotate.d/dms
  ```

---

### 2.8. Sauvegarde automatique planifiée (Systemd Timer)
*(Fichiers sources : `deploy/ubuntu/systemd/dms-backup.service` & `deploy/ubuntu/systemd/dms-backup.timer`)* `[NON TESTÉ EN RÉEL]`

```bash
# Installation des unités systemd de sauvegarde
sudo cp deploy/ubuntu/systemd/dms-backup.service /etc/systemd/system/
sudo cp deploy/ubuntu/systemd/dms-backup.timer /etc/systemd/system/

# Recharger systemd et activer le déclencheur quotidien (02:00)
sudo systemctl daemon-reload
sudo systemctl enable --now dms-backup.timer
```

#### ⚠️ Signalement sur les doublons de scripts de sauvegarde :
- Le dépôt contient à la fois `deploy/scripts/backup-all.sh` et `deploy/backup/backup-mongo.sh`.  
  Le script unifié complet est **`deploy/scripts/backup-all.sh`** (sauvegarde MongoDB + `courrier/` + `uploads/` + empreinte SHA256 des `.gguf`). L'unité `dms-backup.service` pointe bien vers `deploy/scripts/backup-all.sh`.
- **Vérification du timer :**
  ```bash
  systemctl list-timers dms-backup.timer
  ```

---

### 2.9. Déploiement automatisé et mise à jour
*(Fichier source : `deploy/ubuntu/deploy.sh`)* `[NON TESTÉ EN RÉEL]`

Le script `deploy/ubuntu/deploy.sh` automatise le cycle de mise en production ou de mise à jour :

```bash
# Exécution sous l'utilisateur dms (Source : deploy/ubuntu/deploy.sh)
su - dms
cd /var/www/dms
bash deploy/ubuntu/deploy.sh
```

#### Enchaînement séquentiel du script :
1. `node deploy/scripts/check-env.mjs` (Vérifie le `.env` et les prérequis).
2. `bash deploy/scripts/backup-all.sh` (Sauvegarde préventive de l'état actuel).
3. Sauvegarde du build existant (`cp -r dist dist.bak`).
4. `npm ci` (Installation propre des dépendances).
5. `npm run build` (Recompilation des assets Vite).
6. `pm2 reload ecosystem.config.cjs --update-env` (Rechargement à chaud sans coupure).
7. `node deploy/scripts/smoke-test.mjs http://127.0.0.1:${PORT}` (Exécution des tests de fumée).
8. **Rollback automatique intégré :** Si les tests du groupe Déploiement échouent (`TEST_EXIT_CODE != 0`), le script déclenche automatiquement `deploy/ubuntu/rollback.sh` !

---

### 2.10. Retour arrière d'urgence (Rollback)
*(Fichier source : `deploy/ubuntu/rollback.sh`)* `[NON TESTÉ EN RÉEL]`

En cas de régression ou d'anomalie post-déploiement :

```bash
# Exécution manuelle du rollback si nécessaire (Source : deploy/ubuntu/rollback.sh)
su - dms
cd /var/www/dms
bash deploy/ubuntu/rollback.sh
```

- **Actions du script :**
  1. Restaure le dossier frontend `dist.bak` vers `dist`.
  2. Recharge le service via `pm2 reload dms-backend`.
  3. Vérifie la reprise du service sur `http://127.0.0.1:${PORT}/api/health`.

---

## PARTIE 3/4 : DÉPLOIEMENT SUR WINDOWS SERVER (2019 / 2022)

> **Avertissement de statut :** Toutes les procédures de cette partie s'appuient sur les scripts sous `deploy/windows/` et sont étiquetées `[NON TESTÉ EN RÉEL]`.  
> Le port d'écoute interne de l'application est désigné par la variable `${PORT}` (décision du propriétaire).

---

### 3.1. Installation des prérequis système
*(Fichier source : `deploy/windows/install-prereqs.ps1`)* `[NON TESTÉ EN RÉEL]`

Dans une invite de commandes PowerShell lancée en tant qu'**Administrateur** :

```powershell
# Exécution sous privilèges Administrateur (Source : deploy/windows/install-prereqs.ps1)
Set-ExecutionPolicy RemoteSigned -Scope Process -Force
.\deploy\windows\install-prereqs.ps1
```

#### Ce que fait le script :
1. **Gestionnaire de paquets :** Installe Chocolatey si absent.
2. **Runtime & Outils :** Installe Node.js 22 LTS (`nodejs-lts` v22.14.0) et Git pour Windows.
3. **Outils C++ :** Installe `visualstudio2022buildtools` (charge de travail `VCTools` pour `node-llama-cpp`) et CMake.
4. **Base de données :** Installe MongoDB Community Server et `mongodb-database-tools`.
5. **OCR & Traitement PDF :** Installe Tesseract OCR et Poppler (`pdftoppm`).
6. **Superviseur de service :** Installe NSSM (*Non-Sucking Service Manager*).
7. **Verrouillage MongoDB :** Tente de modifier `mongod.cfg` pour restreindre `bindIp: 127.0.0.1` et redémarre le service Windows `MongoDB`.

#### ⚠️ Signalement critique sur IIS URL Rewrite et ARR :
- **Constat dans `install-prereqs.ps1` :** Le script n'installe **ni URL Rewrite 2.1 ni ARR 3.0 (Application Request Routing)**. Les installeurs MSI Microsoft pour ces deux modules sont absents du dépôt `[FICHIER ABSENT : installeurs IIS URL Rewrite et ARR]`.
- **Conséquence bloquante :** Le fichier `deploy/windows/web.config` **ne fonctionnera pas** sans ces deux modules installés sur IIS. Si IIS tente de charger un `web.config` contenant des balises `<rewrite>` sans URL Rewrite, il renverra une erreur HTTP 500.19 bloquante. De plus, le reverse proxy nécessite impérativement d'activer la directive proxy dans ARR.
- **Action requise avant configuration Web :**
  1. Installer manuellement **URL Rewrite Module 2.1** (x64) via le site officiel Microsoft.
  2. Installer manuellement **Application Request Routing 3.0** (x64).
  3. Dans IIS Manager > Serveur (racine) > **Application Request Routing Cache** > volet droit **Server Proxy Settings...** > Cocher **Enable proxy** > Cliquer sur **Apply**.

---

### 3.2. Configuration de l'authentification MongoDB sous Windows
`[FICHIER ABSENT : script configure-mongodb.ps1]`

Le script `install-prereqs.ps1` installe MongoDB mais ne crée pas les comptes administrateur et applicatif. Il n'existe pas de script PowerShell dédié dans le dépôt `[FICHIER ABSENT]`.

#### Procédure manuelle recommandée (sans mot de passe en dur) :
Dans un terminal PowerShell :
```powershell
# Connexion au shell MongoDB local
mongosh --host 127.0.0.1 --port 27017
```
Exécuter les instructions d'initialisation :
```javascript
// Création du compte administrateur global
use admin;
db.createUser({
  user: "admin_dms",
  pwd: passwordPrompt(), // Saisie masquée au clavier
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, { role: "readWriteAnyDatabase", db: "admin" } ]
});

// Création du compte applicatif restreint
use document-management;
db.createUser({
  user: "dms_app_user",
  pwd: passwordPrompt(), // Saisie masquée au clavier
  roles: [ { role: "readWrite", db: "document-management" }, { role: "dbAdmin", db: "document-management" } ]
});
exit;
```
Activer ensuite la sécurité dans le fichier de configuration de MongoDB (ex : `C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`) :
```yaml
security:
  authorization: enabled
```
Redémarrer le service Windows :
```powershell
Restart-Service -Name "MongoDB"
```

---

### 3.3. Configuration du fichier `.env` et ACLs Windows (`icacls`)
*(Fichier source : `.env.production.example`)* `[NON TESTÉ EN RÉEL]`

```powershell
# Depuis la racine C:\inetpub\wwwroot\dms (ou dossier choisi)
Copy-Item .env.production.example .env

# Génération d'une clé JWT forte via PowerShell (sans afficher le secret dans les logs) :
$bytes = New-Object byte[] 48
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
$jwtSecret = -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
```
Éditer `.env` avec le bloc-notes ou PowerShell :
- `PORT=${PORT}`
- `MONGODB_URI=mongodb://dms_app_user:<MOT_DE_PASSE>@127.0.0.1:27017/document-management?authSource=admin`
- `JWT_SECRET=<CHAINE_GENEREE>`
- `DOCUMENT_PATH=C:\inetpub\wwwroot\dms\backend\courrier`
- `UPLOAD_DIR=C:\inetpub\wwwroot\dms\backend\uploads`
- `BACKUP_DIR=C:\backups\dms`

#### Protection stricte du fichier `.env` via `icacls` :
Pour empêcher les utilisateurs standards de la machine de lire les secrets :
```powershell
# Suppression de l'héritage et restriction à SYSTEM et Administrateurs
icacls .env /inheritance:r
icacls .env /grant:r "SYSTEM:(R)"
icacls .env /grant:r "Administrators:(F)"
```

- **Vérification de l'environnement :**
  ```powershell
  node deploy\scripts\check-env.mjs
  ```

---

### 3.4. Installation du Service Windows via NSSM
*(Fichier source : `deploy/windows/install-service.ps1`)* `[NON TESTÉ EN RÉEL]`

```powershell
# Exécution sous privilèges Administrateur (Source : deploy/windows/install-service.ps1)
.\deploy\windows\install-service.ps1
```

#### Ce que configure le script :
1. Détecte la présence de `nssm.exe`.
2. Configure le service Windows nommé `DMSBackend`.
3. Commande exécutée : `node_modules\.bin\tsx.cmd server.ts` (ou `npx tsx server.ts`).
4. Répertoire de travail : Répertoire racine du projet (`$ProjectRoot`).
5. Variables d'environnement injectées dans le service :
   ```
   NODE_ENV=production
   PORT=${PORT}
   ```
6. **Politique de redémarrage :** En cas de crash inattendu, NSSM redémarre le service après un délai de 4 secondes (`AppRestartDelay 4000`).
7. **Journaux et rotation :** Redirige les sorties vers :
   - `logs\service-out.log`
   - `logs\service-err.log`
   Avec rotation quotidienne (`AppRotateSeconds 86400`) ou si la taille dépasse 10 Mo (`AppRotateBytes 10485760`).

#### ⚠️ Comparaison des chemins de journaux :
Dans `install-service.ps1:68-75`, les logs de sortie sont écrits dans `logs\service-out.log` et `logs\service-err.log`, alors que la configuration PM2 (`ecosystem.config.cjs:45-46`) cible `logs\err.log` et `logs\out.log`. Cette distinction est normale sous Windows où NSSM assure sa propre rotation de fichiers en ligne (`AppRotateOnline 1`).

- **Vérification :**
  ```powershell
  Get-Service -Name "DMSBackend"  # Doit afficher Status: Running
  ```

---

### 3.5. Configuration d'IIS et audit de `web.config`
*(Fichier source : `deploy/windows/web.config`)* `[NON TESTÉ EN RÉEL]`

Copier `deploy/windows/web.config` à la racine du site Web IIS hébergeant le frontend (`dist/`) :

```powershell
Copy-Item deploy\windows\web.config dist\web.config
```

#### Audit de sécurité de `deploy/windows/web.config` :
1. **Limite de téléversement :**  
   `<requestLimits maxAllowedContentLength="52428800" />` (50 Mo autorisés pour les documents administratifs et scans PDF).
2. **Support WebSocket :**  
   `<webSocket enabled="true" />` active le protocole WebSocket nécessaire pour Socket.IO.
3. **Protection des documents et téléversements sensibles (Règles 4 & 5) :**
   ```xml
   <!-- Proxy vers les documents scannés Courrier (Protection Express obligatoire) -->
   <rule name="Courrier Proxy" stopProcessing="true">
     <match url="^courrier/(.*)" />
     <action type="Rewrite" url="http://localhost:${PORT}/courrier/{R:1}" />
   </rule>

   <!-- Proxy vers les uploads Multer (Protection Express obligatoire) -->
   <rule name="Uploads Proxy" stopProcessing="true">
     <match url="^uploads/(.*)" />
     <action type="Rewrite" url="http://localhost:${PORT}/uploads/{R:1}" />
   </rule>
   ```
   Ces deux règles redirigent l'ensemble des accès `/courrier/` et `/uploads/` vers le serveur Express local pour validation des droits et de la session JWT.
4. **Positionnement AVANT le fallback SPA (Règle 6) :**  
   La règle `React SPA Routes` réécrit les URLs vers `/index.html` avec la condition stricte :
   `pattern="^/(api|socket\.io|courrier|uploads|api-docs)" negate="true"`.  
   Les PDF du courrier et les pièces jointes ne tombent plus par erreur dans le template HTML de React.
5. **Zéro exposition statique directe :** IIS ne sert aucun fichier de `courrier` ou `uploads` en direct.

---

### 3.6. Configuration HTTPS et liaison de certificat sous IIS
`[FICHIER ABSENT : script New-SelfSignedCert.ps1 / liaison IIS]`

Le dépôt ne contient aucun script PowerShell automatisant la création d'un certificat auto-signé Windows ou la création du binding HTTPS dans IIS `[FICHIER ABSENT]`.

#### Procédure PowerShell recommandée pour générer le certificat et la liaison :
```powershell
# Générer un certificat auto-signé avec SAN IP Locale (remplacer 192.168.1.100 par l'IP réelle)
$cert = New-SelfSignedCertificate -DnsName "dms.local", "192.168.1.100", "localhost" `
  -CertStoreLocation "Cert:\LocalMachine\My" `
  -NotAfter (Get-Date).AddYears(3) `
  -FriendlyName "DMS Local Admin Certificate"

# Dans IIS Manager > Site Web DMS > Liaisons (Bindings) :
# Ajouter une liaison : Type: https | Port: 443 | Certificat SSL : Sélectionner "DMS Local Admin Certificate"
```

---

### 3.7. Configuration du Pare-feu Windows
`[FICHIER ABSENT : script firewall.ps1]`

Le dépôt ne contient aucun script pour le pare-feu Windows `[FICHIER ABSENT]`.

#### Commandes PowerShell impératives pour sécuriser le serveur local :
```powershell
# 1. Autoriser le trafic entrant sur les ports Web IIS
New-NetFirewallRule -DisplayName "DMS - HTTP (80)" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "DMS - HTTPS (443)" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow

# 2. Bloquer explicitement les accès externes directs au serveur Express et à MongoDB
New-NetFirewallRule -DisplayName "DMS - Blocage Express Externe" -Direction Inbound -LocalPort ${PORT} -Protocol TCP -Action Block
New-NetFirewallRule -DisplayName "DMS - Blocage MongoDB Externe" -Direction Inbound -LocalPort 27017 -Protocol TCP -Action Block
```

---

### 3.8. Procédures de mise à jour et retour arrière sous Windows
`[FICHIER ABSENT : deploy.ps1 et rollback.ps1]`

Il n'existe actuellement aucun script `deploy.ps1` ni `rollback.ps1` sous `deploy/windows/` `[FICHIER ABSENT]`.

#### Procédure manuelle séquentielle de mise à jour :
1. Créer une sauvegarde manuelle :  
   `powershell -File .\deploy\backup\backup-mongo.ps1`
2. Mettre à jour le code (`git pull` ou copie de release).
3. Installer les dépendances : `npm ci`.
4. Recompiler le frontend Vite : `npm run build`.
5. Redémarrer le service NSSM :  
   `Restart-Service -Name "DMSBackend"`.
6. Valider le fonctionnement :  
   `node deploy\scripts\smoke-test.mjs http://localhost:${PORT}`.

#### Procédure manuelle en cas d'anomalie (Rollback) :
1. Rétablir le dossier `dist` antérieur.
2. `Restart-Service -Name "DMSBackend"`.
3. Vérifier le retour à la normale sur `http://localhost:${PORT}/api/health`.

---

## PARTIE 4/4 : EXPLOITATION, RECETTE ET ANNEXES

> **Avertissement de statut :** Toutes les procédures d'exécution dépendent de scripts ou commandes étiquetés `[NON TESTÉ EN RÉEL]`.  
> Le port d'écoute interne de référence est noté `${PORT}`.

---

### 4.1. Sauvegarde et restauration (Ubuntu et Windows)

#### A. Procédure sous Ubuntu Server
*(Fichiers sources : `deploy/scripts/backup-all.sh`, `restore-all.sh`, `deploy/ubuntu/systemd/dms-backup.*`)* `[NON TESTÉ EN RÉEL]`

1. **Sauvegarde manuelle intégrale :**
   ```bash
   # Syntaxe : bash deploy/scripts/backup-all.sh [DOSSIER_DESTINATION] [JOURS_RETENTION]
   bash deploy/scripts/backup-all.sh /var/backups/dms 14
   ```
   - **Opérations :** `mongodump` BSON compressé (`--gzip`) + copie récursive de `courrier/` et `uploads/` + empreinte SHA256 des fichiers `.gguf` dans `ai_models_manifest.txt` + compression `.tar.gz` consolidée.
   - **Rétention :** Purge des archives de plus de 14 jours, avec **protection stricte de la dernière archive valide**.
2. **Planification automatique :**
   L'unité `dms-backup.timer` déclenche la sauvegarde quotidienne à 02:00 sous le compte `dms`.
3. **Test de restauration sécurisé (Base temporaire de test par défaut) :**
   ```bash
   # Restaure par défaut vers 'document-management-test' SANS toucher à la base de production
   bash deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_YYYYMMDD_HHMMSS.tar.gz
   ```
   - Vérifie préalablement l'intégrité de l'archive (`tar -tzf`).
4. **Restauration en Production (avec écrasement `--drop`) :**
   ```bash
   # Exige le flag explicite et la confirmation au clavier 'OUI'
   bash deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_YYYYMMDD_HHMMSS.tar.gz --target-prod
   ```

#### B. Procédure sous Windows Server
*(Fichier source : `deploy/backup/backup-mongo.ps1`)* `[NON TESTÉ EN RÉEL]`

1. **Sauvegarde manuelle intégrale :**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy\backup\backup-mongo.ps1
   ```
   - Archive MongoDB, `courrier/` et `uploads/` dans `backups\dms_full_backup_YYYYMMDD_HHMMSS.zip` avec rétention 14 jours protégeant la dernière archive.
2. **Planification automatique (Planificateur de tâches Windows) :**
   ```powershell
   # Enregistrement d'une tâche planifiée quotidienne à 02:00
   $action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
     -Argument "-ExecutionPolicy Bypass -File C:\inetpub\wwwroot\dms\deploy\backup\backup-mongo.ps1"
   $trigger = New-ScheduledTaskTrigger -Daily -At 02:00
   Register-ScheduledTask -TaskName "DMS-DailyBackup" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest
   ```
3. **Restauration sous Windows :**  
   `[FICHIER ABSENT : script restore-mongo.ps1]`. La restauration manuelle exige d'extraire le fichier ZIP, d'utiliser `mongorestore.exe --gzip --drop` et de recopier les dossiers `courrier\` et `uploads\`.

---

### 4.2. Recette de réception post-déploiement (Tableau de validation)

Exécuter cette suite de requêtes de contrôle depuis une machine cliente ou directement sur le serveur :

| N° | Test effectué | Commande de validation (`curl` ou PowerShell) | Résultat attendu | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **REC-01** | **Santé de l'API & Base** | `curl -s -i http://127.0.0.1:${PORT}/api/health` | HTTP 200 + `{"database":"connected"}` | `[À TESTER]` |
| **REC-02** | **Accès non authentifié** | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/api/departments` | **HTTP 401** (jamais 503 ni 200) | `[À TESTER]` |
| **REC-03** | **Route inexistante** | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${PORT}/api/route-inexistante-404` | **HTTP 404** (gestion d'erreur propre, pas de 500) | `[À TESTER]` |
| **REC-04** | **Protection /courrier/** | `curl -s -o /dev/null -w "%{http_code}" https://dms.local/courrier/test.pdf` | **HTTP 401 ou 403** (bloqué par Node, pas de fuite) | `[À TESTER]` |
| **REC-05** | **Protection /uploads/** | `curl -s -o /dev/null -w "%{http_code}" https://dms.local/uploads/usersphoto/test.jpg` | **HTTP 401 ou 403** (bloqué par Node, pas de fuite) | `[À TESTER]` |
| **REC-06** | **CORS Origine malveillante** | `curl -s -I -H "Origin: http://evil.test" https://dms.local/api/health` | L'en-tête `Access-Control-Allow-Origin: http://evil.test` **NE DOIT PAS** être renvoyé | `[À TESTER]` |
| **REC-07** | **Rate Limiting Login** | Exécuter 12 requêtes POST successives sur `/api/auth/login` avec un faux compte | **HTTP 429** (*Too Many Requests*) avant la 12ème tentative | `[À TESTER]` |
| **REC-08** | **Validité du certificat HTTPS** | `curl -s -I https://dms.local/` (ou navigateur Web) | Connexion TLS établie sans interruption | `[À TESTER]` |
| **REC-09** | **Redémarrage et reprise** | `sudo reboot` (ou redémarrage Windows), puis tester `/api/health` | Le service DMS redémarre automatiquement sans intervention | `[À TESTER]` |

*(Note : L'ensemble de ces contrôles est automatisable via `node deploy/scripts/smoke-test.mjs http://127.0.0.1:${PORT} [--strict-security]`)*.

---

### 4.3. Tableau de dépannage (Diagnostics et Résolutions)

| Symptôme constaté | Cause probable | Commande de diagnostic / Résolution |
| :--- | :--- | :--- |
| **HTTP 502 Bad Gateway** sous Nginx ou IIS | Le serveur applicatif Node.js (`server.ts`) est éteint ou a crashé au démarrage. | **Ubuntu :** `pm2 logs dms-backend --lines 50`<br>**Windows :** `Get-Content logs\service-err.log -Tail 50` |
| **Erreur de connexion MongoDB (MongooseServerSelectionError)** | Le service MongoDB est arrêté, écoute sur la mauvaise IP, ou les identifiants `.env` sont incorrects. | `sudo systemctl status mongod`<br>Vérifier `grep bindIp /etc/mongod.conf` (doit être `127.0.0.1`). |
| **HTTP 500.19 sous IIS** | Les modules IIS **URL Rewrite 2.1** ou **ARR 3.0** ne sont pas installés sur le serveur Windows. | Télécharger et installer les extensions officielles Microsoft URL Rewrite et Application Request Routing. |
| **Lenteur extrême sur la 1ère requête du Chat IA** | Le modèle GGUF est volumineux (~4.2 Go) et le warm-up initial n'a pas été déclenché. | Activer `AI_WARMUP=true` dans le fichier `.env` pour que le modèle soit chargé en tâche de fond au démarrage. |
| **Erreur Out of Memory (OOM) ou Process killed** | La RAM allouée est insuffisante pour le modèle ALLaM 7B ou PM2 a atteint sa limite mémoire. | Vérifier la RAM libre (`free -h`). S'assurer qu'une seule instance PM2 tourne (`instances: 1` en mode `fork`). |
| **Les fichiers PDF du courrier affichent le HTML de React** | La règle de réécriture IIS ou Nginx pour `/courrier/` est manquante ou placée après la SPA. | Vérifier dans `web.config` que la règle `Courrier Proxy` est active et placée **avant** `React SPA Routes`. |

---

### 4.4. Commandes d'exploitation courante

#### A. Sous Ubuntu Server (PM2 & Systemd) :
- **Consulter l'état du serveur :** `pm2 status`
- **Consulter les journaux en direct :** `pm2 logs dms-backend`
- **Consulter les journaux d'erreurs :** `tail -n 100 /var/www/dms/logs/err.log`
- **Redémarrer le backend :** `pm2 restart dms-backend`
- **Recharger sans interruption :** `pm2 reload ecosystem.config.cjs --update-env`
- **Statut de la base MongoDB :** `sudo systemctl status mongod`
- **Statut du reverse proxy :** `sudo systemctl status nginx`

#### B. Sous Windows Server (NSSM & IIS) :
- **Consulter l'état du service :** `Get-Service -Name "DMSBackend"`
- **Démarrer le service :** `Start-Service -Name "DMSBackend"`
- **Arrêter le service :** `Stop-Service -Name "DMSBackend"`
- **Redémarrer le service :** `Restart-Service -Name "DMSBackend"`
- **Consulter les journaux :** `Get-Content .\logs\service-out.log -Tail 50 -Wait`
- **Consulter les erreurs :** `Get-Content .\logs\service-err.log -Tail 50`
- **Redémarrer le serveur Web IIS :** `iisreset`

---

### 4.5. Annexes

#### Annexe A : Incohérences détectées dans le dépôt
1. **Port d'écoute interne non tranché :**  
   - `server.ts:316` fixe par défaut `PORT = 3000` si la variable d'environnement `PORT` n'est pas transmise.
   - Les fichiers de déploiement (`ecosystem.config.cjs`, `web.config`, `dms.nginx.conf`, `smoke-test.mjs`, `.env.production.example`) ont été rédigés ou alignés sur `PORT = 5000`.
   - **Règle impérative :** La variable `PORT` définie dans `.env` fait foi et prévaut lors du lancement.
2. **Commande `npm start` vs `tsx` :**  
   - `package.json:9` définit `"start": "node server.ts"`. Or, vanilla Node.js ne compile pas les fichiers `.ts` sans chargeur TypeScript.
   - L'exploitation de production doit s'appuyer sur `tsx server.ts` (comme défini dans `ecosystem.config.cjs` et `install-service.ps1`).
3. **Règle UFW restrictive sur le mauvais port :**  
   - `deploy/ubuntu/setup-system.sh:106` bloque `3000/tcp` au lieu de `${PORT}/tcp`.
4. **Journaux de logrotate vs PM2 :**  
   - `deploy/ubuntu/logrotate/dms` cible `/var/www/dms/logs/*.log`, ignorant les logs générés par PM2 sous `~/.pm2/logs/`.
5. **Doublons de scripts de sauvegarde :**  
   - Présence de `deploy/scripts/backup-all.sh` et de `deploy/backup/backup-mongo.sh`.

#### Annexe B : Liste des `[FICHIER ABSENT]` identifiés
- `[FICHIER ABSENT : script seed-superadmin.mjs]` : Création interactive d'un SuperAdmin personnalisé avant mise en service.
- `[FICHIER ABSENT : script restore-mongo.ps1]` : Restauration automatisée sous Windows Server.
- `[FICHIER ABSENT : script firewall.ps1]` : Automatisation des règles de pare-feu Windows via PowerShell.
- `[FICHIER ABSENT : deploy.ps1 et rollback.ps1]` : Automatisation de mise à jour et de retour arrière sous Windows.
- `[FICHIER ABSENT : installeurs IIS URL Rewrite et ARR]` : Binaires MSI requis pour IIS.
- `[FICHIER ABSENT : script Let's Encrypt interne]` : Automatisation TLS pour domaine local d'administration.

#### Annexe C : Ce que ce guide ne couvre pas
- L'administration de l'annuaire d'entreprise Active Directory / LDAP.
- La mise en cluster haute disponibilité multi-serveurs de MongoDB (Replica Set).
- La configuration physique des baies de stockage SAN/NAS ou du matériel scanner réseau.
- La correction intrinsèque des failles du code source applicatif répertoriées ci-dessous.

#### Annexe D : Questions pour le propriétaire du système
1. **Quel est le port interne définitif retenu pour l'écoute d'Express ?** (5000 ou 3000 ?).
2. **Quelle est la plateforme hôte finale ?** (Ubuntu Server 22.04 LTS, Ubuntu Server 24.04 LTS, Windows Server 2019 ou Windows Server 2022 ?).
3. **Quel est le nom de domaine local ou l'adresse IP statique du serveur ?** (Pour sceller les certificats SSL SAN et la variable `ALLOWED_ORIGINS`).
4. **Quelle est la volumétrie prévisionnelle des agents utilisateurs simultanés ?** (Pour ajuster le dimensionnement CPU/RAM et les cœurs alloués à l'inférence IA).
5. **Le serveur dispose-t-il d'un GPU Nvidia dédié ?** (Si oui, configurer les pilotes CUDA/Vulkan et ajuster `LLAMA_GPU_LAYERS > 0` dans `.env`).
6. **Le matériel de numérisation (scanner) est-il raccordé en USB local ou en scanner réseau ?** (Pour confirmer l'utilisation de SANE sous Linux ou WIA sous Windows).

---

*(Fin du guide de déploiement — Document scellé)*
