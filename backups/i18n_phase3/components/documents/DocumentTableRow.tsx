
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
    let baseClasses = `cursor-pointer transition-colors duration-200 ease-in-out hover:bg-[#f7fafc] border-b border-[#e2e8f0] group ${
      index % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
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
      <TableCell className="font-medium text-right py-3.5">
        <div className="flex items-center gap-2.5 justify-end">
          <div className="text-right">
            <div className="font-bold text-sm text-[#1a202c] group-hover:text-[#2c5282] transition-colors duration-200">
              #{doc.serialNumber}
            </div>
            <div className="text-xs text-[#718096]">{doc.year}</div>
          </div>
          <div className="flex-shrink-0 relative">
            {isIncomingDocument(doc) ? (
              <div className="p-2 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] transition-colors duration-200">
                <FileInput className="h-4 w-4" />
              </div>
            ) : (
              <div className="p-2 rounded bg-[#ebf8f1] border border-[#bbf0d0] text-[#38a169] transition-colors duration-200">
                <FileOutput className="h-4 w-4" />
              </div>
            )}
            {/* Activity urgency indicator */}
            {activityUrgency && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
                {activityUrgency.type === 'overdue' ? (
                  <AlertTriangle className="h-3 w-3 text-[#e53e3e]" />
                ) : (
                  <Clock className="h-3 w-3 text-[#d69e2e]" />
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right py-3.5">
        <div className="max-w-[280px]">
          <div className="font-medium text-sm text-[#1a202c] line-clamp-2 mb-1.5 text-right leading-relaxed group-hover:text-[#2c5282] transition-colors duration-200">
            {doc.subject}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {doc.typeDocument && (
              <Badge variant="secondary" className="text-xs bg-[#f1f5f9] text-[#475569] border-[#e2e8f0] font-normal px-2 py-0.5 rounded">
                {doc.typeDocument}
              </Badge>
            )}
            {/* Activity urgency badge */}
            {activityUrgency && (
              <Badge className={`text-xs font-medium px-2 py-0.5 rounded ${activityUrgency.badgeColor} shadow-xs`}>
                <Clock className="h-3 w-3 ml-1" />
                {activityUrgency.label}
              </Badge>
            )}
            {/* Answer indicator for incoming documents */}
            {isIncomingDocument(doc) && doc.answer && (
              <Badge variant="outline" className="text-xs bg-[#ebf8f1] text-[#22543d] border-[#bbf0d0] font-medium px-2 py-0.5 rounded shadow-xs">
                <FileOutput className="h-3 w-3 ml-1" />
                مُجاب
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right py-3.5">
        <div className="inline-block text-xs font-medium text-[#2d3748] bg-[#f7fafc] px-2.5 py-1 rounded border border-[#e2e8f0]">
          {format(
            new Date(isIncomingDocument(doc) ? doc.arrivalDate : doc.issueDate),
            'dd/MM/yyyy'
          )}
        </div>
      </TableCell>
      
      <TableCell className="text-right py-3.5">
        <div className="text-sm max-w-[150px] truncate font-normal text-[#4a5568] group-hover:text-[#1a202c] transition-colors duration-200">
          {isIncomingDocument(doc) 
            ? doc.source || 'غير معروف'
            : (doc as OutgoingDocument).source?.name || 'غير معروف'
          }
        </div>
      </TableCell>
      
      {/* Activity column for incoming documents */}
      {type === 'incoming' && (
        <TableCell className="text-right py-3.5">
          {isIncomingDocument(doc) && doc.activity ? (
            <div className="flex items-center gap-1.5 justify-end bg-[#ebf4ff] px-2.5 py-1 rounded border border-[#bee3f8] inline-flex">
              <Activity className="h-3.5 w-3.5 text-[#2c5282]" />
              <span className="text-xs truncate max-w-[120px] font-medium text-[#2c5282]" title={doc.activity}>
                {doc.activity}
              </span>
              {doc.dateActivity && (
                <span className="text-[11px] text-[#2c5282]/80">
                  ({format(new Date(doc.dateActivity), 'dd/MM')})
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#a0aec0] text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'incoming' && (
        <TableCell className="text-right py-3.5">
          {isIncomingDocument(doc) && doc.responsibleUser && typeof doc.responsibleUser === 'object' ? (
            <div className="text-xs font-medium text-[#4a5568] bg-[#f7fafc] px-2.5 py-1 rounded border border-[#e2e8f0] truncate inline-block">
              {doc.responsibleUser.username}
            </div>
          ) : (
            <span className="text-[#a0aec0] text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'outgoing' && (
        <TableCell className="text-right py-3.5">
          {!isIncomingDocument(doc) && (doc as OutgoingDocument).assignedTo && (doc as OutgoingDocument).assignedTo.length > 0 ? (
            <div className="flex gap-1.5 justify-end">
              <Badge variant="outline" className="text-xs max-w-[100px] truncate bg-purple-50 text-purple-700 border-purple-200 font-medium px-2 py-0.5 rounded">
                {(doc as OutgoingDocument).assignedTo[0]}
              </Badge>
              {(doc as OutgoingDocument).assignedTo.length > 1 && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-medium px-2 py-0.5 rounded">
                  +{(doc as OutgoingDocument).assignedTo.length - 1}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-[#a0aec0] text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      <TableCell className="text-center py-3.5">
        <div onClick={(e) => e.stopPropagation()} className="transition-transform duration-200">
          <DocumentActions doc={doc} type={type} translations={translations} />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DocumentTableRow;
