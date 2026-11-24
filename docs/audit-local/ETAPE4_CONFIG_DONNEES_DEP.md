# ÉTAPE 4 : CONFIGURATION, DONNÉES, DÉPENDANCES
Date: 2026-11-11

## 1. Variables d'environnement

### .env.example (racine)
- PORT=3000
- NODE_ENV=development
- JWT_SECRET=your_super_secret_64_byte_hex_key_here_generate_with_crypto
- JWT_EXPIRE=30d
- JWT_COOKIE_EXPIRE=30
- MONGODB_URI=mongodb://localhost:27017/document-management

### backend/.env.example
- PORT=5000
- NODE_ENV=development
- MONGODB_URI=mongodb://localhost:27017/document-management
- JWT_SECRET=your_super_secret_key_here_change_in_production
- JWT_EXPIRE=30d
- JWT_COOKIE_EXPIRE=30
- LLAMA_CHAT_MODEL_PATH=/home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
- LLAMA_EMBEDDING_MODEL_PATH=/home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf
- LLAMA_THREADS=4
- LLAMA_GPU_LAYERS=0
- LOG_LEVEL=info
- DOCUMENT_PATH=./courrier
- ENABLE_RAG_RETRY_CRON=true
- SCANNER_ENABLED=false
- SCANNER_DEVICE_ID=
- SCANNER_RESOLUTION=300
- SCANNER_FORMAT=pdf

### e2e-tests/.env.example
- BASE_URL=http://localhost:5173
- API_URL=http://localhost:3000
- Identifiants de test préconfigurés (ADMIN_USER, DIRECTOR_USER, etc.)

### Constat
- Aucun .env réel présent (seulement .env.example) - OK
- backend/.env prime sur .env racine (dotenv.config avec path backend/.env en premier)
- JWT_SECRET par défaut dangereuse : 'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026' (server.ts:60, backend/server.js:34)
- backend/models/User.js:111 contient 'votre_secret_super_securise_123' comme fallback

## 2. Dossiers de données

| Dossier | Chemin relatif | Taille | Fichiers | Propriétaire/Droits |
|---------|---------------|--------|----------|---------------------|
| courrier | backend/courrier | 53M | 58 | drwxrwxr-x med:med |
| uploads | backend/uploads | 54M | 67 | drwxrwxr-x med:med |
| models | backend/models | 128K | 27 fichiers JS | drwxrwxr-x med:med |
| photos | - | ABSENT | - | - |
| temp | - | ABSENT | - | - |
| backups | - | ABSENT | - | - |

**Note :** backend/models contient des fichiers Mongoose (*.js), pas les modèles IA GGUF

## 3. Dépendances système

| Commande | Version | État | Commande apt si manquant |
|----------|---------|------|--------------------------|
| tesseract | 5.0 + ara, fra, eng, osd | ✅ PRÉSENT | tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra |
| pdftoppm | 24.02.0 | ✅ PRÉSENT | poppler-utils |
| img2pdf | 0.5.1 | ✅ PRÉSENT | img2pdf |
| convert (ImageMagick) | 6.9.12-98 | ✅ PRÉSENT | imagemagick |
| cmake | 3.28.3 | ✅ PRÉSENT | cmake |
| g++ | 13.3.0 | ✅ PRÉSENT | build-essential |
| scanimage | PRÉSENT | ✅ PRÉSENT (0 scanner détecté) | sane-utils |
| pm2 | 6.0.5 | ✅ PRÉSENT | npm install -g pm2 |
| nginx | 1.24.0 | ✅ PRÉSENT | nginx |
| ufw | 0.36.2 | ✅ PRÉSENT | ufw |

**Constat :** Toutes les dépendances système requises sont présentes.

## 4. Module IA

### Fichiers .gguf présents
- models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf : 4.0 GB
- models/bge-m3-q4_k_m.gguf : 418 MB

### Chemins résolus
- Chat : /home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
- Embedding : /home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf

### Temps de chargement (Mode A, npm run dev)
- Warm-up déclenché après 5 secondes
- Modèles chargés en mémoire (temps non mesuré précisément, logs indiquent chargement réussi)
- [NON EXÉCUTÉ] Test de temps du premier token et total pour 3 questions (nécessite serveur actif)

## 5. MongoDB

### Version
- v6.0.24

### Authentification
- bindIp : 127.0.0.1 (écoute locale uniquement)
- Authentification : [NON VÉRIFIÉ] (configuration par défaut sans auth activée)

### Index et doublons
- Avertissement Mongoose : Duplicate schema index on {"cin":1}
- Base de test dms_audit_test : 1 collection (users), 1 index

### Taille de la base de test
- dataSize : 298 bytes
- storageSize : 20480 bytes
- totalSize : 40960 bytes

## 6. Sauvegarde existante

### Scripts de sauvegarde
- deploy/scripts/backup-all.sh : Sauvegarde intégrale (MongoDB + fichiers + manifeste IA)
- deploy/scripts/backup-mongo.sh : Sauvegarde MongoDB uniquement
- deploy/scripts/restore-all.sh : Restauration sécurisée avec confirmation

### Contenu
- backup-all.sh : Dump MongoDB (gzip), courrier/, uploads/, manifeste IA (SHA256)
- Rétention : 14 jours par défaut, protection de la dernière archive
- restore-all.sh : Restauration vers base test par défaut, --target-prod pour production

### Planification réelle
- Scheduler dans backend/services/backupScheduler.js
- [NON VÉRIFIÉ] : Activation effective et planification cron

## 7. Scripts de déploiement Ubuntu

### Lecture seule (shellcheck non disponible)
- deploy/ubuntu/deploy.sh : Script de déploiement principal
- deploy/ubuntu/setup-system.sh : Initialisation système Ubuntu
- deploy/ubuntu/install-mongodb.sh : Installation et sécurisation MongoDB
- deploy/ubuntu/rollback.sh : Rollback automatique en cas d'échec

### Analyse rapide
- setup-system.sh : Installe Node.js 22, PM2, Nginx, UFW, tesseract, sane-utils
- install-mongodb.sh : Configure bindIp 127.0.0.1, active authentification
- deploy.sh : npm ci, npm run build, pm2 reload, smoke-test, rollback automatique
- [SANS ERREUR SYNTAXIQUE ÉVIDENTE] (shellcheck non disponible pour vérification approfondie)
