import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  exportDailyReportToPdf,
  exportMonthlyReportToPdf,
  exportYearlyReportToPdf,
  exportDailyAttendanceSheetToPdf,
  AttendanceExportOptions,
  DailyReportData,
  MonthlyReportData,
  YearlyReportData,
  DailyAttendanceAgentItem,
} from '@/utils/attendanceExportUtils';
import {
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
} from '@/services/attendanceService';

export interface UseAttendanceExportReturn {
  isExporting: boolean;
  error: string | null;
  // Fonctions d'export direct à partir des données
  exportDailyReport: (
    data: DailyReportData,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  exportMonthlyReport: (
    data: MonthlyReportData,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  exportYearlyReport: (
    data: YearlyReportData,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  exportDailySheet: (
    items: DailyAttendanceAgentItem[],
    date: string,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  // Fonctions d'extraction API + export direct (prêtes pour la Phase B2)
  exportDailyByDate: (
    date: string,
    departmentId?: string,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  exportMonthlyByPeriod: (
    year: number,
    month: number,
    departmentId?: string,
    options?: AttendanceExportOptions
  ) => Promise<void>;
  exportYearlyByYear: (
    year: number,
    departmentId?: string,
    options?: AttendanceExportOptions
  ) => Promise<void>;
}

/**
 * Hook personnalisé React pour orchestrer l'export PDF des rapports de présence
 * Utilisé dans la page de présence et les vues de situation globale
 */
export function useAttendanceExport(): UseAttendanceExportReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Export direct rapport journalier
  const exportDailyReport = useCallback(
    async (data: DailyReportData, options?: AttendanceExportOptions): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري إنشاء تقرير الحضور اليومي بصيغة PDF...');

      try {
        if (!data || data.totalCount === 0) {
          toast.error('لا توجد بيانات حضور لتصديرها لهذا اليوم', { id: toastId });
          return;
        }

        await exportDailyReportToPdf(data, options);
        toast.success('تم تصدير تقرير الحضور اليومي بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير التقرير اليومي';
        console.error('Erreur export rapport quotidien PDF:', err);
        setError(msg);
        toast.error('فشل في تصدير تقرير الحضور اليومي', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 2. Export direct rapport mensuel
  const exportMonthlyReport = useCallback(
    async (data: MonthlyReportData, options?: AttendanceExportOptions): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري إنشاء تقرير الحضور الشهري بصيغة PDF...');

      try {
        if (!data || !data.records || data.records.length === 0) {
          toast.error('لا توجد سجلات حضور لتصديرها لهذا الشهر', { id: toastId });
          return;
        }

        await exportMonthlyReportToPdf(data, options);
        toast.success('تم تصدير تقرير الحضور الشهري بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير التقرير الشهري';
        console.error('Erreur export rapport mensuel PDF:', err);
        setError(msg);
        toast.error('فشل في تصدير تقرير الحضور الشهري', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 3. Export direct rapport annuel
  const exportYearlyReport = useCallback(
    async (data: YearlyReportData, options?: AttendanceExportOptions): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري إنشاء حصيلة الحضور السنوية بصيغة PDF...');

      try {
        if (!data || !data.records || data.records.length === 0) {
          toast.error('لا توجد سجلات حضور لتصديرها لهذه السنة', { id: toastId });
          return;
        }

        await exportYearlyReportToPdf(data, options);
        toast.success('تم تصدير الحصيلة السنوية للحضور بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير الحصيلة السنوية';
        console.error('Erreur export rapport annuel PDF:', err);
        setError(msg);
        toast.error('فشل في تصدير الحصيلة السنوية', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 4. Export direct feuille collective de présence
  const exportDailySheet = useCallback(
    async (
      items: DailyAttendanceAgentItem[],
      date: string,
      options?: AttendanceExportOptions
    ): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري إنشاء جدول الحضور اليومي بصيغة PDF...');

      try {
        if (!items || items.length === 0) {
          toast.error('لا يوجد موظفون في القائمة للتصدير', { id: toastId });
          return;
        }

        await exportDailyAttendanceSheetToPdf(items, date, options);
        toast.success('تم تصدير جدول الحضور اليومي بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تصدير جدول الحضور';
        console.error('Erreur export feuille journalière PDF:', err);
        setError(msg);
        toast.error('فشل في تصدير جدول الحضور', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 5. Récupération API + Export Rapport Quotidien
  const exportDailyByDate = useCallback(
    async (
      date: string,
      departmentId?: string,
      options?: AttendanceExportOptions
    ): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري استرجاع بيانات الحضور وتوليد ملف PDF...');

      try {
        const res = (await getDailyReport(date, departmentId)) as {
          success: boolean;
          data: DailyReportData;
        };

        if (!res?.data) {
          throw new Error('بيانات التقرير غير متوفرة');
        }

        await exportDailyReportToPdf(res.data, options);
        toast.success('تم تصدير تقرير الحضور اليومي بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل في تحميل أو تصدير التقرير اليومي';
        console.error('Erreur exportDailyByDate:', err);
        setError(msg);
        toast.error('فشل في تصدير تقرير الحضور اليومي', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 6. Récupération API + Export Rapport Mensuel
  const exportMonthlyByPeriod = useCallback(
    async (
      year: number,
      month: number,
      departmentId?: string,
      options?: AttendanceExportOptions
    ): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري استرجاع تقرير الشهر وتوليد ملف PDF...');

      try {
        const res = (await getMonthlyReport(year, month, departmentId)) as {
          success: boolean;
          data: MonthlyReportData;
        };

        if (!res?.data) {
          throw new Error('بيانات التقرير غير متوفرة');
        }

        await exportMonthlyReportToPdf(res.data, options);
        toast.success('تم تصدير تقرير الحضور الشهري بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل في تحميل أو تصدير التقرير الشهري';
        console.error('Erreur exportMonthlyByPeriod:', err);
        setError(msg);
        toast.error('فشل في تصدير تقرير الحضور الشهري', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // 7. Récupération API + Export Rapport Annuel
  const exportYearlyByYear = useCallback(
    async (
      year: number,
      departmentId?: string,
      options?: AttendanceExportOptions
    ): Promise<void> => {
      setIsExporting(true);
      setError(null);
      const toastId = toast.loading('جاري استرجاع حصيلة السنة وتوليد ملف PDF...');

      try {
        const res = (await getYearlyReport(year, departmentId)) as {
          success: boolean;
          data: YearlyReportData;
        };

        if (!res?.data) {
          throw new Error('بيانات التقرير غير متوفرة');
        }

        await exportYearlyReportToPdf(res.data, options);
        toast.success('تم تصدير حصيلة الحضور السنوية بنجاح', { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'فشل في تحميل أو تصدير الحصيلة السنوية';
        console.error('Erreur exportYearlyByYear:', err);
        setError(msg);
        toast.error('فشل في تصدير الحصيلة السنوية', { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    isExporting,
    error,
    exportDailyReport,
    exportMonthlyReport,
    exportYearlyReport,
    exportDailySheet,
    exportDailyByDate,
    exportMonthlyByPeriod,
    exportYearlyByYear,
  };
}
