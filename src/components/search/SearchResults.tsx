
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IncomingDocument, OutgoingDocument } from '@/types';
import { FileInput, FileOutput, Calendar, Building2, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface SearchResultsProps {
  results: {
    incoming: IncomingDocument[];
    outgoing: OutgoingDocument[];
  };
  isLoading: boolean;
  searchPerformed: boolean;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, isLoading, searchPerformed }) => {
  const navigate = useNavigate();

  const totalResults = results.incoming.length + results.outgoing.length;

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
    );
  }

  if (totalResults === 0) {
    return (
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
            {totalResults} نتيجة
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Documents Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Documents */}
          {results.incoming.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileInput className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-slate-800">
                  الوثائق الواردة ({results.incoming.length})
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.incoming.map((doc) => (
                  <Card key={doc._id} className="border border-slate-200 hover:shadow-md transition-shadow">
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
          {results.outgoing.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileOutput className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-800">
                  الوثائق الصادرة ({results.outgoing.length})
                </h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.outgoing.map((doc) => (
                  <Card key={doc._id} className="border border-slate-200 hover:shadow-md transition-shadow">
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

        {/* Show message when only one type has results */}
        {results.incoming.length === 0 && results.outgoing.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="text-center py-8 text-muted-foreground">
              <FileInput className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد وثائق واردة تطابق معايير البحث</p>
            </div>
            <div></div>
          </div>
        )}
        
        {results.outgoing.length === 0 && results.incoming.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div></div>
            <div className="text-center py-8 text-muted-foreground">
              <FileOutput className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد وثائق صادرة تطابق معايير البحث</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchResults;
