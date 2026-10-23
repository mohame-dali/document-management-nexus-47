#!/usr/bin/env node
/**
 * scripts/run-setup.js
 * Orchestrateur universel d'installation du système (OS + IA + Modèles)
 * Détecte la plateforme et exécute le script approprié
 */

import os from 'os';
import { spawn } from 'child_process';
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
  red: '\x1b[31m',
};

const rootDir = path.resolve(__dirname, '..');
const platform = os.platform();

console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}║             ORCHESTRATEUR DE CONFIGURATION SYSTÈME & IA            ║${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`La commande ${cmd} ${args.join(' ')} a échoué avec le code ${code}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  if (platform === 'linux') {
    console.log(`${colors.cyan}[OS]${colors.reset} Système Linux détecté. Lancement du script Ubuntu/Debian...`);
    const setupScript = path.join(rootDir, 'scripts', 'setup-ubuntu.sh');
    try {
      await runCommand('bash', [setupScript]);
    } catch (err) {
      console.warn(`\n${colors.yellow}[NOTE]${colors.reset} L'installation des paquets système via apt requiert des droits administrateur.`);
      console.log(`Pour installer manuellement les dépendances système :`);
      console.log(`  ${colors.bold}sudo bash scripts/setup-ubuntu.sh${colors.reset}\n`);
      console.log(`Lancement direct du téléchargement des modèles IA...`);
      await runCommand('node', [path.join(rootDir, 'scripts', 'download-models.js')]);
    }
  } else if (platform === 'win32') {
    console.log(`${colors.cyan}[OS]${colors.reset} Système Windows détecté. Lancement du script PowerShell...`);
    const psScript = path.join(rootDir, 'scripts', 'setup-windows.ps1');
    try {
      await runCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psScript]);
    } catch (err) {
      console.warn(`\n${colors.yellow}[NOTE]${colors.reset} L'exécution PowerShell a rencontré une restriction.`);
      console.log(`Pour exécuter le script dans PowerShell Administrateur :`);
      console.log(`  ${colors.bold}powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1${colors.reset}\n`);
      console.log(`Lancement direct du téléchargement des modèles IA...`);
      await runCommand('node', [path.join(rootDir, 'scripts', 'download-models.js')]);
    }
  } else {
    console.log(`${colors.cyan}[OS]${colors.reset} Système (${platform}) détecté. Lancement direct du téléchargement des modèles...`);
    await runCommand('node', [path.join(rootDir, 'scripts', 'download-models.js')]);
  }
}

main().catch((err) => {
  console.error(`\n${colors.red}[ERREUR FATALE]${colors.reset} ${err.message}`);
  process.exit(1);
});
