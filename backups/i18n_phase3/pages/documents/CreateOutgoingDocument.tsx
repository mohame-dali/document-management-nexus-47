import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2, FileUp, Send } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    mutationFn: (options: any) => scanTemporaryDocument(options)
  });

  if (loadingDepartments) {
    return (
      <div className="flex justify-center items-center h-64 bg-[#f7fafc]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-green-600 font-medium">{t('documents.createOutgoing.loadingData')}</p>
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
      {/* Enhanced Header */}
      <div className="bg-[#2c5282] shadow-sm">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Send className="h-8 w-8 text-white" />
            </div>
            <div>
              <FormSectionHeader 
                title={translations.title}
                backUrl="/dashboard/outgoing-documents"
                backText={translations.back}
                className="text-white"
              />
              <p className="text-green-100 mt-2">{t('documents.createOutgoing.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#f8fafc] p-6 border-b border-[#e2e8f0]">
            <div className="flex items-center gap-3">
              <FileUp className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-800">{t('documents.createOutgoing.cardTitle')}</h2>
            </div>
          </div>
          
          <div className="p-6">
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
      </div>
    </div>
  );
};

export default CreateOutgoingDocument;
