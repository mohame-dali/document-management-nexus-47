import fs from 'fs';
import path from 'path';

const modelsDir = path.join(process.cwd(), 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

console.log('[download-models] Répertoire models vérifié :', modelsDir);
console.log('[download-models] Mode développement / aperçu actif.');
process.exit(0);
