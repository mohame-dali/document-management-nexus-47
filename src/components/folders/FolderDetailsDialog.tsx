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
import { formatLongDate, formatDateTime } from '@/utils/formatDate';

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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0 overflow-hidden shadow-lg" dir="rtl">
        {/* Institutional Header */}
        <DialogHeader className="p-6 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-right">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-sky-300">
            <div className="w-10 h-10 rounded-lg bg-[#2c5282]/10 dark:bg-sky-900/40 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0">
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
            <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4">
              <span className="text-slate-700 dark:text-slate-300 font-medium block mb-1 text-sm">المستندات المصنفة</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">{documentCount}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                  مستند
                </span>
              </div>
            </div>

            <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4">
              <span className="text-slate-700 dark:text-slate-300 font-medium block mb-1 text-sm">حالة المجلد</span>
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold ${folder.status === 'En cours' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {folder.status === 'En cours' ? 'نشط (مفتوح)' : 'مؤرشف (مغلق)'}
                </span>
                <span className={`w-3 h-3 rounded-full ${folder.status === 'En cours' ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`}></span>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg divide-y divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-slate-900">
            <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <Tag className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                اسم المجلد
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100">{folder.name}</span>
            </div>

            {folder.description && (
              <div className="p-4 flex items-start justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  الوصف
                </span>
                <span className="text-slate-800 dark:text-slate-200 max-w-[360px] text-right font-medium leading-relaxed">{folder.description}</span>
              </div>
            )}

            <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <Folder className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                المستوى الهرمي
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {folder.parent ? 'مجلد فرعي' : 'مجلد رئيسي (جذر)'}
              </span>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                تاريخ الإنشاء
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">
                <bdi dir="rtl">{formatLongDate(folder.createdAt, 'ar')}</bdi>
              </span>
            </div>

            <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                وقت الإنشاء
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">
                <bdi dir="rtl">{formatDateTime(folder.createdAt, 'ar')}</bdi>
              </span>
            </div>

            {typeof folder.createdBy === 'object' && folder.createdBy?.username && (
              <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                  <User className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  أنشئ بواسطة
                </span>
                <span className="font-bold text-[#2c5282] dark:text-sky-300">{folder.createdBy.username}</span>
              </div>
            )}

            {typeof folder.department === 'object' && folder.department?.name && (
              <div className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-150">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  القسم الإداري
                </span>
                <span className="font-bold text-[#1a202c] dark:text-slate-100">{folder.department.name}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDetailsDialog;
