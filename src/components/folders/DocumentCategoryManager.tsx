import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Calendar,
  Inbox,
  Send,
  CheckCircle2,
  FolderPlus,
  Building,
  Check,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';
import { assignDocumentToFolder } from '@/services/folderService';
import {
  getIncomingDocumentsList,
  getOutgoingDocumentsList,
} from '@/services/documentService';
import CopyReferenceButton from '@/components/documents/CopyReferenceButton';
import { useAuth } from '@/contexts/AuthContext';
import { formatLongDate } from '@/utils/formatDate';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';

interface DocumentCategoryManagerProps {
  folders: Folder[];
  canManage: boolean;
  departmentId?: string;
  initialTargetFolderId?: string;
  onPreviewDocument?: (
    doc: IncomingDocument | OutgoingDocument,
    direction: 'incoming' | 'outgoing'
  ) => void;
}

const DocumentCategoryManager: React.FC<DocumentCategoryManagerProps> = ({
  folders,
  canManage,
  departmentId,
  initialTargetFolderId,
  onPreviewDocument,
}) => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFr = language === 'fr';
  const locale = isFr ? 'fr' : 'ar';

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string>(
    initialTargetFolderId || ''
  );

  useEffect(() => {
    if (initialTargetFolderId) {
      setSelectedTargetFolderId(initialTargetFolderId);
    }
  }, [initialTargetFolderId]);

  const targetDepartmentId = departmentId || currentUser?.activeDepartment?._id;

  const { data: incomingDocs, isLoading: isLoadingIncoming } = useQuery({
    queryKey: ['incomingDocuments', targetDepartmentId],
    queryFn: () => getIncomingDocumentsList({}),
    enabled: !!currentUser,
  });

  const { data: outgoingDocs, isLoading: isLoadingOutgoing } = useQuery({
    queryKey: ['outgoingDocuments', targetDepartmentId],
    queryFn: () => getOutgoingDocumentsList({}),
    enabled: !!currentUser,
  });

  const assignMutation = useMutation({
    mutationFn: ({
      documentId,
      folderId,
      type,
    }: {
      documentId: string;
      folderId: string | null;
      type: 'incoming' | 'outgoing';
    }) => assignDocumentToFolder(documentId, folderId, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folderDocuments'] });
      toast.success(
        variables.folderId
          ? isFr
            ? 'Document classé dans le dossier'
            : 'تم تصنيف المستند في المجلد بنجاح'
          : isFr
            ? 'Document retiré du dossier'
            : 'تمت إزالة المستند من المجلد'
      );
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || (isFr ? 'Échec du classement' : 'فشل في تصنيف المستند'));
    },
  });

  const handleDocumentAssign = (
    documentId: string,
    folderId: string | null,
    type: 'incoming' | 'outgoing'
  ) => {
    if (!canManage) return;
    assignMutation.mutate({ documentId, folderId, type });
  };

  const unclassifiedIncoming = (incomingDocs || []).filter((doc) => !doc.folder);
  const unclassifiedOutgoing = (outgoingDocs || []).filter((doc) => !doc.folder);

  const currentUnclassified =
    activeTab === 'incoming' ? unclassifiedIncoming : unclassifiedOutgoing;

  const filteredDocuments = currentUnclassified.filter((doc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      doc.subject?.toLowerCase().includes(term) ||
      doc.serialNumber?.toString().includes(term) ||
      ('source' in doc &&
        (doc as IncomingDocument).source?.toLowerCase().includes(term))
    );
  });

  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs"
      dir={dir}
    >
      {/* Navigation Bar */}
      <div className="p-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`h-10 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors duration-150 tabular-nums ${
              activeTab === 'incoming'
                ? 'bg-[#2c5282] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>
              {isFr ? 'Courriers entrants' : 'المراسلات الواردة'} ({unclassifiedIncoming.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outgoing')}
            className={`h-10 px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors duration-150 tabular-nums ${
              activeTab === 'outgoing'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>
              {isFr ? 'Courriers sortants' : 'المراسلات الصادرة'} ({unclassifiedOutgoing.length})
            </span>
          </button>
        </div>

        <div className="relative sm:w-64 w-full">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Input
            placeholder={
              isFr ? 'Rechercher un courrier...' : 'البحث في المراسلات غير المصنفة...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 ps-9 pe-3 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      </div>

      {/* Quick Target Folder Selector */}
      {canManage && folders.length > 0 && (
        <div className="p-3.5 sm:px-4 bg-amber-50/70 dark:bg-amber-950/30 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[#78350f] dark:text-amber-300">
            <FolderPlus className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold">
              {isFr
                ? 'Dossier cible pour classement rapide :'
                : 'تحديد مجلد الهدف للتصنيف السريع:'}
            </span>
          </div>

          <select
            value={selectedTargetFolderId}
            onChange={(e) => setSelectedTargetFolderId(e.target.value)}
            className="h-9 px-3 text-sm bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700/80 rounded-lg text-[#1a202c] dark:text-slate-100 font-medium sm:min-w-[260px] focus:outline-none focus:ring-2 focus:ring-[#2c5282]/30"
          >
            <option value="">
              {isFr
                ? '-- Choisir un dossier cible --'
                : '-- اختر مجلداً للتصنيف الفوري --'}
            </option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>
                {folder.parent ? `↳ ${folder.name}` : folder.name}{' '}
                {folder.status === 'Fermé' ? (isFr ? '(Fermé)' : '(مغلق)') : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* List of Unclassified Documents */}
      <div className="p-4">
        {isLoadingIncoming || isLoadingOutgoing ? (
          <div className="text-center py-14 text-slate-700 dark:text-slate-300 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] dark:border-sky-400 mx-auto" />
            <p className="text-sm font-medium">
              {isFr
                ? 'Chargement des courriers non classés...'
                : 'جاري تحميل المستندات غير المصنفة...'}
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-14 text-slate-700 dark:text-slate-300 space-y-2.5">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 opacity-90" />
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchTerm
                ? isFr
                  ? 'Aucun courrier correspondant'
                  : 'لا توجد مراسلات مطابقة لمعايير البحث'
                : isFr
                  ? 'Tous les courriers de cette section sont classés'
                  : 'ممتاز! جميع المراسلات في هذا القسم مصنفة في مجلدات'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pe-1 custom-scrollbar">
            {filteredDocuments.map((doc) => {
              const date =
                activeTab === 'incoming'
                  ? (doc as IncomingDocument).arrivalDate
                  : (doc as OutgoingDocument).issueDate;
              const isIncoming = activeTab === 'incoming';
              const refText = `${doc.serialNumber}/${doc.year}`;

              return (
                <div
                  key={doc._id}
                  className="p-3.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800 transition-colors duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${
                          isIncoming
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/70'
                        }`}
                      >
                        <bdi dir="ltr">#{refText}</bdi>
                      </span>

                      <CopyReferenceButton value={refText} />

                      <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-medium tabular-nums">
                        <Calendar className="h-3.5 w-3.5" />
                        <bdi dir={dir}>{formatLongDate(date, locale)}</bdi>
                      </span>

                      {'source' in doc && (doc as IncomingDocument).source && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <Building className="h-3.5 w-3.5 text-[#2c5282] dark:text-sky-400" />
                          {(doc as IncomingDocument).source}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm sm:text-base text-[#1a202c] dark:text-slate-100 line-clamp-1">
                      {doc.subject}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {doc.scannedDocument && onPreviewDocument && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onPreviewDocument(doc, activeTab)}
                        title={isFr ? 'Aperçu PDF' : 'معاينة PDF'}
                        className="h-9 w-9 p-0 text-[#2c5282] dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/mail/${activeTab}/${doc._id}`)
                      }
                      title={isFr ? 'Ouvrir les détails' : 'فتح التفاصيل'}
                      className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    {canManage && (
                      <>
                        {selectedTargetFolderId && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              handleDocumentAssign(
                                doc._id,
                                selectedTargetFolderId,
                                activeTab
                              )
                            }
                            disabled={assignMutation.isPending}
                            className="h-9 px-3 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-bold gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isFr ? 'Classer ici' : 'تصنيف في المحدد'}</span>
                          </Button>
                        )}

                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDocumentAssign(
                                doc._id,
                                e.target.value,
                                activeTab
                              );
                            }
                          }}
                          disabled={assignMutation.isPending}
                          className="h-9 px-2.5 text-xs font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-[#2c5282] focus:outline-none"
                        >
                          <option value="">
                            {isFr ? 'Classer dans...' : 'نقل إلى مجلد...'}
                          </option>
                          {folders.map((f) => (
                            <option key={f._id} value={f._id}>
                              {f.name}{' '}
                              {f.status === 'Fermé'
                                ? isFr
                                  ? '(Fermé)'
                                  : '(مغلق)'
                                : ''}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCategoryManager;
