import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  FolderOpen, 
  FileText, 
  FileInput, 
  FileOutput, 
  Plus, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Calendar, 
  User, 
  AlertCircle,
  Loader2,
  Paperclip,
  MessageSquare
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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

import { PersonnelDocument } from '@/types/hr';
import { getDocumentsDuPersonnel, deleteAssociation } from '@/services/hr/personnelDocumentApi';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import AssociationTypeBadge from './AssociationTypeBadge';
import AddPersonnelDocumentDialog from './AddPersonnelDocumentDialog';
import UpdateAssociationDialog from './UpdateAssociationDialog';

interface PersonnelDocumentsListProps {
  personnelId: string;
  personnelName?: string;
  readOnly?: boolean;
}

export const PersonnelDocumentsList: React.FC<PersonnelDocumentsListProps> = ({
  personnelId,
  personnelName,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();

  // State for Add Dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // State for Edit Dialog
  const [editingAssociation, setEditingAssociation] = useState<PersonnelDocument | null>(null);

  // State for Delete Dialog
  const [deletingAssociation, setDeletingAssociation] = useState<PersonnelDocument | null>(null);

  // Fetch associated documents
  const {
    data: documents = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['hr', 'personnelDocuments', personnelId],
    queryFn: () => getDocumentsDuPersonnel(personnelId),
    enabled: !!personnelId,
  });

  // Mutation for deleting association
  const deleteMutation = useMutation({
    mutationFn: async (associationId: string) => {
      return await deleteAssociation(associationId);
    },
    onSuccess: () => {
      toast.success('تم إلغاء ربط الوثيقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel'] });
      setDeletingAssociation(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'فشل في إلغاء ربط الوثيقة');
    },
  });

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-5" dir="rtl">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#ebf4ff] text-[#2c5282]">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1a202c]">
                الوثائق الإدارية والمراسلات المرتبطة بالموظف
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1]">
                {documents.length} وثيقة
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              سجل الشواهد، التدريبات، القرارات والمراسلات الرسمية ذات الصلة بالملف الإداري
            </p>
          </div>
        </div>

        {!readOnly && (
          <Button
            type="button"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-11 px-4 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-sm rounded flex items-center gap-2 shadow-none"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وثيقة للملف</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-500 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#2c5282] mx-auto" />
          <p className="text-sm">جاري تحميل سجل وثائق الموظف...</p>
        </div>
      ) : isError ? (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error instanceof Error ? error.message : 'فشل في تحميل وثائق الموظف'}</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-8 text-center space-y-3">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">
            لا توجد وثائق أو مراسلات مرتبطة بهذا الموظف حالياً
          </h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            يمكنك ربط مراسلات واردة أو صادرة (شواهد، تكوينات، قرارات تعيين، شواهد عمل) بأرشيف الموظف لتوثيق مساره الإداري.
          </p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="mt-2 h-11 px-5 border-[#2c5282] text-[#2c5282] hover:bg-[#ebf4ff] font-bold text-sm rounded inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>ربط وثيقة الآن</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#e2e8f0] border border-[#e2e8f0] rounded overflow-hidden">
          {documents.map((assoc) => {
            const isIncoming = assoc.documentType === 'IncomingDocument';
            const doc = assoc.document;
            const docLink = isIncoming
              ? `/dashboard/documents/incoming/${assoc.documentId}`
              : `/dashboard/documents/outgoing/${assoc.documentId}`;

            return (
              <div
                key={assoc._id}
                className="p-4 sm:p-5 hover:bg-[#f8fafc] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-h-[64px]"
              >
                {/* Left side: Document Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Incoming / Outgoing */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                        isIncoming
                          ? 'bg-[#ebf4ff] text-[#2c5282] border border-[#bee3f8]'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isIncoming ? <FileInput className="w-3.5 h-3.5" /> : <FileOutput className="w-3.5 h-3.5" />}
                      <span>{isIncoming ? 'مراسلة واردة' : 'مراسلة صادرة'}</span>
                    </span>

                    {/* Serial & Year */}
                    <Link
                      to={docLink}
                      className="font-bold text-base text-[#1a202c] hover:text-[#2c5282] hover:underline flex items-center gap-1"
                    >
                      <span>#{doc?.serialNumber || '—'}</span>
                      <span className="text-gray-400">/</span>
                      <span>{doc?.year || '—'}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 inline" />
                    </Link>

                    {/* Type Association Badge (Stage, Formation, Diplome, etc.) */}
                    <AssociationTypeBadge type={assoc.typeAssociation} />
                  </div>

                  {/* Subject / Title */}
                  <div className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {doc?.subject || 'بدون موضوع'}
                  </div>

                  {/* Comment if exists */}
                  {assoc.commentaire && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2.5 py-1 max-w-xl">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{assoc.commentaire}</span>
                    </div>
                  )}

                  {/* Meta info: association date and who associated */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>تاريخ الربط: {formatArabicDate(assoc.dateAssociation || assoc.createdAt || '')}</span>
                    </span>

                    {assoc.associePar && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>بواسطة: {assoc.associePar.username}</span>
                      </span>
                    )}

                    {(doc?.entryDate || doc?.issueDate) && (
                      <span className="text-gray-400">
                        • تاريخ المراسلة: {formatArabicDate(doc.entryDate || doc.issueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link to={docLink}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 px-3 text-xs font-bold text-[#2c5282] border-[#cbd5e1] hover:bg-[#ebf4ff] rounded flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>عرض الوثيقة</span>
                    </Button>
                  </Link>

                  {!readOnly && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingAssociation(assoc)}
                        title="تعديل الربط"
                        className="h-10 w-10 text-gray-600 hover:text-[#2c5282] hover:bg-gray-100 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingAssociation(assoc)}
                        title="إلغاء الربط"
                        className="h-10 w-10 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <AddPersonnelDocumentDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        personnelId={personnelId}
        personnelName={personnelName}
      />

      {/* Edit Dialog */}
      <UpdateAssociationDialog
        open={!!editingAssociation}
        onOpenChange={(open) => {
          if (!open) setEditingAssociation(null);
        }}
        association={editingAssociation}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingAssociation}
        onOpenChange={(open) => {
          if (!open) setDeletingAssociation(null);
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[540px] p-6 rounded bg-white text-right border border-[#e2e8f0] shadow-xl" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>تأكيد إلغاء ربط الوثيقة</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 pt-2 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء ربط هذه الوثيقة بملف الموظف؟ لن يتم حذف الوثيقة الأصلية من الأرشيف، بل سيتم فقط فك ارتباطها بهذا الملف الإداري.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={() => {
                if (deletingAssociation?._id) {
                  deleteMutation.mutate(deletingAssociation._id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-base px-5 h-11 rounded"
            >
              {deleteMutation.isPending ? 'جاري الإلغاء...' : 'نعم، إلغاء الربط'}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-[#cbd5e1] text-gray-700 hover:bg-gray-50 text-base px-5 h-11 rounded"
            >
              تراجع
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonnelDocumentsList;
