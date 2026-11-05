import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderDocumentsList } from './FolderDocumentsList';
import { Folder } from '@/types';
import { FolderOpen } from 'lucide-react';

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
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
  });

  // Reset position to center whenever modal closes or re-opens
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  // Window listeners for mouse and touch drag movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.initialPosX + deltaX,
        y: dragStartRef.current.initialPosY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.startX;
      const deltaY = touch.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.initialPosX + deltaX,
        y: dragStartRef.current.initialPosY + deltaY,
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: isDragging ? 'none' : undefined,
        }}
        className="max-w-[90vw] w-[90vw] md:w-[80vw] lg:w-[70vw] max-h-[90vh] overflow-y-auto p-6 bg-white border border-[#e2e8f0] rounded shadow-sm"
        dir="rtl"
      >
        <DialogHeader
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          className="pb-4 pr-12 border-b border-[#e2e8f0] bg-transparent select-none text-right"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#2c5282]/10 flex items-center justify-center text-[#2c5282] shrink-0">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282]">
                {selectedFolder ? `مستندات المجلد: ${selectedFolder.name}` : 'مستندات المجلد'}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-0.5">عرض وإدارة الوثائق الإدارية المودعة في هذا المجلد</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
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
