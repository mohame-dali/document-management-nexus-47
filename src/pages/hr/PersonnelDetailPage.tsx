import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import PersonnelDocumentsList from '@/components/hr/PersonnelDocumentsList';

export const PersonnelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: personnel,
    isLoading,
    error,
    refetch,
  } = useQuery<Personnel>({
    queryKey: ['personnel', id],
    queryFn: () => getPersonnelById(id!),
    enabled: Boolean(id),
  });

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
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1a202c]">
                {personnel.nom} {personnel.prenom}
              </h1>
              <PersonnelStatusBadge statut={personnel.statut} />
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

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="h-11 px-4 text-base font-medium text-gray-700 border-[#cbd5e1] rounded hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة للقائمة</span>
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

      {/* 2. Grille des informations */}
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

        {/* B. Informations Professionnelles & Administratives */}
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
          </div>

          {/* Compte Utilisateur Associé */}
          <div className="border-t border-[#f1f5f9] pt-4 mt-4">
            <span className="text-sm font-bold text-gray-700 block mb-2">
              حساب المستخدم المرتبط بالمنظومة (User Account)
            </span>

            {userObj ? (
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-green-100 text-green-700">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{userObj.username}</div>
                    <div className="text-xs text-gray-500">
                      الدور: {userObj.role} {userObj.isActive ? '• نشط' : '• معطل'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                  مرتبط بحساب
                </span>
              </div>
            ) : (
              <div className="bg-[#fffbeb] border border-[#fef3c7] rounded p-4 flex items-center gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <span className="font-semibold block">لا يوجد حساب مستخدم مرتبط حالياً</span>
                  <span className="text-gray-600">
                    يمكن ربط هذه الفيشة بحساب مستخدم أثناء إنشاء المستخدمين في النظام.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Notes */}
      {personnel.notes && (
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-bold text-[#1a202c] border-b border-[#e2e8f0] pb-3 mb-4">
            <FileText className="w-5 h-5 text-[#2c5282]" />
            <h2>الملاحظات</h2>
          </div>
          <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">
            {personnel.notes}
          </p>
        </div>
      )}

      {/* 4. Section Documents Associés */}
      <PersonnelDocumentsList
        personnelId={personnel._id}
        personnelName={`${personnel.nom} ${personnel.prenom}`}
      />
    </div>
  );
};

export default PersonnelDetailPage;
