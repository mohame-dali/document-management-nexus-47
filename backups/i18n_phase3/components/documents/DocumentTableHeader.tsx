
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DocumentTableHeaderProps {
  type: 'incoming' | 'outgoing';
  translations: {
    serialNumber: string;
    subject: string;
    date: string;
    source: string;
    responsible: string;
    assignedTo: string;
    actions: string;
  };
}

const DocumentTableHeader: React.FC<DocumentTableHeaderProps> = ({ type, translations }) => {
  return (
    <TableHeader>
      <TableRow className="bg-[#f7fafc] border-b border-[#e2e8f0] hover:bg-[#f7fafc]">
        <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-28">
          {translations.serialNumber}
        </TableHead>
        <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3">
          {translations.subject}
        </TableHead>
        <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-32">
          {type === 'incoming' ? 'تاريخ الوصول' : 'تاريخ الإصدار'}
        </TableHead>
        <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-36">
          {translations.source}
        </TableHead>
        {type === 'incoming' && (
          <>
            <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-36">
              النشاط
            </TableHead>
            <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-28">
              {translations.responsible}
            </TableHead>
          </>
        )}
        {type === 'outgoing' && (
          <TableHead className="text-right font-semibold text-[#2d3748] text-xs py-3 w-36">
            {translations.assignedTo}
          </TableHead>
        )}
        <TableHead className="text-center font-semibold text-[#2d3748] text-xs py-3 w-24">
          {translations.actions}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default DocumentTableHeader;
