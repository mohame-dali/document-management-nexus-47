
import React from 'react';
import { X, FileText, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatArabicDate } from '@/utils/arabicDateFormatter';

interface ResponsibleNotificationPopupProps {
  documentId: string;
  documentSubject: string;
  documentSerialNumber: number;
  documentYear: number;
  assignedBy: string;
  assignedAt: string;
  onMarkAsRead: () => void;
  onTemporaryDismiss: () => void;
}

const ResponsibleNotificationPopup: React.FC<ResponsibleNotificationPopupProps> = ({
  documentId,
  documentSubject,
  documentSerialNumber,
  documentYear,
  assignedBy,
  assignedAt,
  onMarkAsRead,
  onTemporaryDismiss
}) => {
  return (
    <div 
      className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right-full duration-500"
      dir="rtl"
    >
      <Card className="w-96 bg-white border-2 border-blue-500 shadow-2xl">
        <CardHeader className="pb-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-800">تم تعيينك كمسؤول</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTemporaryDismiss}
              aria-label="إغلاق الإشعار"
              className="h-11 w-11 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Badge variant="secondary" className="w-fit">
            إشعار مهم
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Document Information */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-1 text-gray-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 leading-relaxed">
                  {documentSubject}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  رقم الوثيقة: {documentSerialNumber}/{documentYear}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                تم التعيين بواسطة: <span className="font-medium">{assignedBy}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                {formatArabicDate(new Date(assignedAt))}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              onClick={onMarkAsRead}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              تم الاطلاع
            </Button>
            <Button 
              variant="outline" 
              onClick={onTemporaryDismiss}
              size="sm"
            >
              إخفاء مؤقت
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponsibleNotificationPopup;
