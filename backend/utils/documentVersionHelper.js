const fs = require('fs');
const path = require('path');
const { computeFileSha256 } = require('./fileSecurity');

function normalizeRelPath(p) {
  if (!p || typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

function isSameDocumentPath(providedPath, existingScannedDocument) {
  const normProvided = normalizeRelPath(providedPath);
  const normExisting = normalizeRelPath(existingScannedDocument);
  return Boolean(normProvided && normExisting && normProvided === normExisting);
}

function getLegacyFileStats(relPath) {
  if (!relPath) return { sha256: null, fileSize: null };
  try {
    const absPath = path.resolve(__dirname, '..', normalizeRelPath(relPath));
    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      return {
        fileSize: fs.statSync(absPath).size,
        sha256: computeFileSha256(absPath),
      };
    }
  } catch (_) {
    // ignore missing legacy file metadata
  }
  return { sha256: null, fileSize: null };
}

function buildInitialVersionState(finalDocumentPath, meta = {}) {
  if (!finalDocumentPath) {
    return { currentVersion: 1, versions: [] };
  }
  return {
    currentVersion: 1,
    versions: [
      {
        version: 1,
        filePath: finalDocumentPath,
        ocrText: meta.ocrText || null,
        ocrStatus: meta.ocrStatus || null,
        ocrError: meta.ocrError || null,
        sha256: meta.sha256 || null,
        fileSize: meta.fileSize || null,
        uploadedBy: meta.uploadedBy || null,
        uploadedAt: new Date(),
        note: 'Initial version',
      },
    ],
  };
}

function prepareNextVersionState(document) {
  const existingVersions = Array.isArray(document?.versions)
    ? document.versions.map((v) => (typeof v.toObject === 'function' ? v.toObject() : { ...v }))
    : [];

  if (existingVersions.length === 0 && document?.scannedDocument) {
    const legacyMeta = getLegacyFileStats(document.scannedDocument);
    existingVersions.push({
      version: 1,
      filePath: document.scannedDocument,
      ocrText: document.ocrText || null,
      ocrStatus: document.ocrStatus || null,
      ocrError: document.ocrError || null,
      sha256: legacyMeta.sha256,
      fileSize: legacyMeta.fileSize,
      uploadedBy: document.createdBy || null,
      uploadedAt: document.createdAt || new Date(),
      note: 'Initial version (archived prior to update)',
    });
  }

  if (existingVersions.length === 0 && !document?.scannedDocument) {
    return {
      seededVersions: [],
      nextVersion: 1,
    };
  }

  const maxExistingVersion = existingVersions.reduce(
    (max, item) => Math.max(max, Number(item.version) || 1),
    Number(document?.currentVersion) || 1
  );

  return {
    seededVersions: existingVersions,
    nextVersion: maxExistingVersion + 1,
  };
}

function appendNewVersion(seededVersions, nextVersion, finalDocumentPath, meta = {}) {
  const nextEntry = {
    version: nextVersion,
    filePath: finalDocumentPath,
    ocrText: meta.ocrText || null,
    ocrStatus: meta.ocrStatus || null,
    ocrError: meta.ocrError || null,
    sha256: meta.sha256 || null,
    fileSize: meta.fileSize || null,
    uploadedBy: meta.uploadedBy || null,
    uploadedAt: new Date(),
    note: meta.note || `Version ${nextVersion}`,
  };
  return {
    currentVersion: nextVersion,
    versions: [...seededVersions, nextEntry],
  };
}

module.exports = {
  isSameDocumentPath,
  buildInitialVersionState,
  prepareNextVersionState,
  appendNewVersion,
};
