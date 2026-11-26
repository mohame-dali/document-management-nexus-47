import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonnelById } from '@/services/hr/personnelApi';
import { Personnel } from '@/types/hr';
import { Department, User } from '@/types';
import PersonnelStatusBadge from '@/components/hr/PersonnelStatusBadge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowLeft,
  Edit,
  User as UserIcon,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  FileText,
  UserCheck,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  Printer,
  Building2,
  History,
} from 'lucide-react';
import { formatLongDate } from '@/utils/formatDate';
import PersonnelDocumentsList from '@/components/hr/PersonnelDocumentsList';
import { useAuth } from '@/contexts/AuthContext';
import { useDirection } from '@/i18n/useDirection';
import { getStagesByPersonnel, deleteStage, RHStage } from '@/services/rhStageService';
import { StageFormDialog } from '@/components/hr/StageFormDialog';
import {
  getFullPersonnelHistory,
  deletePromotion,
  deletePoste,
  deleteDiplome,
  deleteSanction,
  RHPromotion,
  RHPoste,
  RHDiplome,
  RHSanction,
} from '@/services/rhPersonnelHistoryService';
import { PromotionFormDialog } from '@/components/hr/PromotionFormDialog';
import { PosteFormDialog } from '@/components/hr/PosteFormDialog';
import { DiplomeFormDialog } from '@/components/hr/DiplomeFormDialog';
import { SanctionFormDialog } from '@/components/hr/SanctionFormDialog';
import { generateCarteInstruction } from '@/services/carteInstructionService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import { toast } from 'sonner';

export const PersonnelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { dir, isRTL } = useDirection();

  const canManageStages = ['Admin', 'AdminDepartment'].includes(
    currentUser?.role || ''
  );
  const canEditPersonnel =
    currentUser?.role === 'Admin' || currentUser?.role === 'AdminDepartment';

  // Dialog stage
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [stageToEdit, setStageToEdit] = useState<RHStage | null>(null);
  const [stageToDelete, setStageToDelete] = useState<RHStage | null>(null);

  // Dialogs historique
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionToEdit, setPromotionToEdit] = useState<RHPromotion | null>(null);

  const [showPosteDialog, setShowPosteDialog] = useState(false);
  const [posteToEdit, setPosteToEdit] = useState<RHPoste | null>(null);

  const [showDiplomeDialog, setShowDiplomeDialog] = useState(false);
  const [diplomeToEdit, setDiplomeToEdit] = useState<RHDiplome | null>(null);

  const [showSanctionDialog, setShowSanctionDialog] = useState(false);
  const [sanctionToEdit, setSanctionToEdit] = useState<RHSanction | null>(null);

  const [historyItemToDelete, setHistoryItemToDelete] = useState<{
    type: 'promotion' | 'poste' | 'diplome' | 'sanction';
    id: string;
    title: string;
  } | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Requête fiche personnel
  const {
    data: personnel,
    isLoading,
    error,
  } = useQuery<Personnel>({
    queryKey: ['personnel', id],
    queryFn: () => getPersonnelById(id!),
    enabled: Boolean(id),
  });

  // Requête stages
  const {
    data: stagesData,
  } = useQuery({
    queryKey: ['personnel-stages', id],
    queryFn: () => getStagesByPersonnel(id!),
    enabled: Boolean(id),
  });

  const stagesTunisie = stagesData?.tunisie || [];
  const stagesEtranger = stagesData?.etranger || [];
  const totalStages = stagesTunisie.length + stagesEtranger.length;

  // Requête historique complet (promotions, postes, diplômes, sanctions)
  const {
    data: fullHistoryData,
  } = useQuery({
    queryKey: ['personnel-full-history', id],
    queryFn: () => getFullPersonnelHistory(id!),
    enabled: Boolean(id),
  });

  const promotions = fullHistoryData?.promotions || [];
  const postes = fullHistoryData?.postes || [];
  const diplomes = fullHistoryData?.diplomes || [];
  const sanctions = fullHistoryData?.sanctions || [];

  // Mutation suppression stage
  const deleteStageMutation = useMutation({
    mutationFn: (stageId: string) => deleteStage(stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-stages', id] });
      queryClient.invalidateQueries({ queryKey: ['rh-stages'] });
      queryClient.invalidateQueries({ queryKey: ['rh-stage-stats'] });
      toast.success('تم حذف التربص بنجاح');
      setStageToDelete(null);
    },
    onError: () => {
      toast.error('تعذر حذف التربص');
    },
  });

  // Mutation suppression élément d'historique
  const deleteHistoryMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      if (type === 'promotion') return deletePromotion(id);
      if (type === 'poste') return deletePoste(id);
      if (type === 'diplome') return deleteDiplome(id);
      if (type === 'sanction') return deleteSanction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel-full-history', id] });
      toast.success('تم الحذف بنجاح');
      setHistoryItemToDelete(null);
    },
    onError: () => {
      toast.error('تعذر إتمام عملية الحذف');
    },
  });

  const handleGenerateCarteInstruction = async () => {
    if (!personnel) return;
    try {
      setIsGeneratingPdf(true);
      await generateCarteInstruction(personnel, fullHistoryData, stagesData);
      toast.success('تم إنشاء وتحميل بطاقة الإرشادات بنجاح');
    } catch (err) {
      console.error('Erreur génération بطاقة إرشادات:', err);
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282] dark:text-blue-400" />
          <span className="text-base text-slate-600 dark:text-slate-300">جاري تحميل بطاقة الموظف...</span>
        </div>
      </div>
    );
  }

  if (error || !personnel) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-lg p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">بطاقة الموظف غير موجودة</h2>
          <p className="text-base text-slate-600 dark:text-slate-400 mb-6">
            تعذر العثور على البطاقة المطلوبة أو تم حذفها.
          </p>
          <Button
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="h-11 px-6 bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg"
          >
            العودة إلى قائمة الموظفين
          </Button>
        </div>
      </div>
    );
  }

  const departmentObj =
    personnel.activeDepartment && typeof personnel.activeDepartment === 'object'
      ? (personnel.activeDepartment as Department)
      : null;

  const userObj =
    personnel.userId &&
    typeof personnel.userId === 'object' &&
    !(personnel.userId as User).isDeleted
      ? (personnel.userId as User)
      : null;

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-start" dir={dir}>
      {/* 1. En-tête de la fiche */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonnelAvatar
            photo={personnel.photo}
            nom={personnel.nom}
            prenom={personnel.prenom}
            size="lg"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {personnel.prenom} {personnel.nom}
              </h1>
              <PersonnelStatusBadge statut={personnel.statut} />
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
              {personnel.matricule && (
                <span>
                  المعرف الوحيد: <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">{personnel.matricule}</strong>
                </span>
              )}
              {personnel.cin && (
                <span>
                  ب.ت.و: <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">{personnel.cin}</strong>
                </span>
              )}
              {personnel.poste && (
                <span>
                  الخطة: <strong className="text-slate-900 dark:text-slate-100">{personnel.poste}</strong>
                </span>
              )}
              {departmentObj && (
                <span>
                  القسم: <strong className="text-slate-900 dark:text-slate-100">{departmentObj.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto print:hidden">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="h-11 px-4 text-base font-medium text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span>العودة للقائمة</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerateCarteInstruction}
            disabled={isGeneratingPdf}
            className="h-11 px-4 text-base font-bold text-[#2c5282] dark:text-blue-200 border-[#2c5282] dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Printer className="w-5 h-5" />
            )}
            <span>بطاقة إرشادات</span>
          </Button>

          {canEditPersonnel && (
            <Button
              onClick={() => navigate(`/dashboard/hr/personnel/${personnel._id}/edit`)}
              className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-2 shadow-sm"
            >
              <Edit className="w-5 h-5" />
              <span>تعديل البطاقة</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Grille des informations générales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Informations Personnelles */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <UserIcon className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
            <h2>المعلومات الشخصية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">اللقب</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.nom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الاسم</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.prenom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">تاريخ الولادة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {personnel.dateNaissance ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateNaissance, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">مكان الولادة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.lieuNaissance || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الجنس</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {personnel.sexe === 'Homme' ? 'ذكر' : personnel.sexe === 'Femme' ? 'أنثى' : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الحالة المدنية</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {personnel.etatCivil === 'celibataire'
                  ? 'أعزب / عزباء'
                  : personnel.etatCivil === 'marie'
                  ? 'متزوج(ة)'
                  : personnel.etatCivil === 'divorce'
                  ? 'مطلق(ة)'
                  : personnel.etatCivil === 'veuf'
                  ? 'أرمل(ة)'
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">رقم ب.ت.و</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{personnel.cin || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">عدد الأبناء</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{personnel.enfants ?? '—'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">العنوان</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{personnel.adresse || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الهاتف الشخصي</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5 tabular-nums" dir="ltr">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{personnel.telephone || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">البريد الإلكتروني</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{personnel.emailPersonnel || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* B. Informations Professionnelles & Administratives */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <Briefcase className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
            <h2>المعلومات المهنية والإدارية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">المعرف الوحيد</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">{personnel.matricule || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الرتبة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.grade || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الخطة الوظيفية</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.poste || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الصنف</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.categorie || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الدرجة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{personnel.echelon || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">القسم الفعلي</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {departmentObj ? departmentObj.name : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">تاريخ الانتداب</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {personnel.dateEmbauche ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateEmbauche, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">تاريخ الترسيم</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {personnel.dateTitularisation ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateTitularisation, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">تاريخ نهاية الخدمة</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {personnel.dateFinService ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateFinService, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">الحالة المهنية</span>
              <div className="mt-1">
                <PersonnelStatusBadge statut={personnel.statut} />
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                حساب المستخدم المرتبط بالنظام
              </span>
              {userObj ? (
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold text-slate-900 dark:text-slate-100 me-2" dir="ltr">
                        {userObj.username}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({userObj.role})
                      </span>
                    </div>
                  </div>
                  {userObj.isActive === false && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      حساب معطل
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 p-2.5 rounded-lg">
                  لا يوجد حساب مستخدم مرتبط بهذه البطاقة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 الأقسام التي انتمى إليها / المسار الوظيفي */}
      {(() => {
        const affectations = Array.isArray(personnel.historiqueAffectations)
          ? [...personnel.historiqueAffectations].sort((a, b) => {
              const tA = a.dateDebut ? new Date(a.dateDebut).getTime() : 0;
              const tB = b.dateDebut ? new Date(b.dateDebut).getTime() : 0;
              return tB - tA;
            })
          : [];

        const displayAffectations =
          affectations.length > 0
            ? affectations
            : departmentObj || personnel.posteActuel || personnel.poste
              ? [
                  {
                    _id: 'current-fallback',
                    poste: personnel.posteActuel || personnel.poste || '—',
                    departement: departmentObj,
                    departementName: departmentObj?.name || '',
                    dateDebut: personnel.dateEngagement || personnel.dateEmbauche || personnel.createdAt || null,
                    dateFin: null,
                    isCurrent: true,
                  },
                ]
              : [];

        return (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                <History className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <h2>الأقسام التي انتمى إليها / المسار الوظيفي</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                عدد التنقلات والتعيينات: {displayAffectations.length}
              </span>
            </div>

            {displayAffectations.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                لم يتم تسجيل أي تعيين أو نقلة قسم بعد
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">القسم / الوحدة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">الخطة الوظيفية</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">من تاريخ</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">إلى تاريخ</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">الوضعية</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayAffectations.map((aff, idx) => {
                      const deptLabel =
                        aff.departementName ||
                        (aff.departement && typeof aff.departement === 'object'
                          ? (aff.departement as Department).name
                          : '') ||
                        '—';
                      const isCurrentEntry = Boolean(aff.isCurrent || !aff.dateFin);

                      return (
                        <TableRow
                          key={aff._id || `${deptLabel}-${idx}`}
                          className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                              <span>{deptLabel}</span>
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {aff.poste || '—'}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                            {aff.dateDebut ? (
                              <bdi dir={dir} className="tabular-nums">
                                {formatLongDate(aff.dateDebut, isRTL ? 'ar' : 'fr')}
                              </bdi>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                            {aff.dateFin ? (
                              <bdi dir={dir} className="tabular-nums">
                                {formatLongDate(aff.dateFin, isRTL ? 'ar' : 'fr')}
                              </bdi>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                إلى الآن
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs">
                            {isCurrentEntry ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                حالي
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                سابق
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. Notes */}
      {personnel.notes && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <FileText className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
            <h3>ملاحظات إدارية</h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200/80 dark:border-slate-700">
            {personnel.notes}
          </p>
        </div>
      )}

      {/* 4. Section Documents Associés */}
      <PersonnelDocumentsList
        personnelId={personnel._id}
        personnelName={`${personnel.nom} ${personnel.prenom}`}
      />

      {/* 5. ONGLETS DU PARCOURS ADMINISTRATIF & FORMATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
        <Tabs defaultValue="stages" className="w-full space-y-6" dir={dir}>
          {/* En-tête des onglets */}
          <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  سجل المسار الإداري والتكويني
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  سجل التربصات، الترقيات، الخطط الوظيفية، الشهادات العلمية، والعقوبات التأديبية
                </p>
              </div>
            </div>

            <TabsList className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 h-auto flex flex-wrap gap-1 justify-start rounded-lg">
              <TabsTrigger
                value="stages"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-md data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>التربصات</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">
                  {totalStages}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="promotions"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-md data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>الترقيات</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">
                  {promotions.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="postes"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-md data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                <span>الخطط</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">
                  {postes.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="diplomes"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-md data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>الشهادات</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">
                  {diplomes.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="sanctions"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded-md data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>العقوبات</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 tabular-nums">
                  {sanctions.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ======================================================== */}
          {/* ONGLET 1 : التربصات والتكوين */}
          {/* ======================================================== */}
          <TabsContent value="stages" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  سجل الدورات التكوينية والتربصات المنجزة داخل تونس وبالخارج ({totalStages})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setStageToEdit(null);
                    setShowStageDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة تربص</span>
                </Button>
              )}
            </div>

            {/* Sous-section A : التربصات بتونس */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>التربصات بتونس</span>
                  <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 font-bold tabular-nums">
                    {stagesTunisie.length}
                  </span>
                </h3>
              </div>

              {stagesTunisie.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  لا توجد تربصات مسجلة داخل تونس لهذا الموظف
                </div>
              ) : (
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                      <TableRow className="border-slate-200/80 dark:border-slate-800">
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">موضوع التربص</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">مكان التربص</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">بداية</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">إلى</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المدة</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">النتيجة</TableHead>
                        {canManageStages && (
                          <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagesTunisie.map((st, idx) => (
                        <TableRow key={st._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{st.sujetStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300">{st.lieuStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums"><bdi dir={dir} className="tabular-nums">{formatLongDate(st.dateDebut, isRTL ? 'ar' : 'fr')}</bdi></TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums"><bdi dir={dir} className="tabular-nums">{formatLongDate(st.dateFin, isRTL ? 'ar' : 'fr')}</bdi></TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{st.duree ? `${st.duree} يوم` : '—'}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-semibold">
                            {st.resultat === 'admis' ? (
                              <span className="text-emerald-700 dark:text-emerald-400">ناجح</span>
                            ) : st.resultat === 'refuse' ? (
                              <span className="text-red-700 dark:text-red-400">راسب</span>
                            ) : st.resultat === 'en_attente' ? (
                              <span className="text-amber-700 dark:text-amber-400">في الانتظار</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </TableCell>
                          {canManageStages && (
                            <TableCell className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setStageToEdit(st);
                                    setShowStageDialog(true);
                                  }}
                                  className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                  title="تعديل"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStageToDelete(st)}
                                  className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Sous-section B : التربصات بالخارج */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>التربصات بالخارج</span>
                  <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/60 font-bold tabular-nums">
                    {stagesEtranger.length}
                  </span>
                </h3>
              </div>

              {stagesEtranger.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  لا توجد تربصات مسجلة بالخارج لهذا الموظف
                </div>
              ) : (
                <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                      <TableRow className="border-slate-200/80 dark:border-slate-800">
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">موضوع التربص</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المكان / الدولة</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">بداية</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">إلى</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المدة</TableHead>
                        <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">النتيجة</TableHead>
                        {canManageStages && (
                          <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagesEtranger.map((st, idx) => (
                        <TableRow key={st._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{st.sujetStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300">
                            {st.lieuStage} {st.pays ? `(${st.pays})` : ''}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums"><bdi dir={dir} className="tabular-nums">{formatLongDate(st.dateDebut, isRTL ? 'ar' : 'fr')}</bdi></TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 tabular-nums"><bdi dir={dir} className="tabular-nums">{formatLongDate(st.dateFin, isRTL ? 'ar' : 'fr')}</bdi></TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{st.duree ? `${st.duree} يوم` : '—'}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-semibold">
                            {st.resultat === 'admis' ? (
                              <span className="text-emerald-700 dark:text-emerald-400">ناجح</span>
                            ) : st.resultat === 'refuse' ? (
                              <span className="text-red-700 dark:text-red-400">راسب</span>
                            ) : st.resultat === 'en_attente' ? (
                              <span className="text-amber-700 dark:text-amber-400">في الانتظار</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            )}
                          </TableCell>
                          {canManageStages && (
                            <TableCell className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setStageToEdit(st);
                                    setShowStageDialog(true);
                                  }}
                                  className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                  title="تعديل"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStageToDelete(st)}
                                  className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ======================================================== */}
          {/* ONGLET 2 : الترقيات (Promotions) */}
          {/* ======================================================== */}
          <TabsContent value="promotions" className="space-y-4 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  سجل الترقيات الإدارية وتغييرات الرتب ({promotions.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setPromotionToEdit(null);
                    setShowPromotionDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ترقية</span>
                </Button>
              )}
            </div>

            {promotions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                لا توجد ترقيات مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">الرتبة السابقة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">الرتبة الجديدة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">تاريخ الترقية</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المرجع / القرار</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">السبب / الملاحظات</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((item, idx) => (
                      <TableRow key={item._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {item.gradePrecedent || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.gradeNouveau}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(item.datePromotion, isRTL ? 'ar' : 'fr')}</bdi>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {item.motif || item.observations || '—'}
                        </TableCell>
                        {canManageStages && (
                          <TableCell className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPromotionToEdit(item);
                                  setShowPromotionDialog(true);
                                }}
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setHistoryItemToDelete({
                                    type: 'promotion',
                                    id: item._id,
                                    title: `ترقية إلى رتبة: ${item.gradeNouveau}`,
                                  })
                                }
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ======================================================== */}
          {/* ONGLET 3 : الخطط الوظيفية (Postes) */}
          {/* ======================================================== */}
          <TabsContent value="postes" className="space-y-4 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  سجل الخطط الوظيفية والتكليفات الإدارية ({postes.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setPosteToEdit(null);
                    setShowPosteDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة خطة</span>
                </Button>
              )}
            </div>

            {postes.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                لا توجد خطط أو تكليفات وظيفية مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">الخطة الوظيفية</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">تاريخ التعيين</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المرجع</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">مكان العمل / الإدارة</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postes.map((item, idx) => (
                      <TableRow key={item._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.poste}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(item.dateDebut, isRTL ? 'ar' : 'fr')}</bdi>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          {item.dateFin ? (
                            <bdi dir={dir} className="tabular-nums">{formatLongDate(item.dateFin, isRTL ? 'ar' : 'fr')}</bdi>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              إلى حد الآن
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {item.lieu || item.observations || '—'}
                        </TableCell>
                        {canManageStages && (
                          <TableCell className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPosteToEdit(item);
                                  setShowPosteDialog(true);
                                }}
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setHistoryItemToDelete({
                                    type: 'poste',
                                    id: item._id,
                                    title: `خطة وظيفية: ${item.poste}`,
                                  })
                                }
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ======================================================== */}
          {/* ONGLET 4 : الشهادات العلمية (Diplômes) */}
          {/* ======================================================== */}
          <TabsContent value="diplomes" className="space-y-4 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  سجل الشهادات والمؤهلات العلمية والتكوينية ({diplomes.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setDiplomeToEdit(null);
                    setShowDiplomeDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة شهادة</span>
                </Button>
              )}
            </div>

            {diplomes.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                لا توجد شهادات علمية أو مهنية مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">نوع الشهادة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">موضوع / اختصاص الشهادة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">تاريخ الشهادة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المرجع</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المؤسسة المانحة / المستوى</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diplomes.map((item, idx) => (
                      <TableRow key={item._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.typeDiplome}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          {item.sujetDiplome}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(item.dateObtention, isRTL ? 'ar' : 'fr')}</bdi>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {item.etablissement ? `${item.etablissement} ` : ''}
                          {item.niveau ? `(${item.niveau})` : ''}
                          {!item.etablissement && !item.niveau ? '—' : ''}
                        </TableCell>
                        {canManageStages && (
                          <TableCell className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDiplomeToEdit(item);
                                  setShowDiplomeDialog(true);
                                }}
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setHistoryItemToDelete({
                                    type: 'diplome',
                                    id: item._id,
                                    title: `شهادة: ${item.typeDiplome} - ${item.sujetDiplome}`,
                                  })
                                }
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ======================================================== */}
          {/* ONGLET 5 : العقوبات التأديبية (Sanctions) */}
          {/* ======================================================== */}
          <TabsContent value="sanctions" className="space-y-4 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  سجل العقوبات والإجراءات التأديبية ({sanctions.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setSanctionToEdit(null);
                    setShowSanctionDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عقوبة</span>
                </Button>
              )}
            </div>

            {sanctions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                لا توجد أي عقوبات أو تتبعات تأديبية مسجلة لهذا الموظف
              </div>
            ) : (
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/70">
                    <TableRow className="border-slate-200/80 dark:border-slate-800">
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-12">#</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">تاريخ العقوبة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">عدد الأيام</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">السبب</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">نوع العقوبة</TableHead>
                      <TableHead className="text-start py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200">المرجع</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 w-24">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sanctions.map((item, idx) => (
                      <TableRow key={item._id} className="border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          <bdi dir={dir} className="tabular-nums">{formatLongDate(item.dateSanction, isRTL ? 'ar' : 'fr')}</bdi>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {item.nombreJours ? `${item.nombreJours} يوم` : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {item.raison}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-amber-700 dark:text-amber-400 font-medium">
                          {item.typeSanction || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        {canManageStages && (
                          <TableCell className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSanctionToEdit(item);
                                  setShowSanctionDialog(true);
                                }}
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 rounded-lg"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setHistoryItemToDelete({
                                    type: 'sanction',
                                    id: item._id,
                                    title: `عقوبة: ${item.raison}`,
                                  })
                                }
                                className="h-9 w-9 p-0 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Ajout / Modification de stage */}
      <StageFormDialog
        open={showStageDialog}
        onOpenChange={setShowStageDialog}
        stage={stageToEdit}
        defaultPersonnelId={personnel._id}
      />

      {/* Dialog Ajout / Modification de promotion */}
      <PromotionFormDialog
        open={showPromotionDialog}
        onOpenChange={setShowPromotionDialog}
        promotion={promotionToEdit}
        personnelId={personnel._id}
      />

      {/* Dialog Ajout / Modification de poste */}
      <PosteFormDialog
        open={showPosteDialog}
        onOpenChange={setShowPosteDialog}
        poste={posteToEdit}
        personnelId={personnel._id}
      />

      {/* Dialog Ajout / Modification de diplôme */}
      <DiplomeFormDialog
        open={showDiplomeDialog}
        onOpenChange={setShowDiplomeDialog}
        diplome={diplomeToEdit}
        personnelId={personnel._id}
      />

      {/* Dialog Ajout / Modification de sanction */}
      <SanctionFormDialog
        open={showSanctionDialog}
        onOpenChange={setShowSanctionDialog}
        sanction={sanctionToEdit}
        personnelId={personnel._id}
      />

      {/* AlertDialog Suppression de stage */}
      <AlertDialog open={Boolean(stageToDelete)} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <AlertDialogContent
          className="text-start bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          dir={dir}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              تأكيد حذف التربص
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              هل أنت متأكد من حذف هذا التربص من سجل الموظف؟
              {stageToDelete && (
                <div className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {stageToDelete.sujetStage} ({stageToDelete.lieuStage})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs rounded-lg dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => stageToDelete && deleteStageMutation.mutate(stageToDelete._id)}
              className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Suppression d'un élément d'historique */}
      <AlertDialog
        open={Boolean(historyItemToDelete)}
        onOpenChange={(open) => !open && setHistoryItemToDelete(null)}
      >
        <AlertDialogContent
          className="text-start bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
          dir={dir}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              هل أنت متأكد من حذف هذا السجل نهائياً؟
              {historyItemToDelete && (
                <div className="mt-2 font-semibold text-slate-800 dark:text-slate-200">
                  {historyItemToDelete.title}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs rounded-lg dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                historyItemToDelete &&
                deleteHistoryMutation.mutate({
                  type: historyItemToDelete.type,
                  id: historyItemToDelete.id,
                })
              }
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

export default PersonnelDetailPage;
