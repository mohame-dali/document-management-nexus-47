import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getPersonnelList, deletePersonnel } from '@/services/hr/personnelApi';
import { getDepartments } from '@/services/departmentService';
import { Personnel, PersonnelFilters } from '@/types/hr';
import { Department } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import PersonnelStatusBadge from '@/components/hr/PersonnelStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Building2,
  Briefcase,
  ChevronRight,
  ChevronLeft,
  X,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export const PersonnelListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Filtres et pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal de suppression
  const [personnelToDelete, setPersonnelToDelete] = useState<Personnel | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Droits utilisateurs
  const canAddPersonnel = ['Admin', 'SuperAdmin', 'AdminDepartment'].includes(currentUser?.role || '');
  const canDeletePersonnel = ['Admin', 'SuperAdmin'].includes(currentUser?.role || '');

  // Requête API pour les départements
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  // Paramètres de la requête API Personnel
  const queryParams: PersonnelFilters = {
    page: currentPage,
    limit,
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(statutFilter !== 'ALL' ? { statut: statutFilter } : {}),
    ...(departmentFilter !== 'ALL' ? { activeDepartment: departmentFilter } : {}),
  };

  // Requête API pour la liste du personnel
  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['personnel', queryParams],
    queryFn: () => getPersonnelList(queryParams),
    keepPreviousData: true,
  });

  const personnelList = responseData?.data || [];
  const pagination = responseData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  // Mutation de suppression
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePersonnel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      toast.success('تم حذف ملف الموظف بنجاح');
      setShowDeleteDialog(false);
      setPersonnelToDelete(null);
    },
    onError: (error: unknown) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || 'تعذر حذف ملف الموظف');
    },
  });

  const handleDeleteConfirm = () => {
    if (personnelToDelete) {
      deleteMutation.mutate(personnelToDelete._id);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatutFilter('ALL');
    setDepartmentFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' || statutFilter !== 'ALL' || departmentFilter !== 'ALL';

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* 1. En-tête de la page */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-[#ebf4ff] text-[#2c5282]">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a202c]">
                إدارة الموارد البشرية
              </h1>
              <p className="text-base text-gray-600 mt-1">
                سجل بطاقات الموظفين والمستخدمين وتدبير الوثائق الإدارية المرتبطة بهم
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 px-4 text-sm font-medium text-gray-700 border-[#cbd5e1] rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          {canAddPersonnel && (
            <Button
              onClick={() => navigate('/dashboard/hr/personnel/new')}
              className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة موظف</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Barre de filtres */}
      <div className="bg-white border border-[#e2e8f0] rounded p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-gray-700">
            <Filter className="w-4 h-4 text-[#2c5282]" />
            <span>البحث والتصفية</span>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>إعادة ضبط التصفية</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recherche par nom, prénom ou CIN */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث بالاسم، اللقب، أو رقم ب.ت.و (CIN)..."
              className="h-11 text-base pr-10 pl-3 bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
            />
          </div>

          {/* Filtre par statut */}
          <div>
            <Select
              value={statutFilter}
              onValueChange={(val) => {
                setStatutFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ALL" className="text-base py-2 font-medium">جميع الحالات</SelectItem>
                <SelectItem value="en_attente" className="text-base py-2">في الانتظار (En attente)</SelectItem>
                <SelectItem value="actif" className="text-base py-2">نشط (Actif)</SelectItem>
                <SelectItem value="inactif" className="text-base py-2">غير نشط (Inactif)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre par département */}
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
              <SelectContent dir="rtl">
                <SelectItem value="ALL" className="text-base py-2 font-medium">جميع الأقسام</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id} className="text-base py-2">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Tableau des données */}
      <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right py-4 px-4 text-base font-bold text-gray-700 min-w-[220px]">
                  الاسم الكامل (Nom & Prénom)
                </TableHead>
                <TableHead className="text-right py-4 px-4 text-base font-bold text-gray-700 min-w-[130px]">
                  رقم ب.ت.و (CIN)
                </TableHead>
                <TableHead className="text-right py-4 px-4 text-base font-bold text-gray-700 min-w-[180px]">
                  الوظيفة (Poste)
                </TableHead>
                <TableHead className="text-right py-4 px-4 text-base font-bold text-gray-700 min-w-[180px]">
                  القسم (Département)
                </TableHead>
                <TableHead className="text-right py-4 px-4 text-base font-bold text-gray-700 min-w-[130px]">
                  الحالة (Statut)
                </TableHead>
                <TableHead className="text-center py-4 px-4 text-base font-bold text-gray-700 min-w-[160px]">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 text-base">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282]" />
                      <span>جاري تحميل بيانات الموظفين...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : personnelList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 text-base">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-10 h-10 text-gray-300" />
                      <p className="font-semibold text-gray-700">لا توجد بطاقات موظفين مطابقة</p>
                      <p className="text-sm text-gray-500">
                        {hasActiveFilters
                          ? 'جرب تعديل معايير البحث والتصفية أعلاه'
                          : 'يمكنك البدء بإضافة موظف جديد'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                personnelList.map((p) => {
                  const deptName = p.activeDepartment
                    ? typeof p.activeDepartment === 'object'
                      ? (p.activeDepartment as Department).name
                      : 'قسم محدد'
                    : '—';

                  const canDeleteRow =
                    canDeletePersonnel && p.statut !== 'actif';

                  return (
                    <TableRow
                      key={p._id}
                      className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                      style={{ minHeight: '64px' }}
                    >
                      {/* Nom complet */}
                      <TableCell className="py-4 px-4 font-bold text-[#1a202c] text-base">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded bg-[#f1f5f9] text-[#2c5282] font-bold flex items-center justify-center shrink-0">
                            {p.prenom ? p.prenom.charAt(0) : 'م'}
                          </div>
                          <div>
                            <div>{p.nom} {p.prenom}</div>
                            {p.telephone && (
                              <div className="text-xs text-gray-500 font-normal" dir="ltr">
                                {p.telephone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* CIN */}
                      <TableCell className="py-4 px-4 text-base font-mono text-gray-700">
                        {p.cin || '—'}
                      </TableCell>

                      {/* Poste */}
                      <TableCell className="py-4 px-4 text-base text-gray-800">
                        {p.poste ? (
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>{p.poste}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      {/* Département */}
                      <TableCell className="py-4 px-4 text-base text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{deptName}</span>
                        </span>
                      </TableCell>

                      {/* Statut Badge */}
                      <TableCell className="py-4 px-4">
                        <PersonnelStatusBadge statut={p.statut} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Voir détail */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/hr/personnel/${p._id}`)}
                            title="عرض التفاصيل"
                            className="h-9 w-9 p-0 text-gray-600 hover:text-[#2c5282] hover:bg-[#ebf4ff] rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Éditer */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/hr/personnel/${p._id}/edit`)}
                            title="تعديل البطاقة"
                            className="h-9 w-9 p-0 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Supprimer (si Admin/SuperAdmin et statut !== actif) */}
                          {canDeletePersonnel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={p.statut === 'actif'}
                              onClick={() => {
                                setPersonnelToDelete(p);
                                setShowDeleteDialog(true);
                              }}
                              title={
                                p.statut === 'actif'
                                  ? 'لا يمكن حذف موظف في حالة نشط'
                                  : 'حذف بطاقة الموظف'
                              }
                              className={`h-9 w-9 p-0 rounded ${
                                p.statut === 'actif'
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

        {/* 4. Pagination */}
        <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>
              إجمالي النتائج: <strong className="text-[#1a202c]">{pagination.total}</strong> موظف
            </span>
            <span>•</span>
            <div className="flex items-center gap-2">
              <span>عرض:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-sm bg-white border-[#cbd5e1] rounded">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 ml-2">
              الصفحة {pagination.page} من {pagination.pages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-9 px-3 border-[#cbd5e1] text-gray-700 rounded hover:bg-white flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.pages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              className="h-9 px-3 border-[#cbd5e1] text-gray-700 rounded hover:bg-white flex items-center gap-1"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl" className="text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600">
              تأكيد حذف بطاقة الموظف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 mt-2">
              هل أنت متأكد من رغبتك في حذف بطاقة الموظف{' '}
              <strong className="text-[#1a202c]">
                {personnelToDelete?.nom} {personnelToDelete?.prenom}
              </strong>
              {personnelToDelete?.cin ? ` (CIN: ${personnelToDelete.cin})` : ''}؟
              <br />
              هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="h-10 px-4 rounded text-gray-700"
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-10 px-5 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonnelListPage;
