/**
 * ecosystem.config.cjs — Configuration PM2 pour le déploiement en production
 * Application : DMS (Courrier Hybride, Ressources Humaines & IA Souveraine GGUF)
 * Compatible Linux (Ubuntu/Debian) et Windows Server.
 *
 * Utilisation :
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup (Linux) ou install-service.ps1 (Windows)
 */

const fs = require('fs');

// Détection dynamique de l'exécutable tsx selon le système d'exploitation
let tsxInterpreter = './node_modules/.bin/tsx';
if (process.platform === 'win32') {
  tsxInterpreter = fs.existsSync('./node_modules/.bin/tsx.cmd')
    ? './node_modules/.bin/tsx.cmd'
    : 'tsx';
}

module.exports = {
  apps: [
    {
      name: 'dms-backend',
      script: 'server.ts',
      interpreter: tsxInterpreter,
      // Mode fork obligatoire : 1 seule instance car l'inférence locale GGUF (node-llama-cpp)
      // alloue la mémoire RAM/VRAM pour ALLaM 7B et BGE-M3 (le mode cluster dupliquerait les modèles en RAM)
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '6G',
      min_uptime: '15s',
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 8000,
      // Variables d'environnement pour la production
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Fichiers de logs relatifs pour compatibilité multi-OS
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
