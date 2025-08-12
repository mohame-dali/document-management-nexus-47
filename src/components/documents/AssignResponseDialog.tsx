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
import { getOutgoingDocuments, addAnswer } from '@/services/documentService';
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
    queryFn: () => getOutgoingDocuments({
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col" dir="rtl">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <FileOutput className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span>إضافة رد على الوثيقة</span>
              <p className="text-sm font-normal text-muted-foreground mt-1">
                اختر الوثيقة الصادرة المناسبة كرد على هذه الوثيقة
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {/* Search Controls */}
          <Card className="mb-6 border-2 border-dashed border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">فلترة البحث</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    السنة
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="أدخل السنة (مثال: 2025)"
                      value={searchYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="text-center text-lg font-mono bg-white border-2 focus:border-primary transition-colors"
                      maxLength={4}
                    />
                    {searchYear && searchYear.length > 0 && searchYear.length < 4 && (
                      <div className="absolute -bottom-6 left-0 right-0">
                        <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded text-center">
                          يجب أن تكون السنة مكونة من 4 أرقام
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Search className="h-4 w-4 text-primary" />
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
                        className="bg-white border-2 focus:border-primary transition-colors"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSerialSearch}
                      disabled={!serialNumberSearch.trim()}
                      className="px-4 border-2 hover:bg-primary/10 hover:border-primary"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    {serialNumberSearch && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearSearch}
                        className="px-4 border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                      >
                        مسح
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-4" />

          {/* Results Summary */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                السنة: {searchYear || 'غير محدد'}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                النتائج: {filteredOutgoingDocs.length} وثيقة
              </Badge>
            </div>
            {selectedOutgoingDoc && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>تم اختيار وثيقة</span>
              </div>
            )}
          </div>

          {/* Document Selection */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <FileOutput className="h-5 w-5 text-primary" />
              الوثيقة الصادرة كرد
            </Label>
            
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
              {!searchYear.trim() ? (
                <Card className="border-0 bg-blue-50">
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                      ابدأ بإدخال السنة
                    </h3>
                    <p className="text-sm text-blue-700">
                      يرجى إدخال السنة للبحث عن الوثائق المتاحة
                    </p>
                  </CardContent>
                </Card>
              ) : searchYear.length < 4 ? (
                <Card className="border-0 bg-amber-50">
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-amber-900 mb-2">
                      أكمل إدخال السنة
                    </h3>
                    <p className="text-sm text-amber-700">
                      يرجى إكمال إدخال السنة (4 أرقام) للبحث
                    </p>
                  </CardContent>
                </Card>
              ) : isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">جاري البحث...</p>
                  <p className="text-sm text-muted-foreground mt-2">يتم تحميل الوثائق المتاحة</p>
                </div>
              ) : filteredOutgoingDocs.length === 0 ? (
                <Card className="border-0 bg-gray-50">
                  <CardContent className="p-8 text-center">
                    <FileOutput className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      لا توجد وثائق متطابقة
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {serialNumberSearch ? 
                        `لم يتم العثور على وثائق تطابق الرقم التسلسلي "${serialNumberSearch}" في عام ${searchYear}` :
                        `لا توجد وثائق صادرة متاحة في عام ${searchYear}`
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredOutgoingDocs.map((doc: OutgoingDocument) => (
                    <Card 
                      key={doc._id}
                      className={`cursor-pointer transition-all duration-200 border-2 hover:shadow-md ${
                        selectedOutgoingDoc === doc._id 
                          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg' 
                          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedOutgoingDoc(doc._id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant="default" className="px-2 py-1 bg-primary/10 text-primary border-primary/20">
                                #{doc.serialNumber}/{doc.year}
                              </Badge>
                              <Badge variant="outline" className="px-2 py-1 text-xs">
                                {formatArabicDate(doc.issueDate)}
                              </Badge>
                            </div>
                            <h4 className="text-base font-medium line-clamp-2 text-gray-900 mb-2">
                              {doc.subject}
                            </h4>
                            {doc.assignedTo && doc.assignedTo.length > 0 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ArrowRight className="h-3 w-3" />
                                <span>موجه إلى: {doc.assignedTo.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedOutgoingDoc === doc._id 
                                ? 'bg-primary border-primary' 
                                : 'border-gray-300 hover:border-primary'
                            }`}>
                              {selectedOutgoingDoc === doc._id && (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignResponseMutation.isPending}
            className="px-6 border-2 hover:bg-gray-50"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAssignResponse}
            disabled={!selectedOutgoingDoc || assignResponseMutation.isPending}
            className="px-6 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {assignResponseMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>جاري التعيين...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>تعيين الرد</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignResponseDialog;
