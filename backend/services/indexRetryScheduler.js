const cron = require('node-cron');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const { indexDocument } = require('./semanticIndexer');
const { checkOllamaHealth } = require('./ollamaService');

let scheduledTask = null;
let isJobRunning = false;

/**
 * Exécute une session de rattrapage d'indexation vectorielle
 * @param {object} options
 * @param {number} options.maxAttempts - Nombre max de tentatives (défaut: 3)
 * @param {boolean} options.force - Forcer même si maxAttempts dépassé
 * @param {number} options.limit - Limite par type de document (défaut: 100)
 */
async function retryFailedIndexes(options = {}) {
  const maxAttempts = options.maxAttempts !== undefined ? options.maxAttempts : 3;
  const force = Boolean(options.force);
  const limit = options.limit || 100;

  if (isJobRunning) {
    console.warn('[RAG Retry] ⚠️ Une tâche de rattrapage est déjà en cours. Requête ignorée.');
    return {
      status: 'already_running',
      message: 'Indexing retry job is already running.',
    };
  }

  isJobRunning = true;
  const startTime = Date.now();

  const stats = {
    incoming: { found: 0, succeeded: 0, failed: 0 },
    outgoing: { found: 0, succeeded: 0, failed: 0 },
  };

  try {
    console.log('\n[RAG Retry] 🔄 Démarrage du rattrapage d\'indexation...');

    // 1. Vérification préalable de la disponibilité d'Ollama
    try {
      const isOllamaUp = await checkOllamaHealth();
      if (!isOllamaUp) {
        console.warn('[RAG Retry] ⚠️ Ollama est indisponible. Rattrapage différé.');
        return {
          status: 'service_down',
          message: 'Ollama is currently unreachable. Retry aborted.',
          stats,
        };
      }
    } catch (healthErr) {
      console.warn('[RAG Retry] ⚠️ Erreur lors du check Ollama :', healthErr.message);
      return {
        status: 'service_down',
        message: 'Ollama health check failed.',
        stats,
      };
    }

    // 2. Recherche des courriers entrants non indexés
    const incomingQuery = {
      isDeleted: { $ne: true },
      isIndexed: false,
    };
    if (!force) {
      incomingQuery.$or = [
        { indexAttempts: { $lt: maxAttempts } },
        { indexAttempts: { $exists: false } },
      ];
    }

    const incomingDocs = await IncomingDocument.find(incomingQuery).limit(limit);
    stats.incoming.found = incomingDocs.length;

    if (incomingDocs.length > 0) {
      console.log(`[RAG Retry] 📥 ${incomingDocs.length} courrier(s) entrant(s) à rattraper...`);
      for (const doc of incomingDocs) {
        try {
          const result = await indexDocument(doc, 'incoming');
          if (result && result.success) {
            await IncomingDocument.updateOne(
              { _id: doc._id },
              {
                $set: {
                  isIndexed: true,
                  indexError: null,
                  lastIndexAttempt: new Date(),
                },
              }
            );
            stats.incoming.succeeded++;
            console.log(`[RAG Retry] ✅ Incoming #${doc.serialNumber || doc._id} réindexé avec succès`);
          } else {
            const errReason = (result && (result.error || result.reason)) || 'Unknown indexing failure';
            await IncomingDocument.updateOne(
              { _id: doc._id },
              {
                $set: {
                  isIndexed: false,
                  indexError: String(errReason),
                  lastIndexAttempt: new Date(),
                },
                $inc: { indexAttempts: 1 },
              }
            );
            stats.incoming.failed++;
            console.warn(`[RAG Retry] ❌ Incoming #${doc.serialNumber || doc._id} échec : ${errReason}`);
          }
        } catch (docErr) {
          await IncomingDocument.updateOne(
            { _id: doc._id },
            {
              $set: {
                isIndexed: false,
                indexError: docErr.message,
                lastIndexAttempt: new Date(),
              },
              $inc: { indexAttempts: 1 },
            }
          ).catch(() => {});
          stats.incoming.failed++;
          console.error(`[RAG Retry] ❌ Incoming #${doc.serialNumber || doc._id} exception :`, docErr.message);
        }
      }
    }

    // 3. Recherche des courriers sortants non indexés
    const outgoingQuery = {
      isDeleted: { $ne: true },
      isIndexed: false,
    };
    if (!force) {
      outgoingQuery.$or = [
        { indexAttempts: { $lt: maxAttempts } },
        { indexAttempts: { $exists: false } },
      ];
    }

    const outgoingDocs = await OutgoingDocument.find(outgoingQuery).limit(limit);
    stats.outgoing.found = outgoingDocs.length;

    if (outgoingDocs.length > 0) {
      console.log(`[RAG Retry] 📤 ${outgoingDocs.length} courrier(s) sortant(s) à rattraper...`);
      for (const doc of outgoingDocs) {
        try {
          const result = await indexDocument(doc, 'outgoing');
          if (result && result.success) {
            await OutgoingDocument.updateOne(
              { _id: doc._id },
              {
                $set: {
                  isIndexed: true,
                  indexError: null,
                  lastIndexAttempt: new Date(),
                },
              }
            );
            stats.outgoing.succeeded++;
            console.log(`[RAG Retry] ✅ Outgoing #${doc.serialNumber || doc._id} réindexé avec succès`);
          } else {
            const errReason = (result && (result.error || result.reason)) || 'Unknown indexing failure';
            await OutgoingDocument.updateOne(
              { _id: doc._id },
              {
                $set: {
                  isIndexed: false,
                  indexError: String(errReason),
                  lastIndexAttempt: new Date(),
                },
                $inc: { indexAttempts: 1 },
              }
            );
            stats.outgoing.failed++;
            console.warn(`[RAG Retry] ❌ Outgoing #${doc.serialNumber || doc._id} échec : ${errReason}`);
          }
        } catch (docErr) {
          await OutgoingDocument.updateOne(
            { _id: doc._id },
            {
              $set: {
                isIndexed: false,
                indexError: docErr.message,
                lastIndexAttempt: new Date(),
              },
              $inc: { indexAttempts: 1 },
            }
          ).catch(() => {});
          stats.outgoing.failed++;
          console.error(`[RAG Retry] ❌ Outgoing #${doc.serialNumber || doc._id} exception :`, docErr.message);
        }
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalFound = stats.incoming.found + stats.outgoing.found;
    const totalSucceeded = stats.incoming.succeeded + stats.outgoing.succeeded;
    const totalFailed = stats.incoming.failed + stats.outgoing.failed;

    console.log(
      `[RAG Retry] 🏁 Rattrapage terminé en ${durationSeconds}s : ` +
      `${totalSucceeded}/${totalFound} réussis, ${totalFailed} échecs.\n`
    );

    return {
      status: 'completed',
      durationSeconds,
      totalFound,
      totalSucceeded,
      totalFailed,
      stats,
    };
  } catch (error) {
    console.error('[RAG Retry] ❌ Erreur globale pendant le rattrapage :', error.message);
    return {
      status: 'error',
      message: error.message,
      stats,
    };
  } finally {
    isJobRunning = false;
  }
}

/**
 * Démarre le scheduler node-cron (toutes les heures par défaut : '0 * * * *')
 * @param {string} cronExpression - Expression cron (défaut: '0 * * * *')
 */
function startIndexRetryScheduler(cronExpression = '0 * * * *') {
  if (scheduledTask) {
    console.log('[RAG Retry] Scheduler déjà actif.');
    return scheduledTask;
  }

  const expression = process.env.INDEX_RETRY_CRON || cronExpression;
  console.log(`[RAG Retry] ⏱️ Initialisation du cron de rattrapage (expression: "${expression}")`);

  scheduledTask = cron.schedule(expression, async () => {
    console.log(`[RAG Retry] ⏰ Déclenchement automatique du cron de rattrapage (${new Date().toISOString()})`);
    try {
      await retryFailedIndexes({ maxAttempts: 3 });
    } catch (err) {
      console.error('[RAG Retry] Erreur d\'exécution du cron :', err.message);
    }
  });

  return scheduledTask;
}

/**
 * Arrête le scheduler
 */
function stopIndexRetryScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[RAG Retry] Scheduler arrêté.');
  }
}

module.exports = {
  retryFailedIndexes,
  startIndexRetryScheduler,
  stopIndexRetryScheduler,
};
