import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAllDeclarations,
  approveDeclaration,
  rejectDeclaration,
  updateDeclaration,
  AttendanceDeclaration,
  DeclarationFilters,
} from '@/services/attendanceDeclarationService';
import { getDepartments } from '@/services/departmentService';
import { getLeaveReasons, LeaveReason } from '@/services/leaveReasonService';
import { Department } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDirection } from '@/i18n/useDirection';
import { PersonnelAvatar } from '@/components/hr/PersonnelAvatar';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Search,
  RotateCcw,
  Calendar,
  UserCheck,
  UserX,
  Loader2,
  MapPin,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { getErrorMessage } from '@/utils/errorMessages';
import { formatDateWithWeekday, formatShortDate } from '@/utils/formatDate';

export const AttendanceDeclarationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { dir, isRTL } = useDirection();

  // Liste des déclarations & chargement
  const [declarations, setDeclarations] = useState<AttendanceDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 20;

  // Données de référence
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveReasons, setLeaveReasons] = useState<LeaveReason[]>([]);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'approuvee' | 'rejetee' | 'modifiee'>('en_attente');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals d'action
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [activeDeclaration, setActiveDeclaration] = useState<AttendanceDeclaration | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // État du formulaire d'édition Admin
  const [editForm, setEditForm] = useState({
    statut: 'present' as 'present' | 'absent',
    motif: '',
    nomService: '',
    lieuMission: '',
    objetMission: '',
    intituleFormation: '',
    commentaire: '',
    heureArrivee: '',
    adminComment: '',
  });

  // Chargement des départements et des motifs
  useEffect(() => {
    getDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch((e) => console.error('Erreur chargement départements:', e));

    getLeaveReasons()
      .then((res: unknown) => {
        if (Array.isArray(res)) {
          setLeaveReasons(res);
        } else if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: LeaveReason[] }).data)) {
          setLeaveReasons((res as { data: LeaveReason[] }).data);
        }
      })
      .catch((e) => console.error('Erreur chargement motifs:', e));
  }, []);

  // Chargement des déclarations
  const fetchDeclarations = useCallback(async () => {
    try {
      setLoading(true);
      const filters: DeclarationFilters = {
        page,
        limit,
      };
      if (statusFilter !== 'all') {
        filters.validationStatus = statusFilter;
      } else {
        filters.validationStatus = 'all';
      }
      if (departmentFilter && departmentFilter !== 'all') {
        filters.departmentId = departmentFilter;
      }
      if (dateFilter) {
        filters.date = dateFilter;
      }

      const res = await getAllDeclarations(filters);
      if (res.success && Array.isArray(res.data)) {
        setDeclarations(res.data);
        const totalCount = res.total ?? res.pagination?.total ?? res.data.length;
        const pagesCount = res.totalPages ?? res.pagination?.totalPages ?? Math.ceil(totalCount / limit);
        setTotal(totalCount);
        setTotalPages(pagesCount);
      } else {
        setDeclarations([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (error: unknown) {
      console.error('Erreur récupération déclarations:', error);
      toast.error(getErrorMessage(error, 'تعذر تحميل قائمة التصاريح'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, dateFilter, page]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  // Statistiques KPI
  const kpis = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    declarations.forEach((d) => {
      if (d.validationStatus === 'en_attente') pending++;
      else if (d.validationStatus === 'approuvee' || d.validationStatus === 'modifiee') approved++;
      else if (d.validationStatus === 'rejetee') rejected++;
    });

    return { pending, approved, rejected, total: declarations.length };
  }, [declarations]);

  // Filtrage textuel local
  const filteredDeclarations = useMemo(() => {
    if (!searchQuery.trim()) return declarations;
    const query = searchQuery.toLowerCase().trim();

    return declarations.filter((d) => {
      const pers = typeof d.personnelId === 'object' && d.personnelId !== null ? d.personnelId : null;
      const nom = pers ? `${pers.nom || ''} ${pers.prenom || ''}`.toLowerCase() : '';
      const matricule = pers?.matricule ? pers.matricule.toLowerCase() : '';
      const motif = (d.motif || '').toLowerCase();
      const service = (d.detailsMotif?.nomService || '').toLowerCase();

      return nom.includes(query) || matricule.includes(query) || motif.includes(query) || service.includes(query);
    });
  }, [declarations, searchQuery]);

  // Action : Ouvrir confirmation d'approbation
  const handleOpenApprove = (decl: AttendanceDeclaration) => {
    setActiveDeclaration(decl);
    setAdminComment('');
    setReviewModalOpen(true);
  };

  // Confirmer Approbation
  const handleConfirmApprove = async () => {
    if (!activeDeclaration) return;
    try {
      setIsProcessing(true);
      await approveDeclaration(activeDeclaration._id, {
        adminComment: adminComment.trim() || undefined,
      });
      toast.success('تم قبول التصريح واعتماد الحضور في السجل بنجاح');
      setReviewModalOpen(false);
      fetchDeclarations();
    } catch (error: unknown) {
      console.error('Erreur approbation:', error);
      toast.error(getErrorMessage(error, 'فشلت عملية اعتماد التصريح'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Action : Ouvrir modal de rejet
  const handleOpenReject = (decl: AttendanceDeclaration) => {
    setActiveDeclaration(decl);
    setRejectionReason('');
    setAdminComment('');
    setRejectModalOpen(true);
  };

  // Confirmer Rejet
  const handleConfirmReject = async () => {
    if (!activeDeclaration) return;
    if (!rejectionReason.trim()) {
      toast.error('يرجى تحديد سبب الرفض لتوضيحه للموظف');
      return;
    }
    try {
      setIsProcessing(true);
      await rejectDeclaration(activeDeclaration._id, rejectionReason.trim(), adminComment.trim() || undefined);
      toast.success('تم رفض التصريح وإشعار صاحب الطلب');
      setRejectModalOpen(false);
      fetchDeclarations();
    } catch (error: unknown) {
      console.error('Erreur rejet:', error);
      toast.error(getErrorMessage(error, 'فشلت عملية رفض التصريح'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Action : Ouvrir modal d'édition
  const handleOpenEdit = (decl: AttendanceDeclaration) => {
    setActiveDeclaration(decl);
    setEditForm({
      statut: decl.statut,
      motif: decl.motif || '',
      nomService: decl.detailsMotif?.nomService || '',
      lieuMission: decl.detailsMotif?.lieuMission || '',
      objetMission: decl.detailsMotif?.objetMission || '',
      intituleFormation: decl.detailsMotif?.intituleFormation || '',
      commentaire: decl.detailsMotif?.commentaire || '',
      heureArrivee: decl.heureArrivee || '',
      adminComment: decl.adminComment || '',
    });
    setEditModalOpen(true);
  };

  // Confirmer Édition
  const handleConfirmEdit = async () => {
    if (!activeDeclaration) return;
    try {
      setIsProcessing(true);
      await updateDeclaration(activeDeclaration._id, {
        statut: editForm.statut,
        motif: editForm.statut === 'absent' ? editForm.motif : '',
        detailsMotif: {
          nomService: editForm.nomService,
          lieuMission: editForm.lieuMission,
          objetMission: editForm.objetMission,
          intituleFormation: editForm.intituleFormation,
          commentaire: editForm.commentaire,
        },
        heureArrivee: editForm.statut === 'present' ? editForm.heureArrivee : '',
        adminComment: editForm.adminComment,
      });
      toast.success('تم تحديث بيانات التصريح بنجاح');
      setEditModalOpen(false);
      fetchDeclarations();
    } catch (error: unknown) {
      console.error('Erreur modification:', error);
      toast.error(getErrorMessage(error, 'فشلت عملية تعديل التصريح'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper pour afficher le badge de statut
  const renderStatusBadge = (status: AttendanceDeclaration['validationStatus']) => {
    switch (status) {
      case 'en_attente':
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800 font-medium px-2.5 py-0.5 gap-1">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            قيد المراجعة
          </Badge>
        );
      case 'approuvee':
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 font-medium px-2.5 py-0.5 gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            مقبول ومعتمد
          </Badge>
        );
      case 'rejetee':
        return (
          <Badge className="bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-300 dark:border-red-800 font-medium px-2.5 py-0.5 gap-1">
            <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
            مرفوض
          </Badge>
        );
      case 'modifiee':
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 border border-blue-300 dark:border-blue-800 font-medium px-2.5 py-0.5 gap-1">
            <Edit3 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            تم التعديل
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper pour le libellé du motif
  const getMotifLabel = (decl: AttendanceDeclaration) => {
    if (decl.statut === 'present') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
          <UserCheck className="w-3.5 h-3.5" />
          حاضر {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
        </span>
      );
    }
    const lrId = typeof decl.leaveReasonId === 'object' && decl.leaveReasonId !== null ? (decl.leaveReasonId as LeaveReason)._id : decl.leaveReasonId;
    const found = leaveReasons.find((r) => r.code === decl.motif || r._id === lrId);
    return (
      <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-medium">
        <UserX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        {found ? found.labelAr : decl.motif || 'غياب مبرر'}
      </span>
    );
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-start" dir={dir}>
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2c5282]/10 dark:bg-sky-900/40 rounded-lg text-[#2c5282] dark:text-sky-300">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span>الإعلانات والتصاريح في انتظار الموافقة</span>
                {kpis.pending > 0 && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                    {kpis.pending} معلقة
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                مراجعة تصاريح الحضور والغياب والمأموريات المقدمة مسبقاً من طرف الموظفين واعتمادها في السجل اليومي.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchDeclarations}
            disabled={loading}
            className="h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* 3 Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 : En attente */}
        <div
          onClick={() => {
            setStatusFilter('en_attente');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-lg border border-t-2 border-t-amber-500 dark:border-t-amber-400 shadow-sm transition-all ${
            statusFilter === 'en_attente'
              ? 'bg-amber-50/80 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/50 dark:ring-amber-600/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">قيد المراجعة (معلقة)</span>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">{kpis.pending}</span>
            <span className="text-xs text-amber-700 dark:text-amber-400">تتطلب اتخاذ قرار</span>
          </div>
        </div>

        {/* KPI 2 : Approuvées */}
        <div
          onClick={() => {
            setStatusFilter('approuvee');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-lg border border-t-2 border-t-emerald-500 dark:border-t-emerald-400 shadow-sm transition-all ${
            statusFilter === 'approuvee'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-400/50 dark:ring-emerald-600/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">المقبولة والمعتمدة</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">{kpis.approved}</span>
            <span className="text-xs text-emerald-700 dark:text-emerald-400">تم ترحيلها للسجل</span>
          </div>
        </div>

        {/* KPI 3 : Rejetées */}
        <div
          onClick={() => {
            setStatusFilter('rejetee');
            setPage(1);
          }}
          className={`cursor-pointer p-4 rounded-lg border border-t-2 border-t-red-500 dark:border-t-red-400 shadow-sm transition-all ${
            statusFilter === 'rejetee'
              ? 'bg-red-50/80 dark:bg-red-950/35 border-red-300 dark:border-red-700 ring-2 ring-red-400/50 dark:ring-red-600/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800 dark:text-red-300">المرفوضة</span>
            <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-700 dark:text-red-300">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-900 dark:text-red-200 tabular-nums">{kpis.rejected}</span>
            <span className="text-xs text-red-700 dark:text-red-400">تم إشعار أصحابها</span>
          </div>
        </div>
      </div>

      {/* Barre des filtres */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم الوظيفي..."
              className="h-10 ps-9 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg text-sm"
            />
          </div>

          {/* Filtre Statut */}
          <div>
            <Select
              value={statusFilter}
              onValueChange={(val: 'all' | 'en_attente' | 'approuvee' | 'rejetee' | 'modifiee') => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg text-sm">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">كل الحالات ({total || declarations.length})</SelectItem>
                <SelectItem value="en_attente">قيد المراجعة فقط</SelectItem>
                <SelectItem value="approuvee">المقبولة</SelectItem>
                <SelectItem value="rejetee">المرفوضة</SelectItem>
                <SelectItem value="modifiee">المعدلة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Département */}
          <div>
            <Select
              value={departmentFilter}
              onValueChange={(val) => {
                setDepartmentFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg text-sm">
                <SelectValue placeholder="كل الأقسام / المصالح" />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">كل الأقسام والمصالح</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Date */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 rounded-lg text-sm tabular-nums"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter('');
                  setPage(1);
                }}
                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
                aria-label={t('attendance.declarations.clearDateAria')}
                title={t('attendance.declarations.clearDateAria')}
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau des déclarations */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : filteredDeclarations.length === 0 ? (
          <EmptyState
            className="border-0 rounded-none py-14"
            icon={<ClipboardList className="w-6 h-6" />}
            title="لا توجد تصاريح مطابقة للشروط"
            description="لم يقم أي موظف بتقديم تصريح في هذه الفترة أو تم البت في جميع الطلبات المقدمة مسبقاً."
          />
        ) : (
          <div className="overflow-x-auto max-h-[68vh]">
            <table className="w-full text-start text-sm border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">الموظف</th>
                  <th className="py-3 px-4 whitespace-nowrap">التاريخ المعني</th>
                  <th className="py-3 px-4 whitespace-nowrap">الحالة</th>
                  <th className="py-3 px-4 whitespace-nowrap">نوع التصريح / السبب</th>
                  <th className="py-3 px-4 whitespace-nowrap">التفاصيل والملاحظات</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {filteredDeclarations.map((decl) => {
                  const pers = typeof decl.personnelId === 'object' && decl.personnelId !== null ? decl.personnelId : null;
                  const dept = typeof decl.departmentId === 'object' && decl.departmentId !== null ? decl.departmentId : null;
                  const formattedDate = formatDateWithWeekday(decl.date, isRTL ? 'ar' : 'fr');

                  return (
                    <tr key={decl._id} className="group hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors">
                      {/* الموظف */}
                      <td className="py-3 px-4 sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/95 transition-colors">
                        <div className="flex items-center gap-3">
                          <PersonnelAvatar
                            photo={pers?.photo}
                            nom={pers?.nom}
                            prenom={pers?.prenom}
                            size="sm"
                            className="h-9 w-9"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {pers ? `${pers.nom} ${pers.prenom}` : 'موظف غير معرف'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              {pers?.matricule && <span className="tabular-nums">{pers.matricule}</span>}
                              {dept?.name && <span>• {dept.name}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* التاريخ */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                          <Calendar className="w-3.5 h-3.5 text-[#2c5282] dark:text-sky-400" />
                          <bdi dir={isRTL ? 'rtl' : 'ltr'} className="tabular-nums">{formattedDate}</bdi>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          قُدم: <bdi dir="ltr" className="tabular-nums">{formatShortDate(decl.createdAt)}</bdi>
                        </span>
                      </td>

                      {/* الحالة */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(decl.validationStatus)}
                      </td>

                      {/* نوع التصريح / السبب */}
                      <td className="py-3 px-4">
                        {getMotifLabel(decl)}
                      </td>

                      {/* التفاصيل والملاحظات */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-1 text-xs">
                          {decl.detailsMotif?.nomService && (
                            <div className="text-slate-700 dark:text-slate-300 font-medium">
                              المصلحة: {decl.detailsMotif.nomService}
                            </div>
                          )}
                          {decl.detailsMotif?.lieuMission && (
                            <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {decl.detailsMotif.lieuMission} {decl.detailsMotif.objetMission ? `(${decl.detailsMotif.objetMission})` : ''}
                            </div>
                          )}
                          {decl.detailsMotif?.intituleFormation && (
                            <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                              {decl.detailsMotif.intituleFormation}
                            </div>
                          )}
                          {decl.detailsMotif?.commentaire && (
                            <p className="text-slate-500 dark:text-slate-400 italic truncate" title={decl.detailsMotif.commentaire}>
                              "{decl.detailsMotif.commentaire}"
                            </p>
                          )}
                          {decl.rejectionReason && (
                            <p className="text-red-600 dark:text-red-400 text-[11px] font-semibold">
                              سبب الرفض: {decl.rejectionReason}
                            </p>
                          )}
                          {decl.adminComment && (
                            <p className="text-blue-600 dark:text-sky-400 text-[11px]">
                              ملاحظة الإدارة: {decl.adminComment}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* الإجراءات */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {decl.validationStatus === 'en_attente' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprove(decl)}
                                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 rounded-lg shadow-sm"
                                title="موافقة واعتماد"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>اعتماد</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(decl)}
                                className="h-9 px-3 border-red-200 dark:border-red-800/80 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs gap-1 rounded-lg"
                                title="رفض التصريح"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(decl)}
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/40 rounded-lg"
                                title={t('attendance.declarations.editAria')}
                                aria-label={t('attendance.declarations.editAria')}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(decl)}
                              className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs gap-1 rounded-lg"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>مراجعة / تعديل</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
              عرض <strong>{declarations.length}</strong> من أصل <strong>{total}</strong> تصريح — صفحة{' '}
              <strong>{page}</strong> من <strong>{Math.max(totalPages, 1)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1"
              >
                <PrevIcon className="w-4 h-4" />
                <span>السابق</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1))}
                disabled={page >= totalPages || loading}
                className="h-9 px-3 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1"
              >
                <span>التالي</span>
                <NextIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'approbation avec commentaire optionnel */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent dir={dir} className="sm:max-w-[460px] text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              تأكيد اعتماد التصريح وترحيله للسجل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              عند التأكيد، سيتم ترحيل هذه الوضعية مباشرة إلى سجل الحضور اليومي للمؤسسة ليوم{' '}
              <strong className="text-slate-900 dark:text-slate-100 tabular-nums">
                {activeDeclaration && (
                  <bdi dir="ltr" className="tabular-nums">{formatShortDate(activeDeclaration.date)}</bdi>
                )}
              </strong>
              .
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ملاحظة الإدارة (اختياري)
              </Label>
              <Textarea
                rows={2}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="أية ملاحظة تود توثيقها في سجل المراجعة..."
                className="text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={isProcessing}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              تراجع
            </Button>
            <Button
              type="button"
              onClick={handleConfirmApprove}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              تأكيد القبول والاعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Rejet avec motif obligatoire */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent dir={dir} className="sm:max-w-[460px] text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              رفض تصريح الحضور / الغياب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              يرجى إدخال سبب الرفض ليتمكن الموظف من الاطلاع عليه وتصحيح وضعيته إذا لزم الأمر:
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                سبب الرفض <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: تعارض مع مأمورية سابقة، عدم تقديم إذن مسبق، ضرورة الحضور للاجتماع..."
                className="text-sm border-red-200 dark:border-red-800 focus:border-red-500 bg-white dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ملاحظة داخلية إضافية (اختياري)</Label>
              <Input
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="ملاحظة للإدارة..."
                className="h-10 text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isProcessing}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReject}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal d'Édition Admin */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent dir={dir} className="sm:max-w-[520px] text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#2c5282] dark:text-sky-400" />
              تعديل بيانات التصريح (إدارة الموارد البشرية)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">الوضعية</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={(val: 'present' | 'absent') => setEditForm((prev) => ({ ...prev, statut: val }))}
                >
                  <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
                    <SelectItem value="present">حاضر</SelectItem>
                    <SelectItem value="absent">غائب / مصلحة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.statut === 'present' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ساعة الحضور</Label>
                  <Input
                    type="time"
                    value={editForm.heureArrivee}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, heureArrivee: e.target.value }))}
                    className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">سبب الغياب</Label>
                  <Select
                    value={editForm.motif}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, motif: val }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100">
                      <SelectValue placeholder="اختر السبب" />
                    </SelectTrigger>
                    <SelectContent dir={dir}>
                      {leaveReasons.map((r) => (
                        <SelectItem key={r._id} value={r.code}>
                          {r.labelAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {editForm.statut === 'absent' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">اسم المصلحة / الإدارة</Label>
                  <Input
                    value={editForm.nomService}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nomService: e.target.value }))}
                    placeholder="اسم المصلحة المستقبلة..."
                    className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">مكان المأمورية</Label>
                    <Input
                      value={editForm.lieuMission}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, lieuMission: e.target.value }))}
                      className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">موضوع المأمورية</Label>
                    <Input
                      value={editForm.objetMission}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, objetMission: e.target.value }))}
                      className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ملاحظة التعديل للملف</Label>
              <Textarea
                rows={2}
                value={editForm.adminComment}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminComment: e.target.value }))}
                placeholder="سبب التعديل من طرف الإدارة..."
                className="text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isProcessing}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEdit}
              disabled={isProcessing}
              className="bg-[#2c5282] hover:bg-[#1a365d] dark:bg-sky-700 dark:hover:bg-sky-600 text-white font-medium"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceDeclarationsPage;
