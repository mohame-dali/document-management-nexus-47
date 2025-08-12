
import React from 'react';
import { Scan, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ScanSettings {
  documentType: string;
  resolution: string;
  format: string;
}

interface ScanSettingsProps {
  t: any;
  scanSettings: ScanSettings;
  onSettingChange: (key: string, value: string) => void;
  onScanDocument: (temporary: boolean) => void;
  selectedScanner: string;
  scanning: boolean;
}

const ScanSettingsComponent: React.FC<ScanSettingsProps> = ({
  t,
  scanSettings,
  onSettingChange,
  onScanDocument,
  selectedScanner,
  scanning
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.scanSettings}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t.documentType}</h3>
          <RadioGroup 
            value={scanSettings.documentType} 
            onValueChange={(value) => onSettingChange('documentType', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="incoming" id="option-incoming" />
              <Label htmlFor="option-incoming">{t.incoming}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="outgoing" id="option-outgoing" />
              <Label htmlFor="option-outgoing">{t.outgoing}</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t.resolution}</Label>
            <Select 
              value={scanSettings.resolution}
              onValueChange={(value) => onSettingChange('resolution', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">150 DPI</SelectItem>
                <SelectItem value="300">300 DPI</SelectItem>
                <SelectItem value="600">600 DPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.format}</Label>
            <Select 
              value={scanSettings.format}
              onValueChange={(value) => onSettingChange('format', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onScanDocument(true)}
          disabled={!selectedScanner || scanning}
        >
          <Scan className="w-4 h-4 mr-2" />
          {t.scanDocument}
        </Button>
        
        <Button
          onClick={() => onScanDocument(false)}
          disabled={!selectedScanner || scanning}
        >
          <FileText className="w-4 h-4 mr-2" />
          {t.createRecordFromScan}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ScanSettingsComponent;
