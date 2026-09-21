import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  FilePlus, 
  Search, 
  FileInput, 
  FileOutput, 
  CheckCircle2, 
  X, 
  Loader2, 
  AlertCircle,
  Calendar,
  Hash
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { DocumentType, PopulatedDocument } from '@/types/hr';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { getIncomingDocuments, getOutgoingDocuments } from '@/services/documentService';
import { getTypesAssociation, associerDocument } from '@/services/hr/personnelDocumentApi';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

type SelectableDoc = (IncomingDocument | OutgoingDocument | PopulatedDocument) & {
  correspondenceNumber?: string;
  entryDate?: string;
  issueDate?: string;
  arrivalDate?: string;
};

interface AddPersonnelDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnelId: string;
  personnelName?: string;
  onSuccess?: () => void;
}

export const AddPersonnelDocumentDialog: React.FC<AddPersonnelDocumentDialogProps> = ({
  open,
  onOpenChange,
  personnelId,
  personnelName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [documentType, setDocumentType] = useState<DocumentType>('IncomingDocument');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<SelectableDoc | null>(null);
  const [typeAssociation, setTypeAssociation] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');

  // Réinitialiser la sélection si on change le type de document ou si le modal s'ouvre
  useEffect(() => {
    if (!open) {
      setSelectedDoc(null);
      setSearchTerm('');
      setTypeAssociation('');
      setCommentaire('');
    }
  }, [open]);

  // Types d'association autorisés
  const { data: typesList = ['Stage', 'Formation', 'Diplôme', 'Autre'] } = useQuery({
    queryKey: ['hr', 'typesAssociation'],
    queryFn: getTypesAssociation,
    staleTime: 1000 * 60 * 10,
  });

  // Liste des documents selon le type choisi
  const { data: incomingResult, isLoading: loadingIncoming } = useQuery({
    queryKey: ['incoming-documents-search', searchTerm],
    queryFn: () => getIncomingDocuments({ limit: 15 }),
    enabled: open && documentType === 'IncomingDocument',
    staleTime: 1000 * 30,
  });

  const { data: outgoingResult, isLoading: loadingOutgoing } = useQuery({
    queryKey: ['outgoing-documents-search', searchTerm],
    queryFn: () => getOutgoingDocuments({ limit: 15 }),
    enabled: open && documentType === 'OutgoingDocument',
    staleTime: 1000 * 30,
  });

  const docsList = documentType === 'IncomingDocument' 
    ? (incomingResult?.data || []) 
    : (outgoingResult?.data || []);

  const isLoadingDocs = documentType === 'IncomingDocument' ? loadingIncoming : loadingOutgoing;

  // Filtrage local par mot-clé / numéro de série / sujet
  const filteredDocs = (docsList as SelectableDoc[]).filter((doc) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const serial = String(doc.serialNumber || '').toLowerCase();
    const year = String(doc.year || '').toLowerCase();
    const subject = String(doc.subject || '').toLowerCase();
    const num = String(doc.correspondenceNumber || '').toLowerCase();
    return serial.includes(term) || year.includes(term) || subject.includes(term) || num.includes(term);
  });

  // Mutation pour créer l'association
  const associateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDoc?._id) {
        throw new Error('يرجى اختيار وثيقة للربط');
      }
      if (!typeAssociation.trim()) {
        throw new Error('يرجى اختيار طبيعة الوثيقة / نوع الربط');
      }
      return await associerDocument(personnelId, {
        documentType,
        documentId: selectedDoc._id,
        typeAssociation: typeAssociation.trim(),
        commentaire: commentaire.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('تم ربط الوثيقة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hr', 'personnelDocuments', personnelId] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'documentPersonnel'] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل في ربط الوثيقة');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) {
      toast.error('يرجى تحديد وثيقة من القائمة');
      return;
    }
    if (!typeAssociation) {
      toast.error('يرجى اختيار نوع الربط');
      return;
    }
    associateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-6 bg-white text-right border border-[#e2e8f0] shadow-sm" dir="rtl">
        <DialogHeader className="text-right space-y-1.5 border-b border-[#e2e8f0] pb-3">
          <DialogTitle className="text-lg font-bold text-[#1a202c] flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-[#2c5282]" />
            <span>ربط وثيقة بالملف الإداري للموظف</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {personnelName ? `ربط مستند أو مراسلة بملف: ${personnelName}` : 'ربط وثيقة رسمية (واردة أو صادرة) بهذا الموظف'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 1. Sélection du type de document (وارد / صادر) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 block">
              1. نوع المراسلة <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDocumentType('IncomingDocument');
                  setSelectedDoc(null);
                }}
                className={`h-12 px-4 rounded border flex items-center justify-center gap-2 font-bold text-base transition-colors ${
                  documentType === 'IncomingDocument'
                    ? 'border-[#2c5282] bg-[#ebf4ff] text-[#2c5282]'
                    : 'border-[#cbd5e1] bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileInput className="w-5 h-5" />
                <span>مراسلة واردة (Incoming)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocumentType('OutgoingDocument');
                  setSelectedDoc(null);
                }}
                className={`h-12 px-4 rounded border flex items-center justify-center gap-2 font-bold text-base transition-colors ${
                  documentType === 'OutgoingDocument'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                    : 'border-[#cbd5e1] bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileOutput className="w-5 h-5" />
                <span>مراسلة صادرة (Outgoing)</span>
              </button>
            </div>
          </div>

          {/* 2. Recherche et Sélection de la وثيقة */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700 block">
              2. اختيار الوثيقة <span className="text-red-500">*</span>
            </Label>

            {selectedDoc ? (
              <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0369a1]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {documentType === 'IncomingDocument' ? 'مراسلة واردة' : 'مراسلة صادرة'} رقم #{selectedDoc.serialNumber} لسنة {selectedDoc.year}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium">
                    {selectedDoc.subject || 'بدون موضوع'}
                  </p>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2">
                    {selectedDoc.entryDate || selectedDoc.issueDate || selectedDoc.arrivalDate ? (
                      <span>تاريخ: {formatArabicDate(selectedDoc.entryDate || selectedDoc.issueDate || selectedDoc.arrivalDate)}</span>
                    ) : null}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDoc(null)}
                  className="border-[#cbd5e1] text-red-600 hover:bg-red-50 h-9 px-2.5 text-xs font-semibold shrink-0"
                >
                  <X className="w-3.5 h-3.5 ml-1" />
                  تغيير الوثيقة
                </Button>
              </div>
            ) : (
              <div className="space-y-2 border border-[#e2e8f0] rounded p-3 bg-[#f8fafc]">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث برقم الترتيب أو السنة أو الموضوع..."
                    className="pr-9 h-11 bg-white border-[#cbd5e1] text-base"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                  {isLoadingDocs ? (
                    <div className="py-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2c5282]" />
                      <span>جاري تحميل الوثائق...</span>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      لا توجد وثائق مطابقة لخيارات البحث
                    </div>
                  ) : (
                    filteredDocs.map((doc) => (
                      <button
                        type="button"
                        key={doc._id}
                        onClick={() => setSelectedDoc(doc)}
                        className="w-full text-right p-2.5 rounded bg-white hover:bg-[#ebf4ff] border border-[#e2e8f0] hover:border-[#2c5282] transition-colors flex items-center justify-between gap-2 group min-h-[56px]"
                      >
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="text-sm font-bold text-gray-900 group-hover:text-[#2c5282] flex items-center gap-2">
                            <span>#{doc.serialNumber} / {doc.year}</span>
                            {doc.correspondenceNumber && (
                              <span className="text-xs text-gray-500 font-normal">
                                (مرجع: {doc.correspondenceNumber})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 truncate max-w-sm">
                            {doc.subject || 'بدون موضوع'}
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700 shrink-0 group-hover:bg-[#2c5282] group-hover:text-white transition-colors">
                          اختيار
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Type d'association */}
          <div className="space-y-1.5 text-right">
            <Label htmlFor="type-association-select" className="text-sm font-semibold text-gray-700">
              3. طبيعة الوثيقة / نوع الربط <span className="text-red-500">*</span>
            </Label>
            <select
              id="type-association-select"
              value={typeAssociation}
              onChange={(e) => setTypeAssociation(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#cbd5e1] rounded text-base text-[#1a202c] focus:outline-none focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282]"
              required
            >
              <option value="">-- اختر طبيعة الوثيقة (تدريب، دبلوم، قرار، إلخ) --</option>
              {typesList.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              مثال: تدريب (Stage)، تكوين (Formation)، شهادة (Diplôme)، قرار إداري، إلخ.
            </span>
          </div>

          {/* 4. Commentaire optionnel */}
          <div className="space-y-1.5 text-right">
            <Label htmlFor="association-comment" className="text-sm font-semibold text-gray-700">
              4. ملاحظات أو تفاصيل إضافية (اختياري)
            </Label>
            <Textarea
              id="association-comment"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="مثال: شهادة تدريبية مسلمة من المركز الوطني، مرجع المراسلة الإدارية..."
              rows={2}
              className="border-[#cbd5e1] focus-visible:ring-[#2c5282] text-base"
            />
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start pt-3 border-t border-[#e2e8f0]">
            <Button
              type="submit"
              disabled={associateMutation.isPending || !selectedDoc || !typeAssociation}
              className="h-11 px-6 bg-[#2c5282] hover:bg-[#1a365d] text-white font-bold text-base rounded shadow-none"
            >
              {associateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الربط...
                </span>
              ) : (
                'تأكيد الربط بالملف'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={associateMutation.isPending}
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 border-[#cbd5e1] text-gray-700 hover:bg-gray-50 text-base rounded"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPersonnelDocumentDialog;
