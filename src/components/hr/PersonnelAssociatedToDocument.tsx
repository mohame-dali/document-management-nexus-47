import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  User, 
  Briefcase, 
  Building2, 
  Calendar, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

import { useAuth } from '@/contexts/AuthContext';
import { DocumentType, DocumentPersonnelAssociation, Personnel } from '@/types/hr';
import { 
  getPersonnelDuDocument, 
  deleteAssociation, 
  associerDocument, 
  getTypesAssociation,
  updateAssociation 
} from '@/services/hr/personnelDocumentApi';
import { getPersonnelList } from '@/services/hr/personnelApi';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import AssociationTypeBadge from './AssociationTypeBadge';

interface PersonnelAssociatedToDocumentProps {
  documentType: DocumentType;
  documentId: string;
}

export const PersonnelAssociatedToDocument: React.FC<PersonnelAssociatedToDocumentProps> = ({
  documentType,
  documentId,
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const canManage = currentUser && ['SuperAdmin', 'Admin', 'AdminDepartment'].includes(currentUser.role);

  // States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAssoc, setEditingAssoc] = useState<DocumentPersonnelAssociation | null>(null);
  const [deletingAssoc, setDeletingAssoc] = useState<DocumentPersonnelAssociation | null>(null);

  // Add Dialog states
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [typeAssociation, setTypeAssociation] = useState('');
  const [commentaire, setCommentaire] = useState('');

  // Fetch associations for this document
  const {
    data: associations = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['hr', 'documentPersonnel', documentType, documentId],
    queryFn: () => getPersonnelDuDocument(documentType, documentId),
    enabled: !!documentId,
  });

  // Fetch association types list
  const { data: typesList = ['Stage', 'Formation', 'Diplôme', 'Autre'] } = useQuery({
    queryKey: ['hr', 'typesAssociation'],
    queryFn: getTypesAssociation,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch personnel candidates for linking
  const { data: candidatesData, isLoading: loadingCandidates } = useQuery({
    queryKey: ['hr', 'candidatesForDoc', personnelSearch],
    queryFn: () => getPersonnelList({ search: personnelSearch || undefined, limit: 15 }),
    enabled: isAddOpen,
    staleTime: 1000 * 30,
  });

  const candidates = candidatesData?.data || [];

  // Filter out already associated personnel
  const alreadyAssociatedIds = new Set(
    associations.map((a) => (typeof a.personnel === 'object' ? a.personnel?._id : a.personnel))
  );
  const eligibleCandidates = candidates.filter((p) => !alreadyAssociatedIds.has(p._id));

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPersonnel?._id) throw new Error('يرجى اختيار موظف للربط');
      if (!typeAssociation.trim()) throw new Error('يرجى تحديد طبيعة الوثيقة / نوع الربط');
      return await associerDocument(selectedPersonnel._id, {
        documentType,
        documentId,
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('تم ربط الموظف بالوثيقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setIsAddOpen(false);
      setSelectedPersonnel(null);
      setPersonnelSearch('');
      setTypeAssociation('');
      setCommentaire('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'فشل في ربط الموظف');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (associationId: string) => {
      return await deleteAssociation(associationId);
    },
    onSuccess: () => {
      toast.success('تم إلغاء ربط الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setDeletingAssoc(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'فشل في إلغاء ربط الموظف');
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingAssoc?._id) return;
      return await updateAssociation(editingAssoc._id, {
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim(),
      });
    },
    onSuccess: () => {
      toast.success('تم تعديل بيانات الربط بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setEditingAssoc(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'فشل في تعديل بيانات الربط');
    },
  });

  return (
    <div className="bg-white border border-[#e2e8f0] rounded p-6 shadow-sm space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#ebf4ff] text-[#2c5282]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1a202c]">
                الموظفون المرتبطون بهذه الوثيقة
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1]">
                {associations.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ملفات الموارد البشرية ذات الصلة بهذه المراسلة (شواهد، تكوينات، قرارات)
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => {
              setSelectedPersonnel(null);
              setPersonnelSearch('');
              setTypeAssociation('');
              setCommentaire('');
              setIsAddOpen(true);
            }}
            className="h-11 px-4 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-xs rounded flex items-center gap-1.5 shadow-none"
          >
            <UserPlus className="w-4 h-4" />
            <span>ربط موظف</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-6 text-center text-gray-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#2c5282]" />
          <span className="text-sm">جاري تحميل الموظفين المرتبطين...</span>
        </div>
      ) : isError ? (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error instanceof Error ? error.message : 'فشل في تحميل الموظفين المرتبطين'}</span>
        </div>
      ) : associations.length === 0 ? (
        <div className="bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded p-6 text-center space-y-2">
          <Users className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">
            لم يتم ربط أي موظف بهذه الوثيقة بعد
          </p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            يمكن ربط هذه المراسلة بملف موظف لتسجيل شهادة تدريب، دورة تكوينية، أو قرار إداري في سجله الوظيفي.
          </p>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 h-11 px-4 border-[#2c5282] text-[#2c5282] hover:bg-[#ebf4ff] font-bold text-xs rounded"
            >
              <UserPlus className="w-3.5 h-3.5 ml-1" />
              <span>ربط موظف الآن</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {associations.map((assoc) => {
            const p = assoc.personnel;
            const personnelName = p ? `${p.nom || ''} ${p.prenom || ''}`.trim() : 'موظف غير معرف';

            return (
              <div
                key={assoc._id}
                className="bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#cbd5e1] rounded p-4 flex flex-col justify-between gap-3 transition-colors min-h-[64px]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/dashboard/hr/personnel/${p?._id}`}
                      className="font-bold text-base text-[#1a202c] hover:text-[#2c5282] hover:underline flex items-center gap-1.5"
                    >
                      <User className="w-4 h-4 text-[#2c5282] shrink-0" />
                      <span>{personnelName}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </Link>

                    <AssociationTypeBadge type={assoc.typeAssociation} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    {p?.poste && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{p.poste}</span>
                      </span>
                    )}

                    {p?.cin && (
                      <span className="font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        {p.cin}
                      </span>
                    )}
                  </div>

                  {assoc.commentaire && (
                    <div className="flex items-start gap-1 text-xs text-gray-600 bg-white border border-gray-200 rounded p-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{assoc.commentaire}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-2 mt-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>تاريخ الربط: {formatArabicDate(assoc.dateAssociation)}</span>
                  </span>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAssoc(assoc);
                          setTypeAssociation(assoc.typeAssociation);
                          setCommentaire(assoc.commentaire || '');
                        }}
                        aria-label="تعديل الربط"
                        className="h-11 w-11 text-gray-500 hover:text-[#2c5282] rounded"
                        title="تعديل الربط"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingAssoc(assoc)}
                        aria-label="إلغاء الربط"
                        className="h-11 w-11 text-gray-400 hover:text-red-600 rounded"
                        title="إلغاء الربط"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-6 bg-white text-right border border-[#e2e8f0] shadow-xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 border-b border-[#e2e8f0] pb-3">
            <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2c5282]" />
              <span>ربط موظف بالوثيقة الحالية</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              اختر الموظف وحدد طبيعة المراسلة لإدراجها تلقائياً في ملفه الإداري
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {/* Candidate Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 block">
                1. اختيار الموظف <span className="text-red-500">*</span>
              </Label>

              {selectedPersonnel ? (
                <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-[#0369a1] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{selectedPersonnel.nom} {selectedPersonnel.prenom}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {selectedPersonnel.poste || 'بدون منصب'} {selectedPersonnel.cin ? `• CIN: ${selectedPersonnel.cin}` : ''}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPersonnel(null)}
                    className="border-[#cbd5e1] text-red-600 hover:bg-red-50 h-11 px-3 text-xs"
                  >
                    <X className="w-3.5 h-3.5 ml-1" />
                    تغيير
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 border border-[#e2e8f0] rounded p-3 bg-[#f8fafc]">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                    <Input
                      type="text"
                      value={personnelSearch}
                      onChange={(e) => setPersonnelSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو بطاقة الهوية CIN..."
                      className="pr-9 h-11 bg-white border-[#cbd5e1] text-sm"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pt-1">
                    {loadingCandidates ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        جاري تحميل قائمة الموظفين...
                      </div>
                    ) : eligibleCandidates.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-500">
                        لا يوجد موظف مطابق للبحث أو أن جميعهم مرتبطون بالوثيقة
                      </div>
                    ) : (
                      eligibleCandidates.map((p) => (
                        <button
                          type="button"
                          key={p._id}
                          onClick={() => setSelectedPersonnel(p)}
                          className="w-full text-right p-2 rounded bg-white hover:bg-[#ebf4ff] border border-[#e2e8f0] hover:border-[#2c5282] transition-colors flex items-center justify-between gap-2 group min-h-[48px]"
                        >
                          <div>
                            <div className="text-sm font-bold text-gray-900 group-hover:text-[#2c5282]">
                              {p.nom} {p.prenom}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p.poste || 'بدون منصب'} {p.cin ? `(${p.cin})` : ''}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 group-hover:bg-[#2c5282] group-hover:text-white">
                            تحديد
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Association Type */}
            <div className="space-y-1.5 text-right">
              <Label htmlFor="doc-type-association" className="text-sm font-semibold text-gray-700">
                2. طبيعة الوثيقة / نوع الربط <span className="text-red-500">*</span>
              </Label>
              <select
                id="doc-type-association"
                value={typeAssociation}
                onChange={(e) => setTypeAssociation(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-[#cbd5e1] rounded text-base text-[#1a202c] focus:outline-none focus:border-[#2c5282]"
                required
              >
                <option value="">-- اختر طبيعة الوثيقة --</option>
                {typesList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div className="space-y-1.5 text-right">
              <Label htmlFor="doc-commentaire" className="text-sm font-semibold text-gray-700">
                3. ملاحظات إضافية (اختياري)
              </Label>
              <Textarea
                id="doc-commentaire"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="تفاصيل تكميلية عن هذه الوثيقة..."
                rows={2}
                className="border-[#cbd5e1] text-sm"
              />
            </div>

            <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
              <Button
                type="submit"
                disabled={addMutation.isPending || !selectedPersonnel || !typeAssociation}
                className="h-11 px-5 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-sm rounded shadow-none"
              >
                {addMutation.isPending ? 'جاري الربط...' : 'تأكيد ربط الموظف'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="h-11 px-4 border-[#cbd5e1] text-gray-700 hover:bg-gray-50 text-sm rounded"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingAssoc}
        onOpenChange={(open) => {
          if (!open) setEditingAssoc(null);
        }}
      >
        <DialogContent className="sm:max-w-[500px] p-6 bg-white text-right border border-[#e2e8f0] shadow-xl" dir="rtl">
          <DialogHeader className="text-right space-y-1 border-b border-[#e2e8f0] pb-3">
            <DialogTitle className="text-lg font-bold text-[#1a202c]">
              تعديل بيانات الربط
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              editMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5 text-right">
              <Label className="text-sm font-semibold text-gray-700">
                طبيعة الوثيقة / نوع الربط <span className="text-red-500">*</span>
              </Label>
              <select
                value={typeAssociation}
                onChange={(e) => setTypeAssociation(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-[#cbd5e1] rounded text-base text-[#1a202c]"
                required
              >
                <option value="">-- اختر طبيعة الوثيقة --</option>
                {typesList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 text-right">
              <Label className="text-sm font-semibold text-gray-700">
                ملاحظات أو تفاصيل إضافية
              </Label>
              <Textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                className="border-[#cbd5e1] text-sm"
              />
            </div>

            <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
              <Button
                type="submit"
                disabled={editMutation.isPending}
                className="h-11 px-5 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-sm rounded shadow-none"
              >
                {editMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAssoc(null)}
                className="h-11 px-4 border-[#cbd5e1] text-gray-700 text-sm rounded"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!deletingAssoc}
        onOpenChange={(open) => {
          if (!open) setDeletingAssoc(null);
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[500px] p-6 rounded bg-white text-right border border-[#e2e8f0] shadow-xl" dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <span>تأكيد فك ارتباط الموظف بهذه الوثيقة</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600 pt-2">
              هل أنت متأكد من رغبتك في إزالة هذا الموظف من سجل الوثيقة؟ لن يتم حذف أي بيانات أو وثائق من المنظومة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
            <AlertDialogAction
              onClick={() => {
                if (deletingAssoc?._id) deleteMutation.mutate(deletingAssoc._id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-base px-5 h-11 rounded"
            >
              {deleteMutation.isPending ? 'جاري الإلغاء...' : 'نعم، إزالة الارتباط'}
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

export default PersonnelAssociatedToDocument;
