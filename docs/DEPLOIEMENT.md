# GUIDE DE DÉPLOIEMENT EN PRODUCTION (DMS LOCAL)
**Application :** Système de Gestion Électronique de Courrier, Ressources Humaines & Module IA Local (node-llama-cpp)  
**Environnement cible :** Serveur LOCAL d'administration (Ubuntu Server 22.04/24.04 LTS ou Windows Server 2019/2022)  
**Port d'écoute interne unique :** `5000` (Nginx, PM2, NSSM, IIS, `.env`)  
**Statut des scripts :** `[NON TESTÉ, à exécuter sur une VM de recette]`  
**Règle d'or :** *Aucune modification du code métier applicatif.*

---

## 1. Choix de la plateforme hôte

Pour un serveur d'administration locale hébergeant des données RH confidentielles et un module IA local :
- **Ubuntu Server 22.04 ou 24.04 LTS (Hautement Recommandé) :** Meilleure performance native pour la compilation C++ de `node-llama-cpp`, gestion de la mémoire optimisée pour les modèles GGUF, isolation stricte via compte de service sans shell, pare-feu UFW natif et reverse-proxy Nginx léger.
- **Windows Server 2019 ou 2022 :** Supporté via IIS 10 (modules URL Rewrite + Application Request Routing) et pilotage de service Windows robuste via **NSSM** (remplaçant avantageusement `pm2-windows-service`).

---

## 2. Architecture cible

```
                                  RÉSEAU LOCAL D'ADMINISTRATION
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼ (Port 443 / HTTPS)                                  ▼ (Port 80 / HTTP)
       ┌───────────────────────────────┐                     ┌───────────────────────────────┐
       │   Nginx (Ubuntu) / IIS (Win)  │                     │   Redirection vers HTTPS      │
       │   - SSL/TLS (SAN IP Locale)   │                     └───────────────────────────────┘
       │   - Reverse-Proxy WebSockets  │
       │   - client_max_body_size 50M  │
       │   - Protection /uploads &     │
       │     /courrier/ via Node       │
       └──────────────┬────────────────┘
                      │
                      │ Proxy interne (http://127.0.0.1:5000)
                      ▼
       ┌───────────────────────────────┐
       │   Serveur Unique (server.ts)  │ ◄─── Lancé via `tsx server.ts`
       │   (Express + PM2 ou NSSM)     │      (1 seule instance / mode fork)
       └──────┬─────────────────┬──────┘
              │                 │
              │                 ▼
              │  ┌────────────────────────────────────────────────────────┐
              │  │  Module IA Local Souverain (node-llama-cpp)            │
              │  │  - ALLaM-7B-Instruct-preview (Chat & Synthèse)         │
              │  │  - BGE-M3 (Embeddings sémantiques multilingues)        │
              │  │  - Stockage modèles : ./models/*.gguf (~5 Go)          │
              │  └────────────────────────────────────────────────────────┘
              ▼
       ┌───────────────────────────────┐
       │   MongoDB Community 7.0       │
       │   - Port 27017 (127.0.0.1)    │
       │   - Authentification active   │
       │   - Base : document-management│
       └───────────────────────────────┘
```

---

## 3. Prérequis matériels et système

- **Processeur (CPU) :** Minimum 4 cœurs physiques (8 cœurs x86_64 recommandés pour une inférence IA fluide).
- **Mémoire Vive (RAM) :** 
  - Minimum absolu : 16 Go de RAM physique.
  - Allocation : 6 Go dédiés au modèle ALLaM 7B, 1.5 Go au modèle BGE-M3, 4 Go pour le système d'exploitation et MongoDB.
- **Stockage (Disque) :** 100 Go SSD / NVMe minimum (5 Go pour les modèles GGUF, réserve pour les PDF du courrier scanné et les sauvegardes).
- **Réseau :** IP statique d'administration locale (ex : `192.168.1.100` ou `10.0.0.50`).

---

## 4. Installation sur Ubuntu Server (22.04 / 24.04 LTS)

### Étape 4.1 : Préparation du système et dépendances
Exécuter en tant qu'administrateur :
```bash
sudo bash deploy/ubuntu/setup-system.sh
```
Ce script installe Node.js 22 LTS, Nginx, PM2, `build-essential`, `cmake`, `tesseract-ocr` (packs arabe et français), `poppler-utils`, `sane-utils`, crée l'utilisateur `dms` et configure le pare-feu UFW (ports 22, 80, 443 ouverts ; ports 5000 et 27017 bloqués de l'extérieur).

### Étape 4.2 : Installation et sécurisation de MongoDB
```bash
sudo bash deploy/ubuntu/install-mongodb.sh
```
Le script configure `bindIp: 127.0.0.1`, active l'authentification (`authorization: enabled`), et invite à saisir interactivement le mot de passe fort pour l'utilisateur applicatif `dms_app_user`.

### Étape 4.3 : Configuration du Reverse-Proxy Nginx
```bash
# Générer le certificat SSL auto-signé avec IP locale
sudo bash deploy/ubuntu/scripts/gen-selfsigned-cert.sh 192.168.1.100

# Activer la configuration Nginx
sudo cp deploy/ubuntu/dms.nginx.conf /etc/nginx/sites-available/dms.conf
sudo ln -sf /etc/nginx/sites-available/dms.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Étape 4.4 : Déploiement applicatif
```bash
# Se placer sous l'utilisateur de service
su - dms
cd /var/www/dms

# Configurer .env
cp .env.production.example .env
nano .env

# Déployer et vérifier
bash deploy/ubuntu/deploy.sh
```

---

## 5. Installation sur Windows Server (2019 / 2022)

### Étape 5.1 : Prérequis système automatisés
Dans une console PowerShell exécutée en tant qu'**Administrateur** :
```powershell
Set-ExecutionPolicy RemoteSigned -Scope Process -Force
.\deploy\windows\install-prereqs.ps1
```
Ce script installe Node.js 22 LTS, Git, Visual Studio Build Tools C++, MongoDB Community, Tesseract OCR, Poppler et NSSM.

### Étape 5.2 : Configuration d'IIS
1. Ouvrir le **Gestionnaire des services Internet (IIS)**.
2. Installer les modules **URL Rewrite 2.1** et **Application Request Routing (ARR) 3.0**.
3. Dans IIS Manager > Serveur > **Application Request Routing Cache** > volet droit **Server Proxy Settings...** > Cocher **Enable proxy** > Cliquer sur **Apply**.
4. Créer un site Web IIS pointant vers la racine `C:\inetpub\wwwroot\dms\dist` et copier `deploy\windows\web.config` à la racine du site.

### Étape 5.3 : Installation et démarrage du Service via NSSM
```powershell
# Depuis la racine du projet
npm ci
npm run build
.\deploy\windows\install-service.ps1
```
Le service Windows `DMSBackend` est créé et configuré avec redémarrage automatique en cas de crash, écoute sur le **port 5000** et redirection des logs dans `.\logs\`.

---

## 6. Configuration de l'environnement (`.env`)

Copier le gabarit de production :
```bash
cp .env.production.example .env
```
Paramétrer les variables indispensables :

### Génération sécurisée des clés secrètes :
```bash
# Génération d'une clé JWT forte (>= 64 caractères) :
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Valeurs de référence (`.env`) :
```ini
NODE_ENV=production
PORT=5000

# Base de données (avec authentification locale)
MONGODB_URI=mongodb://dms_app_user:VOTRE_MOT_DE_PASSE_SECURISE@127.0.0.1:27017/document-management?authSource=admin

# Authentification JWT
JWT_SECRET=VOTRE_CLE_HEX_DE_AU_MOINS_64_CARACTERES
JWT_EXPIRE=8h
JWT_COOKIE_EXPIRE=1

# Origines CORS autorisées
ALLOWED_ORIGINS=https://dms.local,https://192.168.1.100

# Chemins de stockage
DOCUMENT_PATH=/var/www/dms/backend/courrier
UPLOAD_DIR=/var/www/dms/backend/uploads
BACKUP_DIR=/var/backups/dms

# Intelligence Artificielle Locale GGUF
LLAMA_CHAT_MODEL_PATH=/var/www/dms/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
LLAMA_EMBEDDING_MODEL_PATH=/var/www/dms/models/bge-m3-q4_k_m.gguf
LLAMA_THREADS=4
LLAMA_GPU_LAYERS=0
AI_WARMUP=true
```

---

## 7. Téléchargement et placement des modèles IA (.gguf)

Les modèles ne sont pas versionnés dans git en raison de leur taille (~5 Go).

1. Créer le dossier récepteur :
   ```bash
   mkdir -p models
   ```
2. Télécharger les fichiers de modèles :
   - **ALLaM 7B Instruct :** `models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf` (~4.2 Go)
   - **BGE-M3 Embeddings :** `models/bge-m3-q4_k_m.gguf` (~700 Mo)
3. Vérifier les droits d'accès :
   - Linux : `chown dms:dms models/*.gguf && chmod 640 models/*.gguf`
   - Windows : autoriser la lecture au compte de service `NT AUTHORITY\SYSTEM` ou compte dédié.

---

## 8. Lancement, validation et Smoke-Tests

### 1. Contrôle préalable de conformité (Pre-Flight Check) :
```bash
node deploy/scripts/check-env.mjs
```
*Le script vérifie la présence de Node >= 22, la robustesse du secret JWT (refus des clés de test), l'accès aux dossiers de stockage et l'intégrité des modèles IA.*

### 2. Démarrage du service :
- **Ubuntu :** `pm2 start ecosystem.config.cjs && pm2 save`
- **Windows :** `Start-Service DMSBackend`

### 3. Exécution de la suite de validation post-déploiement :
```bash
node deploy/scripts/smoke-test.mjs http://127.0.0.1:5000
```
Pour forcer l'échec en cas de faille de durcissement applicatif :
```bash
node deploy/scripts/smoke-test.mjs http://127.0.0.1:5000 --strict-security
```

---

## 9. Sauvegarde, rétention et procédure de restauration

### A. Sauvegarde quotidienne (Base de données + Documents physiques)
- **Linux :**
  ```bash
  bash deploy/scripts/backup-all.sh /var/backups/dms 14
  ```
  *(Automatisé quotidiennement à 02:00 via `deploy/ubuntu/systemd/dms-backup.timer`)*
- **Windows :**
  ```powershell
  powershell -File .\deploy\backup\backup-mongo.ps1
  ```
  *(À planifier via le Planificateur de tâches Windows à 02:00)*

*Note : La politique de rétention protège formellement la dernière archive valide de toute suppression.*

### B. Procédure de Restauration
1. **Restauration de test (sécurisée, sans écraser la prod) :**
   ```bash
   bash deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_20261111_020000.tar.gz
   ```
2. **Restauration en Production (avec écrasement `--drop` après confirmation textuelle 'OUI') :**
   ```bash
   bash deploy/scripts/restore-all.sh /var/backups/dms/dms_full_backup_20261111_020000.tar.gz --target-prod
   ```

---

## 10. Checklist de recette post-déploiement

Avant d'ouvrir l'accès aux utilisateurs finaux de l'administration, valider les points suivants :
- [ ] **Accès Web :** La page d'accueil charge en HTTPS sur `https://dms.local` ou `https://<IP_SERVEUR>` sans erreur de certificat bloquante.
- [ ] **En-têtes de sécurité :** Vérifier l'absence de l'en-tête `X-Powered-By: Express` via `curl -I https://dms.local/api/health`.
- [ ] **Authentification :** Connexion avec le compte administrateur initial.
- [ ] **Isolation départementale :** Vérifier qu'un utilisateur du Département A ne peut pas lire le courrier du Département B.
- [ ] **Module Courrier :** Téléverser un PDF de courrier entrant (test de la limite 50M) et vérifier que le fichier est stocké sous `backend/courrier/` et consultable.
- [ ] **OCR & Numérisation :** Lancer une reconnaissance OCR sur un document scanné rédigé en arabe/français et vérifier l'indexation.
- [ ] **Module IA :** Poser une question au chat local sur un document indexé et vérifier la réponse de synthèse et la recherche vectorielle BGE-M3.
- [ ] **WebSockets :** Vérifier que les notifications de nouveau courrier s'affichent en temps réel sur une deuxième session ouverte sans rafraîchir la page.

---

## 11. 🚨 À FAIRE AVANT DE METTRE DE VRAIES DONNÉES RH

L'infrastructure de déploiement (Nginx, IIS, PM2, NSSM, scripts de backup) isole et protège le serveur. Cependant, l'audit du code applicatif a révélé plusieurs vulnérabilités applicatives ouvertes qui **doivent impérativement être corrigées dans le code source avant d'importer des dossiers de personnel et des données RH sensibles** :

| Réf. | Composant / Fichier | Description de la faille ouverte | Scénario d'exploitation / Risque RH |
| :--- | :--- | :--- | :--- |
| **SEC-01** | `backend/middleware/auth.js:144` | Contournement du contrôle départemental via `req.originalUrl.startsWith` | En ajoutant un paramètre trompeur tel que `?x=/messages`, la validation de département est sautée, permettant à un agent non habilité d'accéder aux courriers confidentiels RH. |
| **SEC-02** | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` | Absence de middleware d'authentification sur les routes d'historique RH | Les points d'accès GET (`/promotions`, `/postes`, `/diplomes`, `/sanctions`, `/full-history`) sont exposés sans contrôle de rôle ou de jeton JWT. |
| **SEC-03** | `backend/controllers/auth/adminController.js:33` | Endpoint `POST /api/auth/reset-admin` conditionné uniquement par `NODE_ENV` | Si la variable `NODE_ENV=production` n'est pas injectée correctement au runtime, n'importe qui peut réinitialiser le compte administrateur avec les identifiants par défaut. |
| **SEC-10** | `backend/models/User.js:111` & `server.ts:60` | Présence de clés JWT par défaut en clair dans le code | Si `JWT_SECRET` est absent du `.env`, le code retombe sur `'votre_secret_super_securise_123'` ou `'dms_dev_jwt_secret...'`, permettant à un attaquant de forger ses propres jetons d'authentification. |
| **SEC-11** | `backend/controllers/users/managementControllers.js:116` | Mass Assignment sur `POST /users` et `PUT /users/:id` | `User.create(req.body)` permet à un utilisateur malveillant d'injecter directement un rôle `SuperAdmin` lors de la création ou modification de son compte. |
| **BLK-05** | `server.ts:138-143` | Configuration CORS permissive (`origin: true` avec `credentials: true`) | Permet à un site tiers malveillant d'exécuter des requêtes authentifiées via le navigateur d'un agent connecté (CSRF / Exfiltration). |
| **BLK-06** | `server.ts:1-20` | Absence du middleware `helmet` sur le serveur unifié `server.ts` | L'en-tête `X-Powered-By: Express` est exposé et les protections contre le détournement de clics (`X-Frame-Options`) et le reniflage MIME (`nosniff`) ne sont pas appliquées au niveau applicatif. |
| **BLK-11** | `server.ts:157-158` | Photos de personnel servies par `express.static` | Les photos d'identité des agents sont accessibles par URL directe sans validation de session si Nginx ou IIS ne filtre pas les requêtes en amont. |
| **BLK-12** | `server.ts` & `loginController.js` | Absence de limitation de débit (Rate Limiting) sur `/api/auth/login` | Permet les attaques par force brute sur les mots de passe des employés et des administrateurs. |
| **503 DEV** | `server.ts` / `DashboardLayout.tsx` | Risque d'erreur 503 sous `npm run dev` lors des tests de développement | En cas de déconnexion transitoire de MongoDB en dev, l'application peut renvoyer un statut 503 bloquant au lieu d'une gestion d'erreur appropriée. |

---
*Ce guide et les scripts associés ont été rédigés pour assurer une mise en production hermétique, sans modifier une seule ligne du code métier applicatif.*
