
import React from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentListProps {
  documents: (IncomingDocument | OutgoingDocument)[] | { incomingDocuments?: IncomingDocument[]; outgoingDocuments?: OutgoingDocument[] };
}

const DocumentList: React.FC<DocumentListProps> = ({ documents }) => {
  // Handle the case where documents is an object from getFolderDocuments API
  let documentArray: (IncomingDocument | OutgoingDocument)[] = [];
  
  if (Array.isArray(documents)) {
    documentArray = documents;
  } else if (documents && typeof documents === 'object') {
    // Handle API response format with separate arrays
    const { incomingDocuments = [], outgoingDocuments = [] } = documents;
    documentArray = [...incomingDocuments, ...outgoingDocuments];
  }

  if (!documentArray || documentArray.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500" dir="rtl">
        <p>لا توجد مستندات في هذا المجلد</p>
      </div>
    );
  }

  const isIncomingDocument = (doc: IncomingDocument | OutgoingDocument): doc is IncomingDocument => {
    return 'arrivalDate' in doc;
  };

  return (
    <div className="space-y-2" dir="rtl">
      {documentArray.map((doc) => (
        <div key={doc._id} className="p-3 border rounded hover:bg-gray-50 transition-colors">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-sm truncate">{doc.subject}</h4>
              <p className="text-xs text-gray-500">
                الرقم التسلسلي: {doc.serialNumber}/{doc.year}
              </p>
              <p className="text-xs text-gray-500">
                {isIncomingDocument(doc) 
                  ? `تاريخ الوصول: ${formatArabicDate(doc.arrivalDate)}`
                  : `تاريخ الإصدار: ${formatArabicDate(doc.issueDate)}`
                }
              </p>
            </div>
            <div className="text-xs text-gray-400">
              {isIncomingDocument(doc) ? 'وارد' : 'صادر'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList;
