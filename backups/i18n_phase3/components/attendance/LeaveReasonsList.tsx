import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LeaveReason } from '@/services/leaveReasonService';
import { 
  Edit2, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ShieldCheck, 
  Tag
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaveReasonsListProps {
  reasons: LeaveReason[];
  loading?: boolean;
  onEdit: (reason: LeaveReason) => void;
  onToggle: (id: string) => Promise<void>;
  onDelete: (reason: LeaveReason) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  conge: { label: 'عطلة (Congé)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  mission: { label: 'مهمة (Mission)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  formation: { label: 'تكوين (Formation)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  service: { label: 'خدمة (Service)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autre: { label: 'أخرى (Autre)', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export const LeaveReasonsList: React.FC<LeaveReasonsListProps> = ({
  reasons,
  loading = false,
  onEdit,
  onToggle,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center text-[#718096]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c5282] mb-3"></div>
        <p className="text-sm font-medium">جاري تحميل قائمة أنواع الغياب...</p>
      </div>
    );
  }

  if (reasons.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-[#e2e8f0] rounded">
        <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#1a202c]">لا توجد أنواع غياب مطابقة</h3>
        <p className="text-sm text-[#718096] mt-1">قم بتعديل خيارات البحث أو الفلترة أو أضف نوع غياب جديد.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border border-[#e2e8f0] rounded">
      <Table dir="rtl" className="w-full text-right border-collapse">
        <TableHeader className="bg-[#f8fafc] border-b border-[#e2e8f0]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16 text-[#4a5568] font-bold text-xs py-3 px-4">الترتيب</TableHead>
            <TableHead className="text-[#4a5568] font-bold text-xs py-3 px-4">الرمز (Code)</TableHead>
            <TableHead className="text-[#4a5568] font-bold text-xs py-3 px-4">المسمى بالعربية والفرنسية</TableHead>
            <TableHead className="text-[#4a5568] font-bold text-xs py-3 px-4">التصنيف</TableHead>
            <TableHead className="text-[#4a5568] font-bold text-xs py-3 px-4 text-center">خصم من الرصيد</TableHead>
            <TableHead className="text-[#4a5568] font-bold text-xs py-3 px-4 text-center">الحالة</TableHead>
            <TableHead className="w-36 text-[#4a5568] font-bold text-xs py-3 px-4 text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#e2e8f0]">
          {reasons.map((reason) => {
            const catInfo = CATEGORY_LABELS[reason.category] || CATEGORY_LABELS.autre;
            return (
              <TableRow
                key={reason._id}
                className="hover:bg-[#f8fafc] transition-colors duration-150"
              >
                {/* Order */}
                <TableCell className="py-3 px-4 text-xs font-mono font-bold text-[#718096]">
                  {reason.order ?? 100}
                </TableCell>

                {/* Code */}
                <TableCell className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: reason.color || '#e2e8f0' }}
                      title={reason.color}
                    />
                    <span className="font-mono text-xs font-semibold text-[#2c5282] bg-slate-100 px-2 py-0.5 rounded" dir="ltr">
                      {reason.code}
                    </span>
                    {reason.isSystem && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-300 gap-1 px-1.5 py-0 h-5 font-medium">
                        <ShieldCheck className="h-3 w-3 text-slate-500" />
                        نظامي
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Labels */}
                <TableCell className="py-3 px-4">
                  <div>
                    <span className="font-bold text-sm text-[#1a202c]">
                      {reason.labelAr}
                    </span>
                    {reason.labelFr && (
                      <span className="block text-xs text-[#718096] font-normal" dir="ltr">
                        {reason.labelFr}
                      </span>
                    )}
                    {reason.requiresDocument && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
                        <FileText className="h-3 w-3" />
                        يتطلب وثيقة
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell className="py-3 px-4">
                  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded border ${catInfo.color}`}>
                    {catInfo.label}
                  </span>
                </TableCell>

                {/* Deducts from balance */}
                <TableCell className="py-3 px-4 text-center">
                  {reason.impacteSolde ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      يخصم
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-[#718096] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      <XCircle className="h-3.5 w-3.5 text-slate-400" />
                      لا يخصم
                    </span>
                  )}
                </TableCell>

                {/* Status Toggle */}
                <TableCell className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={reason.isActive}
                      onCheckedChange={() => onToggle(reason._id)}
                      aria-label="تغيير الحالة"
                    />
                    <span className={`text-xs font-medium ${reason.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {reason.isActive ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(reason)}
                            aria-label="تعديل نوع الغياب"
                            className="h-11 w-11 p-0 text-[#2c5282] hover:bg-slate-100 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>تعديل</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={reason.isSystem}
                              onClick={() => onDelete(reason)}
                              aria-label={
                                reason.isSystem
                                  ? 'نوع نظامي محمي لا يمكن حذفه'
                                  : 'حذف نوع الغياب'
                              }
                              className={`h-11 w-11 p-0 rounded ${
                                reason.isSystem
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {reason.isSystem ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {reason.isSystem ? 'الأنواع النظامية محمية من الحذف' : 'حذف النوع'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
