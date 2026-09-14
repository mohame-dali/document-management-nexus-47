
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { File, FileScan } from 'lucide-react';

interface DocumentTypeTabSelectorProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  uploadTabLabel: string;
  scanTabLabel: string;
}

const DocumentTypeTabSelector: React.FC<DocumentTypeTabSelectorProps> = ({
  activeTab,
  onTabChange,
  uploadTabLabel,
  scanTabLabel
}) => {
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={onTabChange} 
      className="w-full"
    >
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="upload" className="flex items-center gap-2">
          <File className="h-4 w-4" />
          {uploadTabLabel}
        </TabsTrigger>
        <TabsTrigger value="scan" className="flex items-center gap-2">
          <FileScan className="h-4 w-4" />
          {scanTabLabel}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DocumentTypeTabSelector;
