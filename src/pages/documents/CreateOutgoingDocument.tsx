import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';

import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { getScannerStatus, scanTemporaryDocument } from '@/services/scannerService';
import { getDistributableDepartments } from '@/utils/departmentDistributionFilter';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import OutgoingDocumentForm from '@/components/documents/forms/OutgoingDocumentForm';
import { useLanguage } from '@/contexts/LanguageProvider';

const CreateOutgoingDocument = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const translations = {
    // Bloc 1 - Traduit via i18n
    title: t('documents.createOutgoing.title'),
    back: t('documents.createOutgoing.back'),
    serialNumber: t('documents.createOutgoing.serialNumber'),
    serialNumberDesc: t('documents.createOutgoing.serialNumberDesc'),
    subject: t('documents.createOutgoing.subject'),
    subjectDesc: t('documents.createOutgoing.subjectDesc'),
    destination: t('documents.createOutgoing.destination'),
    destinationDesc: t('documents.createOutgoing.destinationDesc'),
    issueDate: t('documents.createOutgoing.issueDate'),
    issueDateDesc: t('documents.createOutgoing.issueDateDesc'),
    department: t('documents.createOutgoing.department'),
    departmentDesc: t('documents.createOutgoing.departmentDesc'),
    priority: t('documents.createOutgoing.priority'),
    priorityDesc: t('documents.createOutgoing.priorityDesc'),
    description: t('documents.createOutgoing.description'),
    descriptionDesc: t('documents.createOutgoing.descriptionDesc'),
    attachments: t('documents.createOutgoing.attachments'),
    attachmentsDesc: t('documents.createOutgoing.attachmentsDesc'),
    cancel: t('documents.createOutgoing.cancel'),
    submit: t('documents.createOutgoing.submit'),
    selectDate: t('documents.createOutgoing.selectDate'),
    errorLoading: t('documents.createOutgoing.errorLoading'),
    required: t('documents.createOutgoing.required'),
    selectDepartment: t('documents.createOutgoing.selectDepartment'),

    // Bloc 2 - Traduit via i18n
    createSuccess: t('documents.createOutgoing.createSuccess'),
    createError: t('documents.createOutgoing.createError'),
    uploadTab: t('documents.createOutgoing.uploadTab'),
    scanTab: t('documents.createOutgoing.scanTab'),
    scanDocument: t('documents.createOutgoing.scanDocument'),
    scanning: t('documents.createOutgoing.scanning'),
    scanComplete: t('documents.createOutgoing.scanComplete'),
    scanFailed: t('documents.createOutgoing.scanFailed'),
    noScanner: t('documents.createOutgoing.noScanner'),
    scannerNotConfigured: t('documents.createOutgoing.scannerNotConfigured'),
    configureScanner: t('documents.createOutgoing.configureScanner'),
    scanResults: t('documents.createOutgoing.scanResults'),
    resolution: t('documents.createOutgoing.resolution'),
    format: t('documents.createOutgoing.format'),
    pdfFormat: "PDF",
    jpegFormat: "JPEG",
    pngFormat: "PNG"
  };

  // Check if we have scan data passed from another page
  const scanData = location.state?.scanData;
  
  // Query for departments
  const { data: departments, isLoading: loadingDepartments, isError: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments
  });

  // Query for organization settings (to exclude BO and Direction from department list)
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings
  });

  const distributableDepartments = useMemo(() => {
    return getDistributableDepartments(departments, orgSettings);
  }, [departments, orgSettings]);

  // Query for scanner status
  const { data: scannerStatus, isLoading: loadingScannerStatus } = useQuery({
    queryKey: ['scannerStatus'],
    queryFn: getScannerStatus
  });

  // Start scan mutation
  const scanDocumentMutation = useMutation({
    mutationFn: (options: Record<string, unknown>) => scanTemporaryDocument(options)
  });

  if (loadingDepartments) {
    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-4">
          <Skeleton className="h-5 w-64 rounded-md" />
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
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
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (departmentsError) {
    return (
      <div className="p-6 min-h-screen bg-slate-50/70 dark:bg-slate-950">
        <div className="max-w-xl mx-auto">
          <EmptyState
            icon={<AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />}
            title={translations.title}
            description={translations.errorLoading}
            className="rounded-xl border-red-200/80 dark:border-red-900/60 shadow-xs py-12"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-8 space-y-4">
        {/* Breadcrumb */}
        <PageBreadcrumb
          showHomeIcon
          homeTo="/dashboard"
          homeLabel={t('common.home')}
          items={[
            { label: t('documents.viewOutgoing.breadcrumb.mailHub'), to: '/dashboard/mail/outgoing' },
            { label: t('documents.viewOutgoing.breadcrumb.outgoingDocuments'), to: '/dashboard/mail/outgoing' },
            { label: translations.title },
          ]}
        />

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4">
          <FormSectionHeader
            icon={
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
            }
            title={translations.title}
            subtitle={t('documents.createOutgoing.subtitle')}
            backUrl="/dashboard/outgoing-documents"
            backText={translations.back}
          />
        </div>

        {/* Form Container */}
        <OutgoingDocumentForm
          t={translations}
          departments={distributableDepartments}
          currentDepartmentId={currentUser?.activeDepartment?._id}
          scanData={scanData}
          scannerStatus={scannerStatus}
          loadingScannerStatus={loadingScannerStatus}
          scanTemporaryDocumentMutation={scanDocumentMutation}
        />
      </div>
    </div>
  );
};

export default CreateOutgoingDocument;
