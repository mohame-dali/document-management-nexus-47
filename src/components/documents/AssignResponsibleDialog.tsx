import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { assignResponsible } from '@/services/documentService';
import { getAssignableUsers } from '@/services/userService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { showResponsibleAssignmentNotification } from '@/components/notifications/ResponsibleAssignmentNotification';
import { Department, IncomingDocument, ResponsibleUserRef } from '@/types';
import {
  extractDeptMeta,
  getUserDepartmentLabel,
  isBureauDirecteurDepartment,
  isBureauOrdreDepartment,
  isRhDepartment,
  NormalizedDeptMeta,
} from '@/utils/departmentScope';
import { UserPlus, Users, CheckCircle2, User as UserIcon, Shield, Building2 } from 'lucide-react';

interface AssignResponsibleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IncomingDocument;
}

function getUserDisplayName(user: ResponsibleUserRef): { primary: string; secondary?: string } {
  const personnel =
    user.personnelId && typeof user.personnelId === 'object' ? user.personnelId : null;
  const fullName = personnel
    ? [personnel.prenom, personnel.nom].filter(Boolean).join(' ').trim()
    : [user.prenom, user.nom].filter(Boolean).join(' ').trim() || user.name?.trim() || '';

  if (fullName && fullName.toLowerCase() !== user.username.toLowerCase()) {
    return { primary: fullName, secondary: user.username };
  }
  return { primary: fullName || user.username };
}

const AssignResponsibleDialog: React.FC<AssignResponsibleDialogProps> = ({
  open,
  onOpenChange,
  document
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>('');

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const rhDeptId = extractDeptMeta(orgSettings?.rhDepartmentId).id;
  const bdDeptId = extractDeptMeta(orgSettings?.bureauDirecteurDepartmentId).id;
  const boDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;

  // Determine target departments from activeDepartment (for AdminDepartment) or document.assignedTo (for Admin)
  const targetDepartments = useMemo<NormalizedDeptMeta[]>(() => {
    const activeMeta = extractDeptMeta(
      currentUser?.activeDepartment ||
        (currentUser?.role === 'AdminDepartment' ? currentUser?.departments?.[0] : null)
    );
    if (activeMeta.id || activeMeta.name || activeMeta.code) {
      return [activeMeta];
    }

    if (Array.isArray(document?.assignedTo) && document.assignedTo.length > 0) {
      return document.assignedTo
        .map((entry) => {
          const innerMeta = extractDeptMeta(entry.id);
          const fallbackName = typeof entry.name === 'string' ? entry.name.trim() : '';
          return {
            id: innerMeta.id,
            name: innerMeta.name || fallbackName.toLowerCase(),
            code: innerMeta.code,
            displayName: innerMeta.displayName || fallbackName,
          };
        })
        .filter((meta) => Boolean(meta.id || meta.name || meta.code));
    }

    return [];
  }, [currentUser?.activeDepartment, currentUser?.departments, currentUser?.role, document?.assignedTo]);

  const isRhScope = useMemo(
    () => targetDepartments.some((dept) => isRhDepartment(dept, rhDeptId)),
    [targetDepartments, rhDeptId]
  );

  const targetDeptIdParam = useMemo(() => {
    const ids = targetDepartments.map((d) => d.id).filter(Boolean);
    return ids.length > 0 ? ids.join(',') : undefined;
  }, [targetDepartments]);

  // Fetch assignable users for the active/target department scope
  const { data: users = [], isLoading } = useQuery<ResponsibleUserRef[]>({
    queryKey: ['assignableUsers', currentUser?.role || 'guest', targetDeptIdParam || 'all'],
    queryFn: () => getAssignableUsers(targetDeptIdParam),
    enabled: open,
  });

  const assignResponsibleMutation = useMutation({
    mutationFn: ({ documentId, userId }: { documentId: string, userId: string }) =>
      assignResponsible(documentId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocument'] });
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      
      // Refresh responsible notifications to show new notification immediately
      queryClient.invalidateQueries({ queryKey: ['unreadResponsibleNotifications'] });
      
      // Find the assigned user
      const assignedUser = users.find((user) => user._id === variables.userId);
      
      // Show instant notification for the assignment
      if (assignedUser) {
        showResponsibleAssignmentNotification({
          documentId: document._id,
          documentSubject: document.subject,
          assignedBy: currentUser?.username || t('documents.assignResponsible.defaultAssigner')
        });
      }
      
      toast.success(t('documents.assignResponsible.success'));
      onOpenChange(false);
      setSelectedUser('');
    },
    onError: (error: unknown) => {
      const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(errorMsg || t('documents.assignResponsible.error'));
    }
  });

  const handleAssignResponsible = () => {
    if (!selectedUser) {
      toast.error(t('documents.assignResponsible.selectUserPrompt'));
      return;
    }

    assignResponsibleMutation.mutate({
      documentId: document._id,
      userId: selectedUser
    });
  };

  // Filter users cleanly with normalized ID, name, and code comparisons plus Bureau Directeur / BO scope rules
  const departmentUsers = useMemo(() => {
    return users.filter((user) => {
      if (user.isActive === false || user.isDeleted) return false;
      if (user.role === 'Admin') return false;

      if (targetDepartments.length === 0) {
        return currentUser?.role === 'Admin';
      }

      const userDepts: Array<Department | string> = [
        ...(Array.isArray(user.departments) ? user.departments : []),
        ...(user.activeDepartment ? [user.activeDepartment] : []),
      ];

      return userDepts.some((uDept) => {
        const uMeta = extractDeptMeta(uDept);
        const matchesDirectTarget = targetDepartments.some((target) => {
          if (target.id && uMeta.id && uMeta.id === target.id) return true;
          if (target.code && uMeta.code && uMeta.code === target.code) return true;
          if (target.name && uMeta.name && uMeta.name === target.name) return true;
          return false;
        });
        if (matchesDirectTarget) return true;
        if (isBureauDirecteurDepartment(uDept, bdDeptId)) return true;
        if (isRhScope && isBureauOrdreDepartment(uDept, boDeptId)) return true;
        return false;
      });
    });
  }, [users, targetDepartments, currentUser?.role, bdDeptId, boDeptId, isRhScope]);

  const activeDepartmentLabel =
    currentUser?.activeDepartment?.name ||
    (Array.isArray(document?.assignedTo)
      ? document.assignedTo.map((d) => d.name).filter(Boolean).join(', ')
      : '') ||
    t('dashboard.header.defaultDepartment');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg">
        <DialogHeader className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 text-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 rounded-lg shrink-0">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-blue-300">
                {t('documents.assignResponsible.title')}
              </DialogTitle>
              <p className="text-base text-slate-600 dark:text-slate-300 mt-1">
                {t('documents.assignResponsible.subtitle')}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/70 dark:bg-slate-950">
          {/* Document Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <UserIcon className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{t('documents.assignResponsible.docInfo')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('documents.assignResponsible.serialNumber')}</p>
                <p className="font-bold text-[#2c5282] dark:text-blue-300 tabular-nums mt-0.5"><bdi dir="ltr">#{document.serialNumber}/{document.year}</bdi></p>
              </div>
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('documents.assignResponsible.subject')}</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5">{document.subject}</p>
              </div>
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-3">
            <Label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
              {t('documents.assignResponsible.responsibleUser')}
            </Label>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 shadow-sm">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-full h-12 text-base border-slate-300 dark:border-slate-700 rounded-lg focus:border-[#2c5282] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <SelectValue placeholder={t('documents.assignResponsible.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg">
                  {isLoading ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#2c5282] dark:border-blue-400"></div>
                        <span>{t('documents.assignResponsible.loadingUsers')}</span>
                      </div>
                    </SelectItem>
                  ) : departmentUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 py-2">
                        <Users className="h-4 w-4" />
                        <span>{t('documents.assignResponsible.noUsersInDepartment')}</span>
                      </div>
                    </SelectItem>
                  ) : (
                    departmentUsers.map((user) => {
                      const display = getUserDisplayName(user);
                      const roleLabel = user.role ? t(`roles.${user.role}`, { defaultValue: user.role }) : '';
                      const deptLabel = getUserDepartmentLabel(user);
                      return (
                        <SelectItem key={user._id} value={user._id} className="py-2.5 text-base">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 rounded-lg shrink-0">
                              <UserIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 text-start">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{display.primary}</span>
                                {display.secondary && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">@{display.secondary}</span>
                                )}
                                {deptLabel && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-[#2c5282] border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/60"
                                  >
                                    <Building2 className="h-3 w-3 me-1" />
                                    {deptLabel}
                                  </Badge>
                                )}
                                {roleLabel && (
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-slate-200/80 dark:border-slate-700">
                                    <Shield className="h-3 w-3 me-1" />
                                    {roleLabel}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              
              {selectedUser && (
                <div className="mt-4 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-base font-bold">{t('documents.assignResponsible.userSelectedSuccess')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Department Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 text-base shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
              <Shield className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
              <span>{t('documents.assignResponsible.activeDepartment', { department: activeDepartmentLabel })}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
              {isRhScope
                ? t('documents.assignResponsible.scopeNoticeRh')
                : t('documents.assignResponsible.scopeNoticeStandard')}
            </p>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 flex-row-reverse justify-start gap-3">
          <Button
            onClick={handleAssignResponsible}
            disabled={!selectedUser || assignResponsibleMutation.isPending}
            className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded-lg disabled:opacity-50"
          >
            {assignResponsibleMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>{t('documents.assignResponsible.submitting')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <span>{t('documents.assignResponsible.confirm')}</span>
              </div>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponsibleMutation.isPending}
            className="h-11 px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-medium rounded-lg text-slate-700 dark:text-slate-200"
          >
            {t('documents.assignResponsible.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponsibleDialog;
