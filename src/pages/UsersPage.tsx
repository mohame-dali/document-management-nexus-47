
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, deleteUser, deactivateUser } from '@/services/userService';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { User } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from 'sonner';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import ChangePasswordDialog from '@/components/users/ChangePasswordDialog';

const UsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(null);
  
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم حذف المستخدم بنجاح');
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'فشل في حذف المستخدم');
    }
  });

  const toggleActivationMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      deactivateUser(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('تم تحديث حالة المستخدم بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating user status:', error);
      toast.error(error.response?.data?.error || 'فشل في تحديث حالة المستخدم');
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
    toast.success('تم تحديث البيانات');
  };

  const handlePasswordChange = (user: User) => {
    setPasswordDialogUser(user);
  };

  // Check if current user can edit a specific user
  const canEditUser = (user: User) => {
    if (currentUser?.role === 'Admin') {
      return true; // Admin can edit any user
    }
    
    if (currentUser?.role === 'AdminDepartment') {
      // AdminDepartment can edit users in their active department
      const currentUserDeptId = currentUser.activeDepartment?._id;
      const userDeptIds = user.departments.map(dept => dept._id);
      return currentUserDeptId && userDeptIds.includes(currentUserDeptId);
    }
    
    return false;
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
        <h1 className="text-2xl font-bold text-right">إدارة المستخدمين</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          {(currentUser?.role === 'Admin' || currentUser?.role === 'AdminDepartment') && (
            <Button onClick={() => navigate('/dashboard/users/create')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة مستخدم
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
              <TableHead className="text-right">الصورة</TableHead>
              <TableHead className="text-right">اسم المستخدم</TableHead>
              <TableHead className="text-right">الدور</TableHead>
              <TableHead className="text-right">القسم/الأقسام</TableHead>
              <TableHead className="text-right">تاريخ الإنشاء</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="text-right">
                  <Avatar className="h-12 w-12">
                    {user.photo ? (
                      <AvatarImage 
                        src={user.photo.startsWith('http') ? user.photo : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.photo}`}
                        alt={user.username}
                        className="object-cover"
                      />
                    ) : (
                      <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TableCell>
                <TableCell className="text-right font-medium">{user.username}</TableCell>
                <TableCell className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    {user.role === 'Admin' ? 'مدير' :
                     user.role === 'AdminDepartment' ? 'مدير قسم' :
                     user.role === 'AdminTuningDesk' ? 'مدير المكتب' :
                     'مستخدم'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {user.departments && user.departments.length > 0 ? (
                    <div className="space-y-1">
                      {user.departments.map(dept => (
                        <span 
                          key={dept._id} 
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mr-1"
                        >
                          {dept.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">لا يوجد</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatArabicDate(user.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {user.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-reverse space-x-2">
                    {canEditUser(user) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/users/edit/${user._id}`)}>
                            <Edit className="h-4 w-4 ml-2" />
                            تعديل المستخدم
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePasswordChange(user)}>
                            <Key className="h-4 w-4 ml-2" />
                            تغيير كلمة المرور
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {(currentUser?.role === 'Admin' || 
                      (currentUser?.role === 'AdminDepartment' && canEditUser(user))) && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleToggleActivation(user)}
                        disabled={toggleActivationMutation.isPending}
                        title={user.isActive ? 'إلغاء تنشيط المستخدم' : 'تنشيط المستخدم'}
                      >
                        {user.isActive ? 
                          <ToggleRight className="h-4 w-4 text-green-500" /> : 
                          <ToggleLeft className="h-4 w-4 text-red-500" />
                        }
                      </Button>
                    )}
                    
                    {currentUser?.role === 'Admin' && currentUser._id !== user._id && (
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => handleDeleteClick(user._id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف حساب المستخدم نهائياً من النظام.
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

      {passwordDialogUser && (
        <ChangePasswordDialog
          user={passwordDialogUser}
          open={!!passwordDialogUser}
          onOpenChange={(open) => !open && setPasswordDialogUser(null)}
        />
      )}
    </div>
  );
};

export default UsersPage;
