
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
      <TabsList className="grid grid-cols-2 mb-4 h-11 bg-white border border-[#e2e8f0] p-1 rounded">
        <TabsTrigger 
          value="upload" 
          className="flex items-center justify-center gap-2 h-9 text-sm font-medium rounded transition-all duration-200 text-[#4a5568] data-[state=active]:bg-[#2c5282] data-[state=active]:text-white data-[state=active]:shadow-none"
        >
          <File className="h-4 w-4" />
          <span>{uploadTabLabel}</span>
        </TabsTrigger>
        <TabsTrigger 
          value="scan" 
          className="flex items-center justify-center gap-2 h-9 text-sm font-medium rounded transition-all duration-200 text-[#4a5568] data-[state=active]:bg-[#2c5282] data-[state=active]:text-white data-[state=active]:shadow-none"
        >
          <FileScan className="h-4 w-4" />
          <span>{scanTabLabel}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DocumentTypeTabSelector;
