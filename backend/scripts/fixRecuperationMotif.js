/**
 * Script de migration : Retirer 'recuperation' des motifs déductibles dans PresenceSettings
 *
 * RÈGLE MÉTIER :
 * Le motif 'recuperation' ne doit PAS impacter le solde de congés.
 * Seuls 'conge_annuel', 'absence_injustifiee' et 'conge_exceptionnel' sont déductibles.
 *
 * UTILISATION MANUELLE (à exécuter plus tard après validation) :
 *   cd backend && node scripts/fixRecuperationMotif.js
 *
 * ⚠️ CE SCRIPT NE S'EXÉCUTE PAS AUTOMATIQUEMENT.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const PresenceSettings = require('../models/PresenceSettings');

async function fixRecuperationMotif() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-management';
    await mongoose.connect(dbUri);
    console.log('✅ Connecté à MongoDB pour la mise à jour des paramètres de présence...');

    // Rechercher tous les paramètres de présence existants
    const allSettings = await PresenceSettings.find({});
    console.log(`🔍 Nombre total de documents PresenceSettings trouvés : ${allSettings.length}`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const settings of allSettings) {
      if (Array.isArray(settings.motifsDeductibles) && settings.motifsDeductibles.includes('recuperation')) {
        const previousMotifs = [...settings.motifsDeductibles];
        const updatedMotifs = settings.motifsDeductibles.filter(m => m !== 'recuperation');

        settings.motifsDeductibles = updatedMotifs;
        await settings.save();

        console.log(`   • Année ${settings.annee} : [${previousMotifs.join(', ')}] ➔ [${updatedMotifs.join(', ')}]`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('\n======================================================');
    console.log('📋 RAPPORT DE MIGRATION - MOTIF RECUPERATION :');
    console.log(`   • Documents modifiés  (recuperation retiré) : ${updatedCount}`);
    console.log(`   • Documents inchangés (déjà conformes)      : ${unchangedCount}`);
    console.log(`   • Total documents examinés                 : ${allSettings.length}`);
    console.log('======================================================\n');

    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée proprement.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de PresenceSettings :', error);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  fixRecuperationMotif();
}

module.exports = {
  fixRecuperationMotif
};
