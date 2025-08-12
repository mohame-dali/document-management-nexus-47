
import React from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import DocumentUploadWithOcr from '@/components/documents/DocumentUploadWithOcr';
import ScannerTab from '@/components/documents/forms/ScannerTab';
import DocumentTypeTabSelector from '@/components/documents/forms/DocumentTypeTabSelector';

interface AttachmentSectionProps {
  t: any;
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
  scanResult: any;
  scannerStatus: any;
  loadingScannerStatus: boolean;
  handleStartScan: () => void;
  onRemoveScan?: () => void;
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
  scannerStatus,
  loadingScannerStatus,
  handleStartScan,
  onRemoveScan
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
              scannerStatus={scannerStatus}
              loadingScannerStatus={loadingScannerStatus}
              handleStartScan={handleStartScan}
              onRemoveScan={onRemoveScan}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <p className="text-sm text-muted-foreground mt-2">
        {t.attachmentsDesc}
      </p>
    </div>
  );
};

export default AttachmentSection;
