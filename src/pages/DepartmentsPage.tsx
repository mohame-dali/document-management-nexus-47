import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getDepartments, 
  deleteDepartment, 
  toggleDepartmentStatus, 
  getDepartmentUsers 
} from '@/services/departmentService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Building, 
  Search, 
  Filter, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  CheckCircle2,
  XCircle,
  FolderTree,
  Calendar,
  Layers,
  MoreVertical,
  Award,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { Department, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getOrganizationSettings, setBureauDepartments, setRhDepartment } from '@/services/hr/personnelApi';

const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Dialog states
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartmentForView, setSelectedDepartmentForView] = useState<Department | null>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch Departments
  const { data: departments = [], isLoading, refetch } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Fetch Users for selected department modal
  const { data: departmentUsers = [], isLoading: isLoadingDeptUsers } = useQuery<User[]>({
    queryKey: ['departmentUsers', selectedDepartmentForView?._id],
    queryFn: () => (selectedDepartmentForView?._id ? getDepartmentUsers(selectedDepartmentForView._id) : Promise.resolve([])),
    enabled: !!selectedDepartmentForView?._id,
  });

  // LOT C: Fetch OrganizationSettings pour bureauDirecteurDepartmentId et bureauOrdreDepartmentId
  const { data: orgSettings, refetch: refetchOrgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 60000,
  });

  // Helpers pour extraire l'ID propre des départements transversaux
  const bureauDirecteurId = useMemo(() => {
    if (!orgSettings?.bureauDirecteurDepartmentId) return '';
    return typeof orgSettings.bureauDirecteurDepartmentId === 'object'
      ? String(orgSettings.bureauDirecteurDepartmentId._id || '')
      : String(orgSettings.bureauDirecteurDepartmentId);
  }, [orgSettings?.bureauDirecteurDepartmentId]);

  const bureauOrdreId = useMemo(() => {
    if (!orgSettings?.bureauOrdreDepartmentId) return '';
    return typeof orgSettings.bureauOrdreDepartmentId === 'object'
      ? String(orgSettings.bureauOrdreDepartmentId._id || '')
      : String(orgSettings.bureauOrdreDepartmentId);
  }, [orgSettings?.bureauOrdreDepartmentId]);

  // ID du département RH
  const rhDepartmentId = useMemo(() => {
    if (!orgSettings?.rhDepartmentId) return '';
    return typeof orgSettings.rhDepartmentId === 'object'
      ? String(orgSettings.rhDepartmentId._id || '')
      : String(orgSettings.rhDepartmentId);
  }, [orgSettings?.rhDepartmentId]);

  // LOT C: Mutation pour marquer/démarquer les départements transversaux
  const setBureauMutation = useMutation({
    mutationFn: setBureauDepartments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('تم تحديث إعدادات الوحدة الوظيفية بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error updating bureau departments:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message
        ? (error as { response?: { data?: { message?: string } } }).response!.data!.message
        : 'فشل في تحديث إعدادات الوحدة الوظيفية';
      toast.error(errorMsg);
    }
  });

  // Mutation pour marquer/démarquer le département RH
  const setRhMutation = useMutation({
    mutationFn: setRhDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('تم تحديث إعدادات قسم الموارد البشرية بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error updating RH department:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message
        ? (error as { response?: { data?: { message?: string } } }).response!.data!.message
        : 'فشل في تحديث إعدادات قسم الموارد البشرية';
      toast.error(errorMsg);
    }
  });

  const handleMarkAsBureauDirecteur = (deptId: string) => {
    // Si déjà ce département, démarquer (null), sinon l'assigner (l'ancien est automatiquement remplacé)
    const newId = bureauDirecteurId === deptId ? null : deptId;
    setBureauMutation.mutate({ bureauDirecteurDepartmentId: newId });
  };

  const handleMarkAsBureauOrdre = (deptId: string) => {
    // Si déjà ce département, démarquer (null), sinon l'assigner (l'ancien est automatiquement remplacé)
    const newId = bureauOrdreId === deptId ? null : deptId;
    setBureauMutation.mutate({ bureauOrdreDepartmentId: newId });
  };

  const handleMarkAsRh = (deptId: string) => {
    // Si déjà ce département, démarquer (null), sinon l'assigner (l'ancien est automatiquement remplacé)
    const newId = rhDepartmentId === deptId ? null : deptId;
    setRhMutation.mutate({ rhDepartmentId: newId });
  };

  const handleUnmarkBureau = (deptId: string) => {
    const payload: { bureauDirecteurDepartmentId?: string | null; bureauOrdreDepartmentId?: string | null } = {};
    if (bureauDirecteurId === deptId) {
      payload.bureauDirecteurDepartmentId = null;
    }
    if (bureauOrdreId === deptId) {
      payload.bureauOrdreDepartmentId = null;
    }
    if (Object.keys(payload).length > 0) {
      setBureauMutation.mutate(payload);
    }
  };

  const handleUnmark = (deptId: string) => {
    handleUnmarkBureau(deptId);
    if (rhDepartmentId === deptId) {
      setRhMutation.mutate({ rhDepartmentId: null });
    }
  };

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('تم حذف القسم بنجاح من النظام');
      setShowDeleteDialog(false);
      setDepartmentToDelete(null);
    },
    onError: (error: unknown) => {
      console.error('Error deleting department:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في حذف القسم';
      toast.error(errorMsg);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      toggleDepartmentStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('تم تحديث حالة القسم بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error toggling department status:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في تحديث حالة القسم';
      toast.error(errorMsg);
    }
  });

  const handleDeleteClick = (id: string) => {
    setDepartmentToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (departmentToDelete) {
      deleteMutation.mutate(departmentToDelete);
    }
  };

  const handleToggleStatus = (dept: Department) => {
    toggleStatusMutation.mutate({
      id: dept._id,
      isActive: !dept.isActive
    });
  };

  const handleManualRefresh = () => {
    refetch();
    refetchOrgSettings();
    toast.success('تم تحديث بيانات الأقسام بنجاح');
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = departments.length;
    const active = departments.filter(d => d.isActive !== false).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [departments]);

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = dept.name.toLowerCase().includes(query);
        const matchesDesc = dept.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Status
      if (statusFilter === 'ACTIVE' && dept.isActive === false) return false;
      if (statusFilter === 'INACTIVE' && dept.isActive !== false) return false;

      return true;
    });
  }, [departments, searchTerm, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / itemsPerPage));
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDepartments.slice(start, start + itemsPerPage);
  }, [filteredDepartments, currentPage, itemsPerPage]);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  const getPhotoUrl = (photoPath: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    return `${baseUrl}${cleanPath}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[450px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل بيانات الأقسام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6" dir="rtl">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">إدارة الأقسام</h1>
              <p className="text-base text-gray-600 mt-0.5">
                تنظيم الهيكل الإداري، وتحديد اختصاصات الأقسام وتوزيع المسؤوليات
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            className="h-11 px-4 bg-white border-[#cbd5e1] hover:border-[#FFCB56] hover:bg-amber-50/40 text-base font-medium rounded text-[#1a202c] flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-[#2c5282]" />
            <span>تحديث</span>
          </Button>

          {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
            <Button 
              onClick={() => navigate('/dashboard/departments/create')} 
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-bold rounded shadow-none flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>إضافة قسم جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Indicators (Calm AdminLTE Cards, no gradients) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Departments */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">إجمالي الأقسام المسجلة</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.total}</span>
          </div>
          <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
        </div>

        {/* Active Departments */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">الأقسام النشطة</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 block">{metrics.active}</span>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Inactive Departments / Structure */}
        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">الأقسام المعطلة</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.inactive}</span>
          </div>
          {/* Institutional Amber / Gold indicator with dark text/icon */}
          <div className="w-10 h-10 rounded bg-[#FFCB56] text-[#1a202c] flex items-center justify-center shrink-0 border border-[#e2be40]">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Section */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1a202c]">
            <Filter className="h-5 w-5 text-[#2c5282]" />
            <span>تصفية وبحث الأقسام</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-11 px-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>إعادة ضبط التصفية</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search by name or description */}
          <div className="relative sm:col-span-2">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input 
              placeholder="البحث باسم القسم أو بالوصف..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 text-base pr-10 pl-3 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">جميع الحالات</SelectItem>
                <SelectItem value="ACTIVE" className="text-base py-2">أقسام نشطة فقط</SelectItem>
                <SelectItem value="INACTIVE" className="text-base py-2">أقسام معطلة فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Table Section */}
      <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[200px]">اسم القسم</TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[280px]">الوصف والاختصاصات</TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[130px]">الحالة</TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[140px]">تاريخ الإنشاء</TableHead>
                <TableHead className="text-center py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[160px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-base text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building className="h-8 w-8 text-gray-400" />
                      <span>لا توجد أقسام مطابقة لمعايير البحث والتصفية المحددة.</span>
                      {hasActiveFilters && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetFilters}
                          className="mt-2 h-11 border-[#cbd5e1] text-sm"
                        >
                          إعادة ضبط التصفية
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDepartments.map((department) => {
                  const isActive = department.isActive !== false;
                  const isBureauDirecteur = bureauDirecteurId === department._id;
                  const isBureauOrdre = bureauOrdreId === department._id;
                  const isRh = rhDepartmentId === department._id;
                  const isMarked = isBureauDirecteur || isBureauOrdre || isRh;

                  return (
                    <TableRow 
                      key={department._id} 
                      className="hover:bg-[#f7fafc] transition-colors border-b border-[#e2e8f0]"
                    >
                      {/* Name */}
                      <TableCell className="text-right py-3 px-4 align-middle text-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                            <Building className="h-4 w-4" />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-[#1a202c]">
                              {department.name}
                            </span>
                            {/* Badge doré pour Bureau Directeur ou Bureau d'Ordre ou Département RH */}
                            {isBureauDirecteur && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-[#1a202c] bg-[#FFCB56] border border-[#e2be40] rounded-[0.25rem] shadow-none select-none"
                              >
                                <Award className="w-3.5 h-3.5 shrink-0" />
                                <span>Bureau Directeur</span>
                              </span>
                            )}
                            {isBureauOrdre && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-[#1a202c] bg-[#FFCB56] border border-[#e2be40] rounded-[0.25rem] shadow-none select-none"
                              >
                                <Award className="w-3.5 h-3.5 shrink-0" />
                                <span>Bureau d'Ordre</span>
                              </span>
                            )}
                            {isRh && (
                              <span 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-[#1a202c] bg-[#FFCB56] border border-[#e2be40] rounded-[0.25rem] shadow-none select-none"
                              >
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                <span>Département RH</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Description */}
                      <TableCell className="text-right py-3 px-4 align-middle text-sm text-[#4a5568]">
                        {department.description ? (
                          <span className="line-clamp-2 max-w-md">{department.description}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">لا يوجد وصف مسجل</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-right py-3 px-4 align-middle text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                          <span>{isActive ? 'نشط' : 'معطل'}</span>
                        </span>
                      </TableCell>

                      {/* Created At */}
                      <TableCell className="text-right py-3 px-4 align-middle text-sm text-[#4a5568]">
                        {department.createdAt ? formatArabicDate(department.createdAt) : 'غير مسجل'}
                      </TableCell>

                      {/* Actions: View, Edit, Deactivate/Activate, Delete, Bureau / RH assignment */}
                      <TableCell className="py-3 px-4 align-middle text-sm">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Affiliated Users */}
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setSelectedDepartmentForView(department)}
                            aria-label="عرض تفاصيل ومنسوبي القسم"
                            className="h-9 w-9 min-w-[36px] sm:min-w-[44px] border-[#cbd5e1] hover:bg-blue-50 hover:text-[#2c5282] text-gray-700 rounded transition-colors"
                            title="عرض تفاصيل ومنسوبي القسم"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit Department */}
                          {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && (
                            <>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => navigate(`/dashboard/departments/edit/${department._id}`)}
                                aria-label="تعديل بيانات القسم"
                                className="h-9 w-9 min-w-[36px] sm:min-w-[44px] border-[#cbd5e1] hover:bg-gray-100 text-gray-700 rounded transition-colors"
                                title="تعديل بيانات القسم"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              {/* Toggle Status */}
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleToggleStatus(department)}
                                disabled={toggleStatusMutation.isPending}
                                aria-label={isActive ? 'تعطيل القسم' : 'تنشيط القسم'}
                                className={`h-9 w-9 min-w-[36px] sm:min-w-[44px] border-[#cbd5e1] rounded transition-colors ${
                                  isActive ? 'hover:bg-amber-50 text-emerald-600' : 'hover:bg-emerald-50 text-red-500'
                                }`}
                                title={isActive ? 'تعطيل القسم' : 'تنشيط القسم'}
                              >
                                {isActive ? (
                                  <ToggleRight className="h-5 w-5" />
                                ) : (
                                  <ToggleLeft className="h-5 w-5" />
                                )}
                              </Button>

                              {/* Delete */}
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleDeleteClick(department._id)}
                                disabled={deleteMutation.isPending}
                                aria-label="حذف القسم نهائياً"
                                className="h-9 w-9 min-w-[36px] sm:min-w-[44px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded transition-colors"
                                title="حذف القسم نهائياً"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              {/* Menu d'action rapide: Bureau Directeur / Bureau d'Ordre / Département RH */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    disabled={setBureauMutation.isPending || setRhMutation.isPending}
                                    aria-label="تخصيص الوحدة الوظيفية أو قسم الموارد البشرية"
                                    className={`h-9 w-9 min-w-[36px] sm:min-w-[44px] rounded transition-colors ${
                                      isMarked 
                                        ? 'bg-[#FFCB56]/20 border-[#e2be40] text-[#1a202c] hover:bg-[#FFCB56]/30' 
                                        : 'border-[#cbd5e1] hover:bg-gray-100 text-gray-700'
                                    }`}
                                    title="تخصيص الوحدة الوظيفية / قسم الموارد البشرية"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60 text-right" dir="rtl">
                                  <DropdownMenuItem
                                    onClick={() => handleMarkAsBureauDirecteur(department._id)}
                                    className="cursor-pointer flex items-center justify-between text-sm py-2"
                                  >
                                    <span className="flex items-center gap-2">
                                      <ShieldCheck className="h-4 w-4 text-amber-600" />
                                      <span>Marquer comme Bureau Directeur</span>
                                    </span>
                                    {isBureauDirecteur && (
                                      <span className="w-2 h-2 rounded-full bg-[#FFCB56] border border-[#e2be40]" />
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleMarkAsBureauOrdre(department._id)}
                                    className="cursor-pointer flex items-center justify-between text-sm py-2"
                                  >
                                    <span className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-amber-600" />
                                      <span>Marquer comme Bureau d'Ordre</span>
                                    </span>
                                    {isBureauOrdre && (
                                      <span className="w-2 h-2 rounded-full bg-[#FFCB56] border border-[#e2be40]" />
                                    )}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleMarkAsRh(department._id)}
                                    className="cursor-pointer flex items-center justify-between text-sm py-2"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-amber-600" />
                                      <span>Marquer comme Département RH</span>
                                    </span>
                                    {isRh && (
                                      <span className="w-2 h-2 rounded-full bg-[#FFCB56] border border-[#e2be40]" />
                                    )}
                                  </DropdownMenuItem>

                                  {isMarked && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleUnmark(department._id)}
                                        className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-2 flex items-center gap-2"
                                      >
                                        <X className="h-4 w-4" />
                                        <span>Démarquer</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Section */}
        {filteredDepartments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <div className="text-base text-gray-600 font-medium">
              عرض <strong className="text-[#1a202c]">{((currentPage - 1) * itemsPerPage) + 1}</strong> إلى{' '}
              <strong className="text-[#1a202c]">{Math.min(currentPage * itemsPerPage, filteredDepartments.length)}</strong>{' '}
              من أصل <strong className="text-[#1a202c]">{filteredDepartments.length}</strong> قسم
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-11 px-3.5 border-[#cbd5e1] text-base rounded font-medium disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  <span>السابق</span>
                </Button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-11 w-11 text-base font-bold rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#2c5282] text-white'
                          : 'bg-white text-gray-700 border border-[#cbd5e1] hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-11 px-3.5 border-[#cbd5e1] text-base rounded font-medium disabled:opacity-50"
                >
                  <span>التالي</span>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Department Details & Affiliated Users Dialog (Rich modal >= 700px on desktop, 95% on mobile, padding >= 1.5rem) */}
      <Dialog 
        open={Boolean(selectedDepartmentForView)} 
        onOpenChange={(open) => !open && setSelectedDepartmentForView(null)}
      >
        <DialogContent 
          className="w-[95vw] sm:w-[90vw] sm:max-w-[780px] p-6 sm:p-7 bg-white border border-[#e2e8f0] rounded shadow-xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader className="pb-4 border-b border-[#e2e8f0] text-right">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
              <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                <Building className="h-5 w-5" />
              </div>
              <span>تفاصيل القسم ومنسوبوه: {selectedDepartmentForView?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 text-right mt-1.5">
              {selectedDepartmentForView?.description || 'لا يوجد وصف تفصيلي مسجل لهذا القسم'}
            </DialogDescription>
          </DialogHeader>

          {/* Department Meta Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-base space-y-1">
              <span className="text-xs font-semibold text-gray-500 block">الحالة التشغيلية</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                selectedDepartmentForView?.isActive !== false
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${selectedDepartmentForView?.isActive !== false ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                <span>{selectedDepartmentForView?.isActive !== false ? 'قسم نشط' : 'قسم معطل'}</span>
              </span>
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-base space-y-1">
              <span className="text-xs font-semibold text-gray-500 block">تاريخ الإنشاء</span>
              <p className="font-medium text-[#1a202c]">
                {selectedDepartmentForView?.createdAt ? formatArabicDate(selectedDepartmentForView.createdAt) : 'غير مسجل'}
              </p>
            </div>
          </div>

          {/* Affiliated Users Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2c5282]" />
                <span>المستخدمون المنتسبون للقسم ({departmentUsers.length})</span>
              </h3>
            </div>

            {isLoadingDeptUsers ? (
              <div className="p-6 text-center text-gray-500 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-2"></div>
                <span className="text-sm">جاري تحميل قائمة المستخدمين...</span>
              </div>
            ) : departmentUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-base font-medium">لا يوجد مستخدمون منتسبون لهذا القسم حالياً.</p>
                <p className="text-sm text-gray-400 mt-1">يمكنك إسناد المستخدمين لهذا القسم عبر شاشة إدارة المستخدمين.</p>
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded overflow-hidden">
                <Table className="w-full">
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <TableHead className="text-right py-3 px-3 text-xs font-bold text-gray-700 w-12">الصورة</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs font-bold text-gray-700">اسم المستخدم</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs font-bold text-gray-700">الدور</TableHead>
                      <TableHead className="text-right py-3 px-3 text-xs font-bold text-gray-700">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentUsers.map((user) => (
                      <TableRow key={user._id} className="hover:bg-slate-50 border-b border-[#e2e8f0]">
                        <TableCell className="py-2.5 px-3">
                          <Avatar className="h-9 w-9 rounded-full border border-[#cbd5e1] overflow-hidden bg-gray-50">
                            {user.photo ? (
                              <AvatarImage src={getPhotoUrl(user.photo)} alt={user.username} className="object-cover" />
                            ) : (
                              <AvatarFallback className="text-xs font-bold bg-[#2c5282]/10 text-[#2c5282]">
                                {user.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 font-bold text-sm text-[#1a202c]">
                          {user.username}
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          {user.role === 'SuperAdmin' || user.role === 'Admin' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FFD758] text-[#1a202c] border border-[#e2be40]">
                              {user.role === 'SuperAdmin' ? 'مدير أعلى' : 'مدير'}
                            </span>
                          ) : user.role === 'AdminDepartment' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#2c5282] text-white">
                              مدير قسم
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              مستخدم
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            user.isActive 
                              ? 'bg-emerald-50 text-emerald-800' 
                              : 'bg-red-50 text-red-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                            <span>{user.isActive ? 'نشط' : 'معطل'}</span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedDepartmentForView(null)}
              className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700"
            >
              إغلاق النافذة
            </Button>
            {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && selectedDepartmentForView && (
              <Button
                type="button"
                onClick={() => {
                  const deptId = selectedDepartmentForView._id;
                  setSelectedDepartmentForView(null);
                  navigate(`/dashboard/departments/edit/${deptId}`);
                }}
                className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded shadow-none flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                <span>تعديل هذا القسم</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (Minimum 700px on desktop, 95% on mobile, padding >= 1.5rem) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent 
          className="w-[95vw] sm:w-[90vw] sm:max-w-[700px] p-6 sm:p-7 bg-white border border-[#e2e8f0] rounded shadow-xl" 
          dir="rtl"
        >
          <AlertDialogHeader className="text-right pb-4 border-b border-[#e2e8f0]">
            <AlertDialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-red-600">
              <div className="w-11 h-11 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <span>تأكيد حذف القسم</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 text-right mt-3 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا القسم نهائياً من النظام؟ لا يمكن التراجع عن هذا الإجراء، وقد يؤثر حذف القسم على الوثائق والمراسلات والمجلدات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-11 px-7 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded shadow-none"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، تأكيد الحذف'}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700 mt-0"
            >
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentsPage;
