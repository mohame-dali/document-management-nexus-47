import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LeaveReason,
  getLeaveReasons,
  toggleLeaveReasonStatus,
  deleteLeaveReason,
} from '@/services/leaveReasonService';
import { LeaveReasonFormDialog } from '@/components/attendance/LeaveReasonFormDialog';
import { LeaveReasonsList } from '@/components/attendance/LeaveReasonsList';
import { toast } from 'sonner';
import { useDirection } from '@/i18n/useDirection';
import {
  Plus,
  Search,
  RotateCcw,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export const LeaveReasonsManagementPage: React.FC = () => {
  const { dir, isRTL } = useDirection();
  const [reasons, setReasons] = useState<LeaveReason[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<LeaveReason | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<LeaveReason | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReasons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLeaveReasons();
      setReasons(data);
    } catch (_err: unknown) {
      toast.error(isRTL ? 'حدث خطأ أثناء تحميل أنواع الغياب' : "Erreur lors du chargement des types d'absence");
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  const filteredReasons = useMemo(() => {
    return reasons.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesLabelAr = item.labelAr.toLowerCase().includes(q);
        const matchesLabelFr = item.labelFr ? item.labelFr.toLowerCase().includes(q) : false;
        if (!matchesCode && !matchesLabelAr && !matchesLabelFr) return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;
      if (impactFilter === 'deductible' && !item.impacteSolde) return false;
      if (impactFilter === 'non_deductible' && item.impacteSolde) return false;
      return true;
    });
  }, [reasons, searchQuery, categoryFilter, statusFilter, impactFilter]);

  const totalPages = Math.ceil(filteredReasons.length / pageSize) || 1;
  const paginatedReasons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReasons.slice(start, start + pageSize);
  }, [filteredReasons, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, impactFilter]);

  const stats = useMemo(() => {
    const total = reasons.length;
    const active = reasons.filter((r) => r.isActive).length;
    const inactive = reasons.filter((r) => !r.isActive).length;
    const deducts = reasons.filter((r) => r.impacteSolde).length;
    return { total, active, inactive, deducts };
  }, [reasons]);

  const handleOpenCreate = () => {
    setSelectedReason(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (reason: LeaveReason) => {
    setSelectedReason(reason);
    setFormDialogOpen(true);
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleLeaveReasonStatus(id);
      setReasons((prev) => prev.map((r) => (r._id === id ? { ...r, isActive: updated.isActive } : r)));
      toast.success(
        updated.isActive
          ? isRTL
            ? 'تم تفعيل نوع الغياب بنجاح'
            : "Type d'absence activé"
          : isRTL
          ? 'تم تعطيل نوع الغياب بنجاح'
          : "Type d'absence désactivé"
      );
    } catch (_err: unknown) {
      toast.error(isRTL ? 'تعذر تغيير حالة نوع الغياب' : 'Impossible de modifier le statut');
    }
  };

  const handleConfirmDelete = (reason: LeaveReason) => {
    if (reason.isSystem) {
      toast.error(isRTL ? 'الأنواع النظامية الأساسية محمية ولا يمكن حذفها' : 'Les types système ne peuvent pas être supprimés');
      return;
    }
    setReasonToDelete(reason);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!reasonToDelete) return;
    try {
      setDeleting(true);
      await deleteLeaveReason(reasonToDelete._id);
      toast.success(isRTL ? 'تم حذف نوع الغياب بنجاح' : "Type d'absence supprimé");
      setReasons((prev) => prev.filter((r) => r._id !== reasonToDelete._id));
      setDeleteDialogOpen(false);
      setReasonToDelete(null);
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errResp?.response?.data?.message ||
        errResp?.message ||
        (isRTL ? 'حدث خطأ أثناء محاولة الحذف' : 'Erreur lors de la suppression');
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setImpactFilter('all');
  };

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-3.5 text-start" dir={dir}>
      {/* Compact Single-Row KPI Strip + Back & Add Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
            <CalendarDays className="h-4 w-4 text-[#2c5282] dark:text-sky-400 shrink-0" />
            <span>{isRTL ? 'إدارة أنواع الغياب' : "Types d'absence"}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>
            {isRTL ? 'الإجمالي:' : 'Total :'}{' '}
            <strong className="font-bold text-slate-900 dark:text-slate-100">{stats.total}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>
            {isRTL ? 'مفعلة:' : 'Actifs :'}{' '}
            <strong className="font-bold text-emerald-700 dark:text-emerald-400">{stats.active}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>
            {isRTL ? 'معطلة:' : 'Inactifs :'}{' '}
            <strong className="font-bold text-slate-600 dark:text-slate-300">{stats.inactive}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>
            {isRTL ? 'تخصم من الرصيد:' : 'Déductibles :'}{' '}
            <strong className="font-bold text-amber-700 dark:text-amber-400">{stats.deducts}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium gap-1.5 whitespace-nowrap shrink-0"
          >
            <Link to="/dashboard/hr/all-personnel-situation">
              <BackIcon className="h-3.5 w-3.5" />
              <span>{isRTL ? 'وضعية الموظفين' : 'Situation globale'}</span>
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 bg-[#2c5282] hover:bg-[#2a4365] dark:bg-sky-700 dark:hover:bg-sky-600 text-white rounded-lg text-xs font-bold gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{isRTL ? 'إضافة نوع غياب' : 'Nouveau type'}</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 text-slate-700 dark:text-slate-300 absolute start-3 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'البحث بالرمز أو الاسم...' : 'Rechercher par code ou libellé...'}
              className="ps-9 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg text-start text-xs h-9"
            />
          </div>

          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg text-start h-9 text-xs">
                <SelectValue placeholder={isRTL ? 'كل التصنيفات' : 'Toutes catégories'} />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">{isRTL ? 'كل التصنيفات' : 'Toutes catégories'}</SelectItem>
                <SelectItem value="conge">{isRTL ? 'عطلة' : 'Congé'}</SelectItem>
                <SelectItem value="mission">{isRTL ? 'مهمة' : 'Mission'}</SelectItem>
                <SelectItem value="formation">{isRTL ? 'تكوين' : 'Formation'}</SelectItem>
                <SelectItem value="service">{isRTL ? 'خدمة' : 'Service'}</SelectItem>
                <SelectItem value="autre">{isRTL ? 'أخرى' : 'Autre'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg text-start h-9 text-xs">
                <SelectValue placeholder={isRTL ? 'كل الحالات' : 'Tous les statuts'} />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">{isRTL ? 'كل الحالات' : 'Tous les statuts'}</SelectItem>
                <SelectItem value="active">{isRTL ? 'مفعل فقط' : 'Actifs'}</SelectItem>
                <SelectItem value="inactive">{isRTL ? 'معطل فقط' : 'Inactifs'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg text-start h-9 text-xs flex-1">
                <SelectValue placeholder={isRTL ? 'خصم الرصيد' : 'Impact solde'} />
              </SelectTrigger>
              <SelectContent dir={dir}>
                <SelectItem value="all">{isRTL ? 'الكل (خصم الرصيد)' : 'Tous'}</SelectItem>
                <SelectItem value="deductible">{isRTL ? 'يخصم من الرصيد' : 'Déductible'}</SelectItem>
                <SelectItem value="non_deductible">{isRTL ? 'لا يخصم' : 'Non déductible'}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              title={isRTL ? 'إعادة تعيين الفلاتر' : 'Réinitialiser'}
              aria-label={isRTL ? 'إعادة تعيين الفلاتر' : 'Réinitialiser'}
              className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <LeaveReasonsList
        reasons={paginatedReasons}
        loading={loading}
        onEdit={handleOpenEdit}
        onToggle={handleToggle}
        onDelete={handleConfirmDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 text-xs shadow-xs">
          <span className="text-slate-700 dark:text-slate-300 tabular-nums">
            {isRTL
              ? `عرض ${paginatedReasons.length} من أصل ${filteredReasons.length} نوع`
              : `${paginatedReasons.length} sur ${filteredReasons.length}`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg h-9 px-3 gap-1"
            >
              <PrevIcon className="w-4 h-4" />
              <span>{isRTL ? 'السابق' : 'Précédent'}</span>
            </Button>

            <span className="text-slate-900 dark:text-slate-100 font-semibold px-2 tabular-nums">
              {isRTL ? `الصفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} / ${totalPages}`}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg h-9 px-3 gap-1"
            >
              <span>{isRTL ? 'التالي' : 'Suivant'}</span>
              <NextIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <LeaveReasonFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        reason={selectedReason}
        onSuccess={fetchReasons}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-start" dir={dir}>
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100 font-bold">
              {isRTL ? 'تأكيد حذف نوع الغياب' : "Confirmer la suppression"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 pt-2">
              {isRTL ? (
                <>
                  هل أنت متأكد من رغبتك في حذف نوع الغياب{' '}
                  <strong className="text-slate-900 dark:text-slate-100">"{reasonToDelete?.labelAr}"</strong> ({reasonToDelete?.code})؟
                  <br />
                  هذا الإجراء لا يمكن التراجع عنه إذا لم يكن النوع مرتبطاً بأي سجلات.
                </>
              ) : (
                <>
                  Voulez-vous vraiment supprimer{' '}
                  <strong className="text-slate-900 dark:text-slate-100">"{reasonToDelete?.labelFr || reasonToDelete?.labelAr}"</strong> ({reasonToDelete?.code}) ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 justify-end">
            <AlertDialogCancel
              disabled={deleting}
              className="border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 rounded-lg"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              {deleting ? (isRTL ? 'جاري الحذف...' : 'Suppression...') : isRTL ? 'نعم، حذف النوع' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveReasonsManagementPage;
