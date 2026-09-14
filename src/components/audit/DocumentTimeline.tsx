
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock,
  User,
  FileText,
  Folder,
  Edit,
  Trash2,
  Plus,
  Move,
  Archive
} from 'lucide-react';
import { getDocumentTimeline } from '@/services/auditService';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DocumentTimelineProps {
  documentId: string;
  documentTitle?: string;
}

const DocumentTimeline: React.FC<DocumentTimelineProps> = ({ 
  documentId, 
  documentTitle 
}) => {
  const { currentUser } = useAuth();

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['documentTimeline', documentId],
    queryFn: () => getDocumentTimeline(documentId),
    enabled: !!documentId && (currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Admin')
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'document_create':
        return Plus;
      case 'document_update':
        return Edit;
      case 'document_delete':
        return Trash2;
      case 'document_moved_to_folder':
        return Move;
      case 'document_removed_from_folder':
        return Archive;
      default:
        return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'document_create':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'document_update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'document_delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'document_moved_to_folder':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'document_removed_from_folder':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'document_create':
        return 'تم إنشاء المستند';
      case 'document_update':
        return 'تم تحديث المستند';
      case 'document_delete':
        return 'تم حذف المستند';
      case 'document_moved_to_folder':
        return 'تم نقل المستند إلى مجلد';
      case 'document_removed_from_folder':
        return 'تم إزالة المستند من المجلد';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  if (currentUser?.role !== 'SuperAdmin' && currentUser?.role !== 'Admin') {
    return null;
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          الجدول الزمني للمستند
        </CardTitle>
        {documentTitle && (
          <p className="text-sm text-gray-600">{documentTitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">جاري تحميل الجدول الزمني...</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="space-y-6">
                {timeline?.map((entry, index) => {
                  const ActionIcon = getActionIcon(entry.action);
                  const isLast = index === timeline.length - 1;
                  
                  return (
                    <div key={entry._id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 p-2 rounded-full bg-white border-2 ${getActionColor(entry.action).split(' ')[2]}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-6">
                        <div className="bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={getActionColor(entry.action)}>
                              {getActionText(entry.action)}
                            </Badge>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(entry.createdAt), 'PPp', { locale: ar })}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{entry.userDetails.username}</span>
                            <Badge variant="outline" className="text-xs">
                              {entry.userDetails.role}
                            </Badge>
                          </div>
                          
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <div className="text-xs text-gray-600 space-y-1">
                                {Object.entries(entry.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="font-medium">{key}:</span>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {timeline?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا يوجد سجل زمني لهذا المستند</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentTimeline;
