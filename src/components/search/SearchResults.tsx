
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { FileInput, FileOutput, Calendar, Building2, User, Eye, Grid, List, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import ScrollToTop from '@/components/common/ScrollToTop';

interface SearchResultsProps {
  incoming: IncomingDocument[];
  outgoing: OutgoingDocument[];
  isLoading: boolean;
  searchPerformed: boolean;
  totalCount?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  lastElementRef?: (node: HTMLElement | null) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ 
  incoming, 
  outgoing, 
  isLoading, 
  searchPerformed,
  totalCount = 0,
  isFetchingNextPage = false,
  hasNextPage = false,
  lastElementRef
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const combinedResults = incoming.length + outgoing.length;

  if (isLoading) {
    return (
      <Card className="bg-white shadow-lg border border-slate-200 rounded-xl">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-500 text-lg">جاري البحث...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!searchPerformed) {
    return (
      <>
        <Card className="bg-white shadow-lg border border-slate-200 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileInput className="h-6 w-6 text-blue-600" />
              </div>
              نتائج البحث
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileInput className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg">
                قم بإدخال معايير البحث واضغط على البحث لعرض النتائج
              </p>
            </div>
          </CardContent>
        </Card>
        <ScrollToTop />
      </>
    );
  }

  if (combinedResults === 0 && !isLoading) {
    return (
      <>
        <Card className="bg-white shadow-lg border border-slate-200 rounded-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileInput className="h-6 w-6 text-blue-600" />
              </div>
              نتائج البحث
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileInput className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-lg">لم يتم العثور على نتائج تطابق معايير البحث</p>
            </div>
          </CardContent>
        </Card>
        <ScrollToTop />
      </>
    );
  }

  return (
    <Card className="bg-white shadow-lg border border-slate-200 rounded-xl">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileInput className="h-6 w-6 text-blue-600" />
            </div>
            نتائج البحث
          </div>
          <Badge variant="secondary" className="text-sm">
            {combinedResults} نتيجة
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid className="h-4 w-4 mr-2" />
              شبكة
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-2" />
              قائمة
            </Button>
          </div>
        </div>

        {/* Documents Display */}
        <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-6"}>
          {/* Incoming Documents */}
          {incoming.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileInput className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-slate-800">
                  الوثائق الواردة ({incoming.length})
                </h3>
              </div>
              <div className={`space-y-3 ${viewMode === 'grid' ? 'max-h-96 overflow-y-auto' : ''}`}>
                {incoming.map((doc, index) => (
                  <Card 
                    key={doc._id} 
                    className="border border-slate-200 hover:shadow-md transition-shadow"
                    ref={index === incoming.length - 1 ? lastElementRef : null}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              #{doc.serialNumber}/{doc.year}
                            </Badge>
                            {doc.typeDocument && (
                              <Badge variant="outline">{doc.typeDocument}</Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2">{doc.subject}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.arrivalDate), 'dd/MM/yyyy')}
                            </div>
                            {doc.source && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate max-w-20">{doc.source}</span>
                              </div>
                            )}
                            {doc.responsibleUser && typeof doc.responsibleUser === 'object' && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-16">{doc.responsibleUser.username}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/incoming-documents/${doc._id}`)}
                          className="flex items-center gap-2 ml-2"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Documents */}
          {outgoing.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileOutput className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-800">
                  الوثائق الصادرة ({outgoing.length})
                </h3>
              </div>
              <div className={`space-y-3 ${viewMode === 'grid' ? 'max-h-96 overflow-y-auto' : ''}`}>
                {outgoing.map((doc, index) => (
                  <Card 
                    key={doc._id} 
                    className="border border-slate-200 hover:shadow-md transition-shadow"
                    ref={index === outgoing.length - 1 ? lastElementRef : null}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              #{doc.serialNumber}/{doc.year}
                            </Badge>
                            {doc.typeDocument && (
                              <Badge variant="outline">{doc.typeDocument}</Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2">{doc.subject}</h4>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.issueDate), 'dd/MM/yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate max-w-20">{doc.source.name}</span>
                            </div>
                          </div>
                          {doc.assignedTo && doc.assignedTo.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">إلى:</span>
                              <div className="flex gap-1 flex-wrap">
                                {doc.assignedTo.slice(0, 2).map((dept, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {dept}
                                  </Badge>
                                ))}
                                {doc.assignedTo.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{doc.assignedTo.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/outgoing-documents/${doc._id}`)}
                          className="flex items-center gap-2 ml-2"
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">جاري تحميل المزيد...</span>
            </div>
          </div>
        )}

        {/* No more results indicator */}
        {!hasNextPage && combinedResults > 0 && (
          <div className="text-center py-4 text-slate-500 text-sm">
            تم عرض جميع النتائج ({combinedResults} نتيجة)
          </div>
        )}

        {/* Show message when only one type has results */}
        {incoming.length === 0 && outgoing.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="text-center py-8 text-muted-foreground">
              <FileInput className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد وثائق واردة تطابق معايير البحث</p>
            </div>
            <div></div>
          </div>
        )}
        
        {outgoing.length === 0 && incoming.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div></div>
            <div className="text-center py-8 text-muted-foreground">
              <FileOutput className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد وثائق صادرة تطابق معايير البحث</p>
            </div>
          </div>
        )}

        <ScrollToTop />
      </CardContent>
    </Card>
  );
};

export default SearchResults;
