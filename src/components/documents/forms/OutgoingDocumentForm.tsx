
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import useOutgoingDocumentForm, {
  OutgoingFormTranslations,
  OutgoingScanResultData,
  OutgoingScanMutationRunner,
  OutgoingFormValues
} from '@/hooks/forms/useOutgoingDocumentForm';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Department } from '@/types';
import BasicInfoFields from './outgoing/BasicInfoFields';
import DocumentAttachmentSection from './outgoing/DocumentAttachmentSection';
import FormActions from './outgoing/FormActions';
import { MultiOrganizationAutocomplete } from '@/components/documents/forms/OrganizationAutocomplete';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { History, Trash2, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { extractDeptMeta, isBureauOrdreUserAccount } from '@/utils/departmentScope';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { extractFromOcr } from '@/services/aiExtractionService';
import OcrStatusPill from '@/components/documents/forms/OcrStatusPill';
import OptionalArchiveFolderField from '@/components/documents/forms/OptionalArchiveFolderField';
import {
  INITIAL_OCR_STATE,
  OcrState,
  extractSubjectHeuristic,
} from '@/utils/ocrSubjectHelper';

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
  const { currentUser } = useAuth();
  const { t: translate, language } = useLanguage();
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrState, setOcrState] = useState<OcrState>(INITIAL_OCR_STATE);
  const [isSuggestingSubject, setIsSuggestingSubject] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
  });

  const bureauOrdreDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;
  const isBureauOrdreUser = isBureauOrdreUserAccount(currentUser, bureauOrdreDeptId);
  const canAssignFolderOnCreate =
    (currentUser?.role === 'Admin' || currentUser?.role === 'AdminDepartment') &&
    !isBureauOrdreUser;
  
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
    clearDraft,
    selectedFolderId,
    setSelectedFolderId,
  } = useOutgoingDocumentForm(t, currentDepartmentId, scanData);

  const [watchPourInfo, watchDepartment] = form.watch(['pourInfo', 'department']);
  const filledOptionalCount =
    (Array.isArray(watchPourInfo) && watchPourInfo.length > 0 ? 1 : 0) +
    (canAssignFolderOnCreate && selectedFolderId ? 1 : 0);

  const scopedFolderDeptId =
    currentUser?.role === 'Admin' ? watchDepartment || undefined : currentDepartmentId;

  useEffect(() => {
    if (form.formState.errors.pourInfo) {
      setOptionalOpen(true);
    }
  }, [form.formState.errors]);

  const handleStartScan = () => {
    startScan(scanTemporaryDocumentMutation);
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

  const handleSubmit = async (data: OutgoingFormValues) => {
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
              {/* Basic Information Section (Primary Essential Fields) */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {translate('documents.forms.sections.basicInfo')}
                  </h3>
                  <OcrStatusPill state={effectiveOcrState} compact />
                </div>
                <BasicInfoFields
                  form={form}
                  t={t}
                  departments={departments}
                  onSerialNumberChange={handleSerialNumberChange}
                  showOptionalFields={false}
                  hasExtractedText={extractedDocumentText.length > 0}
                  isSuggestingSubject={isSuggestingSubject}
                  onSuggestSubject={handleSuggestSubject}
                />
              </div>

              <Separator className="my-6 bg-slate-200/80 dark:bg-slate-800" />

              {/* Document Attachment Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {translate('documents.forms.sections.attachments')}
                  </h3>
                  <OcrStatusPill state={effectiveOcrState} />
                </div>
                <DocumentAttachmentSection
                  t={t as Record<string, string>}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  handleFileSelect={handleFileSelect}
                  onOcrComplete={handleOcrComplete}
                  onOcrStateChange={handleOcrStateChange}
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
                          {translate('documents.forms.optionalSection.subtitleOutgoing')}
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
                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="pourInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translate('documents.forms.pourInfo')}</FormLabel>
                          <FormControl>
                            <MultiOrganizationAutocomplete
                              category="pourInfo"
                              documentType="outgoing"
                              values={field.value || []}
                              onValuesChange={field.onChange}
                              placeholder={translate('documents.forms.autocomplete.pourInfoPlaceholder')}
                            />
                          </FormControl>
                          <FormDescription>{translate('documents.forms.pourInfoDesc')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {canAssignFolderOnCreate && (
                    <OptionalArchiveFolderField
                      value={selectedFolderId}
                      onChange={setSelectedFolderId}
                      departmentId={scopedFolderDeptId}
                    />
                  )}
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
            cancelRoute="/dashboard/outgoing-documents"
            disabled={isScanInProgress}
          />
        </CardFooter>
      </Card>
    </div>
  );
};

export default OutgoingDocumentForm;
