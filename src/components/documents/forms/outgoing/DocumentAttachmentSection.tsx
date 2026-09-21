
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Scan, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import DocumentUploadWithOcr from '@/components/documents/DocumentUploadWithOcr';

interface DocumentAttachmentSectionProps {
  t: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  handleFileSelect: (files: File[]) => void;
  onOcrComplete?: (ocrText: string, file: File) => void;
  scanSettings: {
    resolution: string;
    format: string;
  };
  handleScanSettingChange: (key: string, value: string) => void;
  scanning: boolean;
  scanProgress: number;
  scanResult: any;
  scannerStatus?: any;
  loadingScannerStatus?: boolean;
  handleStartScan: () => void;
  onRemoveScan?: () => void;
}

const DocumentAttachmentSection: React.FC<DocumentAttachmentSectionProps> = ({
  t,
  activeTab,
  setActiveTab,
  handleFileSelect,
  onOcrComplete,
  scanSettings,
  handleScanSettingChange,
  scanning,
  scanProgress,
  scanResult,
  scannerStatus,
  loadingScannerStatus,
  handleStartScan,
  onRemoveScan
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="upload" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {t.uploadTab}
        </TabsTrigger>
        <TabsTrigger value="scan" className="flex items-center gap-2">
          <Scan className="h-4 w-4" />
          {t.scanTab}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-4">
        <DocumentUploadWithOcr 
          onFileSelect={handleFileSelect}
          onOcrComplete={onOcrComplete}
        />
      </TabsContent>

      <TabsContent value="scan" className="space-y-6">
        {/* Scan Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="resolution">الدقة (DPI)</Label>
            <Select value={scanSettings.resolution} onValueChange={(value) => handleScanSettingChange('resolution', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الدقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">300 DPI</SelectItem>
                <SelectItem value="600">600 DPI (موصى به للعربية)</SelectItem>
                <SelectItem value="800">800 DPI (جودة عالية)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">صيغة الملف</Label>
            <Select value={scanSettings.format} onValueChange={(value) => handleScanSettingChange('format', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الصيغة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scanner Status */}
        {loadingScannerStatus ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">جاري فحص الماسح الضوئي...</p>
          </div>
        ) : scannerStatus ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">حالة الماسح الضوئي</p>
                  <p className="text-sm text-muted-foreground">
                    {scannerStatus.deviceId !== 'Not selected' ? 
                      `متصل: ${scannerStatus.deviceId}` : 
                      'غير محدد'
                    }
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${scannerStatus.deviceId !== 'Not selected' ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Scan Controls */}
        <div className="flex justify-center">
          <Button 
            onClick={handleStartScan}
            disabled={scanning || (scannerStatus?.deviceId === 'Not selected')}
            size="lg"
            className="min-w-32"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                جاري المسح...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                بدء المسح
              </>
            )}
          </Button>
        </div>

        {/* Scan Progress */}
        {scanning && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>جاري المسح...</span>
                  <span>{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan Result */}
        {scanResult && !scanning && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5 text-green-500" />
                    <span className="font-medium">تم المسح بنجاح</span>
                  </div>
                  {onRemoveScan && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onRemoveScan}
                      aria-label="حذف المسح الضوئي"
                      className="h-11 w-11 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {scanResult.ocrText && (
                  <div className="space-y-2">
                    <Label>النص المستخرج (OCR)</Label>
                    <div className="bg-muted p-3 rounded max-h-32 overflow-y-auto text-sm">
                      <p className="whitespace-pre-wrap">{scanResult.ocrText}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default DocumentAttachmentSection;
