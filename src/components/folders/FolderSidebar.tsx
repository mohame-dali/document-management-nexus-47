
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FolderOpen, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  FileText,
  Eye
} from 'lucide-react';
import { getFolders } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import { useNavigate } from 'react-router-dom';

interface FolderSidebarProps {
  className?: string;
}

const FolderSidebar: React.FC<FolderSidebarProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const departmentId = currentUser?.activeDepartment?._id;
  const canViewFolders = ['Admin', 'AdminTuningDesk', 'AdminDepartment', 'User'].includes(currentUser?.role || '');

  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders', departmentId],
    queryFn: () => getFolders(departmentId),
    enabled: !!departmentId && canViewFolders,
  });

  const rootFolders = folders?.filter(folder => !folder.parent) || [];
  const subfolders = folders?.filter(folder => folder.parent) || [];

  const getSubfolders = (parentId: string) => {
    return subfolders.filter(folder => 
      typeof folder.parent === 'string' 
        ? folder.parent === parentId 
        : folder.parent?._id === parentId
    );
  };

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleViewFolder = (folderId: string) => {
    navigate(`/dashboard/folders?folder=${folderId}`);
  };

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const hasChildren = getSubfolders(folder._id).length > 0;
    const isExpanded = expandedFolders.has(folder._id);
    
    return (
      <div key={folder._id}>
        <div
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
          style={{ paddingRight: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder._id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <div
            className="flex items-center gap-2 flex-1"
            onClick={() => handleViewFolder(folder._id)}
          >
            {isExpanded || hasChildren ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )}
            <span className="text-sm flex-1 truncate">{folder.name}</span>
          </div>
          
          <Badge 
            variant={folder.status === 'En cours' ? 'default' : 'secondary'} 
            className="text-xs"
          >
            {folder.status === 'En cours' ? 'نشط' : 'مغلق'}
          </Badge>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {getSubfolders(folder._id).map(subfolder => 
              renderFolder(subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (!canViewFolders) {
    return null;
  }

  return (
    <Card className={className} dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          تصنيف المستندات
          {currentUser?.role === 'User' && (
            <Badge variant="secondary" className="text-xs">
              للعرض
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">جاري التحميل...</p>
          </div>
        ) : rootFolders.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">لا توجد مجلدات</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {rootFolders.map(folder => renderFolder(folder))}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2"
            onClick={() => navigate('/dashboard/folders')}
          >
            <Eye className="h-4 w-4" />
            عرض جميع المجلدات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FolderSidebar;
