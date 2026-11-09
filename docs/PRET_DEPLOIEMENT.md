# RAPPORT D'AUDIT TECHNIQUE : APTE AU DÉPLOIEMENT ? (DMS)
**Statut : EN COURS D'AUDIT (PARTIE 1/4 - SÉCURITÉ)**  
**Auditeur : Ingénieur DevOps & Auditeur Senior en Sécurité des SI**  
**Contexte : Serveur local d'administration publique — Données RH sensibles**  
**Règle d'audit : READ-ONLY (Aucune altération du code applicatif)**  

---

## 1. BLOQUANTS SÉCURITÉ (ANALYSE CODE SOURCE & PREUVES)

| ID | Point audité | Statut | Gravité | Effort | Preuve (Fichier:Ligne) |
|---|---|---|---|---|---|
| **SEC-01** | Contournement d'`authorize()` via l'URL (`req.originalUrl.includes`) | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/middleware/auth.js:73-81` [CONSTATÉ] |
| **SEC-02** | `rhPersonnelHistoryController` sans contrôle d'accès | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/routes/rhPersonnelHistoryRoutes.js:9,17,25,33,41` [CONSTATÉ] |
| **SEC-03** | `reset-admin` et sa condition (`NODE_ENV`) | **CONFIRMÉ** | **CRITIQUE** | **S** | `backend/controllers/auth/adminController.js:33-37,61-66` [CONSTATÉ] |
| **SEC-04** | `scanExecutor` (Injection de commandes shell via `exec`) | **CONFIRMÉ** | **CRITIQUE** | **M** | `backend/utils/scanner/linux/scanExecutor.js:68,75,89` [CONSTATÉ] |
| **SEC-05** | Photos et uploads servis par `express.static` sans session | **CONFIRMÉ** | **HAUTE** | **M** | `server.ts:157-161` & `backend/server.js:238-242` [CONSTATÉ] |
| **SEC-06** | CORS `origin: true` + `credentials: true` (CSRF / Exfiltration) | **CONFIRMÉ** | **HAUTE** | **S** | `server.ts:138-143` & `backend/server.js:127-146` [CONSTATÉ] |
| **SEC-07** | Helmet importé ET appliqué (Absent sur l'exécutable unifié) | **CONFIRMÉ** | **HAUTE** | **S** | `server.ts:1-50` (absent) & `backend/server.js:148-165` [CONSTATÉ] |
| **SEC-08** | Reset de mot de passe qui renvoie un mot de passe en clair | **CONFIRMÉ** | **HAUTE** | **S** | `backend/controllers/users/accountControllers.js:170` [CONSTATÉ] |
| **SEC-09** | Routes `:id` sans filtre département (Courriers orphelins / RH) | **CONFIRMÉ** | **HAUTE** | **M** | `backend/controllers/incomingDocuments/detailControllers.js:85-92` [CONSTATÉ] |
| **SEC-10** | JWT (Secret par défaut en dur, durée 30 jours, `localStorage`) | **CONFIRMÉ** | **CRITIQUE** | **M** | `backend/models/User.js:111-113` & `server.ts:44` [CONSTATÉ] |
| **SEC-11** | Mass Assignment sur `PUT /users/:id` (Liste noire au lieu de blanche) | **CONFIRMÉ** | **HAUTE** | **S** | `backend/controllers/users/managementControllers.js:248-253,276` [CONSTATÉ] |
| **SEC-12** | Filtrage par département dans la récupération du module IA | **CONFIRMÉ (RÉSERVES)** | **MOYENNE** | **M** | `backend/controllers/ai/chatController.js:47-70` & `backend/routes/aiRoutes.js:23-38` [CONSTATÉ] |
