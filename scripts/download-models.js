/**
 * scripts/download-models.js
 * Script de téléchargement résilient des modèles IA souverains GGUF
 * (ALLaM 7B Instruct preview Q4_K_M et BGE-M3 Multilingual Q4_K_M).
 *
 * CARACTÉRISTIQUES :
 * 1. Zéro sortie prématurée ou blocage lié à NODE_ENV.
 * 2. Prise en charge automatique des proxys d'entreprise (HTTPS_PROXY / HTTP_PROXY).
 * 3. Reprise sur coupure réseau via curl (-C -) avec 5 tentatives de retry automatique.
 * 4. Contrôle d'intégrité strict pré et post-téléchargement par seuil de taille.
 * 5. Affichage d'un récapitulatif détaillé avec tailles formatées.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

// 1. Charger les variables d'environnement (.env racine puis backend/.env)
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

// Helper pour formater les octets en Ko / Mo / Go
function formatBytes(bytes) {
  if (bytes === 0) return '0 Octet';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 2. Définition du répertoire cible
const modelsDir = path.join(process.cwd(), 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// 3. Détection du proxy
const proxyUrl = process.env.HTTPS_PROXY
  || process.env.https_proxy
  || process.env.HTTP_PROXY
  || process.env.http_proxy
  || null;

// 4. Liste des modèles à télécharger avec URLs directes et tailles minimales
const MODELS = [
  {
    id: 'allam',
    name: 'ALLaM 7B Instruct',
    filename: 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf',
    // Alternative possible sans préfixe si déjà présente
    altFilenames: ['ALLaM-7B-Instruct-preview-Q4_K_M.gguf'],
    url: process.env.ALLAM_MODEL_URL
      || 'https://huggingface.co/bartowski/ALLaM-AI_ALLaM-7B-Instruct-preview-GGUF/resolve/main/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf',
    minSizeBytes: 3 * 1024 * 1024 * 1024, // Minimum 3.0 Go
    targetDisplay: '~4.26 Go'
  },
  {
    id: 'bge-m3',
    name: 'BGE-M3 Multilingual',
    filename: 'bge-m3-q4_k_m.gguf',
    altFilenames: ['bge-m3-Q4_K_M.gguf'],
    url: process.env.BGEM3_MODEL_URL
      || 'https://huggingface.co/gpustack/bge-m3-GGUF/resolve/main/bge-m3-Q4_K_M.gguf',
    minSizeBytes: 300 * 1024 * 1024, // Minimum 300 Mo
    targetDisplay: '~417 Mo'
  }
];

// Helper pour exécuter curl via spawn
function runCurlDownload(url, outputPath, proxy) {
  return new Promise((resolve, reject) => {
    const curlArgs = [
      '-L',               // Suivre les redirections HTTP (crucial pour CDN Hugging Face)
      '-C', '-',          // Reprendre automatiquement le téléchargement si interrompu
      '--retry', '5',     // Réessayer 5 fois en cas de coupure temporaire
      '--retry-delay', '3',
      '--fail',           // Échouer si code HTTP >= 400
      '--progress-bar'    // Afficher une barre de progression claire
    ];

    if (proxy) {
      curlArgs.push('-x', proxy);
    }

    curlArgs.push('-o', outputPath);
    curlArgs.push(url);

    console.log(`\n⏳ Lancement du téléchargement curl vers :\n   ${outputPath}`);
    console.log(`   Source : ${url}`);
    if (proxy) {
      console.log(`   Proxy  : ${proxy}`);
    }

    const curlProcess = spawn('curl', curlArgs, {
      stdio: 'inherit'
    });

    curlProcess.on('error', (err) => {
      reject(new Error(`Impossible de lancer curl : ${err.message}`));
    });

    curlProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`curl s'est terminé avec le code d'erreur ${code}`));
      }
    });
  });
}

// Fonction principale de gestion des téléchargements
async function downloadAllModels() {
  console.log('======================================================================');
  console.log('🤖 TÉLÉCHARGEMENT DES MODÈLES IA SOUVERAINS GGUF');
  console.log('======================================================================');
  console.log(`📁 Répertoire de destination : ${modelsDir}`);
  if (proxyUrl) {
    console.log(`🌐 Proxy détecté et actif  : ${proxyUrl}`);
  } else {
    console.log(`🌐 Connexion réseau directe (aucun proxy spécifié)`);
  }
  console.log('======================================================================\n');

  const results = [];
  let hasErrors = false;

  for (const model of MODELS) {
    const targetPath = path.join(modelsDir, model.filename);
    console.log(`\n──────────────────────────────────────────────────────────────────────`);
    console.log(`📦 Modèle : ${model.name} (${model.filename})`);
    console.log(`   Taille attendue : ${model.targetDisplay} (seuil min : ${formatBytes(model.minSizeBytes)})`);
    console.log(`──────────────────────────────────────────────────────────────────────`);

    // 1. Vérifier si le fichier principal ou un alias valide existe déjà avec la bonne taille
    let existingPath = null;
    if (fs.existsSync(targetPath)) {
      existingPath = targetPath;
    } else if (model.altFilenames) {
      for (const alt of model.altFilenames) {
        const altPath = path.join(modelsDir, alt);
        if (fs.existsSync(altPath)) {
          existingPath = altPath;
          break;
        }
      }
    }

    if (existingPath) {
      const stats = fs.statSync(existingPath);
      if (stats.size >= model.minSizeBytes) {
        console.log(`✅ Déjà téléchargé et intègre : ${path.basename(existingPath)} (${formatBytes(stats.size)})`);
        results.push({
          name: model.name,
          filename: path.basename(existingPath),
          status: 'OK',
          size: formatBytes(stats.size),
          alreadyPresent: true
        });
        continue;
      } else {
        console.warn(`⚠️ Fichier incomplet détecté (${formatBytes(stats.size)} < ${formatBytes(model.minSizeBytes)}). Reprise...`);
      }
    }

    // 2. Téléchargement via curl
    try {
      await runCurlDownload(model.url, targetPath, proxyUrl);

      // 3. Vérification de la taille après téléchargement
      if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        if (stats.size >= model.minSizeBytes) {
          console.log(`✅ Téléchargement réussi et intégrité validée (${formatBytes(stats.size)})`);
          results.push({
            name: model.name,
            filename: model.filename,
            status: 'OK',
            size: formatBytes(stats.size),
            alreadyPresent: false
          });
        } else {
          console.error(`❌ ÉCHEC D'INTÉGRITÉ : Taille obtenue (${formatBytes(stats.size)}) inférieure à ${formatBytes(model.minSizeBytes)}.`);
          console.error(`🗑️ Suppression du fichier incomplet / corrompu...`);
          try {
            fs.unlinkSync(targetPath);
          } catch (e) {
            console.warn(`Avertissement suppression : ${e.message}`);
          }
          hasErrors = true;
          results.push({
            name: model.name,
            filename: model.filename,
            status: 'ÉCHEC (Taille invalide)',
            size: formatBytes(stats.size)
          });
        }
      } else {
        console.error(`❌ ERREUR : Le fichier cible n'existe pas après téléchargement.`);
        hasErrors = true;
        results.push({
          name: model.name,
          filename: model.filename,
          status: 'ÉCHEC (Fichier absent)',
          size: '0 Octet'
        });
      }
    } catch (err) {
      console.error(`❌ ERREUR LORS DU TÉLÉCHARGEMENT : ${err.message}`);
      hasErrors = true;
      results.push({
        name: model.name,
        filename: model.filename,
        status: `ÉCHEC (${err.message})`,
        size: 'N/A'
      });
    }
  }

  // 4. Rapport et récapitulatif final
  console.log('\n======================================================================');
  console.log('📋 RÉCAPITULATIF DES MODÈLES IA SOUVERAINS');
  console.log('======================================================================');
  results.forEach(res => {
    const icon = res.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${res.name.padEnd(22)} : ${res.status.padEnd(8)} (${res.size}) -> ${res.filename}`);
  });
  console.log('======================================================================\n');

  if (hasErrors) {
    console.error('⚠️ Un ou plusieurs modèles n\'ont pas pu être téléchargés correctement.');
    console.error('   Vérifiez votre connexion internet, proxy ou espace disque.');
    process.exit(1);
  } else {
    console.log('🎉 Tous les modèles requis sont prêts pour l\'inférence souveraine locale !');
    process.exit(0);
  }
}

// Lancement immédiat sans blocage
downloadAllModels().catch(err => {
  console.error('Erreur inattendue dans le script de téléchargement :', err);
  process.exit(1);
});
