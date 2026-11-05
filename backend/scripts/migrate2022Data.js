/**
 * backend/scripts/migrate2022Data.js
 * Script de migration des données de l'année 2022 depuis l'ancienne base (document_management)
 * vers la nouvelle base de données active (document-management).
 *
 * ÉTAPES :
 * 1. Connexion simultanée à la base source et à la base cible
 * 2. Récupération des courriers entrants (incomingdocuments) et sortants (outgoingdocuments) pour year = 2022
 * 3. Insertion par lots avec insertMany({ ordered: false }) pour ignorer les doublons déjà présents
 * 4. Création des index composés { year: 1, createdAt: -1, isDeleted: 1 } sur les deux collections
 * 5. Rapport détaillé et fermeture propre des connexions
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const SOURCE_URI = process.env.SOURCE_MONGODB_URI || 'mongodb://127.0.0.1:27017/document_management';
const TARGET_URI = process.env.TARGET_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';

async function migrateCollection(sourceConn, targetConn, collectionName, year = 2022) {
  console.log(`\n📦 Migration de la collection [${collectionName}] pour l'année ${year}...`);

  const sourceCol = sourceConn.collection(collectionName);
  const targetCol = targetConn.collection(collectionName);

  // Recherche des documents de 2022 (tolérance nombre ou chaîne)
  const query = {
    $or: [
      { year: year },
      { year: String(year) },
      {
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`)
        }
      }
    ]
  };

  const docs = await sourceCol.find(query).toArray();
  console.log(`🔎 ${docs.length} document(s) trouvé(s) dans la base source.`);

  if (docs.length === 0) {
    console.log(`ℹ️ Aucun document à migrer pour [${collectionName}].`);
  } else {
    try {
      const result = await targetCol.insertMany(docs, { ordered: false });
      console.log(`✅ ${result.insertedCount || Object.keys(result.insertedIds).length} document(s) inséré(s) avec succès.`);
    } catch (insertError) {
      if (insertError.code === 11000 || insertError.writeErrors) {
        const inserted = insertError.result?.nInserted ?? (docs.length - (insertError.writeErrors?.length || 0));
        console.log(`⚠️ Des doublons ont été ignorés. Documents insérés avec succès : ${inserted}`);
      } else {
        console.error(`❌ Erreur lors de l'insertion :`, insertError.message);
      }
    }
  }

  // Création de l'index composé { year: 1, createdAt: -1, isDeleted: 1 }
  try {
    console.log(`⚙️ Création de l'index composé { year: 1, createdAt: -1, isDeleted: 1 }...`);
    await targetCol.createIndex(
      { year: 1, createdAt: -1, isDeleted: 1 },
      { name: `idx_${collectionName}_year_created_deleted`, background: true }
    );
    console.log(`✅ Index composé créé avec succès sur [${collectionName}].`);
  } catch (idxError) {
    console.warn(`⚠️ Avertissement lors de la création de l'index sur [${collectionName}] :`, idxError.message);
  }
}

async function runMigration() {
  console.log('======================================================================');
  console.log('🚀 DÉMARRAGE DE LA MIGRATION DES COURRIERS DE L\'ANNÉE 2022');
  console.log(`📥 Base source : ${SOURCE_URI}`);
  console.log(`📤 Base cible  : ${TARGET_URI}`);
  console.log('======================================================================');

  let sourceConn;
  let targetConn;

  try {
    sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
    console.log('✅ Connecté à la base source.');

    targetConn = await mongoose.createConnection(TARGET_URI).asPromise();
    console.log('✅ Connecté à la base cible.');

    // Migration des courriers entrants
    await migrateCollection(sourceConn, targetConn, 'incomingdocuments', 2022);

    // Migration des courriers sortants
    await migrateCollection(sourceConn, targetConn, 'outgoingdocuments', 2022);

    console.log('\n======================================================================');
    console.log('🎉 MIGRATION 2022 TERMINÉE AVEC SUCCÈS');
    console.log('======================================================================\n');
  } catch (err) {
    console.error('❌ Échec critique de la migration :', err);
    process.exitCode = 1;
  } finally {
    if (sourceConn) {
      await sourceConn.close();
      console.log('🔌 Connexion source fermée.');
    }
    if (targetConn) {
      await targetConn.close();
      console.log('🔌 Connexion cible fermée.');
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
