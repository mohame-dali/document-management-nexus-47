# RAPPORT D'AUDIT TECHNIQUE : APTE AU DÉPLOIEMENT ? (DMS)
**Statut : EN COURS D'AUDIT (PARTIE 1/4 - BLOQUANTS SÉCURITÉ)**  
**Auditeur : Ingénieur DevOps & Auditeur Senior en Sécurité des SI**  
**Contexte : Déploiement sur serveur LOCAL d'une administration publique — Données RH sensibles**  
**Règle d'audit : READ-ONLY (Aucune modification du code applicatif)**  

---

## 1. BLOQUANTS SÉCURITÉ (ANALYSE CODE SOURCE & PREUVES)

| ID | Point audité | Statut | Gravité | Effort | Preuve (Fichier:Ligne) |
|---|---|---|---|---|---|
| **SEC-01** | `authorize()` contournable par l'URL (`req.originalUrl.includes`) | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/middleware/auth.js:73-81` [CONSTATÉ] |
| **SEC-02** | `rhPersonnelHistoryController` sans contrôle d'accès | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` [CONSTATÉ] |
| **SEC-03** | `reset-admin` et sa condition (`NODE_ENV`) | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/controllers/auth/adminController.js:33-37,61-66` [CONSTATÉ] |
| **SEC-04** | `scanExecutor` (Injection shell via `exec`) | **CONFIRMÉ** | **CRITIQUE** | **M** | `backend/utils/scanner/linux/scanExecutor.js:75-89,134-157` [CONSTATÉ] |
| **SEC-05** | Photos et uploads servis par `express.static` sans session | **CONFIRMÉ** | **HAUTE** | **M** | `server.ts:157-158` [CONSTATÉ] |
| **SEC-06** | CORS `origin: true` + `credentials: true` (CSRF / Exfiltration) | **CONFIRMÉ** | **HAUTE** | **S** | `server.ts:138-143` [CONSTATÉ] |
| **SEC-07** | Helmet importé ET appliqué (Absent du serveur unifié) | **CONFIRMÉ** | **HAUTE** | **S** | `server.ts:1-20` (absent) vs `backend/server.js:148-150` [CONSTATÉ] |
| **SEC-08** | Reset de mot de passe qui renvoie un mot de passe en clair | **CONFIRMÉ** | **HAUTE** | **S** | `backend/controllers/users/accountControllers.js:170` & `backend/controllers/auth/adminController.js:65` [CONSTATÉ] |
| **SEC-09** | Routes `:id` sans filtre département (Courriers orphelins / Scan / RH) | **CONFIRMÉ** | **HAUTE** | **M** | `backend/controllers/incomingDocuments/detailControllers.js:85-92` & `backend/controllers/scan/documentScanController.js:105-138` [CONSTATÉ] |
| **SEC-10** | JWT (Secret par défaut en dur, durée 30 jours, stockage `localStorage`) | **CONFIRMÉ** | **CRITIQUE** | **M** | `backend/models/User.js:111-113`, `server.ts:44`, `src/services/apiService.ts:16` [CONSTATÉ] |
| **SEC-11** | Mass Assignment sur `PUT /users/:id` et `POST /users` | **CONFIRMÉ** | **HAUTE** | **S** | `backend/controllers/users/managementControllers.js:116,248-253,276` [CONSTATÉ] |
| **SEC-12** | Filtrage par département dans la récupération du module IA | **INFIRMÉ / RÉSERVE** | **MOYENNE** | **M** | `backend/controllers/ai/chatController.js:47-70` [CONSTATÉ] |

---
*(Les parties 2/4, 3/4 et 4/4 seront complétées au fil de la restitution)*
