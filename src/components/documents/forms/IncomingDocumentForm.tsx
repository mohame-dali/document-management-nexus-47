
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
      <Card className="border border-[#e2e8f0] bg-white rounded shadow-none">
        <CardHeader className="bg-[#f8fafc] border-b border-[#e2e8f0] p-5 rounded-t">
          <CardTitle className="text-xl font-bold text-[#1a202c] flex items-center gap-3">
            <div className="w-1.5 h-6 bg-[#2c5282] rounded"></div>
            {t.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Serial Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#2c5282] rounded"></div>
                  <h3 className="text-base font-bold text-[#1a202c]">معلومات الرقم التسلسلي</h3>
                </div>
                
                <div className="bg-[#f8fafc] rounded p-5 border border-[#e2e8f0]">
                  <SerialInfoFields 
                    form={form} 
                    t={t} 
                    onSerialNumberChange={handleSerialNumberChange}
                  />
                </div>
              </div>

              <Separator className="my-8 bg-[#e2e8f0]" />

              {/* Correspondence Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#2c5282] rounded"></div>
                  <h3 className="text-base font-bold text-[#1a202c]">معلومات المراسلة</h3>
                </div>
                
                <div className="bg-[#f8fafc] rounded p-5 border border-[#e2e8f0]">
                  <CorrespondenceFields form={form} />
                </div>
              </div>

              <Separator className="my-8 bg-[#e2e8f0]" />

              {/* Document Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#2c5282] rounded"></div>
                  <h3 className="text-base font-bold text-[#1a202c]">تفاصيل الوثيقة</h3>
                </div>
                
                <div className="bg-[#f8fafc] rounded p-5 border border-[#e2e8f0]">
                  <DocumentDetailsFields form={form} t={t} departments={departments} />
                </div>
              </div>

              <Separator className="my-8 bg-[#e2e8f0]" />

              {/* Attachment Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#2c5282] rounded"></div>
                  <h3 className="text-base font-bold text-[#1a202c]">مرفقات الوثيقة</h3>
                </div>
                
                <div className="bg-[#f8fafc] rounded p-5 border border-[#e2e8f0]">
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
        
        <CardFooter className="bg-[#f8fafc] border-t border-[#e2e8f0] p-5 rounded-b">
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
