
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Archive, 
  FolderOpen, 
  FileText, 
  Search, 
  Filter,
  ChevronRight,
  Calendar,
  Tag,
  TrendingUp
} from 'lucide-react';
import { Folder, IncomingDocument, OutgoingDocument } from '@/types';
import { getFolderDocuments, assignDocumentToFolder } from '@/services/folderService';
import { getIncomingDocuments, getOutgoingDocuments } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentCategoryManagerProps {
  folders: Folder[];
  canManage: boolean;
  departmentId?: string;
}

const DocumentCategoryManager: React.FC<DocumentCategoryManagerProps> = ({
  folders,
  canManage,
  departmentId
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [uncategorizedDocuments, setUncategorizedDocuments] = useState<{
    incoming: IncomingDocument[];
    outgoing: OutgoingDocument[];
  }>({ incoming: [], outgoing: [] });

  // Fetch uncategorized documents
  const { data: incomingDocs } = useQuery({
    queryKey: ['incomingDocuments', departmentId],
    queryFn: () => getIncomingDocuments({}),
    enabled: !!departmentId,
  });

  const { data: outgoingDocs } = useQuery({
    queryKey: ['outgoingDocuments', departmentId],
    queryFn: () => getOutgoingDocuments({}),
    enabled: !!departmentId,
  });

  // Filter uncategorized documents
  React.useEffect(() => {
    if (incomingDocs && outgoingDocs) {
      const uncategorizedIncoming = incomingDocs.filter(doc => !doc.folder);
      const uncategorizedOutgoing = outgoingDocs.filter(doc => !doc.folder);
      
      setUncategorizedDocuments({
        incoming: uncategorizedIncoming,
        outgoing: uncategorizedOutgoing
      });
    }
  }, [incomingDocs, outgoingDocs]);

  const assignMutation = useMutation({
    mutationFn: ({ documentId, folderId, type }: { 
      documentId: string, 
      folderId: string | null, 
      type: 'incoming' | 'outgoing' 
    }) => assignDocumentToFolder(documentId, folderId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomingDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['outgoingDocuments'] });
      toast.success('تم تصنيف المستند بنجاح');
    },
    onError: () => {
      toast.error('فشل في تصنيف المستند');
    }
  });

  const handleDocumentAssign = (documentId: string, folderId: string, type: 'incoming' | 'outgoing') => {
    if (!canManage) return;
    
    assignMutation.mutate({ documentId, folderId, type });
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFolderIcon = (status: string, hasDocuments: boolean) => {
    if (status === 'Fermé') return Archive;
    return hasDocuments ? FolderOpen : Archive;
  };

  const getFolderColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-gray-500', 
      'bg-orange-500',
      'bg-slate-600'
    ];
    return colors[index % colors.length];
  };

  const renderDocumentCard = (doc: IncomingDocument | OutgoingDocument, type: 'incoming' | 'outgoing') => {
    const isIncoming = type === 'incoming';
    const date = isIncoming ? (doc as IncomingDocument).arrivalDate : (doc as OutgoingDocument).issueDate;
    
    return (
      <Card key={doc._id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  #{doc.serialNumber}/{doc.year}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatArabicDate(date)}
                </span>
              </div>
              <h4 className="font-medium text-sm line-clamp-2 mb-2">{doc.subject}</h4>
              <div className="flex items-center gap-2">
                {isIncoming ? (
                  <FileText className="h-4 w-4 text-blue-500" />
                ) : (
                  <FileText className="h-4 w-4 text-green-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isIncoming ? 'وارد' : 'صادر'}
                </span>
              </div>
            </div>
            
            {canManage && (
              <div className="flex flex-col gap-1">
                {filteredFolders.slice(0, 3).map((folder, index) => (
                  <Button
                    key={folder._id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDocumentAssign(doc._id, folder._id, type)}
                    className="text-xs px-2 py-1 h-auto"
                    disabled={assignMutation.isPending}
                  >
                    <div className={`w-2 h-2 rounded-full ${getFolderColor(index)} mr-1`} />
                    {folder.name.substring(0, 8)}...
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with Statistics */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Archive className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">تصنيف المستندات</h3>
                <p className="text-sm text-gray-600">تنظيم وأرشفة المستندات بطريقة هرمية</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {uncategorizedDocuments.incoming.length + uncategorizedDocuments.outgoing.length}
                </div>
                <div className="text-xs text-gray-600">غير مصنف</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{folders.length}</div>
                <div className="text-xs text-gray-600">مجلد</div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المجلدات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              تصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Folder Archive Visualization */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              هيكل الأرشيف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredFolders.map((folder, index) => {
                const FolderIcon = getFolderIcon(folder.status, true);
                const folderColor = getFolderColor(index);
                
                return (
                  <div
                    key={folder._id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedFolder?._id === folder._id 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${folderColor} rounded-lg shadow-md`}>
                        <FolderIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{folder.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={folder.status === 'En cours' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Document Classification */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              المستندات غير المصنفة
              {!canManage && (
                <Badge variant="secondary" className="text-xs">للعرض فقط</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="incoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incoming" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  واردة ({uncategorizedDocuments.incoming.length})
                </TabsTrigger>
                <TabsTrigger value="outgoing" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  صادرة ({uncategorizedDocuments.outgoing.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incoming" className="mt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {uncategorizedDocuments.incoming.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>جميع المستندات الواردة مصنفة</p>
                    </div>
                  ) : (
                    uncategorizedDocuments.incoming.map(doc => 
                      renderDocumentCard(doc, 'incoming')
                    )
                  )}
                </div>
              </TabsContent>

              <TabsContent value="outgoing" className="mt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {uncategorizedDocuments.outgoing.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>جميع المستندات الصادرة مصنفة</p>
                    </div>
                  ) : (
                    uncategorizedDocuments.outgoing.map(doc => 
                      renderDocumentCard(doc, 'outgoing')
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentCategoryManager;
