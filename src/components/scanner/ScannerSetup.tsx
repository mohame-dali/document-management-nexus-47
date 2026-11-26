import React, { useState } from 'react';
import { Scan, Laptop, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import type { ScannerDevice } from '@/services/scannerService';
export type { ScannerDevice };

interface ScannerSetupProps {
  t: Record<string, string>;
  selectedScanner: string;
  onSelectScanner: (deviceId: string) => void;
  onRefreshScanners: () => void | Promise<unknown>;
  scannersData: ScannerDevice[];
  isScannersLoading: boolean;
  isScanning?: boolean;
}

const ScannerSetup: React.FC<ScannerSetupProps> = ({
  t,
  selectedScanner,
  onSelectScanner,
  onRefreshScanners,
  scannersData,
  isScannersLoading,
  isScanning: isScanningProp,
}) => {
  const [isScanningLocal, setIsScanningLocal] = useState(false);
  const isScanning = Boolean(isScanningProp || isScannersLoading || isScanningLocal);

  const handleRefresh = async () => {
    if (isScanning) return;
    setIsScanningLocal(true);
    try {
      await Promise.resolve(onRefreshScanners());
    } finally {
      setIsScanningLocal(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Scan className="w-5 h-5 mr-2" />
          {t.scannerSetup}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="font-medium mb-2">{t.availableScanners}</h3>

          {isScanning ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground bg-muted/30">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <span>{t.searchingScanners || 'Recherche de scanners en cours...'}</span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : (
            <>
              {scannersData?.length > 0 ? (
                <Select
                  value={selectedScanner}
                  onValueChange={onSelectScanner}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t.selectScanner} />
                  </SelectTrigger>
                  <SelectContent>
                    {scannersData.map((scanner) => (
                      <SelectItem key={scanner.id} value={scanner.id}>
                        {scanner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded">
                  <Laptop className="w-10 h-10 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">{t.noScannersDetected}</p>
                </div>
              )}
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isScanning}
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning
            ? (t.searchingScanners || 'Recherche de scanners en cours...')
            : t.refreshScanners}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScannerSetup;
