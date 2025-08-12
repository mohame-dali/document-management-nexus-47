
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Folder, 
  Archive, 
  Calendar, 
  User, 
  Building2, 
  FileText,
  Clock,
  Circle,
  Sparkles
} from 'lucide-react';
import { Folder as FolderType } from '@/types';
import { formatArabicDate, formatArabicDateTime } from '@/utils/arabicDateFormatter';

interface FolderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  documentCount?: number;
}

const FolderDetailsDialog: React.FC<FolderDetailsDialogProps> = ({
  open,
  onOpenChange,
  folder,
  documentCount = 0
}) => {
  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-gray-50" dir="rtl">
        <DialogHeader className="relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"></div>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-800 pt-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              {folder.status === 'Fermé' ? (
                <Archive className="h-6 w-6 text-white" />
              ) : (
                <Folder className="h-6 w-6 text-white" />
              )}
            </div>
            تفاصيل المجلد
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Enhanced Folder Info */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className={`absolute inset-0 ${
                    folder.status === 'Fermé' ? 'bg-gray-400' : 'bg-blue-500'
                  } rounded-2xl blur-lg opacity-30`}></div>
                  <div className={`relative p-4 ${
                    folder.status === 'Fermé' ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  } rounded-2xl shadow-xl`}>
                    {folder.status === 'Fermé' ? (
                      <Archive className="h-8 w-8 text-white" />
                    ) : (
                      <Folder className="h-8 w-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-2xl text-gray-800 mb-2">{folder.name}</h3>
                  <Badge 
                    variant={folder.status === 'En cours' ? 'default' : 'secondary'}
                    className="text-sm font-medium shadow-sm"
                  >
                    <Circle className="h-3 w-3 mr-1" />
                    {folder.status === 'En cours' ? 'نشط' : 'مؤرشف'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{documentCount}</div>
                    <div className="text-sm text-gray-600">مستند</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm">
                  <Building2 className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">قسم رسمي</div>
                    <div className="text-sm text-gray-600">مصنف</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Creation Details */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-6">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                معلومات الإنشاء
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                  <span className="text-gray-700 flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    تاريخ الإنشاء
                  </span>
                  <span className="font-bold text-gray-800">
                    {formatArabicDate(folder.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                  <span className="text-gray-700 flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-purple-600" />
                    وقت الإنشاء
                  </span>
                  <span className="font-bold text-gray-800">
                    {formatArabicDateTime(folder.createdAt)}
                  </span>
                </div>
                {typeof folder.createdBy === 'object' && folder.createdBy?.username && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm">
                      <span className="text-gray-700 flex items-center gap-2 font-medium">
                        <User className="h-4 w-4 text-purple-600" />
                        أنشئ بواسطة
                      </span>
                      <span className="font-bold text-gray-800">{folder.createdBy.username}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Hierarchy Info */}
          {folder.parent && (
            <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-3 text-gray-800">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                    <Folder className="h-5 w-5 text-white" />
                  </div>
                  الهيكل الهرمي
                </h4>
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  <div className="text-sm text-gray-700 font-medium">
                    هذا مجلد فرعي ضمن مجلد آخر في النظام الهرمي
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FolderDetailsDialog;
