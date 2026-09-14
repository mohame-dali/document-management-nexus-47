import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentOption } from '@/services/documentOptionsService';
import { Sliders, Info, Check, X } from 'lucide-react';

const formSchema = z.object({
  category: z.enum(['activity', 'source', 'typeDocument', 'assignedTo', 'pourInfo']),
  documentType: z.enum(['incoming', 'outgoing', 'both']),
  value: z.string().trim().min(1, 'قيمة الخيار مطلوبة').max(100, 'يجب أن لا تتجاوز القيمة 100 حرف'),
});

export type DocumentOptionFormData = z.infer<typeof formSchema>;

interface DocumentOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentOptionFormData) => void;
  editingOption?: DocumentOption | null;
  isLoading?: boolean;
  onClose: () => void;
}

export const DocumentOptionDialog: React.FC<DocumentOptionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  editingOption,
  isLoading = false,
  onClose,
}) => {
  const form = useForm<DocumentOptionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: 'activity',
      documentType: 'both',
      value: '',
    },
  });

  useEffect(() => {
    if (editingOption) {
      form.reset({
        category: editingOption.category,
        documentType: editingOption.documentType,
        value: editingOption.value,
      });
    } else {
      form.reset({
        category: 'activity',
        documentType: 'both',
        value: '',
      });
    }
  }, [editingOption, form]);

  const handleSubmit = (data: DocumentOptionFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const categoryLabels: Record<string, { label: string; desc: string }> = {
    activity: { label: 'النشاط', desc: 'تصنيفات الأنشطة والمهام الإدارية' },
    source: { label: 'المصدر / الجهة', desc: 'الجهات والمصالح المرسلة أو المستقبلة' },
    typeDocument: { label: 'نوع الوثيقة', desc: 'مذكرة، مراسلة، تقرير، قرار، إلخ' },
    assignedTo: { label: 'مخصص إلى', desc: 'المصالح والوحدات المعنية بالتوجيه' },
    pourInfo: { label: 'للإعلام', desc: 'الجهات الموجه إليها للإعلام والمتابعة' },
  };

  const documentTypeLabels: Record<string, string> = {
    both: 'كلا النوعين (الوثائق الواردة والصادرة)',
    incoming: 'الوثائق الواردة فقط',
    outgoing: 'الوثائق الصادرة فقط',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] sm:w-[90vw] sm:max-w-[720px] bg-white border border-[#e2e8f0] rounded p-6 sm:p-8 space-y-6 shadow-xl"
        dir="rtl"
      >
        <DialogHeader className="pb-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#2c5282] text-white flex items-center justify-center flex-shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-[#2c5282] leading-normal">
                {editingOption ? 'تعديل خيار الوثيقة' : 'إضافة خيار وثيقة جديد'}
              </DialogTitle>
              <DialogDescription className="text-base text-[#4a5568] leading-relaxed mt-1">
                {editingOption 
                  ? 'تحديث بيانات الخيار المتاح في القوائم المنسدلة للوثائق'
                  : 'تحديد فئة ونوع المراسلة وتسمية الخيار الجديد لإضافته للنظام'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informational Banner */}
        <div className="bg-amber-50 border border-[#FFD758] rounded p-3.5 flex items-start gap-2.5 text-[#78350f]">
          <Info className="h-5 w-5 text-[#78350f] flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            الخيارات المضافة هنا تظهر للمستخدمين عند تسجيل المراسلات، وتساعد في توحيد تصنيف البيانات وسهولة استرجاعها.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Category Field */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-base font-semibold text-[#1a202c]">
                    الفئة الإدارية <span className="text-red-600">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200">
                        <SelectValue placeholder="اختر الفئة الإدارية" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      {Object.entries(categoryLabels).map(([value, item]) => (
                        <SelectItem key={value} value={value} className="text-base py-2">
                          <div className="flex flex-col text-right">
                            <span className="font-semibold text-[#1a202c]">{item.label}</span>
                            <span className="text-xs text-[#718096]">{item.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-sm text-red-600" />
                </FormItem>
              )}
            />

            {/* Document Type Field */}
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-base font-semibold text-[#1a202c]">
                    نوع المراسلة المعنية <span className="text-red-600">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200">
                        <SelectValue placeholder="اختر نوع المراسلة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent dir="rtl">
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-base py-2">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-sm text-red-600" />
                </FormItem>
              )}
            />

            {/* Value Field */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-base font-semibold text-[#1a202c]">
                    تسمية / قيمة الخيار <span className="text-red-600">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="أدخل نص الخيار كما سيظهر بالقائمة..." 
                      {...field} 
                      disabled={isLoading}
                      className="h-11 text-base text-right border-[#cbd5e1] rounded bg-white focus:border-[#2c5282] focus:ring-1 focus:ring-[#2c5282] transition-colors duration-200"
                    />
                  </FormControl>
                  <FormMessage className="text-sm text-red-600" />
                </FormItem>
              )}
            />

            {/* Footer Buttons */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-start gap-3 pt-4 border-t border-[#e2e8f0]">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 px-6 text-base font-semibold text-white bg-[#2c5282] hover:bg-[#234269] rounded transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>{isLoading ? 'جاري الحفظ...' : editingOption ? 'حفظ التعديلات' : 'إنشاء الخيار'}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="h-11 px-5 text-base font-medium border-[#cbd5e1] text-[#2d3748] hover:bg-gray-100 rounded transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                <span>إلغاء</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentOptionDialog;
