import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getPersonnelList, deletePersonnel, getOrganizationSettings } from '@/services/hr/personnelApi';
import { getDepartments } from '@/services/departmentService';
import { Personnel, PersonnelFilters } from '@/types/hr';
import { Department } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/utils/errorMessages';
import PersonnelStatusBadge from '@/components/hr/PersonnelStatusBadge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
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
  Key,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { InlineCreateUserModal } from '@/components/hr/InlineCreateUserModal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export const PersonnelListPage: React.FC = () => {
  const { t } = useTranslation();
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

  // Modal de création rapide d'utilisateur pour une fiche Personnel
  const [selectedPersonnelForUser, setSelectedPersonnelForUser] = useState<Personnel | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Récupération des paramètres de l'organisation pour vérifier le département RH
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
  });

  const rhDeptRaw = orgSettings?.rhDepartmentId;
  const rhDepartmentId = (typeof rhDeptRaw === 'object' && rhDeptRaw !== null)
    ? rhDeptRaw._id?.toString()
    : rhDeptRaw?.toString();

  const userDeptRaw = currentUser?.activeDepartment;
  const userDeptId = (typeof userDeptRaw === 'object' && userDeptRaw !== null)
    ? userDeptRaw._id?.toString()
    : userDeptRaw?.toString();

  const isRHManager = 
    currentUser?.role === 'AdminDepartment' && 
    Boolean(rhDepartmentId) && 
    userDeptId === rhDepartmentId;

  // Droits utilisateurs (Admin ou Responsable RH)
  const canAddPersonnel = currentUser?.role === 'Admin' || isRHManager;
  const canDeletePersonnel = currentUser?.role === 'Admin' || isRHManager;

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
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
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
      toast.success(t('personnel.toasts.deleteSuccess'));
      setShowDeleteDialog(false);
      setPersonnelToDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, t('personnel.toasts.deleteError')));
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
                {t('personnel.page.title')}
              </h1>
              <p className="text-base text-gray-600 mt-1">
                {t('personnel.page.subtitle')}
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
            <span>{t('common.refresh')}</span>
          </Button>

          {canAddPersonnel && (
            <Button
              onClick={() => navigate('/dashboard/hr/personnel/new')}
              className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>{t('personnel.actions.create')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Barre de filtres */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-gray-700">
            <Filter className="w-4 h-4 text-[#2c5282]" />
            <span>{t('personnel.filters.title')}</span>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-11 px-3 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>{t('personnel.filters.reset')}</span>
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
              placeholder={t('personnel.filters.searchPlaceholder')}
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
                <SelectValue placeholder={t('personnel.filters.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ALL" className="text-base py-2 font-medium">{t('personnel.filters.allStatuses')}</SelectItem>
                <SelectItem value="en_attente" className="text-base py-2">{t('personnel.filters.statusPending')}</SelectItem>
                <SelectItem value="actif" className="text-base py-2">{t('personnel.filters.statusActive')}</SelectItem>
                <SelectItem value="inactif" className="text-base py-2">{t('personnel.filters.statusInactive')}</SelectItem>
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
                <SelectValue placeholder={t('personnel.filters.departmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="ALL" className="text-base py-2 font-medium">{t('personnel.filters.allDepartments')}</SelectItem>
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
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[220px]">
                  {t('personnel.table.fullName')}
                </TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[130px]">
                  {t('personnel.table.cin')}
                </TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[180px]">
                  {t('personnel.table.position')}
                </TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[180px]">
                  {t('personnel.table.department')}
                </TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[130px]">
                  {t('personnel.table.status')}
                </TableHead>
                <TableHead className="text-center py-3 px-4 text-sm font-bold text-[#2d3748] min-w-[160px]">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <TableSkeleton columns={6} rows={8} />
                  </TableCell>
                </TableRow>
              ) : personnelList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-10 h-10 text-gray-300" />
                      <p className="font-semibold text-gray-700">{t('personnel.empty.title')}</p>
                      <p className="text-sm text-gray-500">
                        {hasActiveFilters
                          ? t('personnel.empty.filtered')
                          : t('personnel.empty.start')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                personnelList.map((p) => {
                  const deptName = p.activeDepartment
                    ? typeof p.activeDepartment === 'object'
                      ? (p.activeDepartment as Department).name
                      : t('personnel.table.specificDept')
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
                      <TableCell className="py-3 px-4 font-bold text-[#1a202c] text-sm">
                        <div className="flex items-center gap-3">
                          <PersonnelAvatar
                            photo={p.photo}
                            nom={p.nom}
                            prenom={p.prenom}
                            size="sm"
                          />
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
                      <TableCell className="py-3 px-4 text-sm font-mono text-gray-700">
                        {p.cin || '—'}
                      </TableCell>

                      {/* Poste */}
                      <TableCell className="py-3 px-4 text-sm text-gray-800">
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
                      <TableCell className="py-3 px-4 text-sm text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{deptName}</span>
                        </span>
                      </TableCell>

                      {/* Statut Badge */}
                      <TableCell className="py-3 px-4">
                        <PersonnelStatusBadge statut={p.statut} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Voir détail */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/hr/personnel/${p._id}`)}
                            title={t('personnel.actions.viewTooltip')}
                            aria-label={t('personnel.actions.viewTooltip')}
                            className="h-11 w-11 p-0 text-gray-600 hover:text-[#2c5282] hover:bg-[#ebf4ff] rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Éditer */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/hr/personnel/${p._id}/edit`)}
                            title={t('personnel.actions.editTooltip')}
                            aria-label={t('personnel.actions.editTooltip')}
                            className="h-11 w-11 p-0 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Statut Compte Utilisateur / Création de compte (Admin uniquement) */}
                          {p.userId ? (
                            <span 
                              title={t('personnel.account.linkedActive')}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{t('personnel.account.linkedBadge')}</span>
                            </span>
                          ) : (
                            currentUser?.role === 'Admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPersonnelForUser(p);
                                  setShowCreateUserModal(true);
                                }}
                                title={t('personnel.account.createAccountTooltip')}
                                aria-label={t('personnel.account.createAccountAria')}
                                className="h-11 w-11 p-0 text-[#2c5282] hover:bg-blue-50 border border-blue-200 rounded"
                              >
                                <Key className="w-4 h-4 text-[#2c5282]" />
                              </Button>
                            )
                          )}

                          {/* Supprimer (si Admin ou Responsable RH et statut !== actif) */}
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
                                  ? t('personnel.actions.cannotDeleteActive')
                                  : t('personnel.actions.deleteTooltip')
                              }
                              aria-label={
                                p.statut === 'actif'
                                  ? t('personnel.actions.cannotDeleteActive')
                                  : t('personnel.actions.deleteTooltip')
                              }
                              className={`h-11 w-11 p-0 rounded ${
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
              {t('personnel.pagination.totalResultsPrefix')} <strong className="text-[#1a202c]">{pagination.total}</strong> {t('personnel.pagination.employeeCount')}
            </span>
            <span>•</span>
            <div className="flex items-center gap-2">
              <span>{t('personnel.pagination.perPage')}</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-20 text-sm bg-white border-[#cbd5e1] rounded">
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
              {t('personnel.pagination.pageInfo', { current: pagination.page, total: pagination.pages || 1 })}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-11 px-3 border-[#cbd5e1] text-gray-700 rounded hover:bg-white flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>{t('common.previous')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.pages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              className="h-11 px-3 border-[#cbd5e1] text-gray-700 rounded hover:bg-white flex items-center gap-1"
            >
              <span>{t('common.next')}</span>
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
              {t('personnel.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700 mt-2">
              {t('personnel.delete.description', {
                name: `${personnelToDelete?.nom || ''} ${personnelToDelete?.prenom || ''}`.trim(),
                cin: personnelToDelete?.cin ? ` (CIN: ${personnelToDelete.cin})` : ''
              })}
              <br />
              {t('personnel.delete.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 justify-end mt-4">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="h-11 px-4 rounded text-gray-700"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-11 px-5 rounded bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {deleteMutation.isPending ? t('personnel.delete.deleting') : t('personnel.delete.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de création rapide d'utilisateur pour la fiche Personnel */}
      <InlineCreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          setSelectedPersonnelForUser(null);
        }}
        personnel={selectedPersonnelForUser}
        departments={departments}
        orgSettings={orgSettings || null}
      />
    </div>
  );
};

export default PersonnelListPage;
