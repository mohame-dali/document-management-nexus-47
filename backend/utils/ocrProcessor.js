const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const ErrorResponse = require('./errorResponse');

const execFileAsync = promisify(execFile);

const OCR_DPI = 300;
const DEFAULT_MAX_PAGES = Number(process.env.OCR_MAX_PAGES) || 50;
const SUBPROCESS_TIMEOUT_MS = Number(process.env.OCR_PAGE_TIMEOUT_MS) || 60000;
const SUBPROCESS_MAX_BUFFER = 10 * 1024 * 1024; // 10 MiB memory cap per subprocess output

/**
 * Resolve the shared application temporary directory (same root as upload & scanner modules).
 */
function getAppTempRoot() {
  const uploadRoot = path.resolve(
    process.env.UPLOAD_PATH ||
      process.env.UPLOAD_DIR ||
      path.join(__dirname, '..', 'uploads')
  );
  const tempRoot = path.join(uploadRoot, 'temp');
  if (!fs.existsSync(tempRoot)) {
    fs.mkdirSync(tempRoot, { recursive: true });
  }
  return tempRoot;
}

function createAbortError(message = 'OCR operation aborted') {
  const err = new Error(message);
  err.name = 'AbortError';
  err.code = 'ABORT_ERR';
  return err;
}

function killOcrChild(child) {
  if (!child || child.killed || !child.pid) return;
  try {
    child.kill('SIGTERM');
  } catch (_) {}
  if (process.platform === 'win32') {
    try {
      execFile('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true }, () => {});
    } catch (_) {}
  }
  const forceTimer = setTimeout(() => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    } catch (_) {}
  }, 250);
  if (typeof forceTimer.unref === 'function') {
    forceTimer.unref();
  }
}

/**
 * Safely execute an external binary without shell interpolation and with strict timeout/memory caps & optional AbortSignal.
 */
async function runBinary(bin, args, timeoutMs = SUBPROCESS_TIMEOUT_MS, signal = null) {
  if (signal && signal.aborted) {
    throw createAbortError();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let child = null;

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      killOcrChild(child);
      reject(createAbortError());
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    child = execFile(
      bin,
      args,
      {
        timeout: timeoutMs,
        maxBuffer: SUBPROCESS_MAX_BUFFER,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (signal && signal.aborted) {
          return reject(createAbortError());
        }
        if (error) {
          return reject(error);
        }
        return resolve({ stdout: stdout || '', stderr: stderr || '' });
      }
    );
  });
}

/**
 * Extract text from PDF file using OCR with enhanced Arabic support.
 * Uses 300 DPI, processes page by page, enforces memory/time limits, and cleans up temp files.
 * @param {string} filePath - Path to the PDF file
 * @param {string} languages - Language codes for OCR (default: 'ara+fra+eng')
 * @param {{ signal?: AbortSignal }} options - Optional cancellation signal
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromPDF = async (filePath, languages = 'ara+fra+eng', options = {}) => {
  const signal = options && options.signal ? options.signal : null;
  try {
    if (signal && signal.aborted) {
      throw createAbortError();
    }

    let normalizedPath = path.normalize(filePath);
    const projectRoot = path.dirname(path.dirname(__filename));
    if (normalizedPath.includes(projectRoot + projectRoot)) {
      normalizedPath = normalizedPath.replace(projectRoot + projectRoot, projectRoot);
    }

    if (!path.isAbsolute(normalizedPath)) {
      normalizedPath = path.join(projectRoot, normalizedPath);
    }

    console.log('OCR Processing file for Arabic text:', normalizedPath);
    console.log('OCR Languages:', languages);

    if (!fs.existsSync(normalizedPath)) {
      console.error(`File not found: ${normalizedPath}`);
      throw new ErrorResponse(`File not found: ${normalizedPath}`, 404);
    }

    const availableLanguages = await checkAvailableLanguages(signal);
    console.log('Available Tesseract languages:', availableLanguages);

    try {
      await runBinary('tesseract', ['--version'], 10000, signal);

      console.log('Using enhanced Tesseract (300 DPI, page-by-page) for Arabic OCR processing');
      const extractedText = await extractTextWithEnhancedTesseract(
        normalizedPath,
        languages,
        availableLanguages,
        signal
      );
      if (signal && signal.aborted) {
        throw createAbortError();
      }
      if (extractedText && extractedText.trim().length > 0) {
        return cleanArabicOcrText(extractedText);
      }
    } catch (err) {
      if (err && (err.name === 'AbortError' || (signal && signal.aborted))) {
        throw err;
      }
      console.log('Enhanced Tesseract not available or failed, falling back to pdf-parse:', err.message);
    }

    if (signal && signal.aborted) {
      throw createAbortError();
    }

    console.log('Using pdf-parse for text extraction');
    const dataBuffer = fs.readFileSync(normalizedPath);
    const data = await pdfParse(dataBuffer);
    const cleanedText = enhancedArabicTextCleanup(data.text || '');

    return cleanArabicOcrText(cleanedText);
  } catch (error) {
    if (error && (error.name === 'AbortError' || (signal && signal.aborted))) {
      throw error;
    }
    console.error('OCR Processing Error:', error);
    if (error instanceof ErrorResponse) {
      throw error;
    }
    throw new ErrorResponse(`Error processing document with OCR: ${error.message}`, 500);
  }
};

/**
 * Check available Tesseract languages
 */
const checkAvailableLanguages = async (signal = null) => {
  try {
    const { stdout } = await runBinary('tesseract', ['--list-langs'], 10000, signal);
    return stdout
      .toLowerCase()
      .split('\n')
      .filter((lang) => lang.trim() !== '')
      .slice(1);
  } catch (error) {
    if (error && (error.name === 'AbortError' || (signal && signal.aborted))) {
      throw error;
    }
    console.log('Could not check available languages:', error.message);
    return [];
  }
};

/**
 * Determine total number of pages in a PDF using pdfinfo or pdf-parse fallback.
 */
async function getPdfPageCount(filePath, signal = null) {
  if (signal && signal.aborted) {
    throw createAbortError();
  }
  try {
    const { stdout } = await runBinary('pdfinfo', [filePath], 10000, signal);
    const match = stdout.match(/Pages:\s+(\d+)/i);
    if (match) {
      return Number(match[1]);
    }
  } catch (err) {
    if (err && (err.name === 'AbortError' || (signal && signal.aborted))) {
      throw err;
    }
  }

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(dataBuffer, { max: 1 });
    if (parsed && Number.isInteger(parsed.numpages) && parsed.numpages > 0) {
      return parsed.numpages;
    }
  } catch (_) {}

  return null;
}

/**
 * Convert a single PDF page to PNG at 300 DPI using pdftoppm.
 */
async function renderPdfPageToPng(filePath, pageNumber, outputPrefix, signal = null) {
  await runBinary(
    'pdftoppm',
    [
      '-png',
      '-r',
      String(OCR_DPI),
      '-f',
      String(pageNumber),
      '-l',
      String(pageNumber),
      '-aa',
      'yes',
      '-aaVector',
      'yes',
      filePath,
      outputPrefix,
    ],
    SUBPROCESS_TIMEOUT_MS,
    signal
  );

  const dir = path.dirname(outputPrefix);
  const base = path.basename(outputPrefix);
  const generated = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(base) && f.endsWith('.png'))
    .sort();

  return generated.length > 0 ? path.join(dir, generated[0]) : null;
}

/**
 * Extract text from a PDF using enhanced Tesseract OCR at 300 DPI, page by page,
 * inside the shared application temp folder with guaranteed cleanup on success and failure.
 */
const extractTextWithEnhancedTesseract = async (
  filePath,
  languages = 'ara+fra+eng',
  availableLanguages = [],
  signal = null
) => {
  if (signal && signal.aborted) {
    throw createAbortError();
  }
  const tempDir = path.join(getAppTempRoot(), `ocr-${uuidv4()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const detectedPages = await getPdfPageCount(filePath, signal);
    const maxPagesToProcess = Math.min(detectedPages || DEFAULT_MAX_PAGES, DEFAULT_MAX_PAGES);
    const languageConfig = determineBestLanguageConfig(languages, availableLanguages);
    console.log('Using language configuration:', languageConfig);

    let extractedText = '';

    for (let pageNumber = 1; pageNumber <= maxPagesToProcess; pageNumber++) {
      if (signal && signal.aborted) {
        throw createAbortError();
      }
      const pagePrefix = path.join(tempDir, `page_${pageNumber}`);
      let imagePath = null;
      let preprocessedImagePath = null;

      try {
        imagePath = await renderPdfPageToPng(filePath, pageNumber, pagePrefix, signal);
        if (!imagePath) {
          break; // No more pages
        }

        preprocessedImagePath = await preprocessImageForOCR(imagePath, signal);
        const targetImage = preprocessedImagePath || imagePath;
        let pageText = '';

        // Strategy 1: Arabic-only with PSM 3
        if (languageConfig.hasArabic) {
          try {
            const { stdout } = await runBinary('tesseract', [
              targetImage,
              'stdout',
              '-l',
              'ara',
              '--psm',
              '3',
              '--oem',
              '1',
              '-c',
              'preserve_interword_spaces=1',
              '-c',
              'textord_really_old_xheight=1',
              '-c',
              'textord_min_xheight=10',
              '-c',
              'load_system_dawg=1',
              '-c',
              'load_freq_dawg=1',
            ], SUBPROCESS_TIMEOUT_MS, signal);
            if (stdout && stdout.trim().length > 5 && containsArabicText(stdout)) {
              pageText = stdout;
            }
          } catch (error) {
            if (error && (error.name === 'AbortError' || (signal && signal.aborted))) throw error;
            console.log(`Strategy 1 failed for page ${pageNumber}:`, error.message.substring(0, 100));
          }
        }

        // Strategy 2: Arabic with PSM 6
        if ((!pageText || !containsArabicText(pageText)) && languageConfig.hasArabic) {
          try {
            const { stdout } = await runBinary('tesseract', [
              targetImage,
              'stdout',
              '-l',
              'ara',
              '--psm',
              '6',
              '--oem',
              '1',
              '-c',
              'preserve_interword_spaces=1',
              '-c',
              'textord_really_old_xheight=1',
              '-c',
              'textord_min_xheight=8',
            ], SUBPROCESS_TIMEOUT_MS, signal);
            if (stdout && stdout.trim().length > pageText.trim().length && containsArabicText(stdout)) {
              pageText = stdout;
            }
          } catch (error) {
            if (error && (error.name === 'AbortError' || (signal && signal.aborted))) throw error;
            console.log(`Strategy 2 failed for page ${pageNumber}:`, error.message.substring(0, 100));
          }
        }

        // Strategy 3: Arabic with PSM 4
        if ((!pageText || !containsArabicText(pageText)) && languageConfig.hasArabic) {
          try {
            const { stdout } = await runBinary('tesseract', [
              targetImage,
              'stdout',
              '-l',
              'ara',
              '--psm',
              '4',
              '--oem',
              '1',
              '-c',
              'preserve_interword_spaces=1',
            ], SUBPROCESS_TIMEOUT_MS, signal);
            if (stdout && stdout.trim().length > pageText.trim().length && containsArabicText(stdout)) {
              pageText = stdout;
            }
          } catch (error) {
            if (error && (error.name === 'AbortError' || (signal && signal.aborted))) throw error;
            console.log(`Strategy 3 failed for page ${pageNumber}:`, error.message.substring(0, 100));
          }
        }

        // Strategy 4: Multi-language
        if ((!pageText || !containsArabicText(pageText)) && languageConfig.languages.length > 0) {
          try {
            const { stdout } = await runBinary('tesseract', [
              targetImage,
              'stdout',
              '-l',
              languageConfig.languages.join('+'),
              '--psm',
              '3',
              '--oem',
              '1',
              '-c',
              'preserve_interword_spaces=1',
            ], SUBPROCESS_TIMEOUT_MS, signal);
            if (stdout && stdout.trim().length > pageText.trim().length) {
              pageText = stdout;
            }
          } catch (error) {
            if (error && (error.name === 'AbortError' || (signal && signal.aborted))) throw error;
            console.log(`Strategy 4 failed for page ${pageNumber}:`, error.message.substring(0, 100));
          }
        }

        // Strategy 5: English/French fallback
        if ((!pageText || pageText.trim().length < 5) && (languageConfig.hasEnglish || languageConfig.hasFrench)) {
          try {
            const fallbackLang = languageConfig.hasEnglish ? 'eng' : 'fra';
            const { stdout } = await runBinary('tesseract', [
              targetImage,
              'stdout',
              '-l',
              fallbackLang,
              '--psm',
              '3',
              '--oem',
              '1',
              '-c',
              'preserve_interword_spaces=1',
            ], SUBPROCESS_TIMEOUT_MS, signal);
            if (stdout && stdout.trim().length > pageText.trim().length) {
              pageText = stdout;
            }
          } catch (error) {
            if (error && (error.name === 'AbortError' || (signal && signal.aborted))) throw error;
            console.log(`Strategy 5 failed for page ${pageNumber}:`, error.message.substring(0, 100));
          }
        }

        if (pageText && pageText.trim().length > 0) {
          extractedText += pageText + '\n';
        }
      } finally {
        // Delete current page's temporary PNGs immediately to keep disk/memory usage minimal
        if (preprocessedImagePath && preprocessedImagePath !== imagePath && fs.existsSync(preprocessedImagePath)) {
          try { fs.unlinkSync(preprocessedImagePath); } catch (_) {}
        }
        if (imagePath && fs.existsSync(imagePath)) {
          try { fs.unlinkSync(imagePath); } catch (_) {}
        }
      }
    }

    if (extractedText) {
      extractedText = enhancedArabicTextCleanup(extractedText);
      extractedText = cleanArabicOcrText(extractedText);
    }

    return extractedText;
  } catch (error) {
    if (error && (error.name === 'AbortError' || (signal && signal.aborted))) {
      throw error;
    }
    console.error('Enhanced Tesseract OCR error:', error);
    return null;
  } finally {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('[OCR] Cleanup error for tempDir:', cleanupError.message);
      }
    }
  }
};

/**
 * Preprocess image for better OCR results on scanned documents with ImageMagick memory limits.
 */
const preprocessImageForOCR = async (imagePath, signal = null) => {
  try {
    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const base = path.basename(imagePath, ext);
    const processedPath = path.join(dir, `${base}_processed${ext}`);
    const bin = process.platform === 'win32' ? 'magick' : 'convert';

    await runBinary(
      bin,
      [
        '-limit',
        'memory',
        '256MiB',
        '-limit',
        'map',
        '512MiB',
        imagePath,
        '-density',
        String(OCR_DPI),
        '-type',
        'Grayscale',
        '-contrast-stretch',
        '1%x1%',
        '-median',
        '1',
        '-despeckle',
        '-enhance',
        '-sharpen',
        '0x1',
        processedPath,
      ],
      30000,
      signal
    );

    if (fs.existsSync(processedPath)) {
      return processedPath;
    }
    return imagePath;
  } catch (err) {
    if (err && (err.name === 'AbortError' || (signal && signal.aborted))) {
      throw err;
    }
    return imagePath;
  }
};

const containsArabicText = (text) => {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

const determineBestLanguageConfig = (requestedLanguages, availableLanguages) => {
  const requested = requestedLanguages.split('+').map((lang) => lang.trim().toLowerCase());
  const available = availableLanguages.map((lang) => lang.trim().toLowerCase());

  const hasArabic = requested.includes('ara') && available.includes('ara');
  const hasFrench = requested.includes('fra') && available.includes('fra');
  const hasEnglish = requested.includes('eng') && available.includes('eng');

  const languages = [];
  if (hasArabic) languages.push('ara');
  if (hasFrench) languages.push('fra');
  if (hasEnglish) languages.push('eng');

  if (languages.length === 0 && available.length > 0) {
    const commonLanguages = ['eng', 'fra', 'deu', 'spa', 'ita'];
    for (const lang of commonLanguages) {
      if (available.includes(lang)) {
        languages.push(lang);
        break;
      }
    }
    if (languages.length === 0) {
      languages.push(available[0]);
    }
  }

  return {
    languages,
    hasArabic,
    hasFrench,
    hasEnglish,
    message: languages.length === 0 ? 'No languages available' : `Using languages: ${languages.join(', ')}`,
  };
};

const enhancedArabicTextCleanup = (text) => {
  if (!text || text.trim().length === 0) return '';

  if (text.trim().match(/^[\d\s\.\-\|\[\](){}_=+*&%$#@!~`^'"<>?/\\]+$/) && text.trim().length < 20) {
    return '';
  }

  if (
    text.trim().match(/^[|lI1\[\](){}\s]+$/) ||
    text.trim().match(/^[\d\s]{1,5}$/) ||
    text.trim().length < 3
  ) {
    return '';
  }

  const cleanedText = text
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\r/g, '')
    .replace(/ﻻ/g, 'لا')
    .replace(/ﷲ/g, 'الله')
    .replace(/ﱁ/g, 'تع')
    .replace(/ﻵ/g, 'لآ')
    .replace(/ﻷ/g, 'لأ')
    .replace(/ﻹ/g, 'لإ')
    .replace(/ﻩ/g, 'ه')
    .replace(/ﻯ/g, 'ي')
    .replace(/ﻱ/g, 'ي')
    .replace(/ﻙ/g, 'ك')
    .replace(/ﻝ/g, 'ل')
    .replace(/ﻡ/g, 'م')
    .replace(/ﻥ/g, 'ن')
    .replace(/ﻫ/g, 'ه')
    .replace(/ﻭ/g, 'و')
    .replace(/ﻳ/g, 'ي')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ة')
    .replace(/[،,]{2,}/g, '،')
    .replace(/[؛;]{2,}/g, '؛')
    .replace(/[؟?]{2,}/g, '؟')
    .replace(/[:.]{2,}/g, ':')
    .replace(/(.)\1{4,}/g, '$1$1$1')
    .replace(/\s+/g, ' ')
    .trim();

  const lines = cleanedText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 2) return false;
      if (line.match(/^[|lI1\[\](){}\s\d\.\-]+$/)) return false;
      return (
        /[\u0600-\u06FF\u0660-\u0669\u06F0-\u06F9]/.test(line) ||
        (line.length > 5 && /[a-zA-Z]/.test(line))
      );
    });

  const result = lines.join('\n').trim();
  const arabicCharCount = (result.match(/[\u0600-\u06FF]/g) || []).length;
  const totalCharCount = result.replace(/\s/g, '').length;

  if (arabicCharCount > 0) {
    return result;
  }

  if (
    totalCharCount > 10 &&
    /[a-zA-Z]/.test(result) &&
    !result.match(/^[\d\s\.\-\|\[\](){}_=+*&%$#@!~`^'"<>?/\\]+$/)
  ) {
    return result;
  }

  return '';
};

const checkLanguageSupport = async () => {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    await runBinary(checkCmd, ['tesseract'], 10000);

    const availableLanguages = await checkAvailableLanguages();
    const hasArabic = availableLanguages.includes('ara');
    const hasFrench = availableLanguages.includes('fra');
    const hasEnglish = availableLanguages.includes('eng');

    let versionInfo = '';
    try {
      const { stdout: versionStdout } = await runBinary('tesseract', ['--version'], 10000);
      versionInfo = versionStdout.split('\n')[0];
    } catch (_) {
      versionInfo = 'Version check failed';
    }

    return {
      supported: true,
      arabic: hasArabic,
      french: hasFrench,
      english: hasEnglish,
      allAvailable: hasArabic && hasFrench && hasEnglish,
      version: versionInfo,
      availableLanguages: availableLanguages.join(', '),
      installInstructions:
        !hasArabic || !hasFrench
          ? 'Install missing language packs: sudo apt-get install tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng'
          : null,
      arabicOptimizationTips: hasArabic
        ? [
            'Use 300 DPI for clear Arabic OCR without excessive memory usage',
            'Ensure good lighting and contrast for better Arabic character recognition',
            'Clean scanned images work better than photographed documents',
          ]
        : null,
    };
  } catch (_) {
    return {
      supported: false,
      message: 'Tesseract not available or error checking languages',
      installInstructions:
        'Install Tesseract and language packs: sudo apt-get install tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng poppler-utils imagemagick',
    };
  }
};

function normalizeArabicText(text) {
  if (!text || typeof text !== 'string') return '';

  const presentationFormsMap = {
    'ﺀ': 'ء', 'ﺁ': 'آ', 'ﺂ': 'آ', 'ﺃ': 'أ', 'ﺄ': 'أ', 'ﺅ': 'ؤ', 'ﺆ': 'ؤ',
    'ﺇ': 'إ', 'ﺈ': 'إ', 'ﺉ': 'ئ', 'ﺊ': 'ئ', 'ﺋ': 'ئ', 'ﺌ': 'ئ', 'ﺍ': 'ا',
    'ﺎ': 'ا', 'ﺏ': 'ب', 'ﺐ': 'ب', 'ﺑ': 'ب', 'ﺒ': 'ب', 'ﺓ': 'ة', 'ﺔ': 'ة',
    'ﺕ': 'ت', 'ﺖ': 'ت', 'ﺗ': 'ت', 'ﺘ': 'ت', 'ﺙ': 'ث', 'ﺚ': 'ث', 'ﺛ': 'ث',
    'ﺜ': 'ث', 'ﺝ': 'ج', 'ﺞ': 'ج', 'ﺟ': 'ج', 'ﺠ': 'ج', 'ﺡ': 'ح', 'ﺢ': 'ح',
    'ﺣ': 'ح', 'ﺤ': 'ح', 'ﺥ': 'خ', 'ﺦ': 'خ', 'ﺧ': 'خ', 'ﺨ': 'خ', 'ﺩ': 'د',
    'ﺪ': 'د', 'ﺫ': 'ذ', 'ﺬ': 'ذ', 'ﺭ': 'ر', 'ﺮ': 'ر', 'ﺯ': 'ز', 'ﺰ': 'ز',
    'ﺱ': 'س', 'ﺲ': 'س', 'ﺳ': 'س', 'ﺴ': 'س', 'ﺵ': 'ش', 'ﺶ': 'ش', 'ﺷ': 'ش',
    'ﺸ': 'ش', 'ﺹ': 'ص', 'ﺺ': 'ص', 'ﺻ': 'ص', 'ﺼ': 'ص', 'ﺽ': 'ض', 'ﺾ': 'ض',
    'ﺿ': 'ض', 'ﻀ': 'ض', 'ﻁ': 'ط', 'ﻂ': 'ط', 'ﻃ': 'ط', 'ﻄ': 'ط', 'ﻅ': 'ظ',
    'ﻆ': 'ظ', 'ﻇ': 'ظ', 'ﻈ': 'ظ', 'ﻉ': 'ع', 'ﻊ': 'ع', 'ﻋ': 'ع', 'ﻌ': 'ع',
    'ﻍ': 'غ', 'ﻎ': 'غ', 'ﻏ': 'غ', 'ﻐ': 'غ', 'ﻑ': 'ف', 'ﻒ': 'ف', 'ﻓ': 'ف',
    'ﻔ': 'ف', 'ﻕ': 'ق', 'ﻖ': 'ق', 'ﻗ': 'ق', 'ﻘ': 'ق', 'ﻙ': 'ك', 'ﻚ': 'ك',
    'ﻛ': 'ك', 'ﻜ': 'ك', 'ﻝ': 'ل', 'ﻞ': 'ل', 'ﻟ': 'ل', 'ﻠ': 'ل', 'ﻡ': 'م',
    'ﻢ': 'م', 'ﻣ': 'م', 'ﻤ': 'م', 'ﻥ': 'ن', 'ﻦ': 'ن', 'ﻧ': 'ن', 'ﻨ': 'ن',
    'ﻩ': 'ه', 'ﻪ': 'ه', 'ﻫ': 'ه', 'ﻬ': 'ه', 'ﻭ': 'و', 'ﻮ': 'و', 'ﻯ': 'ى',
    'ﻰ': 'ى', 'ﻱ': 'ي', 'ﻲ': 'ي', 'ﻳ': 'ي', 'ﻴ': 'ي', 'ﻵ': 'لا', 'ﻶ': 'لا',
    'ﻷ': 'لأ', 'ﻸ': 'لأ', 'ﻹ': 'لإ', 'ﻺ': 'لإ', 'ﻻ': 'لا', 'ﻼ': 'لا',
  };

  let normalized = text.replace(/[\uFB50-\uFDFF\uFE70-\uFEFF]/g, (char) => presentationFormsMap[char] || char);

  normalized = normalized
    .replace(/األ/g, 'الأ')
    .replace(/اإل/g, 'الإ')
    .replace(/اآل/g, 'الآ')
    .replace(/خالل/g, 'خلال')
    .replace(/واليات/g, 'ولايات')
    .replace(/والية/g, 'ولاية')
    .replace(/اإلفالت/g, 'الإفلات')
    .replace(/اإلذاعة/g, 'الإذاعة')
    .replace(/\bألكن\b/g, 'لكن')
    .replace(/الثالثاء/g, 'الثلاثاء')
    .replace(/الجوالن/g, 'الجولان');

  return normalized;
}

function cleanOcrNoise(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/^\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}(,\s*\d{1,2}:\d{2})?\s*$/gm, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4},\s*\d{1,2}:\d{2}/g, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/www\.[^\s]+/gi, '')
    .replace(/([،,.\u060C]){2,}/g, '$1')
    .replace(/([،,.\u060C\s]){5,}/g, ' ')
    .replace(/\b(\d+)(,\s*\d+){3,}\b/g, '')
    .replace(/[^\w\s\u0600-\u06FF،.:!?'"()\-]{3,}/g, '')
    .replace(/[\uFFFD\u25A1\u25A0]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return cleaned;
}

function cleanArabicOcrText(text) {
  if (!text || typeof text !== 'string') return '';

  const originalLength = text.length;
  let cleaned = normalizeArabicText(text);
  cleaned = cleanOcrNoise(cleaned);

  if (originalLength > 100 && cleaned.length < originalLength * 0.2) {
    return text;
  }

  return cleaned;
}

module.exports = {
  extractTextFromPDF,
  checkLanguageSupport,
  normalizeArabicText,
  cleanOcrNoise,
  cleanArabicOcrText,
};
