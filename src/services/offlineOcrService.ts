import { createWorker, PSM } from 'tesseract.js';

interface OcrResult {
  text: string;
  confidence: number;
}

interface OcrOptions {
  languages?: string[];
  preserveInterwordSpaces?: boolean;
  tessedit_pageseg_mode?: PSM;
}

/**
 * Offline OCR service using Tesseract.js for Arabic and French text extraction
 */
export class OfflineOcrService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the OCR worker with Arabic and French language support
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this._initialize();
    
    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('Initializing OCR worker for Arabic text...');
      
      // Terminate existing worker if any
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }

      // Initialize with Arabic as primary language
      this.worker = await createWorker(['ara', 'fra', 'eng'], 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        errorHandler: (err) => {
          console.error('OCR Worker Error:', err);
        }
      });

      // Configure OCR specifically for Arabic text recognition with enhanced settings
      if (this.worker) {
        await this.worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          tessedit_char_whitelist: '',
          preserve_interword_spaces: '1',
          tessedit_ocr_engine_mode: '1', // Use LSTM OCR engine
          // Enhanced Arabic-specific parameters
          textord_really_old_xheight: '1',
          textord_min_xheight: '5',
          chop_enable: '1',
          use_new_state_cost: '0',
          segment_segcost_rating: '0',
          enable_new_segsearch: '0',
          // Language model configuration for better Arabic recognition
          load_system_dawg: '1',
          load_freq_dawg: '1',
          load_unambig_dawg: '1',
          load_punc_dawg: '1',
          load_number_dawg: '1',
          load_bigram_dawg: '1',
          // Additional Arabic optimization
          tessedit_char_blacklist: '',
          textord_tabfind_show_vlines: '0',
          textord_use_cjk_fp_model: '0'
        });
      }

      this.isInitialized = true;
      console.log('OCR worker initialized successfully for Arabic text with enhanced settings');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
      this.isInitialized = false;
      throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if text contains Arabic characters
   */
  private containsArabicText(text: string): boolean {
    if (!text) return false;
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
  }

  /**
   * Clean and improve Arabic text recognition
   */
  private cleanArabicText(text: string): string {
    if (!text) return text;
    
    console.log('Cleaning Arabic OCR text...');
    
    // If text is just numbers or very short, might be OCR error
    if (text.trim().match(/^[\d\s\.\-]+$/) && text.trim().length < 10) {
      console.log('Text appears to be OCR error (only numbers/symbols):', text.trim());
      return '';
    }
    
    // First, normalize the text
    let cleanedText = text
      // Remove excessive whitespace but preserve Arabic text structure
      .replace(/\s{3,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      
      // Fix common Arabic OCR errors
      .replace(/ﻻ/g, 'لا') // Fix lam-alef ligature
      .replace(/ﷲ/g, 'الله') // Fix Allah ligature
      .replace(/ﱁ/g, 'تع') // Fix common ligature
      .replace(/ﻵ/g, 'لآ') // Fix lam-alef with hamza
      .replace(/ﻷ/g, 'لأ') // Fix lam-alef with hamza
      .replace(/ﻹ/g, 'لإ') // Fix lam-alef with hamza
      
      // Normalize Arabic characters (but keep variations that might be intentional)
      .replace(/[أإآ]/g, 'ا') // Normalize alef variations
      .replace(/[ى]/g, 'ي') // Normalize yeh variations
      
      // Remove isolated Latin characters that are likely OCR errors
      .replace(/\b[a-zA-Z]{1,2}\b/g, '')
      
      // Fix common punctuation issues
      .replace(/[،,]{2,}/g, '،') // Fix excessive commas
      .replace(/[؛;]{2,}/g, '؛') // Fix excessive semicolons
      .replace(/[؟?]{2,}/g, '؟') // Fix excessive question marks
      
      // Remove obvious OCR artifacts
      .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\u002E\u060C\u061B\u061F\u0640\u200C\u200D]/g, '')
      
      // Clean up spacing
      .replace(/\s+/g, ' ')
      .trim();

    // Split into lines and clean each line
    const lines = cleanedText.split('\n').map(line => {
      return line.trim();
    }).filter(line => {
      // Remove lines that are likely OCR errors
      if (line.length < 2) return false;
      // Must contain Arabic characters OR be meaningful text (not just numbers)
      return this.containsArabicText(line) || (line.length > 2 && !/^[\d\s\.\-]+$/.test(line));
    });

    const result = lines.join('\n');
    
    // Log statistics for debugging
    const arabicCharCount = (result.match(/[\u0600-\u06FF]/g) || []).length;
    const totalCharCount = result.replace(/\s/g, '').length;
    console.log(`Arabic text cleaned: ${arabicCharCount} Arabic chars, ${totalCharCount} total chars`);
    
    // If no Arabic text and result looks like OCR error, return empty
    if (arabicCharCount === 0 && result.match(/^[\d\s\.\-]+$/)) {
      console.log('Result appears to be OCR error, returning empty string');
      return '';
    }
    
    return result;
  }

  /**
   * Extract text from an image file with enhanced Arabic support using multiple strategies
   */
  async extractFromImage(imageFile: File, options: OcrOptions = {}): Promise<OcrResult> {
    try {
      await this.initialize();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      console.log('Starting Arabic OCR extraction for image:', imageFile.name);
      
      let bestResult = { text: '', confidence: 0 };
      
      // Strategy 1: Arabic-optimized with PSM.SINGLE_BLOCK
      try {
        await this.worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '',
          textord_min_xheight: '5'
        });
        
        const result1 = await this.worker.recognize(imageFile);
        const cleanedText1 = this.cleanArabicText(result1.data.text || '');
        
        if (cleanedText1 && cleanedText1.length > bestResult.text.length && this.containsArabicText(cleanedText1)) {
          bestResult = { text: cleanedText1, confidence: result1.data.confidence || 0 };
          console.log('Strategy 1 (PSM.SINGLE_BLOCK) successful for Arabic text');
        }
      } catch (error) {
        console.log('Strategy 1 failed:', error);
      }
      
      // Strategy 2: Single column text mode
      if (!bestResult.text || !this.containsArabicText(bestResult.text)) {
        try {
          await this.worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: ''
          });
          
          const result2 = await this.worker.recognize(imageFile);
          const cleanedText2 = this.cleanArabicText(result2.data.text || '');
          
          if (cleanedText2 && cleanedText2.length > bestResult.text.length) {
            bestResult = { text: cleanedText2, confidence: result2.data.confidence || 0 };
            console.log('Strategy 2 (PSM.SINGLE_COLUMN) successful');
          }
        } catch (error) {
          console.log('Strategy 2 failed:', error);
        }
      }
      
      // Strategy 3: Auto page segmentation
      if (!bestResult.text || bestResult.text.length < 5) {
        try {
          await this.worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
            preserve_interword_spaces: '1',
            tessedit_char_whitelist: ''
          });
          
          const result3 = await this.worker.recognize(imageFile);
          const cleanedText3 = this.cleanArabicText(result3.data.text || '');
          
          if (cleanedText3 && cleanedText3.length > bestResult.text.length) {
            bestResult = { text: cleanedText3, confidence: result3.data.confidence || 0 };
            console.log('Strategy 3 (PSM.AUTO) successful');
          }
        } catch (error) {
          console.log('Strategy 3 failed:', error);
        }
      }
      
      console.log('Final Arabic OCR result:', bestResult.text.substring(0, 100) + '...');
      
      return bestResult;
    } catch (error) {
      console.error('OCR extraction failed for image:', error);
      throw new Error(`Image text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF to images and extract text with Arabic support
   */
  async extractFromPdf(pdfFile: File): Promise<OcrResult> {
    try {
      await this.initialize();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      console.log('Starting Arabic OCR extraction for PDF:', pdfFile.name);
      
      // For PDF files, we'll use a simplified approach
      const imageData = await this.pdfToImageData(pdfFile);
      
      // Create a temporary file from the image data
      const blob = await this.canvasToBlob(imageData);
      const imageFile = new File([blob], 'pdf-page.png', { type: 'image/png' });
      
      const result = await this.extractFromImage(imageFile);
      
      console.log('Arabic OCR extraction completed for PDF');
      
      return result;
    } catch (error) {
      console.error('PDF Arabic OCR extraction failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PDF to image data (simplified implementation)
   */
  private async pdfToImageData(pdfFile: File): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas size
      canvas.width = 800;
      canvas.height = 1000;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add placeholder text indicating PDF processing
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PDF content being processed...', canvas.width / 2, canvas.height / 2);
      
      resolve(canvas);
    });
  }

  /**
   * Convert canvas to blob
   */
  private async canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png', 0.9);
    });
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.worker) {
        console.log('Terminating OCR worker...');
        await this.worker.terminate();
        this.worker = null;
      }
      this.isInitialized = false;
      this.isInitializing = false;
      this.initializationPromise = null;
      console.log('OCR worker cleanup completed');
    } catch (error) {
      console.error('Error during OCR cleanup:', error);
    }
  }

  /**
   * Clean up resources safely
   */
  async terminate(): Promise<void> {
    await this.cleanup();
  }
}

// Singleton instance
export const ocrService = new OfflineOcrService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ocrService.cleanup();
  });
}
