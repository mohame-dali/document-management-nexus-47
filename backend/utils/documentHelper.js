const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');

/**
 * Get the next sequential number for a document
 * @param {number} year - The year to get the next number for
 * @param {string} type - Either 'incoming' or 'outgoing'
 * @returns {Promise<number>} The next serial number
 */
exports.getNextSerialNumber = async (year, type = 'incoming') => {
  try {
    // Determine which model to use based on document type
    const Model = type === 'incoming' ? IncomingDocument : OutgoingDocument;
    
    // Find the highest serial number for the specified year
    const lastDoc = await Model.findOne({ year })
      .sort({ serialNumber: -1 })
      .limit(1);
    
    // If no document exists for this year, start with 1
    if (!lastDoc) {
      return 1;
    }
    
    // Otherwise, increment the last serial number
    return lastDoc.serialNumber + 1;
  } catch (err) {
    console.error(`Error getting next serial number: ${err.message}`);
    throw err;
  }
};

/**
 * Create year and type folders if they don't exist
 * @param {string} folderPath - Full path to create
 * @returns {Promise<void>}
 */
exports.createYearFolder = async (folderPath) => {
  try {
    // Recursively create directories if they don't exist
    if (!(await existsAsync(folderPath))) {
      await mkdirAsync(folderPath, { recursive: true });
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
