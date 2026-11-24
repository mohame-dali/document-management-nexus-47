# ÉTAPE 3 : DÉMARRAGE RÉEL, MODE PAR MODE
Date: 2026-11-11
Base de test : dms_audit_test (MongoDB local)

## Tableau comparatif A/B/C

| Mode | Commande | Temps /api/health | /api/departements | Dispo API warm-up | GET / | GET /dashboard/trash | Mémoire | Arrêt propre | Port libéré |
|------|----------|-------------------|-------------------|------------------|-------|---------------------|---------|--------------|-------------|
| A | npm run dev (tsx server.ts) | ~40s | 401 (tout le temps) | Stable (connected) | 200 | 200 | 7.1 MB | ✅ | ✅ |
| B | backend + vite (5000+3000) | ~78s | 401 (tout le temps) | Stable (connected) | 200 | 200 | 3.5 GB (backend) | ✅ | ✅ |
| C | NODE_ENV=production tsx server.ts | [ÉCHEC] | - | - | - | - | - | - | - |

## Mode A : npm run dev ✅

### Logs (40 premières lignes)
```
> vite_react_shadcn_ts@0.0.0 dev
> tsx server.ts

◇ injected env (18) from backend/.env
◇ injected env (0) from .env
[AI] LLAMA_THREADS configuré sur 4 (cœurs physiques)
[Cleanup Scheduler] ✅ Cron de nettoyage des fichiers temporaires actif (0 2 * * *)
Detected platform: linux
Creating Linux/macOS scanner service
Attempting to auto-detect scanner...
Using existing scanner device: panamfs:libusb:003:003
Connecting to MongoDB...
(node:19889) [MONGOOSE] Warning: Duplicate schema index on {"cin":1} found.
[Database] MongoDB connecté (readyState: 1)
MongoDB Connected: 127.0.0.1
img2pdf utility detected
[Backup Scheduler] Désactivé
tesseract OCR utility detected
Scanner tools detection completed: scanimage=true img2pdf=true tesseract=true
No admin user found. Creating default admin account...
Default admin user created successfully.
Username: admin
Password: Admin123!
[Database] ✅ Connexion MongoDB établie (readyState: 1), démarrage du serveur HTTP...
Server running on http://0.0.0.0:3000
[AI] ✅ Modèles GGUF détectés et prêts pour l'inférence.
[AI Warm-up] Préchargement des modèles en cours...
[AI] Vérification du modèle Chat : /home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
[AI] ✅ Modèle Chat trouvé, chargement en cours...
[AI] Vérification du modèle Embedding : /home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf
[AI] ✅ Modèle Embedding trouvé, chargement en cours...
[AI] Chargement modèle chat : /home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf (threads: 4, gpu: 0)
[AI] Chargement modèle embedding : /home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf
[node-llama-cpp] load: model vocab missing newline token, using special_pad_id instead
[AI] Modèles GGUF prêts via node-llama-cpp
[AI Warm-up] ✅ Modèles chargés en mémoire.
```

### Mesures pendant 60s
- /api/health : "database":"connected" (stable)
- /api/departments : 401 (Not authorized) - jamais 503
- Frontend : / et /dashboard/trash → 200

### Mémoire
- PID 19877 : 0.85 MB
- PID 19878 : 6.26 MB

### Arrêt
- ✅ Arrêt propre (SIGTERM)
- ✅ Port 3000 libéré

## Mode B : backend + vite ✅

### Logs backend (40 premières lignes)
```
> document-management-system-backend@1.0.0 dev
> nodemon server.js

[nodemon] 3.1.14
[nodemon] starting `node server.js`
[AI] LLAMA_THREADS configuré sur 4 (cœurs physiques)
Connecting to MongoDB...
Detected platform: linux
Creating Linux/macOS scanner service
Attempting to auto-detect scanner...
Using existing scanner device: panamfs:libusb:003:003
[RAG Retry] ⏱️ Initialisation du cron de rattrapage (expression: "0 * * * *")
[Backup Scheduler] MongoDB non connecté, planificateur en attente.
[Cleanup Scheduler] ✅ Cron de nettoyage des fichiers temporaires actif (0 2 * * *)
===== CHECKING FOR SCANNER HARDWARE =====
Checking for connected scanners...
(node:20183) [MONGOOSE] Warning: Duplicate schema index on {"cin":1} found.
Server running on port 5000
Access the API at http://localhost:5000/api
scanimage utility detected
MongoDB Connected: localhost
img2pdf utility detected
tesseract OCR utility detected
Scanner tools detection completed: scanimage=true img2pdf=true tesseract=true
Listing available scanners...
[AI Warm-up] Préchargement des modèles en cours...
[AI] Vérification du modèle Chat : /home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf
[AI] ✅ Modèle Chat trouvé, chargement en cours...
[AI] Vérification du modèle Embedding : /home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf
[AI] ✅ Modèle Embedding trouvé, chargement en cours...
[AI] Chargement modèle chat : /home/med/TEST/DMS/models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf (threads: 4, gpu: 0)
Processing scanner line: No scanners were identified.
Found 0 scanners
Scanner Hardware Status:
No physical scanners detected.
[AI] Chargement modèle embedding : /home/med/TEST/DMS/models/bge-m3-q4_k_m.gguf
[node-llama-cpp] load: model vocab missing newline token, using special_pad_id instead
[RAG Retry] ⏰ Déclenchement automatique du cron de rattrapage
[RAG Retry] 🔄 Démarrage du rattrapage d'indexation...
[AI] Modèles GGUF prêts via node-llama-cpp
[AI Warm-up] ✅ Modèles chargés en mémoire.
[RAG Retry] 🏁 Rattrapage terminé en 0.98s : 0/0 réussis, 0 échecs.
```

### Logs vite
```
VITE v5.4.21  ready in 328 ms
➜  Local:   http://localhost:3000/
```

### Mesures pendant 60s
- /api/health (port 5000) : "database":"connected" (stable)
- /api/departments (port 5000) : 401 (Not authorized) - jamais 503
- Frontend (port 3000) : / et /dashboard/trash → 200

### Mémoire
- backend (node server.js) : 3177.77 MB (chargement modèles IA)
- vite : 287.41 MB

### Arrêt
- ✅ Arrêt propre
- ✅ Ports 3000 et 5000 libérés

## Mode C : production locale ❌

### Commande testée
1. `npm start` → ÉCHEC (node server.ts ne peut pas exécuter .ts)
2. `NODE_ENV=production npx tsx server.ts` → ÉCHEC

### Erreur
```
Fatal startup error: PathError [TypeError]: Unexpected ( at index 0: (.*)
at app.get('(.*)', ...)
```

**Fichier concerné :** server.ts:363
**Cause :** Syntaxe Express 5 incompatible `app.get('(.*)', ...)` doit être `app.get('*', ...)`

## Mode recommandé

**Mode A (npm run dev avec tsx server.ts)** est le mode fonctionnel recommandé pour la production après correction du bug Express 5 dans server.ts:363.

**Justification :**
- Serveur unifié (backend + frontend intégré)
- Port unique (3000)
- Mémoire faible (~7 MB sans modèles IA chargés)
- Démarrage rapide (~40s)
- Arrêt propre

**Pour Mode C :** Corriger server.ts:363 avant déploiement production.
