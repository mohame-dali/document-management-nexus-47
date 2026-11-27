import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CompactFolderPicker from '@/components/folders/CompactFolderPicker';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { extractDeptMeta, isBureauOrdreUserAccount } from '@/utils/departmentScope';
import { extractFolderDepartmentId } from '@/utils/recentFolders';

interface DocumentFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: IncomingDocument | OutgoingDocument | null;
  documents?: Array<IncomingDocument | OutgoingDocument>;
  documentType: 'incoming' | 'outgoing';
  readOnly?: boolean;
  onSuccess?: () => void;
}

const DocumentFolderDialog: React.FC<DocumentFolderDialogProps> = ({
  open,
  onOpenChange,
  document,
  documents,
  documentType,
  readOnly = false,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { language, dir } = useLanguage();
  const isFr = language === 'fr';

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const bureauOrdreDeptId = extractDeptMeta(orgSettings?.bureauOrdreDepartmentId).id;
  const isBureauOrdreUser = isBureauOrdreUserAccount(currentUser, bureauOrdreDeptId);

  const canOrganize =
    !readOnly &&
    !isBureauOrdreUser &&
    (currentUser?.role === 'AdminDepartment' || currentUser?.role === 'Admin');

  const isReadOnly = !canOrganize;

  const targetDocs = useMemo(() => {
    if (documents && documents.length > 0) return documents;
    return document ? [document] : [];
  }, [document, documents]);

  const isBatch = targetDocs.length > 1;
  const primaryDoc = targetDocs[0];

  const currentFolderId = useMemo(() => {
    if (isBatch || !primaryDoc?.folder) return null;
    if (typeof primaryDoc.folder === 'string') return primaryDoc.folder;
    if (typeof primaryDoc.folder === 'object' && primaryDoc.folder._id) {
      return primaryDoc.folder._id;
    }
    return null;
  }, [isBatch, primaryDoc]);

  // Infer department for Admin creating inline folders when no activeDepartment is set
  const inferredDepartmentId = useMemo(() => {
    if (!primaryDoc) return undefined;
    if (documentType === 'incoming') {
      const inc = primaryDoc as IncomingDocument;
      const firstAssigned = Array.isArray(inc.assignedTo) ? inc.assignedTo[0] : undefined;
      return extractFolderDepartmentId(firstAssigned?.id);
    }
    const out = primaryDoc as OutgoingDocument;
    return extractFolderDepartmentId(out.source?.id);
  }, [primaryDoc, documentType]);

  if (targetDocs.length === 0) return null;

  const typeLabel =
    documentType === 'incoming'
      ? isFr
        ? 'Entrant'
        : 'وارد'
      : isFr
        ? 'Sortant'
        : 'صادر';

  const modalTitle = isReadOnly
    ? isFr
      ? 'Classement du document'
      : 'عرض تصنيف المستند'
    : isBatch
      ? isFr
        ? `Classer ${targetDocs.length} documents`
        : `تصنيف ${targetDocs.length} مستندات في مجلد`
      : isFr
        ? 'Classer le document dans un dossier'
        : 'تنظيم المستند في مجلد';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="w-[95vw] sm:max-w-lg max-h-[88vh] overflow-hidden p-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg"
      >
        <DialogHeader className="px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 text-start space-y-2">
          <div className="flex items-center justify-between gap-2 pe-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 flex items-center justify-center shrink-0">
                {isReadOnly ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {modalTitle}
              </DialogTitle>
            </div>

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                documentType === 'incoming'
                  ? 'bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
              }`}
            >
              {typeLabel}
            </span>
          </div>

          <DialogDescription asChild>
            {isBatch ? (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug tabular-nums">
                {isFr
                  ? `${targetDocs.length} documents sélectionnés seront déplacés vers le dossier choisi.`
                  : `سيتم نقل ${targetDocs.length} مستندات محددة إلى المجلد المختار.`}
              </p>
            ) : (
              <div className="flex items-baseline gap-2 text-xs text-slate-700 dark:text-slate-200 min-w-0">
                {primaryDoc?.serialNumber && (
                  <span className="font-mono font-bold text-[#2c5282] dark:text-blue-300 tabular-nums shrink-0">
                    <bdi dir="ltr">
                      #{primaryDoc.serialNumber} / {primaryDoc.year}
                    </bdi>
                  </span>
                )}
                <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug min-w-0">
                  {primaryDoc?.subject}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <CompactFolderPicker
          open={open}
          documentIds={targetDocs.map((d) => d._id)}
          documentType={documentType}
          currentFolderId={currentFolderId}
          inferredDepartmentId={inferredDepartmentId}
          readOnly={isReadOnly}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DocumentFolderDialog;
