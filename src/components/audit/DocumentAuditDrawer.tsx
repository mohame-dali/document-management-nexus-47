import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileInput,
  FileOutput,
  FilePlus2,
  FolderInput,
  FolderOutput,
  History,
  Link2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLog } from '@/services/auditService';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

export interface LifecycleFallbackStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string | Date;
  variant?: 'default' | 'success' | 'warning';
}

interface DocumentAuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditTimeline: AuditLog[];
  isLoading?: boolean;
  documentReference: string;
  documentSubject?: string;
  lifecycleSteps?: LifecycleFallbackStep[];
}

interface ActionMeta {
  labelKey: string;
  fallbackAr: string;
  fallbackFr: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotClass: string;
  isViewOnly: boolean;
}

const ACTION_META_MAP: Record<string, ActionMeta> = {
  document_create: {
    labelKey: 'documents.auditDrawer.actions.document_create',
    fallbackAr: 'إنشاء المراسلة',
    fallbackFr: 'Création du courrier',
    icon: FilePlus2,
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
    isViewOnly: false,
  },
  document_update: {
    labelKey: 'documents.auditDrawer.actions.document_update',
    fallbackAr: 'تحديث البيانات',
    fallbackFr: 'Mise à jour des données',
    icon: Edit3,
    badgeClass:
      'bg-blue-50 text-[#2c5282] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/70',
    dotClass: 'bg-[#2c5282] dark:bg-blue-400',
    isViewOnly: false,
  },
  document_assign: {
    labelKey: 'documents.auditDrawer.actions.document_assign',
    fallbackAr: 'إحالة / توجيه',
    fallbackFr: 'Affectation / Orientation',
    icon: UserCheck,
    badgeClass:
      'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/70',
    dotClass: 'bg-purple-600 dark:bg-purple-400',
    isViewOnly: false,
  },
  document_archive: {
    labelKey: 'documents.auditDrawer.actions.document_archive',
    fallbackAr: 'أرشفة المراسلة',
    fallbackFr: 'Archivage du courrier',
    icon: Archive,
    badgeClass:
      'bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    dotClass: 'bg-amber-600 dark:bg-amber-400',
    isViewOnly: false,
  },
  document_moved_to_folder: {
    labelKey: 'documents.auditDrawer.actions.document_moved_to_folder',
    fallbackAr: 'تصنيف في مجلد',
    fallbackFr: 'Classé dans un dossier',
    icon: FolderInput,
    badgeClass:
      'bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/70',
    dotClass: 'bg-indigo-600 dark:bg-indigo-400',
    isViewOnly: false,
  },
  document_removed_from_folder: {
    labelKey: 'documents.auditDrawer.actions.document_removed_from_folder',
    fallbackAr: 'إزالة من المجلد',
    fallbackFr: 'Retiré du dossier',
    icon: FolderOutput,
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/70',
    dotClass: 'bg-orange-600 dark:bg-orange-400',
    isViewOnly: false,
  },
  document_answer_linked: {
    labelKey: 'documents.auditDrawer.actions.document_answer_linked',
    fallbackAr: 'ربط رد رسمي',
    fallbackFr: 'Réponse officielle associée',
    icon: Link2,
    badgeClass:
      'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/70',
    dotClass: 'bg-teal-600 dark:bg-teal-400',
    isViewOnly: false,
  },
  document_scan: {
    labelKey: 'documents.auditDrawer.actions.document_scan',
    fallbackAr: 'مسح ضوئي وإرفاق',
    fallbackFr: 'Numérisation et pièce jointe',
    icon: ScanLine,
    badgeClass:
      'bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70',
    dotClass: 'bg-sky-600 dark:bg-sky-400',
    isViewOnly: false,
  },
  document_delete: {
    labelKey: 'documents.auditDrawer.actions.document_delete',
    fallbackAr: 'نقل إلى سلة المهملات',
    fallbackFr: 'Mise à la corbeille',
    icon: Trash2,
    badgeClass:
      'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70',
    dotClass: 'bg-red-600 dark:bg-red-400',
    isViewOnly: false,
  },
  document_restore: {
    labelKey: 'documents.auditDrawer.actions.document_restore',
    fallbackAr: 'استرجاع من المهملات',
    fallbackFr: 'Restauré depuis la corbeille',
    icon: RotateCcw,
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
    isViewOnly: false,
  },
  PERMANENT_DELETE: {
    labelKey: 'documents.auditDrawer.actions.PERMANENT_DELETE',
    fallbackAr: 'حذف نهائي',
    fallbackFr: 'Suppression définitive',
    icon: Trash2,
    badgeClass:
      'bg-red-100 text-red-800 border-red-300/80 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/80',
    dotClass: 'bg-red-700 dark:bg-red-400',
    isViewOnly: false,
  },
  document_download: {
    labelKey: 'documents.auditDrawer.actions.document_download',
    fallbackAr: 'تحميل نسخة PDF',
    fallbackFr: 'Téléchargement du PDF',
    icon: Download,
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-500 dark:bg-slate-400',
    isViewOnly: false,
  },
  document_view: {
    labelKey: 'documents.auditDrawer.actions.document_view',
    fallbackAr: 'معاينة المراسلة',
    fallbackFr: 'Consultation du courrier',
    icon: Eye,
    badgeClass:
      'bg-slate-100/90 text-slate-600 border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400 dark:bg-slate-500',
    isViewOnly: true,
  },
};

export const DocumentAuditDrawer: React.FC<DocumentAuditDrawerProps> = ({
  open,
  onOpenChange,
  auditTimeline,
  isLoading = false,
  documentReference,
  documentSubject,
  lifecycleSteps = [],
}) => {
  const { t, language } = useLanguage();
  const { isRTL, dir } = useDirection();
  const isFr = language === 'fr';
  const dateLang = isFr ? 'fr' : 'ar';
  const dateDir = isFr ? 'ltr' : 'rtl';

  const [filterMode, setFilterMode] = useState<'admin' | 'all'>('admin');

  const isViewAction = (action: string) => action === 'document_view';

  const adminLogs = useMemo(
    () => auditTimeline.filter((item) => !isViewAction(item.action)),
    [auditTimeline]
  );

  const visibleLogs = filterMode === 'admin' ? adminLogs : auditTimeline;

  const getActionMeta = (action: string) => {
    const mapped = ACTION_META_MAP[action];
    if (mapped) {
      const translated = t(mapped.labelKey);
      const label =
        translated && translated !== mapped.labelKey
          ? translated
          : isFr
            ? mapped.fallbackFr
            : mapped.fallbackAr;
      return { ...mapped, label };
    }

    return {
      labelKey: '',
      fallbackAr: action.replace(/_/g, ' '),
      fallbackFr: action.replace(/_/g, ' '),
      label: action ? action.replace(/_/g, ' ') : t('documents.auditDrawer.fallbackAction'),
      icon: ShieldCheck,
      badgeClass:
        'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      dotClass: 'bg-[#2c5282] dark:bg-blue-400',
      isViewOnly: false,
    };
  };

  const renderDetailLine = (item: AuditLog) => {
    if (!item.details || typeof item.details !== 'object') return null;
    const details = item.details as Record<string, unknown>;
    const folderName = details.folderName ? String(details.folderName) : null;
    const responsible = details.responsibleUsername ? String(details.responsibleUsername) : null;
    const answerSerial = details.answerSerialNumber ? String(details.answerSerialNumber) : null;

    const parts: string[] = [];
    if (folderName) {
      parts.push(isFr ? `Dossier : ${folderName}` : `المجلد: ${folderName}`);
    }
    if (responsible) {
      parts.push(isFr ? `Responsable : ${responsible}` : `المسؤول: ${responsible}`);
    }
    if (answerSerial) {
      parts.push(isFr ? `Réponse : #${answerSerial}` : `الرد: #${answerSerial}`);
    }

    if (parts.length === 0) return null;

    return (
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
        {parts.join(' · ')}
      </p>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? 'left' : 'right'}
        dir={dir}
        className="w-[95vw] sm:max-w-lg p-0 flex flex-col bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xl"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 text-start shrink-0 space-y-2">
          <div className="flex items-center gap-2.5 pe-8">
            <div className="w-9 h-9 rounded-lg bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {t('documents.auditDrawer.title')}
              </SheetTitle>
              <SheetDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#2c5282] dark:text-blue-300 tabular-nums">
                  <bdi dir="ltr">{documentReference}</bdi>
                </span>
                {documentSubject && (
                  <span className="truncate max-w-[260px]" title={documentSubject}>
                    · {documentSubject}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Segmented Filter Pill */}
          <div
            role="tablist"
            aria-label={t('documents.auditDrawer.filterAria')}
            className="grid grid-cols-2 p-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'admin'}
              onClick={() => setFilterMode('admin')}
              className={cn(
                'h-8 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
                filterMode === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>{t('documents.auditDrawer.filterAdminOnly')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 tabular-nums">
                {adminLogs.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'all'}
              onClick={() => setFilterMode('all')}
              className={cn(
                'h-8 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span>{t('documents.auditDrawer.filterAll')}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 tabular-nums">
                {auditTimeline.length}
              </span>
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 px-5 py-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-28 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-44" />
                </div>
              ))}
            </div>
          ) : visibleLogs.length > 0 ? (
            <div className="relative border-s border-slate-200 dark:border-slate-700 ps-5 ms-2.5 space-y-2.5 pb-4">
              {visibleLogs.map((item, index) => {
                const meta = getActionMeta(item.action);
                const ActionIcon = meta.icon;

                return (
                  <div key={item._id || index} className="relative">
                    <span
                      className={cn(
                        'absolute -start-[25px] top-3.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900',
                        meta.dotClass
                      )}
                    />
                    <div
                      className={cn(
                        'rounded-lg border py-2.5 px-3 transition-colors',
                        meta.isViewOnly
                          ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-800'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 shadow-2xs'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border',
                            meta.badgeClass
                          )}
                        >
                          <ActionIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>

                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium tabular-nums flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0 opacity-75" />
                          <bdi dir={dateDir}>{formatDateTime(item.createdAt, dateLang)}</bdi>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5">
                        {t('documents.auditDrawer.performedBy')}{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.userDetails?.username || t('documents.auditDrawer.systemUser')}
                        </span>
                      </p>

                      {renderDetailLine(item)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filterMode === 'admin' && auditTimeline.length > 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-6 text-center space-y-3 my-4">
              <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300">
                <Eye className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('documents.auditDrawer.onlyViewsTitle')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('documents.auditDrawer.onlyViewsDesc', { count: auditTimeline.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#2c5282] hover:bg-[#234269] text-white transition-colors"
              >
                {t('documents.auditDrawer.showAllButton')}
              </button>
            </div>
          ) : lifecycleSteps.length > 0 ? (
            <div className="space-y-3 pb-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t('documents.auditDrawer.lifecycleFallbackHeading')}
              </p>
              <div className="relative border-s border-slate-200 dark:border-slate-700 ps-5 ms-2.5 space-y-2.5">
                {lifecycleSteps.map((step) => (
                  <div key={step.id} className="relative">
                    <span
                      className={cn(
                        'absolute -start-[25px] top-3.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900',
                        step.variant === 'success'
                          ? 'bg-emerald-600'
                          : step.variant === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-[#2c5282]'
                      )}
                    />
                    <div
                      className={cn(
                        'rounded-lg border py-2.5 px-3 space-y-1',
                        step.variant === 'success'
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
                          : step.variant === 'warning'
                            ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/60'
                            : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2c5282] dark:text-blue-300 shrink-0" />
                          <span>{step.title}</span>
                        </span>
                        {step.timestamp && (
                          <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                            <bdi dir={dateDir}>{formatDateTime(step.timestamp, dateLang)}</bdi>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-8 text-center space-y-2 my-4">
              <History className="h-8 w-8 mx-auto text-slate-500 dark:text-slate-400" />
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('documents.auditDrawer.emptyTitle')}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('documents.auditDrawer.emptyDesc')}
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default DocumentAuditDrawer;
