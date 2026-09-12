import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderDocumentsList } from './FolderDocumentsList';
import { Folder } from '@/types';
import { X, FolderOpen } from 'lucide-react';
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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 bg-white border border-[#e2e8f0] rounded" dir="rtl">
        <DialogHeader className="p-3.5 px-5 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282]">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#2c5282]">
                  {selectedFolder ? `مستندات المجلد: ${selectedFolder.name}` : 'مستندات المجلد'}
                </DialogTitle>
                <p className="text-[11px] text-gray-500">عرض وإدارة الوثائق الإدارية المودعة في هذا المجلد</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 rounded hover:bg-gray-200 text-gray-500 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 bg-[#f7fafc]">
          <FolderDocumentsList
            selectedFolder={selectedFolder}
            canManage={canManage}
            isModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
