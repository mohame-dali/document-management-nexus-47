# ÉTAPE 1 : CE QUI TOURNE RÉELLEMENT
Date: 2026-11-11

## 1. Scripts package.json

### Racine (package.json)
- "dev": "tsx server.ts" → Lance server.ts via tsx
- "start": "node server.ts" → Ne fonctionnera PAS (TypeScript non compilé)
- "dev:backend": "cd backend && npm run dev" → Lance backend/server.js
- type: "module"
- engines: non spécifié

### Backend (backend/package.json)
- "start": "node server.js" → Lance backend/server.js
- "dev": "nodemon server.js" → Développement backend

### Serveur qui fonctionne
- server.ts (tsx) : Serveur unifié avec Vite middleware (dev) ou static (prod)
- backend/server.js : Serveur backend uniquement (port 5000 par défaut)

## 2. Éléments AI Studio à écarter

| Élément | Présence | Fichier |
|---------|----------|---------|
| cdn.gpteng.co | OUI | index.html:24 |
| GEMINI_API_KEY | NON | - |
| metadata.json | NON | - |
| JWT_SECRET en dur | OUI | server.ts:60, backend/server.js:34, backend/controllers/auth/loginController.js:23 |
| Vite en middleware | OUI | server.ts:354-359 |
| Mode dégradé 503 | OUI | server.ts:255-304 |
| mockDb jamais chargé | OUI | Aucune import trouvée |
| mockRouter jamais chargé | OUI | Aucune import trouvée |

**JWT_SECRET en dur :** 'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026'

## 3. Fichiers jamais importés / doublons

### Fichiers .bak (8 fichiers)
- backups/i18n_phase3/components/ai/FloatingAIChat.tsx.bak
- backups/i18n_phase3/components/layouts/DashboardLayout.tsx.bak
- package.json.bak
- src/components/ai/FloatingAIChat.tsx.bak
- src/components/layouts/DashboardLayout.tsx.bak
- src/i18n/locales/ar.json.bak
- src/i18n/locales/fr.json.bak
- src/pages/UsersPage.tsx.bak
- src/pages/documents/IncomingDocumentsPage.tsx.bak

### Fichiers .OLD (2 fichiers)
- backend/mockDb.js.OLD
- backend/mockRouter.js.OLD

### Docker
- Dockerfile.frontend : Build frontend avec Nginx (port 80)
- Dockerfile.backend : Lance "node server.js" (ancien serveur)
- docker-compose.yml : backend:5000, frontend:80, mongo:27017

## 4. Recommandation serveur de référence

**Serveur de référence pour production : server.ts via tsx**

**Preuve :**
- server.ts est le serveur unifié (backend + frontend intégré via Vite middleware)
- backend/server.js est l'ancien serveur (backend uniquement, port 5000)
- Dockerfile.backend lance "node server.js" → obsolète
- npm run start racine utilise "node server.ts" → incorrect (doit utiliser tsx)

**Commande correcte :**
- Développement : npm run dev (tsx server.ts)
- Production : NODE_ENV=production tsx server.ts
