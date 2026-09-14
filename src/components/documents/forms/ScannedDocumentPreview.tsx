
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Eye, X } from 'lucide-react';

interface ScannedDocumentPreviewProps {
  t: any;
  scanResult: any;
  onRemove?: () => void;
  API_URL?: string;
}

const ScannedDocumentPreview: React.FC<ScannedDocumentPreviewProps> = ({
  t,
  scanResult,
  onRemove,
  API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')
}) => {
  if (!scanResult) return null;

  const handleViewDocument = () => {
    if (scanResult.filePath) {
      const fullUrl = scanResult.filePath.startsWith('http') 
        ? scanResult.filePath 
        : `${API_URL}/${scanResult.filePath}`;
      window.open(fullUrl, '_blank');
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-600" />
            {t.scanResults || 'نتائج المسح الضوئي'}
          </span>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Information */}
        {scanResult.filePath && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {scanResult.filePath.split('/').pop()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDocument}
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>{t.viewDocument || 'عرض المستند'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* OCR Text Preview */}
        {scanResult.ocrText && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {t.ocrText || 'النص المستخرج'}:
            </h4>
            <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap text-gray-700">
                {scanResult.ocrText.length > 300 
                  ? `${scanResult.ocrText.substring(0, 300)}...` 
                  : scanResult.ocrText
                }
              </p>
            </div>
          </div>
        )}

        {/* Scan Metadata */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>{t.scannedAt || 'تم المسح في'}: {new Date().toLocaleString('ar-SA')}</p>
          {scanResult.format && (
            <p>{t.format || 'الصيغة'}: {scanResult.format.toUpperCase()}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScannedDocumentPreview;
