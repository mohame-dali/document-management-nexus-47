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
import { formatArabicDate } from '@/utils/arabicDateFormatter';
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
  Calendar,
  ChevronRight,
  ChevronLeft,
  FileText,
  Building2,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';

export const RHStagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  // Droits utilisateurs
  const canManageStages = ['Admin', 'SuperAdmin', 'AdminDepartment'].includes(currentUser?.role || '');

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
    keepPreviousData: true,
  });

  // Récupération des statistiques
  const { data: statsData } = useQuery({
    queryKey: ['rh-stage-stats', anneeFilter],
    queryFn: () => getStagesStats(anneeFilter !== 'ALL' ? { annee: anneeFilter } : undefined),
    staleTime: 60 * 1000,
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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">مكتمل</span>;
      case 'en_cours':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">قيد الإنجاز</span>;
      case 'inscrit':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">مسجل</span>;
      case 'suspendu':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">معلق</span>;
      case 'abandonne':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">ملغى / منسحب</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">{st}</span>;
    }
  };

  // Badge résultat
  const renderResultatBadge = (res?: string) => {
    switch (res) {
      case 'admis':
        return <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">ناجح</span>;
      case 'refuse':
        return <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">راسب</span>;
      case 'en_attente':
        return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">في الانتظار</span>;
      default:
        return <span className="text-xs text-gray-400">—</span>;
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* 1. En-tête */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-[#ebf4ff] text-[#2c5282]">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-0.5">
                <span>الموارد البشرية</span>
                <span>/</span>
                <span className="text-[#2c5282] font-bold">التربصات والتكوين</span>
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-[#1a202c]">
                  جميع التربصات
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]">
                  عرض شامل
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#718096] mt-1">
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
            className="h-11 px-4 text-sm font-medium text-gray-700 border-[#cbd5e1] rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          {canManageStages && (
            <Button
              onClick={handleOpenCreate}
              className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة تربص جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bandeau info */}
      <div className="bg-[#ebf4ff] border border-[#bee3f8] rounded p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#2c5282] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#2c5282]">
          <p className="font-semibold mb-1">عرض شامل لجميع التربصات</p>
          <p className="text-xs leading-relaxed">
            هذه الصفحة تعرض تربصات جميع الموظفين لإتاحة نظرة شاملة 
            وإحصائيات. لإضافة تربص لموظف معين أو الاطلاع على مساره 
            الكامل، افتح ملفه الشخصي وانتقل إلى تبويب &quot;تربصات هذا الموظف&quot;.
          </p>
        </div>
      </div>

      {/* 2. Barre de synthèse / Statistiques sobres */}
      {statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm">
            <div className="text-xs font-bold text-gray-500 mb-1">إجمالي التربصات</div>
            <div className="text-2xl font-extrabold text-[#2c5282] font-mono">{statsData.total || 0}</div>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm">
            <div className="text-xs font-bold text-gray-500 mb-1">التربصات بتونس</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {statsData.parLocalisation?.tunisie || 0}
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm">
            <div className="text-xs font-bold text-gray-500 mb-1">التربصات بالخارج</div>
            <div className="text-2xl font-extrabold text-blue-700 font-mono">
              {statsData.parLocalisation?.etranger || 0}
            </div>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded p-4 shadow-sm">
            <div className="text-xs font-bold text-gray-500 mb-1">الناجحون والمؤهلون</div>
            <div className="text-2xl font-extrabold text-indigo-700 font-mono">
              {statsData.parResultat?.admis || 0}
            </div>
          </div>
        </div>
      )}

      {/* 3. Filtres de recherche */}
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
              <span>إلغاء التصفيات</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche textuelle */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث بالموضوع أو المكان..."
              className="h-11 pr-9 pl-3 text-sm bg-white border-[#cbd5e1] rounded"
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
              <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                <SelectValue placeholder="نطاق التربص" />
              </SelectTrigger>
              <SelectContent className="text-right" dir="rtl">
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
              <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                <SelectValue placeholder="حالة التربص" />
              </SelectTrigger>
              <SelectContent className="text-right" dir="rtl">
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
              <SelectTrigger className="h-11 text-right bg-white border-[#cbd5e1]">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent className="text-right max-h-52" dir="rtl">
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
      <div className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282]" />
            <span className="text-sm text-gray-600">جاري تحميل سجل التربصات...</span>
          </div>
        ) : stagesList.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">لا توجد تربصات مسجلة</h3>
            <p className="text-sm text-gray-500 mb-4">
              لم يتم العثور على أي تربص يطابق معايير البحث الحالية.
            </p>
            {canManageStages && (
              <Button
                onClick={handleOpenCreate}
                className="h-10 px-4 text-sm bg-[#2c5282] hover:bg-[#234269] text-white rounded font-bold"
              >
                إضافة تربص جديد
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <TableRow>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    الموظف
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    موضوع التربص
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    مكان التربص / الدولة
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    الفترة
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    المدة
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right py-3.5 px-4 font-bold text-gray-700 text-xs">
                    النتيجة
                  </TableHead>
                  <TableHead className="text-center py-3.5 px-4 font-bold text-gray-700 text-xs">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stagesList.map((stage) => {
                  const personnel = typeof stage.personnelId === 'object' ? stage.personnelId : null;
                  return (
                    <TableRow key={stage._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* الموظف */}
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-sm">
                          {personnel ? `${personnel.nom} ${personnel.prenom}` : '—'}
                        </div>
                        {personnel?.cin && (
                          <div className="text-xs text-gray-500 font-mono">
                            ب.ت.و: {personnel.cin}
                          </div>
                        )}
                      </TableCell>

                      {/* موضوع التربص */}
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-gray-900 text-sm">
                          {stage.sujetStage}
                        </div>
                        {stage.numeroRoute && (
                          <div className="text-xs text-gray-500">
                            رقم الإرسالية: <span className="font-mono">{stage.numeroRoute}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* المكان والدولة */}
                      <TableCell className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                          {stage.localisation === 'etranger' ? (
                            <Globe2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span>{stage.lieuStage}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {stage.localisation === 'etranger' ? `الدولة: ${stage.pays}` : 'تونس'}
                        </div>
                      </TableCell>

                      {/* التواريخ */}
                      <TableCell className="py-3 px-4 text-xs font-medium text-gray-700">
                        <div>من: {formatArabicDate(stage.dateDebut)}</div>
                        <div>إلى: {formatArabicDate(stage.dateFin)}</div>
                      </TableCell>

                      {/* المدة */}
                      <TableCell className="py-3 px-4 text-xs font-bold text-gray-800">
                        {stage.duree ? `${stage.duree} يوم` : '—'}
                      </TableCell>

                      {/* الحالة */}
                      <TableCell className="py-3 px-4">
                        {renderStatutBadge(stage.statut)}
                      </TableCell>

                      {/* النتيجة */}
                      <TableCell className="py-3 px-4">
                        {renderResultatBadge(stage.resultat)}
                      </TableCell>

                      {/* الإجراءات */}
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStageToView(stage)}
                            className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
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
                                className="h-8 w-8 p-0 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStageToDelete(stage)}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
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
          <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-sm">
            <div className="text-gray-500">
              إجمالي النتائج: <strong className="text-gray-800">{pagination.total}</strong> (الصفحة {pagination.page} من {pagination.pages})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="h-9 px-3"
              >
                <ChevronRight className="w-4 h-4 ml-1" />
                <span>السابق</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage >= pagination.pages}
                className="h-9 px-3"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4 mr-1" />
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
        <DialogContent className="max-w-lg text-right" dir="rtl">
          <DialogHeader className="border-b border-[#e2e8f0] pb-3">
            <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#2c5282]" />
              <span>تفاصيل التربص</span>
            </DialogTitle>
          </DialogHeader>

          {stageToView && (
            <div className="space-y-4 pt-2 text-sm">
              <div>
                <span className="text-xs text-gray-500 block font-semibold">الموظف</span>
                <span className="font-bold text-gray-900 text-base">
                  {typeof stageToView.personnelId === 'object'
                    ? `${stageToView.personnelId.nom} ${stageToView.personnelId.prenom}`
                    : '—'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">موضوع التربص</span>
                  <span className="font-bold text-gray-800">{stageToView.sujetStage}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">المكان / الدولة</span>
                  <span className="text-gray-800">
                    {stageToView.lieuStage} {stageToView.localisation === 'etranger' ? `(${stageToView.pays})` : '(تونس)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">الفترة</span>
                  <span className="text-gray-800">
                    {formatArabicDate(stageToView.dateDebut)} إلى {formatArabicDate(stageToView.dateFin)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">المدة المحتسبة</span>
                  <span className="font-bold text-gray-800">{stageToView.duree || 0} يوم</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-[#f8fafc] p-3 rounded border border-[#e2e8f0]">
                <div>
                  <span className="text-xs text-gray-500 block">الحالة</span>
                  <div className="mt-1">{renderStatutBadge(stageToView.statut)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">النتيجة</span>
                  <div className="mt-1">{renderResultatBadge(stageToView.resultat)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">الملاحظة / التقدير</span>
                  <span className="font-semibold text-gray-800">{stageToView.mention || '—'}</span>
                </div>
              </div>

              {stageToView.numeroRoute && (
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">رقم الإرسالية (Route)</span>
                  <span className="font-mono text-gray-800">{stageToView.numeroRoute}</span>
                </div>
              )}

              {stageToView.observations && (
                <div>
                  <span className="text-xs text-gray-500 block font-semibold">ملاحظات</span>
                  <p className="text-gray-700 bg-[#f8fafc] p-2.5 rounded border border-[#e2e8f0] whitespace-pre-line">
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
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>تأكيد حذف التربص</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              هل أنت متأكد من حذف هذا التربص نهائياً من سجل الموظف؟
              {stageToDelete && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-semibold">
                  {stageToDelete.sujetStage} ({stageToDelete.lieuStage})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
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
