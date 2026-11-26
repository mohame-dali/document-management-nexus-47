
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
      <TableRow className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 hover:bg-slate-50/90 dark:hover:bg-slate-800/70">
        <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-28">
          {translations.serialNumber}
        </TableHead>
        <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3">
          {translations.subject}
        </TableHead>
        <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-32">
          {type === 'incoming' ? 'تاريخ الوصول' : 'تاريخ الإصدار'}
        </TableHead>
        <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-36">
          {translations.source}
        </TableHead>
        {type === 'incoming' && (
          <>
            <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-36">
              النشاط
            </TableHead>
            <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-28">
              {translations.responsible}
            </TableHead>
          </>
        )}
        {type === 'outgoing' && (
          <TableHead className="text-start font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-36">
            {translations.assignedTo}
          </TableHead>
        )}
        <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-200 text-xs sm:text-sm py-3 w-24">
          {translations.actions}
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};

export default DocumentTableHeader;
