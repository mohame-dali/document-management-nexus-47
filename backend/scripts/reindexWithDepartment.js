const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const SemanticIndex = require('../models/SemanticIndex');
const { indexDocument } = require('../services/semanticIndexer');

async function reindexAll() {
  const dbUri = process.env.MONGODB_URI || 
    'mongodb://localhost:27017/document-management';
  
  try {
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB connecté\n');

    // ─── Purger l'ancien index ───
    const oldCount = await SemanticIndex.countDocuments();
    console.log(`🗑️  Suppression de ${oldCount} entrées d'index...`);
    await SemanticIndex.deleteMany({});
    console.log('✅ Index purgé\n');

    const stats = { indexed: 0, skipped: 0, errors: 0 };

    // ─── Réindexer les entrants ───
    const incoming = await IncomingDocument.find({ isDeleted: { $ne: true } });
    console.log(`📥 ${incoming.length} entrants à réindexer...\n`);

    for (let i = 0; i < incoming.length; i++) {
      const doc = incoming[i];
      try {
        const result = await indexDocument(doc, 'incoming');
        if (result.success) {
          stats.indexed++;
          console.log(`   [${i + 1}/${incoming.length}] ✅ #${doc.serialNumber}/${doc.year}`);
        } else if (result.skipped) {
          stats.skipped++;
          console.log(`   [${i + 1}/${incoming.length}] ⏭️  #${doc.serialNumber} (ignoré)`);
        } else {
          stats.errors++;
          console.error(`   [${i + 1}/${incoming.length}] ❌ #${doc.serialNumber} : ${result.error}`);
        }
      } catch (err) {
        stats.errors++;
        console.error(`   [${i + 1}/${incoming.length}] ❌ ${err.message}`);
      }
    }

    // ─── Réindexer les sortants ───
    const outgoing = await OutgoingDocument.find({ isDeleted: { $ne: true } });
    console.log(`\n📤 ${outgoing.length} sortants à réindexer...\n`);

    for (let i = 0; i < outgoing.length; i++) {
      const doc = outgoing[i];
      try {
        const result = await indexDocument(doc, 'outgoing');
        if (result.success) {
          stats.indexed++;
          console.log(`   [${i + 1}/${outgoing.length}] ✅ #${doc.serialNumber}/${doc.year}`);
        } else if (result.skipped) {
          stats.skipped++;
          console.log(`   [${i + 1}/${outgoing.length}] ⏭️  #${doc.serialNumber} (ignoré)`);
        } else {
          stats.errors++;
          console.error(`   [${i + 1}/${outgoing.length}] ❌ #${doc.serialNumber} : ${result.error}`);
        }
      } catch (err) {
        stats.errors++;
        console.error(`   [${i + 1}/${outgoing.length}] ❌ ${err.message}`);
      }
    }

    // ─── Rapport final ───
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RAPPORT DE RÉINDEXATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   ✅ Réindexés : ${stats.indexed}`);
    console.log(`   ⏭️  Ignorés   : ${stats.skipped}`);
    console.log(`   ❌ Erreurs   : ${stats.errors}`);
    console.log(`   📊 Total     : ${await SemanticIndex.countDocuments()}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // ─── Distribution par département ───
    console.log('📊 Distribution par département :');
    const deptCounts = await SemanticIndex.aggregate([
      { $unwind: { path: '$metadata.departmentIds', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            $ifNull: ['$metadata.departmentIds', '$metadata.departmentId'],
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    deptCounts.forEach((d) => {
      console.log(`   - ${d._id || 'N/A'} : ${d.count} docs`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur fatale :', err);
    process.exit(1);
  }
}

reindexAll();
