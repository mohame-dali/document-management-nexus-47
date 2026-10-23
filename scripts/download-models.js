#!/usr/bin/env node
/**
 * scripts/download-models.js
 * Script de téléchargement automatique et sécurisé des modèles IA GGUF
 * Compatible Multi-OS (Linux, Windows, macOS) avec support proxy & reprise
 */

import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════
// 1. Couleurs et affichage console
// ═══════════════════════════════════════════════════════════════
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(msg) {
  console.log(msg);
}

function logInfo(msg) {
  console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}[SUCCÈS]${colors.reset} ${msg}`);
}

function logWarn(msg) {
  console.log(`${colors.yellow}[ATTENTION]${colors.reset} ${msg}`);
}

function logError(msg) {
  console.log(`${colors.red}[ERREUR]${colors.reset} ${msg}`);
}

// ═══════════════════════════════════════════════════════════════
// 2. Chargement des variables d'environnement (backend/.env ou .env)
// ═══════════════════════════════════════════════════════════════
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        result[key] = val;
      }
    }
    return result;
  } catch (err) {
    return {};
  }
}

const rootDir = path.resolve(__dirname, '..');
const backendEnv = loadEnvFile(path.join(rootDir, 'backend', '.env'));
const rootEnv = loadEnvFile(path.join(rootDir, '.env'));
const mergedEnv = { ...rootEnv, ...backendEnv, ...process.env };

// Proxy configuration
const httpProxy = mergedEnv.HTTP_PROXY || mergedEnv.http_proxy || '';
const httpsProxy = mergedEnv.HTTPS_PROXY || mergedEnv.https_proxy || httpProxy;

// Répertoire cible des modèles
const defaultModelsDir = path.join(rootDir, 'models');
if (!fs.existsSync(defaultModelsDir)) {
  fs.mkdirSync(defaultModelsDir, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════
// 3. Définition des modèles cibles
// ═══════════════════════════════════════════════════════════════
const ONE_GB = 1024 * 1024 * 1024;

export const MODELS = [
  {
    id: 'allam-7b',
    title: 'Modèle de Chat & Raisonnement (ALLaM 7B Instruct Q4_K_M)',
    filename: 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/ALLaM-AI_ALLaM-7B-Instruct-preview-GGUF/resolve/main/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf',
    minSizeBytes: ONE_GB, // > 1 Go
    envKey: 'LLAMA_CHAT_MODEL_PATH',
  },
  {
    id: 'bge-m3',
    title: 'Modèle Vectoriel RAG (BGE-M3 Multilingual Q4_K_M)',
    filename: 'bge-m3-q4_k_m.gguf',
    url: 'https://huggingface.co/stefancosma/bge-m3-Q4_K_M-GGUF/resolve/main/bge-m3-q4_k_m.gguf',
    minSizeBytes: 300 * 1024 * 1024, // 300 Mo (taille réelle ~417 Mo)
    envKey: 'LLAMA_EMBEDDING_MODEL_PATH',
  },
];

// ═══════════════════════════════════════════════════════════════
// 4. Utilitaires de détection et formatage
// ═══════════════════════════════════════════════════════════════
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function resolveModelPath(modelDef) {
  const envPath = mergedEnv[modelDef.envKey];
  if (envPath && envPath.trim()) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(rootDir, envPath);
  }
  return path.join(defaultModelsDir, modelDef.filename);
}

export function checkModelFile(filePath, minSizeBytes) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, valid: false, size: 0, reason: 'Fichier absent' };
  }
  try {
    const stat = fs.statSync(filePath);
    if (stat.size >= minSizeBytes) {
      return { exists: true, valid: true, size: stat.size };
    } else {
      return {
        exists: true,
        valid: false,
        size: stat.size,
        reason: `Taille insuffisante (${formatBytes(stat.size)} < ${formatBytes(minSizeBytes)}) - Fichier potentiellement corrompu ou incomplet`,
      };
    }
  } catch (err) {
    return { exists: false, valid: false, size: 0, reason: err.message };
  }
}

function hasCommand(cmd) {
  const isWin = process.platform === 'win32';
  const checkCmd = isWin ? 'where' : 'which';
  try {
    const res = spawnSync(checkCmd, [cmd], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. Téléchargement via curl ou PowerShell
// ═══════════════════════════════════════════════════════════════
function downloadWithCurl(url, destPath, proxy) {
  return new Promise((resolve, reject) => {
    const args = [
      '-L', // Suivre les redirections (HF redirige vers CDN)
      '--fail',
      '--retry', '3',
      '--retry-delay', '2',
      '-#', // Barre de progression propre
      '-o', destPath,
      url,
    ];

    if (proxy) {
      args.unshift('-x', proxy);
    }

    logInfo(`Exécution de curl vers ${destPath}...`);
    const curl = spawn('curl', args, { stdio: 'inherit' });

    curl.on('error', (err) => reject(err));
    curl.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl a quitté avec le code d'erreur ${code}`));
    });
  });
}

function downloadWithPowershell(url, destPath, proxy) {
  return new Promise((resolve, reject) => {
    let script = '';
    if (proxy) {
      script += `$env:HTTP_PROXY='${proxy}'; $env:HTTPS_PROXY='${proxy}'; `;
    }
    script += `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; `;
    script += `Write-Host 'Téléchargement via PowerShell...' -ForegroundColor Cyan; `;
    script += `Invoke-WebRequest -Uri '${url}' -OutFile '${destPath}' -UseBasicParsing`;

    const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      stdio: 'inherit',
    });

    ps.on('error', (err) => reject(err));
    ps.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`PowerShell a quitté avec le code ${code}`));
    });
  });
}

async function downloadModel(modelDef) {
  const targetPath = resolveModelPath(modelDef);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const tempPath = targetPath + '.download.tmp';

  log(`\n${colors.bold}${colors.blue}════════════════════════════════════════════════════════════════════${colors.reset}`);
  log(`${colors.bold}📥 Téléchargement : ${modelDef.title}${colors.reset}`);
  log(`   Fichier : ${colors.cyan}${modelDef.filename}${colors.reset}`);
  log(`   Cible   : ${colors.gray}${targetPath}${colors.reset}`);
  log(`   URL     : ${colors.gray}${modelDef.url}${colors.reset}`);
  if (httpsProxy) {
    log(`   Proxy   : ${colors.yellow}${httpsProxy}${colors.reset}`);
  }
  log(`${colors.bold}${colors.blue}════════════════════════════════════════════════════════════════════${colors.reset}`);

  // Nettoyage d'un éventuel téléchargement temporaire antérieur
  if (fs.existsSync(tempPath)) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Ignorer si verrouillé
    }
  }

  const isWindows = process.platform === 'win32';
  const curlAvailable = hasCommand('curl');

  if (curlAvailable) {
    await downloadWithCurl(modelDef.url, tempPath, httpsProxy);
  } else if (isWindows) {
    await downloadWithPowershell(modelDef.url, tempPath, httpsProxy);
  } else {
    throw new Error("Aucun outil de téléchargement compatible trouvé ('curl' est requis sous Linux/macOS).");
  }

  // Renommage atomique du fichier temporaire
  if (!fs.existsSync(tempPath)) {
    throw new Error('Le fichier téléchargé est introuvable.');
  }

  // Vérification de la taille finale
  const stat = fs.statSync(tempPath);
  if (stat.size < modelDef.minSizeBytes) {
    fs.unlinkSync(tempPath);
    throw new Error(`Téléchargement incomplet : ${formatBytes(stat.size)} reçu, minimum attendu ${formatBytes(modelDef.minSizeBytes)}.`);
  }

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
    } catch {
      // Ignorer
    }
  }

  fs.renameSync(tempPath, targetPath);
  logSuccess(`Modèle enregistré avec succès : ${targetPath} (${formatBytes(stat.size)})\n`);
}

// ═══════════════════════════════════════════════════════════════
// 6. Point d'entrée principal
// ═══════════════════════════════════════════════════════════════
async function main() {
  log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.bold}${colors.cyan}║   VÉRIFICATION ET TÉLÉCHARGEMENT DES MODÈLES IA GGUF (OFFLINE)     ║${colors.reset}`);
  log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let pendingDownloads = [];

  for (const model of MODELS) {
    const targetPath = resolveModelPath(model);
    const status = checkModelFile(targetPath, model.minSizeBytes);

    log(`🔎 ${colors.bold}${model.title}${colors.reset}`);
    log(`   Chemin : ${targetPath}`);

    if (status.valid) {
      logSuccess(`Fichier valide présent sur le disque (${formatBytes(status.size)})\n`);
    } else {
      if (status.exists) {
        logWarn(`Présent mais invalide : ${status.reason}`);
      } else {
        logInfo(`Modèle non installé`);
      }
      pendingDownloads.push(model);
    }
  }

  if (pendingDownloads.length === 0) {
    logSuccess('Tous les modèles IA (ALLaM 7B et BGE-M3) sont déjà installés et prêts à l\'emploi.');
    process.exit(0);
  }

  logInfo(`${pendingDownloads.length} modèle(s) à télécharger.\n`);

  for (const model of pendingDownloads) {
    try {
      await downloadModel(model);
    } catch (err) {
      logError(`Échec du téléchargement pour ${model.title} : ${err.message}`);
      process.exit(1);
    }
  }

  logSuccess('Téléchargement de tous les modèles IA terminé avec succès !');
  process.exit(0);
}

// Exécution si appelé directement
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    logError(`Erreur fatale : ${err.message}`);
    process.exit(1);
  });
}
