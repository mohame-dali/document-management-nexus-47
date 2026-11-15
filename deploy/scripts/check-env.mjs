#!/usr/bin/env node
/**
 * ==============================================================================
 * deploy/scripts/check-env.mjs
 * Script de vérification d'intégrité de l'environnement de production DMS
 * [NON TESTÉ, à exécuter sur une VM de recette]
 * ==============================================================================
 * Rôle :
 *   Valide toutes les variables d'environnement, les permissions, la conformité
 *   du secret JWT (longueur et absence de valeurs par défaut connues) et la
 *   présence des répertoires de données avant de démarrer le service en production.
 *
 * Utilisation :
 *   node deploy/scripts/check-env.mjs
 *
 * Code de sortie :
 *   0 = Environnement conforme
 *   1 = Au moins un problème bloquant détecté (démarrage interdit)
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';

// Liste des valeurs par défaut formellement interdites en production pour JWT_SECRET
const FORBIDDEN_JWT_SECRETS = [
  'votre_secret_super_securise_123',
  'dms_dev_jwt_secret_key_64_bytes_secure_random_fallback_token_2026',
  'CHANGE_ME_GENERATE_AT_LEAST_64_CHARACTERS_HEX_SECRET',
  'secret',
  'password',
  'admin',
  '12345678',
  'jwt_secret',
];

const MIN_JWT_SECRET_LENGTH = 32;
const EXPECTED_PORT = '5000';

let hasErrors = false;
let hasWarnings = false;

console.log('═'.repeat(78));
console.log('🔍 DMS — CONTRÔLE DE L\'ENVIRONNEMENT DE PRODUCTION (PRE-FLIGHT CHECK)');
console.log('═'.repeat(78));

// 1. Contrôle de la version de Node.js (Exige Node >= 22)
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
console.log(`\n[Node.js] Version détectée : ${nodeVersion}`);
if (majorVersion < 22) {
  console.error(`  ❌ ERREUR : Node.js >= 22.x requis pour la production (version actuelle : ${nodeVersion})`);
  hasErrors = true;
} else {
  console.log('  ✅ Version de Node.js conforme (>= 22.x).');
}

// 2. Contrôle de NODE_ENV
console.log('\n[Environnement] Contrôle de NODE_ENV :');
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv !== 'production') {
  console.error(`  ❌ ERREUR : NODE_ENV doit être fixé à 'production' (actuellement : '${nodeEnv || 'NON DÉFINI'}')`);
  hasErrors = true;
} else {
  console.log('  ✅ NODE_ENV=production configuré.');
}

// 3. Contrôle du PORT unique (3000)
console.log(`\n[Réseau] Contrôle du port d'écoute Express (attendu : ${EXPECTED_PORT}) :`);
const port = process.env.PORT || '3000';
if (port !== EXPECTED_PORT) {
  console.warn(`  ⚠️ AVERTISSEMENT : PORT est configuré sur '${port}'. Le port standard retenu pour ce déploiement est ${EXPECTED_PORT}.`);
  hasWarnings = true;
} else {
  console.log(`  ✅ PORT=${port} conforme aux configurations Nginx/IIS.`);
}

// 4. Contrôle critique du JWT_SECRET
console.log('\n[Sécurité] Contrôle de la clé de signature JWT (JWT_SECRET) :');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('  ❌ ERREUR CRITIQUE : Variable JWT_SECRET ABSENTE de l\'environnement !');
  hasErrors = true;
} else {
  const secretLen = jwtSecret.length;
  console.log(`  ℹ️ Présence confirmée : OUI (Longueur : ${secretLen} caractères)`);

  if (secretLen < MIN_JWT_SECRET_LENGTH) {
    console.error(`  ❌ ERREUR CRITIQUE : JWT_SECRET trop court (${secretLen} car.). Minimum exigé : ${MIN_JWT_SECRET_LENGTH} caractères.`);
    hasErrors = true;
  } else {
    console.log(`  ✅ Longueur suffisante (>= ${MIN_JWT_SECRET_LENGTH} caractères).`);
  }

  // Vérification de non-utilisation des valeurs faibles/connues
  const lowerSecret = jwtSecret.toLowerCase();
  const matchedForbidden = FORBIDDEN_JWT_SECRETS.find(f => lowerSecret === f.toLowerCase() || lowerSecret.includes(f.toLowerCase()));
  if (matchedForbidden) {
    console.error('  ❌ ERREUR CRITIQUE : JWT_SECRET utilise une clé par défaut connue ou un placeholder non remplacé !');
    console.error('     Générez une clé cryptographique forte avec : node -e "console.log(crypto.randomBytes(48).toString(\'hex\'))"');
    hasErrors = true;
  } else {
    console.log('  ✅ Clé personnalisée forte (aucune signature par défaut connue détectée).');
  }

  // Contrôle de sécurité statique : vérifie si server.ts contient un fallback hardcodé (signalement sans bloquer)
  try {
    const serverPath = path.join(process.cwd(), 'server.ts');
    if (fs.existsSync(serverPath)) {
      const serverCode = fs.readFileSync(serverPath, 'utf8');
      const lines = serverCode.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('process.env.JWT_SECRET =') || (line.includes('JWT_SECRET ||') && !line.includes('if (!process.env.JWT_SECRET)'))) {
          console.warn(`  ⚠️ SIGNALEMENT SÉCURITÉ : server.ts:${idx + 1} affecte un fallback de JWT_SECRET en mémoire :`);
          console.warn(`     ${line.trim()}`);
          console.warn(`     [ATTENTION] Si JWT_SECRET est absent du .env en dev, cette valeur par défaut est active.`);
          hasWarnings = true;
        }
      });
    }
  } catch (err) {
    // Ignorer si lecture impossible
  }
}

// 5. Contrôle de MONGODB_URI
console.log('\n[Base de données] Contrôle de la chaîne de connexion MongoDB (MONGODB_URI) :');
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('  ❌ ERREUR CRITIQUE : Variable MONGODB_URI ABSENTE de l\'environnement !');
  hasErrors = true;
} else {
  const isPlaceholder = mongoUri.includes('CHANGE_ME');
  if (isPlaceholder) {
    console.error('  ❌ ERREUR : MONGODB_URI contient le placeholder \'CHANGE_ME\'. Renseignez les identifiants réels.');
    hasErrors = true;
  } else {
    // Vérifier sans afficher de secret
    const hasAuth = mongoUri.includes('@');
    const isLocal = mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost');
    console.log(`  ✅ Chaîne MONGODB_URI renseignée (Hôte local : ${isLocal ? 'OUI' : 'NON'}, Auth présente : ${hasAuth ? 'OUI' : 'NON'}).`);
  }
}

// 6. Contrôle des répertoires de données physiques
console.log('\n[Stockage] Contrôle des répertoires de données :');
const storageDirs = [
  { name: 'DOCUMENT_PATH (Courrier)', path: process.env.DOCUMENT_PATH || path.join(process.cwd(), 'backend', 'courrier') },
  { name: 'UPLOAD_DIR (Téléversements)', path: process.env.UPLOAD_DIR || path.join(process.cwd(), 'backend', 'uploads') },
  { name: 'BACKUP_DIR (Sauvegardes)', path: process.env.BACKUP_DIR || path.join(process.cwd(), 'backend', 'backups') },
];

for (const dir of storageDirs) {
  if (fs.existsSync(dir.path)) {
    try {
      // Test de droit d'écriture
      const testFile = path.join(dir.path, `.perm_check_${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`  ✅ ${dir.name} : Répertoire accessible en lecture/écriture (${dir.path})`);
    } catch (err) {
      console.error(`  ❌ ERREUR : Droits d'écriture insuffisants sur ${dir.name} (${dir.path}) : ${err.message}`);
      hasErrors = true;
    }
  } else {
    console.warn(`  ⚠️ AVERTISSEMENT : Le répertoire ${dir.name} n'existe pas encore (${dir.path}). Le script de déploiement doit le créer (mkdir -p).`);
    hasWarnings = true;
  }
}

// 7. Contrôle des modèles IA GGUF
console.log('\n[Intelligence Artificielle] Contrôle des modèles locaux GGUF :');
const chatModelPath = process.env.LLAMA_CHAT_MODEL_PATH || path.join(process.cwd(), 'models', 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf');
const embedModelPath = process.env.LLAMA_EMBEDDING_MODEL_PATH || path.join(process.cwd(), 'models', 'bge-m3-q4_k_m.gguf');

if (fs.existsSync(chatModelPath)) {
  const stats = fs.statSync(chatModelPath);
  const sizeGb = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
  console.log(`  ✅ Modèle Chat présent : ${path.basename(chatModelPath)} (${sizeGb} Go)`);
} else {
  console.warn(`  ⚠️ AVERTISSEMENT : Modèle Chat absent (${chatModelPath}). Le serveur démarrera en mode dégradé (sans IA locale).`);
  hasWarnings = true;
}

if (fs.existsSync(embedModelPath)) {
  const stats = fs.statSync(embedModelPath);
  const sizeGb = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
  console.log(`  ✅ Modèle Embedding présent : ${path.basename(embedModelPath)} (${sizeGb} Go)`);
} else {
  console.warn(`  ⚠️ AVERTISSEMENT : Modèle Embedding absent (${embedModelPath}). La recherche vectorielle sera désactivée.`);
  hasWarnings = true;
}

// 8. Bilan final
console.log('\n' + '═'.repeat(78));
if (hasErrors) {
  console.error('❌ ÉCHEC DU CONTRÔLE D\'ENVIRONNEMENT : Des anomalies bloquantes ont été détectées.');
  console.error('   Veuillez corriger les points ci-dessus dans votre fichier .env avant de lancer le service.');
  console.log('═'.repeat(78) + '\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️ CONTRÔLE RÉUSSI AVEC AVERTISSEMENTS : L\'environnement est opérationnel mais comporte des points d\'attention.');
  console.log('═'.repeat(78) + '\n');
  process.exit(0);
} else {
  console.log('✅ CONTRÔLE RÉUSSI : Toutes les vérifications de production sont conformes.');
  console.log('═'.repeat(78) + '\n');
  process.exit(0);
}
