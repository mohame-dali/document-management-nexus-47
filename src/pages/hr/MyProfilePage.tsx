import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  FileBadge
} from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

export const MyProfilePage: React.FC = () => {
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
  });

  // 2. Récupération des documents associés à la fiche Personnel
  const {
    data: documents = [],
    isLoading: isDocsLoading,
  } = useQuery<PersonnelDocument[]>({
    queryKey: ['hr', 'my-documents'],
    queryFn: getMyDocuments,
    enabled: Boolean(personnel),
    retry: false,
  });

  // État de chargement
  if (isProfileLoading) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282]" />
          <span className="text-base text-gray-600 font-medium">جاري تحميل ملفك الشخصي...</span>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'a PAS de fiche Personnel (404 ou null) :
  // Afficher un message d'information sobre, sans erreur bloquante
  if (!personnel || isProfileError) {
    return (
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-right" dir="rtl">
        <div className="bg-white border border-[#e2e8f0] rounded p-8 shadow-sm">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center mx-auto">
              <Info className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#1a202c]">
              ملفي الشخصي (Mon Profil)
            </h1>
            <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-gray-700">
              <p className="text-base font-semibold text-gray-900 mb-1">
                Aucune fiche Personnel n'est associée à votre compte.
              </p>
              <p className="text-sm text-gray-600">
                لا توجد أي بطاقة موظف مرتبطة بحسابك الحالي في قسم الموارد البشرية. إذا كنت بحاجة إلى ربط حسابك، يرجى التواصل مع مسؤول النظام أو إدارة الموارد البشرية.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetchProfile()}
              className="h-11 px-5 text-sm font-medium border-[#cbd5e1] rounded text-[#2c5282] hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تحديث الصفحة</span>
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

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* 1. En-tête : Nom + Prénom + badge de statut (lecture seule) */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonnelAvatar
            photo={personnel.photo}
            nom={personnel.nom}
            prenom={personnel.prenom}
            size="lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1a202c]">
                {personnel.nom} {personnel.prenom}
              </h1>
              <PersonnelStatusBadge statut={personnel.statut} />
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                وضع القراءة فقط
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-2 font-medium">
              {personnel.cin && (
                <span>
                  رقم ب.ت.و: <strong className="text-gray-900 font-mono">{personnel.cin}</strong>
                </span>
              )}
              {personnel.poste && (
                <span>
                  الوظيفة: <strong className="text-gray-900">{personnel.poste}</strong>
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

        <div className="flex items-center gap-2">
          <Link to="/dashboard/hr/my-attendance">
            <Button
              variant="outline"
              className="h-11 px-4 text-xs font-bold border-[#2c5282] text-[#2c5282] hover:bg-blue-50 flex items-center gap-2 rounded"
            >
              <CalendarCheck className="h-4 w-4" />
              <span>عرض تقويم حضوري</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Grille des informations (Personnelles & Professionnelles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A. Informations personnelles */}
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
              <span className="text-sm font-semibold text-gray-500 block">الجنس</span>
              <span className="text-gray-800">
                {personnel.sexe === 'Homme' ? 'ذكر' : personnel.sexe === 'Femme' ? 'أنثى' : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">رقم ب.ت.و (CIN)</span>
              <span className="font-mono text-gray-800">{personnel.cin || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ الازدياد</span>
              <span className="text-gray-800">
                {personnel.dateNaissance ? formatArabicDate(personnel.dateNaissance) : '—'}
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">مكان الازدياد</span>
              <span className="text-gray-800">{personnel.lieuNaissance || '—'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-gray-500 block">العنوان الشخصي</span>
              <span className="text-gray-800 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{personnel.adresse || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">رقم الهاتف</span>
              <span className="text-gray-800 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{personnel.telephone || '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">البريد الإلكتروني الشخصي</span>
              <span className="text-gray-800 flex items-center gap-1.5 mt-0.5" dir="ltr">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="truncate">{personnel.emailPersonnel || '—'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* B. Informations professionnelles */}
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3">
            <Briefcase className="w-5 h-5 text-[#2c5282]" />
            <h2>المعلومات المهنية والإدارية</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div>
              <span className="text-sm font-semibold text-gray-500 block">الوظيفة / المنصب</span>
              <span className="font-bold text-gray-900">{personnel.poste || '—'}</span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">القسم الرئيسي</span>
              <span className="text-gray-800 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{departmentObj ? departmentObj.name : '—'}</span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ التعيين أو الالتحاق</span>
              <span className="text-gray-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  {personnel.dateEmbauche ? formatArabicDate(personnel.dateEmbauche) : '—'}
                </span>
              </span>
            </div>

            <div>
              <span className="text-sm font-semibold text-gray-500 block">تاريخ إنشاء البطاقة</span>
              <span className="text-gray-800">
                {personnel.createdAt ? formatArabicDate(personnel.createdAt) : '—'}
              </span>
            </div>

            {/* Notes */}
            {personnel.notes && (
              <div className="sm:col-span-2 border-t border-[#f1f5f9] pt-3">
                <span className="text-sm font-semibold text-gray-500 block mb-1">
                  ملاحظات إدارية
                </span>
                <p className="text-sm text-gray-700 bg-[#f8fafc] border border-[#e2e8f0] rounded p-3 whitespace-pre-wrap">
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
