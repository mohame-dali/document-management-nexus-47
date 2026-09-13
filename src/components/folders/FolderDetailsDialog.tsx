import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Folder, 
  Archive, 
  Calendar, 
  User, 
  Building2, 
  FileText,
  Clock,
  Circle,
  Tag
} from 'lucide-react';
import { Folder as FolderType } from '@/types';
import { formatArabicDate, formatArabicDateTime } from '@/utils/arabicDateFormatter';

interface FolderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  documentCount?: number;
}

const FolderDetailsDialog: React.FC<FolderDetailsDialogProps> = ({
  open,
  onOpenChange,
  folder,
  documentCount = 0
}) => {
  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden shadow-xl" dir="rtl">
        {/* Institutional Header */}
        <DialogHeader className="p-6 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282]">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
              {folder.status === 'Fermé' ? (
                <Archive className="h-5 w-5" />
              ) : (
                <Folder className="h-5 w-5" />
              )}
            </div>
            <span>تفاصيل المجلد: {folder.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6 text-base">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4">
              <span className="text-gray-500 font-medium block mb-1 text-sm">المستندات المصنفة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[#1a202c]">{documentCount}</span>
                <span className="px-2.5 py-1 rounded text-sm font-bold bg-[#FFCB56] text-[#1a202c] border border-[#FFD758]">
                  مستند
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-4">
              <span className="text-gray-500 font-medium block mb-1 text-sm">حالة المجلد</span>
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold ${folder.status === 'En cours' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {folder.status === 'En cours' ? 'نشط (مفتوح)' : 'مؤرشف (مغلق)'}
                </span>
                <span className={`w-3 h-3 rounded-full ${folder.status === 'En cours' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="border border-[#e2e8f0] rounded divide-y divide-[#e2e8f0] bg-white">
            <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-600 flex items-center gap-2 font-medium">
                <Tag className="h-4 w-4 text-[#2c5282]" />
                اسم المجلد
              </span>
              <span className="font-bold text-[#1a202c]">{folder.name}</span>
            </div>

            {folder.description && (
              <div className="p-4 flex items-start justify-between hover:bg-gray-50/50">
                <span className="text-gray-600 flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-[#2c5282]" />
                  الوصف
                </span>
                <span className="text-gray-800 max-w-[360px] text-right font-medium leading-relaxed">{folder.description}</span>
              </div>
            )}

            <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-600 flex items-center gap-2 font-medium">
                <Folder className="h-4 w-4 text-[#2c5282]" />
                المستوى الهرمي
              </span>
              <span className="font-bold text-gray-800">
                {folder.parent ? 'مجلد فرعي' : 'مجلد رئيسي (جذر)'}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-600 flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 text-[#2c5282]" />
                تاريخ الإنشاء
              </span>
              <span className="font-bold text-[#1a202c]">{formatArabicDate(folder.createdAt)}</span>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-600 flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-[#2c5282]" />
                وقت الإنشاء
              </span>
              <span className="font-bold text-[#1a202c]">{formatArabicDateTime(folder.createdAt)}</span>
            </div>

            {typeof folder.createdBy === 'object' && folder.createdBy?.username && (
              <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                <span className="text-gray-600 flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-[#2c5282]" />
                  أنشئ بواسطة
                </span>
                <span className="font-bold text-[#2c5282]">{folder.createdBy.username}</span>
              </div>
            )}

            {typeof folder.department === 'object' && folder.department?.name && (
              <div className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                <span className="text-gray-600 flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4 text-[#2c5282]" />
                  القسم الإداري
                </span>
                <span className="font-bold text-[#1a202c]">{folder.department.name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDetailsDialog;
