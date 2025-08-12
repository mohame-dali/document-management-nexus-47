
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderDocumentsList } from './FolderDocumentsList';
import { Folder } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FolderDocumentsModalProps {
  selectedFolder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
}

export const FolderDocumentsModal: React.FC<FolderDocumentsModalProps> = ({
  selectedFolder,
  isOpen,
  onClose,
  canManage
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800">
              {selectedFolder ? `مستندات المجلد: ${selectedFolder.name}` : 'مستندات المجلد'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6">
          <FolderDocumentsList
            selectedFolder={selectedFolder}
            canManage={canManage}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
