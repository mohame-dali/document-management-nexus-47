
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  Calendar,
  Clock
} from 'lucide-react';
import { exportAuditLogs, type AuditLogFilters } from '@/services/auditService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AuditExportProps {
  filters: AuditLogFilters;
  totalRecords?: number;
}

const AuditExport: React.FC<AuditExportProps> = ({ filters, totalRecords = 0 }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const blob = await exportAuditLogs(exportFormat, filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `audit-logs_${timestamp}.${exportFormat}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`تم تصدير سجل التدقيق بصيغة ${exportFormat.toUpperCase()} بنجاح`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('فشل في تصدير سجل التدقيق. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.action) count++;
    if (filters.entityType) count++;
    if (filters.userId) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="bg-white border border-[#e2e8f0] shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2c5282]">
          <Download className="h-5 w-5" />
          تصدير سجل التدقيق
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Summary */}
        <div className="bg-[#f8fafc] rounded p-4 border border-[#e2e8f0]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">ملخص التصدير</h4>
            <Badge variant="outline" className="bg-[#ebf4ff] text-[#2c5282] border-blue-200">
              {totalRecords} سجل
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                من: {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy', { locale: ar }) : 'البداية'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                إلى: {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy', { locale: ar }) : 'النهاية'}
              </span>
            </div>
          </div>
          
          {activeFiltersCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">المرشحات النشطة:</span>
                <Badge variant="secondary">{activeFiltersCount} مرشح</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Export Format Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">تنسيق التصدير</label>
          <Select value={exportFormat} onValueChange={(value: 'csv' | 'pdf') => setExportFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>CSV - جدول بيانات</span>
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  <span>PDF - مستند محمول</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Description */}
        <div className="bg-white rounded p-3 border border-gray-200">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-gray-600">
              {exportFormat === 'csv' ? (
                <div>
                  <p className="font-medium mb-1">تصدير CSV:</p>
                  <p>سيتم تصدير البيانات كجدول بيانات يمكن فتحه في Excel أو Google Sheets لتحليل أفضل ومعالجة البيانات.</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-1">تصدير PDF:</p>
                  <p>سيتم إنشاء تقرير مفصل بتنسيق PDF مناسب للأرشفة والطباعة والمشاركة الرسمية.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting || totalRecords === 0}
          className="w-full flex items-center gap-2"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              جاري التصدير...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              تصدير بصيغة {exportFormat.toUpperCase()}
            </>
          )}
        </Button>

        {totalRecords === 0 && (
          <p className="text-sm text-gray-500 text-center">
            لا توجد سجلات للتصدير. يرجى تعديل المرشحات أو إضافة بيانات جديدة.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditExport;
