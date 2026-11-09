#!/usr/bin/env node
/**
 * scripts/check-proxy-connectivity.js
 * 
 * Diagnostic tool to check connectivity between the Vite dev server proxy (port 3000)
 * and the Node.js Express backend (port 5000).
 * Tests a simple health endpoint (/api/health and /api/test) and reports status.
 */

import http from 'http';

const VITE_PORT = process.env.VITE_PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const HOST = '127.0.0.1';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg) {
  console.log(msg);
}

function requestEndpoint(host, port, path, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DMS-Proxy-Diagnostic/1.0',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          const duration = Date.now() - startTime;
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch (_) {
            parsedData = rawData;
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedData,
            duration,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        error: `ETIMEDOUT (Timeout après ${timeoutMs}ms)`,
        duration: Date.now() - startTime,
      });
    });

    req.on('error', (err) => {
      resolve({
        ok: false,
        error: err.code || err.message,
        duration: Date.now() - startTime,
      });
    });

    req.end();
  });
}

async function runDiagnostics() {
  log('');
  log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bright}${colors.cyan}  🔍 DIAGNOSTIC DE CONNECTIVITÉ : PROXY VITE (3000) ↔ BACKEND (5000)${colors.reset}`);
  log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.gray}Date: ${new Date().toISOString()}${colors.reset}`);
  log('');

  // 1. Test Backend Direct (Port 5000)
  log(`${colors.bright}[Étape 1/3] Test direct du Backend Node.js sur le port ${BACKEND_PORT}...${colors.reset}`);
  const backendResult = await requestEndpoint(HOST, BACKEND_PORT, '/api/health');

  let backendOk = backendResult.ok;
  let backendData = backendResult.body;

  if (backendOk) {
    log(`  ${colors.green}✔ Backend DIRECT accessible${colors.reset} [HTTP ${backendResult.statusCode}] en ${backendResult.duration}ms`);
    log(`    Réponse : ${colors.gray}${JSON.stringify(backendData)}${colors.reset}`);
  } else {
    // Essayer fallback sur /api/test
    const fallbackTest = await requestEndpoint(HOST, BACKEND_PORT, '/api/test');
    if (fallbackTest.ok) {
      backendOk = true;
      backendData = fallbackTest.body;
      log(`  ${colors.green}✔ Backend DIRECT accessible via /api/test${colors.reset} [HTTP ${fallbackTest.statusCode}] en ${fallbackTest.duration}ms`);
      log(`    Réponse : ${colors.gray}${JSON.stringify(backendData)}${colors.reset}`);
    } else {
      log(`  ${colors.red}✖ Backend DIRECT inaccessible sur ${HOST}:${BACKEND_PORT}${colors.reset}`);
      log(`    Erreur : ${colors.yellow}${backendResult.error || `HTTP ${backendResult.statusCode}`}${colors.reset}`);
      log(`    ${colors.gray}Note : Le serveur backend standalone (npm run dev:backend) n'est peut-être pas démarré.${colors.reset}`);
    }
  }

  log('');

  // 2. Test Serveur Principal / Dev Vite (Port 3000)
  log(`${colors.bright}[Étape 2/3] Test du serveur Vite / Dev sur le port ${VITE_PORT}...${colors.reset}`);
  const viteServerResult = await requestEndpoint(HOST, VITE_PORT, '/');
  const viteOk = viteServerResult.ok || viteServerResult.statusCode === 200;

  if (viteOk) {
    log(`  ${colors.green}✔ Serveur Vite actif sur ${HOST}:${VITE_PORT}${colors.reset} [HTTP ${viteServerResult.statusCode}] en ${viteServerResult.duration}ms`);
  } else {
    log(`  ${colors.red}✖ Serveur Vite non joignable sur ${HOST}:${VITE_PORT}${colors.reset}`);
    log(`    Erreur : ${colors.yellow}${viteServerResult.error || `HTTP ${viteServerResult.statusCode}`}${colors.reset}`);
  }

  log('');

  // 3. Test du Proxy : Requête vers http://localhost:3000/api/health
  log(`${colors.bright}[Étape 3/3] Test du routage Proxy : http://${HOST}:${VITE_PORT}/api/health...${colors.reset}`);
  const proxyResult = await requestEndpoint(HOST, VITE_PORT, '/api/health');

  let proxyOk = proxyResult.ok;
  let proxyData = proxyResult.body;

  if (!proxyOk) {
    // Essai avec /api/test
    const proxyFallback = await requestEndpoint(HOST, VITE_PORT, '/api/test');
    if (proxyFallback.ok) {
      proxyOk = true;
      proxyData = proxyFallback.body;
      log(`  ${colors.green}✔ Proxy opérationnel via /api/test${colors.reset} [HTTP ${proxyFallback.statusCode}] en ${proxyFallback.duration}ms`);
      log(`    Réponse reçue via proxy : ${colors.gray}${JSON.stringify(proxyData)}${colors.reset}`);
    } else {
      log(`  ${colors.red}✖ Le Proxy n'a pas pu relayer la requête${colors.reset}`);
      log(`    Code HTTP : ${colors.yellow}${proxyResult.statusCode || 'N/A'}${colors.reset}`);
      log(`    Détail : ${colors.yellow}${proxyResult.error || JSON.stringify(proxyResult.body)}${colors.reset}`);
    }
  } else {
    log(`  ${colors.green}✔ Proxy correctement configuré et actif !${colors.reset} [HTTP ${proxyResult.statusCode}] en ${proxyResult.duration}ms`);
    log(`    Réponse reçue via proxy : ${colors.gray}${JSON.stringify(proxyData)}${colors.reset}`);
  }

  log('');
  log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bright}  RAPPORT DE SYNTHÈSE${colors.reset}`);
  log(`${colors.bright}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);

  if (proxyOk) {
    log(`  ${colors.green}🎉 SUCCÈS : Le dev server et le proxy transmettent correctement les requêtes /api vers le backend.${colors.reset}`);
  } else if (!backendOk && !viteOk) {
    log(`  ${colors.yellow}⚠️  Aucun serveur actif actuellement.${colors.reset}`);
    log(`     Pour démarrer le serveur combiné (Vite + Express) : ${colors.bright}npm run dev${colors.reset}`);
    log(`     Pour démarrer le backend dédié (port 5000)       : ${colors.bright}npm run dev:backend${colors.reset}`);
  } else if (!backendOk && viteOk) {
    log(`  ${colors.yellow}ℹ️  Vite (port ${VITE_PORT}) est actif, mais le backend séparé (port ${BACKEND_PORT}) n'est pas lancé.${colors.reset}`);
    log(`     Si vous utilisez l'architecture monolithique serveur unique (server.ts), les routes /api sont montées directement.`);
    log(`     Si vous utilisez deux processus séparés (Vite dev + Express standalone), lancez : ${colors.bright}npm run dev:backend${colors.reset}`);
  } else {
    log(`  ${colors.red}⚠️  Le proxy Vite n'a pas pu transférer vers le port ${BACKEND_PORT}.${colors.reset}`);
    log(`     Vérifiez les paramètres 'server.proxy' dans 'vite.config.ts'.`);
  }

  log('');
}

runDiagnostics();
