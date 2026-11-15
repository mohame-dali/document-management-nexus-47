# Audit Approfondi Pré-Production (Code Source & Sécurité) — DMS Courrier & RH

Plan d'exécution pour la réalisation de l'audit de sécurité, de robustesse applicative et de conformité du système de gestion de courrier et du personnel/RH avant déploiement local on-premise.

---

### Synthèse & Décisions Validées

> [!IMPORTANT]
> **Choix confirmés par l'utilisateur :**
> 1. **Format du livrable** : Rédaction d'un rapport complet directement et intégralement dans `docs/AUDIT_PRE_PROD.md`.
> 2. **Niveau de granularité technique** : Chaque vulnérabilité et anomalie identifiée comportera son diagnostic précis, la preuve ligne par ligne `[CONSTATÉ]`, l'impact opérationnel et l'extrait exact de code correctif à appliquer.
> 3. **Modalité d'exécution** : Analyse statique approfondie en lecture seule stricte sur l'ensemble du code (`backend/`, `src/`, `server.ts`, configurations).

---

## 1. Périmètre & Objectifs de l'Audit

L'audit analyse l'ensemble des 7 axes définis par le commanditaire pour qualifier la maturité du système avant son déploiement sur un serveur Windows/Linux local d'administration traitant des données RH sensibles :

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DMS COURRIER & RH - PÉRIMÈTRE AUDITÉ                     │
└──────────────────────────────────────────────────────────────────────────────┘
       │
       ├── AXE 1 : Démarrage, Résilience & Exploitation (server.ts, Node 22)
       ├── AXE 2 : Sécurité Applicative & Contrôle d'Accès (OWASP Top 10 / ASVS)
       ├── AXE 3 : Intégrité des Données & Logique Métier (Mongoose, Sérialisation)
       ├── AXE 4 : Fonctionnel, Recette & Cohérence des Permissions (Front/Back)
       ├── AXE 5 : Qualité du Code, Gestion d'Erreurs & Dépendances
       ├── AXE 6 : Performance, Concurrence & Module IA Local (node-llama-cpp)
       └── AXE 7 : Protection des Données Personnelles (Loi 2004-63 / RGPD)
```

---

## 2. Structure Détaillée du Rapport `docs/AUDIT_PRE_PROD.md`

Le document sera rédigé avec une rigueur technique maximale sans complaisance et structuré selon les sections suivantes :

### Section 1 : Résumé Exécutif & Verdict Global
- Synthèse exécutive (15 lignes)
- Matrice des 5 vulnérabilités les plus critiques
- Atouts et piliers solides de l'application
- Décision formelle d'exploitation : **NO-GO / GO CONDITIONNEL / GO**

### Section 2 : Registre Intégral des Constats & Vulnérabilités
Tableau complet exhaustif classé par niveau de gravité :
- **Critique** (Prise de contrôle, contournement d'authentification, fuite de données RH massives)
- **Haute** (CORS permissif, injection de commandes, suppression définitive non cloisonnée)
- **Moyenne** (Race condition sur les numéros de série, index dupliqués, absence de rate-limiting)
- **Faible** (En-têtes d'information, redondance de code)

*Colonnes obligatoires* : `ID` | `Titre` | `Gravité` | `Fichier:Ligne + Preuve [CONSTATÉ]` | `Impact` | `Code correctif proposé` | `Effort (S/M/L)` | `Type [FRONT/BACK/CONFIG/DÉCISION MÉTIER]`

### Section 3 : Rejeu Détaillé des Failles Spécifiques (SEC-01 à SEC-11)
Diagnostic ligne par ligne avec statut vérifié (**OUVERT / PARTIEL / FERMÉ**) :
- **SEC-01** : Contournement d'autorisation via paramètres d'URL (`req.originalUrl.startsWith` dans `backend/middleware/auth.js`)
- **SEC-02** : Exposition non protégée de l'historique RH (`/promotions`, `/postes`, `/diplomes`, `/sanctions`, `/full-history`)
- **SEC-03** : Endpoints dev actifs (`/api/auth/reset-admin`, `/api/auth/test-admin`) et mots de passe
- **SEC-04** : Concaténation de commandes shell dans `exec()` (OCR Tesseract, pdftoppm, scan)
- **SEC-05** : Exposition publique des photos de profil et du personnel sous `/uploads/*`
- **SEC-06** : Configuration CORS permissive `origin: true` avec `credentials: true`
- **SEC-07** : Absence de `helmet` dans `server.ts` et fuite d'en-têtes HTTP (`X-Powered-By`)
- **SEC-08** : Absence de rate limiting sur l'authentification (`/api/auth/login`)
- **SEC-09** : Fuite de documents sans affectation (`docDepts.length === 0`) et téléchargement direct `/courrier/*`
- **SEC-10** : Secret JWT avec fallback statique en dur, validité 30 jours et absence de révocation
- **SEC-11** : Assignation de masse (`User.create(req.body)`, `updateUser`)

### Section 4 : Matrice des Droits Rôles × Fonctionnalités (Front vs Back)
Comparaison croisée pour les rôles : `Admin`, `Director`, `AdminDepartment`, `AdminTuningDesk`, `User`. Mise en évidence des divergences où l'interface masque un bouton alors que l'API laisse passer la requête.

### Section 5 : Règles Métier, Données & Concurrence
- Algorithme de numérotation séquentielle (`MAX + 1` vs compteur atomique `$inc`)
- Traçabilité et auditabilité (`AuditLog`, falsification d'IP dans le body)
- Gestion des suppressions logiques vs physiques et orphelins (Dossiers, Courriers, Personnel)

### Section 6 : Module IA Local & Exploitation
- Isolation des modèles GGUF (`ALLaM 7B`, `bge-m3`), sécurité du RAG et cloisonnement des embeddings par département
- Résilience aux pannes, gestion des processus (PM2 / Service Windows) et scripts de déploiement

### Section 7 : Feuille de Route de Remédiation & Guide de Recette
- **Phase A (Bloquants Pré-Prod)** : Correctifs immédiats indispensables avant mise en service
- **Phase B (Sous 30 jours)** : Durcissement et robustesse opérationnelle
- **Phase C (Dette Technique)** : Nettoyage et consolidation architecturale
- **Cahier de tests manuels [À TESTER SUR VOTRE SERVEUR LOCAL]** : Scénarios précis avec requêtes `curl` prêtes à exécuter pour validation finale sur la machine hôte Windows.

---

## 3. Architecture Technique de Référence pour les Correctifs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ARCHITECTURE CIBLE DE SÉCURITÉ APPLICATIVE                │
└─────────────────────────────────────────────────────────────────────────────┘
  Client (Navigateur)
       │
       ▼
  [Helmet + CSP Strict] ──> Empêche clickjacking, MIME-sniffing, XSS
       │
       ▼
  [CORS Whitelist Restreinte] ──> Origines explicites autorisées uniquement
       │
       ▼
  [RateLimiter Global & Auth] ──> 5 tentatives / 15 min sur /api/auth/login
       │
       ▼
  [JWT Verify & Signature Sécurisée] ──> Secret fort exigé au boot, durée 8h
       │
       ▼
  [RBAC Strict & Filtre Département] ──> Contrôle d'objet dans CHAQUE contrôleur
       │
       ▼
  [MongoDB & Transactions Atomiques] ──> Sérialisation atomique $inc, intégrité
```

---

## 4. Modalités de Validation

1. **Validation du rapport** : Présentation du fichier `docs/AUDIT_PRE_PROD.md` complet et structuré.
2. **Revue des patches** : Fourniture des blocs de remplacement chirurgicaux pour chaque vulnérabilité identifiée afin de permettre une intégration rapide et sûre.
