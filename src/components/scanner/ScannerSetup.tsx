
import React from 'react';
import { Scan, Laptop, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface ScannerSetupProps {
  t: any;
  selectedScanner: string;
  onSelectScanner: (deviceId: string) => void;
  onRefreshScanners: () => void;
  scannersData: any[];
  isScannersLoading: boolean;
}

const ScannerSetup: React.FC<ScannerSetupProps> = ({
  t,
  selectedScanner,
  onSelectScanner,
  onRefreshScanners,
  scannersData,
  isScannersLoading
}) => {
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
          
          {isScannersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
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
                <div className="text-center py-4 bg-gray-50 rounded-md">
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
          onClick={onRefreshScanners} 
          disabled={isScannersLoading}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t.refreshScanners}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScannerSetup;
