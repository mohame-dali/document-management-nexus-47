import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  RHStage,
  StageFilters,
  getStages,
  deleteStage,
  getStagesStats,
} from '@/services/rhStageService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StageFormDialog } from '@/components/hr/StageFormDialog';
import { formatLongDate } from '@/utils/formatDate';
import { toast } from 'sonner';
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Globe2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export const RHStagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();

  const canManageStages = ['Admin', 'AdminDepartment'].includes(currentUser?.role || '');

  const [searchTerm, setSearchTerm] = useState('');
  const [localisationFilter, setLocalisationFilter] = useState<string>('ALL');
  const [statutFilter, setStatutFilter] = useState<string>('ALL');
  const [anneeFilter, setAnneeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<RHStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<RHStage | null>(null);
  const [stageToView, setStageToView] = useState<RHStage | null>(null);

  const queryParams: StageFilters = {
    page: currentPage,
    limit,
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(localisationFilter !== 'ALL' ? { localisation: localisationFilter } : {}),
    ...(statutFilter !== 'ALL' ? { statut: statutFilter } : {}),
    ...(anneeFilter !== 'ALL' ? { annee: anneeFilter } : {}),
  };

  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['rh-stages', queryParams],
    queryFn: () => getStages(queryParams),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const { data: statsData } = useQuery({
    queryKey: ['rh-stage-stats', anneeFilter],
    queryFn: () => getStagesStats(anneeFilter !== 'ALL' ? { annee: anneeFilter } : undefined),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });

  const stagesList = responseData?.data || [];
  const pagination = responseData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStage(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rh-stages'] });
      queryClient.invalidateQueries({ queryKey: ['rh-stage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-stages'] });
      toast.success(isRTL ? 'تم حذف التربص بنجاح' : 'Stage supprimé avec succès');
      if (res?.warning) toast.warning(res.warning);
      setStageToDelete(null);
    },
    onError: (error: unknown) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || (isRTL ? 'تعذر حذف التربص' : 'Impossible de supprimer le stage'));
    },
  });

  const handleDeleteConfirm = () => {
    if (stageToDelete) deleteMutation.mutate(stageToDelete._id);
  };

  const handleOpenCreate = () => {
    setEditingStage(null);
    setShowFormDialog(true);
  };

  const handleOpenEdit = (stage: RHStage) => {
    setEditingStage(stage);
    setShowFormDialog(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setLocalisationFilter('ALL');
    setStatutFilter('ALL');
    setAnneeFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    localisationFilter !== 'ALL' ||
    statutFilter !== 'ALL' ||
    anneeFilter !== 'ALL';

  const renderStatutBadge = (st: string) => {
    switch (st) {
      case 'acheve':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
            {isRTL ? 'مكتمل' : 'Achevé'}
          </span>
        );
      case 'en_cours':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
            {isRTL ? 'قيد الإنجاز' : 'En cours'}
          </span>
        );
      case 'inscrit':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
            {isRTL ? 'مسجل' : 'Inscrit'}
          </span>
        );
      case 'suspendu':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
            {isRTL ? 'معلق' : 'Suspendu'}
          </span>
        );
      case 'abandonne':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200/80 dark:border-red-800">
            {isRTL ? 'ملغى / منسحب' : 'Abandonné'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            {st}
          </span>
        );
    }
  };

  const renderResultatBadge = (res?: string) => {
    switch (res) {
      case 'admis':
        return (
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800">
            {isRTL ? 'ناجح' : 'Admis'}
          </span>
        );
      case 'refuse':
        return (
          <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200/80 dark:border-red-800">
            {isRTL ? 'راسب' : 'Refusé'}
          </span>
        );
      case 'en_attente':
        return (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800">
            {isRTL ? 'في الانتظار' : 'En attente'}
          </span>
        );
      default:
        return <span className="text-xs text-slate-700 dark:text-slate-300">—</span>;
    }
  };

  return (
    <div className="space-y-3.5 text-start" dir={dir}>
      {/* Unified Operational Panel: Compact KPI Strip + Filters + Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {/* Compact Single-Row KPI Strip + Primary Actions */}
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              <GraduationCap className="w-4 h-4 text-[#2c5282] dark:text-blue-300 shrink-0" />
              <span>{isRTL ? 'التربصات والتكوين' : 'Stages et formations'}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              {isRTL ? 'الإجمالي:' : 'Total :'}{' '}
              <strong className="font-bold text-[#2c5282] dark:text-blue-400">{statsData?.total ?? pagination.total}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              {isRTL ? 'بتونس:' : 'En Tunisie :'}{' '}
              <strong className="font-bold text-emerald-700 dark:text-emerald-400">{statsData?.parLocalisation?.tunisie ?? 0}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              {isRTL ? 'بالخارج:' : "À l'étranger :"}{' '}
              <strong className="font-bold text-blue-700 dark:text-blue-400">{statsData?.parLocalisation?.etranger ?? 0}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>
              {isRTL ? 'الناجحون:' : 'Admis :'}{' '}
              <strong className="font-bold text-indigo-700 dark:text-indigo-400">{statsData?.parResultat?.admis ?? 0}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isRTL ? 'إلغاء التصفية' : 'Réinitialiser'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isRTL ? 'تحديث' : 'Actualiser'}</span>
            </Button>

            {canManageStages && (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="h-9 px-3.5 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isRTL ? 'إضافة تربص جديد' : 'Nouveau stage'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-700 dark:text-slate-300 absolute start-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isRTL ? 'البحث بالموضوع أو المكان...' : 'Rechercher par sujet ou lieu...'}
              className="h-9 ps-9 pe-3 text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg"
            />
          </div>

          <div>
            <Select
              value={localisationFilter}
              onValueChange={(val) => {
                setLocalisationFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder={isRTL ? 'نطاق التربص' : 'Localisation'} />
              </SelectTrigger>
              <SelectContent className="text-start" dir={dir}>
                <SelectItem value="ALL">{isRTL ? 'جميع النطاقات (تونس والخارج)' : 'Toutes localisations'}</SelectItem>
                <SelectItem value="tunisie">{isRTL ? 'داخل تونس' : 'En Tunisie'}</SelectItem>
                <SelectItem value="etranger">{isRTL ? 'بالخارج' : "À l'étranger"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={statutFilter}
              onValueChange={(val) => {
                setStatutFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder={isRTL ? 'حالة التربص' : 'Statut'} />
              </SelectTrigger>
              <SelectContent className="text-start" dir={dir}>
                <SelectItem value="ALL">{isRTL ? 'جميع الحالات' : 'Tous les statuts'}</SelectItem>
                <SelectItem value="acheve">{isRTL ? 'مكتمل' : 'Achevé'}</SelectItem>
                <SelectItem value="en_cours">{isRTL ? 'قيد الإنجاز' : 'En cours'}</SelectItem>
                <SelectItem value="inscrit">{isRTL ? 'مسجل' : 'Inscrit'}</SelectItem>
                <SelectItem value="suspendu">{isRTL ? 'معلق' : 'Suspendu'}</SelectItem>
                <SelectItem value="abandonne">{isRTL ? 'ملغى / منسحب' : 'Abandonné'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={anneeFilter}
              onValueChange={(val) => {
                setAnneeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder={isRTL ? 'السنة' : 'Année'} />
              </SelectTrigger>
              <SelectContent className="text-start max-h-52" dir={dir}>
                <SelectItem value="ALL">{isRTL ? 'جميع السنوات' : 'Toutes les années'}</SelectItem>
                {Array.from({ length: 11 }, (_, i) => 2030 - i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stages Table */}
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : stagesList.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-10 h-10 text-slate-700 dark:text-slate-300" />}
            title={isRTL ? 'لا توجد تربصات مسجلة' : 'Aucun stage trouvé'}
            description={
              isRTL
                ? 'لم يتم العثور على أي تربص يطابق معايير البحث الحالية.'
                : 'Aucun stage ne correspond aux filtres sélectionnés.'
            }
            action={
              canManageStages ? (
                <Button
                  onClick={handleOpenCreate}
                  className="h-9 px-4 text-xs bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg font-bold"
                >
                  {isRTL ? 'إضافة تربص جديد' : 'Nouveau stage'}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[650px]">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
                  <TableHead className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'الموظف' : 'Employé'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'موضوع التربص' : 'Sujet'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'مكان التربص / الدولة' : 'Lieu / Pays'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'الفترة' : 'Période'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'المدة' : 'Durée'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'الحالة' : 'Statut'}
                  </TableHead>
                  <TableHead className="text-start py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'النتيجة' : 'Résultat'}
                  </TableHead>
                  <TableHead className="text-center py-3 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stagesList.map((stage) => {
                  const personnel = typeof stage.personnelId === 'object' ? stage.personnelId : null;
                  return (
                    <TableRow key={stage._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors border-slate-200 dark:border-slate-800">
                      <TableCell className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-3 px-4 whitespace-nowrap transition-colors">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {personnel ? `${personnel.nom} ${personnel.prenom}` : '—'}
                        </div>
                        {personnel?.cin && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                            {isRTL ? `ب.ت.و: ${personnel.cin}` : `CIN : ${personnel.cin}`}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {stage.sujetStage}
                        </div>
                        {stage.numeroRoute && (
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            {isRTL ? 'رقم الإرسالية:' : 'N° route :'}{' '}
                            <span className="font-mono tabular-nums">{stage.numeroRoute}</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {stage.localisation === 'etranger' ? (
                            <Globe2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          <span>{stage.lieuStage}</span>
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          {stage.localisation === 'etranger'
                            ? `${isRTL ? 'الدولة:' : 'Pays :'} ${stage.pays}`
                            : isRTL
                            ? 'تونس'
                            : 'Tunisie'}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        <div>
                          {isRTL ? 'من:' : 'Du :'}{' '}
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(stage.dateDebut, isRTL ? 'ar' : 'fr')}</bdi>
                        </div>
                        <div>
                          {isRTL ? 'إلى:' : 'Au :'}{' '}
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(stage.dateFin, isRTL ? 'ar' : 'fr')}</bdi>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                        {stage.duree ? `${stage.duree} ${isRTL ? 'يوم' : 'j'}` : '—'}
                      </TableCell>

                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {renderStatutBadge(stage.statut)}
                      </TableCell>

                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {renderResultatBadge(stage.resultat)}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStageToView(stage)}
                            className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                            title={isRTL ? 'عرض التفاصيل' : 'Voir les détails'}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canManageStages && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(stage)}
                                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg"
                                title={isRTL ? 'تعديل' : 'Modifier'}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStageToDelete(stage)}
                                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                                title={isRTL ? 'حذف' : 'Supprimer'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-900">
            <div className="text-slate-700 dark:text-slate-300 tabular-nums">
              {isRTL ? (
                <>
                  إجمالي النتائج: <strong className="text-slate-800 dark:text-slate-200">{pagination.total}</strong> (الصفحة {pagination.page} من {pagination.pages})
                </>
              ) : (
                <>
                  Total : <strong className="text-slate-800 dark:text-slate-200">{pagination.total}</strong> (Page {pagination.page} / {pagination.pages})
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="h-9 px-3 rounded-lg dark:border-slate-700 dark:text-slate-200"
              >
                {isRTL ? <ChevronRight className="w-4 h-4 me-1" /> : <ChevronLeft className="w-4 h-4 me-1" />}
                <span>{isRTL ? 'السابق' : 'Précédent'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage >= pagination.pages}
                className="h-9 px-3 rounded-lg dark:border-slate-700 dark:text-slate-200"
              >
                <span>{isRTL ? 'التالي' : 'Suivant'}</span>
                {isRTL ? <ChevronLeft className="w-4 h-4 ms-1" /> : <ChevronRight className="w-4 h-4 ms-1" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Création / Édition */}
      <StageFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        stage={editingStage}
      />

      {/* Dialog Détail d'un stage */}
      <Dialog open={Boolean(stageToView)} onOpenChange={(open) => !open && setStageToView(null)}>
        <DialogContent className="max-w-lg text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-lg" dir={dir}>
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
              <span>{isRTL ? 'تفاصيل التربص' : 'Détails du stage'}</span>
            </DialogTitle>
          </DialogHeader>

          {stageToView && (
            <div className="space-y-4 pt-2 text-sm">
              <div>
                <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                  {isRTL ? 'الموظف' : 'Employé'}
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {typeof stageToView.personnelId === 'object'
                    ? `${stageToView.personnelId.nom} ${stageToView.personnelId.prenom}`
                    : '—'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'موضوع التربص' : 'Sujet'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stageToView.sujetStage}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'المكان / الدولة' : 'Lieu / Pays'}
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {stageToView.lieuStage}{' '}
                    {stageToView.localisation === 'etranger'
                      ? `(${stageToView.pays})`
                      : isRTL
                      ? '(تونس)'
                      : '(Tunisie)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'الفترة' : 'Période'}
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                    <bdi dir={dir} className="tabular-nums">{formatLongDate(stageToView.dateDebut, isRTL ? 'ar' : 'fr')}</bdi>{' '}
                    {isRTL ? 'إلى' : 'au'}{' '}
                    <bdi dir={dir} className="tabular-nums">{formatLongDate(stageToView.dateFin, isRTL ? 'ar' : 'fr')}</bdi>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'المدة المحتسبة' : 'Durée'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {stageToView.duree || 0} {isRTL ? 'يوم' : 'jours'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">{isRTL ? 'الحالة' : 'Statut'}</span>
                  <div className="mt-1">{renderStatutBadge(stageToView.statut)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">{isRTL ? 'النتيجة' : 'Résultat'}</span>
                  <div className="mt-1">{renderResultatBadge(stageToView.resultat)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">{isRTL ? 'الملاحظة / التقدير' : 'Mention'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{stageToView.mention || '—'}</span>
                </div>
              </div>

              {stageToView.numeroRoute && (
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'رقم الإرسالية' : 'N° route'}
                  </span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{stageToView.numeroRoute}</span>
                </div>
              )}

              {stageToView.observations && (
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">
                    {isRTL ? 'ملاحظات' : 'Observations'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-line">
                    {stageToView.observations}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog Suppression */}
      <AlertDialog open={Boolean(stageToDelete)} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <AlertDialogContent className="text-start rounded-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-lg" dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>{isRTL ? 'تأكيد حذف التربص' : 'Confirmer la suppression'}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-700 dark:text-slate-300 mt-2">
              {isRTL
                ? 'هل أنت متأكد من حذف هذا التربص نهائياً من سجل الموظف؟'
                : 'Êtes-vous sûr de vouloir supprimer définitivement ce stage ?'}
              {stageToDelete && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300 text-xs font-semibold">
                  {stageToDelete.sujetStage} ({stageToDelete.lieuStage})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs rounded-lg dark:border-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
              {isRTL ? 'إلغاء' : 'Annuler'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              {isRTL ? 'تأكيد الحذف' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RHStagesPage;
