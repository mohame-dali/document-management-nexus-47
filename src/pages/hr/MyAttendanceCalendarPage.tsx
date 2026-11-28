import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '@/services/hr/personnelApi';
import {
  getPersonnelCalendar,
  getPersonnelBalance,
  AttendanceRecord,
  PersonnelBalanceResponse,
} from '@/services/attendanceService';
import { getLeaveReasons, LeaveReason } from '@/services/leaveReasonService';
import {
  getMyDeclarations,
  deleteDeclaration,
  AttendanceDeclaration,
} from '@/services/attendanceDeclarationService';
import { AttendanceDeclarationDialog } from '@/components/attendance/AttendanceDeclarationDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CalendarCheck,
  Home,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  FileDown,
  Loader2,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { useAttendanceExport } from '@/hooks/useAttendanceExport';
import { MyLeaveBalanceCard, LeaveBalanceData } from '@/components/attendance/MyLeaveBalanceCard';
import { MyCalendarDayView } from '@/components/attendance/MyCalendarDayView';
import { MyCalendarWeekView } from '@/components/attendance/MyCalendarWeekView';
import { MyCalendarMonthView } from '@/components/attendance/MyCalendarMonthView';
import { MyCalendarYearView } from '@/components/attendance/MyCalendarYearView';
import { MyAttendanceLegend } from '@/components/attendance/MyAttendanceLegend';
import { formatDateWithWeekday } from '@/utils/formatDate';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

const MONTHS_AR = [
  { value: 1, label: 'جانفي' },
  { value: 2, label: 'فيفري' },
  { value: 3, label: 'مارس' },
  { value: 4, label: 'أفريل' },
  { value: 5, label: 'ماي' },
  { value: 6, label: 'جوان' },
  { value: 7, label: 'جويلية' },
  { value: 8, label: 'أوت' },
  { value: 9, label: 'سبتمبر' },
  { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' },
  { value: 12, label: 'ديسمبر' },
];

const MONTHS_FR = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const getLocalTodayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const MyAttendanceCalendarPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();
  const BreadcrumbChevron = isRTL ? ChevronLeft : ChevronRight;
  const monthOptions = isRTL ? MONTHS_AR : MONTHS_FR;

  // Mode de vue actif
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  // Hook d'export PDF
  const {
    isExporting,
    exportDailyReport,
    exportMonthlyReport,
    exportYearlyReport,
  } = useAttendanceExport();

  // Dates de travail
  const todayIso = useMemo(() => getLocalTodayIso(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const initialYear = useMemo(() => new Date().getFullYear(), []);
  const initialMonth = useMemo(() => new Date().getMonth() + 1, []);
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth);

  // 1. Récupération de la fiche Personnel de l'utilisateur connecté
  const {
    data: profilePersonnel,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['hr', 'my-profile'],
    queryFn: getMyProfile,
    retry: false,
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  const personnelId = useMemo(() => {
    if (profilePersonnel?._id) return profilePersonnel._id;
    if (currentUser?.personnelId) return currentUser.personnelId;
    return null;
  }, [profilePersonnel, currentUser]);

  // 2. Récupération des motifs LeaveReason dynamiques
  const [leaveReasons, setLeaveReasons] = useState<LeaveReason[]>([]);
  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const data = await getLeaveReasons({ isActive: true });
        setLeaveReasons((data || []).filter((r) => r.isActive));
      } catch (err) {
        console.error('Erreur chargement motifs leave reasons:', err);
      }
    };
    fetchReasons();
  }, []);

  // 3. Récupération du solde de congés
  const [balance, setBalance] = useState<LeaveBalanceData | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false);

  const loadBalance = useCallback(async () => {
    if (!personnelId) return;
    try {
      setIsBalanceLoading(true);
      const res: PersonnelBalanceResponse = await getPersonnelBalance(personnelId, currentYear);
      // Gérer la forme imbriquée res.data ou plate res
      const payload: LeaveBalanceData =
        (res as unknown as { data?: LeaveBalanceData })?.data || (res as unknown as LeaveBalanceData);
      setBalance(payload || null);
    } catch (err) {
      console.error('Erreur chargement du solde:', err);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [personnelId, currentYear]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  // 4. Récupération des enregistrements de présence
  const [calendarAttendances, setCalendarAttendances] = useState<AttendanceRecord[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState<boolean>(false);

  const loadCalendarData = useCallback(async () => {
    if (!personnelId) return;
    try {
      setIsCalendarLoading(true);
      const monthParam = viewMode === 'year' ? undefined : currentMonth;
      const res: unknown = await getPersonnelCalendar(personnelId, currentYear, monthParam);

      const items: AttendanceRecord[] =
        (res as { data?: AttendanceRecord[] })?.data ||
        (Array.isArray(res) ? (res as AttendanceRecord[]) : []);
      setCalendarAttendances(items);
    } catch (err) {
      console.error('Erreur chargement du calendrier:', err);
    } finally {
      setIsCalendarLoading(false);
    }
  }, [personnelId, currentYear, currentMonth, viewMode]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // 5. Récupération des déclarations de l'agent connecté
  const [isDeclarationDialogOpen, setIsDeclarationDialogOpen] = useState(false);
  const [myDeclarations, setMyDeclarations] = useState<AttendanceDeclaration[]>([]);
  const [isDeclarationsLoading, setIsDeclarationsLoading] = useState(false);

  const loadMyDeclarations = useCallback(async () => {
    try {
      setIsDeclarationsLoading(true);
      const res = await getMyDeclarations();
      if (res && res.success && Array.isArray(res.data)) {
        setMyDeclarations(res.data);
      }
    } catch (err) {
      console.error('Erreur chargement des déclarations personnelles:', err);
    } finally {
      setIsDeclarationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyDeclarations();
  }, [loadMyDeclarations]);

  const handleDeleteDeclaration = async (id: string) => {
    try {
      await deleteDeclaration(id);
      toast.success(isRTL ? 'تم حذف التصريح بنجاح' : 'Déclaration supprimée avec succès');
      loadMyDeclarations();
    } catch (err: unknown) {
      const fallback = isRTL ? 'تعذر حذف التصريح' : 'Impossible de supprimer la déclaration';
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback
          : fallback;
      toast.error(msg);
    }
  };

  // Trouver l'attendance du jour sélectionné
  const dayAttendance = useMemo(() => {
    return (
      calendarAttendances.find((att) => {
        const d = att.date ? att.date.split('T')[0] : '';
        return d === selectedDate;
      }) || null
    );
  }, [calendarAttendances, selectedDate]);

  // Synchronisation lors de la sélection d'une date
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate) {
      const parts = newDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (y !== currentYear) setCurrentYear(y);
        if (m !== currentMonth) setCurrentMonth(m);
      }
    }
  };

  const handleYearMonthChange = (y: number, m: number) => {
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      handleYearMonthChange(currentYear - 1, 12);
    } else {
      handleYearMonthChange(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      handleYearMonthChange(currentYear + 1, 1);
    } else {
      handleYearMonthChange(currentYear, currentMonth + 1);
    }
  };

  const handlePrevDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() - 1);
    const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(current.getDate()).padStart(2, '0')}`;
    handleDateChange(iso);
  };

  const handleNextDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + 1);
    const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(current.getDate()).padStart(2, '0')}`;
    handleDateChange(iso);
  };

  const handlePrevWeek = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() - 7);
    const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(current.getDate()).padStart(2, '0')}`;
    handleDateChange(iso);
  };

  const handleNextWeek = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + 7);
    const iso = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(current.getDate()).padStart(2, '0')}`;
    handleDateChange(iso);
  };

  const handleGoToToday = () => {
    const now = new Date();
    const today = getLocalTodayIso();
    setSelectedDate(today);
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const weekRangeLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate()
      ).padStart(2, '0')}`;
    return `${fmt(sunday)} — ${fmt(saturday)}`;
  }, [selectedDate]);

  const handleSelectDayFromView = (dateStr: string) => {
    handleDateChange(dateStr);
    setViewMode('day');
  };

  const handleSelectMonthFromYearView = (monthNum: number) => {
    setCurrentMonth(monthNum);
    setViewMode('month');
  };

  const handleExport = async () => {
    if (!profilePersonnel) return;

    const personnelInfo = {
      _id: profilePersonnel._id,
      nom: profilePersonnel.nom,
      prenom: profilePersonnel.prenom,
      cin: profilePersonnel.cin,
      poste: profilePersonnel.poste,
      activeDepartment: profilePersonnel.activeDepartment || undefined,
    };

    const deptName =
      typeof profilePersonnel.activeDepartment === 'object' && profilePersonnel.activeDepartment !== null
        ? profilePersonnel.activeDepartment.name
        : undefined;

    if (viewMode === 'day' || viewMode === 'week') {
      const targetDate = selectedDate;
      const att = dayAttendance;
      const isPresent = att?.statut === 'present';
      const isAbsent = att?.statut === 'absent';
      const isUnrecorded = !att || String(att.statut) === 'unrecorded';

      await exportDailyReport(
        {
          date: targetDate,
          totalCount: 1,
          presentsCount: isPresent ? 1 : 0,
          absentsCount: isAbsent ? 1 : 0,
          nonSaisisCount: isUnrecorded ? 1 : 0,
          presents: isPresent
            ? [
                {
                  personnel: personnelInfo,
                  attendance: att
                    ? {
                        statut: 'present',
                        motif: att.motif,
                        heureArrivee: att.heureArrivee,
                        detailsMotif: att.detailsMotif,
                      }
                    : undefined,
                },
              ]
            : [],
          absents: isAbsent
            ? [
                {
                  personnel: personnelInfo,
                  attendance: att
                    ? {
                        statut: 'absent',
                        motif: att.motif,
                        detailsMotif: att.detailsMotif,
                      }
                    : undefined,
                },
              ]
            : [],
          nonSaisis: isUnrecorded
            ? [
                {
                  personnel: personnelInfo,
                },
              ]
            : [],
        },
        {
          title: `سجل حضور شخصي - ${profilePersonnel.nom} ${profilePersonnel.prenom}`,
          departmentName: deptName,
          fileName: `mon_presence_${targetDate}`,
        }
      );
    } else if (viewMode === 'month') {
      let presentsCount = 0;
      let absentsCount = 0;
      const motifCounts: Record<string, number> = {};

      calendarAttendances.forEach((att) => {
        if (att.statut === 'present') {
          presentsCount++;
        } else if (att.statut === 'absent') {
          absentsCount++;
          const code = att.motif || 'AUTRE';
          motifCounts[code] = (motifCounts[code] || 0) + 1;
        }
      });

      await exportMonthlyReport(
        {
          year: currentYear,
          month: currentMonth,
          totalPersonnel: 1,
          records: [
            {
              personnel: personnelInfo,
              joursPresents: presentsCount,
              joursAbsents: absentsCount,
              parMotif: motifCounts,
            },
          ],
        },
        {
          title: `كشف حضور شهري شخصي - ${profilePersonnel.nom} ${profilePersonnel.prenom}`,
          departmentName: deptName,
          fileName: `mon_presence_mensuel_${currentYear}_${String(currentMonth).padStart(2, '0')}`,
        }
      );
    } else if (viewMode === 'year') {
      let presentsCount = 0;
      let absentsCount = 0;
      const motifCounts: Record<string, number> = {};

      calendarAttendances.forEach((att) => {
        if (att.statut === 'present') {
          presentsCount++;
        } else if (att.statut === 'absent') {
          absentsCount++;
          const code = att.motif || 'AUTRE';
          motifCounts[code] = (motifCounts[code] || 0) + 1;
        }
      });

      const soldeInit = balance?.totalDays ?? balance?.soldeAnnuel ?? 45;
      const deduct = balance?.usedDays ?? balance?.joursUtilises ?? absentsCount;
      const soldeRest = balance?.remainingDays ?? balance?.soldeRestant ?? soldeInit - deduct;

      await exportYearlyReport(
        {
          year: currentYear,
          totalPersonnel: 1,
          soldeAnnuelDefaut: soldeInit,
          records: [
            {
              personnel: personnelInfo,
              soldeInitial: soldeInit,
              joursDeduits: deduct,
              soldeRestant: soldeRest,
              joursPresents: presentsCount,
              joursAbsents: absentsCount,
              parMotif: balance?.byMotif || motifCounts,
            },
          ],
        },
        {
          title: `حصيلة الحضور السنوية الشخصية - ${profilePersonnel.nom} ${profilePersonnel.prenom}`,
          departmentName: deptName,
          fileName: `mon_bilan_presence_annuel_${currentYear}`,
        }
      );
    }
  };

  // Gestion des états sans profil
  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-8 flex items-center justify-center text-start" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-10 flex flex-col items-center gap-3 shadow-sm">
          <RefreshCw className="h-7 w-7 animate-spin text-[#2c5282] dark:text-sky-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {isRTL ? 'جاري تحميل بيانات التقويم الشخصي...' : 'Chargement de votre calendrier...'}
          </p>
        </div>
      </div>
    );
  }

  if (!personnelId) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-6 space-y-6 text-start" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-8 max-w-xl mx-auto text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#2c5282] dark:text-sky-300 flex items-center justify-center mx-auto">
            <Info className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isRTL ? 'تقويم الحضور الشخصي' : 'Mon calendrier de présence'}
          </h1>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {isRTL
                ? 'لا توجد بطاقة موظف مرتبطة بحسابك الحالي في الموارد البشرية.'
                : 'Aucune fiche employé n’est associée à votre compte.'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isRTL
                ? 'يرجى التواصل مع إدارة الموارد البشرية أو مسؤول النظام لربط حسابك ببطاقتك المهنية لتتمكن من متابعة حضورك ورصيد إجازاتك.'
                : 'Veuillez contacter le service RH ou l’administrateur système pour associer votre profil professionnel.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetchProfile()}
            className="h-10 px-5 text-xs font-semibold border-slate-300 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isRTL ? 'إعادة المحاولة' : 'Réessayer'}</span>
          </Button>
        </div>
      </div>
    );
  }

  const pendingCount = myDeclarations.filter((d) => d.validationStatus === 'en_attente').length;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 space-y-5 text-start" dir={dir}>
      {/* 1. Breadcrumbs + En-tête */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Link to={currentUser?.role === 'Admin' || currentUser?.role === 'Director' ? '/dashboard' : '/dashboard/mail/incoming'} className="hover:text-[#2c5282] dark:hover:text-sky-400 flex items-center gap-1 transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span>{isRTL ? (currentUser?.role === 'Admin' || currentUser?.role === 'Director' ? 'لوحة التحكم' : 'الرئيسية') : (currentUser?.role === 'Admin' || currentUser?.role === 'Director' ? 'Tableau de bord' : 'Accueil')}</span>
              </Link>
              <BreadcrumbChevron className="h-3.5 w-3.5 text-slate-400" />
              <Link to="/dashboard/hr/my-profile" className="hover:text-[#2c5282] dark:hover:text-sky-400 transition-colors">
                <span>{isRTL ? 'ملفي الشخصي' : 'Mon profil'}</span>
              </Link>
              <BreadcrumbChevron className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">
                {isRTL ? 'تقويم حضوري' : 'Mon calendrier'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5282] dark:bg-sky-700 text-white rounded-lg shadow-sm">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isRTL ? 'حضوري — تقويم وسجل الحضور الشخصي' : 'Mon calendrier de présence et congés'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {isRTL
                    ? 'متابعة حالة الحضور اليومي، فترات التكوين، المهمات، ورصيد الإجازات السنوية'
                    : 'Suivi quotidien des présences, formations, missions et solde de congés annuels'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsDeclarationDialogOpen(true)}
              className="h-9 px-4 bg-[#2c5282] hover:bg-[#1a365d] dark:bg-sky-700 dark:hover:bg-sky-600 text-white flex items-center gap-1.5 text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap"
            >
              <FileCheck className="h-4 w-4 text-blue-200" />
              <span>{isRTL ? 'تصريح بالحضور / الغياب' : 'Déclaration présence / absence'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !profilePersonnel}
              className="h-9 px-3.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-medium rounded-lg whitespace-nowrap"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>
                {isExporting
                  ? isRTL
                    ? 'جاري التصدير...'
                    : 'Export...'
                  : isRTL
                  ? 'تصدير PDF'
                  : 'Exporter PDF'}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadBalance();
                loadCalendarData();
              }}
              className="h-9 px-3.5 border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCalendarLoading ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث' : 'Actualiser'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Clean Unified Leave Balance Summary */}
      <MyLeaveBalanceCard
        balance={balance}
        isLoading={isBalanceLoading}
        year={currentYear}
      />

      {/* 3. Unified Calendar Card (Single-Row Control Bar + Calendar View immediately below) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Unified Single-Row Control Bar (p-3) */}
        <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          {/* Segmented View-Mode Control */}
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isRTL ? 'يوم' : 'Jour'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isRTL ? 'أسبوع' : 'Semaine'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isRTL ? 'شهر' : 'Mois'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`h-8 px-3.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                viewMode === 'year'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isRTL ? 'سنة' : 'Année'}
            </button>
          </div>

          {/* Contextual Date / Month / Year Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'month' && (
              <>
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden divide-x rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    title={isRTL ? 'الشهر السابق' : 'Mois précédent'}
                  >
                    {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    <span>{isRTL ? 'الشهر السابق' : 'Précédent'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="h-9 px-3 text-xs font-semibold text-[#2c5282] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? 'اليوم' : "Aujourd'hui"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    title={isRTL ? 'الشهر الموالي' : 'Mois suivant'}
                  >
                    <span>{isRTL ? 'الشهر الموالي' : 'Suivant'}</span>
                    {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <Select
                  value={String(currentMonth)}
                  onValueChange={(val) => handleYearMonthChange(currentYear, parseInt(val, 10))}
                >
                  <SelectTrigger className="h-9 w-32 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium bg-white dark:bg-slate-950 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(currentYear)}
                  onValueChange={(val) => handleYearMonthChange(parseInt(val, 10), currentMonth)}
                >
                  <SelectTrigger className="h-9 w-24 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs tabular-nums">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {viewMode === 'week' && (
              <>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums px-1">
                  {weekRangeLabel}
                </span>
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden divide-x rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    <span>{isRTL ? 'الأسبوع السابق' : 'Sem. préc.'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="h-9 px-3 text-xs font-semibold text-[#2c5282] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? 'اليوم' : "Aujourd'hui"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <span>{isRTL ? 'الأسبوع الموالي' : 'Sem. suiv.'}</span>
                    {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </>
            )}

            {viewMode === 'day' && (
              <>
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden divide-x rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                  <button
                    type="button"
                    onClick={handlePrevDay}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    <span>{isRTL ? 'اليوم السابق' : 'Jour préc.'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="h-9 px-3 text-xs font-semibold text-[#2c5282] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? 'اليوم' : "Aujourd'hui"}
                  </button>
                  <button
                    type="button"
                    onClick={handleNextDay}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <span>{isRTL ? 'اليوم الموالي' : 'Jour suiv.'}</span>
                    {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-9 w-36 border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                />
              </>
            )}

            {viewMode === 'year' && (
              <>
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden divide-x rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrentYear(currentYear - 1)}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    <span>{isRTL ? 'السنة السابقة' : 'Année préc.'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentYear(new Date().getFullYear())}
                    className="h-9 px-3 text-xs font-semibold text-[#2c5282] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    {isRTL ? 'السنة الحالية' : 'Cette année'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentYear(currentYear + 1)}
                    className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                  >
                    <span>{isRTL ? 'السنة الموالية' : 'Année suiv.'}</span>
                    {isRTL ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Select
                  value={String(currentYear)}
                  onValueChange={(val) => setCurrentYear(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-9 w-24 border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs tabular-nums">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {/* Active View Body immediately below */}
        {viewMode === 'day' && (
          <MyCalendarDayView
            selectedDate={selectedDate}
            dayAttendance={dayAttendance}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
          />
        )}

        {viewMode === 'week' && (
          <MyCalendarWeekView
            currentDate={selectedDate}
            attendances={calendarAttendances}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
            onSelectDay={handleSelectDayFromView}
          />
        )}

        {viewMode === 'month' && (
          <MyCalendarMonthView
            year={currentYear}
            month={currentMonth}
            attendances={calendarAttendances}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
            selectedDate={selectedDate}
            onSelectDate={handleDateChange}
          />
        )}

        {viewMode === 'year' && (
          <MyCalendarYearView
            year={currentYear}
            attendances={calendarAttendances}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
            onSelectMonth={handleSelectMonthFromYearView}
          />
        )}
      </div>

      {/* 4. Légende des Couleurs en Bas */}
      <MyAttendanceLegend leaveReasons={leaveReasons} />

      {/* 5. Section التصاريح المقدمة */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#2c5282] dark:text-sky-400" />
              <span>{isRTL ? 'تصاريحي السابقة والمعلقة' : 'Mes déclarations'}</span>
              {pendingCount > 0 && (
                <Badge className="rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs px-2.5 py-0.5 font-semibold tabular-nums">
                  {isRTL
                    ? `${pendingCount} في انتظار الموافقة`
                    : `${pendingCount} en attente`}
                </Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isRTL
                ? 'متابعة حالة تصاريح الحضور أو الغياب أو المأموريات التي قدمتها للإدارة.'
                : 'Suivi de vos déclarations de présence, d’absence ou de mission.'}
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsDeclarationDialogOpen(true)}
            className="h-9 px-4 bg-[#2c5282] hover:bg-[#1a365d] dark:bg-sky-700 dark:hover:bg-sky-600 text-white text-xs font-semibold gap-1.5 rounded-lg whitespace-nowrap"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>{isRTL ? 'تقديم تصريح جديد' : 'Nouvelle déclaration'}</span>
          </Button>
        </div>

        {isDeclarationsLoading ? (
          <TableSkeleton rows={4} columns={5} />
        ) : myDeclarations.length === 0 ? (
          <EmptyState
            className="py-8 border-dashed bg-slate-50/50 dark:bg-slate-950/40"
            icon={<Clock className="w-6 h-6" />}
            title={
              isRTL
                ? 'لم تقدم أي تصريح مسبق حتى الآن'
                : 'Aucune déclaration soumise pour le moment'
            }
            description={
              isRTL
                ? 'يمكنك استخدام زر "تصريح بالحضور / الغياب" لإشعار الإدارة بأي حضور أو مأمورية أو رخصة قادمة.'
                : 'Utilisez le bouton « Déclaration présence / absence » pour informer les RH.'
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[55vh] rounded-lg border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-start text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {isRTL ? 'التاريخ المعني' : 'Date'}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {isRTL ? 'نوع التصريح / السبب' : 'Type / Motif'}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {isRTL ? 'التفاصيل المقدمة' : 'Détails'}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {isRTL ? 'حالة المراجعة' : 'Statut'}
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    {isRTL ? 'إلغاء الطلب' : 'Action'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {myDeclarations.map((decl) => {
                  const formattedDate = formatDateWithWeekday(decl.date, isRTL ? 'ar' : 'fr');

                  return (
                    <tr
                      key={decl._id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors duration-150"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                        <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">
                          {formattedDate}
                        </bdi>
                      </td>
                      <td className="py-2.5 px-3">
                        {decl.statut === 'present' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 tabular-nums">
                            {isRTL ? 'حاضر' : 'Présent'} {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-800 dark:text-amber-300 font-semibold">
                            {(() => {
                              const lrId =
                                typeof decl.leaveReasonId === 'object' && decl.leaveReasonId !== null
                                  ? (decl.leaveReasonId as LeaveReason)._id
                                  : decl.leaveReasonId;
                              const found = leaveReasons.find(
                                (r) => r.code === decl.motif || r._id === lrId
                              );
                              if (isRTL) {
                                return found?.labelAr || decl.motif || 'غياب مبرر';
                              }
                              return found?.labelFr || found?.labelAr || decl.motif || 'Absence justifiée';
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5 truncate">
                          {decl.detailsMotif?.nomService && (
                            <div>
                              {isRTL ? 'المصلحة:' : 'Service :'} {decl.detailsMotif.nomService}
                            </div>
                          )}
                          {decl.detailsMotif?.lieuMission && (
                            <div>
                              {isRTL ? 'المكان:' : 'Lieu :'} {decl.detailsMotif.lieuMission}
                            </div>
                          )}
                          {decl.detailsMotif?.commentaire && (
                            <div className="italic text-slate-700 dark:text-slate-300">
                              "{decl.detailsMotif.commentaire}"
                            </div>
                          )}
                          {decl.rejectionReason && (
                            <div className="text-red-600 dark:text-red-400 font-semibold">
                              {isRTL ? 'سبب الرفض:' : 'Motif de refus :'} {decl.rejectionReason}
                            </div>
                          )}
                          {decl.adminComment && (
                            <div className="text-blue-600 dark:text-sky-400">
                              {isRTL ? 'ملاحظة الإدارة:' : 'Note RH :'} {decl.adminComment}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {decl.validationStatus === 'en_attente' && (
                          <Badge className="rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800 font-medium px-2.5 py-0.5 gap-1">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            {isRTL ? 'قيد المراجعة' : 'En attente'}
                          </Badge>
                        )}
                        {decl.validationStatus === 'approuvee' && (
                          <Badge className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-medium px-2.5 py-0.5 gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            {isRTL ? 'مقبول ومعتمد' : 'Approuvé'}
                          </Badge>
                        )}
                        {decl.validationStatus === 'rejetee' && (
                          <Badge className="rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-300 dark:border-red-800 font-medium px-2.5 py-0.5 gap-1">
                            <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                            {isRTL ? 'مرفوض' : 'Refusé'}
                          </Badge>
                        )}
                        {decl.validationStatus === 'modifiee' && (
                          <Badge className="rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 border border-blue-300 dark:border-blue-800 font-medium px-2.5 py-0.5 gap-1">
                            {isRTL ? 'تم التعديل والاعتماد' : 'Modifié et approuvé'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {decl.validationStatus === 'en_attente' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDeclaration(decl._id)}
                            className="h-9 px-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs gap-1"
                            title={isRTL ? 'إلغاء التصريح' : 'Annuler la déclaration'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'إلغاء' : 'Annuler'}</span>
                          </Button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog تصريح الحضور والغياب */}
      <AttendanceDeclarationDialog
        open={isDeclarationDialogOpen}
        onOpenChange={setIsDeclarationDialogOpen}
        initialDate={selectedDate}
        leaveReasons={leaveReasons}
        onSuccess={() => {
          loadBalance();
          loadCalendarData();
          loadMyDeclarations();
        }}
      />
    </div>
  );
};

export default MyAttendanceCalendarPage;
