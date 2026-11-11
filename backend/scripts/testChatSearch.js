const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const SemanticIndex = require('../models/SemanticIndex');
const { getEmbedding, cosineSimilarity, chat } = require('../services/ollamaService');

async function testChat() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-management';
  
  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connecté\n');

    const queries = [
      'les projets de SICDA entre 2025 et 2026',
      'facture électricité',
      'demande de stage',
    ];

    for (const query of queries) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🔍 Requête : "${query}"`);
      console.log('═'.repeat(60));

      const queryVec = await getEmbedding(query);
      const allIndexed = await SemanticIndex.find().lean();

      const scored = allIndexed
        .map(item => ({
          subject: item.metadata?.subject || 'Sans titre',
          ref: `${item.metadata?.serialNumber || '?'}/${item.metadata?.year || '?'}`,
          type: item.documentType,
          score: cosineSimilarity(queryVec, item.embedding),
        }))
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      console.log(`\n📄 Top 5 documents :`);
      scored.forEach((s, i) => {
        console.log(`  ${i + 1}. [${(s.score * 100).toFixed(0)}%] ${s.subject} (${s.ref}) — ${s.type}`);
      });

      if (scored.length === 0) {
        console.log('  Aucun document pertinent');
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

testChat();
