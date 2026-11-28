import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useDirection } from '@/i18n/useDirection';
import {
  getTemplates,
  deleteTemplate,
  downloadTemplate,
  Template,
} from '@/services/templateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Download,
  Edit,
  Trash2,
  Plus,
  Search,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatLongDate } from '@/utils/formatDate';
import TemplateDialog from '@/components/templates/TemplateDialog';
import {
  filterTemplates,
  formatTemplateFileSize,
  getTemplateFileInfo,
} from '@/utils/organizationTemplatesUtils';

const TemplatesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { dir } = useDirection();
  const isFr = language === 'fr';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [extensionFilter, setExtensionFilter] = useState<string>('ALL');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(isFr ? 'Modèle supprimé avec succès' : 'تم حذف النموذج بنجاح');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        (isFr ? 'Échec de la suppression : ' : 'فشل في حذف النموذج: ') +
          (err.response?.data?.message || err.message || '')
      );
    },
  });

  const handleDownload = async (template: Template) => {
    try {
      await downloadTemplate(template._id, template.fileName);
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(isFr ? 'Téléchargement démarré' : 'تم تحميل النموذج بنجاح');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(
        (isFr ? 'Échec du téléchargement : ' : 'فشل في تحميل النموذج: ') +
          (err.response?.data?.message || err.message || '')
      );
    }
  };

  const handleDelete = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  // Match exact backend RBAC in backend/routes/templates.js (Admin, AdminTuningDesk)
  const canManageTemplates = ['Admin', 'AdminTuningDesk'].includes(currentUser?.role || '');

  const availableExtensions = useMemo(() => {
    const exts = new Set<string>();
    templates.forEach((tpl) => {
      const info = getTemplateFileInfo(tpl.fileName);
      if (info.ext && info.ext !== 'FILE') {
        exts.add(info.ext);
      }
    });
    return Array.from(exts).sort();
  }, [templates]);

  const filteredTemplates = useMemo(
    () => filterTemplates(templates, searchQuery, extensionFilter),
    [templates, searchQuery, extensionFilter]
  );

  const hasActiveFilters = searchQuery.trim().length > 0 || extensionFilter !== 'ALL';

  if (isLoading) {
    return (
      <div className="space-y-4" dir={dir}>
        <div className="h-11 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-lg p-10 text-center space-y-3"
        dir={dir}
      >
        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {isFr ? 'Impossible de charger les modèles' : 'تعذر تحميل النماذج'}
        </h3>
        <Button
          type="button"
          onClick={() => refetch()}
          className="h-9 px-4 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-md gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>{isFr ? 'Réessayer' : 'إعادة المحاولة'}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Action & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          {/* Instant search */}
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFr ? 'Rechercher un modèle...' : 'بحث في النماذج...'}
              aria-label={isFr ? 'Rechercher un modèle' : 'بحث في النماذج'}
              className="h-10 ps-9 pe-9 bg-slate-50/70 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={isFr ? 'Effacer la recherche' : 'مسح البحث'}
                className="absolute top-1/2 -translate-y-1/2 end-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-0.5 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Interactive File-Type Segmented Filter */}
          {availableExtensions.length > 0 && (
            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full"
              role="group"
              aria-label={isFr ? 'Filtrer par format' : 'تصفية حسب الصيغة'}
            >
              <button
                type="button"
                onClick={() => setExtensionFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  extensionFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isFr ? 'Tous' : 'الكل'}
              </button>
              {availableExtensions.map((ext) => (
                <button
                  key={ext}
                  type="button"
                  onClick={() => setExtensionFilter(ext)}
                  className={`px-3 py-1.5 text-xs font-semibold font-mono rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    extensionFilter === ext
                      ? 'bg-white dark:bg-slate-900 text-[#2c5282] dark:text-blue-300 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ext}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
            {filteredTemplates.length}{' '}
            {isFr
              ? filteredTemplates.length <= 1
                ? 'modèle'
                : 'modèles'
              : 'نموذج'}
          </span>

          {canManageTemplates && (
            <Button
              type="button"
              onClick={handleCreateNew}
              className="h-10 px-4 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-md text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>{isFr ? 'Importer un modèle' : 'رفع نموذج جديد'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Templates Card Grid or Empty State */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const fileInfo = getTemplateFileInfo(template.fileName);
            return (
              <article
                key={template._id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 hover:border-[#2c5282]/60 dark:hover:border-blue-500/60 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* File Type Badge + Quiet Unboxed Size & Downloads */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      dir="ltr"
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold tracking-tight ${fileInfo.badgeClass}`}
                    >
                      {fileInfo.label}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      <span dir="ltr">{formatTemplateFileSize(template.fileSize)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {template.downloads}{' '}
                        {isFr ? 'téléch.' : 'تحميل'}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 line-clamp-1">
                    {template.name}
                  </h3>

                  {/* Description */}
                  {template.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}

                  {/* Clean Unboxed Metadata */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <time className="tabular-nums" dateTime={template.createdAt}>
                      {formatLongDate(template.createdAt, language)}
                    </time>
                    {template.uploadedBy?.username && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[160px]">
                          {template.uploadedBy.username}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDownload(template)}
                    className="flex-1 h-10 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-md font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isFr ? 'Télécharger' : 'تحميل'}</span>
                  </Button>

                  {canManageTemplates && (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                        title={isFr ? 'Modifier' : 'تعديل'}
                        aria-label={isFr ? `Modifier ${template.name}` : `تعديل ${template.name}`}
                        className="h-10 w-10 shrink-0 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => handleDelete(template)}
                        title={isFr ? 'Supprimer' : 'حذف'}
                        aria-label={isFr ? `Supprimer ${template.name}` : `حذف ${template.name}`}
                        className="h-10 w-10 shrink-0 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-200 dark:hover:border-red-800 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Compact Actionable Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {hasActiveFilters
                ? isFr
                  ? 'Aucun modèle ne correspond à votre recherche'
                  : 'لا توجد نماذج مطابقة للبحث'
                : isFr
                  ? 'Aucun modèle disponible'
                  : 'لا توجد نماذج متاحة بعد'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              {hasActiveFilters
                ? isFr
                  ? 'Essayez un autre mot-clé ou réinitialisez le filtre de format.'
                  : 'جرّب كلمة بحث أخرى أو أعد ضبط التصفية.'
                : canManageTemplates
                  ? isFr
                    ? 'Ajoutez un premier modèle Word (.doc, .docx) pour le rendre accessible à tous les services.'
                    : 'ابدأ برفع أول نموذج رسمي ليتمكن الموظفون من تحميله واستخدامه.'
                  : isFr
                    ? 'Aucun modèle n’a encore été publié par le bureau d’ordre.'
                    : 'لم يتم نشر أي نماذج إدارية بعد.'}
            </p>
          </div>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setExtensionFilter('ALL');
              }}
              className="h-9 px-4 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md inline-flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              <span>{isFr ? 'Réinitialiser' : 'إعادة ضبط البحث'}</span>
            </Button>
          ) : (
            canManageTemplates && (
              <Button
                type="button"
                onClick={handleCreateNew}
                className="h-10 px-5 bg-[#2c5282] hover:bg-[#1e3a5f] text-white rounded-md text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>{isFr ? 'Importer le premier modèle' : 'رفع أول نموذج'}</span>
              </Button>
            )
          )}
        </div>
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['templates'] });
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              {isFr ? 'Confirmer la suppression' : 'تأكيد الحذف'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {isFr
                ? `Voulez-vous supprimer définitivement le modèle « ${templateToDelete?.name || ''} » ? Cette action est irréversible.`
                : `هل أنت متأكد من حذف النموذج "${templateToDelete?.name || ''}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <AlertDialogCancel className="h-10 px-5 rounded-md border-slate-300 dark:border-slate-700">
              {isFr ? 'Annuler' : 'إلغاء'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete._id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold h-10 px-6 rounded-md"
            >
              {deleteMutation.isPending
                ? isFr
                  ? 'Suppression...'
                  : 'جاري الحذف...'
                : isFr
                  ? 'Supprimer'
                  : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplatesPage;
