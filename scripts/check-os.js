#!/usr/bin/env node
/**
 * scripts/check-os.js
 * Script de diagnostic d'environnement exécuté après l'installation npm (postinstall)
 * Identifie l'OS, vérifie les prérequis et guide l'administrateur
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
};

const rootDir = path.resolve(__dirname, '..');
const modelsDir = path.join(rootDir, 'models');

// Garantir l'existence du dossier models
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const platform = os.platform();
const arch = os.arch();
const nodeVer = process.version;

let platformLabel = 'Système Inconnu';
if (platform === 'linux') platformLabel = 'Linux (Ubuntu/Debian compatible)';
else if (platform === 'win32') platformLabel = 'Windows 10/11 / Windows Server';
else if (platform === 'darwin') platformLabel = 'macOS';

console.log(`\n${colors.cyan}------------------------------------------------------------${colors.reset}`);
console.log(`${colors.bold}🖥️  DMS System Check : ${platformLabel} [${arch}] | Node ${nodeVer}${colors.reset}`);

// Vérification de la présence des modèles GGUF
const allamPath = path.join(modelsDir, 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf');
const bgePath = path.join(modelsDir, 'bge-m3-q4_k_m.gguf');

const hasAllam = fs.existsSync(allamPath);
const hasBge = fs.existsSync(bgePath);

if (hasAllam && hasBge) {
  console.log(`${colors.green}✅ Modèles IA GGUF (ALLaM 7B & BGE-M3) présents dans ./models/${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️  Modèles IA GGUF non installés.${colors.reset}`);
  console.log(`   Pour installer le système complet : ${colors.bold}npm run setup${colors.reset}`);
  console.log(`   Pour télécharger uniquement les modèles : ${colors.bold}npm run download-models${colors.reset}`);
}
console.log(`${colors.cyan}------------------------------------------------------------${colors.reset}\n`);

// Toujours quitter avec succès pour ne pas bloquer npm install
process.exit(0);
