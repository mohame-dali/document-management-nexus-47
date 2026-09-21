
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Archive, Eye, Edit, Circle, Calendar, Clock } from 'lucide-react';
import { Folder } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface DocumentFolderDisplayProps {
  folder: Folder | string | null;
  onFolderEdit?: () => void;
  className?: string;
}

const DocumentFolderDisplay: React.FC<DocumentFolderDisplayProps> = ({
  folder,
  onFolderEdit,
  className = ""
}) => {
  const { currentUser } = useAuth();
  
  // Handle both string and Folder object cases
  const folderData = typeof folder === 'string' ? null : folder;
  const canEditFolder = currentUser?.role === 'AdminDepartment' && onFolderEdit;

  if (!folderData) {
    return (
      <Card className={`border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200 ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
            <Archive className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-2">غير مصنف</h3>
          <p className="text-sm text-muted-foreground">
            لم يتم تصنيف هذا المستند في أي مجلد
          </p>
        </CardContent>
      </Card>
    );
  }

  const getFolderIcon = () => {
    if (folderData.status === 'Fermé') return Archive;
    return FolderOpen;
  };

  const FolderIcon = getFolderIcon();

  return (
    <Card className={`border border-[#e2e8f0] bg-white shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded">
              <FolderIcon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-bold text-gray-800">تصنيف المستند</span>
          </div>
          {canEditFolder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFolderEdit}
              aria-label="تعديل تصنيف المستند"
              title="تعديل تصنيف المستند"
              className="h-11 w-11 p-0 hover:bg-blue-100 rounded-full transition-colors duration-200"
            >
              <Edit className="h-4 w-4 text-blue-600" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
          <div className="p-3 bg-[#2c5282] rounded shadow-sm">
            <FolderIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg text-gray-800 mb-1">{folderData.name}</div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={folderData.status === 'En cours' ? 'default' : 'secondary'}
                className="text-sm font-medium shadow-sm"
              >
                <Circle className="h-3 w-3 mr-1" />
                {folderData.status === 'En cours' ? 'نشط' : 'مؤرشف'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="bg-[#f8fafc] rounded p-4 border border-[#e2e8f0]">
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            معلومات التصنيف
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                تاريخ الإنشاء:
              </span>
              <span className="text-sm font-medium text-gray-800">
                {formatArabicDate(folderData.createdAt)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">الحالة:</span>
              <span className="text-sm font-medium text-gray-800">
                {folderData.status === 'En cours' ? 'نشط' : 'مؤرشف'}
              </span>
            </div>
          </div>
        </div>

        {!canEditFolder && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 p-3 rounded border border-amber-200">
            <Eye className="h-4 w-4 text-amber-600" />
            <span>للعرض فقط - يمكن لمدير القسم تعديل التصنيف</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentFolderDisplay;
