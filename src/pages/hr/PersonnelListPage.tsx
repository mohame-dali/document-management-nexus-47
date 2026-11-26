import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonnelList, deletePersonnel, getOrganizationSettings } from '@/services/hr/personnelApi';
import { getDepartments } from '@/services/departmentService';
import { Personnel, PersonnelFilters } from '@/types/hr';
import { Department } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useDirection } from '@/i18n/useDirection';
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
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { InlineCreateUserModal } from '@/components/hr/InlineCreateUserModal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export const PersonnelListPage: React.FC = () => {
  const { t } = useTranslation();
  const { dir, isRTL } = useDirection();
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
    isError,
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

  const activeOnPageCount = personnelList.filter((p) => p.statut === 'actif').length;
  const linkedOnPageCount = personnelList.filter(
    (p) => p.userId && typeof p.userId === 'object' && !p.userId.isDeleted
  ).length;
  const awaitingAccountCount = personnelList.length - linkedOnPageCount;

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-5 text-start" dir={dir}>
      {/* 1. Compact Unboxed Institutional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {t('personnel.page.title')}
            </h1>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 truncate">
              {t('personnel.page.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 px-3.5 text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh')}</span>
          </Button>

          {canAddPersonnel && (
            <Button
              onClick={() => navigate('/dashboard/hr/personnel/new')}
              className="h-10 px-4 text-sm font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('personnel.actions.create')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Unified Operational Panel: Summary + Filters + Table + Pagination */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden">
        {/* Toolbar & Inline Summary Strip */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Filter className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />
              <span>{t('personnel.filters.title')}</span>
            </div>

            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
              <span>
                {isRTL ? 'الإجمالي:' : 'Total :'}{' '}
                <strong className="font-bold text-slate-900 dark:text-slate-100">{pagination.total}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                {isRTL ? 'نشطون:' : 'Actifs :'}{' '}
                <strong className="font-bold text-emerald-700 dark:text-emerald-400">{activeOnPageCount}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                {isRTL ? 'بدون حساب:' : 'Sans compte :'}{' '}
                <strong className="font-bold text-amber-700 dark:text-amber-400">{awaitingAccountCount}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                {isRTL ? 'الأقسام:' : 'Départements :'}{' '}
                <strong className="font-bold text-slate-900 dark:text-slate-100">{departments.length}</strong>
              </span>
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('personnel.filters.reset')}</span>
            </Button>
          )}
        </div>

        {/* Filter Inputs Row */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Recherche par nom, prénom ou CIN */}
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 dark:text-slate-300 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={t('personnel.filters.searchPlaceholder')}
              className="h-10 text-sm ps-10 pe-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
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
              <SelectTrigger className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder={t('personnel.filters.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm py-2 font-medium">{t('personnel.filters.allStatuses')}</SelectItem>
                <SelectItem value="en_attente" className="text-sm py-2">{t('personnel.filters.statusPending')}</SelectItem>
                <SelectItem value="actif" className="text-sm py-2">{t('personnel.filters.statusActive')}</SelectItem>
                <SelectItem value="inactif" className="text-sm py-2">{t('personnel.filters.statusInactive')}</SelectItem>
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
              <SelectTrigger className="h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]">
                <SelectValue placeholder={t('personnel.filters.departmentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm py-2 font-medium">{t('personnel.filters.allDepartments')}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id} className="text-sm py-2">
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tableau des données */}
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto custom-scrollbar">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 text-start py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[220px] border-e border-slate-200/60 dark:border-slate-700/60">
                  {t('personnel.table.fullName')}
                </TableHead>
                <TableHead className="text-start py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[130px]">
                  {t('personnel.table.cin')}
                </TableHead>
                <TableHead className="text-start py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[180px]">
                  {t('personnel.table.position')}
                </TableHead>
                <TableHead className="text-start py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[180px]">
                  {t('personnel.table.department')}
                </TableHead>
                <TableHead className="text-start py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[180px]">
                  {t('personnel.table.status')}
                </TableHead>
                <TableHead className="text-center py-3 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[160px]">
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
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6">
                    <EmptyState
                      icon={<AlertCircle className="h-6 w-6 text-[#b91c1c]" />}
                      title={t('personnel.error.title')}
                      description={t('personnel.error.description')}
                      className="border-red-200 bg-red-50/40"
                      action={
                        <Button
                          type="button"
                          onClick={() => refetch()}
                          className="h-11 px-5 bg-[#2c5282] hover:bg-[#1e3a5f] text-white text-base font-semibold rounded inline-flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>{t('common.retry')}</span>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : personnelList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-6">
                    <EmptyState
                      icon={<Users className="h-6 w-6 text-[#2c5282]" />}
                      title={t('personnel.empty.title')}
                      description={hasActiveFilters ? t('personnel.empty.filtered') : t('personnel.empty.start')}
                      className="border-0 bg-transparent py-4"
                      action={
                        hasActiveFilters ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="h-11 border-[#cbd5e1] text-sm"
                          >
                            {t('personnel.filters.reset')}
                          </Button>
                        ) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                personnelList.map((p) => {
                  const deptName = p.activeDepartment
                    ? typeof p.activeDepartment === 'object'
                      ? (p.activeDepartment as Department).name
                      : t('personnel.table.specificDept')
                    : '—';

                  const hasLinkedAccount = Boolean(
                    p.userId && typeof p.userId === 'object' && !p.userId.isDeleted
                  );

                  return (
                    <TableRow
                      key={p._id}
                      className="group border-b border-slate-200/70 dark:border-slate-800 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors"
                      style={{ minHeight: '64px' }}
                    >
                      {/* Nom complet */}
                      <TableCell className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-3 px-4 font-bold text-[#1a202c] dark:text-slate-100 text-sm border-e border-slate-200/60 dark:border-slate-800">
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
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-normal tabular-nums" dir="ltr">
                                {p.telephone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* CIN */}
                      <TableCell className="py-3 px-4 text-sm font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {p.cin || '—'}
                      </TableCell>

                      {/* Poste */}
                      <TableCell className="py-3 px-4 text-sm text-slate-800 dark:text-slate-200">
                        {p.poste ? (
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                            <span>{p.poste}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      {/* Département */}
                      <TableCell className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                        {deptName !== '—' ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                            <span>{deptName}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      {/* Statut Badge + Compte utilisateur */}
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PersonnelStatusBadge statut={p.statut} />
                          {hasLinkedAccount ? (
                            <span
                              title={t('personnel.account.linkedActive')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 rounded-full text-xs font-medium"
                            >
                              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{t('personnel.account.linkedBadge')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{isRTL ? 'بدون حساب' : 'Sans compte'}</span>
                            </span>
                          )}
                        </div>
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
                            className="h-11 w-11 p-0 text-slate-600 dark:text-slate-300 hover:text-[#2c5282] dark:hover:text-blue-300 hover:bg-blue-50/90 dark:hover:bg-blue-950/50 rounded-lg"
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
                            className="h-11 w-11 p-0 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50/90 dark:hover:bg-amber-950/50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Création rapide de compte utilisateur (Admin uniquement si non lié) */}
                          {!hasLinkedAccount && currentUser?.role === 'Admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPersonnelForUser(p);
                                setShowCreateUserModal(true);
                              }}
                              title={t('personnel.account.createAccountTooltip')}
                              aria-label={t('personnel.account.createAccountAria')}
                              className="h-11 w-11 p-0 text-[#2c5282] dark:text-blue-300 hover:bg-blue-50/90 dark:hover:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/70 rounded-lg"
                            >
                              <Key className="w-4 h-4 text-[#2c5282] dark:text-blue-300" />
                            </Button>
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
                              className={`h-11 w-11 p-0 rounded-lg ${
                                p.statut === 'actif'
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
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
        <div className="bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
            <span>
              {t('personnel.pagination.totalResultsPrefix')} <strong className="text-[#1a202c] dark:text-slate-100 tabular-nums">{pagination.total}</strong> {t('personnel.pagination.employeeCount')}
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
                <SelectTrigger className="h-11 w-20 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg tabular-nums">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300 me-2 tabular-nums">
              {t('personnel.pagination.pageInfo', { current: pagination.page, total: pagination.pages || 1 })}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-11 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{t('common.previous')}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pagination.pages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
              className="h-11 px-3 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <span>{t('common.next')}</span>
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent
          className="text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-lg"
          dir={dir}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
              {t('personnel.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-700 dark:text-slate-300 mt-2">
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
              className="h-11 px-4 rounded-lg text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="h-11 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold"
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
