
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
import { UseFormReturn, FieldValues } from 'react-hook-form';
import DatePickerField from '@/components/documents/forms/DatePickerField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import MultiDocumentOptionSelect from '@/components/ui/multi-document-option-select';
import { Department } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface BasicInfoFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  t: Record<string, string>;
  departments: Department[];
  onSerialNumberChange?: (value: string) => void;
}

const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  form,
  t,
  departments,
  onSerialNumberChange
}) => {
  const { t: translate } = useLanguage();

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
            <FormLabel>{t.destination || translate('documents.forms.outgoingDestination')}</FormLabel>
            <FormControl>
              <MultiDocumentOptionSelect
                category="assignedTo"
                documentType="outgoing"
                values={field.value || []}
                onValuesChange={field.onChange}
                placeholder={translate('documents.forms.outgoingDestinationPlaceholder')}
              />
            </FormControl>
            <FormDescription>
              {t.destinationDesc || translate('documents.forms.outgoingDestinationDesc')}
            </FormDescription>
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
              <FormLabel>{translate('documents.forms.typeDocument')}</FormLabel>
              <FormControl>
                <DocumentOptionSelect
                  category="typeDocument"
                  documentType="outgoing"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder={translate('documents.forms.typeDocumentPlaceholder')}
                />
              </FormControl>
              <FormDescription>{translate('documents.forms.typeDocumentDesc')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pourInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translate('documents.forms.pourInfo')}</FormLabel>
              <FormControl>
                <MultiDocumentOptionSelect
                  category="pourInfo"
                  documentType="outgoing"
                  values={field.value || []}
                  onValuesChange={field.onChange}
                  placeholder={translate('documents.forms.pourInfoPlaceholder')}
                />
              </FormControl>
              <FormDescription>{translate('documents.forms.pourInfoDesc')}</FormDescription>
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
                  className="flex h-10 w-full rounded border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
