
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, EyeOff, FileText } from 'lucide-react';
import { DocumentOption } from '@/services/documentOptionsService';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentOptionsListProps {
  options: DocumentOption[];
  onEdit: (option: DocumentOption) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
}

const DocumentOptionsList: React.FC<DocumentOptionsListProps> = ({
  options,
  onEdit,
  onDelete,
  onToggleActive,
  isLoading = false,
}) => {
  const getCategoryLabel = (category: string) => {
    const labels = {
      activity: 'النشاط',
      source: 'المصدر',
      typeDocument: 'نوع الوثيقة',
      assignedTo: 'مخصص إلى',
      pourInfo: 'للإعلام',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getDocumentTypeLabel = (documentType: string) => {
    const labels = {
      incoming: 'وارد',
      outgoing: 'صادر',
      both: 'كلاهما',
    };
    return labels[documentType as keyof typeof labels] || documentType;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      activity: 'bg-blue-100 text-blue-800 border-blue-300',
      source: 'bg-green-100 text-green-800 border-green-300',
      typeDocument: 'bg-purple-100 text-purple-800 border-purple-300',
      assignedTo: 'bg-orange-100 text-orange-800 border-orange-300',
      pourInfo: 'bg-pink-100 text-pink-800 border-pink-300',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getDocumentTypeColor = (documentType: string) => {
    const colors = {
      incoming: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      outgoing: 'bg-red-100 text-red-800 border-red-300',
      both: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    };
    return colors[documentType as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (options.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-100 rounded-full">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد خيارات وثائق</h3>
              <p className="text-gray-600">
                لم يتم العثور على خيارات للوثائق. قم بإنشاء أول خيار للبدء.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, DocumentOption[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
        <Card key={category} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${getCategoryColor(category)} font-medium px-3 py-1`}>
                  {getCategoryLabel(category)}
                </Badge>
                <span className="text-sm text-gray-600">
                  ({categoryOptions.length} خيار{categoryOptions.length !== 1 ? '' : ''})
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryOptions.map((option) => (
                <div
                  key={option._id}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                    option.isActive 
                      ? 'border-green-200 bg-green-50 hover:border-green-300' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {/* Status indicator */}
                  <div className="absolute top-2 right-2">
                    <div className={`w-3 h-3 rounded-full ${
                      option.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>

                  <div className="space-y-3">
                    {/* Option value and status */}
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900 text-base line-clamp-2 ml-6">
                          {option.value}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={`${getDocumentTypeColor(option.documentType)} font-medium text-xs`}
                        >
                          {getDocumentTypeLabel(option.documentType)}
                        </Badge>
                        <Badge 
                          variant={option.isActive ? "default" : "secondary"}
                          className={`text-xs ${
                            option.isActive 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {option.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                    </div>

                    {/* Creator and date info */}
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>أنشأه: {option.createdBy?.username || 'غير معروف'}</div>
                      <div>{formatArabicDate(option.createdAt)}</div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleActive(option._id, option.isActive)}
                        disabled={isLoading}
                        title={option.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                        className={`flex-1 text-xs px-2 ${
                          option.isActive 
                            ? 'hover:bg-red-50 text-red-600' 
                            : 'hover:bg-green-50 text-green-600'
                        }`}
                      >
                        {option.isActive ? (
                          <>
                            <EyeOff className="h-3 w-3 ml-1" />
                            إلغاء
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 ml-1" />
                            تفعيل
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(option)}
                        disabled={isLoading}
                        className="flex-1 hover:bg-blue-50 text-blue-600 text-xs px-2"
                      >
                        <Edit className="h-3 w-3 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(option._id)}
                        disabled={isLoading}
                        className="flex-1 hover:bg-red-50 text-red-600 text-xs px-2"
                      >
                        <Trash2 className="h-3 w-3 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DocumentOptionsList;
