/**
 * Script de migration : ajout du champ photo aux fiches Personnel existantes
 * 
 * UTILISATION (manuelle, à exécuter une seule fois) :
 *   cd backend
 *   node scripts/migratePersonnelPhoto.js
 * 
 * ⚠️ Ce script NE DOIT PAS être exécuté automatiquement.
 * ⚠️ Il modifie UNIQUEMENT la collection `personnels`.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Personnel = require('../models/Personnel');

async function migrate() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-management';
    await mongoose.connect(dbUri);
    console.log('✅ Connecté à MongoDB pour la migration...');

    const result = await Personnel.updateMany(
      { photo: { $exists: false } },
      { $set: { photo: '' } }
    );

    console.log(`✅ Migration terminée : ${result.modifiedCount} fiche(s) mise(s) à jour.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur migration :', error);
    process.exit(1);
  }
}

// Ne pas exécuter automatiquement (sauf appel direct)
if (require.main === module) {
  migrate();
}

module.exports = migrate;
