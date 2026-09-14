import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, deleteUser, deactivateUser } from '@/services/userService';
import { getDepartments } from '@/services/departmentService';
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
  ToggleLeft, 
  ToggleRight, 
  RefreshCw, 
  Key, 
  Users, 
  Search, 
  Filter, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Shield,
  Building,
  UserCheck,
  UserX,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Department } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import ChangePasswordDialog from '@/components/users/ChangePasswordDialog';

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Dialog states
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Data queries
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 60000,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم حذف حساب المستخدم بنجاح');
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error: unknown) => {
      console.error('Error deleting user:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في حذف المستخدم';
      toast.error(errorMsg);
    }
  });

  const toggleActivationMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      deactivateUser(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم تحديث حالة المستخدم بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error updating user status:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : 'فشل في تحديث حالة المستخدم';
      toast.error(errorMsg);
    }
  });

  const handleDeleteClick = (id: string) => {
    setUserToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete);
    }
  };

  const handleToggleActivation = (user: User) => {
    toggleActivationMutation.mutate({
      id: user._id,
      isActive: !user.isActive
    });
  };

  const handleManualRefresh = () => {
    refetch();
    toast.success('تم تحديث قائمة المستخدمين');
  };

  const handlePasswordChange = (user: User) => {
    setPasswordDialogUser(user);
  };

  const canEditUser = (user: User) => {
    if (currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') {
      return true;
    }
    
    if (currentUser?.role === 'AdminDepartment') {
      const currentUserDeptId = currentUser.activeDepartment?._id;
      const userDeptIds = user.departments?.map(dept => dept._id) || [];
      return Boolean(currentUserDeptId && userDeptIds.includes(currentUserDeptId));
    }
    
    return false;
  };

  const getPhotoUrl = (photoPath: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    return `${baseUrl}${cleanPath}`;
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const inactive = total - active;
    const admins = users.filter(u => u.role === 'Admin' || u.role === 'SuperAdmin').length;
    return { total, active, inactive, admins };
  }, [users]);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = user.username.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        if (user.role !== roleFilter) return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL') {
        const inDept = user.departments?.some(d => d._id === departmentFilter);
        if (!inDept) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !user.isActive) return false;
      if (statusFilter === 'INACTIVE' && user.isActive) return false;

      return true;
    });
  }, [users, searchTerm, roleFilter, departmentFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'ALL' || departmentFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setDepartmentFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[450px] w-full" dir="rtl">
        <div className="flex flex-col items-center gap-4 p-8 bg-white border border-[#e2e8f0] rounded">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2c5282]"></div>
          <p className="text-base text-gray-600 font-medium">جاري تحميل بيانات المستخدمين...</p>
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
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">إدارة المستخدمين</h1>
              <p className="text-base text-gray-600 mt-0.5">
                عرض وإدارة حسابات المستخدمين وصلاحياتهم وأقسامهم في المنظومة
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

          {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin' || currentUser?.role === 'AdminDepartment') && (
            <Button 
              onClick={() => navigate('/dashboard/users/create')} 
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-bold rounded shadow-none flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>إضافة مستخدم جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Indicators (Calm AdminLTE Cards, no gradients) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">إجمالي المستخدمين</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.total}</span>
          </div>
          <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">الحسابات النشطة</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 block">{metrics.active}</span>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">الحسابات المعطلة</span>
            <span className="text-xl sm:text-2xl font-bold text-red-600 mt-1 block">{metrics.inactive}</span>
          </div>
          <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">المشرفون والمدراء</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.admins}</span>
          </div>
          {/* Gold indicator with dark text/icon */}
          <div className="w-10 h-10 rounded bg-[#FFCB56] text-[#1a202c] flex items-center justify-center shrink-0 border border-[#e2be40]">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Section */}
      <div className="bg-white border border-[#e2e8f0] rounded p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1a202c]">
            <Filter className="h-5 w-5 text-[#2c5282]" />
            <span>تصفية وبحث المستخدمين</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>إعادة ضبط التصفية</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by username */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input 
              placeholder="بحث باسم المستخدم..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-11 text-base pr-10 pl-3 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Role Filter */}
          <div>
            <Select 
              value={roleFilter} 
              onValueChange={(val) => {
                setRoleFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="تصفية حسب الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">جميع الأدوار</SelectItem>
                <SelectItem value="SuperAdmin" className="text-base py-2">مدير أعلى (SuperAdmin)</SelectItem>
                <SelectItem value="Admin" className="text-base py-2">مدير (Admin)</SelectItem>
                <SelectItem value="AdminDepartment" className="text-base py-2">مدير قسم (AdminDepartment)</SelectItem>
                <SelectItem value="AdminTuningDesk" className="text-base py-2">مدير المكتب (AdminTuningDesk)</SelectItem>
                <SelectItem value="User" className="text-base py-2">مستخدم عادي (User)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department Filter */}
          <div>
            <Select 
              value={departmentFilter} 
              onValueChange={(val) => {
                setDepartmentFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="تصفية حسب القسم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">جميع الأقسام</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept._id} value={dept._id} className="text-base py-2">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="ACTIVE" className="text-base py-2">حسابات نشطة فقط</SelectItem>
                <SelectItem value="INACTIVE" className="text-base py-2">حسابات معطلة فقط</SelectItem>
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
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 w-16">الصورة</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[160px]">اسم المستخدم</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[130px]">الدور</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[180px]">القسم / الأقسام</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[140px]">تاريخ الإنشاء</TableHead>
                <TableHead className="text-right py-4 px-4 text-sm font-bold text-gray-700 min-w-[120px]">الحالة</TableHead>
                <TableHead className="text-center py-4 px-4 text-sm font-bold text-gray-700 min-w-[140px]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-base text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-gray-400" />
                      <span>لا توجد نتائج مطابقة لمعايير البحث والتصفية المحددة.</span>
                      {hasActiveFilters && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetFilters}
                          className="mt-2 h-9 border-[#cbd5e1] text-sm"
                        >
                          إعادة ضبط التصفية
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow 
                    key={user._id} 
                    className="min-h-[64px] h-16 hover:bg-slate-50/80 transition-colors duration-150 border-b border-[#e2e8f0]"
                  >
                    {/* Photo */}
                    <TableCell className="text-right py-3 px-4">
                      <Avatar className="h-11 w-11 rounded-full border border-[#cbd5e1] overflow-hidden bg-gray-50">
                        {user.photo ? (
                          <AvatarImage 
                            src={getPhotoUrl(user.photo)}
                            alt={user.username}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-sm font-bold bg-[#2c5282]/10 text-[#2c5282]">
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </TableCell>

                    {/* Username */}
                    <TableCell className="text-right py-3 px-4 font-bold text-base text-[#1a202c]">
                      {user.username}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="text-right py-3 px-4">
                      {user.role === 'SuperAdmin' || user.role === 'Admin' ? (
                        /* Strict WCAG AA: gold background MUST have dark text #1a202c */
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-bold bg-[#FFD758] text-[#1a202c] border border-[#e2be40]">
                          {user.role === 'SuperAdmin' ? 'مدير أعلى' : 'مدير'}
                        </span>
                      ) : user.role === 'AdminDepartment' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-medium bg-[#2c5282] text-white">
                          مدير قسم
                        </span>
                      ) : user.role === 'AdminTuningDesk' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                          مدير المكتب
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded text-xs sm:text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          مستخدم
                        </span>
                      )}
                    </TableCell>

                    {/* Departments */}
                    <TableCell className="text-right py-3 px-4">
                      {user.departments && user.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                          {user.departments.map(dept => (
                            <span 
                              key={dept._id} 
                              className="inline-block px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-200"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">لا يوجد قسم</span>
                      )}
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-right py-3 px-4 text-sm text-gray-600 font-medium">
                      {formatArabicDate(user.createdAt)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-right py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        user.isActive 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                        <span>{user.isActive ? 'نشط' : 'معطل'}</span>
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit & Password options */}
                        {canEditUser(user) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                className="h-10 w-10 border-[#cbd5e1] hover:bg-gray-100 text-gray-700 rounded"
                                title="خيارات التعديل"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-right" dir="rtl">
                              <DropdownMenuItem 
                                onClick={() => navigate(`/dashboard/users/edit/${user._id}`)}
                                className="text-base py-2.5 cursor-pointer flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4 text-[#2c5282]" />
                                <span>تعديل المستخدم</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handlePasswordChange(user)}
                                className="text-base py-2.5 cursor-pointer flex items-center gap-2 text-amber-700"
                              >
                                <Key className="h-4 w-4" />
                                <span>تغيير كلمة المرور</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        {/* Toggle active status */}
                        {(currentUser?.role === 'Admin' || 
                          currentUser?.role === 'SuperAdmin' ||
                          (currentUser?.role === 'AdminDepartment' && canEditUser(user))) && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleToggleActivation(user)}
                            disabled={toggleActivationMutation.isPending}
                            className={`h-10 w-10 border-[#cbd5e1] rounded transition-colors ${
                              user.isActive ? 'hover:bg-amber-50 text-emerald-600' : 'hover:bg-emerald-50 text-red-500'
                            }`}
                            title={user.isActive ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                          >
                            {user.isActive ? 
                              <ToggleRight className="h-5 w-5" /> : 
                              <ToggleLeft className="h-5 w-5" />
                            }
                          </Button>
                        )}
                        
                        {/* Delete user */}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin') && currentUser._id !== user._id && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteClick(user._id)}
                            disabled={deleteMutation.isPending}
                            className="h-10 w-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded"
                            title="حذف المستخدم نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Section */}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#e2e8f0] bg-[#f8fafc]">
            <div className="text-base text-gray-600 font-medium">
              عرض <strong className="text-[#1a202c]">{((currentPage - 1) * itemsPerPage) + 1}</strong> إلى{' '}
              <strong className="text-[#1a202c]">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</strong>{' '}
              من أصل <strong className="text-[#1a202c]">{filteredUsers.length}</strong> مستخدم
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-10 px-3.5 border-[#cbd5e1] text-base rounded font-medium disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  <span>السابق</span>
                </Button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-10 w-10 text-base font-bold rounded transition-colors ${
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
                  className="h-10 px-3.5 border-[#cbd5e1] text-base rounded font-medium disabled:opacity-50"
                >
                  <span>التالي</span>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
              <span>تأكيد حذف حساب المستخدم</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 text-right mt-3 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً من المنظومة؟ هذا الإجراء غير قابل للتراجع وسيؤدي إلى إلغاء صلاحيات المستخدم بالكامل.
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

      {/* Change Password Dialog */}
      {passwordDialogUser && (
        <ChangePasswordDialog
          user={passwordDialogUser}
          open={Boolean(passwordDialogUser)}
          onOpenChange={(open) => !open && setPasswordDialogUser(null)}
        />
      )}
    </div>
  );
};

export default UsersPage;
