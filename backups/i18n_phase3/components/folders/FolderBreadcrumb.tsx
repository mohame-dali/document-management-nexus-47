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
    <nav className="flex items-center flex-wrap gap-1 p-2 bg-white border border-[#e2e8f0] rounded text-xs" dir="rtl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="h-7 px-2 text-xs flex items-center gap-1.5 text-[#2c5282] hover:bg-gray-100 rounded transition-colors duration-200"
      >
        <Home className="h-3.5 w-3.5" />
        <span>الجذر (الكل)</span>
      </Button>
      
      {breadcrumbPath.map((folder, index) => (
        <React.Fragment key={folder._id}>
          <ChevronRight className="h-3 w-3 text-gray-400 rotate-180" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(folder)}
            className={`h-7 px-2 text-xs flex items-center gap-1.5 rounded transition-colors duration-200 ${
              index === breadcrumbPath.length - 1 
                ? 'bg-amber-50/70 text-[#78350f] font-semibold border border-[#FFCB56]' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className={`h-3.5 w-3.5 ${index === breadcrumbPath.length - 1 ? 'text-[#d97706]' : 'text-[#2c5282]'}`} />
            <span className="truncate max-w-[150px]">{folder.name}</span>
          </Button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default FolderBreadcrumb;
