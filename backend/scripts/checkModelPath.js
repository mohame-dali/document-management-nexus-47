/**
 * backend/scripts/checkModelPath.js
 * Script de diagnostic des modèles IA GGUF (Chat & Embeddings).
 * Vérifie l'existence des fichiers spécifiés dans le .env, affiche leur taille
 * et fournit des conseils de correction immédiats en cas d'erreur de chemin.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les fichiers d'environnement (.env racine puis .env backend si présent)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

function formatBytes(bytes) {
  if (bytes === 0) return '0 Octet';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function checkModel(label, envVarName, defaultRelativePath) {
  console.log(`\n─────────────────────────────────────────────────────────────`);
  console.log(`🔍 Vérification : [${label}]`);
  console.log(`─────────────────────────────────────────────────────────────`);

  const configuredPath = process.env[envVarName];
  const targetPath = configuredPath || path.resolve(__dirname, defaultRelativePath);

  console.log(`• Variable d'environnement : ${envVarName}`);
  console.log(`• Chemin configuré       : ${configuredPath ? configuredPath : '(non défini, valeur par défaut)'}`);
  console.log(`• Chemin cible résolu    : ${targetPath}`);

  if (configuredPath && !path.isAbsolute(configuredPath)) {
    console.warn(`⚠️ Avertissement : Le chemin spécifié n'est pas absolu. Il est vivement recommandé d'utiliser un chemin absolu (ex: /home/... ou /opt/...).`);
  }

  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.statSync(targetPath);
      if (stats.isDirectory()) {
        console.error(`❌ ERREUR : Le chemin pointe vers un DOSSIER, pas vers un fichier .gguf !`);
        return false;
      }
      console.log(`✅ Fichier TROUVÉ et accessible !`);
      console.log(`   - Nom du fichier : ${path.basename(targetPath)}`);
      console.log(`   - Taille disque  : ${formatBytes(stats.size)} (${stats.size.toLocaleString('fr-FR')} octets)`);
      if (stats.size < 1024 * 1024 * 50) {
        console.warn(`⚠️ Attention : Le fichier fait moins de 50 Mo. Assurez-vous qu'il ne s'agit pas d'un fichier incomplet ou d'un pointeur Git LFS.`);
      }
      return true;
    } catch (err) {
      console.error(`❌ ERREUR lors de la lecture des métadonnées du fichier :`, err.message);
      return false;
    }
  } else {
    console.error(`❌ FICHIER INTROUVABLE :`);
    console.error(`   "${targetPath}"`);

    // Analyse du répertoire parent pour aider l'administrateur
    const dir = path.dirname(targetPath);
    if (fs.existsSync(dir)) {
      console.log(`\n📁 Le dossier parent existe : "${dir}"`);
      try {
        const files = fs.readdirSync(dir);
        const ggufFiles = files.filter(f => f.toLowerCase().endsWith('.gguf'));

        if (ggufFiles.length > 0) {
          console.log(`   Fichiers .gguf détectés dans ce dossier :`);
          ggufFiles.forEach(f => {
            const fStats = fs.statSync(path.join(dir, f));
            console.log(`     • ${f} (${formatBytes(fStats.size)})`);
          });

          // Détection d'un nom proche (ex: préfixe ALLaM-AI_ manquant)
          const targetFilename = path.basename(targetPath);
          const candidate = ggufFiles.find(f =>
            f.includes(targetFilename) ||
            targetFilename.includes(f) ||
            f.replace('ALLaM-AI_', '') === targetFilename.replace('ALLaM-AI_', '')
          );

          if (candidate) {
            console.log(`\n💡 SUGGESTION : Avez-vous voulu désigner le fichier :`);
            console.log(`   ${path.join(dir, candidate)}`);
            console.log(`   👉 Mettez à jour votre fichier .env :`);
            console.log(`      ${envVarName}=${path.join(dir, candidate)}`);
          }
        } else {
          console.log(`   Aucun fichier .gguf trouvé dans ce dossier.`);
          console.log(`   Fichiers présents (${files.length}) : ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        }
      } catch (e) {
        console.warn(`   Impossible de lister le contenu du dossier :`, e.message);
      }
    } else {
      console.error(`\n❌ Le dossier parent n'existe pas non plus : "${dir}"`);
      console.log(`   Vérifiez l'arborescence et le point de montage de votre disque.`);
    }

    return false;
  }
}

function runDiagnostic() {
  console.log('=============================================================');
  console.log('🩺 DIAGNOSTIC DES MODÈLES IA SOUVERAINS (node-llama-cpp)');
  console.log('=============================================================');
  console.log(`Système d'exploitation : ${process.platform} (${process.arch})`);
  console.log(`Node.js version        : ${process.version}`);
  console.log(`Dossier courant (cwd)  : ${process.cwd()}`);

  const chatOk = checkModel(
    'Modèle de Chat & Extraction (ALLaM / Qwen)',
    'LLAMA_CHAT_MODEL_PATH',
    '../../models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf'
  );

  const embedOk = checkModel(
    'Modèle d\'Embedding Vectoriel (BGE-M3 / Nomic)',
    'LLAMA_EMBEDDING_MODEL_PATH',
    '../../models/bge-m3-q4_k_m.gguf'
  );

  console.log('\n=============================================================');
  console.log('📊 BILAN DU DIAGNOSTIC');
  console.log('=============================================================');
  if (chatOk && embedOk) {
    console.log('🎉 TOUS LES MODÈLES SONT PRÉSENTS ET VALIDES !');
    console.log('   Le service IA est prêt pour l\'inférence locale.');
    process.exit(0);
  } else {
    console.log('⚠️ UN OU PLUSIEURS MODÈLES SONT MANQUANTS OU MAL CONFIGURÉS.');
    console.log('   1. Vérifiez les chemins absolus dans backend/.env (ou .env)');
    console.log('   2. Assurez-vous que le nom du fichier correspond exactement au fichier physique.');
    console.log('   3. Consultez MODELS.md ou README_DEPLOY.md pour les instructions de téléchargement.');
    process.exit(1);
  }
}

if (require.main === module) {
  runDiagnostic();
}

module.exports = runDiagnostic;
