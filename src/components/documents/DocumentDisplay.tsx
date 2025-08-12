
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIncomingDocuments, getOutgoingDocuments } from '@/services/documentService';
import { useAuth } from '@/contexts/AuthContext';
import { Grid, List, Calendar, FileText, Send, Eye } from 'lucide-react';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { useNavigate } from 'react-router-dom';
import DocumentDataGrid from './DocumentDataGrid';
import { formatArabicDate, formatArabicDateShort } from '@/utils/arabicDateFormatter';
import { useIsMobile } from '@/hooks/use-mobile';

type ViewMode = 'grid' | 'list';

const DocumentDisplay: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('incoming');

  const years = Array.from({ length: 10 }, (_, i) => 
    (new Date().getFullYear() - i).toString()
  );

  const { data: incomingDocuments, isLoading: loadingIncoming } = useQuery({
    queryKey: ['incomingDocuments', selectedYear],
    queryFn: () => getIncomingDocuments({ year: selectedYear }),
  });

  const { data: outgoingDocuments, isLoading: loadingOutgoing } = useQuery({
    queryKey: ['outgoingDocuments', selectedYear],
    queryFn: () => getOutgoingDocuments({ year: selectedYear }),
  });

  // Filter documents by year and user permissions
  const filterDocumentsByYear = (documents: any[], year: string) => {
    return documents?.filter(doc => {
      const docYear = new Date(doc.arrivalDate || doc.issueDate).getFullYear().toString();
      return docYear === year;
    }) || [];
  };

  const filterDocumentsByPermissions = (documents: any[], type: 'incoming' | 'outgoing') => {
    if (!currentUser) return [];
    
    // SuperAdmin, Admin and AdminTuningDesk see all documents
    if (currentUser.role === 'SuperAdmin' || currentUser.role === 'Admin' || currentUser.role === 'AdminTuningDesk') {
      return documents;
    }
    
    // AdminDepartment and User see only department-specific documents
    if (currentUser.role === 'AdminDepartment' || currentUser.role === 'User') {
      const activeDepartmentId = currentUser.activeDepartment?._id;
      if (!activeDepartmentId) return [];
      
      if (type === 'incoming') {
        return documents.filter(doc => {
          if (Array.isArray(doc.assignedTo)) {
            return doc.assignedTo.some((dept: any) => dept._id === activeDepartmentId);
          }
          return false;
        });
      } else {
        return documents.filter(doc => 
          (typeof doc.source?.id === 'string' ? doc.source.id : doc.source?.id?._id) === activeDepartmentId
        );
      }
    }
    
    return [];
  };

  const filteredIncomingDocs = filterDocumentsByPermissions(
    filterDocumentsByYear(incomingDocuments || [], selectedYear),
    'incoming'
  );

  const filteredOutgoingDocs = filterDocumentsByPermissions(
    filterDocumentsByYear(outgoingDocuments || [], selectedYear),
    'outgoing'
  );

  const renderDocumentCard = (doc: IncomingDocument | OutgoingDocument, type: 'incoming' | 'outgoing') => {
    const isIncoming = type === 'incoming';
    const date = isIncoming ? (doc as IncomingDocument).arrivalDate : (doc as OutgoingDocument).issueDate;
    
    // Fix source handling based on document type
    const source = isIncoming 
      ? (doc as IncomingDocument).source || 'Unknown Source'
      : (doc as OutgoingDocument).source?.name || 'Unknown Department';
    
    const getAssignedInfo = () => {
      if (isIncoming) {
        const incomingDoc = doc as IncomingDocument;
        if (Array.isArray(incomingDoc.assignedTo)) {
          return incomingDoc.assignedTo.map(d => d.name).join(', ');
        }
        return 'None';
      } else {
        const outgoingDoc = doc as OutgoingDocument;
        if (Array.isArray(outgoingDoc.assignedTo)) {
          return outgoingDoc.assignedTo.join(', ');
        }
        return 'None';
      }
    };

    return (
      <Card key={doc._id} className="enhanced-card card-responsive-sm animate-fade-in-up">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isIncoming ? (
                <FileText className="icon-responsive text-blue-500" />
              ) : (
                <Send className="icon-responsive text-green-500" />
              )}
              <span className="text-responsive-sm font-medium">#{doc.serialNumber}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h4 className="font-medium text-responsive-sm line-clamp-2 leading-tight">{doc.subject}</h4>
          <p className="text-responsive-xs text-muted-foreground">
            <strong>المصدر:</strong> {source}
          </p>
          <p className="text-responsive-xs text-muted-foreground">
            <strong>التاريخ:</strong> {isMobile ? formatArabicDateShort(date) : formatArabicDate(date)}
          </p>
          {isIncoming && getAssignedInfo() && (
            <p className="text-responsive-xs text-muted-foreground">
              <strong>مخصص لـ:</strong> {getAssignedInfo()}
            </p>
          )}
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            className="w-full mt-3 touch-target-sm"
            onClick={() => navigate(`/dashboard/${type}-documents/${doc._id}`)}
          >
            <Eye className="icon-responsive mr-2" />
            {isMobile ? 'عرض' : 'عرض التفاصيل'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const getRoleDisplayScope = () => {
    switch (currentUser?.role) {
      case 'Admin':
      case 'AdminTuningDesk':
        return 'جميع الأقسام';
      case 'AdminDepartment':
      case 'User':
        return currentUser?.activeDepartment?.name || 'لا يوجد قسم';
      default:
        return 'غير معروف';
    }
  };

  const renderDocuments = (documents: any[], type: 'incoming' | 'outgoing') => {
    if (viewMode === 'list') {
      return <DocumentDataGrid documents={documents} type={type} />;
    }
    
    // Grid view - responsive grid
    return (
      <div className="grid-responsive-1 gap-responsive animate-fade-in-up">
        {documents.map(doc => renderDocumentCard(doc, type))}
      </div>
    );
  };

  return (
    <div className="container-responsive space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Header Controls - Responsive */}
      <div className="flex-responsive-col gap-responsive items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-responsive-xl font-bold gradient-text">إدارة الوثائق</h2>
          <p className="text-responsive-sm text-muted-foreground">
            العرض: {getRoleDisplayScope()} • السنة: {selectedYear}
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-32 touch-target">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>
                  <div className="flex items-center gap-2">
                    <Calendar className="icon-responsive" />
                    {year}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size={isMobile ? "sm" : "default"}
              onClick={() => setViewMode('grid')}
              className="rounded-r-none touch-target"
            >
              <Grid className="icon-responsive" />
              {!isMobile && <span className="mr-2">شبكة</span>}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size={isMobile ? "sm" : "default"}
              onClick={() => setViewMode('list')}
              className="rounded-l-none touch-target"
            >
              <List className="icon-responsive" />
              {!isMobile && <span className="mr-2">قائمة</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Document Tabs - Responsive */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
          <TabsTrigger value="incoming" className="flex items-center gap-2 text-responsive-sm">
            <FileText className="icon-responsive" />
            <span className="hidden sm:inline">الواردة</span>
            <span className="sm:hidden">واردة</span>
            <Badge variant="secondary" className="badge-responsive">{filteredIncomingDocs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-2 text-responsive-sm">
            <Send className="icon-responsive" />
            <span className="hidden sm:inline">الصادرة</span>
            <span className="sm:hidden">صادرة</span>
            <Badge variant="secondary" className="badge-responsive">{filteredOutgoingDocs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4 sm:mt-6">
          {loadingIncoming ? (
            <div className="flex justify-center padding-responsive-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredIncomingDocs.length > 0 ? (
            renderDocuments(filteredIncomingDocs, 'incoming')
          ) : (
            <div className="text-center padding-responsive-lg text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-responsive-base">لا توجد وثائق واردة لعام {selectedYear}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4 sm:mt-6">
          {loadingOutgoing ? (
            <div className="flex justify-center padding-responsive-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredOutgoingDocs.length > 0 ? (
            renderDocuments(filteredOutgoingDocs, 'outgoing')
          ) : (
            <div className="text-center padding-responsive-lg text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-responsive-base">لا توجد وثائق صادرة لعام {selectedYear}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentDisplay;
