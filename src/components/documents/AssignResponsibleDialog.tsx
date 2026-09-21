import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { assignResponsible } from '@/services/documentService';
import { getUsers } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { showResponsibleAssignmentNotification } from '@/components/notifications/ResponsibleAssignmentNotification';
import { IncomingDocument, User } from '@/types';
import { UserPlus, Users, CheckCircle2, User as UserIcon, Shield } from 'lucide-react';

interface AssignResponsibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IncomingDocument;
}

const AssignResponsibleDialog: React.FC<AssignResponsibleDialogProps> = ({
  open,
  onOpenChange,
  document
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Fetch users from the current user's active department
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: open,
  });

  const assignResponsibleMutation = useMutation({
    mutationFn: ({ documentId, userId }: { documentId: string, userId: string }) =>
      assignResponsible(documentId, userId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocument'] });
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      
      // Refresh responsible notifications to show new notification immediately
      queryClient.invalidateQueries({ queryKey: ['unreadResponsibleNotifications'] });
      
      // Find the assigned user
      const assignedUser = users?.find((user: User) => user._id === variables.userId);
      
      // Show instant notification for the assignment
      if (assignedUser) {
        showResponsibleAssignmentNotification({
          documentId: document._id,
          documentSubject: document.subject,
          assignedBy: currentUser?.username || 'النظام'
        });
      }
      
      toast.success('تم تعيين المسؤول بنجاح');
      onOpenChange(false);
      setSelectedUser('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'فشل في تعيين المسؤول');
    }
  });

  const handleAssignResponsible = () => {
    if (!selectedUser) {
      toast.error('يرجى اختيار مستخدم');
      return;
    }

    assignResponsibleMutation.mutate({
      documentId: document._id,
      userId: selectedUser
    });
  };

  // Filter users to show only those from the active department
  const departmentUsers = users?.filter((user: User) => 
    user.departments?.some(dept => 
      dept._id === currentUser?.activeDepartment?._id
    )
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border border-[#e2e8f0] rounded shadow-sm" dir="rtl">
        <DialogHeader className="p-6 border-b border-[#e2e8f0] bg-[#f8fafc] text-right">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-[#2c5282]/10 text-[#2c5282] rounded shrink-0">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282]">
                تعيين مسؤول عن الوثيقة
              </DialogTitle>
              <p className="text-base text-gray-600 mt-1">
                اختر المستخدم المناسب لتولي مسؤولية هذه الوثيقة
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f7fafc]">
          {/* Document Info Card */}
          <div className="bg-white border border-[#e2e8f0] rounded p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e2e8f0]">
              <UserIcon className="h-4 w-4 text-[#2c5282]" />
              <h3 className="font-bold text-base text-[#1a202c]">معلومات الوثيقة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
              <div>
                <p className="text-sm text-gray-500 font-medium">الرقم التسلسلي</p>
                <p className="font-bold text-[#2c5282] mt-0.5">#{document.serialNumber}/{document.year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">الموضوع</p>
                <p className="font-bold text-[#1a202c] line-clamp-2 mt-0.5">{document.subject}</p>
              </div>
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <Label className="text-base font-bold text-[#1a202c] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#2c5282]" />
              المستخدم المسؤول
            </Label>
            
            <div className="bg-white border border-[#e2e8f0] rounded p-5">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full h-12 text-base border-[#cbd5e1] rounded focus:border-[#2c5282] bg-white">
                  <SelectValue placeholder="اختر مستخدم..." />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#e2e8f0]">
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#2c5282]"></div>
                        <span>جاري التحميل...</span>
                      </div>
                    </SelectItem>
                  ) : departmentUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      <div className="flex items-center gap-2 text-gray-500 py-2">
                        <Users className="h-4 w-4" />
                        <span>لا يوجد مستخدمون في القسم</span>
                      </div>
                    </SelectItem>
                  ) : (
                    departmentUsers.map((user: User) => (
                      <SelectItem key={user._id} value={user._id} className="py-2.5 text-base">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-[#2c5282]/10 text-[#2c5282] rounded">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-right">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1a202c]">{user.username}</span>
                              <Badge variant="outline" className="text-xs px-2 py-0.5 border-[#cbd5e1]">
                                <Shield className="h-3 w-3 ml-1" />
                                {user.role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {selectedUser && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-base font-bold">تم اختيار المستخدم بنجاح</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Department Info */}
          <div className="bg-white border border-[#e2e8f0] rounded p-4 text-base">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Shield className="h-4 w-4 text-[#2c5282]" />
              <span>القسم النشط: <strong className="text-[#1a202c]">{currentUser?.activeDepartment?.name}</strong></span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              يتم حصر وتعيين المسؤولين من ضمن أعضاء هذا القسم فقط
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-[#e2e8f0] bg-[#f8fafc] flex-row-reverse justify-start gap-3">
          <Button
            onClick={handleAssignResponsible}
            disabled={!selectedUser || assignResponsibleMutation.isPending}
            className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded disabled:opacity-50"
          >
            {assignResponsibleMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>جاري التعيين...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <span>تعيين المسؤول</span>
              </div>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponsibleMutation.isPending}
            className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponsibleDialog;
