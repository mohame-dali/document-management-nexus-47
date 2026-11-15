import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, FileDown, Inbox } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    mutationFn: (options: any) => scanTemporaryDocument(options)
  });

  if (loadingDepartments) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#f7fafc]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#2c5282] mx-auto mb-4" />
          <p className="text-[#2c5282] font-medium text-base">{t('documents.createIncoming.loadingData')}</p>
        </div>
      </div>
    );
  }

  if (departmentsError) {
    return (
      <div className="p-6 min-h-screen bg-[#f7fafc]">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{translations.errorLoading}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      {/* Header card: carte blanche avec bordure #e2e8f0 */}
      <div className="pt-6 px-6 max-w-6xl mx-auto">
        <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-[#2c5282] p-3 rounded text-white flex-shrink-0">
              <Inbox className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <FormSectionHeader 
                title={translations.title}
                backUrl="/dashboard/incoming-documents"
                backText={translations.back}
                className="text-[#1a202c] mb-1"
              />
              <p className="text-base text-[#4a5568]">{t('documents.createIncoming.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="bg-[#f8fafc] p-5 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <FileDown className="h-5 w-5 text-[#2c5282]" />
              <h2 className="text-lg font-bold text-[#1a202c]">{t('documents.createIncoming.cardTitle')}</h2>
            </div>
          </div>
          
          <div className="p-6">
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
      </div>
    </div>
  );
};

export default CreateIncomingDocument;
