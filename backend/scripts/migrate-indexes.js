#!/usr/bin/env node
/**
 * backend/scripts/migrate-indexes.js
 * Script de migration non-destructif des index uniques partiels (LOT 2 intégrité).
 *
 * Règles :
 * - À lancer d'abord sur une base de test (ou avec --dry-run)
 * - Aucune suppression de données (lecture + gestion d'index uniquement)
 * - Refuse la création d'un index unique si des doublons actifs existent
 *
 * Usage :
 *   node backend/scripts/migrate-indexes.js --dry-run
 *   node backend/scripts/migrate-indexes.js
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');

const isDryRun = process.argv.includes('--dry-run');

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function keysEqual(a, b) {
  return stableStringify(a || {}) === stableStringify(b || {});
}

function indexMatchesSpec(existingIdx, targetKey, targetOptions) {
  if (!keysEqual(existingIdx.key, targetKey)) return false;
  if (Boolean(existingIdx.unique) !== Boolean(targetOptions.unique)) return false;
  if (Boolean(existingIdx.sparse) !== Boolean(targetOptions.sparse)) return false;
  return stableStringify(existingIdx.partialFilterExpression || null) ===
    stableStringify(targetOptions.partialFilterExpression || null);
}

async function checkActiveDuplicates(Model, matchStage, groupKey, label) {
  const duplicates = await Model.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupKey,
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length > 0) {
    console.error(`❌ [${label}] Doublons actifs détectés (${duplicates.length}) — migration bloquée sans suppression de données :`);
    for (const dup of duplicates) {
      console.error(`   - clé=${JSON.stringify(dup._id)} count=${dup.count} ids=${dup.ids.map(String).join(', ')}`);
    }
    return false;
  }

  console.log(`✅ [${label}] Aucun doublon actif détecté.`);
  return true;
}

async function migrateCollectionIndex({
  Model,
  label,
  targetKey,
  targetOptions,
  duplicateMatch,
  duplicateGroupKey,
}) {
  console.log(`\n--- Migration des index : ${label} ---`);

  const ok = await checkActiveDuplicates(Model, duplicateMatch, duplicateGroupKey, label);
  if (!ok) {
    return { success: false, label, reason: 'active_duplicates' };
  }

  const collection = Model.collection;
  const existingIndexes = await collection.indexes();
  console.log(`[${label}] Index actuels :`);
  existingIndexes.forEach((idx) => {
    console.log(`   * ${idx.name}: key=${JSON.stringify(idx.key)} unique=${Boolean(idx.unique)} sparse=${Boolean(idx.sparse)} partial=${JSON.stringify(idx.partialFilterExpression || null)}`);
  });

  const matchingIndex = existingIndexes.find((idx) => indexMatchesSpec(idx, targetKey, targetOptions));
  const conflictingIndexes = existingIndexes.filter(
    (idx) => idx.name !== '_id_' && keysEqual(idx.key, targetKey) && !indexMatchesSpec(idx, targetKey, targetOptions)
  );

  for (const idx of conflictingIndexes) {
    if (isDryRun) {
      console.log(`   [DRY-RUN] Suppression prévue de l'ancien index conflictuel : ${idx.name}`);
    } else {
      console.log(`   Suppression de l'ancien index conflictuel : ${idx.name}`);
      await collection.dropIndex(idx.name);
    }
  }

  if (matchingIndex) {
    console.log(`✅ [${label}] L'index partiel unique cible existe déjà (${matchingIndex.name}).`);
  } else if (isDryRun) {
    console.log(`   [DRY-RUN] Création prévue de l'index : key=${JSON.stringify(targetKey)} options=${JSON.stringify(targetOptions)}`);
  } else {
    const createdName = await collection.createIndex(targetKey, targetOptions);
    console.log(`✅ [${label}] Index partiel unique créé : ${createdName}`);
  }

  if (!isDryRun) {
    const finalIndexes = await collection.indexes();
    console.log(`[${label}] Index finaux :`);
    finalIndexes.forEach((idx) => {
      console.log(`   * ${idx.name}: key=${JSON.stringify(idx.key)} unique=${Boolean(idx.unique)} sparse=${Boolean(idx.sparse)} partial=${JSON.stringify(idx.partialFilterExpression || null)}`);
    });
  }

  return { success: true, label };
}

async function main() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('❌ ERREUR : Variable MONGODB_URI absente de l\'environnement.');
    process.exit(1);
  }

  console.log(`🔧 Migration des index LOT 2 (${isDryRun ? 'MODE DRY-RUN — aucune modification' : 'MODE EXÉCUTION'})`);

  let connected = false;
  try {
    const isLocalOrStandalone = !dbUri.includes('+srv') && !dbUri.includes('replicaSet');
    await mongoose.connect(dbUri, {
      ...(isLocalOrStandalone ? { directConnection: true } : {}),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    connected = true;
    console.log(`📡 Connecté à MongoDB : ${mongoose.connection.name} (${mongoose.connection.host})`);

    const targets = [
      {
        Model: IncomingDocument,
        label: 'IncomingDocument',
        targetKey: { serialNumber: 1, year: 1 },
        targetOptions: { unique: true, partialFilterExpression: { isDeleted: false } },
        duplicateMatch: { isDeleted: false },
        duplicateGroupKey: { serialNumber: '$serialNumber', year: '$year' },
      },
      {
        Model: OutgoingDocument,
        label: 'OutgoingDocument',
        targetKey: { serialNumber: 1, year: 1 },
        targetOptions: { unique: true, partialFilterExpression: { isDeleted: false } },
        duplicateMatch: { isDeleted: false },
        duplicateGroupKey: { serialNumber: '$serialNumber', year: '$year' },
      },
      {
        Model: Personnel,
        label: 'Personnel',
        targetKey: { cin: 1 },
        targetOptions: {
          unique: true,
          partialFilterExpression: { isDeleted: false, cin: { $type: 'string' } },
        },
        duplicateMatch: { isDeleted: false, cin: { $type: 'string' } },
        duplicateGroupKey: { cin: '$cin' },
      },
    ];

    let hasFailure = false;
    for (const target of targets) {
      const result = await migrateCollectionIndex(target);
      if (!result.success) {
        hasFailure = true;
      }
    }

    if (hasFailure) {
      console.error('\n❌ Migration incomplète : résolvez manuellement les doublons actifs signalés ci-dessus puis relancez.');
      process.exitCode = 1;
    } else {
      console.log(`\n🎉 Migration terminée avec succès (${isDryRun ? 'dry-run' : 'appliquée'}).`);
    }
  } catch (err) {
    console.error('❌ Erreur lors de la migration des index :', err);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.connection.close();
      console.log('🔌 Connexion MongoDB fermée.');
    }
  }
}

main();
