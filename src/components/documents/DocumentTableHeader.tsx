
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
      <TableRow className="bg-gray-50/80">
        <TableHead className="text-right font-semibold text-gray-700 w-32">
          {translations.serialNumber}
        </TableHead>
        <TableHead className="text-right font-semibold text-gray-700">
          {translations.subject}
        </TableHead>
        <TableHead className="text-right font-semibold text-gray-700 w-32">
          {type === 'incoming' ? 'تاريخ الوصول' : 'تاريخ الإصدار'}
        </TableHead>
        <TableHead className="text-right font-semibold text-gray-700 w-40">
          {translations.source}
        </TableHead>
        {type === 'incoming' && (
          <>
            <TableHead className="text-right font-semibold text-gray-700 w-40">
              النشاط
            </TableHead>
            <TableHead className="text-right font-semibold text-gray-700 w-32">
              {translations.responsible}
            </TableHead>
          </>
        )}
        {type === 'outgoing' && (
          <TableHead className="text-right font-semibold text-gray-700 w-40">
            {translations.assignedTo}
          </TableHead>
        )}
        <TableHead className="text-center font-semibold text-gray-700 w-24">
          {translations.actions}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default DocumentTableHeader;
