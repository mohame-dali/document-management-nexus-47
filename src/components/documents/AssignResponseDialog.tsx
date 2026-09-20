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
import { IncomingDocument, OutgoingDocument } from '@/types';
import { Search, FileOutput, Calendar, Filter, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

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
      toast.success('Response assigned successfully');
      onOpenChange(false);
      setSelectedOutgoingDoc('');
      setSerialNumberSearch('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign response');
    }
  });

  const handleAssignResponse = () => {
    if (!selectedOutgoingDoc) {
      toast.error('Please select an outgoing document');
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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border border-[#e2e8f0] rounded shadow-xl" dir="rtl">
        <DialogHeader className="p-6 border-b border-[#e2e8f0] bg-[#f8fafc] text-right">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-[#2c5282]/10 text-[#2c5282] rounded shrink-0">
              <FileOutput className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282]">
                إضافة رد على الوثيقة
              </DialogTitle>
              <p className="text-base text-gray-600 mt-1">
                اختر الوثيقة الصادرة المناسبة كرد على هذه الوثيقة
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f7fafc]">
          {/* Search Controls */}
          <div className="bg-white border border-[#e2e8f0] rounded p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
              <Filter className="h-5 w-5 text-[#2c5282]" />
              <h3 className="font-bold text-base text-[#1a202c]">فلترة وبحث الوثائق الصادرة</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold text-gray-700">
                  <Calendar className="h-4 w-4 text-[#2c5282]" />
                  السنة
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="أدخل السنة (مثال: 2025)"
                    value={searchYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="h-12 text-center text-lg font-mono bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                    maxLength={4}
                  />
                  {searchYear && searchYear.length > 0 && searchYear.length < 4 && (
                    <div className="absolute -bottom-6 right-0 left-0">
                      <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded text-center border border-amber-200">
                        يجب أن تكون السنة مكونة من 4 أرقام
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-semibold text-gray-700">
                  <Search className="h-4 w-4 text-[#2c5282]" />
                  البحث بالرقم التسلسلي
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      placeholder="رقم تسلسلي..."
                      value={serialNumberSearch}
                      onChange={(e) => setSerialNumberSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSerialSearch()}
                      className="h-12 text-base bg-white border-[#cbd5e1] rounded focus:border-[#2c5282]"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleSerialSearch}
                    disabled={!serialNumberSearch.trim()}
                    aria-label="بحث بالرقم التسلسلي"
                    className="h-12 px-5 border-[#cbd5e1] hover:bg-gray-100 rounded text-gray-700"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  {serialNumberSearch && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearSearch}
                      className="h-12 px-4 border-[#cbd5e1] text-red-600 hover:bg-red-50 rounded"
                    >
                      مسح
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between p-4 bg-white border border-[#e2e8f0] rounded">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold rounded bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1]">
                السنة: {searchYear || 'غير محدد'}
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold rounded bg-white text-gray-700 border-[#cbd5e1]">
                النتائج: {filteredOutgoingDocs.length} وثيقة
              </Badge>
            </div>
            {selectedOutgoingDoc && (
              <div className="flex items-center gap-2 text-base font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span>تم اختيار الوثيقة</span>
              </div>
            )}
          </div>

          {/* Document Selection */}
          <div className="space-y-3">
            <Label className="text-base font-bold text-[#1a202c] flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-[#2c5282]" />
              الوثيقة الصادرة كـ رد
            </Label>
            
            <div className="bg-white border border-[#e2e8f0] rounded p-4 max-h-80 overflow-y-auto">
              {!searchYear.trim() ? (
                <div className="p-8 text-center bg-blue-50/50 rounded border border-blue-100">
                  <Calendar className="h-12 w-12 text-[#2c5282] mx-auto mb-3 opacity-60" />
                  <h3 className="text-base font-bold text-[#2c5282] mb-1">
                    ابدأ بإدخال السنة
                  </h3>
                  <p className="text-base text-gray-600">
                    يرجى إدخال السنة للبحث عن الوثائق المتاحة
                  </p>
                </div>
              ) : searchYear.length < 4 ? (
                <div className="p-8 text-center bg-amber-50 rounded border border-amber-200">
                  <Calendar className="h-12 w-12 text-amber-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#1a202c] mb-1">
                    أكمل إدخال السنة
                  </h3>
                  <p className="text-base text-gray-700">
                    يرجى إكمال إدخال السنة (4 أرقام) للبحث
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#2c5282] mx-auto mb-3"></div>
                  <p className="text-base font-bold text-[#1a202c]">جاري البحث...</p>
                  <p className="text-sm text-gray-500 mt-1">يتم تحميل الوثائق المتاحة</p>
                </div>
              ) : filteredOutgoingDocs.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded border border-gray-200">
                  <FileOutput className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-gray-800 mb-1">
                    لا توجد وثائق متطابقة
                  </h3>
                  <p className="text-base text-gray-600">
                    {serialNumberSearch ? 
                      `لم يتم العثور على وثائق تطابق الرقم التسلسلي "${serialNumberSearch}" في عام ${searchYear}` :
                      `لا توجد وثائق صادرة متاحة في عام ${searchYear}`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOutgoingDocs.map((doc: OutgoingDocument) => (
                    <div 
                      key={doc._id}
                      className={`cursor-pointer transition-colors duration-200 rounded border p-4 min-h-[56px] ${
                        selectedOutgoingDoc === doc._id 
                          ? 'border-[#2c5282] bg-blue-50/50' 
                          : 'border-[#e2e8f0] hover:border-[#cbd5e1] hover:bg-[#f8fafc] bg-white'
                      }`}
                      onClick={() => setSelectedOutgoingDoc(doc._id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded text-xs sm:text-sm font-bold bg-[#f1f5f9] text-[#2c5282] border border-[#cbd5e1]">
                              #{doc.serialNumber}/{doc.year}
                            </span>
                            <span className="text-sm text-gray-600">
                              {formatArabicDate(doc.issueDate)}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-[#1a202c] mb-1.5 line-clamp-2 leading-relaxed">
                            {doc.subject}
                          </h4>
                          {doc.assignedTo && doc.assignedTo.length > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <span>موجه إلى: {doc.assignedTo.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center pt-1">
                          <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                            selectedOutgoingDoc === doc._id 
                              ? 'bg-[#2c5282] border-[#2c5282]' 
                              : 'border-gray-300'
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

        <DialogFooter className="p-4 sm:p-6 border-t border-[#e2e8f0] bg-[#f8fafc] flex-row-reverse justify-start gap-3">
          <Button
            onClick={handleAssignResponse}
            disabled={!selectedOutgoingDoc || assignResponseMutation.isPending}
            className="h-11 px-7 bg-[#2c5282] hover:bg-[#234269] text-white text-base font-semibold rounded disabled:opacity-50"
          >
            {assignResponseMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>جاري التعيين...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>تعيين الرد</span>
              </div>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponseMutation.isPending}
            className="h-11 px-6 border-[#cbd5e1] hover:bg-gray-100 text-base font-medium rounded text-gray-700"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponseDialog;
