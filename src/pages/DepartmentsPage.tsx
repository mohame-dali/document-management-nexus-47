
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDepartments, deleteDepartment } from '@/services/departmentService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
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
import { toast } from 'sonner';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

const DepartmentsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { data: departments, isLoading, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('تم حذف القسم بنجاح');
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      console.error('Error deleting department:', error);
      toast.error(error.response?.data?.error || 'فشل في حذف القسم');
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

  const handleManualRefresh = () => {
    refetch();
    toast.success('تم تحديث البيانات');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 mr-4" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-right">إدارة الأقسام</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          {currentUser?.role === 'Admin' && (
            <Button onClick={() => navigate('/dashboard/departments/create')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة قسم
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-500">
        آخر تحديث: {formatArabicDate(new Date())} - التحديث التلقائي كل 30 ثانية
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم القسم</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments?.map((department) => (
              <TableRow key={department._id}>
                <TableCell className="text-right font-medium">{department.name}</TableCell>
                <TableCell className="text-right">{department.description || 'لا يوجد وصف'}</TableCell>
                <TableCell className="text-right">
                  {formatArabicDate(department.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-reverse space-x-2">
                    {currentUser?.role === 'Admin' && (
                      <>
                        <Button variant="outline" size="icon" 
                          onClick={() => navigate(`/dashboard/departments/edit/${department._id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDeleteClick(department._id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف القسم نهائياً من النظام.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentsPage;
