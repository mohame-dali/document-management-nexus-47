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
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Globe2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

export const RHStagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();

  // Droits utilisateurs
  const canManageStages = ['Admin', 'AdminDepartment'].includes(currentUser?.role || '');

  // États des filtres et pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [localisationFilter, setLocalisationFilter] = useState<string>('ALL');
  const [statutFilter, setStatutFilter] = useState<string>('ALL');
  const [anneeFilter, setAnneeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modales
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<RHStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<RHStage | null>(null);
  const [stageToView, setStageToView] = useState<RHStage | null>(null);

  // Paramètres de requête
  const queryParams: StageFilters = {
    page: currentPage,
    limit,
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
    ...(localisationFilter !== 'ALL' ? { localisation: localisationFilter } : {}),
    ...(statutFilter !== 'ALL' ? { statut: statutFilter } : {}),
    ...(anneeFilter !== 'ALL' ? { annee: anneeFilter } : {}),
  };

  // Récupération de la liste paginée
  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['rh-stages', queryParams],
    queryFn: () => getStages(queryParams),
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  // Récupération des statistiques
  const { data: statsData } = useQuery({
    queryKey: ['rh-stage-stats', anneeFilter],
    queryFn: () => getStagesStats(anneeFilter !== 'ALL' ? { annee: anneeFilter } : undefined),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  const stagesList = responseData?.data || [];
  const pagination = responseData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  };

  // Mutation de suppression
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStage(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rh-stages'] });
      queryClient.invalidateQueries({ queryKey: ['rh-stage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['personnel-stages'] });
      toast.success('تم حذف التربص بنجاح');
      if (res?.warning) {
        toast.warning(res.warning);
      }
      setStageToDelete(null);
    },
    onError: (error: unknown) => {
      const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast.error(msg || 'تعذر حذف التربص');
    },
  });

  const handleDeleteConfirm = () => {
    if (stageToDelete) {
      deleteMutation.mutate(stageToDelete._id);
    }
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

  // Badge statut
  const renderStatutBadge = (st: string) => {
    switch (st) {
      case 'acheve':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">مكتمل</span>;
      case 'en_cours':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">قيد الإنجاز</span>;
      case 'inscrit':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">مسجل</span>;
      case 'suspendu':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">معلق</span>;
      case 'abandonne':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200/80 dark:border-red-800">ملغى / منسحب</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">{st}</span>;
    }
  };

  // Badge résultat
  const renderResultatBadge = (res?: string) => {
    switch (res) {
      case 'admis':
        return <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800">ناجح</span>;
      case 'refuse':
        return <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 px-2.5 py-0.5 rounded-full border border-red-200/80 dark:border-red-800">راسب</span>;
      case 'en_attente':
        return <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800">في الانتظار</span>;
      default:
        return <span className="text-xs text-slate-700 dark:text-slate-300">—</span>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-start" dir={dir}>
      {/* 1. En-tête */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-100 dark:border-blue-900">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium mb-0.5">
                <span>الموارد البشرية</span>
                <span>/</span>
                <span className="text-[#2c5282] dark:text-blue-400 font-bold">التربصات والتكوين</span>
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  جميع التربصات
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                  عرض شامل
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1">
                عرض وإدارة تربصات جميع الموظفين (بتونس وبالخارج)
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
            className="h-11 px-4 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          {canManageStages && (
            <Button
              onClick={handleOpenCreate}
              className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة تربص جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bandeau info */}
      <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/70 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#2c5282] dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#2c5282] dark:text-blue-200">
          <p className="font-semibold mb-1">عرض شامل لجميع التربصات</p>
          <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
            هذه الصفحة تعرض تربصات جميع الموظفين لإتاحة نظرة شاملة 
            وإحصائيات. لإضافة تربص لموظف معين أو الاطلاع على مساره 
            الكامل، افتح ملفه الشخصي وانتقل إلى تبويب &quot;تربصات هذا الموظف&quot;.
          </p>
        </div>
      </div>

      {/* 2. Barre de synthèse / Statistiques sobres */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-[#2c5282] dark:border-t-sky-500 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">إجمالي التربصات</div>
              <div className="text-2xl font-extrabold text-[#2c5282] dark:text-blue-400 font-mono tabular-nums">{statsData.total || 0}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-emerald-500 dark:border-t-emerald-400 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التربصات بتونس</div>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                {statsData.parLocalisation?.tunisie || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-blue-500 dark:border-t-blue-400 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التربصات بالخارج</div>
              <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                {statsData.parLocalisation?.etranger || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-50/90 dark:bg-sky-950/50 text-blue-700 dark:text-blue-300 border border-sky-200/70 dark:border-sky-800/60">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 border-t-2 border-t-indigo-500 dark:border-t-indigo-400 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الناجحون والمؤهلون</div>
              <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-400 font-mono tabular-nums">
                {statsData.parResultat?.admis || 0}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Filtres de recherche */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-slate-700 dark:text-slate-200">
            <Filter className="w-4 h-4 text-[#2c5282] dark:text-blue-400" />
            <span>البحث والتصفية</span>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-sm text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1.5"
            >
              <span>إلغاء التصفيات</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche textuelle */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-700 dark:text-slate-300 absolute start-3 top-3.5" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث بالموضوع أو المكان..."
              className="h-11 ps-9 pe-3 text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg"
            />
          </div>

          {/* Filtre Localisation */}
          <div>
            <Select
              value={localisationFilter}
              onValueChange={(val) => {
                setLocalisationFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder="نطاق التربص" />
              </SelectTrigger>
              <SelectContent className="text-start" dir={dir}>
                <SelectItem value="ALL">جميع النطاقات (تونس والخارج)</SelectItem>
                <SelectItem value="tunisie">داخل تونس</SelectItem>
                <SelectItem value="etranger">بالخارج</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Statut */}
          <div>
            <Select
              value={statutFilter}
              onValueChange={(val) => {
                setStatutFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder="حالة التربص" />
              </SelectTrigger>
              <SelectContent className="text-start" dir={dir}>
                <SelectItem value="ALL">جميع الحالات</SelectItem>
                <SelectItem value="acheve">مكتمل</SelectItem>
                <SelectItem value="en_cours">قيد الإنجاز</SelectItem>
                <SelectItem value="inscrit">مسجل</SelectItem>
                <SelectItem value="suspendu">معلق</SelectItem>
                <SelectItem value="abandonne">ملغى / منسحب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Année */}
          <div>
            <Select
              value={anneeFilter}
              onValueChange={(val) => {
                setAnneeFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-11 text-start bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 dark:text-slate-100 rounded-lg">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent className="text-start max-h-52" dir={dir}>
                <SelectItem value="ALL">جميع السنوات</SelectItem>
                {Array.from({ length: 11 }, (_, i) => 2030 - i).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 4. Tableau des stages */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : stagesList.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-10 h-10 text-slate-700 dark:text-slate-300" />}
            title="لا توجد تربصات مسجلة"
            description="لم يتم العثور على أي تربص يطابق معايير البحث الحالية."
            action={
              canManageStages ? (
                <Button
                  onClick={handleOpenCreate}
                  className="h-10 px-4 text-sm bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg font-bold"
                >
                  إضافة تربص جديد
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[650px]">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
                  <TableHead className="sticky start-0 z-30 bg-slate-50 dark:bg-slate-800 text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    الموظف
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    موضوع التربص
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    مكان التربص / الدولة
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    الفترة
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    المدة
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    الحالة
                  </TableHead>
                  <TableHead className="text-start py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    النتيجة
                  </TableHead>
                  <TableHead className="text-center py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-200 dark:divide-slate-800">
                {stagesList.map((stage) => {
                  const personnel = typeof stage.personnelId === 'object' ? stage.personnelId : null;
                  return (
                    <TableRow key={stage._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors border-slate-200 dark:border-slate-800">
                      {/* الموظف */}
                      <TableCell className="sticky start-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 py-3 px-4 whitespace-nowrap transition-colors">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {personnel ? `${personnel.nom} ${personnel.prenom}` : '—'}
                        </div>
                        {personnel?.cin && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                            ب.ت.و: {personnel.cin}
                          </div>
                        )}
                      </TableCell>

                      {/* موضوع التربص */}
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {stage.sujetStage}
                        </div>
                        {stage.numeroRoute && (
                          <div className="text-xs text-slate-700 dark:text-slate-300">
                            رقم الإرسالية: <span className="font-mono tabular-nums">{stage.numeroRoute}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* المكان والدولة */}
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
                          {stage.localisation === 'etranger' ? `الدولة: ${stage.pays}` : 'تونس'}
                        </div>
                      </TableCell>

                      {/* التواريخ */}
                      <TableCell className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        <div>من: <bdi dir={dir} className="tabular-nums">{formatLongDate(stage.dateDebut, isRTL ? 'ar' : 'fr')}</bdi></div>
                        <div>إلى: <bdi dir={dir} className="tabular-nums">{formatLongDate(stage.dateFin, isRTL ? 'ar' : 'fr')}</bdi></div>
                      </TableCell>

                      {/* المدة */}
                      <TableCell className="py-3 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                        {stage.duree ? `${stage.duree} يوم` : '—'}
                      </TableCell>

                      {/* الحالة */}
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {renderStatutBadge(stage.statut)}
                      </TableCell>

                      {/* النتيجة */}
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {renderResultatBadge(stage.resultat)}
                      </TableCell>

                      {/* الإجراءات */}
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStageToView(stage)}
                            className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                            title="عرض التفاصيل"
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
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStageToDelete(stage)}
                                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                                title="حذف"
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
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm bg-slate-50/50 dark:bg-slate-900">
            <div className="text-slate-700 dark:text-slate-300 tabular-nums">
              إجمالي النتائج: <strong className="text-slate-800 dark:text-slate-200">{pagination.total}</strong> (الصفحة {pagination.page} من {pagination.pages})
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
                <span>السابق</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage >= pagination.pages}
                className="h-9 px-3 rounded-lg dark:border-slate-700 dark:text-slate-200"
              >
                <span>التالي</span>
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
              <span>تفاصيل التربص</span>
            </DialogTitle>
          </DialogHeader>

          {stageToView && (
            <div className="space-y-4 pt-2 text-sm">
              <div>
                <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">الموظف</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {typeof stageToView.personnelId === 'object'
                    ? `${stageToView.personnelId.nom} ${stageToView.personnelId.prenom}`
                    : '—'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">موضوع التربص</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{stageToView.sujetStage}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">المكان / الدولة</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {stageToView.lieuStage} {stageToView.localisation === 'etranger' ? `(${stageToView.pays})` : '(تونس)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">الفترة</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                    <bdi dir={dir} className="tabular-nums">{formatLongDate(stageToView.dateDebut, isRTL ? 'ar' : 'fr')}</bdi> إلى <bdi dir={dir} className="tabular-nums">{formatLongDate(stageToView.dateFin, isRTL ? 'ar' : 'fr')}</bdi>
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">المدة المحتسبة</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{stageToView.duree || 0} يوم</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">الحالة</span>
                  <div className="mt-1">{renderStatutBadge(stageToView.statut)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">النتيجة</span>
                  <div className="mt-1">{renderResultatBadge(stageToView.resultat)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block">الملاحظة / التقدير</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{stageToView.mention || '—'}</span>
                </div>
              </div>

              {stageToView.numeroRoute && (
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">رقم الإرسالية (Route)</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{stageToView.numeroRoute}</span>
                </div>
              )}

              {stageToView.observations && (
                <div>
                  <span className="text-xs text-slate-700 dark:text-slate-300 block font-semibold">ملاحظات</span>
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
              <span>تأكيد حذف التربص</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-700 dark:text-slate-300 mt-2">
              هل أنت متأكد من حذف هذا التربص نهائياً من سجل الموظف؟
              {stageToDelete && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300 text-xs font-semibold">
                  {stageToDelete.sujetStage} ({stageToDelete.lieuStage})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs rounded-lg dark:border-slate-700 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RHStagesPage;
