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
  Tag,
} from 'lucide-react';
import { Folder as FolderType } from '@/types';
import { formatLongDate, formatDateTime } from '@/utils/formatDate';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

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
  documentCount = 0,
}) => {
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const locale = isFr ? 'fr' : 'ar';

  if (!folder) return null;

  const count = documentCount || folder.documentCount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] sm:max-w-[680px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0 overflow-hidden shadow-lg"
        dir={dir}
      >
        <DialogHeader className="p-5 sm:p-6 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-start">
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#2c5282] dark:text-sky-300">
            <div className="w-10 h-10 rounded-lg bg-[#2c5282]/10 dark:bg-sky-900/40 flex items-center justify-center text-[#2c5282] dark:text-sky-300 shrink-0">
              {folder.status === 'Fermé' ? (
                <Archive className="h-5 w-5" />
              ) : (
                <Folder className="h-5 w-5" />
              )}
            </div>
            <span className="truncate">
              {isFr ? `Détails du dossier : ${folder.name}` : `تفاصيل المجلد: ${folder.name}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 sm:p-6 space-y-5 text-sm sm:text-base">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4">
              <span className="text-slate-700 dark:text-slate-300 font-medium block mb-1 text-xs sm:text-sm">
                {isFr ? 'Documents classés' : 'المستندات المصنفة'}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">
                  {count}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
                  {isFr ? 'document(s)' : 'مستند'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4">
              <span className="text-slate-700 dark:text-slate-300 font-medium block mb-1 text-xs sm:text-sm">
                {isFr ? 'Statut du dossier' : 'حالة المجلد'}
              </span>
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm sm:text-base font-bold ${
                    folder.status === 'En cours'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {folder.status === 'En cours'
                    ? isFr
                      ? 'Actif (En cours)'
                      : 'نشط (مفتوح)'
                    : isFr
                      ? 'Archivé (Fermé)'
                      : 'مؤرشف (مغلق)'}
                </span>
                <span
                  className={`w-3 h-3 rounded-full ${
                    folder.status === 'En cours'
                      ? 'bg-emerald-500'
                      : 'bg-slate-400 dark:bg-slate-500'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-200/80 dark:border-slate-800 rounded-lg divide-y divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-slate-900">
            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                <Tag className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                {isFr ? 'Nom du dossier' : 'اسم المجلد'}
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100 text-end">
                {folder.name}
              </span>
            </div>

            {folder.description && (
              <div className="p-3.5 sm:p-4 flex items-start justify-between gap-4">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                  <FileText className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  {isFr ? 'Description' : 'الوصف'}
                </span>
                <span className="text-slate-800 dark:text-slate-200 max-w-[360px] text-end font-medium leading-relaxed">
                  {folder.description}
                </span>
              </div>
            )}

            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                <Folder className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                {isFr ? 'Niveau hiérarchique' : 'المستوى الهرمي'}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {folder.parent
                  ? isFr
                    ? 'Sous-dossier'
                    : 'مجلد فرعي'
                  : isFr
                    ? 'Dossier racine'
                    : 'مجلد رئيسي (جذر)'}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                <Calendar className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                {isFr ? 'Date de création' : 'تاريخ الإنشاء'}
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">
                <bdi dir={dir}>{formatLongDate(folder.createdAt, locale)}</bdi>
              </span>
            </div>

            <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                <Clock className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                {isFr ? 'Heure de création' : 'وقت الإنشاء'}
              </span>
              <span className="font-bold text-[#1a202c] dark:text-slate-100 tabular-nums">
                <bdi dir={dir}>{formatDateTime(folder.createdAt, locale)}</bdi>
              </span>
            </div>

            {typeof folder.createdBy === 'object' && folder.createdBy?.username && (
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                  <User className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  {isFr ? 'Créé par' : 'أنشئ بواسطة'}
                </span>
                <span className="font-bold text-[#2c5282] dark:text-sky-300">
                  {folder.createdBy.username}
                </span>
              </div>
            )}

            {typeof folder.department === 'object' && folder.department?.name && (
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-4">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium shrink-0">
                  <Building2 className="h-4 w-4 text-[#2c5282] dark:text-sky-400" />
                  {isFr ? 'Département' : 'القسم الإداري'}
                </span>
                <span className="font-bold text-[#1a202c] dark:text-slate-100">
                  {folder.department.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDetailsDialog;
