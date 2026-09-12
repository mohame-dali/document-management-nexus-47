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
      <DialogContent className="sm:max-w-md bg-white border border-[#e2e8f0] rounded p-0 overflow-hidden" dir="rtl">
        {/* Institutional Header */}
        <DialogHeader className="p-4 bg-[#f8fafc] border-b border-[#e2e8f0] text-right">
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-[#2c5282]">
            <div className="w-8 h-8 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
              {folder.status === 'Fermé' ? (
                <Archive className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
            </div>
            <span>تفاصيل المجلد: {folder.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4 text-xs">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-2.5">
              <span className="text-gray-500 block mb-1">المستندات المصنفة</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#1a202c]">{documentCount}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFCB56] text-[#78350f] border border-[#FFD758]">
                  مستند
                </span>
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-2.5">
              <span className="text-gray-500 block mb-1">حالة المجلد</span>
              <div className="flex items-center justify-between">
                <span className={`font-bold ${folder.status === 'En cours' ? 'text-green-700' : 'text-slate-600'}`}>
                  {folder.status === 'En cours' ? 'نشط (مفتوح)' : 'مؤرشف (مغلق)'}
                </span>
                <span className={`w-2 h-2 rounded-full ${folder.status === 'En cours' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="border border-[#e2e8f0] rounded divide-y divide-[#e2e8f0]">
            <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                اسم المجلد
              </span>
              <span className="font-semibold text-[#1a202c]">{folder.name}</span>
            </div>

            {folder.description && (
              <div className="p-2.5 flex items-start justify-between hover:bg-gray-50/50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  الوصف
                </span>
                <span className="text-gray-700 max-w-[220px] text-right">{folder.description}</span>
              </div>
            )}

            <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-gray-400" />
                المستوى الهرمي
              </span>
              <span className="font-medium text-gray-700">
                {folder.parent ? 'مجلد فرعي' : 'مجلد رئيسي (جذر)'}
              </span>
            </div>

            <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                تاريخ الإنشاء
              </span>
              <span className="text-gray-800">{formatArabicDate(folder.createdAt)}</span>
            </div>

            <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                وقت الإنشاء
              </span>
              <span className="text-gray-800">{formatArabicDateTime(folder.createdAt)}</span>
            </div>

            {typeof folder.createdBy === 'object' && folder.createdBy?.username && (
              <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  أنشئ بواسطة
                </span>
                <span className="font-medium text-[#2c5282]">{folder.createdBy.username}</span>
              </div>
            )}

            {typeof folder.department === 'object' && folder.department?.name && (
              <div className="p-2.5 flex items-center justify-between hover:bg-gray-50/50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  القسم الإداري
                </span>
                <span className="text-gray-800">{folder.department.name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDetailsDialog;
