
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getIncomingDocument } from '@/services/documentService';
import { getDepartments } from '@/services/departmentService';
import { scanTemporaryDocument } from '@/services/scannerService';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import EditIncomingDocumentForm from '@/components/documents/forms/EditIncomingDocumentForm';

const EditIncomingDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: document, isLoading } = useQuery({
    queryKey: ['incomingDocument', id],
    queryFn: () => getIncomingDocument(id!),
    enabled: !!id,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
  });

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
      <div className="p-6" dir="rtl">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600">الوثيقة غير موجودة</h2>
          <p className="text-gray-500 mb-4">الوثيقة التي تبحث عنها غير موجودة أو ليس لديك صلاحية لتعديلها.</p>
          <Button onClick={() => navigate('/dashboard/incoming-documents')}>
            العودة للوثائق الواردة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard/incoming-documents')}
            className="ml-2"
          >
            <ArrowLeft className="h-4 w-4 ml-1" />
            رجوع
          </Button>
          <h1 className="text-2xl font-bold">تعديل الوثيقة الواردة</h1>
        </div>
      </div>

      <EditIncomingDocumentForm 
        document={document} 
        departments={departments}
        scannerStatus={scannerStatus}
        loadingScannerStatus={loadingScannerStatus}
        scanTemporaryDocumentMutation={scanTemporaryDocumentMutation}
      />
    </div>
  );
};

export default EditIncomingDocument;
