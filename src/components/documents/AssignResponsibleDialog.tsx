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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>تعيين مسؤول عن الوثيقة</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                اختر المستخدم المناسب لتولي مسؤولية هذه الوثيقة
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Separator className="my-2" />
        
        <div className="flex-1 space-y-6">
          {/* Document Info Card */}
          <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-primary">معلومات الوثيقة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الرقم التسلسلي</p>
                  <p className="font-medium">#{document.serialNumber}/{document.year}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الموضوع</p>
                  <p className="font-medium line-clamp-2">{document.subject}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              المستخدم المسؤول
            </Label>
            
            <Card className="border-2 border-gray-200">
              <CardContent className="p-5">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-full h-12 text-lg border-2 focus:border-primary transition-colors">
                    <SelectValue placeholder="اختر مستخدم..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                          <span>جاري التحميل...</span>
                        </div>
                      </SelectItem>
                    ) : departmentUsers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>لا يوجد مستخدمون في القسم</span>
                        </div>
                      </SelectItem>
                    ) : (
                      departmentUsers.map((user: User) => (
                        <SelectItem key={user._id} value={user._id} className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                              <UserIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user.username}</span>
                                <Badge variant="outline" className="text-xs">
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
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">تم اختيار المستخدم</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Info */}
          <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>القسم النشط: {currentUser?.activeDepartment?.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                سيتم عرض المستخدمين من هذا القسم فقط
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponsibleMutation.isPending}
            className="px-6 border-2 hover:bg-gray-50"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAssignResponsible}
            disabled={!selectedUser || assignResponsibleMutation.isPending}
            className="px-6 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {assignResponsibleMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>جاري التعيين...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>تعيين المسؤول</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponsibleDialog;
