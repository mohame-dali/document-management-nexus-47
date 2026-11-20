import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  getPersonnelById,
  createPersonnel,
  updatePersonnel,
  uploadPersonnelPhoto,
} from '@/services/hr/personnelApi';
import { Personnel } from '@/types/hr';
import { useDirection } from '@/i18n/useDirection';
import PersonnelForm from '@/components/hr/PersonnelForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, UserPlus, UserCog, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const PersonnelFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const isEditMode = Boolean(id);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // En mode édition, charger les données existantes
  const {
    data: initialData,
    isLoading: isLoadingData,
    error: loadError,
  } = useQuery<Personnel>({
    queryKey: ['personnel', id],
    queryFn: () => getPersonnelById(id!),
    enabled: isEditMode,
  });

  const handleSubmit = async (formData: Partial<Personnel>, photoFile?: File | null) => {
    setIsSaving(true);

    if (isEditMode && id) {
      try {
        await updatePersonnel(id, formData);

        if (photoFile) {
          setIsUploadingPhoto(true);
          try {
            await uploadPersonnelPhoto(id, photoFile);
            toast.success(t('hr.form.toasts.updateWithPhotoSuccess'));
          } catch (photoErr) {
            console.error('Error uploading photo during edit:', photoErr);
            toast.warning(t('hr.form.toasts.updatePhotoWarning'));
          } finally {
            setIsUploadingPhoto(false);
          }
        } else {
          toast.success(t('hr.form.toasts.updateSuccess'));
        }

        queryClient.invalidateQueries({ queryKey: ['personnel'] });
        queryClient.invalidateQueries({ queryKey: ['hr', 'personnel'] });
        queryClient.invalidateQueries({ queryKey: ['personnel', id] });
        navigate(`/dashboard/hr/personnel/${id}`);
      } catch (error: unknown) {
        const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
        toast.error(msg || t('hr.form.toasts.updateError'));
      } finally {
        setIsSaving(false);
      }
    } else {
      // Mode Création
      try {
        const newPersonnel = await createPersonnel(formData);
        const nestedData = newPersonnel as unknown as { data?: { _id?: string }; id?: string } | undefined;
        const newId = newPersonnel?._id || nestedData?.data?._id || nestedData?.id;

        if (newId && photoFile) {
          setIsUploadingPhoto(true);
          try {
            await uploadPersonnelPhoto(newId, photoFile);
            toast.success(t('hr.form.toasts.createWithPhotoSuccess'));
          } catch (photoErr) {
            console.error('Error uploading photo during creation:', photoErr);
            toast.warning(t('hr.form.toasts.createPhotoWarning'));
          } finally {
            setIsUploadingPhoto(false);
          }
        } else {
          toast.success(t('hr.form.toasts.createSuccess'));
        }

        queryClient.invalidateQueries({ queryKey: ['personnel'] });
        queryClient.invalidateQueries({ queryKey: ['hr', 'personnel'] });
        if (newId) {
          navigate(`/dashboard/hr/personnel/${newId}`);
        } else {
          navigate('/dashboard/hr/personnel');
        }
      } catch (error: unknown) {
        const msg = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
        toast.error(msg || t('hr.form.toasts.createError'));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/dashboard/hr/personnel/${id}`);
    } else {
      navigate('/dashboard/hr/personnel');
    }
  };

  const fullName = `${initialData?.nom || ''} ${initialData?.prenom || ''}`.trim();

  return (
    <div className={`max-w-[1400px] mx-auto p-4 sm:p-6 space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* En-tête */}
      <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-[#ebf4ff] text-[#2c5282]">
            {isEditMode ? <UserCog className="w-7 h-7" /> : <UserPlus className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a202c]">
              {isEditMode ? t('hr.form.page.editTitle') : t('hr.form.page.createTitle')}
            </h1>
            <p className="text-base text-gray-600 mt-1">
              {isEditMode
                ? t('hr.form.page.editSubtitle', { name: fullName })
                : t('hr.form.page.createSubtitle')}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleCancel}
          className="h-11 px-4 text-base font-medium text-gray-700 border-[#cbd5e1] rounded hover:bg-gray-50 flex items-center gap-2"
        >
          {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          <span>{t('hr.form.page.backToList')}</span>
        </Button>
      </div>

      {/* Contenu du formulaire */}
      {isEditMode && isLoadingData ? (
        <div className="bg-white border border-[#e2e8f0] rounded p-12 text-center text-gray-500">
          <div className="flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#2c5282]" />
            <span className="text-base">{t('hr.form.page.loading')}</span>
          </div>
        </div>
      ) : isEditMode && loadError ? (
        <div className="bg-white border border-red-200 rounded p-8 text-center text-red-600">
          <p className="text-lg font-bold">{t('hr.form.page.notFound')}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/hr/personnel')}
            className="mt-4"
          >
            {t('hr.form.page.backToList')}
          </Button>
        </div>
      ) : (
        <PersonnelForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSaving || isUploadingPhoto}
        />
      )}
    </div>
  );
};

export default PersonnelFormPage;
