# ÉTAPE 2 : MESURES STATIQUES
Date: 2026-11-11

## 1. TypeScript (tsc --noEmit)
**Résultat :** ✅ PAS D'ERREUR (Exit code 0)

## 2. Lint (npm run lint)
**Résultat :** ❌ 238 problèmes (213 erreurs, 25 warnings)

### Détails
- Erreurs majoritaires : @typescript-eslint/no-explicit-any (type any non spécifié)
- Warnings : react-hooks/exhaustive-deps, react-refresh/only-export-components
- **Important :** La plupart des erreurs sont dans backups/i18n_phase3/* (fichiers de sauvegarde)
- Erreurs dans src/* : présence de types any (9 erreurs), warnings react-refresh (10 warnings)

## 3. Build (npm run build)
**Résultat :** ✅ SUCCÈS

| Métrique | Valeur |
|----------|--------|
| Durée | 14.07s |
| Taille dist/ | 5.9M |
| Plus gros chunk | index-CDwKJzIZ.js (4.6M) |
| CSS | 148 KB (gzip: 23.74 KB) |

**Avertissement build :** Chunk de 4.6M > 500 KB (recommande code-splitting)

## 4. Tests (npm test)
**Résultat :** ❌ ÉCHEC (0 tests, 6 erreurs)

- @testing-library/dom présent (devDependencies)
- Erreur : TypeError: Cannot read properties of undefined (reading 'bind') dans undici
- Aucun fichier de test détecté

## 5. Audit (npm audit)
**Résultat :** [NON EXÉCUTÉ] - Endpoint npm audit non implémenté sur le miroir npmmirror.com utilisé

## 6. Versions dépendances clés
| Dépendance | Version |
|------------|---------|
| mongoose | 9.10.2 |
| express | 5.2.1 |
| vite | 5.4.21 |
| node-llama-cpp | 3.22.2 |

## 7. Fichiers sensibles dans git
**CONSTAT :** backup-2026-10-09T14-38-21-909Z.zip est suivi par git (DOIT être retiré)

**Fichiers tracked (attendus) :**
- .env.example (fichiers d'exemple, OK)
- backend/courrier/* (documents de test/démo, OK)
- backend/uploads/* (fichiers uploadés, OK)
- backend/tmp/* (fichiers temporaires OCR, à surveiller)

**CONSTAT :** Aucun .env réel (seulement .env.example) - OK
