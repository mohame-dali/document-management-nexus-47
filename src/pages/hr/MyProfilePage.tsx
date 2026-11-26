import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { getMyProfile, getMyDocuments } from '@/services/hr/personnelApi';
import { Personnel, PersonnelDocument } from '@/types/hr';
import { Department } from '@/types';
import PersonnelStatusBadge from '@/components/hr/PersonnelStatusBadge';
import PersonnelAvatar from '@/components/hr/PersonnelAvatar';
import MyDocumentsList from '@/components/hr/MyDocumentsList';
import { Button } from '@/components/ui/button';
import {
  User as UserIcon,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Calendar,
  CalendarCheck,
  MapPin,
  RefreshCw,
  Info,
  FileText,
  FileBadge,
  Printer,
} from 'lucide-react';
import { formatLongDate } from '@/utils/formatDate';
import { generateCarteInstruction } from '@/services/carteInstructionService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { getDepartmentLabel } from '@/utils/departmentLabels';
import { useDirection } from '@/i18n/useDirection';

export const MyProfilePage: React.FC = () => {
  const { dir, isRTL } = useDirection();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Récupération de la fiche Personnel de l'utilisateur connecté
  const {
    data: personnel,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery<Personnel | null>({
    queryKey: ['hr', 'my-profile'],
    queryFn: getMyProfile,
    retry: false,
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  // Handler de génération de la carte d'instruction
  const handleGenerateCarteInstruction = async () => {
    try {
      setIsGeneratingPdf(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/hr/my-profile/full-history', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      const resData = response.data?.data;
      if (!resData) {
        throw new Error('Aucune donnée reçue');
      }

      const fullHistory = {
        promotions: resData.promotions || [],
        postes: resData.postes || [],
        diplomes: resData.diplomes || [],
        sanctions: resData.sanctions || [],
      };

      const stages = {
        tunisie: resData.stagesTunisie || [],
        etranger: resData.stagesEtranger || [],
      };

      await generateCarteInstruction(
        resData.personnel || personnel,
        fullHistory,
        stages
      );
      toast.success('تم إنشاء وتحميل بطاقة الإرشادات بنجاح');
    } catch (err) {
      console.error('Erreur génération بطاقة إرشادات:', err);
      toast.error('حدث خطأ أثناء إنشاء بطاقة الإرشادات');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Récupération des documents associés à la fiche Personnel
  const {
    data: documents = [],
    isLoading: isDocsLoading,
  } = useQuery<PersonnelDocument[]>({
    queryKey: ['hr', 'my-documents'],
    queryFn: getMyDocuments,
    enabled: Boolean(personnel),
    retry: false,
    refetchInterval: 60 * 1000, // 1 minute
    refetchIntervalInBackground: false,
  });

  // 3. Récupération des paramètres d'organisation (pour mapper BO, Direction, RH en arabe)
  const { data: orgSettings } = useQuery({
    queryKey: ['organizationSettings'],
    queryFn: getOrganizationSettings,
    staleTime: 300000,
  });

  // État de chargement
  if (isProfileLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282] dark:text-blue-400" />
          <span className="text-base text-slate-600 dark:text-slate-300 font-medium">
            {isRTL ? 'جاري تحميل ملفك الشخصي...' : 'Chargement de votre profil...'}
          </span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'a PAS de fiche Personnel (404 ou null) :
  // Afficher un message d'information sobre, sans erreur bloquante
  if (!personnel || isProfileError) {
    return (
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-start" dir={dir}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-8 shadow-sm">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#2c5282] dark:text-blue-300 flex items-center justify-center mx-auto">
              <Info className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isRTL ? 'ملفي الشخصي' : 'Mon Profil'}
            </h1>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {isRTL
                  ? 'لا توجد بطاقة موظف مرتبطة بحسابك الحالي.'
                  : "Aucune fiche Personnel n'est associée à votre compte."}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isRTL
                  ? 'لا توجد أي بطاقة موظف مرتبطة بحسابك الحالي في قسم الموارد البشرية. إذا كنت بحاجة إلى ربط حسابك، يرجى التواصل مع مسؤول النظام أو إدارة الموارد البشرية.'
                  : "Aucune fiche employé n'est actuellement liée à votre compte utilisateur. Veuillez contacter l'administrateur ou la direction des ressources humaines."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetchProfile()}
              className="h-11 px-5 text-sm font-medium border-slate-300 dark:border-slate-700 rounded-lg text-[#2c5282] dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isRTL ? 'تحديث الصفحة' : 'Actualiser'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const departmentObj =
    personnel.activeDepartment && typeof personnel.activeDepartment === 'object'
      ? (personnel.activeDepartment as Department)
      : null;

  const departmentDisplayName = getDepartmentLabel(
    departmentObj || personnel.activeDepartment,
    orgSettings
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-start" dir={dir}>
      {/* 1. En-tête : Nom + Prénom + badge de statut (lecture seule) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonnelAvatar
            photo={personnel.photo}
            nom={personnel.nom}
            prenom={personnel.prenom}
            size="lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {personnel.nom} {personnel.prenom}
              </h1>
              <PersonnelStatusBadge statut={personnel.statut} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {isRTL ? 'وضع القراءة فقط' : 'Lecture seule'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300 mt-2 font-medium">
              {personnel.cin && (
                <span>
                  {isRTL ? 'رقم ب.ت.و:' : 'CIN :'}{' '}
                  <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">{personnel.cin}</strong>
                </span>
              )}
              {personnel.poste && (
                <span>
                  {isRTL ? 'الوظيفة:' : 'Poste :'}{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{personnel.poste}</strong>
                </span>
              )}
              {departmentDisplayName && departmentDisplayName !== '—' && (
                <span>
                  {isRTL ? 'القسم:' : 'Département :'}{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{departmentDisplayName}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateCarteInstruction}
            disabled={isGeneratingPdf}
            className="h-11 px-4 text-xs font-bold border-[#2c5282] dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/40 text-[#2c5282] dark:text-blue-200 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 flex items-center gap-2 rounded-lg shadow-sm transition-colors"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>{isRTL ? 'بطاقة إرشادات' : "Fiche d'instruction"}</span>
          </Button>

          <Link to="/dashboard/hr/my-attendance">
            <Button
              variant="outline"
              className="h-11 px-4 text-xs font-bold border-[#2c5282] dark:border-blue-700 text-[#2c5282] dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 rounded-lg"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>{isRTL ? 'عرض تقويم حضوري' : 'Mon calendrier de présence'}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Grille des informations (Personnelles & Professionnelles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Informations personnelles */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <UserIcon className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
            <h2>{isRTL ? 'المعلومات الشخصية' : 'Informations personnelles'}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'اللقب' : 'Nom'}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.nom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'الاسم' : 'Prénom'}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.prenom}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'الجنس' : 'Sexe'}
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                {personnel.sexe === 'Homme'
                  ? isRTL ? 'ذكر' : 'Homme'
                  : personnel.sexe === 'Femme'
                  ? isRTL ? 'أنثى' : 'Femme'
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'رقم ب.ت.و (CIN)' : 'CIN'}
              </span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{personnel.cin || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'تاريخ الازدياد' : 'Date de naissance'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                {personnel.dateNaissance ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateNaissance, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'مكان الازدياد' : 'Lieu de naissance'}
              </span>
              <span className="text-slate-800 dark:text-slate-200">{personnel.lieuNaissance || '—'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'العنوان الشخصي' : 'Adresse'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{personnel.adresse || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'رقم الهاتف' : 'Téléphone'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 tabular-nums" dir="ltr">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{personnel.telephone || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'البريد الإلكتروني الشخصي' : 'Email personnel'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="truncate">{personnel.emailPersonnel || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* B. Informations professionnelles */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <Briefcase className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
            <h2>{isRTL ? 'المعلومات المهنية والإدارية' : 'Informations professionnelles'}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'الوظيفة / المنصب' : 'Poste / Fonction'}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{personnel.poste || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'القسم الرئيسي' : 'Département'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>{departmentDisplayName}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'تاريخ التعيين أو الالتحاق' : "Date d'embauche"}
              </span>
              <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 tabular-nums">
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                {personnel.dateEmbauche ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.dateEmbauche, isRTL ? 'ar' : 'fr')}</bdi>
                ) : <span>—</span>}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block">
                {isRTL ? 'تاريخ إنشاء البطاقة' : 'Date de création'}
              </span>
              <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                {personnel.createdAt ? (
                  <bdi dir={dir} className="tabular-nums">{formatLongDate(personnel.createdAt, isRTL ? 'ar' : 'fr')}</bdi>
                ) : '—'}
              </span>
            </div>

            {/* Notes */}
            {personnel.notes && (
              <div className="sm:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  {isRTL ? 'ملاحظات إدارية' : 'Notes administratives'}
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-lg p-3 whitespace-pre-wrap">
                  {personnel.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Section "الوثائق الإدارية والتدريبية" (Formation et Stage) */}
      <MyDocumentsList documents={documents} isLoading={isDocsLoading} />
    </div>
  );
};

export default MyProfilePage;
