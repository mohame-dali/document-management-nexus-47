const fs = require('fs');
const path = require('path');
const Counter = require('../models/Counter');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');

function normalizeDocumentType(type = 'incoming') {
  if (type === 'incoming' || type === 'outgoing') {
    return type;
  }
  throw new Error(`Invalid document type for serial counter: ${type}`);
}

/**
 * Initialise le compteur pour (type, year) une seule fois à partir du max actif existant
 * sans jamais écraser un compteur déjà en place ($setOnInsert).
 */
async function ensureCounterInitialized(yearInt, normalizedType) {
  const counterId = `${normalizedType}:${yearInt}`;
  const existing = await Counter.findById(counterId).lean();
  if (existing) {
    return existing;
  }

  const Model = normalizedType === 'incoming' ? IncomingDocument : OutgoingDocument;
  const lastActiveDoc = await Model.findOne({
    year: yearInt,
    isDeleted: { $ne: true },
  })
    .sort({ serialNumber: -1 })
    .select('serialNumber')
    .lean();

  const baselineSeq =
    lastActiveDoc && Number.isFinite(lastActiveDoc.serialNumber) && lastActiveDoc.serialNumber > 0
      ? lastActiveDoc.serialNumber
      : 0;

  try {
    await Counter.updateOne(
      { _id: counterId },
      {
        $setOnInsert: {
          type: normalizedType,
          year: yearInt,
          seq: baselineSeq,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    // En cas d'initialisation concurrente simultanée, l'index unique/upsert peut lever E11000 :
    // le compteur existe alors déjà et peut être incrémenté normalement.
    if (!err || err.code !== 11000) {
      throw err;
    }
  }
}

/**
 * Alloue atomiquement le prochain numéro de série séquentiel pour un type et une année.
 * Utilise Counter.findOneAndUpdate avec $inc et upsert (zéro findOne + 1).
 * @param {number|string} year - Année du courrier
 * @param {string} type - 'incoming' ou 'outgoing'
 * @returns {Promise<number>} Prochain numéro de série unique alloué
 */
exports.getNextSerialNumber = async (year, type = 'incoming') => {
  try {
    const yearInt = parseInt(year, 10);
    if (isNaN(yearInt) || yearInt <= 0) {
      throw new Error(`Invalid year provided for serial number: ${year}`);
    }

    const normalizedType = normalizeDocumentType(type);
    const counterId = `${normalizedType}:${yearInt}`;
    const Model = normalizedType === 'incoming' ? IncomingDocument : OutgoingDocument;

    await ensureCounterInitialized(yearInt, normalizedType);

    // Incrément atomique garanti sans doublon même sous forte concurrence.
    // La boucle protège uniquement contre une collision avec un numéro saisi manuellement.
    while (true) {
      const updatedCounter = await Counter.findOneAndUpdate(
        { _id: counterId },
        {
          $inc: { seq: 1 },
          $setOnInsert: { type: normalizedType, year: yearInt },
        },
        { new: true, upsert: true }
      );

      const candidate = updatedCounter.seq;
      const collision = await Model.exists({
        year: yearInt,
        serialNumber: candidate,
        isDeleted: { $ne: true },
      });

      if (!collision) {
        return candidate;
      }
    }
  } catch (err) {
    console.error(`Error getting next serial number: ${err.message}`);
    throw err;
  }
};

/**
 * Synchronise le compteur si un numéro manuel supérieur à seq a été enregistré.
 */
exports.syncSerialCounter = async (year, type, usedSerialNumber) => {
  const yearInt = parseInt(year, 10);
  const serialInt = parseInt(usedSerialNumber, 10);
  if (isNaN(yearInt) || isNaN(serialInt) || serialInt <= 0) return null;

  const normalizedType = normalizeDocumentType(type);
  const counterId = `${normalizedType}:${yearInt}`;

  return Counter.findOneAndUpdate(
    { _id: counterId },
    {
      $max: { seq: serialInt },
      $setOnInsert: { type: normalizedType, year: yearInt },
    },
    { new: true, upsert: true }
  );
};

/**
 * Create year and type folders if they don't exist
 * @param {string} folderPath - Full path to create
 * @returns {Promise<void>}
 */
exports.createYearFolder = async (folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      await fs.promises.mkdir(folderPath, { recursive: true });
      console.log(`Created directory: ${folderPath}`);
    }
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
    throw err;
  }
};

/**
 * Get the appropriate document path based on type and year
 * @param {string} type - Either 'incoming' or 'outgoing'
 * @param {number} year - The year for the document
 * @returns {string} The full path
 */
exports.getDocumentPath = (type, year) => {
  const docType = type === 'incoming' ? 'Incoming-Doc' : 'Outgoing-Doc';
  return path.join(
    __dirname,
    '..',
    'courrier',
    `${year}`,
    docType
  );
};
