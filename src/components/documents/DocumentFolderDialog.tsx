
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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[960px] md:max-w-[1000px] max-h-[90vh] overflow-hidden p-0 bg-white border border-[#e2e8f0] rounded shadow-xl" dir="rtl">
        <DialogHeader className="p-6 border-b border-[#e2e8f0] bg-[#f8fafc] space-y-3 text-right">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-[#2c5282]/10 text-[#2c5282] flex items-center justify-center shrink-0">
                <dialogInfo.icon className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282]">
                  {dialogInfo.title}
                </DialogTitle>
                <p className="text-base text-gray-600 leading-relaxed mt-1">
                  {dialogInfo.subtitle}
                </p>
              </div>
            </div>

            <Badge 
              variant={dialogInfo.badge.variant} 
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold border border-[#cbd5e1] bg-white text-[#2c5282]"
            >
              <dialogInfo.badge.icon className="h-4 w-4" />
              {dialogInfo.badge.text}
            </Badge>
          </div>

          {/* Document Info Box */}
          <div className="bg-white rounded border border-[#e2e8f0] p-4 flex items-start gap-3 mt-3">
            <div className="w-10 h-10 rounded bg-[#ebf4ff] border border-[#bee3f8] text-[#2c5282] flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-semibold text-gray-700">موضوع المستند:</span>
                <span className={`px-2.5 py-0.5 rounded text-sm font-semibold border ${
                  documentType === 'incoming'
                    ? 'bg-blue-50 text-[#2c5282] border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {documentType === 'incoming' ? 'وارد' : 'صادر'}
                </span>
              </div>
              <p className="text-base text-[#1a202c] font-medium leading-relaxed">
                {document.subject}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6 bg-[#f7fafc]">
          <div className="bg-white rounded p-5 sm:p-6 border border-[#e2e8f0]">
            <DocumentFolderAssignment
              documentId={document._id}
              documentType={documentType}
              currentFolderId={getCurrentFolderId()}
              onAssignmentUpdate={handleAssignmentUpdate}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#e2e8f0] p-4 px-6 bg-[#f8fafc]">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>آخر تحديث: اليوم</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              <span className="font-medium text-emerald-700">متصل بالخادم</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentFolderDialog;
