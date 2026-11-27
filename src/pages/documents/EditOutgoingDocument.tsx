
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getOutgoingDocument } from '@/services/documentService';
import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { scanTemporaryDocument } from '@/services/scannerService';
import { getDistributableDepartments } from '@/utils/departmentDistributionFilter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Send } from 'lucide-react';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import EditOutgoingDocumentForm from '@/components/documents/forms/EditOutgoingDocumentForm';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';

const EditOutgoingDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dir } = useDirection();
  const { t } = useLanguage();

  const { data: document, isLoading } = useQuery({
    queryKey: ['outgoingDocument', id],
    queryFn: () => getOutgoingDocument(id!),
    enabled: !!id,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
  });

  const distributableDepartments = useMemo(() => {
    return getDistributableDepartments(departments, orgSettings);
  }, [departments, orgSettings]);

  const { data: scannerStatus, isLoading: loadingScannerStatus } = useQuery({
    queryKey: ['scannerStatus'],
    queryFn: async () => {
      try {
        const { getScannerStatus } = await import('@/services/scannerService');
        return await getScannerStatus();
      } catch (error) {
        console.log('Scanner service not available:', error);
        return null;
      }
    },
  });

  const scanTemporaryDocumentMutation = useMutation({
    mutationFn: scanTemporaryDocument,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950" dir={dir}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-4">
          <Skeleton className="h-5 w-64 rounded-md" />
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-6" dir={dir}>
        <div className="max-w-xl mx-auto pt-8">
          <EmptyState
            icon={<FileText className="h-6 w-6 text-[#2c5282] dark:text-sky-400" />}
            title={t('documents.editOutgoing.notFoundTitle')}
            description={t('documents.editOutgoing.notFoundDesc')}
            className="rounded-xl shadow-xs py-12"
            action={
              <Button
                type="button"
                onClick={() => navigate('/dashboard/outgoing-documents')}
                className="h-11 px-5 bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg"
              >
                {t('documents.editOutgoing.backToList')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950" dir={dir}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-4">
        <PageBreadcrumb
          showHomeIcon
          homeTo="/dashboard"
          homeLabel={t('common.home')}
          items={[
            { label: t('documents.viewOutgoing.breadcrumb.mailHub'), to: '/dashboard/mail/outgoing' },
            { label: t('documents.viewOutgoing.breadcrumb.outgoingDocuments'), to: '/dashboard/mail/outgoing' },
            {
              label: `#${document.serialNumber} / ${document.year}`,
              to: `/dashboard/mail/outgoing/${document._id}`,
              tabular: true,
              ltr: true,
            },
            { label: t('documents.editOutgoing.title') },
          ]}
        />

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4">
          <FormSectionHeader
            icon={
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
            }
            title={t('documents.editOutgoing.title')}
            backUrl="/dashboard/outgoing-documents"
            backText={t('documents.editOutgoing.back')}
          />
        </div>

        <EditOutgoingDocumentForm 
          document={document} 
          departments={distributableDepartments}
          scannerStatus={scannerStatus}
          loadingScannerStatus={loadingScannerStatus}
          scanTemporaryDocumentMutation={scanTemporaryDocumentMutation}
        />
      </div>
    </div>
  );
};

export default EditOutgoingDocument;
