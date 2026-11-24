import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Scan } from 'lucide-react';
import DocumentUploadWithOcr from '@/components/documents/DocumentUploadWithOcr';
import ScannerTab from '@/components/documents/forms/ScannerTab';
import { ScanStage, LiveThumbnail } from '@/services/scannerService';
import { ScanPreviewData } from '@/components/documents/forms/ScannedDocumentPreview';

interface DocumentAttachmentSectionProps {
  t: Record<string, string>;
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
  scanResult: ScanPreviewData | null;
  scanError?: string | null;
  liveThumbnails?: LiveThumbnail[];
  scannerStatus?: Record<string, unknown> | null;
  loadingScannerStatus?: boolean;
  handleStartScan: () => void;
  onRemoveScan?: () => void;
  scanStage?: ScanStage | null;
  scanPage?: number;
  onCancelScan?: () => void;
  onRescan?: () => void;
  onUseScan?: () => void;
  isScanAttached?: boolean;
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
  scanError,
  liveThumbnails,
  scannerStatus,
  loadingScannerStatus,
  handleStartScan,
  onRemoveScan,
  scanStage,
  scanPage,
  onCancelScan,
  onRescan,
  onUseScan,
  isScanAttached,
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

      <TabsContent value="scan" className="space-y-4">
        <ScannerTab
          t={t}
          scanSettings={scanSettings}
          handleScanSettingChange={handleScanSettingChange}
          scanning={scanning}
          scanProgress={scanProgress}
          scanResult={scanResult}
          scanError={scanError}
          liveThumbnails={liveThumbnails}
          scannerStatus={scannerStatus}
          loadingScannerStatus={loadingScannerStatus}
          handleStartScan={handleStartScan}
          onRemoveScan={onRemoveScan}
          scanStage={scanStage}
          scanPage={scanPage}
          onCancelScan={onCancelScan}
          onRescan={onRescan}
          onUseScan={onUseScan}
          isScanAttached={isScanAttached}
        />
      </TabsContent>
    </Tabs>
  );
};

export default DocumentAttachmentSection;
