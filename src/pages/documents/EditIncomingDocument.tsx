
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getIncomingDocument } from '@/services/documentService';
import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { getScannerStatus, scanTemporaryDocument } from '@/services/scannerService';
import { getDistributableDepartments } from '@/utils/departmentDistributionFilter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Inbox } from 'lucide-react';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import EditIncomingDocumentForm from '@/components/documents/forms/EditIncomingDocumentForm';
import { useDirection } from '@/i18n/useDirection';
import { useLanguage } from '@/contexts/LanguageProvider';

const EditIncomingDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dir } = useDirection();
  const { t } = useLanguage();

  const { data: document, isLoading } = useQuery({
    queryKey: ['incomingDocument', id],
    queryFn: () => getIncomingDocument(id!),
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

  const distributableDepartments = React.useMemo(() => {
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
            title={t('documents.editIncoming.notFoundTitle')}
            description={t('documents.editIncoming.notFoundDesc')}
            className="rounded-xl shadow-xs py-12"
            action={
              <Button
                type="button"
                onClick={() => navigate('/dashboard/incoming-documents')}
                className="h-11 px-5 bg-[#2c5282] hover:bg-[#234269] text-white rounded-lg"
              >
                {t('documents.editIncoming.backToList')}
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
            { label: t('documents.viewIncoming.breadcrumb.mailHub'), to: '/dashboard/mail/incoming' },
            { label: t('documents.viewIncoming.breadcrumb.incomingDocuments'), to: '/dashboard/mail/incoming' },
            {
              label: `#${document.serialNumber} / ${document.year}`,
              to: `/dashboard/mail/incoming/${document._id}`,
              tabular: true,
              ltr: true,
            },
            { label: t('documents.editIncoming.title') },
          ]}
        />

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4">
          <FormSectionHeader
            icon={
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
            }
            title={t('documents.editIncoming.title')}
            backUrl="/dashboard/incoming-documents"
            backText={t('documents.editIncoming.back')}
          />
        </div>

        <EditIncomingDocumentForm 
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

export default EditIncomingDocument;
