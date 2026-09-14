
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import useOutgoingDocumentForm from '@/hooks/forms/useOutgoingDocumentForm';
import { Form } from '@/components/ui/form';
import { Department } from '@/types';
import BasicInfoFields from './outgoing/BasicInfoFields';
import DocumentAttachmentSection from './outgoing/DocumentAttachmentSection';
import FormActions from './outgoing/FormActions';
import { Separator } from '@/components/ui/separator';

interface OutgoingDocumentFormProps {
  t: any;
  departments: Department[];
  currentDepartmentId?: string;
  scannerStatus?: any;
  loadingScannerStatus: boolean;
  scanData?: any;
  scanTemporaryDocumentMutation: any;
}

const OutgoingDocumentForm: React.FC<OutgoingDocumentFormProps> = ({
  t,
  departments,
  currentDepartmentId,
  scannerStatus,
  loadingScannerStatus,
  scanData,
  scanTemporaryDocumentMutation
}) => {
  const [ocrText, setOcrText] = useState<string>('');
  
  const {
    form,
    activeTab,
    scanning,
    scanProgress,
    scanResult,
    scanSettings,
    handleFileSelect,
    handleScanSettingChange,
    handleStartScan: startScan,
    setActiveTab,
    onSubmit,
    handleSerialNumberChange,
    handleRemoveScan
  } = useOutgoingDocumentForm(t, currentDepartmentId, scanData);

  const handleStartScan = () => {
    startScan(scanTemporaryDocumentMutation);
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
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50">
          <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">المعلومات الأساسية</h3>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
                  <BasicInfoFields
                    form={form}
                    t={t}
                    departments={departments}
                    onSerialNumberChange={handleSerialNumberChange}
                  />
                </div>
              </div>

              <Separator className="my-8" />

              {/* Document Attachment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-primary/70 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-foreground">مرفقات الوثيقة</h3>
                </div>
                
                <div className="bg-muted/20 rounded-lg p-6 border border-border/50">
                  <DocumentAttachmentSection
                    t={t}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    handleFileSelect={handleFileSelect}
                    onOcrComplete={handleOcrComplete}
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
        
        <CardFooter className="bg-muted/20 border-t border-border/50 p-6">
          <FormActions
            form={form}
            onSubmit={handleSubmit}
            cancelText={t.cancel}
            submitText={t.submit}
            cancelRoute="/dashboard/outgoing-documents"
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default OutgoingDocumentForm;
