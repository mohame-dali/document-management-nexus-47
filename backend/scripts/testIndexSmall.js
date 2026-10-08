const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const IncomingDocument = require('../models/IncomingDocument');
const SemanticIndex = require('../models/SemanticIndex');
const { getEmbedding, cosineSimilarity } = require('../services/ollamaService');
const { buildDocumentText } = require('./indexDocuments');

async function testSmall() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';
  
  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connecté\n');

    // 1. Prendre 10 documents
    const docs = await IncomingDocument.find({ isDeleted: { $ne: true } })
      .limit(10)
      .lean();

    console.log(`📄 Test sur ${docs.length} documents\n`);

    let success = 0;
    let failed = 0;

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const text = buildDocumentText(doc, 'incoming');
      
      if (!text || text.length < 20) {
        console.log(`${i + 1}. [SKIP] Doc #${doc.serialNumber} — texte trop court`);
        continue;
      }

      try {
        const t0 = Date.now();
        const embedding = await getEmbedding(text);
        const duration = Date.now() - t0;

        await SemanticIndex.findOneAndUpdate(
          { documentType: 'incoming', documentId: doc._id },
          {
            documentType: 'incoming',
            documentId: doc._id,
            sourceText: text.substring(0, 500),
            embedding,
            metadata: {
              subject: doc.subject,
              serialNumber: doc.serialNumber,
              year: doc.year,
              source: doc.source,
              documentDate: doc.arrivalDate,
              createdAt: doc.createdAt,
            },
            embeddingModel: 'nomic-embed-text',
            indexedAt: new Date(),
          },
          { upsert: true }
        );

        console.log(`${i + 1}. ✅ #${doc.serialNumber}/${doc.year} (${duration}ms) — ${embedding.length} dims — ${doc.subject?.substring(0, 50)}`);
        success++;
      } catch (err) {
        console.log(`${i + 1}. ❌ Doc #${doc.serialNumber} — ${err.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Résultat: ${success} OK, ${failed} échecs\n`);

    // 2. Test de recherche
    console.log('🔍 Test recherche : "SICDA"\n');
    const queryVec = await getEmbedding('SICDA');
    const allIndexed = await SemanticIndex.find({ documentType: 'incoming' }).limit(100);

    const scored = allIndexed.map(item => ({
      subject: item.metadata.subject,
      ref: `${item.metadata.serialNumber}/${item.metadata.year}`,
      score: cosineSimilarity(queryVec, item.embedding),
    }));

    const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    top.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.score.toFixed(3)}] ${r.subject} (${r.ref})`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur fatale:', err.message);
    process.exit(1);
  }
}

testSmall();
