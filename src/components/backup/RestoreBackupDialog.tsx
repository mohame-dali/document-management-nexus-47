import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

interface RestoreBackupDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  backupInfo?: {
    fileName?: string;
    createdAt?: string;
    fileSize?: number;
  };
  isLoading?: boolean;
}

export const RestoreBackupDialog: React.FC<RestoreBackupDialogProps> = ({
  open,
  onClose,
  onConfirm,
  backupInfo,
  isLoading = false,
}) => {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const isConfirmed = confirmText === 'RESTORE';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            استعادة نسخة احتياطية
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 leading-relaxed pt-2">
            ⚠️ <strong>تحذير</strong> : هذه العملية ستقوم <strong>باستبدال البيانات الحالية</strong> بمحتوى النسخة الاحتياطية.
            <br />
            سيتم إنشاء نسخة أمان تلقائياً قبل الاستعادة.
          </DialogDescription>
        </DialogHeader>

        {backupInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">الملف :</span>
              <span className="font-semibold text-slate-800 truncate">{backupInfo.fileName}</span>
            </div>
            {backupInfo.createdAt && (
              <div className="flex justify-between">
                <span className="text-slate-600">التاريخ :</span>
                <span className="font-semibold text-slate-800">
                  {new Date(backupInfo.createdAt).toLocaleString('ar-TN')}
                </span>
              </div>
            )}
            {backupInfo.fileSize && (
              <div className="flex justify-between">
                <span className="text-slate-600">الحجم :</span>
                <span className="font-semibold text-slate-800">
                  {(backupInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Label htmlFor="confirm-restore" className="text-sm font-medium">
            للتأكيد، اكتب كلمة <code className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-xs">RESTORE</code> بالأسفل :
          </Label>
          <Input
            id="confirm-restore"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESTORE"
            className="h-11 font-mono"
            dir="ltr"
            autoComplete="off"
          />
        </div>

        <DialogFooter className="flex gap-2 sm:justify-start pt-2">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed || isLoading}
            className="h-11 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الاستعادة...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                تأكيد الاستعادة
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="h-11"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestoreBackupDialog;
