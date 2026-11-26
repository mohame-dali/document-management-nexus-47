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
import { useDirection } from '@/i18n/useDirection';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface LeaveReasonsListProps {
  reasons: LeaveReason[];
  loading?: boolean;
  onEdit: (reason: LeaveReason) => void;
  onToggle: (id: string) => Promise<void>;
  onDelete: (reason: LeaveReason) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  conge: { label: 'عطلة (Congé)', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  mission: { label: 'مهمة (Mission)', color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  formation: { label: 'تكوين (Formation)', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  service: { label: 'خدمة (Service)', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  autre: { label: 'أخرى (Autre)', color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

export const LeaveReasonsList: React.FC<LeaveReasonsListProps> = ({
  reasons,
  loading = false,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const { dir } = useDirection();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <TableSkeleton rows={6} columns={7} />
      </div>
    );
  }

  if (reasons.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
        <EmptyState
          icon={<Tag className="h-10 w-10 text-slate-700 dark:text-slate-300" />}
          title="لا توجد أنواع غياب مطابقة"
          description="قم بتعديل خيارات البحث أو الفلترة أو أضف نوع غياب جديد."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
      <Table dir={dir} className="w-full text-start border-collapse">
        <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
            <TableHead className="w-16 text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-start whitespace-nowrap">الترتيب</TableHead>
            <TableHead className="text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-start whitespace-nowrap">الرمز (Code)</TableHead>
            <TableHead className="text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-start whitespace-nowrap">المسمى بالعربية والفرنسية</TableHead>
            <TableHead className="text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-start whitespace-nowrap">التصنيف</TableHead>
            <TableHead className="text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-center whitespace-nowrap">خصم من الرصيد</TableHead>
            <TableHead className="text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-center whitespace-nowrap">الحالة</TableHead>
            <TableHead className="w-36 text-slate-800 dark:text-slate-200 font-bold text-xs py-3 px-4 text-center whitespace-nowrap">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-200 dark:divide-slate-800">
          {reasons.map((reason) => {
            const catInfo = CATEGORY_LABELS[reason.category] || CATEGORY_LABELS.autre;
            return (
              <TableRow
                key={reason._id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors duration-150 border-slate-200 dark:border-slate-800"
              >
                {/* Order */}
                <TableCell className="py-3 px-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {reason.order ?? 100}
                </TableCell>

                {/* Code */}
                <TableCell className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: reason.color || '#e2e8f0' }}
                      title={reason.color}
                    />
                    <span className="font-mono text-xs font-semibold text-[#2c5282] dark:text-blue-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md tabular-nums" dir="ltr">
                      {reason.code}
                    </span>
                    {reason.isSystem && (
                      <Badge variant="outline" className="text-[13px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 gap-1 px-1.5 py-0 h-5 font-medium">
                        <ShieldCheck className="h-3 w-3 text-slate-700 dark:text-slate-300" />
                        نظامي
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Labels */}
                <TableCell className="py-3 px-4">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {reason.labelAr}
                    </span>
                    {reason.labelFr && (
                      <span className="block text-xs text-slate-700 dark:text-slate-300 font-normal" dir="ltr">
                        {reason.labelFr}
                      </span>
                    )}
                    {reason.requiresDocument && (
                      <span className="inline-flex items-center gap-1 text-[13px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md mt-1">
                        <FileText className="h-3 w-3" />
                        يتطلب وثيقة
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell className="py-3 px-4 whitespace-nowrap">
                  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md border ${catInfo.color}`}>
                    {catInfo.label}
                  </span>
                </TableCell>

                {/* Deducts from balance */}
                <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                  {reason.impacteSolde ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      يخصم
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                      <XCircle className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                      لا يخصم
                    </span>
                  )}
                </TableCell>

                {/* Status Toggle */}
                <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <Switch
                      checked={reason.isActive}
                      onCheckedChange={() => onToggle(reason._id)}
                      aria-label="تغيير الحالة"
                    />
                    <span className={`text-xs font-medium ${reason.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
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
                            className="h-9 w-9 p-0 text-[#2c5282] dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
                              className={`h-9 w-9 p-0 rounded-lg ${
                                reason.isSystem
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50'
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
