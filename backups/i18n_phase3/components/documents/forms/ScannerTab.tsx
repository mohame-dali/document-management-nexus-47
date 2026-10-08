
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileScan, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ScannedDocumentPreview from './ScannedDocumentPreview';

interface ScannerTabProps {
  t: any;
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

const ScannerTab: React.FC<ScannerTabProps> = ({
  t,
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
  const navigate = useNavigate();

  // Prevent memory leaks by cleaning up on unmount
  useEffect(() => {
    return () => {
      // Any cleanup needed for scanning operations
    };
  }, []);

  const handleScanClick = () => {
    try {
      handleStartScan();
    } catch (error) {
      console.error('Error starting scan:', error);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Scanner setup and controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FormLabel>Format</FormLabel>
          <Select
            value={scanSettings.format}
            onValueChange={(value) => handleScanSettingChange('format', value)}
            disabled={scanning}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">{t.pdfFormat || 'PDF'}</SelectItem>
              <SelectItem value="jpeg">{t.jpegFormat || 'JPEG'}</SelectItem>
              <SelectItem value="png">{t.pngFormat || 'PNG'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <FormLabel>{t.resolution || 'Resolution'}</FormLabel>
          <Select
            value={scanSettings.resolution}
            onValueChange={(value) => handleScanSettingChange('resolution', value)}
            disabled={scanning}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="150">150 DPI</SelectItem>
              <SelectItem value="300">300 DPI</SelectItem>
              <SelectItem value="600">600 DPI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Scanner status warning */}
      {scannerStatus?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {scannerStatus.error}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Scan button and status */}
      <div className="flex flex-col items-center space-y-4">
        {loadingScannerStatus ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading scanner status...</span>
          </div>
        ) : scannerStatus?.data?.deviceId ? (
          <Button 
            type="button"
            onClick={handleScanClick}
            disabled={scanning}
            className="w-full"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.scanning || 'Scanning...'}
              </>
            ) : (
              <>
                <FileScan className="mr-2 h-4 w-4" />
                {t.scanDocument || 'Scan Document'}
              </>
            )}
          </Button>
        ) : (
          <div className="text-center space-y-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 font-medium">{t.scannerNotConfigured || 'Scanner not configured'}</p>
              <p className="text-yellow-600 text-sm mt-1">
                Please connect your scanner, install drivers, and configure it first.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/scan')}
              disabled={scanning}
            >
              {t.configureScanner || 'Configure Scanner'}
            </Button>
          </div>
        )}
        
        {/* Scanning progress */}
        {scanning && (
          <div className="w-full space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-200" 
                style={{ width: `${Math.min(scanProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {scanProgress}% {t.complete || 'Complete'}
            </p>
          </div>
        )}
      </div>
      
      {/* Real-time Scan Preview */}
      {scanResult && !scanning && (
        <ScannedDocumentPreview
          t={t}
          scanResult={scanResult}
          onRemove={onRemoveScan}
        />
      )}
    </div>
  );
};

export default ScannerTab;
