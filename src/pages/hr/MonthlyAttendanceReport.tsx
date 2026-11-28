import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings, OrganizationSettings } from '@/services/organizationSettingsService';
import { resolveFrontendAttendanceScope } from '@/utils/attendanceScope';
import { getErrorMessage } from '@/utils/errorMessages';
import { Department } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useDirection } from '@/i18n/useDirection';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  PrintableAttendanceSheet,
  MonthlyAttendanceSheetData,
} from '@/components/hr/PrintableAttendanceSheet';

const MONTHS = [
  { value: 1, ar: 'جانفي', fr: 'Janvier' },
  { value: 2, ar: 'فيفري', fr: 'Février' },
  { value: 3, ar: 'مارس', fr: 'Mars' },
  { value: 4, ar: 'أفريل', fr: 'Avril' },
  { value: 5, ar: 'ماي', fr: 'Mai' },
  { value: 6, ar: 'جوان', fr: 'Juin' },
  { value: 7, ar: 'جويلية', fr: 'Juillet' },
  { value: 8, ar: 'أوت', fr: 'Août' },
  { value: 9, ar: 'سبتمبر', fr: 'Septembre' },
  { value: 10, ar: 'أكتوبر', fr: 'Octobre' },
  { value: 11, ar: 'نوفمبر', fr: 'Novembre' },
  { value: 12, ar: 'ديسمبر', fr: 'Décembre' },
];

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const MonthlyAttendanceReport: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isAr = language === 'ar';

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [metadataLoaded, setMetadataLoaded] = useState<boolean>(false);
  const [reportData, setReportData] = useState<MonthlyAttendanceSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 4; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const {
    isFullMultiDeptRole,
    isRHManager,
    allowAllOption,
    userDeptId,
    visibleDepartments,
    defaultDepartmentId,
  } = useMemo(
    () => resolveFrontendAttendanceScope(currentUser, departments, orgSettings),
    [currentUser, departments, orgSettings]
  );

  const scopedDepartmentLabel = useMemo(() => {
    if (allowAllOption) return undefined;
    const selectedObj = visibleDepartments.find(
      (d) => String(d._id) === String(selectedDepartment)
    );
    if (selectedObj?.name) return selectedObj.name;
    if (visibleDepartments.length > 0) {
      return visibleDepartments.map((d) => d.name).join(' + ');
    }
    const activeDeptName =
      typeof currentUser?.activeDepartment === 'object'
        ? (currentUser.activeDepartment as { name?: string })?.name
        : undefined;
    if (activeDeptName) return activeDeptName;
    if (isRHManager) {
      return isAr
        ? 'الموارد البشرية (RH) + مكتب المدير ومكتب الضبط'
        : 'RH + Bureau Directeur & BO';
    }
    return isAr ? 'القسم المخصص' : 'Département assigné';
  }, [allowAllOption, visibleDepartments, selectedDepartment, currentUser, isRHManager, isAr]);

  const scopedReportData = useMemo(() => {
    if (!reportData) return null;
    if (allowAllOption || visibleDepartments.length === 0) return reportData;
    const allowedIds = new Set(visibleDepartments.map((d) => String(d._id)));
    const filteredRecords = reportData.records.filter((rec) => {
      const dept = rec.personnel.activeDepartment;
      const deptId =
        dept && typeof dept === 'object'
          ? String(dept._id)
          : dept
          ? String(dept)
          : null;
      return deptId ? allowedIds.has(deptId) : false;
    });
    return {
      ...reportData,
      records: filteredRecords,
      totalPersonnel: filteredRecords.length,
    };
  }, [reportData, allowAllOption, visibleDepartments]);

  // Activer la classe CSS d'impression A4 paysage sur body uniquement sur cette page
  useEffect(() => {
    document.body.classList.add('monthly-attendance-print-active');
    return () => {
      document.body.classList.remove('monthly-attendance-print-active');
    };
  }, []);

  // Charger les départements et paramètres organisation
  useEffect(() => {
    let active = true;
    const loadMetadata = async () => {
      try {
        const [depts, settings] = await Promise.all([
          getDepartments(),
          getOrganizationSettings().catch(() => null),
        ]);
        if (!active) return;
        setDepartments(depts || []);
        setOrgSettings(settings);
      } catch (err) {
        console.error('Erreur chargement métadonnées rapport mensuel:', err);
      } finally {
        if (active) {
          setMetadataLoaded(true);
        }
      }
    };
    loadMetadata();
    return () => {
      active = false;
    };
  }, []);

  // Verrouiller les choix sur les départements autorisés pour AdminDepartment
  useEffect(() => {
    if (!metadataLoaded) return;
    if (allowAllOption) {
      if (!selectedDepartment) setSelectedDepartment('all');
      return;
    }
    const allowedIds = new Set(visibleDepartments.map((d) => String(d._id)));
    const isCurrentAllowed =
      selectedDepartment &&
      selectedDepartment !== 'all' &&
      (allowedIds.size === 0 || allowedIds.has(String(selectedDepartment)));
    if (!isCurrentAllowed && defaultDepartmentId) {
      setSelectedDepartment(defaultDepartmentId);
    }
  }, [metadataLoaded, allowAllOption, visibleDepartments, defaultDepartmentId, selectedDepartment]);

  const fetchMonthlyReport = useCallback(
    async (yearVal: number, monthVal: number, deptVal: string) => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const params: Record<string, string | number> = {
          year: yearVal,
          month: monthVal,
        };
        if (deptVal && deptVal !== 'all') {
          params.departmentId = deptVal;
        }

        const response = await axios.get(`${API_URL}/hr/attendance/monthly-report`, {
          params,
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.data?.success && response.data?.data) {
          setReportData(response.data.data);
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      } catch (err: unknown) {
        console.error('Erreur génération fiche mensuelle:', err);
        const msg = getErrorMessage(
          err,
          isAr
            ? 'حدث خطأ أثناء استخراج بطاقة الحضور الشهرية'
            : 'Erreur lors de la génération de la fiche mensuelle',
          isAr ? 'ar' : 'fr'
        );
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [isAr]
  );

  // Chargement initial pour le mois courant
  useEffect(() => {
    if (!isFullMultiDeptRole && !metadataLoaded) return;
    const initialDept = allowAllOption ? 'all' : defaultDepartmentId || userDeptId || '';
    if (!allowAllOption && !initialDept) return;
    void fetchMonthlyReport(selectedYear, selectedMonth, initialDept);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullMultiDeptRole, metadataLoaded, allowAllOption, defaultDepartmentId, userDeptId]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveDept = allowAllOption
      ? selectedDepartment
      : selectedDepartment && selectedDepartment !== 'all'
        ? selectedDepartment
        : defaultDepartmentId || userDeptId || '';
    void fetchMonthlyReport(selectedYear, selectedMonth, effectiveDept);
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-5 pb-10 text-start" dir={dir}>
      {/* En-tête de contrôle (masqué à l'impression) */}
      <div className="no-print print:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2c5282] dark:bg-sky-700 text-white rounded-lg shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'بطاقة الحضور الشهرية للطباعة' : 'Fiche de présence mensuelle'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {isAr
                  ? 'إعداد وطباعة جدول المواظبة الشهري (A4 أفقي - 31 يوماً)'
                  : 'Générer et imprimer la grille mensuelle des présences (A4 Paysage - 31 jours)'}
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="border-slate-200 dark:border-slate-700 text-[#2c5282] dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg gap-2 h-10"
          >
            <Link to="/dashboard/hr/attendance">
              <BackIcon className="h-4 w-4" />
              <span>{isAr ? 'العودة لتسجيل الحضور' : 'Retour aux présences'}</span>
            </Link>
          </Button>
        </div>

        {/* Sélecteurs Mois / Année / Département + Bouton Générer */}
        <form
          onSubmit={handleGenerate}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 items-end"
        >
          {/* Mois */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
              <span>{isAr ? 'الشهر' : 'Mois'}</span>
            </label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
            >
              <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-slate-100 text-sm tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={dir}>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>
                    {String(m.value).padStart(2, '0')} - {isAr ? `${m.ar} (${m.fr})` : `${m.fr} (${m.ar})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Année */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
              <span>{isAr ? 'السنة' : 'Année'}</span>
            </label>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
            >
              <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-slate-100 text-sm font-mono tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={dir}>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="font-mono tabular-nums">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Département */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
              <span>{isAr ? 'القسم / المصلحة' : 'Département'}</span>
            </label>
            {!allowAllOption && visibleDepartments.length === 0 ? (
              <Input
                type="text"
                disabled
                value={
                  (typeof currentUser?.activeDepartment === 'object'
                    ? (currentUser.activeDepartment as { name?: string })?.name
                    : '') || (isAr ? 'القسم المخصص' : 'Département assigné')
                }
                className="h-10 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 rounded-lg text-sm cursor-not-allowed"
              />
            ) : (
              <Select
                value={selectedDepartment}
                onValueChange={(val) => setSelectedDepartment(val)}
              >
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-slate-100 text-sm">
                  <SelectValue
                    placeholder={
                      allowAllOption
                        ? isAr
                          ? 'جميع الأقسام'
                          : 'Tous les départements'
                        : isAr
                        ? 'اختر القسم'
                        : 'Choisir le département'
                    }
                  />
                </SelectTrigger>
                <SelectContent dir={dir}>
                  {allowAllOption && (
                    <SelectItem value="all">
                      {isAr ? 'جميع الأقسام والمصالح' : 'Tous les départements'}
                    </SelectItem>
                  )}
                  {visibleDepartments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Bouton Générer */}
          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#2c5282] hover:bg-[#1e3a5f] dark:bg-sky-700 dark:hover:bg-sky-600 text-white rounded-lg font-medium gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{isAr ? 'توليد البطاقة' : 'Générer'}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Contenu généré */}
      {loading && !scopedReportData ? (
        <div className="no-print print:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg py-20 text-center space-y-3 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#2c5282] dark:text-sky-400 mx-auto" />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {isAr ? 'جاري تحميل بيانات الحضور الشهري...' : 'Chargement de la fiche mensuelle...'}
          </p>
        </div>
      ) : scopedReportData ? (
        <PrintableAttendanceSheet
          reportData={scopedReportData}
          language={language}
          scopedDepartmentLabel={scopedDepartmentLabel}
        />
      ) : null}
    </div>
  );
};

export default MonthlyAttendanceReport;
