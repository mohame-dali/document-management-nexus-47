
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getOutgoingDocument } from '@/services/documentService';
import { getDepartments } from '@/services/departmentService';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { scanTemporaryDocument } from '@/services/scannerService';
import { getDistributableDepartments } from '@/utils/departmentDistributionFilter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6" dir={dir}>
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600">{t('documents.editOutgoing.notFoundTitle')}</h2>
          <p className="text-gray-500 mb-4">{t('documents.editOutgoing.notFoundDesc')}</p>
          <Button onClick={() => navigate('/dashboard/outgoing-documents')}>
            {t('documents.editOutgoing.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard/outgoing-documents')}
            className="me-2"
          >
            <ArrowLeft className="h-4 w-4 me-1 rtl:rotate-180" />
            {t('documents.editOutgoing.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('documents.editOutgoing.title')}</h1>
        </div>
      </div>

      <EditOutgoingDocumentForm 
        document={document} 
        departments={distributableDepartments}
        scannerStatus={scannerStatus}
        loadingScannerStatus={loadingScannerStatus}
        scanTemporaryDocumentMutation={scanTemporaryDocumentMutation}
      />
    </div>
  );
};

export default EditOutgoingDocument;
