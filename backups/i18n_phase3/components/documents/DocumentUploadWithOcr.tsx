
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useOfflineOcr } from '@/hooks/useOfflineOcr';
import { toast } from 'sonner';

interface DocumentUploadWithOcrProps {
  onFileSelect: (files: File[]) => void;
  onOcrComplete?: (ocrText: string, file: File) => void;
  fieldName?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

const DocumentUploadWithOcr: React.FC<DocumentUploadWithOcrProps> = ({
  onFileSelect,
  onOcrComplete,
  fieldName = 'document',
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = false
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ocrResults, setOcrResults] = useState<Map<string, string>>(new Map());
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const { extractText, isProcessing, error, progress, cleanup } = useOfflineOcr();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setSelectedFiles(acceptedFiles);
    onFileSelect(acceptedFiles);

    // Process OCR for each file
    for (const file of acceptedFiles) {
      try {
        setProcessingFiles(prev => new Set(prev).add(file.name));
        
        toast.info(`بدء معالجة النص من ${file.name}...`, {
          duration: 3000
        });
        
        const ocrText = await extractText(file);
        
        setOcrResults(prev => new Map(prev).set(file.name, ocrText));
        
        if (onOcrComplete) {
          onOcrComplete(ocrText, file);
        }
        
        toast.success(`تم استخراج النص من ${file.name} بنجاح`, {
          duration: 3000
        });
      } catch (err) {
        console.error('OCR failed for file:', file.name, err);
        toast.error(`فشل في استخراج النص من ${file.name}`, {
          duration: 5000
        });
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    }
  }, [extractText, onFileSelect, onOcrComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxSize,
    multiple,
    disabled: isProcessing
  });

  const removeFile = useCallback((fileName: string) => {
    const newFiles = selectedFiles.filter(file => file.name !== fileName);
    setSelectedFiles(newFiles);
    setOcrResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
    setProcessingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileName);
      return newSet;
    });
    onFileSelect(newFiles);
  }, [selectedFiles, onFileSelect]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} name={fieldName} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">
          {isDragActive ? 'أفلت الملفات هنا' : 'اسحب الملفات أو انقر للتحديد'}
        </p>
        <p className="text-sm text-muted-foreground">
          يدعم ملفات PDF والصور (JPG, PNG) حتى {maxSize / (1024 * 1024)}MB
        </p>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-medium">جاري استخراج النص...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">{progress}% مكتمل</p>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">خطأ في معالجة النص</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">الملفات المحددة:</h4>
          {selectedFiles.map((file) => (
            <Card key={file.name}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    {processingFiles.has(file.name) && (
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                        <span className="text-xs text-muted-foreground">معالجة...</span>
                      </div>
                    )}
                    {ocrResults.has(file.name) && !processingFiles.has(file.name) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                    disabled={processingFiles.has(file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* OCR Text Preview */}
                {ocrResults.has(file.name) && !processingFiles.has(file.name) && (
                  <div className="mt-3 p-3 bg-muted rounded">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      النص المستخرج:
                    </p>
                    <div className="text-sm max-h-20 overflow-y-auto">
                      {ocrResults.get(file.name)?.substring(0, 200)}
                      {ocrResults.get(file.name)!.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUploadWithOcr;
