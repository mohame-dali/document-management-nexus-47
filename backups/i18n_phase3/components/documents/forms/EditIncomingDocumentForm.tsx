
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { updateIncomingDocument } from '@/services/documentService';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import SerialInfoFields from './incoming/SerialInfoFields';
import CorrespondenceFields from './incoming/CorrespondenceFields';
import DocumentDetailsFields from './incoming/DocumentDetailsFields';
import AttachmentSection from './incoming/AttachmentSection';
import { IncomingDocument } from '@/types';

interface EditIncomingDocumentFormProps {
  document: IncomingDocument;
  departments?: any[];
  scannerStatus?: any;
  loadingScannerStatus?: boolean;
  scanTemporaryDocumentMutation?: any;
}

const formSchema = z.object({
  serialNumber: z.string().min(1, 'Required'),
  year: z.string().min(1, 'Required'),
  subject: z.string().min(1, 'Required'),
  source: z.string().min(1, 'Required'),
  arrivalDate: z.date(),
  correspondenceNumber: z.string().min(1, 'Required'),
  correspondenceDate: z.date(),
  typeDocument: z.string().optional(),
  activity: z.string().optional(),
  dateActivity: z.date().optional().nullable(),
  departments: z.string().array().optional()
});

type FormValues = z.infer<typeof formSchema>;

const EditIncomingDocumentForm: React.FC<EditIncomingDocumentFormProps> = ({ 
  document, 
  departments = [],
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
      source: document.source || '',
      arrivalDate: document.arrivalDate ? new Date(document.arrivalDate) : new Date(),
      correspondenceNumber: document.correspondenceNumber || '',
      correspondenceDate: document.correspondenceDate ? new Date(document.correspondenceDate) : new Date(),
      typeDocument: document.typeDocument || '',
      activity: document.activity || '',
      dateActivity: document.dateActivity ? new Date(document.dateActivity) : null,
      departments: document.assignedTo?.map(dept => 
        typeof dept.id === 'string' ? dept.id : dept.id._id || dept.id.toString()
      ) || []
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
      documentType: 'incoming',
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
          
          // Look for source patterns
          const sourcePatterns = [
            /من\s*:?\s*(.+)/i,
            /المرسل\s*:?\s*(.+)/i,
            /from\s*:?\s*(.+)/i,
            /sender\s*:?\s*(.+)/i,
            /expéditeur\s*:?\s*(.+)/i
          ];
          
          for (const pattern of sourcePatterns) {
            const match = text.match(pattern);
            if (match && match[1]?.trim()) {
              form.setValue('source', match[1].trim());
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
      formData.append('source', data.source);
      
      if (data.arrivalDate) {
        formData.append('arrivalDate', data.arrivalDate.toISOString());
      }
      if (data.correspondenceDate) {
        formData.append('correspondenceDate', data.correspondenceDate.toISOString());
      }
      
      formData.append('correspondenceNumber', data.correspondenceNumber);
      
      if (data.departments && data.departments.length) {
        const cleanDepartmentIds = data.departments.filter(id => id && id.length === 24);
        formData.append('departmentIds', cleanDepartmentIds.join(','));
      }
      
      if (data.activity) {
        formData.append('activity', data.activity);
        if (data.dateActivity) {
          formData.append('dateActivity', data.dateActivity.toISOString());
        }
      }
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
      
      await updateIncomingDocument(document._id, formData);
      toast.success('تم تحديث الوثيقة بنجاح');
      navigate('/dashboard/incoming-documents');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('فشل في تحديث الوثيقة');
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/incoming-documents');
  };

  const t = {
    title: 'تعديل الوثيقة الواردة',
    serialInfo: 'معلومات الرقم التسلسلي',
    correspondence: 'معلومات المراسلة',
    documentDetails: 'تفاصيل الوثيقة',
    attachments: 'مرفقات الوثيقة',
    attachmentsDesc: 'رفع وثيقة جديدة أو إعادة مسح ضوئي لاستبدال الموجودة',
    cancel: 'إلغاء',
    submit: 'تحديث الوثيقة',
    uploadTab: 'رفع ملف',
    scanTab: 'مسح ضوئي',
    scanComplete: 'تم المسح بنجاح',
    scanFailed: 'فشل في المسح',
    subject: 'الموضوع',
    subjectDesc: 'موضوع الوثيقة',
    source: 'المصدر',
    sourceDesc: 'مصدر الوثيقة',
    serialNumber: 'الرقم التسلسلي',
    serialNumberDesc: 'الرقم التسلسلي للوثيقة',
    year: 'السنة',
    yearDesc: 'سنة الوثيقة'
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="shadow-sm border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Serial Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-green-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.serialInfo}</h3>
                </div>
                
                <div className="bg-green-50/50 dark:bg-green-500/5 rounded p-6 border border-green-200/50 dark:border-green-500/20">
                  <SerialInfoFields form={form} t={t} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Correspondence Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-blue-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.correspondence}</h3>
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded p-6 border border-blue-200/50 dark:border-blue-500/20">
                  <CorrespondenceFields form={form} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Document Details Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-purple-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.documentDetails}</h3>
                </div>
                
                <div className="bg-purple-50/50 dark:bg-purple-500/5 rounded p-6 border border-purple-200/50 dark:border-purple-500/20">
                  <DocumentDetailsFields form={form} t={t} departments={departments} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Attachment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-orange-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">{t.attachments}</h3>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {t.attachmentsDesc}
                  </span>
                </div>
                
                <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded p-6 border border-orange-200/50 dark:border-orange-500/20">
                  <AttachmentSection
                    t={t}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFileSelect={handleFileSelect}
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

export default EditIncomingDocumentForm;
