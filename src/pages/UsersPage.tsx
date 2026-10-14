import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Shield,
  Building,
  UserCheck,
  UserX,
  MoreHorizontal,
  Loader2
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
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Dialog states
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(null);

  // Filter & Search states with persistence
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useLocalStorageState<string>('users_roleFilter', 'ALL');
  const [departmentFilter, setDepartmentFilter] = useLocalStorageState<string>('users_departmentFilter', 'ALL');
  const [statusFilter, setStatusFilter] = useLocalStorageState<string>('users_statusFilter', 'ALL');
  const [sortField, setSortField] = useLocalStorageState<string>('users_sortField', 'createdAt');
  const [sortDirection, setSortDirection] = useLocalStorageState<'asc' | 'desc'>('users_sortDirection', 'desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
      toast.success(t('users.delete.success'));
      setShowDeleteDialog(false);
      setUserToDelete(null);
    },
    onError: (error: unknown) => {
      console.error('Error deleting user:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : t('users.delete.error');
      toast.error(errorMsg);
    }
  });

  const toggleActivationMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      deactivateUser(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.status.updateSuccess'));
    },
    onError: (error: unknown) => {
      console.error('Error updating user status:', error);
      const errorMsg = error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: { error?: string } } }).response?.data?.error
        ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
        : t('users.status.updateError');
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
    toast.success(t('users.refresh.success'));
  };

  const handlePasswordChange = (user: User) => {
    setPasswordDialogUser(user);
  };

  const canEditUser = (user: User) => {
    return currentUser?.role === 'Admin';
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
    const admins = users.filter(u => u.role === 'Admin' || u.role === 'Director').length;
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

  // Sort users after filtering
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'username') {
        valA = a.username.toLowerCase();
        valB = b.username.toLowerCase();
      } else if (sortField === 'role') {
        valA = a.role.toLowerCase();
        valB = b.role.toLowerCase();
      } else if (sortField === 'departments') {
        valA = (a.departments?.map(d => d.name).join(', ') || '').toLowerCase();
        valB = (b.departments?.map(d => d.name).join(', ') || '').toLowerCase();
      } else if (sortField === 'createdAt') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else if (sortField === 'isActive') {
        valA = a.isActive ? 1 : 0;
        valB = b.isActive ? 1 : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

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
      <div className="w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
          <TableSkeleton columns={7} rows={8} />
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
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a202c]">{t('users.page.title')}</h1>
              <p className="text-base text-gray-600 mt-0.5">
                {t('users.page.subtitle')}
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
            <span>{t('common.refresh')}</span>
          </Button>

          {currentUser?.role === 'Admin' && (
            <Button 
              onClick={() => navigate('/dashboard/users/create')} 
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-bold rounded shadow-none flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>{t('users.create.title')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Indicators (Calm AdminLTE Cards, no gradients) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">{t('users.metrics.total')}</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.total}</span>
          </div>
          <div className="w-10 h-10 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">{t('users.metrics.active')}</span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 block">{metrics.active}</span>
          </div>
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">{t('users.metrics.inactive')}</span>
            <span className="text-xl sm:text-2xl font-bold text-red-600 mt-1 block">{metrics.inactive}</span>
          </div>
          <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-gray-500 block">{t('users.metrics.admins')}</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1a202c] mt-1 block">{metrics.admins}</span>
          </div>
          {/* Gold indicator with dark text/icon */}
          <div className="w-10 h-10 rounded bg-[#FFCB56] text-[#1a202c] flex items-center justify-center shrink-0 border border-[#e2be40]">
            <Shield className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Section */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-[#1a202c]">
            <Filter className="h-5 w-5 text-[#2c5282]" />
            <span>{t('users.filters.title')}</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-11 px-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5"
            >
              <X className="h-4 w-4" />
              <span>{t('users.filters.reset')}</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by username */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input 
              placeholder={t('users.filters.searchPlaceholder')}
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
                <SelectValue placeholder={t('users.filters.byRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">{t('users.filters.allRoles')}</SelectItem>
                <SelectItem value="Director" className="text-base py-2">{t('users.role.director')}</SelectItem>
                <SelectItem value="Admin" className="text-base py-2">{t('users.role.admin')}</SelectItem>
                <SelectItem value="AdminDepartment" className="text-base py-2">{t('users.role.adminDepartment')}</SelectItem>
                <SelectItem value="AdminTuningDesk" className="text-base py-2">{t('users.role.adminTuningDesk')}</SelectItem>
                <SelectItem value="User" className="text-base py-2">{t('users.role.user')}</SelectItem>
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
                <SelectValue placeholder={t('users.filters.byDepartment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">{t('users.filters.allDepartments')}</SelectItem>
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
                <SelectValue placeholder={t('users.filters.byStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-base py-2 font-medium">{t('users.filters.allStatuses')}</SelectItem>
                <SelectItem value="ACTIVE" className="text-base py-2">{t('users.filters.activeOnly')}</SelectItem>
                <SelectItem value="INACTIVE" className="text-base py-2">{t('users.filters.inactiveOnly')}</SelectItem>
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
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] w-16">{t('users.table.photo')}</TableHead>
                <TableHead 
                  className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[160px] cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                  onClick={() => handleSort('username')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('users.table.username')}</span>
                    {sortField === 'username' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                    {sortField === 'username' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                    {sortField !== 'username' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[130px] cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('users.table.role')}</span>
                    {sortField === 'role' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                    {sortField === 'role' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                    {sortField !== 'role' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[180px] cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                  onClick={() => handleSort('departments')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('users.table.departments')}</span>
                    {sortField === 'departments' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                    {sortField === 'departments' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                    {sortField !== 'departments' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[140px] cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('users.table.createdAt')}</span>
                    {sortField === 'createdAt' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                    {sortField === 'createdAt' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                    {sortField !== 'createdAt' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[120px] cursor-pointer hover:bg-[#edf2f7] select-none transition-colors"
                  onClick={() => handleSort('isActive')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('users.table.status')}</span>
                    {sortField === 'isActive' && sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-[#2c5282]" />}
                    {sortField === 'isActive' && sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-[#2c5282]" />}
                    {sortField !== 'isActive' && <ChevronsUpDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </TableHead>
                <TableHead className="text-center py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[140px]">{t('users.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-base text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-gray-400" />
                      <span>{t('users.filters.noResults')}</span>
                      {hasActiveFilters && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={resetFilters}
                          className="mt-2 h-11 border-[#cbd5e1] text-sm"
                        >
                          {t('users.filters.reset')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow 
                    key={user._id} 
                    className="hover:bg-[#f7fafc] transition-colors border-b border-[#e2e8f0]"
                  >
                    {/* Photo */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm">
                      <Avatar className="h-10 w-10 rounded-full border border-[#cbd5e1] overflow-hidden bg-gray-50">
                        {user.photo ? (
                          <AvatarImage 
                            src={getPhotoUrl(user.photo)}
                            alt={user.username}
                            className="object-cover"
                          />
                        ) : (
                          <AvatarFallback className="text-xs font-bold bg-[#2c5282]/10 text-[#2c5282]">
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </TableCell>

                    {/* Username */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm font-bold text-[#1a202c]">
                      {user.username}
                    </TableCell>

                    {/* Role */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm">
                      {user.role === 'Director' ? (
                        /* Strict WCAG AA: gold background MUST have dark text #1a202c */
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFD758] text-[#1a202c] border border-[#e2be40]">
                          {t('users.badge.director')}
                        </span>
                      ) : user.role === 'Admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-[#FFCB56] text-[#1a202c] border border-[#e2be40]">
                          {t('users.badge.admin')}
                        </span>
                      ) : user.role === 'AdminDepartment' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#2c5282] text-white">
                          {t('users.badge.adminDepartment')}
                        </span>
                      ) : user.role === 'AdminTuningDesk' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                          {t('users.badge.adminTuningDesk')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {t('users.badge.user')}
                        </span>
                      )}
                    </TableCell>

                    {/* Departments */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm">
                      {user.departments && user.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                          {user.departments.map(dept => (
                            <span 
                              key={dept._id} 
                              className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-200"
                            >
                              {dept.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">{t('users.noDepartment')}</span>
                      )}
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm text-[#4a5568]">
                      {formatArabicDate(user.createdAt)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-right py-3 px-4 align-middle text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        user.isActive 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-red-500'}`}></span>
                        <span>{user.isActive ? t('users.status.active') : t('users.status.inactive')}</span>
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-4 align-middle text-sm">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit & Password options */}
                        {canEditUser(user) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                aria-label={t('users.menu.editOptions')}
                                className="h-9 w-9 min-w-[36px] sm:min-w-[44px] border-[#cbd5e1] hover:bg-gray-100 text-gray-700 rounded"
                                title={t('users.menu.editOptions')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-right" dir="rtl">
                              <DropdownMenuItem 
                                onClick={() => navigate(`/dashboard/users/edit/${user._id}`)}
                                className="text-sm py-2 cursor-pointer flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4 text-[#2c5282]" />
                                <span>{t('users.menu.edit')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handlePasswordChange(user)}
                                className="text-sm py-2 cursor-pointer flex items-center gap-2 text-amber-700"
                              >
                                <Key className="h-4 w-4" />
                                <span>{t('users.menu.changePassword')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        
                        {/* Toggle active status */}
                        {currentUser?.role === 'Admin' && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleToggleActivation(user)}
                            disabled={toggleActivationMutation.isPending}
                            aria-label={user.isActive ? t('users.status.deactivate') : t('users.status.activate')}
                            className={`h-9 w-9 min-w-[36px] sm:min-w-[44px] border-[#cbd5e1] rounded transition-colors ${
                              user.isActive ? 'hover:bg-amber-50 text-emerald-600' : 'hover:bg-emerald-50 text-red-500'
                            }`}
                            title={user.isActive ? t('users.status.deactivate') : t('users.status.activate')}
                          >
                            {user.isActive ? 
                              <ToggleRight className="h-5 w-5" /> : 
                              <ToggleLeft className="h-5 w-5" />
                            }
                          </Button>
                        )}
                        
                        {/* Delete user */}
                        {currentUser?.role === 'Admin' && currentUser._id !== user._id && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteClick(user._id)}
                            disabled={deleteMutation.isPending}
                            aria-label={t('users.delete.userLabel')}
                            className="h-9 w-9 min-w-[36px] sm:min-w-[44px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded"
                            title={t('users.delete.userLabel')}
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
              {t('users.paginationInfo', {
                from: ((currentPage - 1) * itemsPerPage) + 1,
                to: Math.min(currentPage * itemsPerPage, filteredUsers.length),
                total: filteredUsers.length
              })}
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
                  <span>{t('common.previous')}</span>
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
                  <span>{t('common.next')}</span>
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
          className="w-[95vw] sm:w-[90vw] sm:max-w-[700px] p-6 sm:p-7 bg-white border border-[#e2e8f0] rounded shadow-sm" 
          dir="rtl"
        >
          <AlertDialogHeader className="text-right pb-4 border-b border-[#e2e8f0]">
            <AlertDialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-red-600">
              <div className="w-11 h-11 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 className="h-6 w-6" />
              </div>
              <span>{t('users.delete.confirmTitle')}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 text-right mt-3 leading-relaxed">
              {t('users.delete.confirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-[#e2e8f0] flex-row-reverse justify-start gap-3">
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-11 px-7 bg-red-600 hover:bg-red-700 text-white text-base font-semibold rounded shadow-none inline-flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('users.delete.deleting')}</span>
                </>
              ) : (
                t('users.delete.confirmButton')
              )}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700 mt-0"
            >
              {t('common.cancel')}
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
