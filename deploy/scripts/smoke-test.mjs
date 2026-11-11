#!/usr/bin/env node
/**
 * ==============================================================================
 * deploy/scripts/smoke-test.mjs
 * Suite de tests de validation post-déploiement et d'audit de sécurité
 * [NON TESTÉ, à exécuter sur une VM de recette]
 * ==============================================================================
 * Rôle :
 *   Exécute une suite de requêtes automatisées divisée en 2 groupes :
 *   1. GROUPE DÉPLOIEMENT (bloquant) :
 *      - Santé du serveur et base de données (/api/health)
 *      - Cloisonnement d'accès (/api/departments sans jeton = 401)
 *      - Distribution du Frontend SPA (GET /)
 *      - Gestion des routes inexistantes (404)
 *      => Tout FAIL sur ce groupe déclenche un échec critique (exit 1 / rollback).
 *
 *   2. GROUPE SÉCURITÉ (audit & durcissement) :
 *      - Blocage de /api/auth/reset-admin (doit être 403/404)
 *      - Blocage de /api/auth/test-admin
 *      - En-tête X-Powered-By masqué
 *      - En-tête X-Content-Type-Options: nosniff
 *      - Protection photos /uploads/usersphoto sans session (doit être 401/403)
 *      - Protection racine /uploads sans jeton (doit être 401/403)
 *      - Test CORS avec Origin non autorisée (Origin: http://evil.test)
 *      - Test Rate Limit sur /api/auth/login (11 requêtes rapides)
 *      - Test contournement skipDepartmentCheck via originalUrl (?x=/messages)
 *      => Affiché en WARN / FAIL selon constat. Ne bloque le déploiement QUE si
 *         l'option --strict-security est passée en argument CLI.
 *
 * Utilisation :
 *   node deploy/scripts/smoke-test.mjs [BASE_URL] [--strict-security]
 * ==============================================================================
 */

const args = process.argv.slice(2);
const strictSecurity = args.includes('--strict-security');
const targetUrlArg = args.find(a => !a.startsWith('--'));
const baseUrl = (targetUrlArg || process.env.TEST_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

console.log('═'.repeat(88));
console.log(`🧪 DMS — SUITE DE VALIDATION POST-DÉPLOIEMENT & AUDIT DE SÉCURITÉ`);
console.log(`🎯 Cible auditée       : ${baseUrl}`);
console.log(`🔒 Mode sécurité stricte: ${strictSecurity ? 'ACTIVÉ (Rollback sur failles sécu)' : 'DÉSACTIVÉ (Tolérance WARN/FAIL sécu)'}`);
console.log(`⏱️ Date & Heure         : ${new Date().toISOString()}`);
console.log('═'.repeat(88));

const deployResults = [];
const securityResults = [];

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
      // Non-JSON body
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

// ==============================================================================
// GROUPE 1 : TESTS DE DÉPLOIEMENT & DISPONIBILITÉ (CRITIQUES / BLOQUANTS)
// ==============================================================================

async function testHealth() {
  const res = await makeRequest('/api/health');
  if (!res.ok) {
    deployResults.push({
      id: 'DEP-01',
      name: 'Santé de l\'API (/api/health)',
      expected: 'HTTP 200 + db: connected',
      actual: `Connexion impossible : ${res.error}`,
      status: 'FAIL',
    });
    return;
  }
  const isConnected = res.bodyJson?.database === 'connected';
  const isHealthy = res.status === 200 && res.bodyJson?.success === true;
  deployResults.push({
    id: 'DEP-01',
    name: 'Santé de l\'API (/api/health)',
    expected: 'HTTP 200 & db: connected',
    actual: `HTTP ${res.status} (db: ${res.bodyJson?.database || 'inconnu'})`,
    status: isHealthy && isConnected ? 'PASS' : (isHealthy ? 'WARN' : 'FAIL'),
  });
}

async function testDepartmentsUnauthorized() {
  const res = await makeRequest('/api/departments');
  const is401 = res.status === 401;
  const is503 = res.status === 503;
  deployResults.push({
    id: 'DEP-02',
    name: 'Accès /api/departments sans jeton',
    expected: 'HTTP 401 (jamais 503)',
    actual: `HTTP ${res.status}${is503 ? ' (Base signalée 503)' : ''}`,
    status: is401 ? 'PASS' : 'FAIL',
  });
}

async function testFrontendRoot() {
  const res = await makeRequest('/');
  const isHtml = res.status === 200 && (res.bodyText.includes('<!doctype html>') || res.bodyText.includes('<div id="root">'));
  deployResults.push({
    id: 'DEP-03',
    name: 'Distribution Frontend SPA (GET /)',
    expected: 'HTTP 200 + index HTML',
    actual: res.status === 200 ? (isHtml ? 'HTTP 200 (HTML valide)' : 'HTTP 200 (HTML incomplet)') : `HTTP ${res.status}`,
    status: isHtml ? 'PASS' : 'FAIL',
  });
}

async function testRouteNotFound() {
  const res = await makeRequest('/api/non-existent-probe-for-smoke-test-404');
  const is404 = res.status === 404;
  deployResults.push({
    id: 'DEP-04',
    name: 'Route API inconnue (/api/...)',
    expected: 'HTTP 404 (jamais 500)',
    actual: `HTTP ${res.status}`,
    status: is404 ? 'PASS' : 'FAIL',
  });
}

// ==============================================================================
// GROUPE 2 : TESTS DE SÉCURITÉ & AUDIT DE DURCISSEMENT (NON BLOQUANTS PAR DÉFAUT)
// ==============================================================================

async function testResetAdmin() {
  const res = await makeRequest('/api/auth/reset-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const isBlocked = res.status === 403 || res.status === 404;
  securityResults.push({
    id: 'SEC-01',
    name: 'Désactivation reset-admin (SEC-03)',
    expected: 'HTTP 403 ou 404',
    actual: `HTTP ${res.status}${res.status === 200 ? ' (Actif ! Danger)' : ''}`,
    status: isBlocked ? 'PASS' : 'FAIL',
  });
}

async function testTestAdmin() {
  const res = await makeRequest('/api/auth/test-admin');
  const isBlocked = res.status === 403 || res.status === 404;
  securityResults.push({
    id: 'SEC-02',
    name: 'Désactivation test-admin',
    expected: 'HTTP 403 ou 404',
    actual: `HTTP ${res.status}${res.status === 200 ? ' (Énumération admin active)' : ''}`,
    status: isBlocked ? 'PASS' : 'WARN',
  });
}

async function testSecurityHeaders() {
  const res = await makeRequest('/api/health');
  const hasXPoweredBy = 'x-powered-by' in res.headers;
  const hasNosniff = res.headers['x-content-type-options'] === 'nosniff';

  securityResults.push({
    id: 'SEC-03',
    name: 'Masquage X-Powered-By Express (BLK-06)',
    expected: 'En-tête absent',
    actual: hasXPoweredBy ? `Exposé (${res.headers['x-powered-by']})` : 'Masqué (OK)',
    status: hasXPoweredBy ? 'WARN' : 'PASS',
  });

  securityResults.push({
    id: 'SEC-04',
    name: 'En-tête X-Content-Type-Options',
    expected: 'nosniff',
    actual: hasNosniff ? 'nosniff présent' : 'Absent',
    status: hasNosniff ? 'PASS' : 'WARN',
  });
}

async function testCorsEvilOrigin() {
  const evilOrigin = 'http://evil.test';
  const res = await makeRequest('/api/health', {
    method: 'OPTIONS',
    headers: {
      'Origin': evilOrigin,
      'Access-Control-Request-Method': 'GET',
    },
  });

  const allowOrigin = res.headers['access-control-allow-origin'];
  const reflectsEvil = allowOrigin === evilOrigin || allowOrigin === '*';

  securityResults.push({
    id: 'SEC-05',
    name: 'CORS avec Origin http://evil.test (BLK-05)',
    expected: 'Origine rejetée',
    actual: reflectsEvil ? `Origine reflétée (${allowOrigin})` : 'Rejetée / Non reflétée',
    status: reflectsEvil ? 'FAIL' : 'PASS',
  });
}

async function testPhotosWithoutAuth() {
  const res = await makeRequest('/uploads/usersphoto/test.jpg');
  const isProtected = res.status === 401 || res.status === 403;
  securityResults.push({
    id: 'SEC-06',
    name: 'Photos utilisateurs sans session (BLK-11)',
    expected: 'HTTP 401 ou 403',
    actual: `HTTP ${res.status}${res.status === 404 ? ' (Servi en statique public - faille)' : ''}`,
    status: isProtected ? 'PASS' : 'WARN',
  });
}

async function testUploadsRootWithoutToken() {
  const res = await makeRequest('/uploads/attachments/document.pdf');
  const isProtected = res.status === 401 || res.status === 403;
  securityResults.push({
    id: 'SEC-07',
    name: 'Accès direct /uploads/ sans jeton',
    expected: 'HTTP 401 ou 403',
    actual: `HTTP ${res.status}${res.status === 404 ? ' (Servi en statique sans auth)' : ''}`,
    status: isProtected ? 'PASS' : 'WARN',
  });
}

async function testRateLimiting() {
  let saw429 = false;
  let lastStatus = 0;
  for (let i = 1; i <= 11; i++) {
    const res = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'smoke_test_probe_user', password: 'InvalidPassword123!' }),
    });
    lastStatus = res.status;
    if (res.status === 429) {
      saw429 = true;
      break;
    }
  }

  securityResults.push({
    id: 'SEC-08',
    name: 'Rate limiting /api/auth/login (BLK-12)',
    expected: 'HTTP 429 après 10 requêtes',
    actual: saw429 ? 'HTTP 429 déclenché' : `Aucun blocage (Dernier HTTP ${lastStatus})`,
    status: saw429 ? 'PASS' : 'WARN',
  });
}

async function testOriginalUrlBypassProbe() {
  // Simule le contournement de filtrage départemental via ?x=/messages (faille SEC-01)
  const probePath = '/api/departments?x=/messages';
  const res = await makeRequest(probePath);
  // Sans jeton, doit toujours être 401
  const is401 = res.status === 401;
  securityResults.push({
    id: 'SEC-09',
    name: 'Contournement originalUrl ?x=/messages (SEC-01)',
    expected: 'HTTP 401',
    actual: `HTTP ${res.status}`,
    status: is401 ? 'PASS' : 'FAIL',
  });
}

function printTable(title, list) {
  console.log(`\n📌 ${title}`);
  console.log('┌───────┬──────────────────────────────────────────┬──────────────────────┬──────────────────────┬────────┐');
  console.log('│ ID    │ TEST EFFECTUÉ                            │ ATTENDU              │ OBTENU               │ STATUT │');
  console.log('├───────┼──────────────────────────────────────────┼──────────────────────┼──────────────────────┼────────┤');

  for (const r of list) {
    const id = r.id.padEnd(5);
    const name = r.name.padEnd(40).slice(0, 40);
    const expected = r.expected.padEnd(20).slice(0, 20);
    const actual = r.actual.padEnd(20).slice(0, 20);
    let statusFormatted = r.status.padEnd(6);

    if (r.status === 'FAIL') {
      statusFormatted = '❌ FAIL';
    } else if (r.status === 'WARN') {
      statusFormatted = '⚠️ WARN';
    } else {
      statusFormatted = '✅ PASS';
    }

    console.log(`│ ${id} │ ${name} │ ${expected} │ ${actual} │ ${statusFormatted} │`);
  }
  console.log('└───────┴──────────────────────────────────────────┴──────────────────────┴──────────────────────┴────────┘');
}

async function run() {
  // 1. Exécution du groupe Déploiement
  await testHealth();
  await testDepartmentsUnauthorized();
  await testFrontendRoot();
  await testRouteNotFound();

  // 2. Exécution du groupe Sécurité
  await testResetAdmin();
  await testTestAdmin();
  await testSecurityHeaders();
  await testCorsEvilOrigin();
  await testPhotosWithoutAuth();
  await testUploadsRootWithoutToken();
  await testRateLimiting();
  await testOriginalUrlBypassProbe();

  // Affichage
  printTable('GROUPE 1 : TESTS DE DÉPLOIEMENT (CRITIQUES / DÉCLENCHEURS DE ROLLBACK)', deployResults);
  printTable('GROUPE 2 : AUDIT DE DURCISSEMENT & VULNÉRABILITÉS SÉCURITÉ APPLICATIVE', securityResults);

  const deployFails = deployResults.filter(r => r.status === 'FAIL').length;
  const secFails = securityResults.filter(r => r.status === 'FAIL').length;
  const secWarns = securityResults.filter(r => r.status === 'WARN').length;

  console.log('\n' + '═'.repeat(88));
  console.log(`📊 BILAN DES TESTS :`);
  console.log(`   - Déploiement : ${deployResults.length - deployFails}/${deployResults.length} PASS (${deployFails} FAIL)`);
  console.log(`   - Sécurité    : ${securityResults.length - secFails - secWarns}/${securityResults.length} PASS (${secWarns} WARN, ${secFails} FAIL)`);
  console.log('═'.repeat(88));

  if (deployFails > 0) {
    console.error(`\n❌ ÉCHEC CRITIQUE DÉPLOIEMENT : ${deployFails} test(s) de base ont échoué.`);
    console.error('   L\'application ne répond pas correctement. Déclenchement du ROLLBACK.');
    process.exit(1);
  }

  if (strictSecurity && secFails > 0) {
    console.error(`\n❌ ÉCHEC DU CONTRÔLE SÉCURITÉ STRICT (--strict-security) : ${secFails} faille(s) de sécurité détectée(s).`);
    console.error('   Déclenchement du ROLLBACK car le mode de sécurité strict est actif.');
    process.exit(1);
  }

  if (secFails > 0 || secWarns > 0) {
    console.log(`\n⚠️ DÉPLOIEMENT ACCEPTÉ AVEC FAILLE(S) APPLICATIVE(S) DOCUMENTÉE(S) :`);
    console.log(`   L'application est fonctionnelle et disponible pour les utilisateurs.`);
    console.log(`   Les failles du Groupe 2 doivent être corrigées dans le code avant passage en prod réelle.`);
    process.exit(0);
  }

  console.log('\n✅ DÉPLOIEMENT PARFAIT : 100% des tests de déploiement et de sécurité sont conformes.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
