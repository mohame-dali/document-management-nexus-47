#!/usr/bin/env node
/**
 * ==============================================================================
 * deploy/scripts/smoke-test.mjs
 * Script de test de fumée (Smoke Test) post-déploiement en Node.js pur
 * [NON TESTÉ, à exécuter sur une VM de recette]
 * ==============================================================================
 * Rôle :
 *   Exécute une suite de requêtes HTTP automatisées contre l'instance DMS déployée
 *   pour valider sa disponibilité, l'intégrité de ses routes, son cloisonnement
 *   d'authentification et ses en-têtes de sécurité.
 *
 * Utilisation :
 *   node deploy/scripts/smoke-test.mjs [BASE_URL]
 * Exemple :
 *   node deploy/scripts/smoke-test.mjs http://127.0.0.1:3000
 *   node deploy/scripts/smoke-test.mjs https://dms.local
 *
 * Code de sortie :
 *   0 = Tous les tests critiques sont PASS
 *   1 = Au moins un test critique a échoué (FAIL) -> déclenche le rollback automatique
 * ==============================================================================
 */

const baseUrl = (process.argv[2] || process.env.TEST_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

console.log('═'.repeat(84));
console.log(`🧪 DMS — SUITE DE TESTS DE FUMÉE (SMOKE TESTS)`);
console.log(`🎯 Cible auditée : ${baseUrl}`);
console.log(`⏱️ Date & Heure   : ${new Date().toISOString()}`);
console.log('═'.repeat(84));

const results = [];

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let bodyText = '';
    let bodyJson = null;
    try {
      bodyText = await res.text();
      bodyJson = JSON.parse(bodyText);
    } catch (_) {
      // Pas du JSON
    }

    return {
      ok: true,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      bodyText,
      bodyJson,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'TIMEOUT (5s)' : err.message,
      status: 0,
      headers: {},
      bodyText: '',
      bodyJson: null,
    };
  }
}

// ------------------------------------------------------------------------------
// 1. TEST : Santé du service (/api/health)
// ------------------------------------------------------------------------------
async function testHealth() {
  const res = await makeRequest('/api/health');
  if (!res.ok) {
    results.push({
      id: 'SMK-01',
      name: 'Santé de l\'API (/api/health)',
      expected: 'HTTP 200 + database connected',
      actual: `Connexion échouée : ${res.error}`,
      status: 'FAIL',
      critical: true,
    });
    return;
  }

  const isConnected = res.bodyJson?.database === 'connected';
  const isHealthy = res.status === 200 && res.bodyJson?.success === true;

  results.push({
    id: 'SMK-01',
    name: 'Santé de l\'API (/api/health)',
    expected: 'HTTP 200 & db: connected',
    actual: `HTTP ${res.status} (db: ${res.bodyJson?.database || 'inconnu'})`,
    status: isHealthy && isConnected ? 'PASS' : (isHealthy ? 'WARN' : 'FAIL'),
    critical: true,
  });
}

// ------------------------------------------------------------------------------
// 2. TEST : Rejet non authentifié (/api/departments sans jeton = 401, jamais 503)
// ------------------------------------------------------------------------------
async function testDepartmentsUnauthorized() {
  const res = await makeRequest('/api/departments');
  const is401 = res.status === 401;
  const is503 = res.status === 503;

  results.push({
    id: 'SMK-02',
    name: 'Accès sans jeton (/api/departments)',
    expected: 'HTTP 401 (jamais 503)',
    actual: `HTTP ${res.status}${is503 ? ' (Base signalée hors ligne)' : ''}`,
    status: is401 ? 'PASS' : (is503 ? 'FAIL' : 'WARN'),
    critical: true,
  });
}

// ------------------------------------------------------------------------------
// 3. TEST : Distribution du Frontend SPA (Racine /)
// ------------------------------------------------------------------------------
async function testFrontendRoot() {
  const res = await makeRequest('/');
  const isHtml = res.status === 200 && (res.bodyText.includes('<!doctype html>') || res.bodyText.includes('<div id="root">'));

  results.push({
    id: 'SMK-03',
    name: 'Distribution Frontend SPA (GET /)',
    expected: 'HTTP 200 + HTML index',
    actual: res.status === 200 ? (isHtml ? 'HTTP 200 (HTML valide)' : 'HTTP 200 (HTML non reconnu)') : `HTTP ${res.status}`,
    status: isHtml ? 'PASS' : 'FAIL',
    critical: true,
  });
}

// ------------------------------------------------------------------------------
// 4. TEST : Route API inexistante (doit être 404, jamais 500)
// ------------------------------------------------------------------------------
async function testRouteNotFound() {
  const res = await makeRequest('/api/non-existent-route-for-smoke-test-404');
  const is404 = res.status === 404;

  results.push({
    id: 'SMK-04',
    name: 'Route API inconnue (/api/...)',
    expected: 'HTTP 404',
    actual: `HTTP ${res.status}`,
    status: is404 ? 'PASS' : 'WARN',
    critical: false,
  });
}

// ------------------------------------------------------------------------------
// 5. TEST : Désactivation des endpoints de dev (reset-admin & test-admin)
// ------------------------------------------------------------------------------
async function testDevEndpoints() {
  const resReset = await makeRequest('/api/auth/reset-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const isResetBlocked = resReset.status === 403 || resReset.status === 404;

  results.push({
    id: 'SMK-05',
    name: 'Blocage reset-admin en production',
    expected: 'HTTP 403 ou 404',
    actual: `HTTP ${resReset.status}${resReset.status === 200 ? ' (ALERTE : reset admin actif !)' : ''}`,
    status: isResetBlocked ? 'PASS' : 'FAIL',
    critical: true,
  });

  const resTestAdmin = await makeRequest('/api/auth/test-admin');
  const isTestAdminBlocked = resTestAdmin.status === 403 || resTestAdmin.status === 404;

  results.push({
    id: 'SMK-06',
    name: 'Blocage test-admin en production',
    expected: 'HTTP 403 ou 404',
    actual: `HTTP ${resTestAdmin.status}${resTestAdmin.status === 200 ? ' (Énumération admin active)' : ''}`,
    status: isTestAdminBlocked ? 'PASS' : 'WARN',
    critical: false,
  });
}

// ------------------------------------------------------------------------------
// 6. TEST : En-têtes de sécurité HTTP & Masquage technologique
// ------------------------------------------------------------------------------
async function testSecurityHeaders() {
  const res = await makeRequest('/api/health');
  const hasXPoweredBy = 'x-powered-by' in res.headers;
  const hasNosniff = res.headers['x-content-type-options'] === 'nosniff';
  const hasFrameOptions = !!res.headers['x-frame-options'];

  results.push({
    id: 'SMK-07',
    name: 'Masquage X-Powered-By (Express)',
    expected: 'En-tête absent',
    actual: hasXPoweredBy ? `Présent (${res.headers['x-powered-by']})` : 'Absent (masqué)',
    status: hasXPoweredBy ? 'WARN' : 'PASS',
    critical: false,
  });

  results.push({
    id: 'SMK-08',
    name: 'En-tête X-Content-Type-Options: nosniff',
    expected: 'nosniff',
    actual: hasNosniff ? 'nosniff présent' : 'Absent',
    status: hasNosniff ? 'PASS' : 'WARN',
    critical: false,
  });
}

// ------------------------------------------------------------------------------
// 7. TEST : Protection des photos d'identité sans session
// ------------------------------------------------------------------------------
async function testPhotosProtection() {
  const res = await makeRequest('/uploads/usersphoto/test.jpg');
  // En production avec Helmet/Proxy durci, l'accès direct sans session doit être rejeté (401/403)
  // Si le code actuel sert en statique public, il renverra 404 (fichier inexistant) au lieu de 401
  const isProtected = res.status === 401 || res.status === 403;

  results.push({
    id: 'SMK-09',
    name: 'Protection photos sans session (/uploads/)',
    expected: 'HTTP 401 ou 403',
    actual: `HTTP ${res.status}${res.status === 404 ? ' (Servi en statique public - faille BLK-11)' : ''}`,
    status: isProtected ? 'PASS' : 'WARN',
    critical: false,
  });
}

// ------------------------------------------------------------------------------
// 8. TEST : Limitation de débit (Rate Limiting sur /api/auth/login)
// ------------------------------------------------------------------------------
async function testRateLimiting() {
  let saw429 = false;
  let lastStatus = 0;

  for (let i = 1; i <= 11; i++) {
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'non_existent_smoke_test_user', password: 'BadPassword123!' }),
    });
    lastStatus = res.status;
    if (res.status === 429) {
      saw429 = true;
      break;
    }
  }

  results.push({
    id: 'SMK-10',
    name: 'Limitation force brute (11x login)',
    expected: 'HTTP 429 (Too Many Requests)',
    actual: saw429 ? 'HTTP 429 déclenché' : `Aucun blocage 429 (Dernier HTTP ${lastStatus})`,
    status: saw429 ? 'PASS' : 'WARN',
    critical: false,
  });
}

// ------------------------------------------------------------------------------
// Exécution séquentielle et affichage du tableau récapitulatif
// ------------------------------------------------------------------------------
async function runAll() {
  await testHealth();
  await testDepartmentsUnauthorized();
  await testFrontendRoot();
  await testRouteNotFound();
  await testDevEndpoints();
  await testSecurityHeaders();
  await testPhotosProtection();
  await testRateLimiting();

  console.log('\n┌───────┬──────────────────────────────────────────┬──────────────────────┬──────────────────────┬────────┐');
  console.log('│ ID    │ TEST EFFECTUÉ                            │ ATTENDU              │ OBTENU               │ STATUT │');
  console.log('├───────┼──────────────────────────────────────────┼──────────────────────┼──────────────────────┼────────┤');

  let criticalFailures = 0;
  let totalWarnings = 0;

  for (const r of results) {
    const id = r.id.padEnd(5);
    const name = r.name.padEnd(40).slice(0, 40);
    const expected = r.expected.padEnd(20).slice(0, 20);
    const actual = r.actual.padEnd(20).slice(0, 20);
    let statusFormatted = r.status.padEnd(6);

    if (r.status === 'FAIL') {
      if (r.critical) criticalFailures++;
      statusFormatted = '❌ FAIL';
    } else if (r.status === 'WARN') {
      totalWarnings++;
      statusFormatted = '⚠️ WARN';
    } else {
      statusFormatted = '✅ PASS';
    }

    console.log(`│ ${id} │ ${name} │ ${expected} │ ${actual} │ ${statusFormatted} │`);
  }

  console.log('└───────┴──────────────────────────────────────────┴──────────────────────┴──────────────────────┴────────┘');

  console.log('\n' + '═'.repeat(84));
  if (criticalFailures > 0) {
    console.error(`❌ ÉCHEC DU SMOKE TEST : ${criticalFailures} test(s) critique(s) ont échoué.`);
    console.error(`   L'application n'est pas opérationnelle ou présente un blocage de production.`);
    console.log('═'.repeat(84) + '\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`⚠️ SMOKE TEST VALIDÉ AVEC AVERTISSEMENTS : Les fonctions de base fonctionnent.`);
    console.log(`   ${totalWarnings} avertissement(s) de sécurité/durcissement à examiner.`);
    console.log('═'.repeat(84) + '\n');
    process.exit(0);
  } else {
    console.log('✅ SMOKE TEST RÉUSSI : Tous les contrôles de disponibilité et d\'intégrité sont PASS.');
    console.log('═'.repeat(84) + '\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});
