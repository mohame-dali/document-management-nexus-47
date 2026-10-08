
import React, { useState, useRef, useEffect } from 'react';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useIncomingDocumentForm } from '@/hooks/forms/useIncomingDocumentForm';
import FormActions from '@/components/documents/forms/outgoing/FormActions';
import SerialInfoFields from '@/components/documents/forms/incoming/SerialInfoFields';
import CorrespondenceFields from '@/components/documents/forms/incoming/CorrespondenceFields';
import DocumentDetailsFields from '@/components/documents/forms/incoming/DocumentDetailsFields';
import AttachmentSection from '@/components/documents/forms/incoming/AttachmentSection';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { extractFromOcr, getAIErrorCode } from '@/services/aiExtractionService';

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
      toast.error('⚠️ لا يوجد نص OCR لتحليله', {
        description: 'يرجى مسح الوثيقة أولاً لاستخراج النص',
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
      toast.success('✅ تم استخراج المعلومات', {
        description: `درجة الثقة: ${Math.round(extracted.confidence * 100)}%`,
      });
    } catch (error: any) {
      const { code } = getAIErrorCode(error);

      switch (code) {
        case 'AI_SERVICE_DOWN':
          toast.error('❌ خدمة الذكاء الاصطناعي غير متاحة', {
            description: 'يرجى التحقق من تشغيل Ollama على الخادم.',
            duration: 8000,
          });
          break;
        case 'AI_TIMEOUT':
        case 'CLIENT_TIMEOUT':
          toast.error('⏱️ انتهت مدة التحليل', {
            description: 'النص كبير جداً. يرجى المحاولة مرة أخرى.',
            duration: 6000,
          });
          break;
        case 'RATE_LIMIT_EXCEEDED':
          toast.error('🚫 عدد كبير من الطلبات', {
            description: 'يرجى الانتظار دقيقة واحدة قبل إعادة المحاولة.',
            duration: 6000,
          });
          break;
        case 'CANCELLED':
          toast.info('تم إلغاء الاستخراج');
          break;
        case 'AI_INVALID_JSON':
          toast.error('⚠️ استجابة غير صالحة', {
            description: 'يرجى إعادة المحاولة.',
          });
          break;
        default:
          toast.error('❌ فشل الاستخراج الذكي', {
            description: error?.response?.data?.message || 'خطأ غير متوقع',
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
                          استخراج ذكي
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            disabled
                            className="h-11 bg-purple-600 text-white flex items-center gap-2"
                          >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري الاستخراج... ({progressTime}s)
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelExtraction}
                            className="h-11 border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            إلغاء
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
                          {Math.round(extractionConfidence * 100)}% ثقة
                        </Badge>
                      )}

                      <p className="text-xs text-slate-500 mr-auto">
                        يقوم الذكاء الاصطناعي المحلي بتحليل النص واستخراج البيانات تلقائياً
                      </p>
                    </div>
                  )}
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
