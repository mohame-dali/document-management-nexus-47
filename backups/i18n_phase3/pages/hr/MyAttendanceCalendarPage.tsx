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
import { toast } from 'sonner';
import {
  CalendarCheck,
  Calendar,
  Home,
  ChevronLeft,
  RefreshCw,
  Info,
  CalendarDays,
  FileDown,
  Loader2,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Building,
  MapPin,
  GraduationCap,
} from 'lucide-react';
import { useAttendanceExport } from '@/hooks/useAttendanceExport';
import { MyLeaveBalanceCard, LeaveBalanceData } from '@/components/attendance/MyLeaveBalanceCard';
import { MyCalendarDayView } from '@/components/attendance/MyCalendarDayView';
import { MyCalendarWeekView } from '@/components/attendance/MyCalendarWeekView';
import { MyCalendarMonthView } from '@/components/attendance/MyCalendarMonthView';
import { MyCalendarYearView } from '@/components/attendance/MyCalendarYearView';
import { MyAttendanceLegend } from '@/components/attendance/MyAttendanceLegend';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

export const MyAttendanceCalendarPage: React.FC = () => {
  const { currentUser } = useAuth();

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
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
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
  // Pour la vue année, on charge toute l'année (month undefined).
  // Pour les vues mois, semaine, jour, on charge le mois ou l'année correspondante.
  const [calendarAttendances, setCalendarAttendances] = useState<AttendanceRecord[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState<boolean>(false);

  const loadCalendarData = useCallback(async () => {
    if (!personnelId) return;
    try {
      setIsCalendarLoading(true);
      // Si vue année, charger sans spécifier month
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
      toast.success('تم حذف التصريح بنجاح');
      loadMyDeclarations();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'تعذر حذف التصريح')
          : 'تعذر حذف التصريح';
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

  // Synchronisation lors de la sélection d'une date (met à jour currentYear et currentMonth si nécessaire)
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
      const isUnrecorded = !att || att?.statut === 'unrecorded';

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
      const soldeRest = balance?.remainingDays ?? balance?.soldeRestant ?? (soldeInit - deduct);

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
      <div className="min-h-screen bg-[#f7fafc] p-8 flex items-center justify-center" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-10 flex flex-col items-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-[#2c5282]" />
          <p className="text-sm font-semibold text-gray-700">جاري تحميل بيانات التقويم الشخصي...</p>
        </div>
      </div>
    );
  }

  if (!personnelId) {
    return (
      <div className="min-h-screen bg-[#f7fafc] p-6 space-y-6" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-8 max-w-xl mx-auto text-center space-y-4 shadow-none">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 text-[#2c5282] flex items-center justify-center mx-auto">
            <Info className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#1a202c]">
            تقويم الحضور الشخصي (Mon Calendrier)
          </h1>
          <div className="p-4 bg-gray-50 border border-[#e2e8f0] rounded text-gray-700 text-sm leading-relaxed">
            <p className="font-semibold text-gray-900 mb-1">
              لا توجد بطاقة موظف مرتبطة بحسابك الحالي في الموارد البشرية.
            </p>
            <p className="text-xs text-gray-600">
              يرجى التواصل مع إدارة الموارد البشرية أو مسؤول النظام لربط حسابك ببطاقتك المهنية لتتمكن من متابعة حضورك ورصيد إجازاتك.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetchProfile()}
            className="h-11 px-5 text-xs font-semibold border-[#cbd5e1] rounded text-[#2c5282] hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>إعادة المحاولة</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc] p-4 sm:p-6 space-y-5" dir="rtl">
      {/* 1. Breadcrumbs + En-tête */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-[#718096]">
              <Link to="/dashboard" className="hover:text-[#2c5282] flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>لوحة التحكم</span>
              </Link>
              <ChevronLeft className="h-3.5 w-3.5 text-gray-400" />
              <Link to="/dashboard/hr/my-profile" className="hover:text-[#2c5282]">
                <span>ملفي الشخصي</span>
              </Link>
              <ChevronLeft className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[#1a202c] font-semibold">تقويم حضوري</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5282] text-white rounded">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1a202c]">
                  حضوري — تقويم وسجل الحضور الشخصي
                </h1>
                <p className="text-sm text-[#718096]">
                  متابعة حالة الحضور اليومي، فترات التكوين، المهمات، ورصيد الإجازات السنوية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsDeclarationDialogOpen(true)}
              className="h-9 px-3.5 bg-[#2c5282] hover:bg-[#1a365d] text-white flex items-center gap-1.5 text-xs font-semibold rounded shadow-sm"
            >
              <FileCheck className="h-4 w-4 text-blue-200" />
              <span>تصريح بالحضور / الغياب</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !profilePersonnel}
              className="h-9 px-3 border-[#e2e8f0] text-[#2c5282] hover:bg-gray-50 flex items-center gap-1.5 text-xs font-medium rounded"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? 'جاري التصدير...' : 'تصدير PDF'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadBalance();
                loadCalendarData();
              }}
              className="h-11 px-4 border-[#e2e8f0] rounded text-xs text-[#2c5282] hover:bg-gray-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCalendarLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Carte Solde de Congés */}
      <MyLeaveBalanceCard
        balance={balance}
        isLoading={isBalanceLoading}
        year={currentYear}
      />

      {/* 3. Segment Control Sobre pour les 4 Vues */}
      <div className="bg-white border border-[#e2e8f0] rounded p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
        <div className="flex items-center gap-1 bg-[#f7fafc] p-1 rounded border border-[#e2e8f0]">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`h-11 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
              viewMode === 'day'
                ? 'bg-[#2c5282] text-white shadow-none'
                : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <span>يوم (Jour)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`h-11 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
              viewMode === 'week'
                ? 'bg-[#2c5282] text-white shadow-none'
                : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <span>أسبوع (Semaine)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`h-11 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
              viewMode === 'month'
                ? 'bg-[#2c5282] text-white shadow-none'
                : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <span>شهر (Mois)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('year')}
            className={`h-11 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
              viewMode === 'year'
                ? 'bg-[#2c5282] text-white shadow-none'
                : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <span>سنة (Année)</span>
          </button>
        </div>

        <div className="text-xs text-[#718096] px-2 font-mono flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-[#2c5282]" />
          <span>
            {viewMode === 'day' && `معاينة اليوم : ${selectedDate}`}
            {viewMode === 'week' && `معاينة الأسبوع`}
            {viewMode === 'month' && `شهر ${currentMonth} / سنة ${currentYear}`}
            {viewMode === 'year' && `سنة ${currentYear}`}
          </span>
        </div>
      </div>

      {/* 4. Zone d'Affichage selon la Vue Active */}
      <div>
        {viewMode === 'day' && (
          <MyCalendarDayView
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            dayAttendance={dayAttendance}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
          />
        )}

        {viewMode === 'week' && (
          <MyCalendarWeekView
            currentDate={selectedDate}
            onDateChange={handleDateChange}
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
            onYearMonthChange={handleYearMonthChange}
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
            onYearChange={(newYear) => setCurrentYear(newYear)}
            attendances={calendarAttendances}
            leaveReasons={leaveReasons}
            isLoading={isCalendarLoading}
            onSelectMonth={handleSelectMonthFromYearView}
          />
        )}
      </div>

      {/* 5. Légende des Couleurs en Bas */}
      <MyAttendanceLegend leaveReasons={leaveReasons} />

      {/* 6. Section بياناتي والتصاريح المقدمة */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#2c5282]" />
              تصاريحي السابقة والمعلقة (بياناتي)
              {myDeclarations.filter((d) => d.validationStatus === 'en_attente').length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2 py-0.5 font-bold">
                  {myDeclarations.filter((d) => d.validationStatus === 'en_attente').length} في انتظار الموافقة
                </Badge>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              متابعة حالة تصاريح الحضور أو الغياب أو المأموريات التي قدمتها للإدارة.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsDeclarationDialogOpen(true)}
            className="h-9 px-3 bg-[#2c5282] hover:bg-[#1a365d] text-white text-xs font-semibold gap-1.5 rounded"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>تقديم تصريح جديد</span>
          </Button>
        </div>

        {isDeclarationsLoading ? (
          <div className="py-8 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2c5282]" />
            <span className="text-xs mt-2 block">جاري تحميل التصاريح...</span>
          </div>
        ) : myDeclarations.length === 0 ? (
          <div className="py-6 text-center text-gray-400 bg-gray-50/50 rounded border border-dashed border-gray-200">
            <Clock className="w-6 h-6 mx-auto mb-1 text-gray-300" />
            <p className="text-xs font-medium text-gray-600">لم تقدم أي تصريح مسبق حتى الآن</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              يمكنك استخدام زر "تصريح بالحضور / الغياب" لإشعار الإدارة بأي حضور أو مأمورية أو رخصة قادمة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 border-b border-[#e2e8f0] text-gray-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">التاريخ المعني</th>
                  <th className="py-2.5 px-3">نوع التصريح / السبب</th>
                  <th className="py-2.5 px-3">التفاصيل المقدمة</th>
                  <th className="py-2.5 px-3">حالة المراجعة</th>
                  <th className="py-2.5 px-3 text-center">إلغاء الطلب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {myDeclarations.map((decl) => {
                  const formattedDate = new Date(decl.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={decl._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-gray-800">
                        {formattedDate}
                      </td>
                      <td className="py-2.5 px-3">
                        {decl.statut === 'present' ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            حاضر {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-800 font-semibold">
                            {(() => {
                              const lrId = typeof decl.leaveReasonId === 'object' && decl.leaveReasonId !== null ? (decl.leaveReasonId as LeaveReason)._id : decl.leaveReasonId;
                              const found = leaveReasons.find((r) => r.code === decl.motif || r._id === lrId);
                              return found?.labelAr || decl.motif || 'غياب مبرر';
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs text-gray-600">
                        <div className="space-y-0.5 truncate">
                          {decl.detailsMotif?.nomService && (
                            <div>المصلحة: {decl.detailsMotif.nomService}</div>
                          )}
                          {decl.detailsMotif?.lieuMission && (
                            <div>المكان: {decl.detailsMotif.lieuMission}</div>
                          )}
                          {decl.detailsMotif?.commentaire && (
                            <div className="italic text-gray-400">"{decl.detailsMotif.commentaire}"</div>
                          )}
                          {decl.rejectionReason && (
                            <div className="text-red-600 font-semibold">سبب الرفض: {decl.rejectionReason}</div>
                          )}
                          {decl.adminComment && (
                            <div className="text-blue-600">ملاحظة الإدارة: {decl.adminComment}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {decl.validationStatus === 'en_attente' && (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-medium px-2 py-0.5 gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            قيد المراجعة
                          </Badge>
                        )}
                        {decl.validationStatus === 'approuvee' && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-medium px-2 py-0.5 gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            مقبول ومعتمد
                          </Badge>
                        )}
                        {decl.validationStatus === 'rejetee' && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-300 font-medium px-2 py-0.5 gap-1">
                            <XCircle className="w-3 h-3 text-red-600" />
                            مرفوض
                          </Badge>
                        )}
                        {decl.validationStatus === 'modifiee' && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300 font-medium px-2 py-0.5 gap-1">
                            تم التعديل والاعتماد
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {decl.validationStatus === 'en_attente' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDeclaration(decl._id)}
                            className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs gap-1"
                            title="إلغاء التصريح"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>إلغاء</span>
                          </Button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
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
