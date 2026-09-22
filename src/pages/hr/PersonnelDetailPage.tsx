import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonnelById, getPhotoUrl } from '@/services/hr/personnelApi';
import { Personnel } from '@/types/hr';
import { Department, User } from '@/types';
import PersonnelStatusBadge from '@/components/hr/PersonnelStatusBadge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Edit,
  User as UserIcon,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  FileText,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  GraduationCap,
  Globe2,
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import PersonnelDocumentsList from '@/components/hr/PersonnelDocumentsList';
import { useAuth } from '@/contexts/AuthContext';
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

  const canManageStages = ['Admin', 'SuperAdmin', 'AdminDepartment'].includes(
    currentUser?.role || ''
  );

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
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282]" />
          <span className="text-base text-gray-600">جاري تحميل بطاقة الموظف...</span>
        </div>
      </div>
    );
  }

  if (error || !personnel) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir="rtl">
        <div className="bg-white border border-red-200 rounded p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">بطاقة الموظف غير موجودة</h2>
          <p className="text-base text-gray-600 mb-6">
            تعذر العثور على البطاقة المطلوبة أو تم حذفها.
          </p>
          <Button
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="h-11 px-6 bg-[#2c5282] text-white rounded"
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
    personnel.userId && typeof personnel.userId === 'object'
      ? (personnel.userId as User)
      : null;

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* 1. En-tête de la fiche */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonnelAvatar
            photo={personnel.photo}
            nom={personnel.nom}
            prenom={personnel.prenom}
            size="lg"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1a202c]">
                {personnel.prenom} {personnel.nom}
              </h1>
              <PersonnelStatusBadge status={personnel.status} />
            </div>

            <div className="text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
              {personnel.matricule && (
                <span>
                  المعرف الوحيد: <strong className="text-gray-900">{personnel.matricule}</strong>
                </span>
              )}
              {personnel.cin && (
                <span>
                  ب.ت.و: <strong className="text-gray-900">{personnel.cin}</strong>
                </span>
              )}
              {personnel.poste && (
                <span>
                  الخطة: <strong className="text-gray-900">{personnel.poste}</strong>
                </span>
              )}
              {departmentObj && (
                <span>
                  القسم: <strong className="text-gray-900">{departmentObj.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="h-11 px-4 text-base font-medium text-gray-700 border-[#cbd5e1] rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة للقائمة</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerateCarteInstruction}
            disabled={isGeneratingPdf}
            className="h-11 px-4 text-base font-bold text-[#2c5282] border-[#2c5282] bg-blue-50/50 hover:bg-blue-100/70 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Printer className="w-5 h-5" />
            )}
            <span>بطاقة إرشادات</span>
          </Button>

          <Button
            onClick={() => navigate(`/dashboard/hr/personnel/${personnel._id}/edit`)}
            className="h-11 px-5 text-base font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-2 shadow-sm"
          >
            <Edit className="w-5 h-5" />
            <span>تعديل البطاقة</span>
          </Button>
        </div>
      </div>

      {/* 2. Grille des informations générales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Informations Personnelles */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3">
            <UserIcon className="w-5 h-5 text-[#2c5282]" />
            <h2>المعلومات الشخصية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-gray-500 block">اللقب</span>
              <span className="font-bold text-gray-900">{personnel.nom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الاسم</span>
              <span className="font-bold text-gray-900">{personnel.prenom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ الولادة</span>
              <span className="font-bold text-gray-900">
                {personnel.dateNaissance ? formatArabicDate(personnel.dateNaissance) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">مكان الولادة</span>
              <span className="font-bold text-gray-900">{personnel.lieuNaissance || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الجنس</span>
              <span className="font-bold text-gray-900">
                {personnel.sexe === 'M' ? 'ذكر' : personnel.sexe === 'F' ? 'أنثى' : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الحالة المدنية</span>
              <span className="font-bold text-gray-900">
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
              <span className="text-sm font-semibold text-gray-500 block">رقم ب.ت.و</span>
              <span className="font-bold text-gray-900">{personnel.cin || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">عدد الأبناء</span>
              <span className="font-bold text-gray-900">{personnel.enfants ?? '—'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-gray-500 block">العنوان</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{personnel.adresse || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الهاتف الشخصي</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{personnel.telephone || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">البريد الإلكتروني</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{personnel.email || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* B. Informations Professionnelles & Administratives */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3">
            <Briefcase className="w-5 h-5 text-[#2c5282]" />
            <h2>المعلومات المهنية والإدارية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-gray-500 block">المعرف الوحيد</span>
              <span className="font-bold text-gray-900">{personnel.matricule || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الرتبة</span>
              <span className="font-bold text-gray-900">{personnel.grade || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الخطة الوظيفية</span>
              <span className="font-bold text-gray-900">{personnel.poste || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الصنف</span>
              <span className="font-bold text-gray-900">{personnel.categorie || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الدرجة</span>
              <span className="font-bold text-gray-900">{personnel.echelon || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">القسم الفعلي</span>
              <span className="font-bold text-gray-900">
                {departmentObj ? departmentObj.name : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ الانتداب</span>
              <span className="font-bold text-gray-900">
                {personnel.dateRecrutement ? formatArabicDate(personnel.dateRecrutement) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ الترسيم</span>
              <span className="font-bold text-gray-900">
                {personnel.dateTitularisation ? formatArabicDate(personnel.dateTitularisation) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ نهاية الخدمة</span>
              <span className="font-bold text-gray-900">
                {personnel.dateFinService ? formatArabicDate(personnel.dateFinService) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">الحالة المهنية</span>
              <div className="mt-1">
                <PersonnelStatusBadge status={personnel.status} />
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-[#e2e8f0]">
              <span className="text-sm font-semibold text-gray-500 block mb-1">
                حساب المستخدم المرتبط بالنظام
              </span>
              {userObj ? (
                <div className="flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] p-2.5 rounded">
                  <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-gray-900 ml-2">{userObj.name}</span>
                    <span className="text-gray-500" dir="ltr">({userObj.email})</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic bg-[#f8fafc] border border-dashed border-[#e2e8f0] p-2.5 rounded">
                  لا يوجد حساب مستخدم مرتبط بهذه البطاقة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Notes */}
      {personnel.notes && (
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-base font-bold text-[#1a202c]">
            <FileText className="w-5 h-5 text-[#2c5282]" />
            <h3>ملاحظات إدارية</h3>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-[#f8fafc] p-4 rounded border border-[#e2e8f0]">
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
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-6">
        <Tabs defaultValue="stages" className="w-full space-y-6" dir="rtl">
          {/* En-tête des onglets */}
          <div className="border-b border-[#e2e8f0] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#1a202c]">
                  سجل المسار الإداري والتكويني
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  سجل التربصات، الترقيات، الخطط الوظيفية، الشهادات العلمية، والعقوبات التأديبية
                </p>
              </div>
            </div>

            <TabsList className="bg-[#f1f5f9] border border-[#cbd5e1] p-1 h-auto flex flex-wrap gap-1 justify-start rounded">
              <TabsTrigger
                value="stages"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>التربصات</span>
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {totalStages}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="promotions"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>الترقيات</span>
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {promotions.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="postes"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                <span>الخطط</span>
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {postes.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="diplomes"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>الشهادات</span>
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {diplomes.length}
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="sanctions"
                className="text-xs sm:text-sm font-bold py-2 px-3 sm:px-4 rounded data-[state=active]:bg-[#2c5282] data-[state=active]:text-white flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>العقوبات</span>
                <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {sanctions.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ======================================================== */}
          {/* ONGLET 1 : التربصات والتكوين */}
          {/* ======================================================== */}
          <TabsContent value="stages" className="space-y-6 focus-visible:outline-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#2c5282]" />
                <span className="text-sm font-bold text-gray-800">
                  سجل الدورات التكوينية والتربصات المنجزة داخل تونس وبالخارج ({totalStages})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setStageToEdit(null);
                    setShowStageDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة تربص</span>
                </Button>
              )}
            </div>

            {/* Sous-section A : التربصات بتونس */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>التربصات بتونس</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    {stagesTunisie.length}
                  </span>
                </h3>
              </div>

              {stagesTunisie.length === 0 ? (
                <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-6 text-center text-xs sm:text-sm text-gray-500">
                  لا توجد تربصات مسجلة داخل تونس لهذا الموظف
                </div>
              ) : (
                <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#f8fafc]">
                      <TableRow>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">موضوع التربص</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">مكان التربص</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">بداية</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">إلى</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المدة</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">النتيجة</TableHead>
                        {canManageStages && (
                          <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagesTunisie.map((st, idx) => (
                        <TableRow key={st._id} className="hover:bg-slate-50">
                          <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-gray-900">{st.sujetStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-700">{st.lieuStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-600">{formatArabicDate(st.dateDebut)}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-600">{formatArabicDate(st.dateFin)}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-bold text-gray-800">{st.duree ? `${st.duree} يوم` : '—'}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-semibold">
                            {st.resultat === 'admis' ? (
                              <span className="text-green-700">ناجح</span>
                            ) : st.resultat === 'refuse' ? (
                              <span className="text-red-700">راسب</span>
                            ) : st.resultat === 'en_attente' ? (
                              <span className="text-amber-700">في الانتظار</span>
                            ) : (
                              <span className="text-gray-400">—</span>
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
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                  title="تعديل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStageToDelete(st)}
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>التربصات بالخارج</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold">
                    {stagesEtranger.length}
                  </span>
                </h3>
              </div>

              {stagesEtranger.length === 0 ? (
                <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-6 text-center text-xs sm:text-sm text-gray-500">
                  لا توجد تربصات مسجلة بالخارج لهذا الموظف
                </div>
              ) : (
                <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#f8fafc]">
                      <TableRow>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">موضوع التربص</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المكان / الدولة</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">بداية</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">إلى</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المدة</TableHead>
                        <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">النتيجة</TableHead>
                        {canManageStages && (
                          <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stagesEtranger.map((st, idx) => (
                        <TableRow key={st._id} className="hover:bg-slate-50">
                          <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-gray-900">{st.sujetStage}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                            {st.lieuStage} {st.pays ? `(${st.pays})` : ''}
                          </TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-600">{formatArabicDate(st.dateDebut)}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs text-gray-600">{formatArabicDate(st.dateFin)}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-bold text-gray-800">{st.duree ? `${st.duree} يوم` : '—'}</TableCell>
                          <TableCell className="py-2.5 px-3 text-xs font-semibold">
                            {st.resultat === 'admis' ? (
                              <span className="text-green-700">ناجح</span>
                            ) : st.resultat === 'refuse' ? (
                              <span className="text-red-700">راسب</span>
                            ) : st.resultat === 'en_attente' ? (
                              <span className="text-amber-700">في الانتظار</span>
                            ) : (
                              <span className="text-gray-400">—</span>
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
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                  title="تعديل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStageToDelete(st)}
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2c5282]" />
                <span className="text-sm font-bold text-gray-800">
                  سجل الترقيات الإدارية وتغييرات الرتب ({promotions.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setPromotionToEdit(null);
                    setShowPromotionDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ترقية</span>
                </Button>
              )}
            </div>

            {promotions.length === 0 ? (
              <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-8 text-center text-xs sm:text-sm text-gray-500">
                لا توجد ترقيات مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">الرتبة السابقة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">الرتبة الجديدة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">تاريخ الترقية</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المرجع / القرار</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">السبب / الملاحظات</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((item, idx) => (
                      <TableRow key={item._id} className="hover:bg-slate-50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm text-gray-600">
                          {item.gradePrecedent || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-gray-900">
                          {item.gradeNouveau}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                          {formatArabicDate(item.datePromotion)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600">
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#2c5282]" />
                <span className="text-sm font-bold text-gray-800">
                  سجل الخطط الوظيفية والتكليفات الإدارية ({postes.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setPosteToEdit(null);
                    setShowPosteDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة خطة</span>
                </Button>
              )}
            </div>

            {postes.length === 0 ? (
              <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-8 text-center text-xs sm:text-sm text-gray-500">
                لا توجد خطط أو تكليفات وظيفية مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">الخطة الوظيفية</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">تاريخ التعيين</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">تاريخ الانتهاء</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المرجع</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">مكان العمل / الإدارة</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postes.map((item, idx) => (
                      <TableRow key={item._id} className="hover:bg-slate-50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-gray-900">
                          {item.poste}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                          {formatArabicDate(item.dateDebut)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                          {item.dateFin ? formatArabicDate(item.dateFin) : (
                            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              إلى حد الآن
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600">
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#2c5282]" />
                <span className="text-sm font-bold text-gray-800">
                  سجل الشهادات والمؤهلات العلمية والتكوينية ({diplomes.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setDiplomeToEdit(null);
                    setShowDiplomeDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة شهادة</span>
                </Button>
              )}
            </div>

            {diplomes.length === 0 ? (
              <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-8 text-center text-xs sm:text-sm text-gray-500">
                لا توجد شهادات علمية أو مهنية مسجلة لهذا الموظف حتى الآن
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">نوع الشهادة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">موضوع / اختصاص الشهادة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">تاريخ الشهادة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المرجع</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المؤسسة المانحة / المستوى</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diplomes.map((item, idx) => (
                      <TableRow key={item._id} className="hover:bg-slate-50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-bold text-gray-900">
                          {item.typeDiplome}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm text-gray-700">
                          {item.sujetDiplome}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                          {formatArabicDate(item.dateObtention)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600 font-mono">
                          {item.reference || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600">
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-gray-800">
                  سجل العقوبات والإجراءات التأديبية ({sanctions.length})
                </span>
              </div>
              {canManageStages && (
                <Button
                  onClick={() => {
                    setSanctionToEdit(null);
                    setShowSanctionDialog(true);
                  }}
                  className="h-9 px-4 text-xs font-bold bg-[#2c5282] hover:bg-[#234269] text-white rounded flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عقوبة</span>
                </Button>
              )}
            </div>

            {sanctions.length === 0 ? (
              <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-8 text-center text-xs sm:text-sm text-gray-500">
                لا توجد أي عقوبات أو تتبعات تأديبية مسجلة لهذا الموظف
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#f8fafc]">
                    <TableRow>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700 w-12">#</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">تاريخ العقوبة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">عدد الأيام</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">السبب</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">نوع العقوبة</TableHead>
                      <TableHead className="text-right py-2.5 px-3 text-xs font-bold text-gray-700">المرجع</TableHead>
                      {canManageStages && (
                        <TableHead className="text-center py-2.5 px-3 text-xs font-bold text-gray-700 w-20">الإجراءات</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sanctions.map((item, idx) => (
                      <TableRow key={item._id} className="hover:bg-slate-50">
                        <TableCell className="py-2.5 px-3 text-xs font-mono text-gray-500">{idx + 1}</TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-700">
                          {formatArabicDate(item.dateSanction)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs font-bold text-gray-800">
                          {item.nombreJours ? `${item.nombreJours} يوم` : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs sm:text-sm font-semibold text-gray-900">
                          {item.raison}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-amber-700 font-medium">
                          {item.typeSanction || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-xs text-gray-600 font-mono">
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                                title="تعديل"
                              >
                                <Edit className="w-3.5 h-3.5" />
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
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              تأكيد حذف التربص
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              هل أنت متأكد من حذف هذا التربص من سجل الموظف؟
              {stageToDelete && (
                <div className="mt-2 font-semibold text-gray-800">
                  {stageToDelete.sujetStage} ({stageToDelete.lieuStage})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => stageToDelete && deleteStageMutation.mutate(stageToDelete._id)}
              className="h-10 text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
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
        <AlertDialogContent className="text-right" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 mt-2">
              هل أنت متأكد من حذف هذا السجل نهائياً؟
              {historyItemToDelete && (
                <div className="mt-2 font-semibold text-gray-800">
                  {historyItemToDelete.title}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-3 mt-4">
            <AlertDialogCancel className="h-10 text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                historyItemToDelete &&
                deleteHistoryMutation.mutate({
                  type: historyItemToDelete.type,
                  id: historyItemToDelete.id,
                })
              }
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

export default PersonnelDetailPage;
