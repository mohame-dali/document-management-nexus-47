import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import DocumentUploadWithOcr from '@/components/documents/DocumentUploadWithOcr';
import ScannerTab from '@/components/documents/forms/ScannerTab';
import DocumentTypeTabSelector from '@/components/documents/forms/DocumentTypeTabSelector';
import { ScanStage, LiveThumbnail } from '@/services/scannerService';
import { ScanPreviewData } from '@/components/documents/forms/ScannedDocumentPreview';

interface AttachmentSectionProps {
  t: Record<string, string>;
  activeTab: string;
  onTabChange: (value: string) => void;
  onFileSelect: (files: File[]) => void;
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

const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  t,
  activeTab,
  onTabChange,
  onFileSelect,
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
    <div>
      <h3 className="text-sm font-medium mb-2">{t.attachments}</h3>

      <DocumentTypeTabSelector
        activeTab={activeTab}
        onTabChange={onTabChange}
        uploadTabLabel={t.uploadTab}
        scanTabLabel={t.scanTab}
      />

      <div className="mt-2">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsContent value="upload">
            <DocumentUploadWithOcr
              onFileSelect={onFileSelect}
              onOcrComplete={onOcrComplete}
              fieldName="document"
            />
          </TabsContent>

          <TabsContent value="scan">
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
      </div>

      <p className="text-sm text-muted-foreground mt-2">{t.attachmentsDesc}</p>
    </div>
  );
};

export default AttachmentSection;
