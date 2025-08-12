const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ErrorResponse = require('./errorResponse');
const os = require('os');

/**
 * Extract text from PDF file using OCR with enhanced Arabic support
 * @param {string} filePath - Path to the PDF file
 * @param {string} languages - Language codes for OCR (default: 'ara+fra+eng')
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromPDF = async (filePath, languages = 'ara+fra+eng') => {
  try {
    // Normalize file path to prevent double path issues
    let normalizedPath = path.normalize(filePath);
    
    // Fix duplicate path issue - if the path contains the project root twice, remove the duplication
    const projectRoot = path.dirname(path.dirname(__filename));
    if (normalizedPath.includes(projectRoot + projectRoot)) {
      normalizedPath = normalizedPath.replace(projectRoot + projectRoot, projectRoot);
    }
    
    // If the path is relative, make it absolute from project root
    if (!path.isAbsolute(normalizedPath)) {
      normalizedPath = path.join(projectRoot, normalizedPath);
    }
    
    console.log('OCR Processing file for Arabic text:', normalizedPath);
    console.log('OCR Languages:', languages);
    
    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error(`File not found: ${normalizedPath}`);
      throw new ErrorResponse(`File not found: ${normalizedPath}`, 404);
    }

    // Check language availability first
    const availableLanguages = await checkAvailableLanguages();
    console.log('Available Tesseract languages:', availableLanguages);
    
    // Always try using Tesseract for better Arabic OCR results
    try {
      // Check if Tesseract is available
      if (os.platform() !== 'win32') {
        await execAsync('which tesseract');
      } else {
        await execAsync('tesseract --version');
      }
      
      // Use enhanced Tesseract for Arabic OCR processing
      console.log('Using enhanced Tesseract for Arabic OCR processing');
      const extractedText = await extractTextWithEnhancedTesseract(normalizedPath, languages, availableLanguages);
      if (extractedText && extractedText.trim().length > 0) {
        return extractedText;
      }
    } catch (err) {
      console.log('Enhanced Tesseract not available or failed, falling back to pdf-parse');
      console.log('Error:', err.message);
    }

    // Fallback to pdf-parse for text extraction
    console.log('Using pdf-parse for text extraction');
    const dataBuffer = fs.readFileSync(normalizedPath);
    const data = await pdfParse(dataBuffer);
    
    // Apply Arabic text cleanup even to pdf-parse results
    const cleanedText = enhancedArabicTextCleanup(data.text);
    
    return cleanedText;
  } catch (error) {
    console.error('OCR Processing Error:', error);
    if (error instanceof ErrorResponse) {
      throw error;
    }
    throw new ErrorResponse(`Error processing document with OCR: ${error.message}`, 500);
  }
};

/**
 * Check available Tesseract languages
 * @returns {Promise<string[]>} - Array of available language codes
 */
const checkAvailableLanguages = async () => {
  try {
    const { stdout } = await execAsync('tesseract --list-langs');
    const languages = stdout.toLowerCase().split('\n').filter(lang => lang.trim() !== '').slice(1); // Remove first line "List of available languages"
    return languages;
  } catch (error) {
    console.log('Could not check available languages:', error.message);
    return [];
  }
};

/**
 * Extract text from a PDF using enhanced Tesseract OCR with superior Arabic support
 * @param {string} filePath - Path to the PDF file 
 * @param {string} languages - Language codes for OCR
 * @param {string[]} availableLanguages - Available language codes
 * @returns {Promise<string>} - Extracted text
 */
const extractTextWithEnhancedTesseract = async (filePath, languages = 'ara+fra+eng', availableLanguages = []) => {
  try {
    // Create temporary directory for image conversion
    const tempDir = path.join(os.tmpdir(), 'ocr-enhanced-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Use pdftoppm to convert PDF to high-resolution images optimized for Arabic text
    const baseName = path.join(tempDir, 'page');
    
    // Use high DPI (600) for better Arabic character recognition - reduced to prevent timeout
    let convertCommand;
    if (os.platform() === 'win32') {
      convertCommand = `pdftoppm -png -r 600 -aa yes -aaVector yes "${filePath}" "${baseName}"`;
    } else {
      convertCommand = `pdftoppm -png -r 600 -aa yes -aaVector yes "${filePath}" "${baseName}"`;
    }
    
    console.log('Converting PDF to images with command:', convertCommand);
    await execAsync(convertCommand);
    
    let extractedText = '';
    
    // Process each generated image with Arabic-optimized Tesseract strategies
    const files = fs.readdirSync(tempDir).filter(f => f.startsWith('page') && f.endsWith('.png'));
    files.sort(); // Ensure correct page order
    
    console.log(`Found ${files.length} pages to process`);
    
    // Determine best language configuration based on availability
    const languageConfig = determineBestLanguageConfig(languages, availableLanguages);
    console.log('Using language configuration:', languageConfig);
    
    for (const file of files) {
      const imagePath = path.join(tempDir, file);
      let pageText = '';
      
      console.log(`Processing ${file} with enhanced Arabic OCR strategies for scanned documents`);
      
      // First, preprocess the image for better OCR results
      const preprocessedImagePath = await preprocessImageForOCR(imagePath);
      
      // Strategy 1: Arabic-only with PSM 3 (auto page segmentation) - best for scanned documents
      if (languageConfig.hasArabic) {
        try {
          const arabicCommand = `tesseract "${preprocessedImagePath}" stdout -l ara --psm 3 --oem 1 -c preserve_interword_spaces=1 -c textord_really_old_xheight=1 -c textord_min_xheight=10 -c load_system_dawg=1 -c load_freq_dawg=1 -c tessedit_char_whitelist=""`;
          const { stdout: arabicResult } = await execAsync(arabicCommand);
          
          if (arabicResult && arabicResult.trim().length > 5 && containsArabicText(arabicResult)) {
            pageText = arabicResult;
            console.log(`Strategy 1 successful for ${file} - Arabic-only OCR with PSM 3, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 1 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Strategy 2: Arabic with PSM 6 (uniform text block) - good for structured documents
      if ((!pageText || !containsArabicText(pageText)) && languageConfig.hasArabic) {
        try {
          const arabicCommand = `tesseract "${preprocessedImagePath}" stdout -l ara --psm 6 --oem 1 -c preserve_interword_spaces=1 -c textord_really_old_xheight=1 -c textord_min_xheight=8`;
          const { stdout: arabicResult } = await execAsync(arabicCommand);
          
          if (arabicResult && arabicResult.trim().length > pageText.trim().length && containsArabicText(arabicResult)) {
            pageText = arabicResult;
            console.log(`Strategy 2 successful for ${file} - Arabic PSM 6, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 2 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Strategy 3: Arabic with PSM 4 (single column) - for simple layout scanned documents
      if ((!pageText || !containsArabicText(pageText)) && languageConfig.hasArabic) {
        try {
          const arabicCommand = `tesseract "${preprocessedImagePath}" stdout -l ara --psm 4 --oem 1 -c preserve_interword_spaces=1`;
          const { stdout: arabicResult } = await execAsync(arabicCommand);
          
          if (arabicResult && arabicResult.trim().length > pageText.trim().length && containsArabicText(arabicResult)) {
            pageText = arabicResult;
            console.log(`Strategy 3 successful for ${file} - Arabic PSM 4, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 3 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Strategy 4: Multi-language approach with Arabic priority for mixed content
      if ((!pageText || !containsArabicText(pageText)) && languageConfig.languages.length > 0) {
        try {
          const multiLangCommand = `tesseract "${preprocessedImagePath}" stdout -l ${languageConfig.languages.join('+')} --psm 3 --oem 1 -c preserve_interword_spaces=1`;
          const { stdout: multiResult } = await execAsync(multiLangCommand);
          
          if (multiResult && multiResult.trim().length > pageText.trim().length) {
            pageText = multiResult;
            console.log(`Strategy 4 successful for ${file} - Multi-language OCR, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 4 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Strategy 5: Try with image enhancement and different PSM modes
      if ((!pageText || pageText.trim().length < 10) && languageConfig.hasArabic) {
        try {
          // Try with PSM 8 (single word) for difficult scanned text
          const arabicCommand = `tesseract "${preprocessedImagePath}" stdout -l ara --psm 8 --oem 1 -c preserve_interword_spaces=1`;
          const { stdout: arabicResult } = await execAsync(arabicCommand);
          
          if (arabicResult && arabicResult.trim().length > pageText.trim().length) {
            pageText = arabicResult;
            console.log(`Strategy 5 successful for ${file} - Arabic PSM 8, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 5 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Strategy 6: English/French fallback with high accuracy settings
      if ((!pageText || pageText.trim().length < 5) && (languageConfig.hasEnglish || languageConfig.hasFrench)) {
        try {
          const fallbackLang = languageConfig.hasEnglish ? 'eng' : 'fra';
          const fallbackCommand = `tesseract "${preprocessedImagePath}" stdout -l ${fallbackLang} --psm 3 --oem 1 -c preserve_interword_spaces=1`;
          const { stdout: fallbackResult } = await execAsync(fallbackCommand);
          
          if (fallbackResult && fallbackResult.trim().length > pageText.trim().length) {
            pageText = fallbackResult;
            console.log(`Strategy 6 successful for ${file} - ${fallbackLang} fallback, extracted ${pageText.length} characters`);
          }
        } catch (error) {
          console.log(`Strategy 6 failed for ${file}:`, error.message.substring(0, 100));
        }
      }
      
      // Clean up preprocessed image
      if (preprocessedImagePath !== imagePath && fs.existsSync(preprocessedImagePath)) {
        try {
          fs.unlinkSync(preprocessedImagePath);
        } catch (cleanupError) {
          console.warn('Could not clean up preprocessed image:', cleanupError);
        }
      }
      
      if (pageText && pageText.trim().length > 0) {
        console.log(`Successfully extracted text from ${file}: "${pageText.substring(0, 100)}..."`);
        extractedText += pageText + '\n';
      } else {
        console.log(`No meaningful text extracted from ${file}`);
      }
    }
    
    // Clean up temp files
    try {
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }
    
    // Enhanced Arabic text cleanup and formatting
    if (extractedText) {
      console.log('Raw extracted text before cleanup:', extractedText.substring(0, 200));
      extractedText = enhancedArabicTextCleanup(extractedText);
      console.log('Text after cleanup:', extractedText.substring(0, 200));
    }
    
    return extractedText;
  } catch (error) {
    console.error('Enhanced Tesseract OCR error:', error);
    return null;
  }
};

/**
 * Preprocess image for better OCR results on scanned documents
 * @param {string} imagePath - Path to the input image
 * @returns {Promise<string>} - Path to the preprocessed image
 */
const preprocessImageForOCR = async (imagePath) => {
  try {
    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const base = path.basename(imagePath, ext);
    const processedPath = path.join(dir, `${base}_processed${ext}`);
    
    // Use ImageMagick to enhance the image for better OCR
    // Increase contrast, remove noise, and enhance text clarity
    const magickCommand = os.platform() === 'win32' 
      ? `magick "${imagePath}" -density 300 -type Grayscale -contrast-stretch 1%x1% -median 1 -despeckle -enhance -sharpen 0x1 "${processedPath}"`
      : `convert "${imagePath}" -density 300 -type Grayscale -contrast-stretch 1%x1% -median 1 -despeckle -enhance -sharpen 0x1 "${processedPath}"`;
    
    try {
      await execAsync(magickCommand);
      console.log('Image preprocessed successfully for OCR');
      return processedPath;
    } catch (magickError) {
      console.log('ImageMagick preprocessing failed, using original image:', magickError.message);
      return imagePath;
    }
  } catch (error) {
    console.log('Error preprocessing image, using original:', error.message);
    return imagePath;
  }
};

/**
 * Check if text contains Arabic characters
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains Arabic characters
 */
const containsArabicText = (text) => {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

/**
 * Determine the best language configuration based on availability
 * @param {string} requestedLanguages - Requested language codes
 * @param {string[]} availableLanguages - Available language codes
 * @returns {Object} - Language configuration object
 */
const determineBestLanguageConfig = (requestedLanguages, availableLanguages) => {
  const requested = requestedLanguages.split('+').map(lang => lang.trim().toLowerCase());
  const available = availableLanguages.map(lang => lang.trim().toLowerCase());
  
  const hasArabic = requested.includes('ara') && available.includes('ara');
  const hasFrench = requested.includes('fra') && available.includes('fra');
  const hasEnglish = requested.includes('eng') && available.includes('eng');
  
  const languages = [];
  if (hasArabic) languages.push('ara');
  if (hasFrench) languages.push('fra');
  if (hasEnglish) languages.push('eng');
  
  // If no requested languages are available, try to use any available language
  if (languages.length === 0 && available.length > 0) {
    // Prefer common languages
    const commonLanguages = ['eng', 'fra', 'deu', 'spa', 'ita'];
    for (const lang of commonLanguages) {
      if (available.includes(lang)) {
        languages.push(lang);
        break;
      }
    }
    
    // If no common languages, use the first available
    if (languages.length === 0) {
      languages.push(available[0]);
    }
  }
  
  return {
    languages,
    hasArabic,
    hasFrench,
    hasEnglish,
    message: languages.length === 0 ? 'No languages available' : `Using languages: ${languages.join(', ')}`
  };
};

/**
 * Enhanced cleanup and improvement of Arabic text recognition results
 * @param {string} text - Raw OCR text
 * @returns {string} - Enhanced and cleaned Arabic text
 */
const enhancedArabicTextCleanup = (text) => {
  if (!text || text.trim().length === 0) return '';
  
  console.log('Applying enhanced Arabic text cleanup to text of length:', text.length);
  
  // If text is just numbers, symbols, or very short meaningless content, filter it out
  if (text.trim().match(/^[\d\s\.\-\|\[\](){}_=+*&%$#@!~`^'"<>?/\\]+$/) && text.trim().length < 20) {
    console.log('Text appears to be OCR noise (only symbols/numbers):', text.trim());
    return '';
  }
  
  // Filter out obvious OCR artifacts and meaningless sequences
  if (text.trim().match(/^[|lI1\[\](){}\s]+$/) || 
      text.trim().match(/^[\d\s]{1,5}$/) ||
      text.trim().length < 3) {
    console.log('Text appears to be OCR artifacts:', text.trim());
    return '';
  }
  
  let cleanedText = text
    // First, preserve Arabic text structure and normalize whitespace
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\r/g, '')
    
    // Fix Arabic ligatures and common OCR errors
    .replace(/ﻻ/g, 'لا') // Fix lam-alef ligature
    .replace(/ﷲ/g, 'الله') // Fix Allah ligature
    .replace(/ﱁ/g, 'تع') // Fix common ligature
    .replace(/ﻵ/g, 'لآ') // Fix lam-alef with hamza
    .replace(/ﻷ/g, 'لأ') // Fix lam-alef with hamza
    .replace(/ﻹ/g, 'لإ') // Fix lam-alef with hamza
    
    // Fix common Arabic OCR character confusions
    .replace(/ﻩ/g, 'ه') // Fix heh form
    .replace(/ﻯ/g, 'ي') // Fix yeh form
    .replace(/ﻱ/g, 'ي') // Fix yeh form
    .replace(/ﻙ/g, 'ك') // Fix kaf form
    .replace(/ﻝ/g, 'ل') // Fix lam form
    .replace(/ﻡ/g, 'م') // Fix meem form
    .replace(/ﻥ/g, 'ن') // Fix noon form
    .replace(/ﻫ/g, 'ه') // Fix heh form
    .replace(/ﻭ/g, 'و') // Fix waw form
    .replace(/ﻳ/g, 'ي') // Fix yeh form
    
    // Normalize Arabic characters carefully (but preserve meaningful variations)
    .replace(/[أإآ]/g, 'ا') // Normalize alef variations
    .replace(/[ى]/g, 'ي') // Normalize yeh variations
    .replace(/[ة]/g, 'ة') // Keep teh marbuta
    
    // Fix Arabic punctuation
    .replace(/[،,]{2,}/g, '،')
    .replace(/[؛;]{2,}/g, '؛')
    .replace(/[؟?]{2,}/g, '؟')
    .replace(/[:.]{2,}/g, ':')
    
    // Remove excessive character repetition but preserve intentional repetition
    .replace(/(.)\1{4,}/g, '$1$1$1')
    
    // Clean up spacing
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into lines and clean each line
  const lines = cleanedText.split('\n').map(line => {
    const trimmedLine = line.trim();
    return trimmedLine;
  }).filter(line => {
    if (line.length < 2) return false;
    // Filter out lines that are just artifacts
    if (line.match(/^[|lI1\[\](){}\s\d\.\-]+$/)) return false;
    // Keep lines with Arabic characters, meaningful text, or substantial content
    return /[\u0600-\u06FF\u0660-\u0669\u06F0-\u06F9]/.test(line) || 
           (line.length > 5 && /[a-zA-Z]/.test(line));
  });
  
  const result = lines.join('\n').trim();
  
  // Count Arabic characters for debugging
  const arabicCharCount = (result.match(/[\u0600-\u06FF]/g) || []).length;
  const totalCharCount = result.replace(/\s/g, '').length;
  
  console.log(`Arabic text cleaned: ${arabicCharCount} Arabic characters, ${totalCharCount} total characters`);
  
  // If we have Arabic characters, return the result
  if (arabicCharCount > 0) {
    console.log('Cleaned Arabic text sample:', result.substring(0, 100));
    return result;
  }
  
  // If no Arabic characters but we have meaningful text (substantial content), return it
  if (totalCharCount > 10 && /[a-zA-Z]/.test(result) && !result.match(/^[\d\s\.\-\|\[\](){}_=+*&%$#@!~`^'"<>?/\\]+$/)) {
    console.log('No Arabic characters found, but returning meaningful text:', result.substring(0, 100));
    return result;
  }
  
  console.log('Text appears to be OCR noise, returning empty string');
  return '';
};

/**
 * Check if required language packs are installed for Tesseract with enhanced Arabic support
 * @returns {Promise<Object>} - Status of language pack availability
 */
const checkLanguageSupport = async () => {
  try {
    if (os.platform() === 'win32') {
      return { 
        supported: false, 
        message: 'Language check not available on Windows',
        recommendations: 'For Windows, install Tesseract from GitHub releases and ensure Arabic language data is included'
      };
    }

    // Check if tesseract is available
    await execAsync('which tesseract');
    
    // Check available languages
    const availableLanguages = await checkAvailableLanguages();
    
    const hasArabic = availableLanguages.includes('ara');
    const hasFrench = availableLanguages.includes('fra');
    const hasEnglish = availableLanguages.includes('eng');
    
    // Check tesseract version for optimal Arabic support
    let versionInfo = '';
    try {
      const { stdout: versionStdout } = await execAsync('tesseract --version');
      versionInfo = versionStdout.split('\n')[0];
    } catch (vErr) {
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
      installInstructions: !hasArabic || !hasFrench ? 
        'Install missing language packs: sudo apt-get install tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng' : null,
      arabicOptimizationTips: hasArabic ? [
        'Use high resolution (1200-2400 DPI) when scanning Arabic documents',
        'Ensure good lighting and contrast for better Arabic character recognition',
        'For handwritten Arabic, consider using PSM 8 (single word) mode',
        'Clean scanned images work better than photographed documents'
      ] : null
    };
  } catch (error) {
    return {
      supported: false,
      message: 'Tesseract not available or error checking languages',
      installInstructions: 'Install Tesseract and language packs: sudo apt-get install tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra tesseract-ocr-eng poppler-utils imagemagick',
      arabicSupportNotes: 'For optimal Arabic OCR, ensure you have the latest Tesseract version (4.1+) with trained Arabic data'
    };
  }
};

module.exports = {
  extractTextFromPDF,
  checkLanguageSupport
};
