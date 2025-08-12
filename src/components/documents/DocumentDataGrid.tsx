
import React, { useState, useRef } from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { Table, TableBody } from '@/components/ui/table';
import { FileInput } from 'lucide-react';
import DocumentTableHeader from './DocumentTableHeader';
import DocumentTableRow from './DocumentTableRow';
import DocumentPreview from './DocumentPreview';

interface DocumentDataGridProps {
  documents: (IncomingDocument | OutgoingDocument)[];
  type: 'incoming' | 'outgoing';
}

const DocumentDataGrid: React.FC<DocumentDataGridProps> = ({ documents, type }) => {
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const translations = {
    serialNumber: 'رقم التسلسل',
    subject: 'الموضوع',
    date: 'التاريخ',
    source: 'المصدر',
    responsible: 'المسؤول',
    assignedTo: 'مُوجه إلى',
    actions: 'الإجراءات',
    activity: 'النشاط',
    documentDetails: 'تفاصيل الوثيقة',
    viewFullDetails: 'عرض التفاصيل الكاملة',
    downloadPDF: 'تحميل PDF',
    noDocuments: 'لا توجد وثائق',
    arrivalDate: 'تاريخ الوصول',
    issueDate: 'تاريخ الإصدار',
    type: 'النوع',
    noPreview: 'لا توجد معاينة متاحة'
  };

  const handleMouseEnter = (docId: string, event: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Clear any existing preview first
    setHoveredDoc(null);
    
    hoverTimeoutRef.current = setTimeout(() => {
      // Add null check for currentTarget
      if (!event.currentTarget) {
        return;
      }
      
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const previewWidth = 320;
      
      // Calculate position to ensure preview stays within viewport
      let xPosition = rect.left - previewWidth - 10;
      if (xPosition < 10) {
        xPosition = rect.right + 10;
      }
      if (xPosition + previewWidth > viewportWidth - 10) {
        xPosition = viewportWidth - previewWidth - 10;
      }
      
      setPreviewPosition({
        x: Math.max(10, xPosition),
        y: Math.max(10, rect.top)
      });
      setHoveredDoc(docId);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredDoc(null);
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" dir="rtl">
        <FileInput className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{translations.noDocuments}</p>
      </div>
    );
  }

  return (
    <div className="relative" dir="rtl">
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <DocumentTableHeader type={type} translations={translations} />
          <TableBody>
            {documents.map((doc, index) => (
              <DocumentTableRow
                key={doc._id}
                doc={doc}
                type={type}
                index={index}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                translations={translations}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {hoveredDoc && (
        <DocumentPreview
          hoveredDoc={hoveredDoc}
          documents={documents}
          previewPosition={previewPosition}
          translations={translations}
        />
      )}
    </div>
  );
};

export default DocumentDataGrid;
