
import React from 'react';
import { FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ScanResultProps {
  t: any;
  scanning: boolean;
  progress: number;
  scanResult: any;
  onCreateFromScan: () => void;
  API_URL: string;
}

const ScanResult: React.FC<ScanResultProps> = ({
  t,
  scanning,
  progress,
  scanResult,
  onCreateFromScan,
  API_URL
}) => {
  if (!scanning && !scanResult) return null;

  return (
    <>
      {scanning && (
        <Card>
          <CardHeader>
            <CardTitle>{t.scanning}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {scanResult && !scanning && (
        <Card>
          <CardHeader>
            <CardTitle>{t.scanInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanResult.filePath && (
              <div className="bg-gray-50 p-4 rounded">
                <p className="font-medium mb-2">File: {scanResult.filePath.split('/').pop()}</p>
                {scanResult.serialNumber && (
                  <p>{t.documentType}: {scanResult.documentType}, Serial: {scanResult.serialNumber}</p>
                )}
              </div>
            )}
            
            {scanResult.ocrText && (
              <div className="space-y-2">
                <h3 className="font-medium">{t.ocrText}</h3>
                <div className="bg-gray-50 p-4 rounded max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{scanResult.ocrText}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            {scanResult.filePath && (
              <Button variant="outline" onClick={() => window.open(`${API_URL}/${scanResult.filePath}`, '_blank')}>
                <FileText className="w-4 h-4 mr-2" />
                {t.viewDocument}
              </Button>
            )}
            <Button onClick={onCreateFromScan}>
              <Check className="w-4 h-4 mr-2" />
              {t.createRecordFromScan}
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
};

export default ScanResult;
