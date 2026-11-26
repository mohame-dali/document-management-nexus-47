
import React from 'react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileInput, FileOutput, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatShortDate, formatShortDayMonth } from '@/utils/formatDate';
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
    let baseClasses = `cursor-pointer transition-colors duration-150 ease-in-out hover:bg-slate-50/90 dark:hover:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 group ${
      index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-900/60'
    }`;

    if (activityUrgency) {
      baseClasses += ` ${activityUrgency.color} border-s-4 border-solid`;
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
      <TableCell className="font-medium text-start py-3.5 tabular-nums">
        <div className="flex items-center gap-2.5 justify-end">
          <div className="text-start">
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-400 transition-colors duration-200 tabular-nums whitespace-nowrap">
              <bdi dir="ltr">#{doc.serialNumber} / {doc.year}</bdi>
            </div>
          </div>
          <div className="flex-shrink-0 relative">
            {isIncomingDocument(doc) ? (
              <div className="p-2 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 transition-colors duration-200">
                <FileInput className="h-4 w-4" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 transition-colors duration-200">
                <FileOutput className="h-4 w-4" />
              </div>
            )}
            {/* Activity urgency indicator */}
            {activityUrgency && (
              <div className="absolute -top-1 -start-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-xs">
                {activityUrgency.type === 'overdue' ? (
                  <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                ) : (
                  <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-start py-3.5">
        <div className="max-w-[280px]">
          <div className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-1.5 text-start leading-relaxed group-hover:text-[#2c5282] dark:group-hover:text-blue-400 transition-colors duration-200">
            {doc.subject}
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {doc.typeDocument && (
              <Badge variant="secondary" className="text-xs font-normal px-2.5 py-0.5 rounded-full">
                {doc.typeDocument}
              </Badge>
            )}
            {/* Activity urgency badge */}
            {activityUrgency && (
              <Badge className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${activityUrgency.badgeColor}`}>
                <Clock className="h-3 w-3 me-1" />
                {activityUrgency.label}
              </Badge>
            )}
            {/* Answer indicator for incoming documents */}
            {isIncomingDocument(doc) && doc.answer && (
              <Badge variant="success" className="text-xs font-medium px-2.5 py-0.5 rounded-full">
                <FileOutput className="h-3 w-3 me-1" />
                مُجاب
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-start py-3.5 tabular-nums">
        <div className="inline-block text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700/80 tabular-nums">
          <bdi dir="ltr">
            {formatShortDate(isIncomingDocument(doc) ? doc.arrivalDate : doc.issueDate)}
          </bdi>
        </div>
      </TableCell>
      
      <TableCell className="text-start py-3.5">
        <div className="text-sm max-w-[150px] truncate font-normal text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors duration-200">
          {isIncomingDocument(doc) 
            ? doc.source || 'غير معروف'
            : (doc as OutgoingDocument).source?.name || 'غير معروف'
          }
        </div>
      </TableCell>
      
      {/* Activity column for incoming documents */}
      {type === 'incoming' && (
        <TableCell className="text-start py-3.5 tabular-nums">
          {isIncomingDocument(doc) && doc.activity ? (
            <div className="flex items-center gap-1.5 justify-end bg-blue-50/90 dark:bg-blue-950/50 px-2.5 py-1 rounded-full border border-blue-200/80 dark:border-blue-800/60 inline-flex">
              <Activity className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-400" />
              <span className="text-xs truncate max-w-[120px] font-medium text-[#2c5282] dark:text-blue-300" title={doc.activity}>
                {doc.activity}
              </span>
              {doc.dateActivity && (
                <span className="text-[13px] text-[#2c5282]/80 dark:text-blue-300/80 tabular-nums">
                  (<bdi dir="ltr">{formatShortDayMonth(doc.dateActivity)}</bdi>)
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'incoming' && (
        <TableCell className="text-start py-3.5">
          {isIncomingDocument(doc) && doc.responsibleUser && typeof doc.responsibleUser === 'object' ? (
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700/80 truncate inline-block">
              {doc.responsibleUser.username}
            </div>
          ) : (
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">-</span>
          )}
        </TableCell>
      )}
      
      {type === 'outgoing' && (
        <TableCell className="text-start py-3.5">
          {!isIncomingDocument(doc) && (doc as OutgoingDocument).assignedTo && (doc as OutgoingDocument).assignedTo.length > 0 ? (
            <div className="flex gap-1.5 justify-end">
              <Badge variant="outline" className="text-xs max-w-[100px] truncate bg-purple-50/90 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 font-medium px-2.5 py-0.5 rounded-full">
                {(doc as OutgoingDocument).assignedTo[0]}
              </Badge>
              {(doc as OutgoingDocument).assignedTo.length > 1 && (
                <Badge variant="outline" className="text-xs bg-purple-50/90 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 font-medium px-2.5 py-0.5 rounded-full tabular-nums">
                  <bdi dir="ltr">+{(doc as OutgoingDocument).assignedTo.length - 1}</bdi>
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">-</span>
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
