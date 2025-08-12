
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getOutgoingDocument } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, FileText, Loader2, Calendar, Building, User, Hash, Eye, FileOutput } from 'lucide-react';
import DocumentDetailCard from '@/components/documents/DocumentDetailCard';
import PDFViewer from '@/components/documents/PDFViewer';
import DocumentFolderDisplay from '@/components/documents/DocumentFolderDisplay';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { toast } from '@/components/ui/use-toast';

const ViewOutgoingDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['outgoingDocument', id],
    queryFn: () => getOutgoingDocument(id!),
    enabled: !!id,
    meta: {
      onSettled: (data, error) => {
        if (error) {
          toast({
            title: "Error loading document",
            description: "Could not load the requested document. Please try again.",
            variant: "destructive",
          });
          console.error("Error fetching outgoing document:", error);
        }
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600">Document not found</h2>
          <p className="text-gray-500 mb-4">The document you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/dashboard/outgoing-documents')}>
            Back to Outgoing Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100" dir="rtl">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard/outgoing-documents')}
                className="hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                رجوع
              </Button>
              <div className="h-8 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">تفاصيل الوثيقة الصادرة</h1>
                <p className="text-sm text-gray-500">عرض شامل لمحتوى الوثيقة وتفاصيلها</p>
              </div>
            </div>
            {(currentUser?.role === 'Admin' || currentUser?.role === 'AdminTuningDesk') && (
              <Button 
                onClick={() => navigate(`/dashboard/outgoing-documents/${id}/edit`)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                تعديل الوثيقة
              </Button>
            )}
          </div>
        </div>

        {/* Document Information Card */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-3 flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="font-cairo">{document.subject}</span>
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-700">#{document.serialNumber}</span>
                    <span className="text-gray-500">-</span>
                    <span className="text-gray-700">{document.year}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-full">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium block">تاريخ الإصدار</span>
                  <span className="text-sm font-semibold text-gray-900">{formatArabicDate(document.issueDate)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium block">المصدر</span>
                  <span className="text-sm font-semibold text-gray-900">{document.source?.name || 'غير محدد'}</span>
                </div>
              </div>

              {document.typeDocument && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">نوع الوثيقة</span>
                    <Badge variant="secondary" className="mt-1 bg-purple-100 text-purple-800">{document.typeDocument}</Badge>
                  </div>
                </div>
              )}
            </div>

            {document.assignedTo && document.assignedTo.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    موجه إلى
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.assignedTo.map((dept, index) => (
                      <Badge key={index} variant="outline" className="text-sm py-1 px-3 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {document.pourInfo && document.pourInfo.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-gray-600" />
                    للإطلاع
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.pourInfo.map((info, index) => (
                      <Badge key={index} variant="outline" className="text-sm py-1 px-3 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition-colors">
                        {info}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Document Folder Classification */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileOutput className="h-5 w-5 text-green-600" />
              </div>
              تصنيف الوثيقة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <DocumentFolderDisplay
              folder={document.folder}
              onFolderEdit={() => setIsFolderDialogOpen(true)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Content Preview Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Document Details */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-600" />
                </div>
                تفاصيل الوثيقة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocumentDetailCard document={document} type="outgoing" />
            </CardContent>
          </Card>

          {/* PDF Preview */}
          {document.scannedDocument && (
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Eye className="h-5 w-5 text-indigo-600" />
                  </div>
                  معاينة الوثيقة الصادرة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <PDFViewer documentPath={document.scannedDocument} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* No Documents Message */}
        {!document.scannedDocument && (
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد وثائق متاحة للمعاينة</h3>
                <p className="text-gray-500">لم يتم رفع أي وثائق مرفقة مع هذا المستند حتى الآن</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Folder Assignment Dialog */}
        {document && (
          <DocumentFolderDialog
            open={isFolderDialogOpen}
            onOpenChange={setIsFolderDialogOpen}
            document={document}
            documentType="outgoing"
          />
        )}
      </div>
    </div>
  );
};

export default ViewOutgoingDocument;
