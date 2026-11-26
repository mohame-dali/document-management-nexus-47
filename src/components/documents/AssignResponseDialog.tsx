import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getOutgoingDocumentsList, addAnswer } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { Search, FileOutput, Calendar, Filter, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatLongDate } from '@/utils/formatDate';

interface AssignResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: IncomingDocument;
}

const AssignResponseDialog: React.FC<AssignResponseDialogProps> = ({
  open,
  onOpenChange,
  document
}) => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const listSeparator = t('documents.assignResponse.listSeparator');
  const queryClient = useQueryClient();
  const [selectedOutgoingDoc, setSelectedOutgoingDoc] = useState<string>('');
  const [searchYear, setSearchYear] = useState<string>(new Date().getFullYear().toString());
  const [serialNumberSearch, setSerialNumberSearch] = useState<string>('');

  // Fetch outgoing documents from the current user's active department with year filter
  const { data: outgoingDocuments, isLoading, refetch } = useQuery({
    queryKey: ['outgoingDocuments', currentUser?.activeDepartment?._id, searchYear],
    queryFn: () => getOutgoingDocumentsList({
      department: currentUser?.activeDepartment?._id,
      year: searchYear
    }),
    enabled: open && !!currentUser?.activeDepartment?._id && !!searchYear.trim() && /^\d{4}$/.test(searchYear),
  });

  const assignResponseMutation = useMutation({
    mutationFn: ({ documentId, outgoingDocumentId }: { documentId: string, outgoingDocumentId: string }) =>
      addAnswer(documentId, outgoingDocumentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocument'] });
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      toast.success(t('documents.assignResponse.toast.success'));
      onOpenChange(false);
      setSelectedOutgoingDoc('');
      setSerialNumberSearch('');
    },
    onError: (error: unknown) => {
      const errorMsg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(errorMsg || t('documents.assignResponse.toast.error'));
    }
  });

  const handleAssignResponse = () => {
    if (!selectedOutgoingDoc) {
      toast.error(t('documents.assignResponse.toast.selectPrompt'));
      return;
    }

    assignResponseMutation.mutate({
      documentId: document._id,
      outgoingDocumentId: selectedOutgoingDoc
    });
  };

  const handleYearChange = (value: string) => {
    // Allow only numeric input and limit to 4 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setSearchYear(numericValue);
    setSelectedOutgoingDoc('');
    setSerialNumberSearch('');
    
    // Auto-refetch when year is valid (4 digits)
    if (numericValue.length === 4) {
      setTimeout(() => refetch(), 100);
    }
  };

  const handleSerialSearch = () => {
    if (serialNumberSearch.trim()) {
      refetch();
    }
  };

  const handleClearSearch = () => {
    setSerialNumberSearch('');
    refetch();
  };

  // Filter documents based on serial number search and avoid circular references
  const filteredOutgoingDocs = outgoingDocuments?.filter((doc: OutgoingDocument) => {
    const matchesSerial = !serialNumberSearch.trim() || 
      doc.serialNumber.toString().includes(serialNumberSearch.trim());
    const notCircular = !doc.reference || doc.reference.toString() !== document._id;
    return matchesSerial && notCircular;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg">
        <DialogHeader className="p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 text-start">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-800/60 text-[#2c5282] dark:text-blue-300 rounded-lg shrink-0">
              <FileOutput className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] dark:text-blue-300">
                {t('documents.assignResponse.title')}
              </DialogTitle>
              <p className="text-base text-slate-600 dark:text-slate-300 mt-1">
                {t('documents.assignResponse.subtitle')}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/70 dark:bg-slate-950">
          {/* Search Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <Filter className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{t('documents.assignResponse.searchSection.title')}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                  <Calendar className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                  {t('documents.assignResponse.searchSection.yearLabel')}
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={t('documents.assignResponse.searchSection.yearPlaceholder')}
                    value={searchYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="h-12 text-center text-lg font-mono tabular-nums bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282]"
                    maxLength={4}
                  />
                  {searchYear && searchYear.length > 0 && searchYear.length < 4 && (
                    <div className="absolute -bottom-6 inset-x-0">
                      <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md text-center border border-amber-200/80 dark:border-amber-800/60">
                        {t('documents.assignResponse.searchSection.yearWarning')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-200">
                  <Search className="h-4 w-4 text-[#2c5282] dark:text-blue-300" />
                  {t('documents.assignResponse.searchSection.serialLabel')}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder={t('documents.assignResponse.searchSection.serialPlaceholder')}
                      value={serialNumberSearch}
                      onChange={(e) => setSerialNumberSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSerialSearch()}
                      className="h-12 text-base tabular-nums bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-[#2c5282]"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleSerialSearch}
                    disabled={!serialNumberSearch.trim()}
                    aria-label={t('documents.assignResponse.searchSection.searchButtonAria')}
                    className="h-12 px-5 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  {serialNumberSearch && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearSearch}
                      className="h-12 px-4 border-slate-300 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                    >
                      {t('documents.assignResponse.searchSection.clear')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-[#2c5282] dark:text-blue-300 border border-slate-200/80 dark:border-slate-700 tabular-nums">
                {t('documents.assignResponse.resultsSummary.year', { year: searchYear || t('documents.assignResponse.resultsSummary.unspecified') })}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 tabular-nums">
                {t('documents.assignResponse.resultsSummary.count', { count: filteredOutgoingDocs.length })}
              </Badge>
            </div>
            {selectedOutgoingDoc && (
              <div className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>{t('documents.assignResponse.resultsSummary.selected')}</span>
              </div>
            )}
          </div>

          {/* Document Selection */}
          <div className="space-y-3">
            <Label className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-[#2c5282] dark:text-blue-300" />
              {t('documents.assignResponse.selection.label')}
            </Label>
            
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-4 max-h-80 overflow-y-auto shadow-sm">
              {!searchYear.trim() ? (
                <div className="p-8 text-center bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/70 dark:border-blue-800/50">
                  <Calendar className="h-12 w-12 text-[#2c5282] dark:text-blue-300 mx-auto mb-3 opacity-70" />
                  <h3 className="text-base font-bold text-[#2c5282] dark:text-blue-300 mb-1">
                    {t('documents.assignResponse.emptyState.enterYearTitle')}
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-300">
                    {t('documents.assignResponse.emptyState.enterYearDesc')}
                  </p>
                </div>
              ) : searchYear.length < 4 ? (
                <div className="p-8 text-center bg-amber-50/70 dark:bg-amber-950/30 rounded-lg border border-amber-200/80 dark:border-amber-800/60">
                  <Calendar className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {t('documents.assignResponse.emptyState.completeYearTitle')}
                  </h3>
                  <p className="text-base text-slate-700 dark:text-slate-300">
                    {t('documents.assignResponse.emptyState.completeYearDesc')}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] dark:border-blue-400 mx-auto mb-3"></div>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">{t('documents.assignResponse.loading.searching')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{t('documents.assignResponse.loading.loadingDocs')}</p>
                </div>
              ) : filteredOutgoingDocs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/80 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <FileOutput className="h-12 w-12 text-slate-700 dark:text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {t('documents.assignResponse.emptyState.noMatchesTitle')}
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-300">
                    {serialNumberSearch ? 
                      t('documents.assignResponse.emptyState.noMatchesSerial', { serial: serialNumberSearch, year: searchYear }) :
                      t('documents.assignResponse.emptyState.noDocsYear', { year: searchYear })
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOutgoingDocs.map((doc: OutgoingDocument) => (
                    <div 
                      key={doc._id}
                      className={`cursor-pointer transition-colors duration-150 rounded-lg border p-4 min-h-[56px] ${
                        selectedOutgoingDoc === doc._id 
                          ? 'border-[#2c5282] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/40' 
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900'
                      }`}
                      onClick={() => setSelectedOutgoingDoc(doc._id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-bold tabular-nums bg-blue-50/90 dark:bg-blue-950/50 text-[#2c5282] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                              <bdi dir="ltr">#{doc.serialNumber}/{doc.year}</bdi>
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">
                              <bdi dir={language === 'fr' ? 'ltr' : 'rtl'}>{formatLongDate(doc.issueDate, language)}</bdi>
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-2 leading-relaxed">
                            {doc.subject}
                          </h4>
                          {doc.assignedTo && doc.assignedTo.length > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 mt-1">
                              <ArrowRight className="h-4 w-4 text-slate-700 dark:text-slate-300 rtl:rotate-180 ltr:rotate-0" />
                              <span>{t('documents.assignResponse.item.assignedTo', { departments: doc.assignedTo.join(listSeparator) })}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center pt-1">
                          <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                            selectedOutgoingDoc === doc._id 
                              ? 'bg-[#2c5282] border-[#2c5282]' 
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selectedOutgoingDoc === doc._id && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 flex-row-reverse justify-start gap-3">
          <Button
            onClick={handleAssignResponse}
            disabled={!selectedOutgoingDoc || assignResponseMutation.isPending}
            className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded-lg disabled:opacity-50"
          >
            {assignResponseMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>{t('documents.assignResponse.button.submitting')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>{t('documents.assignResponse.button.confirm')}</span>
              </div>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponseMutation.isPending}
            className="h-11 px-6 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-medium rounded-lg text-slate-700 dark:text-slate-200"
          >
            {t('documents.assignResponse.button.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponseDialog;
