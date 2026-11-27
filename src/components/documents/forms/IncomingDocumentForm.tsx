
import React, { useState, useRef, useEffect } from 'react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import DatePickerField from '@/components/documents/forms/DatePickerField';
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
import { Sparkles, Loader2, X, History, Trash2, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractFromOcr, getAIErrorCode } from '@/services/aiExtractionService';

import { Department } from '@/types';
import { FieldValues } from 'react-hook-form';
import { useLanguage } from '@/contexts/LanguageProvider';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';
import OcrStatusPill from '@/components/documents/forms/OcrStatusPill';
import {
  INITIAL_OCR_STATE,
  OcrState,
  extractSubjectHeuristic,
} from '@/utils/ocrSubjectHelper';

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
  const [ocrState, setOcrState] = useState<OcrState>(INITIAL_OCR_STATE);
  const [isSuggestingSubject, setIsSuggestingSubject] = useState(false);
  
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
  const [optionalOpen, setOptionalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [watchActivity, watchDateActivity, watchDescription] = form.watch([
    'activity',
    'dateActivity',
    'description',
  ]);
  const filledOptionalCount =
    (watchActivity && watchActivity.trim() !== '' ? 1 : 0) +
    (watchDateActivity ? 1 : 0) +
    (watchDescription && watchDescription.trim() !== '' ? 1 : 0);

  useEffect(() => {
    const errs = form.formState.errors;
    if (errs.activity || errs.dateActivity || errs.description) {
      setOptionalOpen(true);
    }
  }, [form.formState.errors]);

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

  const handleOcrStateChange = (nextState: OcrState) => {
    setOcrState(nextState);
    if (nextState.status === 'idle') {
      setOcrText('');
      setExtractionConfidence(null);
    }
  };

  const extractedDocumentText = (ocrText || scanResult?.ocrText || '').trim();

  const effectiveOcrState: OcrState =
    ocrState.status !== 'idle'
      ? ocrState
      : scanning && (scanStage === 'ocr' || scanStage === 'processing')
        ? { status: 'processing', progress: scanProgress, text: '' }
        : scanResult?.ocrText
          ? { status: 'completed', progress: 100, text: scanResult.ocrText }
          : INITIAL_OCR_STATE;

  const handleSuggestSubject = async () => {
    if (!extractedDocumentText) return;
    setIsSuggestingSubject(true);
    try {
      let suggested = '';
      if (extractedDocumentText.length >= 20) {
        try {
          const extracted = await extractFromOcr(extractedDocumentText);
          if (extracted?.subject && extracted.subject.trim()) {
            suggested = extracted.subject.trim();
          }
        } catch {
          // Seamless fallback to deterministic OCR line extraction
        }
      }
      if (!suggested) {
        suggested = extractSubjectHeuristic(extractedDocumentText);
      }
      if (suggested) {
        form.setValue('subject', suggested, { shouldDirty: true, shouldValidate: true });
        toast.success(translate('documents.forms.ai.subjectSuggested'));
      } else {
        toast.info(translate('documents.forms.ai.noSubjectFound'));
      }
    } finally {
      setIsSuggestingSubject(false);
    }
  };

  const handleSubmit = async (data: FieldValues) => {
    // Add OCR text to the form data
    const formDataWithOcr = {
      ...data,
      ocrText: ocrText || scanResult?.ocrText || ''
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
              {/* Serial Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {translate('documents.forms.sections.serialInfo')}
                </h3>
                <SerialInfoFields 
                  form={form} 
                  t={t} 
                  onSerialNumberChange={handleSerialNumberChange}
                />
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Correspondence Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {translate('documents.forms.sections.correspondence')}
                </h3>
                <CorrespondenceFields form={form} />
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Document Details Section (Primary Essential Fields) */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {translate('documents.forms.sections.details')}
                  </h3>
                  <OcrStatusPill state={effectiveOcrState} compact />
                </div>
                <DocumentDetailsFields
                  form={form}
                  t={t}
                  departments={departments}
                  showOptionalFields={false}
                  hasExtractedText={extractedDocumentText.length > 0}
                  isSuggestingSubject={isSuggestingSubject}
                  onSuggestSubject={handleSuggestSubject}
                />
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Attachment Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {translate('documents.forms.sections.attachments')}
                  </h3>
                  <OcrStatusPill state={effectiveOcrState} />
                </div>
                <AttachmentSection
                  t={t as Record<string, string>}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onFileSelect={handleFileSelect}
                  onOcrComplete={handleOcrComplete}
                  onOcrStateChange={handleOcrStateChange}
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
                  <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 flex-wrap">
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

                    <p className="text-xs text-slate-700 dark:text-slate-300 ms-auto">
                      {translate('documents.forms.ai.helperText')}
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Secondary / Optional Details (Collapsible, closed by default) */}
              <Collapsible
                open={optionalOpen}
                onOpenChange={setOptionalOpen}
                className="rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-start hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition-colors rounded-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {translate('documents.forms.optionalSection.title')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {translate('documents.forms.optionalSection.subtitleIncoming')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tabular-nums border',
                          filledOptionalCount > 0
                            ? 'bg-blue-50 text-[#2c5282] border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70'
                            : 'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        )}
                      >
                        {filledOptionalCount > 0
                          ? translate('documents.forms.optionalSection.filledCount', {
                              count: filledOptionalCount,
                            })
                          : translate('documents.forms.optionalSection.emptyCount')}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform duration-150',
                          optionalOpen && 'rotate-180'
                        )}
                      />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-4 pb-4 pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <FormField
                      control={form.control}
                      name="activity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate('documents.forms.activity')}</FormLabel>
                          <FormControl>
                            <DocumentOptionSelect
                              category="activity"
                              documentType="incoming"
                              value={field.value || ''}
                              onValueChange={(value) => {
                                field.onChange(value);
                                if (!value) {
                                  form.setValue('dateActivity', undefined);
                                }
                              }}
                              placeholder={translate('documents.forms.activityPlaceholder')}
                            />
                          </FormControl>
                          <FormDescription>{translate('documents.forms.activityDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchActivity && (
                      <FormField
                        control={form.control}
                        name="dateActivity"
                        render={({ field }) => (
                          <DatePickerField
                            field={field}
                            label={translate('documents.forms.dateActivity')}
                            description={translate('documents.forms.dateActivityDesc')}
                            selectDateText={translate('documents.forms.selectActivityDate')}
                          />
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translate('documents.forms.descriptionLabel')}</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            className="resize-none bg-white dark:bg-slate-900"
                            placeholder={translate('documents.forms.descriptionPlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>{t.descriptionDesc}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-b-lg">
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
