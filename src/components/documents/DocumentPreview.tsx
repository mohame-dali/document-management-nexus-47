
import React, { useState } from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { FileInput, AlertCircle, Calendar, Building, User, FileText, Hash, Mail, MapPin } from 'lucide-react';

interface DocumentPreviewProps {
  hoveredDoc: string | null;
  documents: (IncomingDocument | OutgoingDocument)[];
  previewPosition: { x: number; y: number };
  translations: {
    noPreview: string;
  };
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  hoveredDoc,
  documents,
  previewPosition,
  translations
}) => {
  const [loadError, setLoadError] = useState<string | null>(null);

  const getDocumentUrl = (documentPath: string) => {
    if (!documentPath) return '';
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return documentPath.startsWith('http') 
      ? documentPath 
      : `${API_URL.replace('/api', '')}/${documentPath}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const isIncomingDocument = (doc: any): doc is IncomingDocument => {
    return 'arrivalDate' in doc;
  };

  if (!hoveredDoc) return null;

  const document = documents.find(d => d._id === hoveredDoc);
  
  if (!document) {
    return (
      <div
        className="fixed z-50 pointer-events-none bg-white border rounded-lg shadow-xl overflow-hidden"
        style={{
          left: previewPosition.x,
          top: previewPosition.y,
          width: '400px',
          height: '500px'
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4" dir="rtl">
          <FileInput className="h-8 w-8 mb-2" />
          <p className="text-sm text-center">{translations.noPreview}</p>
        </div>
      </div>
    );
  }

  const documentUrl = document.scannedDocument ? getDocumentUrl(document.scannedDocument) : '';
  const hasValidPDF = documentUrl && !loadError;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-white border rounded-lg shadow-xl overflow-hidden"
      style={{
        left: previewPosition.x,
        top: previewPosition.y,
        width: '400px',
        height: '500px'
      }}
    >
      {/* Header with document title */}
      <div className="bg-gray-50 px-3 py-2 border-b" dir="rtl">
        <h3 className="text-sm font-medium truncate">{document.subject}</h3>
        <p className="text-xs text-gray-500">#{document.serialNumber} - {document.year}</p>
      </div>

      <div className="flex flex-col h-full">
        {/* Document Details Table */}
        <div className="p-3 border-b bg-gray-50/50 max-h-48 overflow-y-auto" dir="rtl">
          <table className="w-full text-xs">
            <tbody className="space-y-1">
              {/* Serial Number and Year */}
              <tr>
                <td className="font-medium text-gray-600 py-1 w-24">
                  <Hash className="h-3 w-3 inline ml-1" />
                  الرقم:
                </td>
                <td className="text-gray-700 py-1">#{document.serialNumber}/{document.year}</td>
              </tr>

              {/* Date */}
              <tr>
                <td className="font-medium text-gray-600 py-1">
                  <Calendar className="h-3 w-3 inline ml-1" />
                  التاريخ:
                </td>
                <td className="text-gray-700 py-1">
                  {formatDate(isIncomingDocument(document) ? document.arrivalDate : document.issueDate)}
                </td>
              </tr>

              {/* Type Document */}
              {document.typeDocument && (
                <tr>
                  <td className="font-medium text-gray-600 py-1">
                    <FileText className="h-3 w-3 inline ml-1" />
                    النوع:
                  </td>
                  <td className="text-gray-700 py-1">{document.typeDocument}</td>
                </tr>
              )}

              {/* Source */}
              <tr>
                <td className="font-medium text-gray-600 py-1">
                  <Building className="h-3 w-3 inline ml-1" />
                  المصدر:
                </td>
                <td className="text-gray-700 py-1">
                  {isIncomingDocument(document) 
                    ? document.source || 'غير معروف'
                    : (document as OutgoingDocument).source?.name || 'غير معروف'
                  }
                </td>
              </tr>

              {/* Activity (for incoming documents) */}
              {isIncomingDocument(document) && document.activity && (
                <tr>
                  <td className="font-medium text-gray-600 py-1">
                    <MapPin className="h-3 w-3 inline ml-1" />
                    النشاط:
                  </td>
                  <td className="text-gray-700 py-1">{document.activity}</td>
                </tr>
              )}

              {/* Correspondence details for incoming documents */}
              {isIncomingDocument(document) && (
                <>
                  {document.correspondenceNumber && (
                    <tr>
                      <td className="font-medium text-gray-600 py-1">
                        <Mail className="h-3 w-3 inline ml-1" />
                        رقم المراسلة:
                      </td>
                      <td className="text-gray-700 py-1">{document.correspondenceNumber}</td>
                    </tr>
                  )}
                  {document.correspondenceDate && (
                    <tr>
                      <td className="font-medium text-gray-600 py-1">
                        <Calendar className="h-3 w-3 inline ml-1" />
                        تاريخ المراسلة:
                      </td>
                      <td className="text-gray-700 py-1">{formatDate(document.correspondenceDate)}</td>
                    </tr>
                  )}
                </>
              )}

              {/* Assigned To details for outgoing documents */}
              {!isIncomingDocument(document) && (document as OutgoingDocument).assignedTo && (document as OutgoingDocument).assignedTo.length > 0 && (
                <tr>
                  <td className="font-medium text-gray-600 py-1 align-top">
                    <User className="h-3 w-3 inline ml-1" />
                    مُوجه إلى:
                  </td>
                  <td className="text-gray-700 py-1">
                    {(document as OutgoingDocument).assignedTo.join(', ')}
                  </td>
                </tr>
              )}

              {/* Pour Info for outgoing documents */}
              {!isIncomingDocument(document) && (document as OutgoingDocument).pourInfo && (document as OutgoingDocument).pourInfo.length > 0 && (
                <tr>
                  <td className="font-medium text-gray-600 py-1 align-top">
                    <User className="h-3 w-3 inline ml-1" />
                    للعلم:
                  </td>
                  <td className="text-gray-700 py-1">
                    {(document as OutgoingDocument).pourInfo.join(', ')}
                  </td>
                </tr>
              )}

              {/* Assigned To for incoming documents */}
              {isIncomingDocument(document) && document.assignedTo && document.assignedTo.length > 0 && (
                <tr>
                  <td className="font-medium text-gray-600 py-1 align-top">
                    <User className="h-3 w-3 inline ml-1" />
                    مُعيّن إلى:
                  </td>
                  <td className="text-gray-700 py-1">
                    {document.assignedTo.map(dept => dept.name).join(', ')}
                  </td>
                </tr>
              )}

              {/* Responsible User for incoming documents */}
              {isIncomingDocument(document) && document.responsibleUser && typeof document.responsibleUser === 'object' && (
                <tr>
                  <td className="font-medium text-gray-600 py-1">
                    <User className="h-3 w-3 inline ml-1" />
                    المسؤول:
                  </td>
                  <td className="text-gray-700 py-1">{document.responsibleUser.username}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PDF Preview Section */}
        <div className="flex-1 relative">
          {hasValidPDF ? (
            <>
              {loadError ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4" dir="rtl">
                  <AlertCircle className="h-6 w-6 mb-2 text-red-500" />
                  <p className="text-xs text-center">فشل في تحميل المعاينة</p>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <iframe
                    src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH&zoom=70`}
                    className="border-none w-full h-full"
                    title="معاينة الوثيقة"
                    onError={() => setLoadError(hoveredDoc)}
                    onLoad={() => setLoadError(null)}
                    style={{ 
                      transform: 'scale(0.9)',
                      transformOrigin: 'top left',
                      width: '111%',
                      height: '111%'
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded" dir="rtl">
                    معاينة سريعة
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4" dir="rtl">
              <FileInput className="h-6 w-6 mb-2" />
              <p className="text-xs text-center">{translations.noPreview}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
