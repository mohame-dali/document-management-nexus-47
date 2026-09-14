
import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock,
  User,
  FileText,
  Folder,
  Shield,
  Eye,
  Download,
  Edit,
  Trash2,
  Plus,
  Activity
} from 'lucide-react';
import type { AuditLog } from '@/services/auditService';

interface AuditTableProps {
  auditLogs: AuditLog[];
  isLoading: boolean;
}

const AuditTable: React.FC<AuditTableProps> = ({ auditLogs, isLoading }) => {
  const getActionIcon = (action: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'document_create': Plus,
      'document_update': Edit,
      'document_delete': Trash2,
      'document_view': Eye,
      'document_download': Download,
      'folder_create': Plus,
      'folder_update': Edit,
      'folder_delete': Trash2,
      'user_create': Plus,
      'user_update': Edit,
      'user_delete': Trash2,
      'user_login': User,
      'user_logout': User,
    };
    
    return iconMap[action] || Shield;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (action.includes('update') || action.includes('move')) return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    if (action.includes('delete')) return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
    if (action.includes('view') || action.includes('download')) return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
    if (action.includes('login') || action.includes('logout')) return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'document': return FileText;
      case 'folder': return Folder;
      case 'user': return User;
      default: return Shield;
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'document': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'folder': return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'user': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  const formatActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      'document_create': 'إنشاء مستند',
      'document_update': 'تحديث مستند',
      'document_delete': 'حذف مستند',
      'document_view': 'عرض مستند',
      'document_download': 'تحميل مستند',
      'document_moved_to_folder': 'نقل مستند إلى مجلد',
      'document_removed_from_folder': 'إزالة مستند من مجلد',
      'folder_create': 'إنشاء مجلد',
      'folder_update': 'تحديث مجلد',
      'folder_delete': 'حذف مجلد',
      'user_create': 'إنشاء مستخدم',
      'user_update': 'تحديث مستخدم',
      'user_delete': 'حذف مستخدم',
      'user_login': 'تسجيل دخول',
      'user_logout': 'تسجيل خروج',
    };
    
    return actionMap[action] || action.replace(/_/g, ' ');
  };

  const formatEntityType = (entityType: string) => {
    const entityMap: Record<string, string> = {
      'document': 'مستند',
      'folder': 'مجلد',
      'user': 'مستخدم',
    };
    
    return entityMap[entityType] || entityType;
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-12 text-center">
          <div className="relative mx-auto mb-6 h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">جاري التحميل...</h3>
            <p className="text-sm text-gray-500">يتم تحميل سجل التدقيق، يرجى الانتظار</p>
          </div>
        </div>
      </div>
    );
  }

  if (!auditLogs?.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-12 text-center">
          <div className="mx-auto mb-6 rounded-full bg-gray-100 p-4 w-fit">
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700">لا توجد سجلات</h3>
            <p className="text-sm text-gray-500">لم يتم العثور على سجلات تدقيق للمعايير المحددة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-150 border-b border-gray-200">
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                <div className="flex items-center gap-2 justify-end">
                  <Clock className="h-4 w-4 text-gray-600" />
                  الوقت والتاريخ
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                <div className="flex items-center gap-2 justify-end">
                  <Activity className="h-4 w-4 text-gray-600" />
                  العملية
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                <div className="flex items-center gap-2 justify-end">
                  <FileText className="h-4 w-4 text-gray-600" />
                  نوع الكيان
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                <div className="flex items-center gap-2 justify-end">
                  <User className="h-4 w-4 text-gray-600" />
                  المستخدم
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                <div className="flex items-center gap-2 justify-end">
                  <Shield className="h-4 w-4 text-gray-600" />
                  التفاصيل
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-gray-800 py-4 px-6">
                عنوان IP
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log, index) => {
              const ActionIcon = getActionIcon(log.action);
              const EntityIcon = getEntityIcon(log.entityType);
              
              return (
                <TableRow 
                  key={log._id} 
                  className={`
                    transition-all duration-200 ease-in-out
                    hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50
                    hover:shadow-sm hover:border-l-4 hover:border-l-blue-400
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}
                    border-b border-gray-100 group
                  `}
                >
                  <TableCell className="text-right py-5 px-6">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="text-right space-y-1">
                        <div className="font-semibold text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                          {format(new Date(log.createdAt), 'dd/MM/yyyy', { locale: ar })}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </div>
                      </div>
                      <div className="p-2 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm group-hover:shadow-md transition-all duration-200">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right py-5 px-6">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${getActionColor(log.action)} 
                        flex items-center gap-2 w-fit font-medium px-3 py-1.5 text-xs
                        shadow-sm transition-all duration-200 hover:shadow-md
                      `}
                    >
                      <ActionIcon className="h-3.5 w-3.5" />
                      {formatActionText(log.action)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right py-5 px-6">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${getEntityColor(log.entityType)} 
                        flex items-center gap-2 w-fit font-medium px-3 py-1.5 text-xs
                        shadow-sm transition-all duration-200 hover:shadow-md
                      `}
                    >
                      <EntityIcon className="h-3.5 w-3.5" />
                      {formatEntityType(log.entityType)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right py-5 px-6">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 group-hover:from-blue-50 group-hover:to-indigo-50 group-hover:border-blue-200 transition-all duration-200">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {log.userDetails.username}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">
                        {log.userDetails.role}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-right py-5 px-6">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-w-xs group-hover:bg-blue-50 group-hover:border-blue-200 transition-all duration-200">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono leading-relaxed">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <span className="text-gray-400 text-xs font-medium">لا توجد تفاصيل</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right py-5 px-6">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200 group-hover:from-purple-50 group-hover:to-purple-100 group-hover:border-purple-200 transition-all duration-200">
                      <span className="text-xs text-gray-700 font-mono font-medium group-hover:text-purple-700 transition-colors">
                        {log.ipAddress || 'غير متوفر'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default AuditTable;
