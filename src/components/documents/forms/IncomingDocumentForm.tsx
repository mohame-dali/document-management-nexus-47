
import React, { useState, useRef, useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useIncomingDocumentForm,
  FormTranslations,
  ScanResultData,
  ScanMutationRunner,
} from '@/hooks/forms/useIncomingDocumentForm';
import FormActions from '@/components/documents/forms/outgoing/FormActions';
import SerialInfoFields from '@/components/documents/forms/incoming/SerialInfoFields';
import CorrespondenceFields from '@/components/documents/forms/incoming/CorrespondenceFields';
import DocumentDetailsFields from '@/components/documents/forms/incoming/DocumentDetailsFields';
import AttachmentSection from '@/components/documents/forms/incoming/AttachmentSection';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, X, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractFromOcr, getAIErrorCode } from '@/services/aiExtractionService';

import { Department } from '@/types';
import { FieldValues } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatDateTime } from '@/utils/formatDate';

interface IncomingDocumentFormProps {
  t: FormTranslations;
  departments: Department[];
  currentDepartmentId?: string;
  scanData?: ScanResultData | null;
  scannerStatus?: Record<string, unknown> | null;
  loadingScannerStatus: boolean;
  scanTemporaryDocumentMutation: ScanMutationRunner;
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
    handleStartScan,
    handleCancelScan,
    handleUseScan,
    onSubmit,
    setActiveTab,
    handleSerialNumberChange,
    handleRemoveScan,
    restoredDraftAt,
    clearDraft
  } = useIncomingDocumentForm(t, currentDepartmentId, scanData);

  // ───────────────────────────────────────────────────────────
  // ÉTAT IA — Extraction intelligente (NOUVEAU)
  // ───────────────────────────────────────────────────────────
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState<number | null>(null);
  const [progressTime, setProgressTime] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Timer visible pendant l'extraction
  useEffect(() => {
    if (!isExtracting) {
      setProgressTime(0);
      return;
    }
    const interval = setInterval(() => setProgressTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isExtracting]);

  const handleCancelExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleAIExtraction = async () => {
    const text = ocrText || scanResult?.ocrText || '';

    if (!text || text.trim().length < 20) {
      toast.error(translate('documents.forms.ai.noOcrTitle'), {
        description: translate('documents.forms.ai.noOcrDesc'),
      });
      return;
    }

    abortControllerRef.current = new AbortController();
    setIsExtracting(true);
    setProgressTime(0);

    try {
      const extracted = await extractFromOcr(text, abortControllerRef.current.signal);

      if (extracted.subject) form.setValue('subject', extracted.subject);
      if (extracted.source) form.setValue('source', extracted.source);
      if (extracted.correspondenceNumber)
        form.setValue('correspondenceNumber', extracted.correspondenceNumber);
      if (extracted.correspondenceDate)
        form.setValue('correspondenceDate', new Date(extracted.correspondenceDate));
      if (extracted.typeDocument)
        form.setValue('typeDocument', extracted.typeDocument);

      setExtractionConfidence(extracted.confidence);
      toast.success(translate('documents.forms.ai.successTitle'), {
        description: translate('documents.forms.ai.successDesc', {
          score: Math.round(extracted.confidence * 100),
        }),
      });
    } catch (error: unknown) {
      const { code } = getAIErrorCode(error);
      const errResp = error as { response?: { data?: { message?: string } } };

      switch (code) {
        case 'AI_SERVICE_DOWN':
          toast.error(translate('documents.forms.ai.serviceDownTitle'), {
            description: translate('documents.forms.ai.serviceDownDesc'),
            duration: 8000,
          });
          break;
        case 'AI_TIMEOUT':
        case 'CLIENT_TIMEOUT':
          toast.error(translate('documents.forms.ai.timeoutTitle'), {
            description: translate('documents.forms.ai.timeoutDesc'),
            duration: 6000,
          });
          break;
        case 'RATE_LIMIT_EXCEEDED':
          toast.error(translate('documents.forms.ai.rateLimitTitle'), {
            description: translate('documents.forms.ai.rateLimitDesc'),
            duration: 6000,
          });
          break;
        case 'CANCELLED':
          toast.info(translate('documents.forms.ai.cancelled'));
          break;
        case 'AI_INVALID_JSON':
          toast.error(translate('documents.forms.ai.invalidJsonTitle'), {
            description: translate('documents.forms.ai.invalidJsonDesc'),
          });
          break;
        default:
          toast.error(translate('documents.forms.ai.errorTitle'), {
            description: errResp?.response?.data?.message || translate('documents.forms.ai.unknownError'),
          });
      }
    } finally {
      setIsExtracting(false);
      abortControllerRef.current = null;
    }
  };

  const handleScanStart = () => {
    handleStartScan(scanTemporaryDocumentMutation);
  };

  const handleOcrComplete = (extractedText: string, file: File) => {
    setOcrText(extractedText);
    console.log('OCR completed for file:', file.name);
    console.log('Extracted text length:', extractedText.length);
  };

  const handleSubmit = async (data: FieldValues) => {
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
          {restoredDraftAt !== null && (
            <Alert className="mb-6 border-blue-200 bg-blue-50/70 text-blue-950">
              <History className="h-4 w-4 text-[#2c5282]" />
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
                  className="h-8 border-blue-300 bg-white text-[#2c5282] hover:bg-blue-100"
                >
                  <Trash2 className="h-3.5 w-3.5 me-1.5" />
                  {translate('documents.forms.clearDraft')}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Serial Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1 h-5 bg-[#2c5282] rounded"></div>
                  <h3 className="text-base font-bold text-[#1a202c]">
                    {translate('documents.forms.sections.serialInfo')}
                  </h3>
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
                  <h3 className="text-base font-bold text-[#1a202c]">
                    {translate('documents.forms.sections.correspondence')}
                  </h3>
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
                  <h3 className="text-base font-bold text-[#1a202c]">
                    {translate('documents.forms.sections.details')}
                  </h3>
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
                  <h3 className="text-base font-bold text-[#1a202c]">
                    {translate('documents.forms.sections.attachments')}
                  </h3>
                </div>
                
                <div className="bg-[#f8fafc] rounded p-5 border border-[#e2e8f0]">
                  <AttachmentSection
                    t={t as Record<string, string>}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFileSelect={handleFileSelect}
                    onOcrComplete={handleOcrComplete}
                    scanSettings={scanSettings}
                    handleScanSettingChange={handleScanSettingChange}
                    scanning={scanning}
                    scanProgress={scanProgress}
                    scanResult={scanResult}
                    scanError={scanError}
                    liveThumbnails={liveThumbnails}
                    scannerStatus={scannerStatus}
                    loadingScannerStatus={loadingScannerStatus}
                    handleStartScan={handleScanStart}
                    onRemoveScan={handleRemoveScan}
                    scanStage={scanStage}
                    scanPage={scanPage}
                    onCancelScan={handleCancelScan}
                    onRescan={handleScanStart}
                    onUseScan={handleUseScan}
                    isScanAttached={isScanAttached}
                  />

                  {/* ─────────────────────────────────────────────────── */}
                  {/* 🤖 Extraction intelligente IA (NOUVEAU)              */}
                  {/* ─────────────────────────────────────────────────── */}
                  {(ocrText || scanResult?.ocrText) && (
                    <div className="mt-4 pt-4 border-t border-[#e2e8f0] flex items-center gap-2 flex-wrap">
                      {!isExtracting ? (
                        <Button
                          type="button"
                          onClick={handleAIExtraction}
                          className="h-11 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {translate('documents.forms.ai.button')}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            disabled
                            className="h-11 bg-purple-600 text-white flex items-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {translate('documents.forms.ai.extracting')} (<bdi dir="ltr">{progressTime}s</bdi>)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelExtraction}
                            className="h-11 border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            {translate('documents.forms.ai.cancel')}
                          </Button>
                        </>
                      )}

                      {extractionConfidence !== null && !isExtracting && (
                        <Badge
                          className={
                            extractionConfidence > 0.8
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }
                        >
                          <bdi dir="ltr">{Math.round(extractionConfidence * 100)}%</bdi>{' '}
                          {translate('documents.forms.ai.confidence')}
                        </Badge>
                      )}

                      <p className="text-xs text-slate-500 ms-auto">
                        {translate('documents.forms.ai.helperText')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-b shadow-[0_-6px_16px_-6px_rgba(15,23,42,0.08)]">
          <FormActions
            form={form}
            onSubmit={handleSubmit}
            cancelText={t.cancel}
            submitText={t.submit}
            cancelRoute="/dashboard/incoming-documents"
            disabled={isScanInProgress}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default IncomingDocumentForm;
