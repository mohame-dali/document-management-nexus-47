import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { useHubBadges } from '@/hooks/useHubBadges';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateWithWeekday } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessages';
import { resolveFrontendAttendanceScope } from '@/utils/attendanceScope';
import {
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Printer,
  ClipboardList,
  MessageSquare,
  Briefcase,
  Loader2,
} from 'lucide-react';
import {
  getDailyAttendance,
  saveBatchAttendance,
  AttendanceEntry,
  AttendanceEntryDetails,
} from '@/services/attendanceService';
import { LeaveReason, getLeaveReasons } from '@/services/leaveReasonService';
import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings, OrganizationSettings } from '@/services/organizationSettingsService';
import { Department } from '@/types';

type AttendancePillMode = 'present' | 'late' | 'absent' | 'leave_mission';
type StatusFilterMode = 'all' | AttendancePillMode;

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

const ABSENCE_ONLY_CODES = new Set(['absence_injustifiee', 'greve', 'autre']);

function getDefaultTimeHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const AttendancePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();
  const { pendingDeclarations, refetch: refetchBadges } = useHubBadges();

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
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);
  const [metadataLoaded, setMetadataLoaded] = useState<boolean>(false);
  const [leaveReasons, setLeaveReasons] = useState<LeaveReason[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AgentAttendanceRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [bulkSaving, setBulkSaving] = useState<boolean>(false);
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  const inFlightRowsRef = useRef<Set<string>>(new Set());
  const pendingRowsRef = useRef<Map<string, AgentAttendanceRow>>(new Map());

  // Périmètre départemental strict :
  // - Admin / Director : tous les départements + option « جميع الأقسام »
  // - AdminDepartment (RH) : RH + Bureau Directeur + Bureau d'Ordre uniquement
  // - AdminDepartment (autre) : propre département + Bureau Directeur uniquement
  const {
    isFullMultiDeptRole,
    allowAllOption,
    userDeptId,
    visibleDepartments,
    defaultDepartmentId,
  } = useMemo(
    () => resolveFrontendAttendanceScope(currentUser, departments, orgSettings),
    [currentUser, departments, orgSettings]
  );

  // 1. Charger les départements et paramètres organisation
  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      try {
        const [deptData, settingsData] = await Promise.all([
          getDepartments(),
          getOrganizationSettings().catch(() => null),
        ]);
        if (!active) return;
        setDepartments(deptData || []);
        setOrgSettings(settingsData);
      } catch (err) {
        console.error('Erreur chargement départements:', err);
      } finally {
        if (active) {
          setMetadataLoaded(true);
        }
      }
    };
    fetchMetadata();
    return () => {
      active = false;
    };
  }, []);

  // 2. Charger les motifs actifs
  useEffect(() => {
    const fetchReasons = async () => {
      try {
        const data = await getLeaveReasons({ isActive: true });
        setLeaveReasons((data || []).filter((r) => r.isActive));
      } catch (err) {
        console.error('Erreur chargement types de motifs:', err);
        toast.error(isRTL ? 'حدث خطأ أثناء تحميل أنواع وأسباب الغياب' : 'Erreur lors du chargement des motifs');
      }
    };
    fetchReasons();
  }, [isRTL]);

  useEffect(() => {
    if (!metadataLoaded) return;
    if (allowAllOption) {
      if (!selectedDepartment) {
        setSelectedDepartment('all');
      }
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

  // 3. Charger les présences du jour sélectionné
  const loadDailyAttendance = useCallback(async () => {
    if (!isFullMultiDeptRole && !metadataLoaded) {
      return;
    }

    const effectiveDept = allowAllOption
      ? selectedDepartment !== 'all'
        ? selectedDepartment
        : undefined
      : selectedDepartment && selectedDepartment !== 'all'
        ? selectedDepartment
        : defaultDepartmentId || userDeptId || undefined;

    if (!allowAllOption && !effectiveDept) {
      setAttendanceRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getDailyAttendance(selectedDate, effectiveDept);
      const agentList = res.data || [];

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
      setRowSaveStatus({});
      setExpandedNoteIds({});
    } catch (err: unknown) {
      console.error('Erreur chargement des présences:', err);
      toast.error(
        getErrorMessage(
          err,
          isRTL ? 'حدث خطأ أثناء تحميل لائحة الحضور' : 'Erreur lors du chargement des présences',
          isRTL ? 'ar' : 'fr'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedDate,
    selectedDepartment,
    isFullMultiDeptRole,
    metadataLoaded,
    allowAllOption,
    defaultDepartmentId,
    userDeptId,
    isRTL,
  ]);

  useEffect(() => {
    loadDailyAttendance();
  }, [loadDailyAttendance]);

  // Helper: classifier une ligne vers l'un des 4 boutons segmentés
  const getRowPillMode = useCallback(
    (row: AgentAttendanceRow): AttendancePillMode => {
      if (row.statut === 'present') {
        return row.heureArrivee && row.heureArrivee.trim() !== '' ? 'late' : 'present';
      }
      const code = (row.motif || '').toLowerCase();
      if (!code || ABSENCE_ONLY_CODES.has(code)) {
        return 'absent';
      }
      const found = leaveReasons.find((r) => r.code.toLowerCase() === code);
      if (found && found.category === 'autre' && code !== 'recuperation' && code !== 'detachement_externe' && code !== 'disponibilite') {
        return 'absent';
      }
      return 'leave_mission';
    },
    [leaveReasons]
  );

  // Construire payload API pour une ligne
  const buildEntryPayload = useCallback((r: AgentAttendanceRow): AttendanceEntry => {
    const trimmedNote = (r.detailsMotif?.commentaire || '').trim();
    if (r.statut === 'present') {
      return {
        personnelId: r.personnel._id,
        statut: 'present',
        motif: null,
        leaveReasonId: null,
        impacteSolde: false,
        detailsMotif: trimmedNote ? { commentaire: trimmedNote } : {},
        heureArrivee: r.heureArrivee?.trim() || null,
      };
    }

    return {
      personnelId: r.personnel._id,
      statut: 'absent',
      motif: r.motif?.trim() || 'absence_injustifiee',
      leaveReasonId: r.leaveReasonId || null,
      impacteSolde: r.impacteSolde,
      detailsMotif: {
        serviceNom: r.detailsMotif.serviceNom || '',
        missionLieu: r.detailsMotif.missionLieu || '',
        missionObjet: r.detailsMotif.missionObjet || '',
        formationIntitule: r.detailsMotif.formationIntitule || '',
        formationOrganisme: r.detailsMotif.formationOrganisme || '',
        formationDuree: r.detailsMotif.formationDuree || '',
        formationDocumentId: r.detailsMotif.formationDocumentId,
        commentaire: trimmedNote,
      },
      heureArrivee: null,
    };
  }, []);

  // Sauvegarde immédiate d'une ligne avec file séquentielle par employé (évite les conflits concurrents E11000)
  const persistSingleRow = useCallback(
    async (updatedRow: AgentAttendanceRow) => {
      const id = updatedRow.personnel._id;
      const normalizedRow: AgentAttendanceRow =
        updatedRow.statut === 'absent' && (!updatedRow.motif || updatedRow.motif.trim() === '')
          ? { ...updatedRow, motif: 'absence_injustifiee' }
          : updatedRow;

      if (inFlightRowsRef.current.has(id)) {
        pendingRowsRef.current.set(id, normalizedRow);
        return;
      }

      inFlightRowsRef.current.add(id);
      setRowSaveStatus((prev) => ({ ...prev, [id]: 'saving' }));

      try {
        await saveBatchAttendance(selectedDate, [buildEntryPayload(normalizedRow)]);
        setAttendanceRows((prev) =>
          prev.map((r) => (r.personnel._id === id ? { ...r, hasSavedRecord: true } : r))
        );
        setRowSaveStatus((prev) => ({ ...prev, [id]: 'saved' }));
        refetchBadges();
      } catch (err: unknown) {
        console.error('Erreur sauvegarde ligne:', err);
        setRowSaveStatus((prev) => ({ ...prev, [id]: 'error' }));
        const msg = getErrorMessage(
          err,
          isRTL ? 'تعذر حفظ حالة الموظف' : 'Échec de l’enregistrement',
          isRTL ? 'ar' : 'fr'
        );
        toast.error(msg);
      } finally {
        inFlightRowsRef.current.delete(id);
        const queued = pendingRowsRef.current.get(id);
        if (queued) {
          pendingRowsRef.current.delete(id);
          void persistSingleRow(queued);
        }
      }
    },
    [selectedDate, buildEntryPayload, isRTL, refetchBadges]
  );

  // Changement immédiat par clic sur l'un des 4 boutons segmentés
  const handleSelectPill = (index: number, mode: AttendancePillMode) => {
    const current = attendanceRows[index];
    if (!current) return;

    const preservedNote = current.detailsMotif?.commentaire || '';
    let nextRow: AgentAttendanceRow = { ...current };

    if (mode === 'present') {
      nextRow = {
        ...nextRow,
        statut: 'present',
        heureArrivee: '',
        motif: '',
        leaveReasonId: null,
        impacteSolde: false,
        detailsMotif: preservedNote ? { commentaire: preservedNote } : {},
      };
    } else if (mode === 'late') {
      nextRow = {
        ...nextRow,
        statut: 'present',
        heureArrivee: current.heureArrivee || getDefaultTimeHHMM(),
        motif: '',
        leaveReasonId: null,
        impacteSolde: false,
        detailsMotif: preservedNote ? { commentaire: preservedNote } : {},
      };
    } else if (mode === 'absent') {
      const currentMode = getRowPillMode(current);
      const preferredAbsence =
        (currentMode === 'absent' && current.motif
          ? leaveReasons.find((r) => r.code === current.motif)
          : undefined) ||
        leaveReasons.find((r) => r.code === 'absence_injustifiee') ||
        leaveReasons.find((r) => ABSENCE_ONLY_CODES.has(r.code.toLowerCase())) ||
        leaveReasons[0];

      nextRow = {
        ...nextRow,
        statut: 'absent',
        heureArrivee: '',
        motif: preferredAbsence?.code || 'absence_injustifiee',
        leaveReasonId: preferredAbsence?._id || null,
        impacteSolde: Boolean(preferredAbsence?.impacteSolde ?? true),
      };
    } else {
      // leave_mission
      const currentMode = getRowPillMode(current);
      const preferredLeave =
        (currentMode === 'leave_mission' && current.motif
          ? leaveReasons.find((r) => r.code === current.motif)
          : undefined) ||
        leaveReasons.find((r) => r.code === 'conge_annuel') ||
        leaveReasons.find((r) => !ABSENCE_ONLY_CODES.has(r.code.toLowerCase())) ||
        leaveReasons[0];

      nextRow = {
        ...nextRow,
        statut: 'absent',
        heureArrivee: '',
        motif: preferredLeave?.code || 'conge_annuel',
        leaveReasonId: preferredLeave?._id || null,
        impacteSolde: Boolean(preferredLeave?.impacteSolde ?? true),
      };
    }

    setAttendanceRows((prev) => {
      const updated = [...prev];
      updated[index] = nextRow;
      return updated;
    });

    void persistSingleRow(nextRow);
  };

  // Changement du motif d'absence / congé / mission
  const handleMotifChange = (index: number, motifCode: string) => {
    const current = attendanceRows[index];
    if (!current) return;

    const foundReason = leaveReasons.find((r) => r.code === motifCode);
    const cleanedDetails: AttendanceEntryDetails = { ...current.detailsMotif };
    if (motifCode !== 'service') delete cleanedDetails.serviceNom;
    if (motifCode !== 'mission') {
      delete cleanedDetails.missionLieu;
      delete cleanedDetails.missionObjet;
    }
    if (motifCode !== 'formation') {
      delete cleanedDetails.formationIntitule;
      delete cleanedDetails.formationOrganisme;
      delete cleanedDetails.formationDuree;
    }

    const nextRow: AgentAttendanceRow = {
      ...current,
      motif: motifCode,
      leaveReasonId: foundReason ? foundReason._id : null,
      impacteSolde: foundReason ? Boolean(foundReason.impacteSolde) : false,
      detailsMotif: cleanedDetails,
    };

    setAttendanceRows((prev) => {
      const updated = [...prev];
      updated[index] = nextRow;
      return updated;
    });

    void persistSingleRow(nextRow);
  };

  // Mise à jour locale d'un champ détail ou heure
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

  // Navigation rapide des dates
  const shiftDate = (daysDelta: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + daysDelta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  // Action rapide : Tout marquer présent & enregistrer immédiatement
  const handleMarkAllPresentAndSave = async () => {
    if (attendanceRows.length === 0) return;

    const nextRows: AgentAttendanceRow[] = attendanceRows.map((row) => ({
      ...row,
      statut: 'present',
      heureArrivee: '',
      motif: '',
      leaveReasonId: null,
      impacteSolde: false,
      detailsMotif: {},
    }));

    setAttendanceRows(nextRows);

    try {
      setBulkSaving(true);
      const entries = nextRows.map(buildEntryPayload);
      await saveBatchAttendance(selectedDate, entries);

      const savedMap: Record<string, 'saved'> = {};
      nextRows.forEach((r) => {
        savedMap[r.personnel._id] = 'saved';
      });
      setAttendanceRows((prev) => prev.map((r) => ({ ...r, hasSavedRecord: true })));
      setRowSaveStatus(savedMap);
      refetchBadges();
      toast.success(
        isRTL
          ? `تم تحديد وحفظ جميع الموظفين (${nextRows.length}) كحاضرين`
          : `Tous les agents (${nextRows.length}) ont été marqués présents et enregistrés`
      );
    } catch (err: unknown) {
      console.error('Erreur lors de la sauvegarde groupée:', err);
      toast.error(
        getErrorMessage(
          err,
          isRTL ? 'حدث خطأ أثناء الحفظ الجماعي' : 'Erreur lors de l’enregistrement groupé',
          isRTL ? 'ar' : 'fr'
        )
      );
    } finally {
      setBulkSaving(false);
    }
  };

  // Filtrage
  const filteredRows = useMemo(() => {
    return attendanceRows.filter((item) => {
      if (statusFilter !== 'all') {
        if (getRowPillMode(item) !== statusFilter) return false;
      }
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
  }, [attendanceRows, searchQuery, statusFilter, getRowPillMode]);

  // Statistiques compactes
  const stats = useMemo(() => {
    let presents = 0;
    let lates = 0;
    let absents = 0;
    let leaveMissions = 0;
    let saved = 0;

    attendanceRows.forEach((r) => {
      if (r.hasSavedRecord) saved++;
      const mode = getRowPillMode(r);
      if (mode === 'present') presents++;
      else if (mode === 'late') lates++;
      else if (mode === 'absent') absents++;
      else leaveMissions++;
    });

    return {
      total: attendanceRows.length,
      presents,
      lates,
      absents,
      leaveMissions,
      saved,
    };
  }, [attendanceRows, getRowPillMode]);

  // Listes de motifs pour « غائب » vs « إجازة / مهمة »
  const absenceOnlyReasons = useMemo(() => {
    const filtered = leaveReasons.filter(
      (r) =>
        ABSENCE_ONLY_CODES.has(r.code.toLowerCase()) ||
        (r.category === 'autre' &&
          r.code !== 'recuperation' &&
          r.code !== 'detachement_externe' &&
          r.code !== 'disponibilite')
    );
    return filtered.length > 0 ? filtered : leaveReasons;
  }, [leaveReasons]);

  const leaveMissionReasons = useMemo(() => {
    const filtered = leaveReasons.filter(
      (r) =>
        !ABSENCE_ONLY_CODES.has(r.code.toLowerCase()) &&
        !(
          r.category === 'autre' &&
          r.code !== 'recuperation' &&
          r.code !== 'detachement_externe' &&
          r.code !== 'disponibilite'
        )
    );
    return filtered.length > 0 ? filtered : leaveReasons;
  }, [leaveReasons]);

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3.5 text-start px-1 sm:px-2 max-w-full" dir={dir}>
      {/* 1. Single-Row Compact KPI Strip + Secondary HR Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#2c5282] dark:bg-sky-700 text-white font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isRTL ? 'الكل' : 'Tous'} ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'present'
                ? 'bg-emerald-700 text-white font-bold'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            {isRTL ? 'حاضر' : 'Présent'} ({stats.presents})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'late'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            {isRTL ? 'متأخر' : 'En retard'} ({stats.lates})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'absent'
                ? 'bg-red-700 text-white font-bold'
                : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            {isRTL ? 'غائب' : 'Absent'} ({stats.absents})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'leave_mission' ? 'all' : 'leave_mission')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'leave_mission'
                ? 'bg-indigo-700 text-white font-bold'
                : 'text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
          >
            {isRTL ? 'إجازة / مهمة' : 'Congé / Mission'} ({stats.leaveMissions})
          </button>

          <span className="hidden md:inline-flex items-center text-slate-500 dark:text-slate-400 ms-2">
            · {isRTL ? `مسجل اليوم: ${stats.saved}/${stats.total}` : `Enregistrés : ${stats.saved}/${stats.total}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium gap-1.5 whitespace-nowrap shrink-0"
          >
            <Link to="/dashboard/hr/attendance-declarations">
              <ClipboardList className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{isRTL ? 'الإعلانات المعلقة' : 'Déclarations'}</span>
              {pendingDeclarations > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 rounded-full tabular-nums">
                  {pendingDeclarations}
                </span>
              )}
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3 border-slate-300 dark:border-slate-700 text-[#2c5282] dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg text-xs font-medium gap-1.5 whitespace-nowrap shrink-0"
          >
            <Link to="/dashboard/hr/attendance/report">
              <Printer className="h-3.5 w-3.5" />
              <span>{isRTL ? 'طباعة الكشف الشهري' : 'Fiche mensuelle'}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Date Switcher, Filters & Bulk Mark-All-Present Action */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-3 space-y-3 shadow-xs print:hidden">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Quick Date Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => shiftDate(-1)}
                className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-md gap-1 whitespace-nowrap"
              >
                <PrevIcon className="h-3.5 w-3.5" />
                <span>{isRTL ? 'اليوم السابق' : 'Hier'}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(todayStr)}
                className={`h-8 px-3 text-xs font-bold rounded-md whitespace-nowrap ${
                  selectedDate === todayStr
                    ? 'bg-[#2c5282] dark:bg-sky-700 text-white hover:bg-[#2c5282] dark:hover:bg-sky-700'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                {isRTL ? 'اليوم' : "Aujourd'hui"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => shiftDate(1)}
                className="h-8 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-md gap-1 whitespace-nowrap"
              >
                <span>{isRTL ? 'اليوم الموالي' : 'Demain'}</span>
                <NextIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                aria-label={isRTL ? 'تاريخ الحضور' : 'Date de présence'}
                className="h-9 w-40 border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
              />
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                <bdi dir={dir}>{formatDateWithWeekday(selectedDate, isRTL ? 'ar' : 'fr')}</bdi>
              </span>
            </div>
          </div>

          {/* Primary Bulk Action */}
          <Button
            type="button"
            onClick={handleMarkAllPresentAndSave}
            disabled={loading || bulkSaving || attendanceRows.length === 0}
            className="h-9 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs gap-1.5 whitespace-nowrap shrink-0 self-start xl:self-auto"
          >
            {bulkSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{isRTL ? 'تحديد الكل كـ حاضر' : 'Tout marquer présent'}</span>
          </Button>
        </div>

        {/* Department & Search Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder={
                isRTL ? 'بحث بالاسم، اللقب أو رقم ب.ت.و...' : 'Rechercher par nom, prénom ou CIN...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full border-slate-300 dark:border-slate-700 rounded-lg text-xs ps-9 bg-white dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="w-full sm:w-48 shrink-0">
            {!allowAllOption && visibleDepartments.length === 0 ? (
              <div className="h-9 px-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 rounded-lg text-xs flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {typeof currentUser?.activeDepartment === 'object'
                    ? (currentUser.activeDepartment as { name?: string })?.name ||
                      (isRTL ? 'القسم المخصص' : 'Département assigné')
                    : isRTL
                    ? 'القسم المخصص'
                    : 'Département assigné'}
                </span>
              </div>
            ) : (
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-9 w-full border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-950 dark:text-slate-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                    <SelectValue
                      placeholder={
                        allowAllOption
                          ? isRTL
                            ? 'جميع الأقسام'
                            : 'Tous les départements'
                          : isRTL
                          ? 'اختر القسم'
                          : 'Choisir le département'
                      }
                    />
                  </div>
                </SelectTrigger>
                <SelectContent dir={dir}>
                  {allowAllOption && (
                    <SelectItem value="all">
                      {isRTL ? 'جميع الأقسام' : 'Tous les départements'}
                    </SelectItem>
                  )}
                  {visibleDepartments.map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* 3. Fluid Daily Attendance Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {loading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            className="border-0 rounded-none py-14"
            icon={<Users className="h-6 w-6" />}
            title={isRTL ? 'لا يوجد موظفون للعرض' : 'Aucun employé à afficher'}
            description={
              isRTL
                ? 'تأكد من اختيار القسم المناسب أو ضبط معايير البحث'
                : 'Vérifiez le département sélectionné ou ajustez votre recherche'
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((row) => {
              const originalIndex = attendanceRows.findIndex(
                (r) => r.personnel._id === row.personnel._id
              );
              const pillMode = getRowPillMode(row);
              const isAbsentMode = pillMode === 'absent' || pillMode === 'leave_mission';
              const saveStatus = rowSaveStatus[row.personnel._id];
              const isNoteOpen = Boolean(expandedNoteIds[row.personnel._id]);
              const reasonsPool = pillMode === 'absent' ? absenceOnlyReasons : leaveMissionReasons;

              return (
                <div
                  key={row.personnel._id}
                  className={`px-4 py-3 transition-colors duration-150 ${
                    pillMode === 'present'
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      : pillMode === 'late'
                      ? 'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/50 dark:hover:bg-amber-950/25'
                      : 'bg-slate-50/50 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Employee Info */}
                    <div className="flex items-center gap-3 min-w-[230px] flex-1">
                      <PersonnelAvatar
                        photo={row.personnel.photo}
                        nom={row.personnel.nom}
                        prenom={row.personnel.prenom}
                        size="sm"
                        className="h-10 w-10"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {row.personnel.nom} {row.personnel.prenom}
                          </h3>

                          {saveStatus === 'saving' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                            </span>
                          ) : saveStatus === 'saved' || row.hasSavedRecord ? (
                            <span
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                              title={isRTL ? 'تم الحفظ' : 'Enregistré'}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {row.personnel.cin && (
                            <span className="font-mono tabular-nums">{row.personnel.cin}</span>
                          )}
                          {row.personnel.poste && (
                            <>
                              {row.personnel.cin && <span>·</span>}
                              <span className="truncate max-w-[180px]">{row.personnel.poste}</span>
                            </>
                          )}
                          {row.personnel.activeDepartment && (
                            <>
                              <span>·</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {row.personnel.activeDepartment.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4-Pill Instant Segmented Toggle + Time / Note */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        role="radiogroup"
                        aria-label={`${row.personnel.nom} ${row.personnel.prenom}`}
                        className="inline-flex flex-wrap items-center gap-1 bg-slate-100/90 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg"
                      >
                        {/* 1. حاضر / Présent */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={pillMode === 'present'}
                          onClick={() => handleSelectPill(originalIndex, 'present')}
                          className={`h-8 px-3 rounded-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c5282] ${
                            pillMode === 'present'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{isRTL ? 'حاضر' : 'Présent'}</span>
                        </button>

                        {/* 2. متأخر / En retard */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={pillMode === 'late'}
                          onClick={() => handleSelectPill(originalIndex, 'late')}
                          className={`h-8 px-3 rounded-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                            pillMode === 'late'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{isRTL ? 'متأخر' : 'En retard'}</span>
                        </button>

                        {/* 3. غائب / Absent */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={pillMode === 'absent'}
                          onClick={() => handleSelectPill(originalIndex, 'absent')}
                          className={`h-8 px-3 rounded-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                            pillMode === 'absent'
                              ? 'bg-red-700 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{isRTL ? 'غائب' : 'Absent'}</span>
                        </button>

                        {/* 4. إجازة / مهمة / Congé / Mission */}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={pillMode === 'leave_mission'}
                          onClick={() => handleSelectPill(originalIndex, 'leave_mission')}
                          className={`h-8 px-3 rounded-md text-xs font-bold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                            pillMode === 'leave_mission'
                              ? 'bg-indigo-700 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          <span>{isRTL ? 'إجازة / مهمة' : 'Congé / Mission'}</span>
                        </button>
                      </div>

                      {/* Arrival time input when Late */}
                      {pillMode === 'late' && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="time"
                            value={row.heureArrivee}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendanceRows((prev) => {
                                const u = [...prev];
                                u[originalIndex] = { ...u[originalIndex], heureArrivee: val };
                                return u;
                              });
                            }}
                            onBlur={(e) => {
                              const val = e.target.value || getDefaultTimeHHMM();
                              const updated = { ...row, heureArrivee: val };
                              setAttendanceRows((prev) => {
                                const u = [...prev];
                                u[originalIndex] = updated;
                                return u;
                              });
                              void persistSingleRow(updated);
                            }}
                            aria-label={isRTL ? 'ساعة الوصول' : "Heure d'arrivée"}
                            className="h-8 w-24 text-xs border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                          />
                        </div>
                      )}

                      {/* Optional Inline Note Icon */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedNoteIds((prev) => ({
                            ...prev,
                            [row.personnel._id]: !prev[row.personnel._id],
                          }))
                        }
                        title={isRTL ? 'ملاحظة' : 'Remarque'}
                        aria-label={isRTL ? 'إضافة ملاحظة' : 'Ajouter une remarque'}
                        className={`h-8 w-8 p-0 rounded-md shrink-0 ${
                          row.detailsMotif.commentaire
                            ? 'text-[#2c5282] dark:text-sky-300 bg-blue-50 dark:bg-blue-950/50'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline Leave / Absence Reason Row when Absent or Leave/Mission */}
                  {isAbsentMode && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {isRTL ? 'السبب:' : 'Motif :'}
                          </span>
                          <Select
                            value={row.motif || ''}
                            onValueChange={(val) => handleMotifChange(originalIndex, val)}
                          >
                            <SelectTrigger className="h-8 border-slate-300 dark:border-slate-700 rounded-md text-xs bg-white dark:bg-slate-950 dark:text-slate-100 max-w-xs">
                              <SelectValue placeholder={isRTL ? 'اختر السبب' : 'Choisir le motif'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60" dir={dir}>
                              {reasonsPool.map((lr) => (
                                <SelectItem key={lr._id} value={lr.code} className="text-xs py-1.5">
                                  {isRTL ? lr.labelAr : lr.labelFr || lr.labelAr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          {row.impacteSolde ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 px-2.5 py-0.5 text-xs font-semibold gap-1"
                            >
                              <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span>{isRTL ? 'يخصم من الرصيد' : 'Déduit du solde'}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-xs font-medium gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span>{isRTL ? 'لا يخصم من الرصيد' : 'Non déduit'}</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Conditional Details: Service / Mission / Formation */}
                      {row.motif === 'service' && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Input
                            type="text"
                            placeholder={
                              isRTL ? 'اسم المصلحة أو الوجهة الإدارية...' : 'Service ou destination...'
                            }
                            value={row.detailsMotif.serviceNom || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'serviceNom', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100 max-w-md"
                          />
                        </div>
                      )}

                      {row.motif === 'mission' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                          <Input
                            type="text"
                            placeholder={isRTL ? 'مكان المهمة...' : 'Lieu de mission...'}
                            value={row.detailsMotif.missionLieu || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'missionLieu', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100"
                          />
                          <Input
                            type="text"
                            placeholder={isRTL ? 'موضوع المهمة...' : 'Objet de mission...'}
                            value={row.detailsMotif.missionObjet || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'missionObjet', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100"
                          />
                        </div>
                      )}

                      {row.motif === 'formation' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-3xl">
                          <Input
                            type="text"
                            placeholder={isRTL ? 'عنوان التكوين...' : 'Intitulé de formation...'}
                            value={row.detailsMotif.formationIntitule || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'formationIntitule', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100"
                          />
                          <Input
                            type="text"
                            placeholder={isRTL ? 'الهيئة المؤطرة...' : 'Organisme...'}
                            value={row.detailsMotif.formationOrganisme || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'formationOrganisme', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100"
                          />
                          <Input
                            type="text"
                            placeholder={isRTL ? 'المدة (مثال: 3 أيام)...' : 'Durée...'}
                            value={row.detailsMotif.formationDuree || ''}
                            onChange={(e) =>
                              handleDetailChange(originalIndex, 'formationDuree', e.target.value)
                            }
                            onBlur={() => void persistSingleRow(row)}
                            className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Inline Note Row (supported for all statuses) */}
                  {isNoteOpen && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        type="text"
                        placeholder={isRTL ? 'أضف ملاحظة حول الحالة...' : 'Ajouter une remarque...'}
                        value={row.detailsMotif.commentaire || ''}
                        onChange={(e) =>
                          handleDetailChange(originalIndex, 'commentaire', e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void persistSingleRow(row);
                          }
                        }}
                        className="h-8 text-xs border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 dark:text-slate-100 flex-1 max-w-lg"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saveStatus === 'saving'}
                        onClick={() => void persistSingleRow(row)}
                        className="h-8 px-3 text-xs rounded-md whitespace-nowrap shrink-0"
                      >
                        {isRTL ? 'حفظ الملاحظة' : 'Enregistrer'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
