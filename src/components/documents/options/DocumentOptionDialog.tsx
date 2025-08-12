
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

const formSchema = z.object({
  category: z.enum(['activity', 'source', 'typeDocument', 'assignedTo', 'pourInfo']),
  documentType: z.enum(['incoming', 'outgoing', 'both']),
  value: z.string().min(1, 'القيمة مطلوبة').max(100, 'يجب أن تكون القيمة أقل من 100 حرف'),
});

type FormData = z.infer<typeof formSchema>;

interface DocumentOptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  editingOption?: DocumentOption | null;
  isLoading?: boolean;
  onClose: () => void;
}

const DocumentOptionDialog: React.FC<DocumentOptionDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  editingOption,
  isLoading = false,
  onClose,
}) => {
  const form = useForm<FormData>({
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

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const categoryLabels = {
    activity: 'النشاط',
    source: 'المصدر',
    typeDocument: 'نوع الوثيقة',
    assignedTo: 'مخصص إلى',
    pourInfo: 'للإعلام',
  };

  const documentTypeLabels = {
    incoming: 'الوثائق الواردة',
    outgoing: 'الوثائق الصادرة',
    both: 'كلا النوعين',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-blue-900">
            {editingOption ? 'تعديل خيار الوثيقة' : 'إضافة خيار وثيقة جديد'}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-600">
            {editingOption 
              ? 'قم بتحديث تفاصيل خيار الوثيقة أدناه.'
              : 'أنشئ خياراً جديداً سيكون متاحاً في نماذج الوثائق.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">الفئة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر فئة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-right">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">نوع الوثيقة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر نوع الوثيقة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-right">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-right">القيمة</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="أدخل قيمة الخيار" 
                      {...field} 
                      disabled={isLoading}
                      className="text-right"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2 justify-start">
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? 'جاري الحفظ...' : editingOption ? 'تحديث' : 'إنشاء'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentOptionDialog;
