import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import PageBreadcrumb from '@/components/common/PageBreadcrumb';

import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { getScannerStatus, scanTemporaryDocument } from '@/services/scannerService';
import { getDistributableDepartments } from '@/utils/departmentDistributionFilter';
import FormSectionHeader from '@/components/documents/forms/FormSectionHeader';
import IncomingDocumentForm from '@/components/documents/forms/IncomingDocumentForm';
import { useLanguage } from '@/contexts/LanguageProvider';

const CreateIncomingDocument = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  const translations = {
    // Bloc 1 - Traduit via i18n
    title: t('documents.createIncoming.title'),
    back: t('documents.createIncoming.back'),
    serialNumber: t('documents.createIncoming.serialNumber'),
    serialNumberDesc: t('documents.createIncoming.serialNumberDesc'),
    subject: t('documents.createIncoming.subject'),
    subjectDesc: t('documents.createIncoming.subjectDesc'),
    source: t('documents.createIncoming.source'),
    sourceDesc: t('documents.createIncoming.sourceDesc'),
    arrivalDate: t('documents.createIncoming.arrivalDate'),
    arrivalDateDesc: t('documents.createIncoming.arrivalDateDesc'),
    correspondenceNumber: t('documents.createIncoming.correspondenceNumber'),
    correspondenceDate: t('documents.createIncoming.correspondenceDate'),
    typeDocument: t('documents.createIncoming.typeDocument'),
    activity: t('documents.createIncoming.activity'),
    status: t('documents.createIncoming.status'),
    statusDesc: t('documents.createIncoming.statusDesc'),
    department: t('documents.createIncoming.department'),
    departmentDesc: t('documents.createIncoming.departmentDesc'),
    assignedTo: t('documents.forms.assignedDepartments'),
    assignedToDesc: t('documents.forms.assignedDepartmentsDesc'),
    priority: t('documents.createIncoming.priority'),
    priorityDesc: t('documents.createIncoming.priorityDesc'),
    description: t('documents.createIncoming.description'),
    descriptionDesc: t('documents.createIncoming.descriptionDesc'),
    attachments: t('documents.createIncoming.attachments'),
    attachmentsDesc: t('documents.createIncoming.attachmentsDesc'),
    cancel: t('documents.createIncoming.cancel'),
    submit: t('documents.createIncoming.submit'),
    selectDate: t('documents.createIncoming.selectDate'),
    errorLoading: t('documents.createIncoming.errorLoading'),
    required: t('documents.createIncoming.required'),

    // Bloc 2 - Traduit via i18n
    pendingStatus: t('documents.createIncoming.status.pending'),
    processingStatus: t('documents.createIncoming.status.processing'),
    reviewedStatus: t('documents.createIncoming.status.reviewed'),
    completedStatus: t('documents.createIncoming.status.completed'),
    lowPriority: t('documents.createIncoming.priority.low'),
    normalPriority: t('documents.createIncoming.priority.normal'),
    highPriority: t('documents.createIncoming.priority.high'),
    urgentPriority: t('documents.createIncoming.priority.urgent'),
    selectDepartment: t('documents.createIncoming.selectDepartment'),
    selectStatus: t('documents.createIncoming.selectStatus'),
    selectPriority: t('documents.createIncoming.selectPriority'),
    createSuccess: t('documents.createIncoming.createSuccess'),
    createError: t('documents.createIncoming.createError'),
    uploadTab: t('documents.createIncoming.uploadTab'),
    scanTab: t('documents.createIncoming.scanTab'),
    scanDocument: t('documents.createIncoming.scanDocument'),
    scanning: t('documents.createIncoming.scanning'),
    scanComplete: t('documents.createIncoming.scanComplete'),
    scanFailed: t('documents.createIncoming.scanFailed'),
    noScanner: t('documents.createIncoming.noScanner'),
    scannerNotConfigured: t('documents.createIncoming.scannerNotConfigured'),
    configureScanner: t('documents.createIncoming.configureScanner'),
    scanResults: t('documents.createIncoming.scanResults'),
    resolution: t('documents.createIncoming.resolution'),
    format: t('documents.createIncoming.format'),
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

  // Query for organization settings (to exclude BO and Direction from distribution list)
  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings
  });

  const distributableDepartments = React.useMemo(() => {
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
            { label: t('documents.viewIncoming.breadcrumb.mailHub'), to: '/dashboard/mail/incoming' },
            { label: t('documents.viewIncoming.breadcrumb.incomingDocuments'), to: '/dashboard/mail/incoming' },
            { label: translations.title },
          ]}
        />

        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs px-5 py-4">
          <FormSectionHeader
            icon={
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
            }
            title={translations.title}
            subtitle={t('documents.createIncoming.subtitle')}
            backUrl="/dashboard/incoming-documents"
            backText={translations.back}
          />
        </div>

        {/* Form Container */}
        <IncomingDocumentForm
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

export default CreateIncomingDocument;
