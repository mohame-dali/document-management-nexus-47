import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Plus,
  Search,
  RotateCcw,
  Info,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Coins,
  ChevronRight,
  Home,
  ChevronLeft,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LeaveReasonsManagementPage: React.FC = () => {
  const [reasons, setReasons] = useState<LeaveReason[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<LeaveReason | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState<LeaveReason | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReasons = async () => {
    try {
      setLoading(true);
      const data = await getLeaveReasons();
      setReasons(data);
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل أنواع الغياب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  // Filtered list
  const filteredReasons = useMemo(() => {
    return reasons.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesLabelAr = item.labelAr.toLowerCase().includes(q);
        const matchesLabelFr = item.labelFr ? item.labelFr.toLowerCase().includes(q) : false;
        if (!matchesCode && !matchesLabelAr && !matchesLabelFr) {
          return false;
        }
      }

      // Category
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'active' && !item.isActive) return false;
      if (statusFilter === 'inactive' && item.isActive) return false;

      // Impact on balance
      if (impactFilter === 'deductible' && !item.impacteSolde) return false;
      if (impactFilter === 'non_deductible' && item.impacteSolde) return false;

      return true;
    });
  }, [reasons, searchQuery, categoryFilter, statusFilter, impactFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReasons.length / pageSize) || 1;
  const paginatedReasons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReasons.slice(start, start + pageSize);
  }, [filteredReasons, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, impactFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = reasons.length;
    const active = reasons.filter((r) => r.isActive).length;
    const inactive = reasons.filter((r) => !r.isActive).length;
    const deducts = reasons.filter((r) => r.impacteSolde).length;
    return { total, active, inactive, deducts };
  }, [reasons]);

  // Handlers
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
      setReasons((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isActive: updated.isActive } : r))
      );
      toast.success(
        updated.isActive
          ? 'تم تفعيل نوع الغياب بنجاح'
          : 'تم تعطيل نوع الغياب بنجاح'
      );
    } catch (err: any) {
      toast.error('تعذر تغيير حالة نوع الغياب');
    }
  };

  const handleConfirmDelete = (reason: LeaveReason) => {
    if (reason.isSystem) {
      toast.error('الأنواع النظامية الأساسية محمية ولا يمكن حذفها');
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
      toast.success('تم حذف نوع الغياب بنجاح');
      setReasons((prev) => prev.filter((r) => r._id !== reasonToDelete._id));
      setDeleteDialogOpen(false);
      setReasonToDelete(null);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'حدث خطأ أثناء محاولة الحذف';
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

  return (
    <div className="min-h-screen bg-[#f7fafc] p-6 space-y-6" dir="rtl">
      {/* 1. Breadcrumbs & Header */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            {/* Breadcrumb */}
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
              <span className="text-[#1a202c] font-semibold">أنواع الغياب</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#2c5282] text-white rounded">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#1a202c]">
                  إدارة أنواع وأسباب الغياب
                </h1>
                <p className="text-sm text-[#718096]">
                  تكوين أسباب الغياب والعطل، تحديد شروط الاستقطاع من الرصيد والوثائق المطلوبة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenCreate}
              className="bg-[#2c5282] hover:bg-[#2a4365] text-white rounded font-medium gap-2 h-10 px-4"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة نوع غياب جديد</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-amber-800 text-xs sm:text-sm flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">قواعد إدارة وحماية أنواع الغياب :</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700 text-xs">
            <li>الأنواع الـ 14 النظامية الأساسية محمية ولا يمكن حذفها نهائياً، بل يمكن تعديل بعض إعداداتها أو تعطيلها.</li>
            <li>الأنواع المرتبطة بسجلات حضور وغياب سابقة لا يمكن حذفها تجنباً لتلف البيانات التاريخية؛ يمكن تعطيلها لإخفائها من القوائم الجديدة.</li>
            <li>الأنواع الموسومة بـ "يخصم من الرصيد" تؤثر تلقائياً على رصيد الإجازات السنوية المتبقية للموظف.</li>
          </ul>
        </div>
      </div>

      {/* 3. KPI Cards (4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#718096]">إجمالي الأنواع</p>
            <p className="text-2xl font-bold text-[#1a202c] mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-50 text-[#2c5282] rounded">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        {/* Active */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#718096]">الأنواع المفعلة</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Inactive */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#718096]">الأنواع المعطلة</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{stats.inactive}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-500 rounded">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        {/* Deducts from balance */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#718096]">تخصم من الرصيد السنوي</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.deducts}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded">
            <Coins className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 4. Filters */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="h-4 w-4 text-gray-400 absolute right-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالرمز، الاسم بالعربية أو بالفرنسية..."
              className="pr-9 bg-white border-[#e2e8f0] rounded text-right text-sm h-10"
            />
          </div>

          {/* Category */}
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-white border-[#e2e8f0] rounded text-right h-10 text-xs">
                <SelectValue placeholder="كل التصنيفات" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل التصنيفات</SelectItem>
                <SelectItem value="conge">عطلة (Congé)</SelectItem>
                <SelectItem value="mission">مهمة (Mission)</SelectItem>
                <SelectItem value="formation">تكوين (Formation)</SelectItem>
                <SelectItem value="service">خدمة (Service)</SelectItem>
                <SelectItem value="autre">أخرى (Autre)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white border-[#e2e8f0] rounded text-right h-10 text-xs">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">مفعل فقط</SelectItem>
                <SelectItem value="inactive">معطل فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deductible */}
          <div className="flex gap-2">
            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="bg-white border-[#e2e8f0] rounded text-right h-10 text-xs flex-1">
                <SelectValue placeholder="خصم الرصيد" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">الكل (خصم الرصيد)</SelectItem>
                <SelectItem value="deductible">يخصم من الرصيد</SelectItem>
                <SelectItem value="non_deductible">لا يخصم</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              title="إعادة تعيين الفلاتر"
              className="h-10 px-3 border-[#e2e8f0] rounded text-[#718096] hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Table */}
      <LeaveReasonsList
        reasons={paginatedReasons}
        loading={loading}
        onEdit={handleOpenEdit}
        onToggle={handleToggle}
        onDelete={handleConfirmDelete}
      />

      {/* 6. Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-[#e2e8f0] rounded p-4 text-xs">
          <span className="text-[#718096]">
            عرض {paginatedReasons.length} من أصل {filteredReasons.length} نوع
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="border-[#e2e8f0] rounded h-8 px-3"
            >
              السابق
            </Button>

            <span className="text-[#1a202c] font-semibold px-2">
              الصفحة {currentPage} من {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="border-[#e2e8f0] rounded h-8 px-3"
            >
              التالي
            </Button>
          </div>
        </div>
      )}

      {/* 7. Create/Edit Dialog */}
      <LeaveReasonFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        reason={selectedReason}
        onSuccess={fetchReasons}
      />

      {/* 8. Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded border border-[#e2e8f0]" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-[#1a202c] font-bold">
              تأكيد حذف نوع الغياب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#4a5568] pt-2">
              هل أنت متأكد من رغبتك في حذف نوع الغياب{' '}
              <strong className="text-[#1a202c]">"{reasonToDelete?.labelAr}"</strong> ({reasonToDelete?.code})؟
              <br />
              هذا الإجراء لا يمكن التراجع عنه إذا لم يكن النوع مرتبطاً بأي سجلات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 justify-end">
            <AlertDialogCancel
              disabled={deleting}
              className="border-[#e2e8f0] rounded"
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded"
            >
              {deleting ? 'جاري الحذف...' : 'نعم، حذف النوع'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveReasonsManagementPage;
