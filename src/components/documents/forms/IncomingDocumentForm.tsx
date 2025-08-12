
import React, { useState } from 'react';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncomingDocumentForm } from '@/hooks/forms/useIncomingDocumentForm';
import FormActions from '@/components/documents/forms/outgoing/FormActions';
import SerialInfoFields from '@/components/documents/forms/incoming/SerialInfoFields';
import CorrespondenceFields from '@/components/documents/forms/incoming/CorrespondenceFields';
import DocumentDetailsFields from '@/components/documents/forms/incoming/DocumentDetailsFields';
import AttachmentSection from '@/components/documents/forms/incoming/AttachmentSection';
import { Separator } from '@/components/ui/separator';

interface IncomingDocumentFormProps {
  t: any;
  departments: any[];
  currentDepartmentId?: string;
  scanData?: any;
  scannerStatus?: any;
  loadingScannerStatus: boolean;
  scanTemporaryDocumentMutation: any;
}

const IncomingDocumentForm: React.FC<IncomingDocumentFormProps> = ({
  t,
  departments,
  currentDepartmentId,
  scanData,
  scannerStatus,
  loadingScannerStatus,
  scanTemporaryDocumentMutation
}) => {
  const [ocrText, setOcrText] = useState<string>('');
  
  const {
    form,
    selectedFiles,
    activeTab,
    scanning,
    scanProgress,
    scanResult,
    scanSettings,
    handleFileSelect,
    handleScanSettingChange,
    handleStartScan,
    onSubmit,
    setActiveTab,
    handleSerialNumberChange,
    handleRemoveScan
  } = useIncomingDocumentForm(t, currentDepartmentId, scanData);

  const handleScanStart = () => {
    handleStartScan(scanTemporaryDocumentMutation);
  };

  const handleOcrComplete = (extractedText: string, file: File) => {
    setOcrText(extractedText);
    console.log('OCR completed for file:', file.name);
    console.log('Extracted text length:', extractedText.length);
  };

  const handleSubmit = async (data: any) => {
    // Add OCR text to the form data
    const formDataWithOcr = {
      ...data,
      ocrText: ocrText || ''
    };
    
    await onSubmit(formDataWithOcr);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-green-500/5 to-green-500/10 border-b border-border/50">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-2 h-8 bg-green-500 rounded-full"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Serial Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-green-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">معلومات الرقم التسلسلي</h3>
                </div>
                
                <div className="bg-green-50/50 dark:bg-green-500/5 rounded-lg p-6 border border-green-200/50 dark:border-green-500/20">
                  <SerialInfoFields 
                    form={form} 
                    t={t} 
                    onSerialNumberChange={handleSerialNumberChange}
                  />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Correspondence Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-blue-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">معلومات المراسلة</h3>
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-500/5 rounded-lg p-6 border border-blue-200/50 dark:border-blue-500/20">
                  <CorrespondenceFields form={form} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Document Details Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-purple-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">تفاصيل الوثيقة</h3>
                </div>
                
                <div className="bg-purple-50/50 dark:bg-purple-500/5 rounded-lg p-6 border border-purple-200/50 dark:border-purple-500/20">
                  <DocumentDetailsFields form={form} t={t} departments={departments} />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Attachment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-orange-500/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">مرفقات الوثيقة</h3>
                </div>
                
                <div className="bg-orange-50/50 dark:bg-orange-500/5 rounded-lg p-6 border border-orange-200/50 dark:border-orange-500/20">
                  <AttachmentSection
                    t={t}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFileSelect={handleFileSelect}
                    onOcrComplete={handleOcrComplete}
                    scanSettings={scanSettings}
                    handleScanSettingChange={handleScanSettingChange}
                    scanning={scanning}
                    scanProgress={scanProgress}
                    scanResult={scanResult}
                    scannerStatus={scannerStatus}
                    loadingScannerStatus={loadingScannerStatus}
                    handleStartScan={handleScanStart}
                    onRemoveScan={handleRemoveScan}
                  />
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="bg-muted/20 border-t border-border/50 p-6">
          <FormActions
            form={form}
            onSubmit={handleSubmit}
            cancelText={t.cancel}
            submitText={t.submit}
            cancelRoute="/dashboard/incoming-documents"
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default IncomingDocumentForm;
