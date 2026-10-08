
import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import MultiDepartmentSelectField from '@/components/documents/forms/MultiDepartmentSelectField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import DatePickerField from '@/components/documents/forms/DatePickerField';

interface DocumentDetailsFieldsProps {
  form: UseFormReturn<any>;
  t: any;
  departments: any[];
}

const DocumentDetailsFields: React.FC<DocumentDetailsFieldsProps> = ({
  form,
  t,
  departments
}) => {
  const watchActivity = form.watch('activity');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.subject}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>{t.subjectDesc}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.source}</FormLabel>
              <FormControl>
                <DocumentOptionSelect
                  category="source"
                  documentType="incoming"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder="اختر المصدر..."
                />
              </FormControl>
              <FormDescription>{t.sourceDesc}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="typeDocument"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع الوثيقة</FormLabel>
              <FormControl>
                <DocumentOptionSelect
                  category="typeDocument"
                  documentType="incoming"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder="اختر نوع الوثيقة..."
                />
              </FormControl>
              <FormDescription>نوع الوثيقة (رسالة، تقرير، الخ.)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>النشاط (اختياري)</FormLabel>
              <FormControl>
                <DocumentOptionSelect
                  category="activity"
                  documentType="incoming"
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Clear dateActivity if no activity is selected
                    if (!value) {
                      form.setValue('dateActivity', undefined);
                    }
                  }}
                  placeholder="اختر النشاط (اختياري)..."
                />
              </FormControl>
              <FormDescription>النشاط المتعلق بالوثيقة (يمكن تركه فارغاً)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Activity Date Field - Only show if activity is selected */}
      {watchActivity && (
        <FormField
          control={form.control}
          name="dateActivity"
          render={({ field }) => (
            <DatePickerField
              field={field}
              label="تاريخ النشاط"
              description="تاريخ تنفيذ النشاط المحدد"
              selectDateText="اختر تاريخ النشاط"
            />
          )}
        />
      )}

      {departments && departments.length > 0 && (
        <FormField
          control={form.control}
          name="departments"
          render={({ field }) => (
            <MultiDepartmentSelectField
              field={field}
              label={t.assignedTo}
              description={t.assignedToDesc}
              departments={departments}
              placeholder="اختر الأقسام..."
            />
          )}
        />
      )}
    </div>
  );
};

export default DocumentDetailsFields;
