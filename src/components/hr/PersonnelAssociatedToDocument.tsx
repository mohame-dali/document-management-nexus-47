import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  User,
  Briefcase,
  Calendar,
  ExternalLink,
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  CheckCircle2,
  X,
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
import { useLanguage } from '@/contexts/LanguageProvider';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { DocumentType, DocumentPersonnelAssociation, Personnel } from '@/types/hr';
import {
  getPersonnelDuDocument,
  deleteAssociation,
  associerDocument,
  getTypesAssociation,
  updateAssociation,
  PersonnelDocumentApiError,
  isForbiddenError,
} from '@/services/hr/personnelDocumentApi';
import { getPersonnelList } from '@/services/hr/personnelApi';
import { getOrganizationSettings } from '@/services/organizationSettingsService';
import { formatLongDate } from '@/utils/formatDate';
import { canLinkPersonnel, extractEntityId } from '@/utils/permissions';
import AssociationTypeBadge from './AssociationTypeBadge';

interface PersonnelAssociatedToDocumentProps {
  documentType: DocumentType;
  documentId: string;
  document?: IncomingDocument | OutgoingDocument | null;
}

export const PersonnelAssociatedToDocument: React.FC<PersonnelAssociatedToDocumentProps> = ({
  documentType,
  documentId,
  document: documentProp,
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: orgSettings } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: getOrganizationSettings,
    staleTime: Infinity,
    refetchInterval: false,
  });

  const rhDepartmentId = extractEntityId(orgSettings?.rhDepartmentId);
  const effectiveDocument = documentProp ?? (documentId ? { _id: documentId } : null);

  // Ergonomie uniquement : le backend demeure l'autorité de sécurité
  const canManage = canLinkPersonnel(currentUser, effectiveDocument, { rhDepartmentId });

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

  const isForbidden = isForbiddenError(error);

  const resolveMutationErrorMessage = (err: unknown, fallbackKey: string): string => {
    if (isForbiddenError(err)) {
      return t('documents.personnel.errors.forbidden');
    }
    if (err instanceof Error && err.message && !err.message.startsWith('Request failed with status code')) {
      return err.message;
    }
    return t(fallbackKey);
  };

  // Fetch association types list (only if user can manage)
  const { data: typesList = ['Stage', 'Formation', 'Diplôme', 'Autre'] } = useQuery({
    queryKey: ['hr', 'typesAssociation'],
    queryFn: getTypesAssociation,
    enabled: canManage,
    staleTime: 1000 * 60 * 10,
  });

  // Fetch personnel candidates for linking (only when permitted and dialog is open)
  const { data: candidatesData, isLoading: loadingCandidates } = useQuery({
    queryKey: ['hr', 'candidatesForDoc', personnelSearch],
    queryFn: () => getPersonnelList({ search: personnelSearch || undefined, limit: 15 }),
    enabled: isAddOpen && canManage,
    staleTime: 1000 * 30,
  });

  const candidates = candidatesData?.data || [];

  // Filter out already associated personnel and personnel outside permitted scope
  const alreadyAssociatedIds = new Set(
    associations.map((a) => (typeof a.personnel === 'object' ? a.personnel?._id : a.personnel))
  );
  const eligibleCandidates = candidates.filter(
    (p) =>
      !alreadyAssociatedIds.has(p._id) &&
      canLinkPersonnel(currentUser, effectiveDocument, { personnel: p, rhDepartmentId })
  );

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: selectedPersonnel, rhDepartmentId })) {
        throw new PersonnelDocumentApiError(t('documents.personnel.errors.forbidden'), 403);
      }
      if (!selectedPersonnel?._id) throw new Error(t('documents.personnel.validation.selectPersonnel'));
      if (!typeAssociation.trim()) throw new Error(t('documents.personnel.validation.selectType'));
      return await associerDocument(selectedPersonnel._id, {
        documentType,
        documentId,
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t('documents.personnel.toast.addSuccess'));
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setIsAddOpen(false);
      setSelectedPersonnel(null);
      setPersonnelSearch('');
      setTypeAssociation('');
      setCommentaire('');
    },
    onError: (err: unknown) => {
      toast.error(resolveMutationErrorMessage(err, 'documents.personnel.toast.addError'));
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (assoc: DocumentPersonnelAssociation) => {
      if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: assoc.personnel, rhDepartmentId })) {
        throw new PersonnelDocumentApiError(t('documents.personnel.errors.forbidden'), 403);
      }
      return await deleteAssociation(assoc._id);
    },
    onSuccess: () => {
      toast.success(t('documents.personnel.toast.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setDeletingAssoc(null);
    },
    onError: (err: unknown) => {
      toast.error(resolveMutationErrorMessage(err, 'documents.personnel.toast.deleteError'));
    },
  });

  // Edit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingAssoc?._id) return;
      if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: editingAssoc.personnel, rhDepartmentId })) {
        throw new PersonnelDocumentApiError(t('documents.personnel.errors.forbidden'), 403);
      }
      return await updateAssociation(editingAssoc._id, {
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim(),
      });
    },
    onSuccess: () => {
      toast.success(t('documents.personnel.toast.editSuccess'));
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel', documentType, documentId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments'] });
      setEditingAssoc(null);
    },
    onError: (err: unknown) => {
      toast.error(resolveMutationErrorMessage(err, 'documents.personnel.toast.editError'));
    },
  });

  // Defensive open/submit handlers
  const handleOpenAddDialog = () => {
    if (!canManage) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    setSelectedPersonnel(null);
    setPersonnelSearch('');
    setTypeAssociation('');
    setCommentaire('');
    setIsAddOpen(true);
  };

  const handleOpenEditDialog = (assoc: DocumentPersonnelAssociation) => {
    if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: assoc.personnel, rhDepartmentId })) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    setEditingAssoc(assoc);
    setTypeAssociation(assoc.typeAssociation);
    setCommentaire(assoc.commentaire || '');
  };

  const handleOpenDeleteDialog = (assoc: DocumentPersonnelAssociation) => {
    if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: assoc.personnel, rhDepartmentId })) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    setDeletingAssoc(assoc);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: selectedPersonnel, rhDepartmentId })) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    addMutation.mutate();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssoc || !canLinkPersonnel(currentUser, effectiveDocument, { personnel: editingAssoc.personnel, rhDepartmentId })) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    editMutation.mutate();
  };

  const handleDeleteConfirm = () => {
    if (!deletingAssoc?._id) return;
    if (!canLinkPersonnel(currentUser, effectiveDocument, { personnel: deletingAssoc.personnel, rhDepartmentId })) {
      toast.error(t('documents.personnel.errors.forbidden'));
      return;
    }
    deleteMutation.mutate(deletingAssoc);
  };

  const canRenderEditModal = Boolean(
    canManage &&
    editingAssoc &&
    canLinkPersonnel(currentUser, effectiveDocument, { personnel: editingAssoc.personnel, rhDepartmentId })
  );

  const canRenderDeleteModal = Boolean(
    canManage &&
    deletingAssoc &&
    canLinkPersonnel(currentUser, effectiveDocument, { personnel: deletingAssoc.personnel, rhDepartmentId })
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ebf4ff] dark:bg-blue-950/60 text-[#2c5282] dark:text-blue-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1a202c] dark:text-slate-100">
                {t('documents.personnel.title')}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-[#cbd5e1] dark:border-slate-700 tabular-nums">
                {associations.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('documents.personnel.subtitle')}
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={handleOpenAddDialog}
            className="h-11 px-4 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-none"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('documents.personnel.addBtn')}</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#2c5282] dark:text-blue-400" />
          <span className="text-sm">{t('documents.personnel.loading')}</span>
        </div>
      ) : isError && !isForbidden ? (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{resolveMutationErrorMessage(error, 'documents.personnel.loadError')}</span>
        </div>
      ) : associations.length === 0 ? (
        <div className="bg-[#f8fafc] dark:bg-slate-950/40 border border-dashed border-[#cbd5e1] dark:border-slate-700 rounded-lg p-6 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('documents.personnel.empty.title')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t('documents.personnel.empty.description')}
          </p>
          {canManage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAddDialog}
              className="mt-2 h-11 px-4 border-[#2c5282] dark:border-blue-500 text-[#2c5282] dark:text-blue-300 dark:bg-slate-800 hover:bg-[#ebf4ff] dark:hover:bg-slate-700 font-bold text-xs rounded-lg"
            >
              <UserPlus className="w-3.5 h-3.5 me-1" />
              <span>{t('documents.personnel.empty.action')}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {associations.map((assoc) => {
            const p = assoc.personnel;
            const personnelName = p ? `${p.nom || ''} ${p.prenom || ''}`.trim() : t('documents.personnel.unknownPersonnel');
            const canManageAssociation = canLinkPersonnel(currentUser, effectiveDocument, {
              personnel: p,
              rhDepartmentId,
            });

            return (
              <div
                key={assoc._id}
                className="bg-[#f8fafc] dark:bg-slate-800/50 border border-[#e2e8f0] dark:border-slate-700 hover:border-[#cbd5e1] dark:hover:border-slate-600 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors min-h-[64px]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/dashboard/hr/personnel/${p?._id}`}
                      className="font-bold text-base text-[#1a202c] dark:text-slate-100 hover:text-[#2c5282] dark:hover:text-blue-300 hover:underline flex items-center gap-1.5"
                    >
                      <User className="w-4 h-4 text-[#2c5282] dark:text-blue-400 shrink-0" />
                      <span>{personnelName}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>

                    <AssociationTypeBadge type={assoc.typeAssociation} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {p?.poste && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.poste}</span>
                      </span>
                    )}

                    {p?.cin && (
                      <span className="font-mono text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 tabular-nums">
                        {p.cin}
                      </span>
                    )}
                  </div>

                  {assoc.commentaire && (
                    <div className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{assoc.commentaire}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#e2e8f0] dark:border-slate-700 pt-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 tabular-nums">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{t('documents.personnel.associationDate', { date: formatLongDate(assoc.dateAssociation, 'ar') })}</span>
                  </span>

                  {canManageAssociation && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditDialog(assoc)}
                        aria-label={t('documents.personnel.editAria')}
                        className="h-9 w-9 text-slate-500 dark:text-slate-300 hover:text-[#2c5282] dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
                        title={t('documents.personnel.editAria')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDeleteDialog(assoc)}
                        aria-label={t('documents.personnel.deleteAria')}
                        className="h-9 w-9 text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        title={t('documents.personnel.deleteAria')}
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

      {/* Add Dialog (monté et ouvrable uniquement si autorisé) */}
      {canManage && (
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddOpen(false);
              return;
            }
            if (canManage) {
              setIsAddOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 text-start border border-[#e2e8f0] dark:border-slate-800 shadow-sm">
            <DialogHeader className="text-start space-y-1 border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <DialogTitle className="text-lg font-bold text-[#1a202c] dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2c5282] dark:text-blue-400" />
                <span>{t('documents.personnel.dialog.addTitle')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {t('documents.personnel.dialog.addDescription')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
              {/* Candidate Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  {t('documents.personnel.dialog.step1')} <span className="text-red-500">*</span>
                </Label>

                {selectedPersonnel ? (
                  <div className="bg-[#f0f9ff] dark:bg-blue-950/40 border border-[#bae6fd] dark:border-blue-800/70 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm text-[#0369a1] dark:text-blue-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{selectedPersonnel.nom} {selectedPersonnel.prenom}</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                        {selectedPersonnel.poste || t('documents.personnel.noPoste')} {selectedPersonnel.cin ? `• CIN: ${selectedPersonnel.cin}` : ''}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPersonnel(null)}
                      className="border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 h-10 px-3 text-xs rounded-lg"
                    >
                      <X className="w-3.5 h-3.5 me-1" />
                      {t('documents.personnel.dialog.changeCandidate')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 border border-[#e2e8f0] dark:border-slate-800 rounded-lg p-3 bg-[#f8fafc] dark:bg-slate-950/50">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
                      <Input
                        type="text"
                        value={personnelSearch}
                        onChange={(e) => setPersonnelSearch(e.target.value)}
                        placeholder={t('documents.personnel.dialog.searchPlaceholder')}
                        className="ps-9 h-11 bg-white dark:bg-slate-800 dark:text-slate-100 border-[#cbd5e1] dark:border-slate-700 text-sm rounded-lg"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 pt-1">
                      {loadingCandidates ? (
                        <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          {t('documents.personnel.dialog.loadingCandidates')}
                        </div>
                      ) : eligibleCandidates.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          {t('documents.personnel.dialog.noCandidatesFound')}
                        </div>
                      ) : (
                        eligibleCandidates.map((p) => (
                          <button
                            type="button"
                            key={p._id}
                            onClick={() => setSelectedPersonnel(p)}
                            className="w-full text-start p-2 rounded-lg bg-white dark:bg-slate-800/80 hover:bg-[#ebf4ff] dark:hover:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 hover:border-[#2c5282] dark:hover:border-blue-500 transition-colors flex items-center justify-between gap-2 group min-h-[48px]"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#2c5282] dark:group-hover:text-blue-300">
                                {p.nom} {p.prenom}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                {p.poste || t('documents.personnel.noPoste')} {p.cin ? `(${p.cin})` : ''}
                              </div>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-[#2c5282] group-hover:text-white">
                              {t('documents.personnel.dialog.selectCandidate')}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Association Type */}
              <div className="space-y-1.5 text-start">
                <Label htmlFor="doc-type-association" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('documents.personnel.dialog.step2')} <span className="text-red-500">*</span>
                </Label>
                <select
                  id="doc-type-association"
                  value={typeAssociation}
                  onChange={(e) => setTypeAssociation(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-[#cbd5e1] dark:border-slate-700 rounded-lg text-base text-[#1a202c] dark:text-slate-100 focus:outline-none focus:border-[#2c5282]"
                  required
                >
                  <option value="">{t('documents.personnel.dialog.selectTypePlaceholder')}</option>
                  {typesList.map((tVal) => (
                    <option key={tVal} value={tVal}>
                      {tVal}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment */}
              <div className="space-y-1.5 text-start">
                <Label htmlFor="doc-commentaire" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('documents.personnel.dialog.step3')}
                </Label>
                <Textarea
                  id="doc-commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder={t('documents.personnel.dialog.commentPlaceholder')}
                  rows={2}
                  className="bg-white dark:bg-slate-800 dark:text-slate-100 border-[#cbd5e1] dark:border-slate-700 text-sm rounded-lg"
                />
              </div>

              <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={addMutation.isPending || !selectedPersonnel || !typeAssociation}
                  className="h-11 px-5 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-sm rounded-lg shadow-none"
                >
                  {addMutation.isPending ? t('documents.personnel.dialog.submittingAdd') : t('documents.personnel.dialog.confirmAdd')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  className="h-11 px-4 border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm rounded-lg"
                >
                  {t('documents.personnel.dialog.cancel')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog (monté et ouvrable uniquement si autorisé) */}
      {canRenderEditModal && (
        <Dialog
          open={!!editingAssoc}
          onOpenChange={(open) => {
            if (!open) setEditingAssoc(null);
          }}
        >
          <DialogContent className="sm:max-w-[500px] p-6 bg-white dark:bg-slate-900 text-start border border-[#e2e8f0] dark:border-slate-800 shadow-sm">
            <DialogHeader className="text-start space-y-1 border-b border-[#e2e8f0] dark:border-slate-800 pb-3">
              <DialogTitle className="text-lg font-bold text-[#1a202c] dark:text-slate-100">
                {t('documents.personnel.dialog.editTitle')}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5 text-start">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('documents.personnel.dialog.editTypeLabel')} <span className="text-red-500">*</span>
                </Label>
                <select
                  value={typeAssociation}
                  onChange={(e) => setTypeAssociation(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-[#cbd5e1] dark:border-slate-700 rounded-lg text-base text-[#1a202c] dark:text-slate-100"
                  required
                >
                  <option value="">{t('documents.personnel.dialog.selectTypePlaceholder')}</option>
                  {typesList.map((tVal) => (
                    <option key={tVal} value={tVal}>
                      {tVal}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-start">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('documents.personnel.dialog.editCommentLabel')}
                </Label>
                <Textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  rows={3}
                  className="bg-white dark:bg-slate-800 dark:text-slate-100 border-[#cbd5e1] dark:border-slate-700 text-sm rounded-lg"
                />
              </div>

              <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="h-11 px-5 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-sm rounded-lg shadow-none"
                >
                  {editMutation.isPending ? t('documents.personnel.dialog.submittingEdit') : t('documents.personnel.dialog.confirmEdit')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAssoc(null)}
                  className="h-11 px-4 border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg"
                >
                  {t('documents.personnel.dialog.cancel')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Alert (monté et ouvrable uniquement si autorisé) */}
      {canRenderDeleteModal && (
        <AlertDialog
          open={!!deletingAssoc}
          onOpenChange={(open) => {
            if (!open) setDeletingAssoc(null);
          }}
        >
          <AlertDialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[500px] p-6 rounded-lg bg-white dark:bg-slate-900 text-start border border-[#e2e8f0] dark:border-slate-800 shadow-sm">
            <AlertDialogHeader className="text-start">
              <AlertDialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span>{t('documents.personnel.dialog.deleteConfirmTitle')}</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 pt-2">
                {t('documents.personnel.dialog.deleteConfirmDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-base px-5 h-11 rounded-lg"
              >
                {deleteMutation.isPending ? t('documents.personnel.dialog.deletingAction') : t('documents.personnel.dialog.confirmDelete')}
              </AlertDialogAction>
              <AlertDialogCancel
                disabled={deleteMutation.isPending}
                className="border-[#cbd5e1] dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-base px-5 h-11 rounded-lg"
              >
                {t('documents.personnel.dialog.back')}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default PersonnelAssociatedToDocument;
