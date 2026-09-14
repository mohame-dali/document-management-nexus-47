
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import DatePickerField from '@/components/documents/forms/DatePickerField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import MultiDocumentOptionSelect from '@/components/ui/multi-document-option-select';

interface BasicInfoFieldsProps {
  form: UseFormReturn<any>;
  t: any;
  departments: any[];
  onSerialNumberChange?: (value: string) => void;
}

const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  form,
  t,
  departments,
  onSerialNumberChange
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.serialNumber}</FormLabel>
              <FormControl>
                <Input 
                  placeholder="1" 
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (onSerialNumberChange) {
                      onSerialNumberChange(e.target.value);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>{t.serialNumberDesc}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="issueDate"
          render={({ field }) => (
            <DatePickerField 
              field={field}
              label={t.issueDate}
              description={t.issueDateDesc}
              selectDateText={t.selectDate}
            />
          )}
        />
      </div>

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
        name="assignedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الوجهة</FormLabel>
            <FormControl>
              <MultiDocumentOptionSelect
                category="assignedTo"
                documentType="outgoing"
                values={field.value || []}
                onValuesChange={field.onChange}
                placeholder="اختر الوجهات..."
              />
            </FormControl>
            <FormDescription>الجهات المستلمة للوثيقة</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

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
                  documentType="outgoing"
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
          name="pourInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>للإعلام</FormLabel>
              <FormControl>
                <MultiDocumentOptionSelect
                  category="pourInfo"
                  documentType="outgoing"
                  values={field.value || []}
                  onValuesChange={field.onChange}
                  placeholder="اختر للإعلام..."
                />
              </FormControl>
              <FormDescription>معلومات إضافية للإعلام</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {departments && departments.length > 0 && (
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.department}</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value}
                  onChange={field.onChange}
                >
                  <option value="">{t.selectDepartment}</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>{t.departmentDesc}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default BasicInfoFields;
