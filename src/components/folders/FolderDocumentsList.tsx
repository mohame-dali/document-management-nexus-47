
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileInput, 
  FileOutput, 
  FolderOpen, 
  Eye, 
  Download,
  Calendar,
  FileText,
  Inbox,
  Send
} from 'lucide-react';
import { getFolderDocuments } from '@/services/folderService';
import { downloadDocument } from '@/services/documentService';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';
import { formatArabicDate } from '@/utils/arabicDateFormatter';
import { useNavigate } from 'react-router-dom';

interface FolderDocumentsListProps {
  selectedFolder: Folder | null;
  canManage: boolean;
  isModal?: boolean;
}

export const FolderDocumentsList: React.FC<FolderDocumentsListProps> = ({
  selectedFolder,
  canManage,
  isModal = false
}) => {
  const navigate = useNavigate();

  const { data: folderDocuments, isLoading } = useQuery({
    queryKey: ['folderDocuments', selectedFolder?._id],
    queryFn: () => getFolderDocuments(selectedFolder!._id),
    enabled: !!selectedFolder,
  });

  const handleViewDocument = (documentId: string, type: 'incoming' | 'outgoing') => {
    navigate(`/dashboard/${type}-documents/${documentId}`);
  };

  const handleDownload = async (scannedDocument: string, serialNumber: number, year: number, type: string) => {
    if (scannedDocument) {
      try {
        await downloadDocument(scannedDocument, `${type}-document-${serialNumber}-${year}.pdf`);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    }
  };

  if (!selectedFolder) {
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <CardContent className="p-8 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full blur-xl opacity-60"></div>
            <div className="relative p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-fit mx-auto">
              <FolderOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">اختر مجلداً</h3>
          <p className="text-gray-600">انقر على مجلد لعرض المستندات المحفوظة به</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </CardContent>
      </Card>
    );
  }

  const incomingDocuments = folderDocuments?.incomingDocuments || [];
  const outgoingDocuments = folderDocuments?.outgoingDocuments || [];
  const totalDocuments = incomingDocuments.length + outgoingDocuments.length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Folder Header - Only show if not in modal */}
      {!isModal && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-500"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{selectedFolder.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">مستندات المجلد</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
                  <FileText className="h-3 w-3 mr-1" />
                  {totalDocuments}
                </Badge>
                <Badge variant={selectedFolder.status === 'En cours' ? 'default' : 'secondary'} className="bg-white/80 backdrop-blur-sm">
                  {selectedFolder.status === 'En cours' ? 'نشط' : 'مغلق'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Documents Summary - Show in modal */}
      {isModal && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Inbox className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">الواردة</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{incomingDocuments.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Send className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">الصادرة</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{outgoingDocuments.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-800">المجموع</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">{totalDocuments}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Display - Side by Side */}
      <div className={`grid grid-cols-1 ${isModal ? 'xl:grid-cols-2' : 'lg:grid-cols-2'} gap-6`}>
        {/* Incoming Documents */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <Inbox className="h-4 w-4 text-white" />
              </div>
              <span>الواردة</span>
              <Badge variant="outline" className="ml-auto">
                {incomingDocuments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {incomingDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-60"></div>
                  <div className="relative p-4 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full w-fit mx-auto">
                    <FileInput className="h-12 w-12 text-blue-600 opacity-70" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-600 mb-2">لا توجد مستندات واردة</p>
                <p className="text-sm text-gray-500">لم يتم تصنيف أي مستندات واردة في هذا المجلد</p>
              </div>
            ) : (
              <div className={`space-y-4 ${isModal ? 'max-h-[600px]' : 'max-h-96'} overflow-y-auto`}>
                {incomingDocuments.map((doc: IncomingDocument) => (
                  <div key={doc._id} className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="bg-white/90 text-sm font-semibold px-3 py-1 border-blue-300">
                            #{doc.serialNumber}/{doc.year}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{formatArabicDate(doc.arrivalDate)}</span>
                          </div>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-3 line-clamp-2 leading-6 group-hover:text-blue-800 transition-colors">
                          {doc.subject}
                        </h4>
                        {doc.source && (
                          <p className="text-sm text-gray-600 mb-2 bg-white/60 rounded-lg px-3 py-1 inline-block">
                            <span className="font-medium">من:</span> {doc.source}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc._id, 'incoming')}
                          className="h-10 w-10 p-0 hover:bg-blue-200 rounded-full transition-all duration-200 group-hover:scale-105"
                        >
                          <Eye className="h-5 w-5 text-blue-600" />
                        </Button>
                        {doc.scannedDocument && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'incoming')}
                            className="h-10 w-10 p-0 hover:bg-blue-200 rounded-full transition-all duration-200 group-hover:scale-105"
                          >
                            <Download className="h-5 w-5 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outgoing Documents */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                <Send className="h-4 w-4 text-white" />
              </div>
              <span>الصادرة</span>
              <Badge variant="outline" className="ml-auto">
                {outgoingDocuments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {outgoingDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-60"></div>
                  <div className="relative p-4 bg-gradient-to-r from-green-100 to-green-200 rounded-full w-fit mx-auto">
                    <FileOutput className="h-12 w-12 text-green-600 opacity-70" />
                  </div>
                </div>
                <p className="text-lg font-medium text-gray-600 mb-2">لا توجد مستندات صادرة</p>
                <p className="text-sm text-gray-500">لم يتم تصنيف أي مستندات صادرة في هذا المجلد</p>
              </div>
            ) : (
              <div className={`space-y-4 ${isModal ? 'max-h-[600px]' : 'max-h-96'} overflow-y-auto`}>
                {outgoingDocuments.map((doc: OutgoingDocument) => (
                  <div key={doc._id} className="p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:shadow-lg hover:border-green-300 transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="bg-white/90 text-sm font-semibold px-3 py-1 border-green-300">
                            #{doc.serialNumber}/{doc.year}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{formatArabicDate(doc.issueDate)}</span>
                          </div>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-3 line-clamp-2 leading-6 group-hover:text-green-800 transition-colors">
                          {doc.subject}
                        </h4>
                        {doc.assignedTo && doc.assignedTo.length > 0 && (
                          <p className="text-sm text-gray-600 mb-2 bg-white/60 rounded-lg px-3 py-1 inline-block">
                            <span className="font-medium">إلى:</span> {doc.assignedTo.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDocument(doc._id, 'outgoing')}
                          className="h-10 w-10 p-0 hover:bg-green-200 rounded-full transition-all duration-200 group-hover:scale-105"
                        >
                          <Eye className="h-5 w-5 text-green-600" />
                        </Button>
                        {doc.scannedDocument && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.scannedDocument!, doc.serialNumber, doc.year, 'outgoing')}
                            className="h-10 w-10 p-0 hover:bg-green-200 rounded-full transition-all duration-200 group-hover:scale-105"
                          >
                            <Download className="h-5 w-5 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FolderDocumentsList;
