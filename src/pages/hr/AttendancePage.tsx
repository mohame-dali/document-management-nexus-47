import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CalendarCheck,
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Clock,
  ChevronLeft,
  Home,
  AlertCircle,
  Briefcase,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  getDailyAttendance,
  saveBatchAttendance,
  AttendanceEntry,
  AttendanceEntryDetails,
} from '@/services/attendanceService';
import { LeaveReason, getLeaveReasons } from '@/services/leaveReasonService';
import { getDepartments } from '@/services/departmentService';
import { Department } from '@/types';

interface AgentAttendanceRow {
  personnel: {
    _id: string;
    nom: string;
    prenom: string;
    cin?: string;
    poste?: string;
    photo?: string;
    statut: string;
    activeDepartment?: {
      _id: string;
      name: string;
      code?: string;
    };
  };
  statut: 'present' | 'absent';
  motif: string;
  leaveReasonId: string | null;
  impacteSolde: boolean;
  heureArrivee: string;
  detailsMotif: AttendanceEntryDetails;
  hasSavedRecord: boolean;
}

export const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();

  // Date du jour au format YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveReasons, setLeaveReasons] = useState<LeaveReason[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AgentAttendanceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Vérifier si l'utilisateur est restreint à un département
  const isDepartmentRestricted = currentUser?.role === 'AdminDepartment';
  const userDeptId = currentUser?.activeDepartment
    ? typeof currentUser.activeDepartment === 'object'
      ? (currentUser.activeDepartment as { _id?: string })._id || null
      : currentUser.activeDepartment
    : null;

  // 1. Charger les départements
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await getDepartments();
        setDepartments(data || []);
      } catch (err) {
        console.error('Erreur chargement départements:', err);
      }
    };
    fetchDepts();
  }, []);

  // 2. Charger les motifs de congé dynamiquement (actifs uniquement)
  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const data = await getLeaveReasons({ isActive: true });
        // Filtrer strictement les motifs actifs
        setLeaveReasons((data || []).filter((r) => r.isActive));
      } catch (err) {
        console.error('Erreur chargement types de motifs:', err);
        toast.error('حدث خطأ أثناء تحميل أنواع وأسباب الغياب');
      }
    };
    fetchReasons();
  }, []);

  // Initialiser le département si restreint
  useEffect(() => {
    if (isDepartmentRestricted && userDeptId) {
      setSelectedDepartment(userDeptId);
    }
  }, [isDepartmentRestricted, userDeptId]);

  // 3. Charger les présences du jour sélectionné
  const loadDailyAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveDept =
        isDepartmentRestricted && userDeptId
          ? userDeptId
          : selectedDepartment !== 'all'
          ? selectedDepartment
          : undefined;

      const res = await getDailyAttendance(selectedDate, effectiveDept);
      const agentList = res.data || [];

      // Mapper la liste des agents vers notre état local
      const rows: AgentAttendanceRow[] = agentList.map((item) => {
        const att = item.attendance;
        const statut = att ? att.statut : 'present';
        const motif = att && att.motif ? att.motif : '';
        const leaveReasonId = att && att.leaveReasonId ? att.leaveReasonId : null;
        const impacteSolde = att ? Boolean(att.impacteSolde) : false;
        const heureArrivee = att && att.heureArrivee ? att.heureArrivee : '';
        const detailsMotif: AttendanceEntryDetails = att && att.detailsMotif ? att.detailsMotif : {};

        return {
          personnel: item.personnel,
          statut,
          motif,
          leaveReasonId,
          impacteSolde,
          heureArrivee,
          detailsMotif,
          hasSavedRecord: Boolean(att),
        };
      });

      setAttendanceRows(rows);
    } catch (err: unknown) {
      console.error('Erreur chargement des présences:', err);
      toast.error('حدث خطأ أثناء تحميل لائحة الحضور');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDepartment, isDepartmentRestricted, userDeptId]);

  useEffect(() => {
    loadDailyAttendance();
  }, [loadDailyAttendance]);

  // Modification du statut Présent/Absent pour un agent
  const handleToggleStatut = (index: number, isPresent: boolean) => {
    setAttendanceRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (isPresent) {
        row.statut = 'present';
        row.motif = '';
        row.leaveReasonId = null;
        row.impacteSolde = false;
        row.detailsMotif = {};
      } else {
        row.statut = 'absent';
        // Si aucun motif n'était sélectionné, laisser vide pour forcer le choix
        if (!row.motif && leaveReasons.length > 0) {
          // Par défaut premier motif ou conge_annuel si existant
          const defaultReason =
            leaveReasons.find((r) => r.code === 'conge_annuel') || leaveReasons[0];
          if (defaultReason) {
            row.motif = defaultReason.code;
            row.leaveReasonId = defaultReason._id;
            row.impacteSolde = Boolean(defaultReason.impacteSolde);
          }
        }
      }

      updated[index] = row;
      return updated;
    });
  };

  // Modification du motif d'absence
  const handleMotifChange = (index: number, motifCode: string) => {
    setAttendanceRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      const foundReason = leaveReasons.find((r) => r.code === motifCode);
      row.motif = motifCode;
      row.leaveReasonId = foundReason ? foundReason._id : null;
      row.impacteSolde = foundReason ? Boolean(foundReason.impacteSolde) : false;

      // Nettoyer les détails si le motif ne correspond plus
      if (motifCode !== 'service') {
        delete row.detailsMotif.nomService;
      }
      if (motifCode !== 'mission') {
        delete row.detailsMotif.lieuMission;
        delete row.detailsMotif.objetMission;
      }
      if (motifCode !== 'formation') {
        delete row.detailsMotif.intituleFormation;
        delete row.detailsMotif.organismeFormation;
        delete row.detailsMotif.dureeFormation;
      }

      updated[index] = row;
      return updated;
    });
  };

  // Modification des champs de détails spécifiques
  const handleDetailChange = (
    index: number,
    field: keyof AttendanceEntryDetails,
    value: string
  ) => {
    setAttendanceRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.detailsMotif = {
        ...row.detailsMotif,
        [field]: value,
      };
      updated[index] = row;
      return updated;
    });
  };

  // Action rapide : Marquer tous comme présents
  const handleMarkAllPresent = () => {
    setAttendanceRows((prev) =>
      prev.map((row) => ({
        ...row,
        statut: 'present',
        motif: '',
        leaveReasonId: null,
        impacteSolde: false,
        detailsMotif: {},
      }))
    );
    toast.info('تم تحديد جميع الموظفين كحاضرين');
  };

  // Enregistrement par lot
  const handleSaveAttendance = async () => {
    // Vérification des absences sans motif
    const invalidAbsent = attendanceRows.find(
      (r) => r.statut === 'absent' && (!r.motif || r.motif.trim() === '')
    );
    if (invalidAbsent) {
      toast.error(
        `يرجى تحديد سبب الغياب للموظف: ${invalidAbsent.personnel.nom} ${invalidAbsent.personnel.prenom}`
      );
      return;
    }

    try {
      setSaving(true);
      const entries: AttendanceEntry[] = attendanceRows.map((r) => ({
        personnelId: r.personnel._id,
        statut: r.statut,
        motif: r.statut === 'present' ? null : r.motif || null,
        leaveReasonId: r.statut === 'present' ? null : r.leaveReasonId || null,
        impacteSolde: r.statut === 'present' ? false : r.impacteSolde,
        detailsMotif: r.statut === 'present' ? {} : r.detailsMotif,
        heureArrivee: r.statut === 'present' ? r.heureArrivee || null : null,
      }));

      const res = await saveBatchAttendance(selectedDate, entries);
      toast.success(res.message || 'تم حفظ جدول الحضور بنجاح');
      // Recharger pour synchroniser
      await loadDailyAttendance();
    } catch (err: unknown) {
      console.error('Erreur lors de la sauvegarde:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'حدث خطأ أثناء حفظ الحضور';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filtrage de la liste
  const filteredRows = useMemo(() => {
    return attendanceRows.filter((item) => {
      // Filtre statut
      if (statusFilter === 'present' && item.statut !== 'present') return false;
      if (statusFilter === 'absent' && item.statut !== 'absent') return false;

      // Filtre recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nom = (item.personnel.nom || '').toLowerCase();
        const prenom = (item.personnel.prenom || '').toLowerCase();
        const cin = (item.personnel.cin || '').toLowerCase();
        const poste = (item.personnel.poste || '').toLowerCase();
        return (
          nom.includes(q) ||
          prenom.includes(q) ||
          `${nom} ${prenom}`.includes(q) ||
          cin.includes(q) ||
          poste.includes(q)
        );
      }
      return true;
    });
  }, [attendanceRows, searchQuery, statusFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = attendanceRows.length;
    const presents = attendanceRows.filter((r) => r.statut === 'present').length;
    const absents = attendanceRows.filter((r) => r.statut === 'absent').length;
    const saved = attendanceRows.filter((r) => r.hasSavedRecord).length;
    return { total, presents, absents, saved };
  }, [attendanceRows]);

  const getUserInitials = (nom: string, prenom: string) => {
    const n = nom ? nom.charAt(0) : '';
    const p = prenom ? prenom.charAt(0) : '';
    return `${n}${p}`.toUpperCase() || 'م';
  };

  const getAgentPhotoUrl = (photo?: string) => {
    if (!photo) return undefined;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const cleanPath = photo.startsWith('/') ? photo.slice(1) : photo;
    return `${API_URL}/${cleanPath}`;
  };

  return (
    <div className="min-h-screen bg-[#f7fafc] p-4 sm:p-6 space-y-5" dir="rtl">
      {/* 1. En-tête sobre */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-[#718096]">
              <Link to="/dashboard" className="hover:text-[#2c5282] flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>لوحة التحكم</span>
              </Link>
              <ChevronLeft className="h-3.5 w-3.5 text-gray-400" />
              <Link to="/dashboard/hr/personnel" className="hover:text-[#2c5282]">
                <span>الموارد البشرية</span>
              </Link>
              <ChevronLeft className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[#1a202c] font-semibold">تسجيل الحضور</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5282] text-white rounded">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1a202c]">
                  ورقة تسجيل الحضور اليومي
                </h1>
                <p className="text-sm text-[#718096]">
                  تسجيل إثبات الحضور والغياب واحتساب الخصم من الرصيد ديناميكياً
                </p>
              </div>
            </div>
          </div>

          {/* Bouton Enregistrer en haut */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveAttendance}
              disabled={saving || loading || attendanceRows.length === 0}
              className="bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium gap-2 h-11 px-5 transition-colors duration-200"
            >
              {saving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>حفظ التسجيلات</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Filtres & Sélecteurs */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 space-y-4 shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Sélecteur de date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#4a5568] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#2c5282]" />
              <span>تاريخ الحضور :</span>
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 border-[#e2e8f0] rounded text-sm bg-white"
            />
          </div>

          {/* Sélecteur de département */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#4a5568] flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#2c5282]" />
              <span>القسم / المصلحة :</span>
            </label>
            {isDepartmentRestricted ? (
              <Input
                type="text"
                disabled
                value={
                  typeof currentUser?.activeDepartment === 'object'
                    ? (currentUser.activeDepartment as { name?: string })?.name || 'القسم المخصص'
                    : 'القسم المخصص'
                }
                className="h-10 border-[#e2e8f0] bg-gray-50 text-gray-700 rounded text-sm cursor-not-allowed"
              />
            ) : (
              <Select
                value={selectedDepartment}
                onValueChange={(val) => setSelectedDepartment(val)}
              >
                <SelectTrigger className="h-10 border-[#e2e8f0] rounded text-sm bg-white">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Recherche textuelle */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#4a5568] flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-[#718096]" />
              <span>بحث عن موظف :</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="الاسم، اللقب، رقم ب.ت.و..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-[#e2e8f0] rounded text-sm pr-9 bg-white"
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Bouton action rapide */}
          <div className="space-y-1 flex flex-col justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAllPresent}
              disabled={loading || attendanceRows.length === 0}
              className="h-11 border-[#e2e8f0] text-[#2c5282] hover:bg-[#f7fafc] rounded font-medium gap-2 text-xs"
            >
              <Check className="h-4 w-4 text-green-600" />
              <span>تحديد الكل كحاضر</span>
            </Button>
          </div>
        </div>

        {/* Barre de stats et filtre d'affichage */}
        <div className="pt-3 border-t border-[#edf2f7] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#718096]">إجمالي الموظفين:</span>
            <span className="font-bold text-[#1a202c] px-2 py-0.5 bg-gray-100 rounded">
              {stats.total}
            </span>

            <span className="text-[#718096] mr-2">الحاضرون:</span>
            <span className="font-bold text-green-700 px-2 py-0.5 bg-green-50 rounded border border-green-200">
              {stats.presents}
            </span>

            <span className="text-[#718096] mr-2">الغائبون:</span>
            <span className="font-bold text-red-700 px-2 py-0.5 bg-red-50 rounded border border-red-200">
              {stats.absents}
            </span>

            {stats.saved > 0 && (
              <span className="text-gray-500 text-[11px] mr-2">
                (تم حفظ {stats.saved} مسبقاً لهذا اليوم)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#718096]">تصفية العرض:</span>
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('all')}
              className={`h-7 text-xs px-2.5 rounded ${
                statusFilter === 'all' ? 'bg-[#2c5282] text-white' : 'text-gray-600'
              }`}
            >
              الكل ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'present' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('present')}
              className={`h-7 text-xs px-2.5 rounded ${
                statusFilter === 'present'
                  ? 'bg-green-700 text-white'
                  : 'text-gray-600 hover:text-green-700'
              }`}
            >
              الحاضرون ({stats.presents})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'absent' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('absent')}
              className={`h-7 text-xs px-2.5 rounded ${
                statusFilter === 'absent'
                  ? 'bg-red-700 text-white'
                  : 'text-gray-600 hover:text-red-700'
              }`}
            >
              الغائبون ({stats.absents})
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Liste du personnel */}
      <div className="bg-white border border-[#e2e8f0] rounded overflow-hidden shadow-none">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-8 w-8 border-2 border-[#2c5282] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">جاري تحميل قائمة الحضور...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="text-base font-semibold text-gray-700">لا يوجد موظفون للعرض</p>
            <p className="text-xs text-gray-500">
              تأكد من اختيار القسم المناسب أو إضافة موظفين في قسم الموارد البشرية
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#edf2f7]">
            {filteredRows.map((row) => {
              // Trouver l'index original dans attendanceRows
              const originalIndex = attendanceRows.findIndex(
                (r) => r.personnel._id === row.personnel._id
              );
              const isPresent = row.statut === 'present';
              const currentReason = leaveReasons.find((r) => r.code === row.motif);

              return (
                <div
                  key={row.personnel._id}
                  className={`p-4 transition-colors duration-150 ${
                    isPresent ? 'bg-white hover:bg-[#fafafa]' : 'bg-[#fffaf0] hover:bg-[#fff7eb]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Infos Agent */}
                    <div className="flex items-center gap-3.5 min-w-[260px] flex-1">
                      <Avatar className="h-11 w-11 border border-[#e2e8f0] rounded-full">
                        <AvatarImage
                          src={getAgentPhotoUrl(row.personnel.photo)}
                          alt={`${row.personnel.nom} ${row.personnel.prenom}`}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-[#2c5282] text-white text-xs font-bold">
                          {getUserInitials(row.personnel.nom, row.personnel.prenom)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#1a202c] truncate">
                            {row.personnel.nom} {row.personnel.prenom}
                          </h3>
                          {row.hasSavedRecord && (
                            <span
                              className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200"
                              title="تم تسجيل هذه الحالة مسبقاً"
                            >
                              مُسجل
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#718096] mt-0.5">
                          {row.personnel.cin && (
                            <span className="font-mono">ب.ت.و: {row.personnel.cin}</span>
                          )}
                          {row.personnel.poste && (
                            <>
                              <span>•</span>
                              <span>{row.personnel.poste}</span>
                            </>
                          )}
                          {row.personnel.activeDepartment && (
                            <>
                              <span>•</span>
                              <span className="text-purple-700 font-medium">
                                {row.personnel.activeDepartment.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contrôle Présent / Absent */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-gray-50 border border-[#e2e8f0] p-1 rounded">
                        <button
                          type="button"
                          onClick={() => handleToggleStatut(originalIndex, true)}
                          className={`h-11 px-3.5 rounded text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                            isPresent
                              ? 'bg-green-700 text-white shadow-sm'
                              : 'text-gray-500 hover:text-green-700 hover:bg-gray-200/50'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>حاضر</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatut(originalIndex, false)}
                          className={`h-11 px-3.5 rounded text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                            !isPresent
                              ? 'bg-red-700 text-white shadow-sm'
                              : 'text-gray-500 hover:text-red-700 hover:bg-gray-200/50'
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                          <span>غائب</span>
                        </button>
                      </div>

                      {/* Si présent : heure d'arrivée optionnelle */}
                      {isPresent && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <Input
                            type="time"
                            placeholder="وقت الوصول"
                            value={row.heureArrivee}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceRows((prev) => {
                                const u = [...prev];
                                u[originalIndex] = { ...u[originalIndex], heureArrivee: val };
                                return u;
                              });
                            }}
                            className="h-9 w-28 text-xs border-[#e2e8f0] rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Spécifique si ABSENT */}
                  {!isPresent && (
                    <div className="mt-3.5 pt-3.5 border-t border-[#fbd38d]/40 bg-white p-3.5 rounded border border-[#fbd38d]/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Sélection du Motif */}
                        <div className="flex-1 min-w-[240px]">
                          <label className="text-xs font-bold text-[#744210] mb-1 block">
                            سبب الغياب <span className="text-red-600">*</span> :
                          </label>
                          <Select
                            value={row.motif || ''}
                            onValueChange={(val) => handleMotifChange(originalIndex, val)}
                          >
                            <SelectTrigger className="h-9 border-[#cbd5e0] rounded text-xs bg-white">
                              <SelectValue placeholder="اختر سبب الغياب" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" className="max-h-60">
                              {leaveReasons.map((lr) => (
                                <SelectItem key={lr._id} value={lr.code} className="text-xs py-2">
                                  <div className="flex items-center justify-between gap-3 w-full">
                                    <span className="font-semibold text-gray-900">{lr.labelAr}</span>
                                    {lr.labelFr && (
                                      <span className="text-gray-400 text-[11px] font-mono">
                                        ({lr.labelFr})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Badge Impact Solde */}
                        <div className="sm:text-left flex flex-col justify-end">
                          <label className="text-xs text-gray-500 mb-1 block">
                            تأثير الغياب على الرصيد :
                          </label>
                          <div>
                            {row.impacteSolde ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-900 border-amber-300 px-3 py-1 text-xs font-bold gap-1.5"
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                <span>يؤثر على الرصيد : نعم (مخصوم)</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-800 border-blue-200 px-3 py-1 text-xs font-semibold gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>يؤثر على الرصيد : لا (غير مخصوم)</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Champs conditionnels selon le motif */}
                      {/* Cas 1: Motif "service" */}
                      {row.motif === 'service' && (
                        <div className="bg-[#fffaf0] p-3 rounded border border-amber-200/80 space-y-1">
                          <label className="text-xs font-semibold text-[#744210]">
                            اسم المصلحة أو الوجهة الإدارية :
                          </label>
                          <Input
                            type="text"
                            placeholder="حدد اسم المصلحة المكلف بها..."
                            value={row.detailsMotif.nomService || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'nomService', e.target.value)
                            }
                            className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                          />
                        </div>
                      )}

                      {/* Cas 2: Motif "mission" */}
                      {row.motif === 'mission' && (
                        <div className="bg-[#fffaf0] p-3 rounded border border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#744210]">
                              مكان المهمة :
                            </label>
                            <Input
                              type="text"
                              placeholder="المدينة / المؤسسة..."
                              value={row.detailsMotif.lieuMission || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'lieuMission', e.target.value)
                              }
                              className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#744210]">
                              موضوع المهمة :
                            </label>
                            <Input
                              type="text"
                              placeholder="الهدف من المهمة..."
                              value={row.detailsMotif.objetMission || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'objetMission', e.target.value)
                              }
                              className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Cas 3: Motif "formation" */}
                      {row.motif === 'formation' && (
                        <div className="bg-[#fffaf0] p-3 rounded border border-amber-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#744210]">
                              عنوان التكوين :
                            </label>
                            <Input
                              type="text"
                              placeholder="موضوع الدورة التكوينية..."
                              value={row.detailsMotif.intituleFormation || ''}
                              onChange={(e) =>
                                handleDetailChange(
                                  originalIndex,
                                  'intituleFormation',
                                  e.target.value
                                )
                              }
                              className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#744210]">
                              الهيئة المؤطرة :
                            </label>
                            <Input
                              type="text"
                              placeholder="الجهة أو المركز المنظم..."
                              value={row.detailsMotif.organismeFormation || ''}
                              onChange={(e) =>
                                handleDetailChange(
                                  originalIndex,
                                  'organismeFormation',
                                  e.target.value
                                )
                              }
                              className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-[#744210]">
                              مدة التكوين :
                            </label>
                            <Input
                              type="text"
                              placeholder="مثال: 3 أيام، أسبوع..."
                              value={row.detailsMotif.dureeFormation || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'dureeFormation', e.target.value)
                              }
                              className="h-9 text-xs border-[#cbd5e0] rounded bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bouton "Enregistrer" en bas */}
      {filteredRows.length > 0 && (
        <div className="sticky bottom-4 z-10 bg-white border border-[#e2e8f0] rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="text-xs text-[#718096]">
            <span>التاريخ المحدد: </span>
            <span className="font-bold text-[#1a202c] ml-3">{selectedDate}</span>
            <span>عدد الموظفين: </span>
            <span className="font-bold text-[#1a202c] ml-3">{attendanceRows.length}</span>
            <span>الحاضرون: </span>
            <span className="font-bold text-green-700 ml-3">{stats.presents}</span>
            <span>الغائبون: </span>
            <span className="font-bold text-red-700">{stats.absents}</span>
          </div>

          <Button
            onClick={handleSaveAttendance}
            disabled={saving || loading || attendanceRows.length === 0}
            className="bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium gap-2 h-11 px-6 text-sm transition-colors duration-200"
          >
            {saving ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>حفظ جدول الحضور لليوم</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
