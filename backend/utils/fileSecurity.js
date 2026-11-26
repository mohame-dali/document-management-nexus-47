const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const { execFile } = require('child_process');
const ErrorResponse = require('./errorResponse');

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.bash', '.zsh', '.ps1', '.psm1',
  '.vbs', '.vbe', '.js', '.jse', '.mjs', '.cjs', '.wsf', '.wsh', '.hta',
  '.msi', '.msp', '.com', '.scr', '.pif', '.jar', '.php', '.phtml', '.phar',
  '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.cgi', '.svg', '.html',
  '.htm', '.xhtml', '.xml', '.lnk', '.reg', '.inf', '.iso', '.img',
]);

const CONTEXT_RULES = {
  photo: {
    allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']),
    allowedMimeTypes: new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    expectedFormats: {
      '.jpg': new Set(['jpg']),
      '.jpeg': new Set(['jpg']),
      '.png': new Set(['png']),
      '.gif': new Set(['gif']),
      '.webp': new Set(['webp']),
    },
    errorMessage: 'Seules les images valides (JPG, PNG, GIF, WEBP) sont autorisées.',
  },
  document: {
    allowedExtensions: new Set(['.pdf']),
    allowedMimeTypes: new Set(['application/pdf', 'application/x-pdf']),
    expectedFormats: {
      '.pdf': new Set(['pdf']),
    },
    errorMessage: 'Seuls les fichiers PDF valides sont autorisés.',
  },
  template: {
    allowedExtensions: new Set(['.doc', '.docx']),
    allowedMimeTypes: new Set([
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ]),
    expectedFormats: {
      '.doc': new Set(['ole2']),
      '.docx': new Set(['zip']),
    },
    errorMessage: 'Seuls les modèles Word valides (.doc, .docx) sont autorisés.',
  },
  attachment: {
    allowedExtensions: new Set([
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.txt', '.csv',
    ]),
    allowedMimeTypes: new Set([
      'application/pdf', 'application/x-pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/csv',
      'application/octet-stream',
    ]),
    expectedFormats: {
      '.pdf': new Set(['pdf']),
      '.jpg': new Set(['jpg']),
      '.jpeg': new Set(['jpg']),
      '.png': new Set(['png']),
      '.gif': new Set(['gif']),
      '.webp': new Set(['webp']),
      '.doc': new Set(['ole2']),
      '.xls': new Set(['ole2']),
      '.ppt': new Set(['ole2']),
      '.docx': new Set(['zip']),
      '.xlsx': new Set(['zip']),
      '.pptx': new Set(['zip']),
      '.txt': new Set(['text']),
      '.csv': new Set(['text']),
    },
    errorMessage: 'Type de pièce jointe non autorisé ou contenu incohérent.',
  },
};

let clamavWarnedOnce = false;

function removeFileSafe(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.warn('[FileSecurity] Échec suppression fichier:', err.message);
  }
  return false;
}

function isPathInsideDir(targetPath, baseDir) {
  if (!targetPath || !baseDir) return false;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedTarget.startsWith(resolvedBase + path.sep);
}

function sanitizeExtension(originalName) {
  const base = path.basename(String(originalName || '')).replace(/\0/g, '').trim();
  const ext = path.extname(base).toLowerCase();
  if (!/^\.[a-z0-9]{1,10}$/.test(ext)) {
    return '';
  }
  return ext;
}

function hasDangerousDoubleExtension(originalName) {
  const base = path.basename(String(originalName || '')).toLowerCase();
  const parts = base.split('.').filter(Boolean);
  if (parts.length <= 2) return false;
  // Rejeter si une extension intermédiaire ou finale est exécutable / script
  for (let i = 1; i < parts.length; i++) {
    if (DANGEROUS_EXTENSIONS.has(`.${parts[i]}`)) {
      return true;
    }
  }
  return false;
}

function precheckFileFilter(file, context) {
  const rule = CONTEXT_RULES[context];
  if (!rule) {
    return { valid: false, statusCode: 400, message: 'Contexte de téléversement invalide' };
  }

  const originalName = String(file?.originalname || '');
  const ext = sanitizeExtension(originalName);

  if (!ext || DANGEROUS_EXTENSIONS.has(ext) || hasDangerousDoubleExtension(originalName)) {
    return { valid: false, statusCode: 415, message: rule.errorMessage };
  }

  if (!rule.allowedExtensions.has(ext)) {
    return { valid: false, statusCode: 415, message: rule.errorMessage };
  }

  const mime = String(file?.mimetype || '').toLowerCase().split(';')[0].trim();
  if (!rule.allowedMimeTypes.has(mime)) {
    return { valid: false, statusCode: 415, message: rule.errorMessage };
  }

  return { valid: true, ext };
}

/**
 * Inspecte les magic bytes réels d'un fichier sur disque.
 */
function inspectMagicBytes(filePath) {
  const stats = fs.statSync(filePath);
  if (!stats.isFile() || stats.size <= 0) {
    return { format: null, dangerous: false, reason: 'Fichier vide ou invalide' };
  }

  const fd = fs.openSync(filePath, 'r');
  try {
    const readSize = Math.min(stats.size, 4096);
    const buffer = Buffer.alloc(readSize);
    const bytesRead = fs.readSync(fd, buffer, 0, readSize, 0);
    const head = buffer.subarray(0, bytesRead);

    if (bytesRead === 0) {
      return { format: null, dangerous: false, reason: 'Fichier vide' };
    }

    // 1. Détecter immédiatement les binaires exécutables (PE, ELF, Mach-O, Shebang)
    if (bytesRead >= 2 && head[0] === 0x4d && head[1] === 0x5a) {
      return { format: 'executable', dangerous: true, reason: 'Exécutable Windows/PE détecté (MZ)' };
    }
    if (bytesRead >= 4 && head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46) {
      return { format: 'executable', dangerous: true, reason: 'Binaire ELF détecté' };
    }
    if (
      bytesRead >= 4 &&
      ((head[0] === 0xfe && head[1] === 0xed && head[2] === 0xfa && (head[3] === 0xce || head[3] === 0xcf)) ||
        ((head[0] === 0xce || head[0] === 0xcf) && head[1] === 0xfa && head[2] === 0xed && head[3] === 0xfe) ||
        (head[0] === 0xca && head[1] === 0xfe && head[2] === 0xba && head[3] === 0xbe))
    ) {
      return { format: 'executable', dangerous: true, reason: 'Binaire Mach-O/Java détecté' };
    }
    if (bytesRead >= 2 && head[0] === 0x23 && head[1] === 0x21) {
      return { format: 'script', dangerous: true, reason: 'Script shell détecté (#!)' };
    }

    // 2. PDF : %PDF- dans les premiers octets (tolère BOM UTF-8 / espaces initiaux)
    const pdfSearchWindow = head.subarray(0, Math.min(bytesRead, 1024));
    const pdfIdx = pdfSearchWindow.indexOf(Buffer.from('%PDF-'));
    if (pdfIdx !== -1 && pdfIdx <= 64) {
      return { format: 'pdf', dangerous: false };
    }

    // 3. Images
    if (bytesRead >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
      return { format: 'jpg', dangerous: false };
    }
    if (
      bytesRead >= 8 &&
      head[0] === 0x89 &&
      head[1] === 0x50 &&
      head[2] === 0x4e &&
      head[3] === 0x47 &&
      head[4] === 0x0d &&
      head[5] === 0x0a &&
      head[6] === 0x1a &&
      head[7] === 0x0a
    ) {
      return { format: 'png', dangerous: false };
    }
    if (bytesRead >= 6) {
      const ascii6 = head.subarray(0, 6).toString('ascii');
      if (ascii6 === 'GIF87a' || ascii6 === 'GIF89a') {
        return { format: 'gif', dangerous: false };
      }
    }
    if (
      bytesRead >= 12 &&
      head.subarray(0, 4).toString('ascii') === 'RIFF' &&
      head.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return { format: 'webp', dangerous: false };
    }

    // 4. OLE2 Compound Binary (.doc, .xls, .ppt)
    if (
      bytesRead >= 8 &&
      head[0] === 0xd0 &&
      head[1] === 0xcf &&
      head[2] === 0x11 &&
      head[3] === 0xe0 &&
      head[4] === 0xa1 &&
      head[5] === 0xb1 &&
      head[6] === 0x1a &&
      head[7] === 0xe1
    ) {
      return { format: 'ole2', dangerous: false };
    }

    // 5. ZIP / OOXML (.docx, .xlsx, .pptx)
    if (
      bytesRead >= 4 &&
      head[0] === 0x50 &&
      head[1] === 0x4b &&
      ((head[2] === 0x03 && head[3] === 0x04) ||
        (head[2] === 0x05 && head[3] === 0x06) ||
        (head[2] === 0x07 && head[3] === 0x08))
    ) {
      return { format: 'zip', dangerous: false };
    }

    // 6. Contenu texte / script / HTML
    const hasNullBytes = head.includes(0x00);
    if (!hasNullBytes) {
      const textSample = head.toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
      if (
        textSample.startsWith('<!doctype html') ||
        textSample.startsWith('<html') ||
        textSample.startsWith('<script') ||
        textSample.startsWith('<svg') ||
        textSample.startsWith('<?php') ||
        textSample.includes('<script')
      ) {
        return { format: 'html_or_script', dangerous: true, reason: 'Contenu actif HTML/SVG/Script détecté' };
      }
      return { format: 'text', dangerous: false };
    }

    return { format: null, dangerous: false, reason: 'Signature binaire non reconnue' };
  } finally {
    fs.closeSync(fd);
  }
}

function validateFileMagicBytes(filePath, context, originalName) {
  const rule = CONTEXT_RULES[context];
  if (!rule) {
    throw new ErrorResponse('Contexte de validation de fichier invalide', 400);
  }

  const ext = sanitizeExtension(originalName || path.basename(filePath));
  if (!ext || !rule.allowedExtensions.has(ext) || hasDangerousDoubleExtension(originalName || '')) {
    throw new ErrorResponse(rule.errorMessage, 415);
  }

  const inspection = inspectMagicBytes(filePath);
  if (inspection.dangerous) {
    throw new ErrorResponse(`Fichier rejeté pour raison de sécurité : ${inspection.reason}`, 415);
  }

  const expectedSet = rule.expectedFormats[ext];
  if (!expectedSet || !inspection.format || !expectedSet.has(inspection.format)) {
    throw new ErrorResponse(
      `${rule.errorMessage} (signature réelle : ${inspection.format || 'inconnue'})`,
      415
    );
  }

  return inspection.format;
}

function scanWithClamdTcp(filePath, host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let responseData = '';
    let settled = false;

    const finishError = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    const finishOk = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs, () => {
      finishError(new Error('ClamAV TCP timeout'));
    });

    socket.on('error', finishError);

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const stream = fs.createReadStream(filePath, { highWaterMark: 32768 });

      stream.on('data', (chunk) => {
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(chunk.length, 0);
        if (!socket.write(lenBuf) || !socket.write(chunk)) {
          stream.pause();
          socket.once('drain', () => stream.resume());
        }
      });

      stream.on('end', () => {
        const endBuf = Buffer.alloc(4);
        endBuf.writeUInt32BE(0, 0);
        socket.write(endBuf);
      });

      stream.on('error', finishError);
    });

    socket.on('data', (chunk) => {
      responseData += chunk.toString('utf8');
    });

    socket.on('end', () => {
      const cleaned = responseData.replace(/\0/g, '').trim();
      if (cleaned.endsWith('OK')) {
        return finishOk({ scanned: true, clean: true, engine: 'clamd-tcp' });
      }
      if (cleaned.includes('FOUND')) {
        return finishOk({ scanned: true, clean: false, infected: true, threat: cleaned, engine: 'clamd-tcp' });
      }
      return finishError(new Error(`Unexpected clamd response: ${cleaned || 'empty'}`));
    });
  });
}

function runClamBinary(binary, filePath, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(binary, ['--no-summary', filePath], { timeout: timeoutMs }, (err, stdout, stderr) => {
      const output = `${stdout || ''} ${stderr || ''}`.trim();
      if (!err) {
        return resolve({ scanned: true, clean: true, engine: binary });
      }
      if (err.code === 1 || output.includes('FOUND')) {
        return resolve({ scanned: true, clean: false, infected: true, threat: output, engine: binary });
      }
      reject(err);
    });
  });
}

async function scanFileWithClamAV(filePath) {
  if (process.env.CLAMAV_ENABLED === 'false') {
    return { scanned: false, skipped: true, reason: 'disabled' };
  }

  const timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS || 10000);
  const clamHost = process.env.CLAMAV_HOST ? String(process.env.CLAMAV_HOST).trim() : '';
  const clamPort = Number(process.env.CLAMAV_PORT || 3310);
  const isRequired = process.env.CLAMAV_REQUIRED === 'true';

  if (clamHost) {
    try {
      return await scanWithClamdTcp(filePath, clamHost, clamPort, timeoutMs);
    } catch (err) {
      if (isRequired) {
        throw new ErrorResponse('Service antivirus ClamAV indisponible', 503);
      }
      if (!clamavWarnedOnce) {
        clamavWarnedOnce = true;
        console.warn(`[FileSecurity] ClamAV TCP (${clamHost}:${clamPort}) indisponible — repli magic-bytes actif:`, err.message);
      }
      return { scanned: false, fallback: true, reason: err.message };
    }
  }

  for (const bin of ['clamdscan', 'clamscan']) {
    try {
      return await runClamBinary(bin, filePath, timeoutMs);
    } catch (err) {
      // ENOENT ou daemon non démarré -> essayer le binaire suivant ou graceful fallback
      if (err && err.code !== 'ENOENT' && !clamavWarnedOnce) {
        console.warn(`[FileSecurity] ${bin} indisponible:`, err.message);
      }
    }
  }

  if (isRequired) {
    throw new ErrorResponse('Service antivirus ClamAV requis mais indisponible', 503);
  }

  if (!clamavWarnedOnce) {
    clamavWarnedOnce = true;
    console.warn('[FileSecurity] ClamAV non détecté sur cet hôte — validation magic-bytes et liste blanche actives.');
  }

  return { scanned: false, fallback: true, reason: 'clamav_not_installed' };
}

async function validateUploadedFile(filePath, context, originalName) {
  try {
    const detectedFormat = validateFileMagicBytes(filePath, context, originalName);
    const scanResult = await scanFileWithClamAV(filePath);

    if (scanResult && scanResult.infected) {
      throw new ErrorResponse('Fichier rejeté : menace ou logiciel malveillant détecté.', 422);
    }

    return { detectedFormat, scanResult };
  } catch (err) {
    removeFileSafe(filePath);
    throw err;
  }
}

function computeFileSha256(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.allocUnsafe(65536);
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(bytesRead === buf.length ? buf : buf.subarray(0, bytesRead));
    }
    return hash.digest('hex');
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = {
  DANGEROUS_EXTENSIONS,
  CONTEXT_RULES,
  removeFileSafe,
  isPathInsideDir,
  sanitizeExtension,
  hasDangerousDoubleExtension,
  precheckFileFilter,
  inspectMagicBytes,
  validateFileMagicBytes,
  scanFileWithClamAV,
  validateUploadedFile,
  computeFileSha256,
};
