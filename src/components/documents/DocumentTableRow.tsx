
import React from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileInput, FileOutput, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import DocumentActions from './DocumentActions';
import { getActivityUrgency } from '@/utils/activityUtils';

interface DocumentTableRowProps {
  doc: IncomingDocument | OutgoingDocument;
  type: 'incoming' | 'outgoing';
  index: number;
  onMouseEnter: (docId: string, event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  translations: {
    documentDetails: string;
    serialNumber: string;
    date: string;
    source: string;
    type: string;
    subject: string;
    responsible: string;
    assignedTo: string;
    viewFullDetails: string;
    downloadPDF: string;
  };
}

const DocumentTableRow: React.FC<DocumentTableRowProps> = ({
  doc,
  type,
  index,
  onMouseEnter,
  onMouseLeave,
  translations
}) => {
  const navigate = useNavigate();

  const isIncomingDocument = (doc: IncomingDocument | OutgoingDocument): doc is IncomingDocument => {
    return type === 'incoming';
  };

  // Get activity urgency for incoming documents
  const activityUrgency = isIncomingDocument(doc) ? getActivityUrgency(doc) : null;

  const handleRowClick = () => {
    navigate(`/dashboard/${type}-documents/${doc._id}`);
  };

  const handleRowMouseEnter = (event: React.MouseEvent) => {
    // Only trigger preview if document has a scanned document
    if (doc.scannedDocument) {
      onMouseEnter(doc._id, event);
    }
  };

  // Determine row styling based on activity urgency
  const getRowClasses = () => {
    let baseClasses = `cursor-pointer transition-all duration-200 ease-in-out hover:bg-blue-50/80 hover:shadow-sm border-b border-gray-100/60 group ${
      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
    }`;

    if (activityUrgency) {
      baseClasses += ` ${activityUrgency.color} border-l-4 border-l-solid`;
    }

    return baseClasses;
  };

  return (
    <TableRow
      className={getRowClasses()}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleRowClick}
    >
      <TableCell className="font-medium text-right py-4">
        <div className="flex items-center gap-3 justify-end">
          <div className="text-right">
            <div className="font-bold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
              #{doc.serialNumber}
            </div>
            <div className="text-xs text-gray-500 font-medium">{doc.year}</div>
          </div>
          <div className="flex-shrink-0 relative">
            {isIncomingDocument(doc) ? (
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50 shadow-sm group-hover:shadow-md group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-200">
                <FileInput className="h-4 w-4 text-blue-600" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-gradient-to-br from-green-100 to-green-50 border border-green-200/50 shadow-sm group-hover:shadow-md group-hover:from-green-200 group-hover:to-green-100 transition-all duration-200">
                <FileOutput className="h-4 w-4 text-green-600" />
              </div>
            )}
            {/* Activity urgency indicator */}
            {activityUrgency && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                {activityUrgency.type === 'overdue' ? (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                ) : (
                  <Clock className="h-3 w-3 text-orange-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right py-4">
        <div className="max-w-[280px]">
          <div className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2 text-right leading-relaxed group-hover:text-blue-700 transition-colors">
            {doc.subject}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {doc.typeDocument && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200 font-medium px-2 py-1">
                {doc.typeDocument}
              </Badge>
            )}
            {/* Activity urgency badge */}
            {activityUrgency && (
              <Badge className={`text-xs font-medium px-2 py-1 ${activityUrgency.badgeColor} shadow-sm`}>
                <Clock className="h-3 w-3 ml-1" />
                {activityUrgency.label}
              </Badge>
            )}
            {/* Answer indicator for incoming documents */}
            {isIncomingDocument(doc) && doc.answer && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 font-medium px-2 py-1 shadow-sm">
                <FileOutput className="h-3 w-3 ml-1" />
                مُجاب
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right py-4">
        <div className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          {format(
            new Date(isIncomingDocument(doc) ? doc.arrivalDate : doc.issueDate),
            'dd/MM/yyyy'
          )}
        </div>
      </TableCell>
      
      <TableCell className="text-right py-4">
        <div className="text-sm max-w-[150px] truncate font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
          {isIncomingDocument(doc) 
            ? doc.source || 'غير معروف'
            : (doc as OutgoingDocument).source?.name || 'غير معروف'
          }
        </div>
      </TableCell>
      
      {/* Activity column for incoming documents */}
      {type === 'incoming' && (
        <TableCell className="text-right py-4">
          {isIncomingDocument(doc) && doc.activity ? (
            <div className="flex items-center gap-2 justify-end bg-blue-50/50 px-3 py-1.5 rounded-md border border-blue-100">
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm truncate max-w-[120px] font-medium text-blue-700" title={doc.activity}>
                {doc.activity}
              </span>
              {doc.dateActivity && (
                <span className="text-xs text-blue-500 font-medium">
                  ({format(new Date(doc.dateActivity), 'dd/MM')})
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'incoming' && (
        <TableCell className="text-right py-4">
          {isIncomingDocument(doc) && doc.responsibleUser && typeof doc.responsibleUser === 'object' ? (
            <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 truncate">
              {doc.responsibleUser.username}
            </div>
          ) : (
            <span className="text-gray-400 text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'outgoing' && (
        <TableCell className="text-right py-4">
          {!isIncomingDocument(doc) && (doc as OutgoingDocument).assignedTo && (doc as OutgoingDocument).assignedTo.length > 0 ? (
            <div className="flex gap-1.5 justify-end">
              <Badge variant="outline" className="text-xs max-w-[100px] truncate bg-purple-50 text-purple-700 border-purple-200 font-medium px-2 py-1">
                {(doc as OutgoingDocument).assignedTo[0]}
              </Badge>
              {(doc as OutgoingDocument).assignedTo.length > 1 && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-medium px-2 py-1">
                  +{(doc as OutgoingDocument).assignedTo.length - 1}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      <TableCell className="text-center py-4">
        <div onClick={(e) => e.stopPropagation()} className="group-hover:scale-105 transition-transform duration-200">
          <DocumentActions doc={doc} type={type} translations={translations} />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DocumentTableRow;
