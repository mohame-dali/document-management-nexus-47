/**
 * Script de nettoyage : Supprimer les liens orphelins userId sur Personnel
 * (utilisateurs supprimés définitivement ou marqués isDeleted: true)
 * et libérer personnelId sur les comptes utilisateurs supprimés.
 *
 * UTILISATION MANUELLE :
 *   cd backend && node scripts/cleanupOrphanPersonnelLinks.js
 *
 * Option dry-run (lecture seule sans modification) :
 *   cd backend && node scripts/cleanupOrphanPersonnelLinks.js --dry-run
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const Personnel = require('../models/Personnel');
const User = require('../models/User');

async function cleanupOrphanPersonnelLinks({ dryRun = false } = {}) {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-management';
    await mongoose.connect(dbUri);
    console.log('✅ Connecté à MongoDB pour le nettoyage des liens orphelins Personnel ↔ User...');
    if (dryRun) {
      console.log('ℹ️  Mode --dry-run activé (aucune écriture en base).');
    }

    // 1. Trouver tous les personnels ayant un userId non nul
    const personnelsWithUser = await Personnel.find({ userId: { $ne: null } })
      .select('_id nom prenom userId')
      .lean();

    const userIds = personnelsWithUser.map((p) => p.userId).filter(Boolean);
    const activeUsers = userIds.length > 0
      ? await User.find({ _id: { $in: userIds }, isDeleted: { $ne: true } })
          .select('_id')
          .lean()
      : [];

    const activeUserIdSet = new Set(activeUsers.map((u) => u._id.toString()));

    const orphanPersonnels = personnelsWithUser.filter(
      (p) => !p.userId || !activeUserIdSet.has(p.userId.toString())
    );
    const orphanPersonnelIds = orphanPersonnels.map((p) => p._id);

    let modifiedPersonnels = 0;
    if (!dryRun && orphanPersonnelIds.length > 0) {
      const res = await Personnel.updateMany(
        { _id: { $in: orphanPersonnelIds } },
        { $set: { userId: null } }
      );
      modifiedPersonnels = res.modifiedCount || 0;
    }

    // 2. Nettoyer également personnelId sur les utilisateurs déjà supprimés (soft delete)
    const deletedUsersWithPersonnel = await User.find({
      isDeleted: true,
      personnelId: { $ne: null }
    })
      .select('_id username personnelId')
      .lean();

    let modifiedUsers = 0;
    if (!dryRun && deletedUsersWithPersonnel.length > 0) {
      const resUsers = await User.updateMany(
        { _id: { $in: deletedUsersWithPersonnel.map((u) => u._id) } },
        { $set: { personnelId: null } }
      );
      modifiedUsers = resUsers.modifiedCount || 0;
    }

    console.log('\n======================================================');
    console.log('📋 RAPPORT DE NETTOYAGE - LIENS ORPHELINS :');
    console.log(`   • Fiches Personnel avec userId examinées     : ${personnelsWithUser.length}`);
    console.log(`   • Liens orphelins détectés (Personnel.userId): ${orphanPersonnelIds.length}`);
    console.log(`   • Fiches Personnel nettoyées                 : ${dryRun ? 0 : modifiedPersonnels}`);
    console.log(`   • Users supprimés avec personnelId détectés  : ${deletedUsersWithPersonnel.length}`);
    console.log(`   • Users supprimés nettoyés                   : ${dryRun ? 0 : modifiedUsers}`);
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des liens orphelins :', error);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  cleanupOrphanPersonnelLinks({ dryRun });
}

module.exports = { cleanupOrphanPersonnelLinks };
