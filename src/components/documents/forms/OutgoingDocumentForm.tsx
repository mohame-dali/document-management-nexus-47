
import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import useOutgoingDocumentForm, {
  OutgoingFormTranslations,
  OutgoingScanResultData,
  OutgoingScanMutationRunner,
  OutgoingFormValues
} from '@/hooks/forms/useOutgoingDocumentForm';
import { Form } from '@/components/ui/form';
import { Department } from '@/types';
import BasicInfoFields from './outgoing/BasicInfoFields';
import DocumentAttachmentSection from './outgoing/DocumentAttachmentSection';
import FormActions from './outgoing/FormActions';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { History, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatDateTime } from '@/utils/formatDate';

interface OutgoingDocumentFormProps {
  t: OutgoingFormTranslations;
  departments: Department[];
  currentDepartmentId?: string;
  scannerStatus?: unknown;
  loadingScannerStatus: boolean;
  scanData?: OutgoingScanResultData;
  scanTemporaryDocumentMutation: OutgoingScanMutationRunner;
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
  const { t: translate, language } = useLanguage();
  const [ocrText, setOcrText] = useState<string>('');
  
  const {
    form,
    activeTab,
    scanning,
    isScanInProgress,
    scanProgress,
    scanStage,
    scanPage,
    scanResult,
    scanError,
    liveThumbnails,
    isScanAttached,
    scanSettings,
    handleFileSelect,
    handleScanSettingChange,
    handleStartScan: startScan,
    handleCancelScan,
    handleUseScan,
    setActiveTab,
    onSubmit,
    handleSerialNumberChange,
    handleRemoveScan,
    restoredDraftAt,
    clearDraft
  } = useOutgoingDocumentForm(t, currentDepartmentId, scanData);

  const handleStartScan = () => {
    startScan(scanTemporaryDocumentMutation);
  };

  const handleOcrComplete = (extractedText: string, file: File) => {
    setOcrText(extractedText);
    console.log('OCR completed for file:', file.name);
    console.log('Extracted text length:', extractedText.length);
  };

  const handleSubmit = async (data: OutgoingFormValues) => {
    // Add OCR text to the form data
    const formDataWithOcr = {
      ...data,
      ocrText: ocrText || ''
    };
    
    await onSubmit(formDataWithOcr);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg shadow-none overflow-x-clip">
        <CardContent className="p-5 sm:p-6">
          {restoredDraftAt !== null && (
            <Alert className="mb-6 border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100">
              <History className="h-4 w-4 text-[#2c5282] dark:text-blue-400" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="tabular-nums">
                  {translate('documents.forms.draftRestored', {
                    date: formatDateTime(restoredDraftAt, language),
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearDraft}
                  className="h-8 border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                >
                  <Trash2 className="h-3.5 w-3.5 me-1.5" />
                  {translate('documents.forms.clearDraft')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {translate('documents.forms.sections.basicInfo')}
                </h3>
                <BasicInfoFields
                  form={form}
                  t={t}
                  departments={departments}
                  onSerialNumberChange={handleSerialNumberChange}
                />
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Document Attachment Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {translate('documents.forms.sections.attachments')}
                </h3>
                <DocumentAttachmentSection
                  t={t as Record<string, string>}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  handleFileSelect={handleFileSelect}
                  onOcrComplete={handleOcrComplete}
                  scanSettings={scanSettings}
                  handleScanSettingChange={handleScanSettingChange}
                  scanning={scanning}
                  scanProgress={scanProgress}
                  scanResult={scanResult}
                  scanError={scanError}
                  liveThumbnails={liveThumbnails}
                  scannerStatus={scannerStatus as Record<string, unknown> | null}
                  loadingScannerStatus={loadingScannerStatus}
                  handleStartScan={handleStartScan}
                  onRemoveScan={handleRemoveScan}
                  scanStage={scanStage}
                  scanPage={scanPage}
                  onCancelScan={handleCancelScan}
                  onRescan={handleStartScan}
                  onUseScan={handleUseScan}
                  isScanAttached={isScanAttached}
                />
              </div>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-b-lg">
          <FormActions
            form={form}
            onSubmit={handleSubmit}
            cancelText={t.cancel}
            submitText={t.submit}
            cancelRoute="/dashboard/outgoing-documents"
            disabled={isScanInProgress}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default OutgoingDocumentForm;
