import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { updateOutgoingDocument } from '@/services/documentService';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BasicInfoFields from './outgoing/BasicInfoFields';
import DocumentAttachmentSection from './outgoing/DocumentAttachmentSection';
import { OutgoingDocument, Department } from '@/types';

interface EditOutgoingDocumentFormProps {
  document: OutgoingDocument;
  departments: Department[];
  scannerStatus?: any;
  loadingScannerStatus?: boolean;
  scanTemporaryDocumentMutation?: any;
}

const formSchema = z.object({
  serialNumber: z.string().min(1, 'Required'),
  year: z.string().min(1, 'Required'),
  subject: z.string().min(1, 'Required'),
  assignedTo: z.string().array().min(1, 'At least one destination is required'),
  issueDate: z.date(),
  department: z.string().min(1, 'Required'),
  typeDocument: z.string().optional(),
  pourInfo: z.string().array().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EditOutgoingDocumentForm: React.FC<EditOutgoingDocumentFormProps> = ({
  document,
  departments,
  scannerStatus,
  loadingScannerStatus = false,
  scanTemporaryDocumentMutation
}) => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanSettings, setScanSettings] = useState({
    resolution: '600',
    format: 'pdf'
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: document.serialNumber?.toString() || '',
      year: document.year?.toString() || new Date().getFullYear().toString(),
      subject: document.subject || '',
      assignedTo: document.assignedTo || [],
      issueDate: document.issueDate ? new Date(document.issueDate) : new Date(),
      department: typeof document.source?.id === 'string' ? document.source.id : document.source?.id?._id || '',
      typeDocument: document.typeDocument || '',
      pourInfo: document.pourInfo || [],
    }
  });

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setScanResult(null);
  };

  const handleScanSettingChange = (key: string, value: string) => {
    setScanSettings({
      ...scanSettings,
      [key]: value
    });
  };

  const handleStartScan = () => {
    if (!scanTemporaryDocumentMutation) return;
    
    setScanning(true);
    setScanProgress(10);
    
    const scanOptions = {
      documentType: 'outgoing',
      format: scanSettings.format,
      resolution: Number(scanSettings.resolution),
      temporary: true
    };
    
    const progressInterval = setInterval(() => {
      setScanProgress(prevProgress => {
        const newProgress = prevProgress + 15;
        if (newProgress >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return newProgress;
      });
    }, 500);
    
    scanTemporaryDocumentMutation.mutate(scanOptions, {
      onSuccess: (response: any) => {
        setScanning(false);
        setScanProgress(100);
        setScanResult(response.data);
        toast.success('تم المسح بنجاح');
        setSelectedFiles([]);
        clearInterval(progressInterval);
        
        // Auto-populate form fields from OCR text
        if (response.data?.ocrText) {
          const text = response.data.ocrText;
          console.log('OCR Text extracted:', text);
          
          // Try to extract Arabic text patterns
          const lines = text.split('\n').filter(line => line.trim());
          
          // Look for subject patterns in both Arabic and other languages
          const subjectPatterns = [
            /الموضوع\s*:?\s*(.+)/i,
            /subject\s*:?\s*(.+)/i,
            /objet\s*:?\s*(.+)/i,
            /re\s*:?\s*(.+)/i
          ];
          
          for (const pattern of subjectPatterns) {
            const match = text.match(pattern);
            if (match && match[1]?.trim()) {
              form.setValue('subject', match[1].trim());
              break;
            }
          }
        }
      },
      onError: (error: Error) => {
        setScanning(false);
        setScanProgress(0);
        toast.error(`فشل في المسح: ${error.message}`);
        clearInterval(progressInterval);
      }
    });
  };

  const handleRemoveScan = () => {
    setScanResult(null);
    setActiveTab("upload");
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      
      formData.append('serialNumber', data.serialNumber);
      formData.append('year', data.year);
      formData.append('subject', data.subject);
      
      if (data.assignedTo && data.assignedTo.length > 0) {
        formData.append('assignedTo', data.assignedTo.join(','));
      }
      
      if (data.pourInfo && data.pourInfo.length > 0) {
        formData.append('pourInfo', data.pourInfo.join(','));
      }
      
      if (data.issueDate) {
        formData.append('issueDate', data.issueDate.toISOString());
      }
      
      formData.append('departmentId', data.department);
      
      if (data.typeDocument) {
        formData.append('typeDocument', data.typeDocument);
      }
      
      // Handle file upload or scan result
      if (selectedFiles.length > 0) {
        formData.append('document', selectedFiles[0]);
      } else if (scanResult?.filePath) {
        // Clean the file path for backend processing
        const relativePath = scanResult.filePath.replace(/^[\/\\]+/, '');
        formData.append('scannedDocumentPath', relativePath);
        
        if (scanResult.ocrText) {
          formData.append('ocrText', scanResult.ocrText);
        }
      }
      
      await updateOutgoingDocument(document._id, formData);
      toast.success('تم تحديث الوثيقة بنجاح');
      navigate('/dashboard/outgoing-documents');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('فشل في تحديث الوثيقة');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/outgoing-documents');
  };

  const t = {
    title: 'تعديل الوثيقة الصادرة',
    subject: 'الموضوع',
    subjectDesc: 'موضوع الوثيقة',
    destination: 'الوجهة',
    cancel: 'إلغاء',
    submit: 'تحديث الوثيقة',
    attachments: 'مرفق الوثيقة',
    attachmentsDesc: 'رفع وثيقة جديدة أو إعادة مسح ضوئي لاستبدال الموجودة',
    uploadTab: 'رفع ملف',
    scanTab: 'مسح ضوئي',
    scanComplete: 'تم المسح بنجاح',
    scanFailed: 'فشل في المسح',
    required: 'مطلوب',
    serialNumber: 'الرقم التسلسلي',
    serialNumberDesc: 'الرقم التسلسلي للوثيقة',
    year: 'السنة',
    yearDesc: 'سنة الوثيقة',
    issueDate: 'تاريخ الإصدار',
    issueDateDesc: 'تاريخ إصدار الوثيقة',
    department: 'القسم',
    departmentDesc: 'القسم المصدر',
    selectDepartment: 'اختر القسم',
    selectDate: 'اختر التاريخ'
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="shadow-sm border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">المعلومات الأساسية</h3>
                </div>
                
                <div className="bg-muted/30 rounded p-6 border border-border/50">
                  <BasicInfoFields
                    form={form}
                    t={t}
                    departments={departments}
                  />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Document Attachment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">مرفقات الوثيقة</h3>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {t.attachmentsDesc}
                  </span>
                </div>
                
                <div className="bg-muted/20 rounded p-6 border border-border/50">
                  <DocumentAttachmentSection
                    t={t}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    handleFileSelect={handleFileSelect}
                    scanSettings={scanSettings}
                    handleScanSettingChange={handleScanSettingChange}
                    scanning={scanning}
                    scanProgress={scanProgress}
                    scanResult={scanResult}
                    scannerStatus={scannerStatus}
                    loadingScannerStatus={loadingScannerStatus}
                    handleStartScan={handleStartScan}
                    onRemoveScan={handleRemoveScan}
                  />
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="bg-muted/20 border-t border-border/50 p-6 flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            className="min-w-24 hover:bg-muted/50"
          >
            {t.cancel}
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            className="min-w-32 bg-primary hover:bg-primary/90"
          >
            {t.submit}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EditOutgoingDocumentForm;
