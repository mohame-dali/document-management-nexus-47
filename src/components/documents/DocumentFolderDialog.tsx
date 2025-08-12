
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentFolderAssignment from '@/components/folders/DocumentFolderAssignment';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Lock, Eye, Users, FileText, Calendar } from 'lucide-react';

interface DocumentFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IncomingDocument | OutgoingDocument;
  documentType: 'incoming' | 'outgoing';
  readOnly?: boolean;
}

const DocumentFolderDialog: React.FC<DocumentFolderDialogProps> = ({
  open,
  onOpenChange,
  document,
  documentType,
  readOnly = false
}) => {
  const { currentUser } = useAuth();
  
  const handleAssignmentUpdate = () => {
    onOpenChange(false);
  };

  // Handle both string and Folder object cases
  const getCurrentFolderId = () => {
    if (!document.folder) return null;
    if (typeof document.folder === 'string') return document.folder;
    if (typeof document.folder === 'object' && document.folder._id) return document.folder._id;
    return null;
  };

  // Determine if this should be read-only based on user role
  const isReadOnly = readOnly || (currentUser?.role !== 'AdminDepartment');

  const getDialogInfo = () => {
    switch (currentUser?.role) {
      case 'AdminDepartment':
        return {
          title: 'تنظيم المستند في مجلد',
          subtitle: 'يمكنك تنظيم المستند في المجلدات أو نقله بين المجلدات',
          icon: FolderOpen,
          badge: { text: 'إدارة كاملة', variant: 'default' as const, icon: Users },
          bgGradient: 'from-blue-50 to-indigo-50',
          iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
          accentColor: 'border-blue-500'
        };
      case 'AdminTuningDesk':
        return {
          title: 'عرض تصنيف المستند',
          subtitle: 'يمكنك عرض تصنيف المستند في المجلدات فقط',
          icon: Eye,
          badge: { text: 'مراقبة التصنيف', variant: 'secondary' as const, icon: Eye },
          bgGradient: 'from-amber-50 to-orange-50',
          iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
          accentColor: 'border-amber-500'
        };
      case 'User':
        return {
          title: 'عرض تصنيف المستند',
          subtitle: 'يمكنك عرض تصنيف المستند في قسمك',
          icon: Eye,
          badge: { text: 'للعرض فقط', variant: 'secondary' as const, icon: Lock },
          bgGradient: 'from-gray-50 to-slate-50',
          iconBg: 'bg-gradient-to-br from-gray-500 to-slate-600',
          accentColor: 'border-gray-500'
        };
      default:
        return {
          title: 'إدارة تصنيف المستند',
          subtitle: 'إدارة شاملة لتصنيف المستند',
          icon: FolderOpen,
          badge: { text: 'إدارة شاملة', variant: 'default' as const, icon: Users },
          bgGradient: 'from-blue-50 to-indigo-50',
          iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
          accentColor: 'border-blue-500'
        };
    }
  };

  const dialogInfo = getDialogInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="space-y-4 pb-4">
          {/* Enhanced Header with Gradient Background */}
          <div className={`p-6 -m-6 mb-0 rounded-t-lg bg-gradient-to-r ${dialogInfo.bgGradient} border-b ${dialogInfo.accentColor} border-opacity-20`}>
            <div className="flex items-center justify-between mb-3">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                <div className={`p-3 ${dialogInfo.iconBg} rounded-xl shadow-lg`}>
                  <dialogInfo.icon className="h-6 w-6 text-white" />
                </div>
                <span className="gradient-text">{dialogInfo.title}</span>
              </DialogTitle>
              <Badge 
                variant={dialogInfo.badge.variant} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <dialogInfo.badge.icon className="h-4 w-4" />
                {dialogInfo.badge.text}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {dialogInfo.subtitle}
            </p>

            {/* Document Info Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/60 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-700">موضوع المستند:</span>
                    <Badge variant="outline" className="text-xs">
                      {documentType === 'incoming' ? 'وارد' : 'صادر'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-800 font-medium line-clamp-2">
                    {document.subject}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        {/* Enhanced Content Area */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-1">
          <div className="bg-gradient-to-b from-white to-gray-50/50 rounded-lg p-4 border border-gray-200/50 shadow-sm">
            <DocumentFolderAssignment
              documentId={document._id}
              documentType={documentType}
              currentFolderId={getCurrentFolderId()}
              onAssignmentUpdate={handleAssignmentUpdate}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="border-t border-gray-200/50 pt-4 mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>آخر تحديث: اليوم</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>متصل</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentFolderDialog;
