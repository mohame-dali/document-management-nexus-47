# VÉRIFICATION FACTUELLE DES CORRECTIONS — `/app/applet`

## 1. Contexte système et sauvegardes

- **`pwd` :** `/app/applet`
- **Dates de modification (`stat`) :**
  - `server.ts` : `2026-11-15 18:01:25.301555159 +0000`
  - `backend/config/db.js` : `2026-11-15 18:01:25.243483147 +0000`
  - `backend/middleware/auth.js` : `2026-11-15 18:01:24.799353864 +0000`
- **Dossiers de sauvegarde :**
  - `_sauvegarde_securite/` : contient uniquement `S2b/` (`DocumentPreview.tsx`, `PDFViewer.tsx`, `documentService.ts`, `sockets-index.js`, datés `Nov 15 18:30`).
  - `_sauvegarde_ux/` : absent (`ls: cannot access '_sauvegarde_ux/': No such file or directory`).

---

## 2. Existence et en-têtes (`ls -l` + 5 premières lignes)

### Fichiers attendus absents
- `backend/scripts/create-superadmin.js` : absent (`No such file or directory`)
- `backend/config/jwt.js` : absent (`No such file or directory`)
- `src/components/ui/empty-state.tsx` : absent (`No such file or directory`)

### Fichiers présents vérifiés
- `server.ts` (`-rw-r--r-- 1 root root 12140 Nov 15 18:01`) :
  ```ts
  import express from 'express';
  import path from 'path';
  import fs from 'fs';
  import { createServer } from 'http';
  import { Server as SocketIOServer } from 'socket.io';
  ```
- `backend/config/db.js` (`-rw-r--r-- 1 root root 2277 Nov 15 18:01`) :
  ```js

  const mongoose = require('mongoose');
  mongoose.set('bufferCommands', false);
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');
  ```
- `backend/middleware/auth.js` (`-rw-r--r-- 1 root root 7021 Nov 15 18:01`) :
  ```js

  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const ErrorResponse = require('../utils/errorResponse');
  const OrganizationSettings = require('../models/OrganizationSettings');
  ```
- `backend/controllers/auth/loginController.js` (`-rw-r--r-- 1 root root 1554 Nov 15 18:01`) :
  ```js
  const User = require('../../models/User');
  const ErrorResponse = require('../../utils/errorResponse');
  const { sendTokenResponse } = require('./utils');

  // @desc    Login user
  ```
- `backend/controllers/auth/utils.js` (`-rw-r--r-- 1 root root 976 Nov 15 18:01`) :
  ```js

  // Helper function to get token from model, create cookie and send response
  exports.sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();
  ```
- `backend/models/User.js` (`-rw-r--r-- 1 root root 3208 Nov 15 18:01`) :
  ```js

  const mongoose = require('mongoose');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  ```
- `backend/sockets/index.js` (`-rw-r--r-- 1 root root 2602 Nov 15 18:31`) :
  ```js

  const jwt = require('jsonwebtoken');

  module.exports = (io) => {
    // Store user socket connections
  ```
- `src/services/documentService.ts` (`-rw-r--r-- 1 root root 17047 Nov 15 18:31`) :
  ```ts
  import axios from 'axios';
  import { IncomingDocument, OutgoingDocument } from '@/types';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  ```
- `src/components/documents/PDFViewer.tsx` (`-rw-r--r-- 1 root root 6772 Nov 15 18:31`) :
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import axios from 'axios';
  import { Card, CardContent } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { Download, ExternalLink, FileText, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
  ```
- `src/components/documents/DocumentPreview.tsx` (`-rw-r--r-- 1 root root 13115 Nov 15 18:31`) :
  ```tsx
  import React, { useState, useEffect, useCallback } from 'react';
  import axios from 'axios';
  import { IncomingDocument, OutgoingDocument } from '@/types';
  import { FileInput, AlertCircle, Calendar, Building, User, FileText, Hash, Mail, MapPin, Loader2, RefreshCw } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  ```
- `index.html` (`-rw-r--r-- 1 root root 1343 Nov 15 18:01`) :
  ```html

  <!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
  ```
- `src/main.tsx` (`-rw-r--r-- 1 root root 181 Nov 15 18:01`) :
  ```tsx
  import { createRoot } from 'react-dom/client'
  import './i18n/config'
  import App from './App.tsx'
  import './index.css'
  ```
- `src/pages/LoginPage.tsx` (`-rw-r--r-- 1 root root 10780 Nov 15 18:01`) :
  ```tsx

  import React, { useState, useEffect } from 'react';
  import { useForm } from 'react-hook-form';
  import { useAuth } from '../contexts/AuthContext';
  import { useLanguage } from '../contexts/LanguageProvider';
  ```
- `src/components/navigation/Sidebar.tsx` (`-rw-r--r-- 1 root root 14571 Nov 15 18:01`) :
  ```tsx
  import React from 'react';
  import { useQuery } from '@tanstack/react-query';
  import { useAuth } from '@/contexts/AuthContext';
  import { useSidebar } from '@/contexts/SidebarContext';
  import { useNavigate, useLocation } from 'react-router-dom';
  ```

---

## 3. Vérification détaillée par lot

### LOT S1 (compte par défaut, porte dérobée)
- **S1.1 — `NON APPLIQUÉ`** : `DEFAULT_ADMIN` et `createDefaultAdmin` sont toujours présents dans `backend/config/db.js:8-45,66` (`const DEFAULT_ADMIN = { username: 'admin', ... }`, `const createDefaultAdmin = async () => ...`, `await createDefaultAdmin();`).
- **S1.2 — `APPLIQUÉ`** : `grep` sur `server.ts` et `backend/` ne trouve aucune occurrence de `getMockAdmin`, `MOCK_ADMIN_ID`, ni `65f000000000000000000001` dans `backend/controllers/auth/loginController.js` ni `backend/middleware/auth.js`.
- **S1.3 — `PARTIEL`** : `backend/controllers/auth/loginController.js:8-50` ne teste pas `readyState !== 1`. Toutefois, un middleware global `/api` dans `server.ts:150-158` (`if (mongoose.connection.readyState === 1) return next(); return res.status(503)...`) et dans `backend/server.js:183-191` (`if (mongoose.connection.readyState !== 1) return res.status(503)...`) bloque `/api/auth/login` en 503 lorsque la base est hors ligne.
- **S1.4 — `NON APPLIQUÉ`** : `backend/middleware/auth.js:8-67` ne vérifie pas `mongoose.connection.readyState` (les routes non-`/api` comme `/courrier` et `/uploads` montées à `server.ts:127,134` contournent le middleware 503 de `server.ts:150`). De plus, `auth.js:45-47` renvoie `404` (`User not found`) et `auth.js:49-51` renvoie `403` (`Your account has been deactivated`), et non `401`.
- **S1.5 — `NON APPLIQUÉ`** : Ni `backend/config/db.js:67-69` (`console.warn(...)`) ni `server.ts:36-38` (`connectDB().catch(...)`) n'appellent `process.exit(1)` en production si MongoDB est injoignable.
- **S1.6 — `NON APPLIQUÉ`** : `backend/scripts/create-superadmin.js` n'existe pas (`ls` en erreur).

### LOT S2 (JWT)
- **S2.1 — `NON APPLIQUÉ`** : `backend/config/jwt.js` n'existe pas (`ls` en erreur) ; aucune fonction `validateJwtConfig` ni `getJwtSecret` dans le dépôt.
- **S2.2 — `NON APPLIQUÉ`** : Un secret de repli en clair est présent en développement dans `server.ts:28-30` (`process.env.JWT_SECRET = '<REDACTED_DEV_FALLBACK>'`) ainsi que dans `backend/server.js:22-24`. Absents de `backend/models/User.js:108-112` et `backend/controllers/auth/loginController.js`.
- **S2.3 — `NON APPLIQUÉ`** : `server.ts:22-31` refuse l'absence de `JWT_SECRET` uniquement si `NODE_ENV === 'production'`, injecte un secret de repli sinon, et ne vérifie jamais la longueur minimale (`< 32`). En test réel avec un secret de 25 caractères (`NODE_ENV=production` et dev), le serveur démarre sans refus (`timeout` exit `124`).
- **S2.4 — `NON APPLIQUÉ`** : `30d` est encore présent dans `server.ts:32` (`process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';`), `backend/.env.example:5` (`JWT_EXPIRE=30d`) et `backend/.env:4` (`JWT_EXPIRE=30d`).
- **S2.5 — `PARTIEL`** : `backend/controllers/auth/utils.js:9-19` définit `httpOnly: true` (ligne 13) et `options.secure = true` si `NODE_ENV === 'production'` (lignes 17-19), mais **aucun attribut `sameSite`** n'est défini (et `cookieExpire` vaut `30` jours par défaut ligne 8).
- **S2.6 — `PARTIEL`** : `"token="` est absent de `src/` (`grep -rn "token=" src/` -> 0 résultat), mais `req.query.token` est toujours accepté dans `backend/middleware/auth.js:23-25` (`else if (req.query && req.query.token) { token = req.query.token; }`).

### LOT S2b
- **S2b.1 — `APPLIQUÉ`** :
  - `src/services/documentService.ts:481-502` : plus aucun `?token=` ajouté par `getDocumentUrl`.
  - `src/components/documents/PDFViewer.tsx:40-78,133-146,166-187` : chargement via `api.get(..., { responseType: 'blob' })` (`Authorization: Bearer` via `src/services/apiService.ts:14-19`), `URL.createObjectURL`, `URL.revokeObjectURL` au cleanup, états chargement/erreur et bouton `Réessayer`.
  - `src/components/documents/DocumentPreview.tsx:50-89,284-308` : chargement via `api.get(..., { responseType: 'blob' })`, `URL.createObjectURL`, `URL.revokeObjectURL` au cleanup, états chargement/erreur et bouton `Réessayer`.
- **S2b.2 — `APPLIQUÉ`** : `backend/sockets/index.js:11` lit uniquement `socket.handshake.auth?.token` (pas de `query?.token`) et `backend/sockets/index.js:19-23` lit `process.env.JWT_SECRET` sans secret de repli (déconnexion + erreur si absent).

### LOT UX / POLICES
- **U.1 — `NON APPLIQUÉ`** : `index.html:12-14` charge `fonts.googleapis.com` (`Cairo`) et `index.html:24` contient `<script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>`. `src/main.tsx:1-6` n'importe ni `@fontsource-variable/cairo` ni `@fontsource-variable/inter` (absents de `package.json`).
- **U.2 — `CONSTATÉ`** : `grep -rn 'dir="rtl"' src/ | wc -l` = **272** occurrences.
- **U.3 — `NON APPLIQUÉ`** : `src/pages/LoginPage.tsx:246-251` affiche toujours les identifiants par défaut (`admin / Admin123!`).
- **U.4 — `NON APPLIQUÉ`** : `window.confirm` présent dans `src/pages/documents/DocumentOptionsPage.tsx:137` et `src/pages/settings/BackupSettingsPage.tsx:163`. `use-toast` importé dans les pages `src/pages/settings/BackupSettingsPage.tsx:24` et `src/pages/messages/MessagesPage.tsx:19`.
- **U.5 — `NON APPLIQUÉ`** : `src/components/ui/empty-state.tsx` n'existe pas.
- **U.6 — `NON APPLIQUÉ`** : `src/components/navigation/Sidebar.tsx:263,267` contient des `console.log(...)` et les lignes `236, 251, 321` appliquent `isRTL ? "flex-row-reverse" : "flex-row"` sur un document déjà `dir="rtl"` (`index.html:3`).

---

## 4. Sorties réelles des commandes exécutées

- **`npx tsc --noEmit`** : `TSC_EXIT:0` (0 erreur).
- **`npm run lint`** (`eslint .`) : `LINT_EXIT:1` — **23 problèmes (11 erreurs, 12 warnings)** :
  - 11 erreurs `@typescript-eslint/no-explicit-any` : `EditOutgoingDocumentForm.tsx` (4), `OutgoingDocumentForm.tsx` (5), `exportCsv.ts` (2).
  - 12 warnings : `react-refresh/only-export-components` (11), `react-hooks/exhaustive-deps` dans `AttachmentPreviewModal.tsx:133` (1).
- **`npm run build`** (`vite build`) : `BUILD_EXIT:0` (`✓ 3619 modules transformed.`, `✓ built in 23.54s`).
- **`node --check` sur les `.js` inspectés / modifiés :**
  - `node --check backend/sockets/index.js` → exit `0` (`sockets/index.js OK`)
  - `node --check backend/config/db.js` → exit `0` (`db.js OK`)
  - `node --check backend/middleware/auth.js` → exit `0` (`auth.js OK`)
  - `node --check backend/controllers/auth/loginController.js` → exit `0` (`loginController.js OK`)
  - `node --check backend/controllers/auth/utils.js` → exit `0` (`utils.js OK`)
  - `node --check backend/models/User.js` → exit `0` (`User.js OK`)
- **Démarrage de `server.ts` :**
  - `JWT_SECRET="" timeout 4s npx tsx server.ts --port=3099` (sans `NODE_ENV=production`) → affiche `⚠️ AVERTISSEMENT: JWT_SECRET absent du .env — utilisation d'une clé sécurisée pour le développement.` et poursuit le démarrage jusqu'au `timeout` (**exit `124`**).
  - `JWT_SECRET="" NODE_ENV=production timeout 4s npx tsx server.ts --port=3099` → affiche `🔴 FATAL: JWT_SECRET absent du .env` et quitte immédiatement (**exit `1`**).
  - `JWT_SECRET="abcdefghijklmnopqrstuvwxy" timeout 4s npx tsx server.ts --port=3099` (25 caractères, dev) → démarre sans erreur jusqu'au `timeout` (**exit `124`**).
  - `JWT_SECRET="abcdefghijklmnopqrstuvwxy" NODE_ENV=production timeout 4s npx tsx server.ts --port=3099` (25 caractères, prod) → démarre sans erreur jusqu'au `timeout` (**exit `124`**).

---

## 5. Tableau récapitulatif

| ID | Critère | Statut | Preuve `fichier:ligne` | Contradiction ? |
|---|---|---|---|---|
| S1.1 | `DEFAULT_ADMIN`, `createDefaultAdmin` absents de `db.js` | NON APPLIQUÉ | `backend/config/db.js:8-45,66` | Non (conforme à `AUDIT_PRO_DMS.md:46`) |
| S1.2 | `getMockAdmin`, `MOCK_ADMIN_ID`, `65f000...` absents de `loginController.js`, `auth.js` | APPLIQUÉ | `grep` vide dans `server.ts`, `backend/` | Non |
| S1.3 | `login` : 503 si `readyState !== 1` (pas de jeton) | PARTIEL | Absent de `loginController.js:8-50` ; couvert par `/api` middleware `server.ts:150-158` et `backend/server.js:183-191` | Non |
| S1.4 | `auth.js` `protect` : 503 si base hors ligne, 401 si absent/inactif | NON APPLIQUÉ | `backend/middleware/auth.js:8-67` (pas de `readyState` ; renvoie `404` ligne 46 et `403` ligne 50) | Non |
| S1.5 | `db.js` et `server.ts` : `process.exit(1)` en prod si MongoDB injoignable | NON APPLIQUÉ | `backend/config/db.js:67-69`, `server.ts:36-38` (`console.warn` uniquement) | Non |
| S1.6 | `backend/scripts/create-superadmin.js` existe, mdp >= 12, refus si Admin existe | NON APPLIQUÉ | Fichier absent (`ls` en erreur) | Non |
| S2.1 | `backend/config/jwt.js` existe ; `validateJwtConfig`, `getJwtSecret` | NON APPLIQUÉ | Fichier absent (`ls` en erreur) | **CONTRADICTION** (hypothèse du prompt S2b #3 vs code réel ; déjà signalé dans le CR S2b) |
| S2.2 | Aucun secret de repli (`server.ts`, `User.js`, `loginController.js`) | NON APPLIQUÉ | `server.ts:28-30` (repli dev présent) ; `User.js:108-112` et `loginController.js` OK | Non |
| S2.3 | `server.ts` appelle la validation (refus si absent ou `< 32`) | NON APPLIQUÉ | `server.ts:22-31` (refus uniquement si absent + `NODE_ENV=production` ; 25 chars acceptés : exit `124`) | **CONTRADICTION** (hypothèse du prompt S2b #4 `require('./backend/config/jwt')` vs code réel) |
| S2.4 | Durée par défaut `8h` partout (`grep "30d"` vide) | NON APPLIQUÉ | `server.ts:32`, `backend/.env.example:5`, `backend/.env:4` (`30d`) | Non (conforme à `AUDIT_PRO_DMS.md:42`) |
| S2.5 | Cookie `httpOnly`, `sameSite`, `secure` en production (`utils.js`) | PARTIEL | `backend/controllers/auth/utils.js:13,17-19` (`httpOnly` et `secure` présents, `sameSite` absent) | Non |
| S2.6 | `req.query.token` absent de `auth.js` ; `"token="` absent de `src/` | PARTIEL | `src/` OK (`grep` vide) ; `backend/middleware/auth.js:23-25` conserve `req.query.token` | Non |
| S2b.1 | `PDFViewer.tsx` et `DocumentPreview.tsx` chargent en blob avec `Authorization` | APPLIQUÉ | `PDFViewer.tsx:40-78,166-187`, `DocumentPreview.tsx:50-89,284-308`, `documentService.ts:481-502` | Non |
| S2b.2 | `backend/sockets/index.js` : pas de `query?.token`, pas de secret de repli | APPLIQUÉ | `backend/sockets/index.js:11,19-23` | Non |
| U.1 | `index.html` sans `gpteng` ni `googleapis` ; `main.tsx` importe `@fontsource-variable/*` | NON APPLIQUÉ | `index.html:12-14,24`, `src/main.tsx:1-6` | Non (conforme à `AUDIT_PRO_DMS.md:38`) |
| U.2 | `grep dir="rtl"` dans `src/` | CONSTATÉ | **272** occurrences dans `src/` | Non |
| U.3 | `LoginPage.tsx` sans identifiants par défaut affichés | NON APPLIQUÉ | `src/pages/LoginPage.tsx:246-251` | Non |
| U.4 | `window.confirm` absent de `src/` ; `use-toast` absent des pages | NON APPLIQUÉ | `DocumentOptionsPage.tsx:137`, `BackupSettingsPage.tsx:24,163`, `MessagesPage.tsx:19` | Non |
| U.5 | `EmptyState` existe (`src/components/ui/empty-state.tsx`) | NON APPLIQUÉ | Fichier absent (`ls` en erreur) | **CONTRADICTION** (hypothèse du prompt S2b #1 sur `EmptyState` vs code réel) |
| U.6 | `Sidebar.tsx` : pas de `console.log`, pas de double inversion `isRTL` | NON APPLIQUÉ | `src/components/navigation/Sidebar.tsx:236,251,263,267,321` | Non |

---

## 6. Liste des CONTRADICTIONS

1. **`S2.1` — `backend/config/jwt.js` (`getJwtSecret` / `validateJwtConfig`) :**
   - *Référence antérieure :* Le prompt S2b (« utiliser `getJwtSecret()` de `config/jwt.js` ») supposait ce module présent dans le dépôt.
   - *Code réel vérifié :* `backend/config/jwt.js` est **inexistant** (`backend/config/` contient uniquement `db.js`, `retention-policy.json`, `swagger.js`). Ce constat correspond déjà à ce que rapportait le compte rendu S2b précédent.
2. **`S2.3` — `require('./backend/config/jwt')` dans `server.ts` :**
   - *Référence antérieure :* Le prompt S2b (« Vérifie aussi : `require('./backend/config/jwt')` dans `server.ts` ») supposait cet appel présent.
   - *Code réel vérifié :* `server.ts` ne contient aucun `require('./backend/config/jwt')`, utilise un fallback dev en clair lignes `28-30` et n'applique aucune validation de longueur `>= 32`. Ce constat correspond également au compte rendu S2b précédent.
3. **`U.5` — `src/components/ui/empty-state.tsx` (`EmptyState`) :**
   - *Référence antérieure :* Le prompt S2b mentionnait `(EmptyState, "Réessayer")`.
   - *Code réel vérifié :* Aucun composant `EmptyState` n'existe dans `src/` (`find src -iname "*empty*"` vide). Ce constat correspond également au compte rendu S2b précédent.
4. **Absence globale des lots S1 (hors S1.2), S2 et UX dans `/app/applet` vs intitulés antérieurs de l'historique :**
   - *Référence antérieure :* Les demandes antérieures de l'historique mentionnaient « le système est certifié 100/100 » / « derniers détails cross-platform (10/10) », et des lots S1/S2/UX attendus comme appliqués.
   - *Code réel vérifié :* Les fichiers `server.ts`, `backend/config/db.js`, `backend/middleware/auth.js`, `backend/controllers/auth/utils.js`, `index.html`, `src/main.tsx`, `src/pages/LoginPage.tsx` et `src/components/navigation/Sidebar.tsx` portent tous la date `2026-11-15 18:01` et ne contiennent aucune des corrections S1.1, S1.4, S1.5, S1.6, S2.1, S2.2, S2.3, S2.4, U.1, U.3, U.4, U.5, U.6. Seul le lot S2b (`18:30-18:31`) est appliqué dans `/app/applet`.

COPIE CLOUD (/app/applet) : à confirmer par le propriétaire dans D:\DMS\DMS
