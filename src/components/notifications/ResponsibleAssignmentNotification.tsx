
import React from 'react';
import { toast } from 'sonner';
import { FileText, User, CheckCircle } from 'lucide-react';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface ResponsibleAssignmentNotificationProps {
  documentId: string;
  documentSubject: string;
  assignedBy: string;
  onMarkAsRead?: () => void;
}

export const showResponsibleAssignmentNotification = ({
  documentId,
  documentSubject,
  assignedBy,
  onMarkAsRead
}: ResponsibleAssignmentNotificationProps) => {
  toast.success(
    'تم تعيينك كمسؤول عن وثيقة',
    {
      description: (
        <div className="space-y-2" dir="rtl">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{documentSubject}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm text-gray-600">تم التعيين بواسطة: {assignedBy}</span>
          </div>
          <div className="text-xs text-gray-500">
            {formatArabicDate(new Date())}
          </div>
        </div>
      ),
      icon: <FileText className="h-5 w-5 text-green-500" />,
      duration: 10000,
      action: {
        label: 'تم الاطلاع',
        onClick: onMarkAsRead || (() => {})
      },
      className: 'text-right',
      style: { direction: 'rtl' }
    }
  );
};

export default showResponsibleAssignmentNotification;
