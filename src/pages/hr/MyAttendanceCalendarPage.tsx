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
import { Button } from '@/components/ui/button';
import {
  CalendarCheck,
  Calendar,
  Home,
  ChevronLeft,
  RefreshCw,
  Info,
  CalendarDays,
} from 'lucide-react';
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
            className="h-10 px-5 text-xs font-semibold border-[#cbd5e1] rounded text-[#2c5282] hover:bg-gray-50 inline-flex items-center gap-2"
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
              variant="outline"
              size="sm"
              onClick={() => {
                loadBalance();
                loadCalendarData();
              }}
              className="h-10 px-4 border-[#e2e8f0] rounded text-xs text-[#2c5282] hover:bg-gray-50 flex items-center gap-1.5"
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
            className={`h-9 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
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
            className={`h-9 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
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
            className={`h-9 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
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
            className={`h-9 px-4 rounded text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 ${
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
    </div>
  );
};

export default MyAttendanceCalendarPage;
