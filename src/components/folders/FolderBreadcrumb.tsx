
import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Folder as FolderType } from '@/types';

interface FolderBreadcrumbProps {
  currentFolder: FolderType | null;
  folders: FolderType[];
  onNavigate: (folder: FolderType | null) => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  currentFolder,
  folders,
  onNavigate
}) => {
  const buildBreadcrumbPath = (folder: FolderType | null): FolderType[] => {
    if (!folder) return [];
    
    const path: FolderType[] = [folder];
    let current = folder;
    
    while (current && current.parent) {
      const parentId = typeof current.parent === 'string' ? current.parent : current.parent._id;
      const parentFolder = folders.find(f => f._id === parentId);
      
      if (parentFolder) {
        path.unshift(parentFolder);
        current = parentFolder;
      } else {
        break;
      }
    }
    
    return path;
  };

  const breadcrumbPath = buildBreadcrumbPath(currentFolder);

  return (
    <nav className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg" dir="rtl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 hover:bg-gray-200"
      >
        <Home className="h-4 w-4" />
        <span className="text-sm">الرئيسية</span>
      </Button>
      
      {breadcrumbPath.map((folder, index) => (
        <React.Fragment key={folder._id}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(folder)}
            className={`flex items-center gap-1 hover:bg-gray-200 ${
              index === breadcrumbPath.length - 1 ? 'text-blue-600 font-medium' : ''
            }`}
          >
            <Folder className="h-4 w-4" />
            <span className="text-sm truncate max-w-32">{folder.name}</span>
          </Button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default FolderBreadcrumb;
