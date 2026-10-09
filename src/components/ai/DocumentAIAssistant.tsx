import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  FileText, 
  Languages, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCw, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  FileCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  summarizeDocument, 
  DocumentSummary, 
  getSummaryErrorMessage 
} from '@/services/aiSummaryService';
import { 
  translateDocumentText, 
  TranslationResult, 
  getTranslationErrorMessage 
} from '@/services/aiTranslationService';

interface DocumentAIAssistantProps {
  ocrText: string | null | undefined;
  documentId?: string;
  documentTitle?: string;
}

export const DocumentAIAssistant: React.FC<DocumentAIAssistantProps> = ({
  ocrText,
  documentId,
  documentTitle,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'translate'>('summary');

  // État Résumé
  const [summaryData, setSummaryData] = useState<DocumentSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<number>(200);
  const [isSummaryCopied, setIsSummaryCopied] = useState<boolean>(false);

  // État Traduction
  const [translationData, setTranslationData] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<'ar' | 'fr'>('fr');
  const [isTranslationCopied, setIsTranslationCopied] = useState<boolean>(false);

  // Restaurer depuis le cache local (si disponible)
  useEffect(() => {
    if (!documentId) return;
    try {
      const cachedSummary = localStorage.getItem(`dms_ai_summary_${documentId}`);
      if (cachedSummary) {
        setSummaryData(JSON.parse(cachedSummary));
      }
      const cachedTranslation = localStorage.getItem(`dms_ai_trans_${documentId}`);
      if (cachedTranslation) {
        setTranslationData(JSON.parse(cachedTranslation));
      }
    } catch {
      // Ignorer erreurs de lecture cache
    }
  }, [documentId]);

  // Si pas de texte OCR, ne rien afficher
  if (!ocrText || ocrText.trim().length === 0) {
    return null;
  }

  // ── Handler Résumé ──
  const handleGenerateSummary = async () => {
    if (!ocrText || ocrText.trim().length < 50) {
      toast.error('النص قصير جداً لإنشاء تلخيص (الحد الأدنى 50 حرفاً)');
      return;
    }

    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const result = await summarizeDocument(ocrText, selectedLength);
      setSummaryData(result);
      if (documentId) {
        try {
          localStorage.setItem(`dms_ai_summary_${documentId}`, JSON.stringify(result));
        } catch {
          // ignore cache write error
        }
      }
      toast.success('تم إنشاء الملخص الذكي بنجاح');
    } catch (err: any) {
      const msg = getSummaryErrorMessage(err);
      setSummaryError(msg);
      toast.error(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── Handler Traduction ──
  const handleGenerateTranslation = async () => {
    if (!ocrText || ocrText.trim().length < 5) {
      toast.error('النص قصير جداً للترجمة');
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const result = await translateDocumentText(ocrText, targetLang);
      setTranslationData(result);
      if (documentId) {
        try {
          localStorage.setItem(`dms_ai_trans_${documentId}`, JSON.stringify(result));
        } catch {
          // ignore cache write error
        }
      }
      toast.success('تمت ترجمة النص بنجاح');
    } catch (err: any) {
      const msg = getTranslationErrorMessage(err);
      setTranslationError(msg);
      toast.error(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  // ── Copie presse-papier ──
  const copyToClipboard = async (text: string, type: 'summary' | 'translation') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'summary') {
        setIsSummaryCopied(true);
        setTimeout(() => setIsSummaryCopied(false), 2000);
      } else {
        setIsTranslationCopied(true);
        setTimeout(() => setIsTranslationCopied(false), 2000);
      }
      toast.success('تم نسخ النص إلى الحافظة');
    } catch {
      toast.error('تعذر النسخ إلى الحافظة');
    }
  };

  // ── Rendu de l'urgence ──
  const renderUrgencyBadge = (urgency?: string) => {
    if (urgency === 'very_urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <ShieldAlert className="h-3.5 w-3.5" />
          عاجل جداً
        </span>
      );
    }
    if (urgency === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          عاجل
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
        <FileCheck className="h-3.5 w-3.5" />
        عادي
      </span>
    );
  };

  return (
    <div className="bg-white border border-[#cbd5e1] rounded-lg shadow-sm overflow-hidden text-right font-sans" dir="rtl">
      {/* En-tête AdminLTE Sobre */}
      <div className="bg-[#2c5282] text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight flex items-center gap-2">
              المساعد الذكي للوثائق
              <span className="text-[11px] bg-white/20 text-white font-normal px-2 py-0.5 rounded">
                ذكاء اصطناعي محلي
              </span>
            </h3>
            <p className="text-xs text-blue-100 opacity-90 mt-0.5">
              التلخيص التلقائي والترجمة الفورية المعتمدة للنصوص الإدارية (AR ↔ FR)
            </p>
          </div>
        </div>

        {/* Boutons d'onglets intégrés à l'en-tête */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
              activeTab === 'summary'
                ? 'bg-white text-[#2c5282] shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            التلخيص الذكي
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('translate')}
            className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
              activeTab === 'translate'
                ? 'bg-white text-[#2c5282] shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            الترجمة الإدارية
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ═══════════════════════════════════════════
            ONGLET 1 : RÉSUMÉ INTELLIGENT
           ═══════════════════════════════════════════ */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Barre de contrôle du résumé */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
              <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                <span className="font-semibold text-[#2d3748]">طول الملخص :</span>
                <div className="inline-flex rounded-md shadow-sm border border-[#cbd5e1] overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedLength(100)}
                    className={`px-2.5 py-1 font-medium transition ${
                      selectedLength === 100
                        ? 'bg-[#2c5282] text-white'
                        : 'text-[#4a5568] hover:bg-gray-100'
                    }`}
                  >
                    موجز (~100 كلمة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLength(200)}
                    className={`px-2.5 py-1 font-medium transition border-r border-[#cbd5e1] ${
                      selectedLength === 200
                        ? 'bg-[#2c5282] text-white'
                        : 'text-[#4a5568] hover:bg-gray-100'
                    }`}
                  >
                    عادي (~200 كلمة)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLength(350)}
                    className={`px-2.5 py-1 font-medium transition border-r border-[#cbd5e1] ${
                      selectedLength === 350
                        ? 'bg-[#2c5282] text-white'
                        : 'text-[#4a5568] hover:bg-gray-100'
                    }`}
                  >
                    مفصل (~350 كلمة)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="bg-[#2c5282] hover:bg-[#1a365d] text-white text-xs font-bold px-4 py-2 h-9 rounded flex items-center gap-1.5"
                >
                  {isSummarizing ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin text-white" />
                      <span>جاري التلخيص بالذكاء الاصطناعي...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{summaryData ? 'إعادة التلخيص' : 'توليد ملخص المراسلة'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Affichage d'erreur éventuelle */}
            {summaryError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{summaryError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="text-red-800 underline font-semibold hover:text-red-900"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* État de chargement élégant */}
            {isSummarizing && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-md text-center space-y-3">
                <div className="inline-flex p-3 bg-blue-100/60 rounded-full text-[#2c5282]">
                  <RotateCw className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-sm font-bold text-[#2c5282]">
                  جاري تحليل النص واستخراج جوهر المراسلة الرسمية...
                </p>
                <p className="text-xs text-[#718096]">
                  يتم المعالجة عبر النموذج الإداري المحلي (Qwen) في سرية وأمان تام
                </p>
              </div>
            )}

            {/* Résultat du résumé */}
            {!isSummarizing && summaryData && (
              <div className="border border-[#cbd5e1] rounded-md bg-white p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1a202c]">
                      ملخص المراسلة الرسمية :
                    </span>
                    {renderUrgencyBadge(summaryData.urgency)}
                    {summaryData.language && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                        اللغة: {summaryData.language === 'ar' ? 'العربية' : summaryData.language === 'fr' ? 'الفرنسية' : 'مزدوجة'}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(summaryData.summary, 'summary')}
                    className="h-8 px-2.5 text-xs text-[#2c5282] border-[#cbd5e1] hover:bg-blue-50"
                  >
                    {isSummaryCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ الملخص</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm text-[#2d3748] leading-relaxed">
                  {summaryData.summary}
                </div>

                {/* Points Clés */}
                {Array.isArray(summaryData.keyPoints) && summaryData.keyPoints.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-[#4a5568] mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2c5282]"></span>
                      أهم النقاط والقرارات الواردة بالمراسلة :
                    </h4>
                    <ul className="space-y-1.5 pr-2">
                      {summaryData.keyPoints.map((point, index) => (
                        <li key={index} className="text-xs text-[#4a5568] flex items-start gap-2">
                          <span className="font-bold text-[#2c5282] shrink-0 mt-0.5">•</span>
                          <span className="leading-normal">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Message d'incitation initial */}
            {!isSummarizing && !summaryData && !summaryError && (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded text-center text-xs text-[#718096]">
                اضغط على زر <strong className="text-[#2c5282]">"توليد ملخص المراسلة"</strong> للحصول على تحليل ذكي موجز لمحتوى النص المستخرج.
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ONGLET 2 : TRADUCTION BILINGUE AR ↔ FR
           ═══════════════════════════════════════════ */}
        {activeTab === 'translate' && (
          <div className="space-y-4">
            {/* Contrôles de traduction */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
              <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                <span className="font-semibold text-[#2d3748]">اتجاه الترجمة :</span>
                <div className="inline-flex rounded-md shadow-sm border border-[#cbd5e1] overflow-hidden bg-white text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetLang('fr')}
                    className={`px-3 py-1 font-medium transition ${
                      targetLang === 'fr'
                        ? 'bg-[#2c5282] text-white'
                        : 'text-[#4a5568] hover:bg-gray-100'
                    }`}
                  >
                    إلى الفرنسية (Vers le français)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLang('ar')}
                    className={`px-3 py-1 font-medium transition border-r border-[#cbd5e1] ${
                      targetLang === 'ar'
                        ? 'bg-[#2c5282] text-white'
                        : 'text-[#4a5568] hover:bg-gray-100'
                    }`}
                  >
                    إلى العربية (Vers l'arabe)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateTranslation}
                  disabled={isTranslating}
                  className="bg-[#2c5282] hover:bg-[#1a365d] text-white text-xs font-bold px-4 py-2 h-9 rounded flex items-center gap-1.5"
                >
                  {isTranslating ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin text-white" />
                      <span>جاري الترجمة الفورية...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="h-4 w-4" />
                      <span>{translationData ? 'إعادة الترجمة' : 'ترجمة نص الوثيقة'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Affichage d'erreur */}
            {translationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{translationError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateTranslation}
                  className="text-red-800 underline font-semibold hover:text-red-900"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {/* État de chargement */}
            {isTranslating && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-md text-center space-y-3">
                <div className="inline-flex p-3 bg-blue-100/60 rounded-full text-[#2c5282]">
                  <RotateCw className="h-6 w-6 animate-spin" />
                </div>
                <p className="text-sm font-bold text-[#2c5282]">
                  جاري ترجمة المراسلة الإدارية مع الحفاظ على الصياغة الرسمية...
                </p>
                <p className="text-xs text-[#718096]">
                  ترجمة مطابقة للمصطلحات الإدارية التونسية المعتمدة
                </p>
              </div>
            )}

            {/* Résultat Traduction */}
            {!isTranslating && translationData && (
              <div className="border border-[#cbd5e1] rounded-md bg-white p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1a202c]">
                      النص المترجم ({translationData.targetLang === 'fr' ? 'باللغة الفرنسية' : 'باللغة العربية'}) :
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {translationData.sourceLang === 'ar' ? 'عربي' : 'فرنسي'} ➔ {translationData.targetLang === 'ar' ? 'عربي' : 'فرنسي'}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(translationData.translatedText, 'translation')}
                    className="h-8 px-2.5 text-xs text-[#2c5282] border-[#cbd5e1] hover:bg-blue-50"
                  >
                    {isTranslationCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ الترجمة</span>
                      </>
                    )}
                  </Button>
                </div>

                <div 
                  className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded text-sm text-[#2d3748] leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-sans"
                  dir={translationData.targetLang === 'ar' ? 'rtl' : 'ltr'}
                >
                  {translationData.translatedText}
                </div>
              </div>
            )}

            {!isTranslating && !translationData && !translationError && (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded text-center text-xs text-[#718096]">
                اختر اتجاه الترجمة واضغط على <strong className="text-[#2c5282]">"ترجمة نص الوثيقة"</strong> للحصول على ترجمة إدارية فورية.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAIAssistant;
