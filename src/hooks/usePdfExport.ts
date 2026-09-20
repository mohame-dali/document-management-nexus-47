import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { exportTableToPdf, PdfExportOptions } from '@/utils/pdfExportUtils';

export interface UsePdfExportReturn {
  isExporting: boolean;
  exportPdf: (options: PdfExportOptions) => Promise<void>;
  error: string | null;
}

/**
 * Reusable React hook for triggering PDF export
 */
export function usePdfExport(): UsePdfExportReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exportPdf = useCallback(async (options: PdfExportOptions): Promise<void> => {
    setIsExporting(true);
    setError(null);

    try {
      if (!options.rows || options.rows.length === 0) {
        toast.error('لا توجد بيانات للتصدير في القائمة الحالية');
        return;
      }

      await exportTableToPdf(options);
      toast.success('تم تصدير ملف PDF بنجاح');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير ملف PDF';
      console.error('Erreur export PDF:', err);
      setError(errorMessage);
      toast.error('فشل في تصدير ملف PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    exportPdf,
    error,
  };
}
