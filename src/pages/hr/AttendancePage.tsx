import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useDirection } from '@/i18n/useDirection';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CalendarCheck,
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  ChevronLeft,
  ChevronRight,
  Home,
  AlertCircle,
  Check,
  Printer,
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
  const { dir, isRTL } = useDirection();

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

  // Rôles et département de l'utilisateur connecté
  const userRole = currentUser?.role;
  const userDeptId = currentUser?.activeDepartment
    ? typeof currentUser.activeDepartment === 'object'
      ? (currentUser.activeDepartment as { _id?: string })._id || null
      : currentUser.activeDepartment
    : null;

  const userDepartmentName =
    (typeof currentUser?.activeDepartment === 'object'
      ? (currentUser.activeDepartment as { name?: string }).name
      : null) ||
    departments.find((d) => String(d._id) === String(userDeptId))?.name ||
    '';

  const userDepartmentCode =
    (typeof currentUser?.activeDepartment === 'object'
      ? (currentUser.activeDepartment as { code?: string }).code
      : null) ||
    departments.find((d) => String(d._id) === String(userDeptId))?.code ||
    '';

  // Déterminer si l'utilisateur est rattaché aux RH
  const isRHDepartment =
    userDepartmentName === 'RH' ||
    userDepartmentCode === 'RH' ||
    userDepartmentName.toUpperCase().includes('RH') ||
    userDepartmentName === 'الموارد البشرية' ||
    currentUser?.username === 'RHadmin';

  // Déterminer si l'utilisateur peut voir tous les départements
  const canSeeAllDepartments =
    userRole === 'Admin' ||
    userRole === 'Director' ||
    (userRole === 'AdminDepartment' && (userDepartmentName === 'RH' || isRHDepartment));

  // Vérifier si l'utilisateur est restreint à un département
  const isDepartmentRestricted = !canSeeAllDepartments;

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
      // Si l'utilisateur peut voir tous les départements, ne pas filtrer sauf sélection spécifique
      // Sinon, filtrer sur son propre département
      const effectiveDept = canSeeAllDepartments
        ? selectedDepartment !== 'all'
          ? selectedDepartment
          : undefined
        : userDeptId || undefined;

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
        const rawDetails = att?.detailsMotif;
        const detailsMotif: AttendanceEntryDetails = rawDetails
          ? {
              serviceNom: rawDetails.serviceNom ?? rawDetails.nomService ?? '',
              missionLieu: rawDetails.missionLieu ?? rawDetails.lieuMission ?? '',
              missionObjet: rawDetails.missionObjet ?? rawDetails.objetMission ?? '',
              formationIntitule: rawDetails.formationIntitule ?? rawDetails.intituleFormation ?? '',
              formationOrganisme: rawDetails.formationOrganisme ?? rawDetails.organismeFormation ?? '',
              formationDuree: rawDetails.formationDuree ?? rawDetails.dureeFormation ?? '',
              formationDocumentId: rawDetails.formationDocumentId,
              commentaire: rawDetails.commentaire ?? '',
            }
          : {};

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
  }, [selectedDate, selectedDepartment, canSeeAllDepartments, userDeptId]);

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
        delete row.detailsMotif.serviceNom;
      }
      if (motifCode !== 'mission') {
        delete row.detailsMotif.missionLieu;
        delete row.detailsMotif.missionObjet;
      }
      if (motifCode !== 'formation') {
        delete row.detailsMotif.formationIntitule;
        delete row.detailsMotif.formationOrganisme;
        delete row.detailsMotif.formationDuree;
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
        detailsMotif:
          r.statut === 'present'
            ? {}
            : {
                serviceNom: r.detailsMotif.serviceNom || '',
                missionLieu: r.detailsMotif.missionLieu || '',
                missionObjet: r.detailsMotif.missionObjet || '',
                formationIntitule: r.detailsMotif.formationIntitule || '',
                formationOrganisme: r.detailsMotif.formationOrganisme || '',
                formationDuree: r.detailsMotif.formationDuree || '',
                formationDocumentId: r.detailsMotif.formationDocumentId,
                commentaire: r.detailsMotif.commentaire || '',
              },
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

  const BreadcrumbChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 pb-24 space-y-5 text-start" dir={dir}>
      {/* 1. En-tête sobre */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 print:hidden">
              <Link to="/dashboard" className="hover:text-[#2c5282] dark:hover:text-sky-400 flex items-center gap-1 transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span>لوحة التحكم</span>
              </Link>
              <BreadcrumbChevron className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <Link to="/dashboard/hr/personnel" className="hover:text-[#2c5282] dark:hover:text-sky-400 transition-colors">
                <span>الموارد البشرية</span>
              </Link>
              <BreadcrumbChevron className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold">تسجيل الحضور</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5282] dark:bg-sky-700 text-white rounded-lg shadow-sm">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  ورقة تسجيل الحضور اليومي
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  تسجيل إثبات الحضور والغياب واحتساب الخصم من الرصيد ديناميكياً
                </p>
              </div>
            </div>
          </div>

          {/* Bouton Enregistrer en haut */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button
              asChild
              variant="outline"
              className="border-[#2c5282] dark:border-sky-600 text-[#2c5282] dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg font-medium gap-2 h-10 px-4 transition-colors duration-200"
            >
              <Link to="/dashboard/hr/attendance/report">
                <Printer className="h-4 w-4" />
                <span>{isRTL ? 'طباعة الكشف الشهري' : 'Imprimer la fiche mensuelle'}</span>
              </Link>
            </Button>

            <Button
              onClick={handleSaveAttendance}
              disabled={saving || loading || attendanceRows.length === 0}
              className="bg-[#2c5282] hover:bg-[#2a4365] dark:bg-sky-700 dark:hover:bg-sky-600 text-white rounded-lg font-medium gap-2 h-10 px-5 transition-colors duration-200"
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 space-y-4 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5 items-end">
          {/* Sélecteur de date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
              <span>تاريخ الحضور :</span>
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
            />
          </div>

          {/* Sélecteur de département */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
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
                className="h-10 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 rounded-lg text-sm cursor-not-allowed"
              />
            ) : (
              <Select
                value={selectedDepartment}
                onValueChange={(val) => setSelectedDepartment(val)}
              >
                <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-slate-100">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent dir={dir}>
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>بحث عن موظف :</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="الاسم، اللقب، رقم ب.ت.و..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-slate-200 dark:border-slate-700 rounded-lg text-sm ps-9 bg-white dark:bg-slate-950 dark:text-slate-100"
              />
              <Search className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Bouton action rapide */}
          <div className="space-y-2 flex flex-col justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAllPresent}
              disabled={loading || attendanceRows.length === 0}
              className="h-10 border-slate-200 dark:border-slate-700 text-[#2c5282] dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium gap-2 text-sm"
            >
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>تحديد الكل كحاضر</span>
            </Button>
          </div>
        </div>

        {/* Barre de stats et filtre d'affichage */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="text-slate-600 dark:text-slate-400">إجمالي الموظفين:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
              {stats.total}
            </span>

            <span className="text-slate-600 dark:text-slate-400 ms-2">الحاضرون:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-md border border-emerald-200 dark:border-emerald-800/70">
              {stats.presents}
            </span>

            <span className="text-slate-600 dark:text-slate-400 ms-2">الغائبون:</span>
            <span className="font-bold text-red-700 dark:text-red-300 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-800/70">
              {stats.absents}
            </span>

            {stats.saved > 0 && (
              <span className="text-slate-500 dark:text-slate-400 text-xs ms-2">
                (تم حفظ {stats.saved} مسبقاً لهذا اليوم)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">تصفية العرض:</span>
            <Button
              size="sm"
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('all')}
              className={`h-9 text-xs px-3.5 rounded-lg tabular-nums ${
                statusFilter === 'all'
                  ? 'bg-[#2c5282] dark:bg-sky-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              الكل ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'present' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('present')}
              className={`h-9 text-xs px-3.5 rounded-lg tabular-nums ${
                statusFilter === 'present'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              الحاضرون ({stats.presents})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === 'absent' ? 'default' : 'ghost'}
              onClick={() => setStatusFilter('absent')}
              className={`h-9 text-xs px-3.5 rounded-lg tabular-nums ${
                statusFilter === 'absent'
                  ? 'bg-red-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40'
              }`}
            >
              الغائبون ({stats.absents})
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Liste du personnel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            className="border-0 rounded-none py-14"
            icon={<Users className="h-6 w-6" />}
            title="لا يوجد موظفون للعرض"
            description="تأكد من اختيار القسم المناسب أو إضافة موظفين في قسم الموارد البشرية"
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((row) => {
              // Trouver l'index original dans attendanceRows
              const originalIndex = attendanceRows.findIndex(
                (r) => r.personnel._id === row.personnel._id
              );
              const isPresent = row.statut === 'present';

              return (
                <div
                  key={row.personnel._id}
                  className={`p-4 transition-colors duration-150 ${
                    isPresent
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50/80 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Infos Agent */}
                    <div className="flex items-center gap-3.5 min-w-[260px] flex-1">
                      <PersonnelAvatar
                        photo={row.personnel.photo}
                        nom={row.personnel.nom}
                        prenom={row.personnel.prenom}
                        size="md"
                        className="h-11 w-11"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {row.personnel.nom} {row.personnel.prenom}
                          </h3>
                          {row.hasSavedRecord && (
                            <span
                              className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/70"
                              title="تم تسجيل هذه الحالة مسبقاً"
                            >
                              مُسجل
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {row.personnel.cin && (
                            <span className="font-mono tabular-nums">ب.ت.و: {row.personnel.cin}</span>
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 font-medium">
                                {row.personnel.activeDepartment.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contrôle Présent / Absent */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleToggleStatut(originalIndex, true)}
                          className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                            isPresent
                              ? 'bg-emerald-700 text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>حاضر</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatut(originalIndex, false)}
                          className={`h-9 px-3.5 rounded-md text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                            !isPresent
                              ? 'bg-red-700 text-white shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                          <span>غائب</span>
                        </button>
                      </div>

                      {/* Si présent : heure d'arrivée optionnelle */}
                      {isPresent && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                            className="h-9 w-28 text-xs border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Spécifique si ABSENT */}
                  {!isPresent && (
                    <div className="mt-3.5 pt-3.5 bg-white dark:bg-slate-900/90 p-4 rounded-lg border border-amber-300/70 dark:border-amber-800/60 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Sélection du Motif */}
                        <div className="flex-1 min-w-[240px]">
                          <label className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1.5 block">
                            سبب الغياب <span className="text-red-600 dark:text-red-400">*</span> :
                          </label>
                          <Select
                            value={row.motif || ''}
                            onValueChange={(val) => handleMotifChange(originalIndex, val)}
                          >
                            <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-950 dark:text-slate-100">
                              <SelectValue placeholder="اختر سبب الغياب" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60" dir={dir}>
                              {leaveReasons.map((lr) => (
                                <SelectItem key={lr._id} value={lr.code} className="text-sm py-2">
                                  <div className="flex items-center justify-between gap-3 w-full">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{lr.labelAr}</span>
                                    {lr.labelFr && (
                                      <span className="text-slate-400 text-xs font-mono">
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
                        <div className="sm:text-end flex flex-col justify-end">
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block">
                            تأثير الغياب على الرصيد :
                          </label>
                          <div>
                            {row.impacteSolde ? (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 px-3 py-1 text-xs font-bold gap-1.5"
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span>يؤثر على الرصيد : نعم (مخصوم)</span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-semibold gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <span>يؤثر على الرصيد : لا (غير مخصوم)</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Champs conditionnels selon le motif */}
                      {/* Cas 1: Motif "service" */}
                      {row.motif === 'service' && (
                        <div className="bg-amber-50/60 dark:bg-slate-950/70 p-4 rounded-lg border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                          <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                            اسم المصلحة أو الوجهة الإدارية :
                          </label>
                          <Input
                            type="text"
                            placeholder="حدد اسم المصلحة المكلف بها..."
                            value={row.detailsMotif.serviceNom || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'serviceNom', e.target.value)
                            }
                            className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
                          />
                        </div>
                      )}

                      {/* Cas 2: Motif "mission" */}
                      {row.motif === 'mission' && (
                        <div className="bg-amber-50/60 dark:bg-slate-950/70 p-4 rounded-lg border border-amber-200/80 dark:border-amber-800/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                              مكان المهمة :
                            </label>
                            <Input
                              type="text"
                              placeholder="المدينة / المؤسسة..."
                              value={row.detailsMotif.missionLieu || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'missionLieu', e.target.value)
                              }
                              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                              موضوع المهمة :
                            </label>
                            <Input
                              type="text"
                              placeholder="الهدف من المهمة..."
                              value={row.detailsMotif.missionObjet || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'missionObjet', e.target.value)
                              }
                              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Cas 3: Motif "formation" */}
                      {row.motif === 'formation' && (
                        <div className="bg-amber-50/60 dark:bg-slate-950/70 p-4 rounded-lg border border-amber-200/80 dark:border-amber-800/50 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                              عنوان التكوين :
                            </label>
                            <Input
                              type="text"
                              placeholder="موضوع الدورة التكوينية..."
                              value={row.detailsMotif.formationIntitule || ''}
                              onChange={(e) =>
                                handleDetailChange(
                                  originalIndex,
                                  'formationIntitule',
                                  e.target.value
                                )
                              }
                              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                              الهيئة المؤطرة :
                            </label>
                            <Input
                              type="text"
                              placeholder="الجهة أو المركز المنظم..."
                              value={row.detailsMotif.formationOrganisme || ''}
                              onChange={(e) =>
                                handleDetailChange(
                                  originalIndex,
                                  'formationOrganisme',
                                  e.target.value
                                )
                              }
                              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-amber-900 dark:text-amber-300">
                              مدة التكوين :
                            </label>
                            <Input
                              type="text"
                              placeholder="مثال: 3 أيام، أسبوع..."
                              value={row.detailsMotif.formationDuree || ''}
                              onChange={(e) =>
                                handleDetailChange(originalIndex, 'formationDuree', e.target.value)
                              }
                              className="h-10 text-sm border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100"
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
        <div
          data-sticky-validation-bar="true"
          className="sticky bottom-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md print:hidden"
        >
          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span>
              التاريخ المحدد:{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDate}</span>
            </span>
            <span>
              عدد الموظفين:{' '}
              <span className="font-bold text-slate-900 dark:text-slate-100">{attendanceRows.length}</span>
            </span>
            <span>
              الحاضرون:{' '}
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{stats.presents}</span>
            </span>
            <span>
              الغائبون:{' '}
              <span className="font-bold text-red-700 dark:text-red-400">{stats.absents}</span>
            </span>
          </div>

          <Button
            onClick={handleSaveAttendance}
            disabled={saving || loading || attendanceRows.length === 0}
            className="bg-[#2c5282] hover:bg-[#2a4365] dark:bg-sky-700 dark:hover:bg-sky-600 text-white rounded-lg font-medium gap-2 h-10 px-6 text-sm transition-colors duration-200"
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
