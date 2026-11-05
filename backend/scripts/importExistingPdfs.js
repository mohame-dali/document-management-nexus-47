/**
 * backend/scripts/importExistingPdfs.js
 * Script d'importation optimisé (Anti-OOM) des fichiers PDF manuels vers MongoDB
 *
 * OPTIMISATIONS APPLIQUÉES :
 * 1. Zéro OCR lourd : Texte indicatif immédiat sans sollicitation CPU/RAM
 * 2. Zéro chargement de modèle IA : Utilisation de insertMany({ ordered: false })
 *    qui contourne les hooks post('save') et évite le chargement en RAM de ALLaM 7B / BGE-M3
 * 3. Batching & Pause système : Pause toutes les 50 créations et garbage collector optionnel
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Department = require('../models/Department');
const User = require('../models/User');

// Helper pour temporiser
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function importExistingPdfs() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';
  console.log('======================================================================');
  console.log('🚀 DÉMARRAGE DU SCRIPT D\'IMPORTATION OPTIMISÉ (ANTI-OOM KILL)');
  console.log(`🔗 Connexion MongoDB : ${dbUri.split('@').pop()}`);
  console.log('======================================================================\n');

  try {
    await mongoose.connect(dbUri);
    console.log('✅ Connecté avec succès à MongoDB.');

    // Récupérer ou initialiser le département Bureau d'Ordre pour l'assignation
    let defaultDepartment = await Department.findOne({
      $or: [
        { name: /Bureau d'Ordre/i },
        { name: /Direction/i },
        { name: /Administrat/i }
      ]
    });

    if (!defaultDepartment) {
      defaultDepartment = await Department.findOne();
    }

    if (!defaultDepartment) {
      // Création automatique de fallback si aucun département n'existe
      defaultDepartment = new Department({
        name: "Bureau d'Ordre",
        description: "Bureau d'Ordre Central (créé automatiquement pour l'import)"
      });
      await defaultDepartment.save();
      console.log(`ℹ️ Département par défaut créé : "${defaultDepartment.name}" (${defaultDepartment._id})`);
    } else {
      console.log(`ℹ️ Département d'assignation : "${defaultDepartment.name}" (${defaultDepartment._id})`);
    }

    // Récupérer un utilisateur système pour le champ createdBy si présent
    const defaultUser = await User.findOne({ isDeleted: { $ne: true } });
    const defaultUserId = defaultUser ? defaultUser._id : null;

    const years = [2024, 2025, 2026];
    const stats = {
      incoming: { imported: 0, skipped: 0, errors: 0, byYear: {} },
      outgoing: { imported: 0, skipped: 0, errors: 0, byYear: {} }
    };

    // Chemins racine possibles pour le dossier courrier
    const possibleCourrierRoots = [
      path.join(__dirname, '../courrier'),
      path.join(process.cwd(), 'backend/courrier'),
      path.join(process.cwd(), 'courrier')
    ];
    const courrierRoot = possibleCourrierRoots.find(p => fs.existsSync(p)) || possibleCourrierRoots[0];
    console.log(`📁 Répertoire racine courrier détecté : ${courrierRoot}\n`);

    let globalCounter = 0;

    for (const year of years) {
      stats.incoming.byYear[year] = 0;
      stats.outgoing.byYear[year] = 0;

      console.log(`----------------------------------------------------------------------`);
      console.log(`📅 ANALYSE DE L'ANNÉE ${year}`);
      console.log(`----------------------------------------------------------------------`);

      const yearDir = path.join(courrierRoot, String(year));
      if (!fs.existsSync(yearDir)) {
        console.log(`ℹ️ Aucun dossier trouvé pour l'année ${year} (${yearDir})`);
        continue;
      }

      // ----------------------------------------------------------------
      // 1. IMPORTATION DES COURRIERS ENTRANTS (Incoming-Doc)
      // ----------------------------------------------------------------
      const incomingDir = path.join(yearDir, 'Incoming-Doc');
      if (fs.existsSync(incomingDir)) {
        const files = fs.readdirSync(incomingDir).filter(f => f.toLowerCase().endsWith('.pdf'));
        console.log(`\n📥 [${year}] Dossier Incoming-Doc : ${files.length} fichier(s) PDF détecté(s)`);

        for (const file of files) {
          const serialNumberMatch = file.match(/^(\d+)/);
          if (!serialNumberMatch) {
            console.warn(`⚠️ Nom de fichier non numérique ignoré : ${file}`);
            continue;
          }
          const serialNumber = parseInt(serialNumberMatch[1], 10);
          const fullPath = path.join(incomingDir, file);

          try {
            // Vérifier si le document existe déjà en base
            const existingDoc = await IncomingDocument.findOne({
              serialNumber,
              year,
              isDeleted: { $ne: true }
            }).select('_id').lean();

            if (existingDoc) {
              console.log(`⏭️ Fichier ${file} ignoré (Déjà en base : #${serialNumber}/${year})`);
              stats.incoming.skipped++;
              continue;
            }

            // OPTIMISATION ANTI-OOM : Aucun OCR lourd durant l'import
            const ocrText = "Document importé manuellement. En attente d'OCR.";

            // Formater le chemin relatif pour la base
            const relativeScannedPath = `courrier/${year}/Incoming-Doc/${file}`;
            const seqStr = String(serialNumber).padStart(3, '0');
            const fileStat = fs.statSync(fullPath);
            const arrivalDate = fileStat.mtime || new Date();

            const docData = {
              serialNumber,
              year,
              arrivalDate,
              correspondenceNumber: `IMP-${year}-${seqStr}`,
              correspondenceDate: arrivalDate,
              typeDocument: 'Courrier Officiel (Importé)',
              source: 'Importation Manuelle',
              subject: `Document importé ${serialNumber}/${year}`,
              scannedDocument: relativeScannedPath,
              ocrText,
              assignedTo: [{
                id: defaultDepartment._id,
                name: defaultDepartment.name
              }],
              createdBy: defaultUserId,
              isDeleted: false
            };

            // OPTIMISATION ANTI-OOM : insertMany sans déclencher le hook post('save') RAG
            await IncomingDocument.insertMany([docData], { ordered: false });
            stats.incoming.imported++;
            stats.incoming.byYear[year]++;
            console.log(`✅ Fichier ${file} importé (Année ${year}, Incoming #${serialNumber})`);

            globalCounter++;

            // Batching & Respiration mémoire
            if (globalCounter % 50 === 0) {
              console.log(`⏸️ Pause de 2 secondes après ${globalCounter} fichiers traités pour laisser le système respirer...`);
              await sleep(2000);
            }

            if (globalCounter % 100 === 0 && global.gc) {
              global.gc();
            }
          } catch (err) {
            console.error(`❌ Erreur lors de l'importation de ${file} (Incoming) :`, err.message);
            stats.incoming.errors++;
          }
        }
      } else {
        console.log(`ℹ️ Aucun sous-dossier Incoming-Doc pour ${year}`);
      }

      // ----------------------------------------------------------------
      // 2. IMPORTATION DES COURRIERS SORTANTS (Outgoing-Doc)
      // ----------------------------------------------------------------
      const outgoingDir = path.join(yearDir, 'Outgoing-Doc');
      if (fs.existsSync(outgoingDir)) {
        const outFiles = fs.readdirSync(outgoingDir).filter(f => f.toLowerCase().endsWith('.pdf'));
        console.log(`\n📤 [${year}] Dossier Outgoing-Doc : ${outFiles.length} fichier(s) PDF détecté(s)`);

        for (const file of outFiles) {
          const serialNumberMatch = file.match(/^(\d+)/);
          if (!serialNumberMatch) {
            console.warn(`⚠️ Nom de fichier non numérique ignoré : ${file}`);
            continue;
          }
          const serialNumber = parseInt(serialNumberMatch[1], 10);
          const fullPath = path.join(outgoingDir, file);

          try {
            // Vérifier si le document existe déjà en base
            const existingOutDoc = await OutgoingDocument.findOne({
              serialNumber,
              year,
              isDeleted: { $ne: true }
            }).select('_id').lean();

            if (existingOutDoc) {
              console.log(`⏭️ Fichier ${file} ignoré (Déjà en base : #${serialNumber}/${year})`);
              stats.outgoing.skipped++;
              continue;
            }

            // OPTIMISATION ANTI-OOM : Aucun OCR lourd durant l'import
            const ocrText = "Document importé manuellement. En attente d'OCR.";

            const relativeScannedPath = `courrier/${year}/Outgoing-Doc/${file}`;
            const fileStat = fs.statSync(fullPath);
            const issueDate = fileStat.mtime || new Date();

            const docData = {
              serialNumber,
              year,
              issueDate,
              typeDocument: 'Courrier Sortant (Importé)',
              source: {
                id: defaultDepartment._id,
                name: defaultDepartment.name
              },
              assignedTo: ['Destinataire Inconnu'],
              pourInfo: [],
              subject: `Document sortant importé ${serialNumber}/${year}`,
              scannedDocument: relativeScannedPath,
              ocrText,
              createdBy: defaultUserId,
              isDeleted: false
            };

            // OPTIMISATION ANTI-OOM : insertMany sans déclencher le hook post('save') RAG
            await OutgoingDocument.insertMany([docData], { ordered: false });
            stats.outgoing.imported++;
            stats.outgoing.byYear[year]++;
            console.log(`✅ Fichier ${file} importé (Année ${year}, Outgoing #${serialNumber})`);

            globalCounter++;

            // Batching & Respiration mémoire
            if (globalCounter % 50 === 0) {
              console.log(`⏸️ Pause de 2 secondes après ${globalCounter} fichiers traités pour laisser le système respirer...`);
              await sleep(2000);
            }

            if (globalCounter % 100 === 0 && global.gc) {
              global.gc();
            }
          } catch (err) {
            console.error(`❌ Erreur lors de l'importation de ${file} (Outgoing) :`, err.message);
            stats.outgoing.errors++;
          }
        }
      } else {
        console.log(`ℹ️ Aucun sous-dossier Outgoing-Doc pour ${year}`);
      }
    }

    // ------------------------------------------------------------------
    // RÉCAPITULATIF FINAL
    // ------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('✨ RÉCAPITULATIF DE L\'IMPORTATION DES FICHIERS PDF (MODE ALLÉGÉ)');
    console.log('======================================================================');
    console.log(`📥 COURRIERS ENTRANTS (Incoming) :`);
    console.log(`   - Importés avec succès : ${stats.incoming.imported}`);
    console.log(`   - Déjà en base (ignorés) : ${stats.incoming.skipped}`);
    console.log(`   - Erreurs rencontrées : ${stats.incoming.errors}`);
    for (const y of years) {
      console.log(`     • ${y} : ${stats.incoming.byYear[y]} importé(s)`);
    }

    console.log(`\n📤 COURRIERS SORTANTS (Outgoing) :`);
    console.log(`   - Importés avec succès : ${stats.outgoing.imported}`);
    console.log(`   - Déjà en base (ignorés) : ${stats.outgoing.skipped}`);
    console.log(`   - Erreurs rencontrées : ${stats.outgoing.errors}`);
    for (const y of years) {
      console.log(`     • ${y} : ${stats.outgoing.byYear[y]} importé(s)`);
    }

    const totalImported = stats.incoming.imported + stats.outgoing.imported;
    const totalSkipped = stats.incoming.skipped + stats.outgoing.skipped;
    console.log(`----------------------------------------------------------------------`);
    console.log(`🏁 TOTAL GLOBAL : ${totalImported} importé(s), ${totalSkipped} déjà existant(s)`);
    console.log('======================================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (fatalError) {
    console.error('\n❌ ERREUR FATALE LORS DE L\'IMPORTATION :', fatalError);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  importExistingPdfs();
}

module.exports = importExistingPdfs;
