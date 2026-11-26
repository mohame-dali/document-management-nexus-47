
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDocumentUrl } from '@/services/documentService';
import { useLanguage } from '@/contexts/LanguageProvider';

interface PDFViewerProps {
  documentPath: string;
  expanded?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ documentPath, expanded = false }) => {
  const [loadError, setLoadError] = useState(false);
  const { language } = useLanguage();
  const isFr = language === 'fr';
  
  // Use the fixed document URL helper
  const documentUrl = getDocumentUrl(documentPath);

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = documentPath.split('/').pop() || 'document.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleIframeError = () => {
    setLoadError(true);
  };

  if (!documentPath) {
    return (
      <Card className="h-full border-0 shadow-none dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileText className="h-12 w-12 mb-2" />
            <p>{isFr ? 'Aucun document disponible' : 'لا يوجد مستند متاح'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-0 shadow-none dark:bg-slate-900">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
            {isFr ? 'Aperçu du document' : 'معاينة الوثيقة'}
          </h3>
          <div className="flex gap-2">
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={handleDownload}
              className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4 me-1" />
              {isFr ? 'Télécharger' : 'تحميل'}
            </Button>
            <Button 
              asChild
              size="sm" 
              variant="outline"
              className="dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 me-1" />
                {isFr ? 'Ouvrir' : 'فتح'}
              </a>
            </Button>
          </div>
        </div>
        
        {loadError ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isFr
                ? "Impossible d'afficher l'aperçu PDF. Le chemin est peut-être incorrect ou le fichier est introuvable."
                : 'تعذر عرض معاينة ملف PDF. قد يكون المسار غير صحيح أو الملف غير موجود على الخادم.'}
            </AlertDescription>
          </Alert>
        ) : null}
        
        <div
          className={`border border-slate-200/80 dark:border-slate-800 rounded overflow-hidden bg-slate-50 dark:bg-slate-950 transition-all duration-200 ${
            expanded ? 'h-[78vh] min-h-[680px]' : 'h-[600px]'
          }`}
        >
          {!loadError ? (
            <iframe
              src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Document Preview"
              onError={handleIframeError}
              onLoad={() => setLoadError(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
              <FileText className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium mb-2">
                {isFr ? 'Aperçu PDF indisponible' : 'معاينة PDF غير متاحة'}
              </p>
              <p className="text-sm text-center mb-4 max-w-md">
                {isFr
                  ? 'Le fichier PDF ne peut pas être affiché dans le navigateur.'
                  : 'تعذر عرض ملف PDF داخل المتصفح. يمكنك تحميله أو فتحه في تبويب جديد.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 me-2" />
                  {isFr ? 'Télécharger PDF' : 'تحميل PDF'}
                </Button>
                <Button asChild variant="outline">
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 me-2" />
                    {isFr ? 'Ouvrir dans un nouvel onglet' : 'فتح في تبويب جديد'}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;
