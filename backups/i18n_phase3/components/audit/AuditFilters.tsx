
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter, X, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { AuditLogFilters } from '@/services/auditService';

interface AuditFiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const AuditFilters: React.FC<AuditFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters
}) => {
  const actionTypes = [
    { value: 'document_create', label: 'إنشاء مستند' },
    { value: 'document_update', label: 'تحديث مستند' },
    { value: 'document_delete', label: 'حذف مستند' },
    { value: 'document_view', label: 'عرض مستند' },
    { value: 'document_download', label: 'تحميل مستند' },
    { value: 'folder_create', label: 'إنشاء مجلد' },
    { value: 'folder_update', label: 'تحديث مجلد' },
    { value: 'folder_delete', label: 'حذف مجلد' },
    { value: 'user_login', label: 'تسجيل دخول' },
    { value: 'user_logout', label: 'تسجيل خروج' }
  ];

  const entityTypes = [
    { value: 'document', label: 'مستند' },
    { value: 'folder', label: 'مجلد' },
    { value: 'user', label: 'مستخدم' }
  ];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.action && filters.action !== 'all') count++;
    if (filters.entityType && filters.entityType !== 'all') count++;
    if (filters.userId) count++;
    return count;
  };

  return (
    <Card className="bg-white border border-[#e2e8f0] shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2c5282]">
          <Filter className="h-5 w-5" />
          مرشحات سجل التدقيق
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="ml-2 bg-[#edf2f7] text-[#2c5282]">
              {getActiveFiltersCount()} نشط
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>من تاريخ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => onFiltersChange({ ...filters, startDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>إلى تاريخ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => onFiltersChange({ ...filters, endDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Action Type */}
        <div>
          <Label>نوع العملية</Label>
          <Select 
            value={filters.action || 'all'} 
            onValueChange={(value) => onFiltersChange({ ...filters, action: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع العملية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العمليات</SelectItem>
              {actionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entity Type */}
        <div>
          <Label>نوع الكيان</Label>
          <Select 
            value={filters.entityType || 'all'} 
            onValueChange={(value) => onFiltersChange({ ...filters, entityType: value === 'all' ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر نوع الكيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الكيانات</SelectItem>
              {entityTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User ID */}
        <div>
          <Label>معرف المستخدم</Label>
          <Input
            placeholder="أدخل معرف المستخدم"
            value={filters.userId || ''}
            onChange={(e) => onFiltersChange({ ...filters, userId: e.target.value || undefined })}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={onApplyFilters} className="flex-1 h-11">
            <Filter className="h-4 w-4 mr-2" />
            تطبيق المرشحات
          </Button>
          <Button onClick={onResetFilters} variant="outline" aria-label="إعادة تعيين المرشحات" className="h-11 w-11 p-0">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Clear individual filters */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.startDate && (
              <Badge variant="secondary" className="flex items-center gap-1">
                من: {format(filters.startDate, 'dd/MM/yyyy', { locale: ar })}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, startDate: undefined })}
                />
              </Badge>
            )}
            {filters.endDate && (
              <Badge variant="secondary" className="flex items-center gap-1">
                إلى: {format(filters.endDate, 'dd/MM/yyyy', { locale: ar })}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, endDate: undefined })}
                />
              </Badge>
            )}
            {filters.action && filters.action !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {actionTypes.find(t => t.value === filters.action)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, action: undefined })}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditFilters;
