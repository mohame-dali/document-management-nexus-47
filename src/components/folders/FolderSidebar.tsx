import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FolderOpen, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Eye
} from 'lucide-react';
import { getFolders } from '@/services/folderService';
import { useAuth } from '@/contexts/AuthContext';
import { Folder as FolderType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FolderSidebarProps {
  className?: string;
}

const FolderSidebar: React.FC<FolderSidebarProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const departmentId = currentUser?.activeDepartment?._id;
  const canViewFolders = ['SuperAdmin', 'Admin', 'AdminTuningDesk', 'AdminDepartment', 'User'].includes(currentUser?.role || '');

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
          className="flex items-center gap-2 p-1.5 rounded hover:bg-[#2d3748] cursor-pointer transition-colors duration-200 text-slate-200"
          style={{ paddingRight: `${level * 14 + 6}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(folder._id);
              }}
              className="p-1 hover:bg-[#1a202c] rounded text-slate-400 hover:text-slate-200 transition-colors duration-200"
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
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => handleViewFolder(folder._id)}
          >
            {isExpanded || hasChildren ? (
              <FolderOpen className="h-4 w-4 text-[#90cdf4] flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-[#90cdf4] flex-shrink-0" />
            )}
            <span className="text-xs flex-1 truncate text-slate-200">{folder.name}</span>
          </div>
          
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 rounded font-normal ${
              folder.status === 'En cours' 
                ? 'bg-[#FFCB56]/20 text-[#FFD758] border-[#FFCB56]/40' 
                : 'bg-slate-700/50 text-slate-300 border-slate-600'
            }`}
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
    <Card className={cn("bg-[#242d3d] border border-slate-700/60 rounded text-slate-100 shadow-sm", className)} dir="rtl">
      <CardHeader className="p-3 pb-2 border-b border-slate-700/40">
        <CardTitle className="text-xs font-semibold flex items-center gap-2 text-slate-200">
          <FolderOpen className="h-3.5 w-3.5 text-[#90cdf4]" />
          تصنيف المستندات
          {currentUser?.role === 'User' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded bg-slate-700/50 text-slate-300 border-slate-600 font-normal">
              للعرض
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {isLoading ? (
          <div className="text-center py-3">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#90cdf4] mx-auto"></div>
            <p className="text-[11px] text-slate-400 mt-2">جاري التحميل...</p>
          </div>
        ) : rootFolders.length === 0 ? (
          <div className="text-center py-3 text-slate-400">
            <Folder className="h-6 w-6 mx-auto mb-1 opacity-40 text-slate-400" />
            <p className="text-xs">لا توجد مجلدات</p>
          </div>
        ) : (
          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {rootFolders.map(folder => renderFolder(folder))}
          </div>
        )}
        
        <div className="mt-3 pt-2.5 border-t border-slate-700/40">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs flex items-center justify-center gap-1.5 bg-[#1a202c] hover:bg-[#2d3748] text-slate-200 hover:text-white border-slate-700 rounded transition-colors duration-200"
            onClick={() => navigate('/dashboard/folders')}
          >
            <Eye className="h-3.5 w-3.5" />
            عرض جميع المجلدات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FolderSidebar;
