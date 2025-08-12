
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getIncomingDocument, getOutgoingDocument } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, FileText, Loader2, Eye, FileOutput, Activity, Calendar, User, Building, Hash, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DocumentDetailCard from '@/components/documents/DocumentDetailCard';
import PDFViewer from '@/components/documents/PDFViewer';
import DocumentFolderDisplay from '@/components/documents/DocumentFolderDisplay';
import DocumentFolderDialog from '@/components/documents/DocumentFolderDialog';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

const ViewIncomingDocument = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ['incomingDocument', id],
    queryFn: () => getIncomingDocument(id!),
    enabled: !!id,
  });

  // Fetch the answer document if it exists
  const { data: answerDocument, isLoading: answerLoading } = useQuery({
    queryKey: ['outgoingDocument', document?.answer],
    queryFn: () => getOutgoingDocument(document?.answer as string),
    enabled: !!document?.answer,
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
          <Button onClick={() => navigate('/dashboard/incoming-documents')}>
            Back to Incoming Documents
          </Button>
        </div>
      </div>
    );
  }

  // Check if we have both documents for dual preview
  const hasDualPreview = document.scannedDocument && answerDocument?.scannedDocument;

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
                onClick={() => navigate('/dashboard/incoming-documents')}
                className="hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                رجوع
              </Button>
              <div className="h-8 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">تفاصيل الوثيقة الواردة</h1>
                <p className="text-sm text-gray-500">عرض شامل لمحتوى الوثيقة وتفاصيلها</p>
              </div>
            </div>
            {(currentUser?.role === 'Admin' || currentUser?.role === 'AdminTuningDesk') && (
              <Button 
                onClick={() => navigate(`/dashboard/incoming-documents/${id}/edit`)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                تعديل الوثيقة
              </Button>
            )}
          </div>
        </div>

        {/* Document Information Card */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-3 flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
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
                  {document.answer && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
                      <CheckCircle className="h-3 w-3 ml-1" />
                      تم الرد عليها
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium block">تاريخ الوصول</span>
                  <span className="text-sm font-semibold text-gray-900">{formatArabicDate(document.arrivalDate)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Building className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium block">المصدر</span>
                  <span className="text-sm font-semibold text-gray-900">{document.source || 'غير محدد'}</span>
                </div>
              </div>

              {document.responsibleUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-indigo-100 rounded-full">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">المسؤول</span>
                    <span className="text-sm font-semibold text-gray-900">{typeof document.responsibleUser === 'object' ? document.responsibleUser.username : document.responsibleUser}</span>
                  </div>
                </div>
              )}

              {document.activity && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Activity className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">النشاط</span>
                    <span className="text-sm font-semibold text-blue-700">{document.activity}</span>
                  </div>
                </div>
              )}

              {document.dateActivity && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Clock className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">تاريخ النشاط</span>
                    <span className="text-sm font-semibold text-orange-700">{formatArabicDate(document.dateActivity)}</span>
                  </div>
                </div>
              )}

              {document.typeDocument && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">نوع الوثيقة</span>
                    <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-800">{document.typeDocument}</Badge>
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
                      <Badge key={index} variant="outline" className="text-sm py-1 px-3 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors">
                        {dept.name}
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
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileOutput className="h-5 w-5 text-amber-600" />
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

        {/* Answer Document Section */}
        {answerDocument && (
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileOutput className="h-5 w-5 text-green-600" />
                </div>
                الوثيقة الصادرة (الرد)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">رقم التسلسل</span>
                    <span className="text-sm font-semibold text-gray-900">#{answerDocument.serialNumber} - {answerDocument.year}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm text-gray-600 font-medium block">تاريخ الإصدار</span>
                    <span className="text-sm font-semibold text-gray-900">{formatArabicDate(answerDocument.issueDate)}</span>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-sm text-gray-600 font-medium block mb-2">الموضوع:</span>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">{answerDocument.subject}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="hover:bg-green-50 hover:border-green-300 transition-colors"
                onClick={() => navigate(`/dashboard/outgoing-documents/${answerDocument._id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                عرض تفاصيل الرد
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PDF Previews Section */}
        {hasDualPreview ? (
          // Dual PDF Preview - Side by Side
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  معاينة المحادثة الكاملة
                </CardTitle>
                <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  وثيقة واردة + رد
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Incoming Document Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h3 className="text-md font-medium text-blue-900">الوثيقة الواردة</h3>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                      #{document.serialNumber}/{document.year}
                    </Badge>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <PDFViewer documentPath={document.scannedDocument} />
                  </div>
                </div>

                {/* Answer Document Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileOutput className="h-4 w-4 text-green-600" />
                      <h3 className="text-md font-medium text-green-900">الوثيقة الصادرة (الرد)</h3>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                      #{answerDocument.serialNumber}/{answerDocument.year}
                    </Badge>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <PDFViewer documentPath={answerDocument.scannedDocument} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Single PDF Preview or No Preview
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
                <DocumentDetailCard document={document} type="incoming" />
              </CardContent>
            </Card>

            {/* Incoming Document Preview */}
            {document.scannedDocument && (
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    معاينة الوثيقة الواردة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <PDFViewer documentPath={document.scannedDocument} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Answer Document Preview (if exists but still loading) */}
            {answerDocument?.scannedDocument && (
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileOutput className="h-5 w-5 text-green-600" />
                    </div>
                    معاينة الوثيقة الصادرة (الرد)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <PDFViewer documentPath={answerDocument.scannedDocument} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading state for answer document */}
            {document.answer && answerLoading && (
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className="p-12">
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                      <span className="text-sm text-muted-foreground">جاري تحميل الرد...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* No Documents Message */}
        {!document.scannedDocument && !answerDocument?.scannedDocument && (
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
            documentType="incoming"
          />
        )}
      </div>
    </div>
  );
};

export default ViewIncomingDocument;
