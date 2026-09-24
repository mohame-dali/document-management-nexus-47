import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Filter,
  RotateCcw,
  Calendar,
  Building,
  UserCheck,
  UserX,
  AlertCircle,
  FileText,
  Loader2,
  MessageSquare,
  MapPin,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message || fallback;
  }
  return fallback;
};

export const AttendanceDeclarationsPage: React.FC = () => {
  const { user } = useAuth();

  // Liste des déclarations & chargement
  const [declarations, setDeclarations] = useState<AttendanceDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

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
      const filters: DeclarationFilters = {};
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
      } else {
        setDeclarations([]);
      }
    } catch (error: unknown) {
      console.error('Erreur récupération déclarations:', error);
      toast.error(getErrorMessage(error, 'تعذر تحميل قائمة التصاريح'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, dateFilter]);

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
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-300 font-medium px-2.5 py-0.5 gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            قيد المراجعة
          </Badge>
        );
      case 'approuvee':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-medium px-2.5 py-0.5 gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            مقبول ومعتمد
          </Badge>
        );
      case 'rejetee':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-300 font-medium px-2.5 py-0.5 gap-1">
            <XCircle className="w-3 h-3 text-red-600" />
            مرفوض
          </Badge>
        );
      case 'modifiee':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300 font-medium px-2.5 py-0.5 gap-1">
            <Edit3 className="w-3 h-3 text-blue-600" />
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
        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
          <UserCheck className="w-3.5 h-3.5" />
          حاضر {decl.heureArrivee ? `(${decl.heureArrivee})` : ''}
        </span>
      );
    }
    const lrId = typeof decl.leaveReasonId === 'object' && decl.leaveReasonId !== null ? (decl.leaveReasonId as LeaveReason)._id : decl.leaveReasonId;
    const found = leaveReasons.find((r) => r.code === decl.motif || r._id === lrId);
    return (
      <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
        <UserX className="w-3.5 h-3.5 text-amber-600" />
        {found ? found.labelAr : decl.motif || 'غياب مبرر'}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2c5282]/10 rounded-lg text-[#2c5282]">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                الإعلانات والتصاريح في انتظار الموافقة
                {kpis.pending > 0 && (
                  <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {kpis.pending} معلقة
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
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
            className="h-10 border-[#e2e8f0] text-gray-700 hover:bg-gray-100 gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* 3 Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1 : En attente */}
        <div
          onClick={() => setStatusFilter('en_attente')}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            statusFilter === 'en_attente'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/50 shadow-sm'
              : 'bg-white border-[#e2e8f0] hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">قيد المراجعة (معلقة)</span>
            <div className="p-2 bg-amber-100 rounded-md text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-900">{kpis.pending}</span>
            <span className="text-xs text-amber-700">تتطلب اتخاذ قرار</span>
          </div>
        </div>

        {/* KPI 2 : Approuvées */}
        <div
          onClick={() => setStatusFilter('approuvee')}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            statusFilter === 'approuvee'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/50 shadow-sm'
              : 'bg-white border-[#e2e8f0] hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">المقبولة والمعتمدة</span>
            <div className="p-2 bg-emerald-100 rounded-md text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-900">{kpis.approved}</span>
            <span className="text-xs text-emerald-700">تم ترحيلها للسجل</span>
          </div>
        </div>

        {/* KPI 3 : Rejetées */}
        <div
          onClick={() => setStatusFilter('rejetee')}
          className={`cursor-pointer p-4 rounded-lg border transition-all ${
            statusFilter === 'rejetee'
              ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/50 shadow-sm'
              : 'bg-white border-[#e2e8f0] hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800">المرفوضة</span>
            <div className="p-2 bg-red-100 rounded-md text-red-700">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-900">{kpis.rejected}</span>
            <span className="text-xs text-red-700">تم إشعار أصحابها</span>
          </div>
        </div>
      </div>

      {/* Barre des filtres */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم الوظيفي..."
              className="h-10 pr-9 border-[#e2e8f0] text-sm"
            />
          </div>

          {/* Filtre Statut */}
          <div>
            <Select
              value={statusFilter}
              onValueChange={(val: 'all' | 'en_attente' | 'approuvee' | 'rejetee' | 'modifiee') => setStatusFilter(val)}
            >
              <SelectTrigger className="h-10 border-[#e2e8f0] bg-white text-sm">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الحالات ({declarations.length})</SelectItem>
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
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger className="h-10 border-[#e2e8f0] bg-white text-sm">
                <SelectValue placeholder="كل الأقسام / المصالح" />
              </SelectTrigger>
              <SelectContent dir="rtl">
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
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 border-[#e2e8f0] text-sm"
            />
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateFilter('')}
                className="h-10 px-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau des déclarations */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2c5282]" />
            <p className="text-sm">جاري تحميل التصاريح...</p>
          </div>
        ) : filteredDeclarations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-gray-700">لا توجد تصاريح مطابقة للشروط</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              لم يقم أي موظف بتقديم تصريح في هذه الفترة أو تم البت في جميع الطلبات المقدمة مسبقاً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 border-b border-[#e2e8f0] text-xs font-bold text-gray-600">
                <tr>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">التاريخ المعني</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">نوع التصريح / السبب</th>
                  <th className="py-3 px-4">التفاصيل والملاحظات</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {filteredDeclarations.map((decl) => {
                  const pers = typeof decl.personnelId === 'object' && decl.personnelId !== null ? decl.personnelId : null;
                  const dept = typeof decl.departmentId === 'object' && decl.departmentId !== null ? decl.departmentId : null;
                  const formattedDate = new Date(decl.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={decl._id} className="hover:bg-gray-50/80 transition-colors">
                      {/* الموظف */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-gray-200">
                            {pers?.photo && <AvatarImage src={pers.photo} />}
                            <AvatarFallback className="bg-[#2c5282] text-white font-bold text-xs">
                              {pers ? `${pers.nom?.[0] || ''}${pers.prenom?.[0] || ''}` : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {pers ? `${pers.nom} ${pers.prenom}` : 'موظف غير معرف'}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-2">
                              {pers?.matricule && <span>{pers.matricule}</span>}
                              {dept?.name && <span>• {dept.name}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* التاريخ */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#2c5282]" />
                          <span>{formattedDate}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          قُدم: {new Date(decl.createdAt || '').toLocaleDateString('fr-FR')}
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
                            <div className="text-gray-700 font-medium">
                              المصلحة: {decl.detailsMotif.nomService}
                            </div>
                          )}
                          {decl.detailsMotif?.lieuMission && (
                            <div className="text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {decl.detailsMotif.lieuMission} {decl.detailsMotif.objetMission ? `(${decl.detailsMotif.objetMission})` : ''}
                            </div>
                          )}
                          {decl.detailsMotif?.intituleFormation && (
                            <div className="text-gray-600 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-gray-400" />
                              {decl.detailsMotif.intituleFormation}
                            </div>
                          )}
                          {decl.detailsMotif?.commentaire && (
                            <p className="text-gray-500 italic truncate" title={decl.detailsMotif.commentaire}>
                              "{decl.detailsMotif.commentaire}"
                            </p>
                          )}
                          {decl.rejectionReason && (
                            <p className="text-red-600 text-[11px] font-semibold">
                              سبب الرفض: {decl.rejectionReason}
                            </p>
                          )}
                          {decl.adminComment && (
                            <p className="text-blue-600 text-[11px]">
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
                                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-sm"
                                title="موافقة واعتماد"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>اعتماد</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReject(decl)}
                                className="h-8 px-2.5 border-red-200 text-red-600 hover:bg-red-50 text-xs gap-1"
                                title="رفض التصريح"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(decl)}
                                className="h-8 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                title="تعديل"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(decl)}
                              className="h-8 px-2.5 border-[#e2e8f0] text-gray-600 hover:bg-gray-100 text-xs gap-1"
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
      </div>

      {/* Modal d'approbation avec commentaire optionnel */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[460px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              تأكيد اعتماد التصريح وترحيله للسجل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600 leading-relaxed">
              عند التأكيد، سيتم ترحيل هذه الوضعية مباشرة إلى سجل الحضور اليومي للمؤسسة ليوم{' '}
              <strong className="text-gray-900">
                {activeDeclaration && new Date(activeDeclaration.date).toLocaleDateString('fr-FR')}
              </strong>
              .
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                ملاحظة الإدارة (اختياري)
              </Label>
              <Textarea
                rows={2}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="أية ملاحظة تود توثيقها في سجل المراجعة..."
                className="text-sm border-[#e2e8f0]"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              disabled={isProcessing}
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
        <DialogContent className="sm:max-w-[460px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              رفض تصريح الحضور / الغياب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              يرجى إدخال سبب الرفض ليتمكن الموظف من الاطلاع عليه وتصحيح وضعيته إذا لزم الأمر:
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                سبب الرفض <span className="text-red-500">*</span>
              </Label>
              <Textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: تعارض مع مأمورية سابقة، عدم تقديم إذن مسبق، ضرورة الحضور للاجتماع..."
                className="text-sm border-red-200 focus:border-red-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">ملاحظة داخلية إضافية (اختياري)</Label>
              <Input
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="ملاحظة للإدارة..."
                className="h-10 text-sm border-[#e2e8f0]"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isProcessing}
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
        <DialogContent className="sm:max-w-[520px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#2c5282]" />
              تعديل بيانات التصريح (إدارة الموارد البشرية)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">الوضعية</Label>
                <Select
                  value={editForm.statut}
                  onValueChange={(val: 'present' | 'absent') => setEditForm((prev) => ({ ...prev, statut: val }))}
                >
                  <SelectTrigger className="h-10 border-[#e2e8f0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="present">حاضر</SelectItem>
                    <SelectItem value="absent">غائب / مصلحة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.statut === 'present' ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">ساعة الحضور</Label>
                  <Input
                    type="time"
                    value={editForm.heureArrivee}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, heureArrivee: e.target.value }))}
                    className="h-10 border-[#e2e8f0]"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">سبب الغياب</Label>
                  <Select
                    value={editForm.motif}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, motif: val }))}
                  >
                    <SelectTrigger className="h-10 border-[#e2e8f0]">
                      <SelectValue placeholder="اختر السبب" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
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
                  <Label className="text-xs font-semibold text-gray-700">اسم المصلحة / الإدارة</Label>
                  <Input
                    value={editForm.nomService}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nomService: e.target.value }))}
                    placeholder="اسم المصلحة المستقبلة..."
                    className="h-10 border-[#e2e8f0]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">مكان المأمورية</Label>
                    <Input
                      value={editForm.lieuMission}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, lieuMission: e.target.value }))}
                      className="h-10 border-[#e2e8f0]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">موضوع المأمورية</Label>
                    <Input
                      value={editForm.objetMission}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, objetMission: e.target.value }))}
                      className="h-10 border-[#e2e8f0]"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">ملاحظة التعديل للملف</Label>
              <Textarea
                rows={2}
                value={editForm.adminComment}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminComment: e.target.value }))}
                placeholder="سبب التعديل من طرف الإدارة..."
                className="text-sm border-[#e2e8f0]"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={isProcessing}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEdit}
              disabled={isProcessing}
              className="bg-[#2c5282] hover:bg-[#1a365d] text-white font-medium"
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
