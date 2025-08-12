
import { useState, useCallback, useRef, useEffect } from 'react';
import { ocrService } from '@/services/offlineOcrService';

interface UseOfflineOcrResult {
  extractText: (file: File) => Promise<string>;
  isProcessing: boolean;
  error: string | null;
  progress: number;
  cleanup: () => void;
}

export const useOfflineOcr = (): UseOfflineOcrResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // Cleanup OCR service resources
    ocrService.cleanup().catch(err => {
      console.warn('OCR cleanup warning:', err);
    });
  }, []);

  const extractText = useCallback(async (file: File): Promise<string> => {
    if (isUnmountedRef.current) {
      throw new Error('Component unmounted');
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    // Clear any existing progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    try {
      // Validate file size and type
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 50MB.');
      }

      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error('Unsupported file type. Please upload a PDF or image file.');
      }

      // Start progress simulation
      progressIntervalRef.current = setInterval(() => {
        if (isUnmountedRef.current) {
          return;
        }
        setProgress(prev => Math.min(prev + 8, 85));
      }, 800);

      let result;
      
      try {
        if (file.type === 'application/pdf') {
          result = await ocrService.extractFromPdf(file);
        } else if (file.type.startsWith('image/')) {
          result = await ocrService.extractFromImage(file);
        } else {
          throw new Error('Unsupported file type.');
        }
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        throw new Error(`OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
      }

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (!isUnmountedRef.current) {
        setProgress(100);
      }
      
      return result.text || '';
    } catch (err) {
      console.error('Text extraction error:', err);
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      
      if (!isUnmountedRef.current) {
        setError(errorMessage);
      }
      throw new Error(errorMessage);
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (!isUnmountedRef.current) {
        setIsProcessing(false);
        // Reset progress after a delay
        setTimeout(() => {
          if (!isUnmountedRef.current) {
            setProgress(0);
          }
        }, 2000);
      }
    }
  }, []);

  return {
    extractText,
    isProcessing,
    error,
    progress,
    cleanup
  };
};
