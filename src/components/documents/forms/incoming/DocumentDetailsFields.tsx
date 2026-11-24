
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
import { UseFormReturn, FieldValues } from 'react-hook-form';
import MultiDepartmentSelectField from '@/components/documents/forms/MultiDepartmentSelectField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import DatePickerField from '@/components/documents/forms/DatePickerField';
import { Department } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';

interface DocumentDetailsFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  t: Record<string, string>;
  departments: Department[];
}

const DocumentDetailsFields: React.FC<DocumentDetailsFieldsProps> = ({
  form,
  t,
  departments
}) => {
  const { t: translate } = useLanguage();
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
                  placeholder={translate('documents.forms.sourcePlaceholder')}
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
              <FormLabel>{translate('documents.forms.typeDocument')}</FormLabel>
              <FormControl>
                <DocumentOptionSelect
                  category="typeDocument"
                  documentType="incoming"
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
          name="activity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{translate('documents.forms.activity')}</FormLabel>
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
                  placeholder={translate('documents.forms.activityPlaceholder')}
                />
              </FormControl>
              <FormDescription>{translate('documents.forms.activityDesc')}</FormDescription>
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
              label={translate('documents.forms.dateActivity')}
              description={translate('documents.forms.dateActivityDesc')}
              selectDateText={translate('documents.forms.selectActivityDate')}
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
              label={t.assignedTo || translate('documents.forms.assignedDepartments')}
              description={t.assignedToDesc || translate('documents.forms.assignedDepartmentsDesc')}
              departments={departments}
              placeholder={translate('documents.forms.assignedDepartmentsPlaceholder')}
            />
          )}
        />
      )}
    </div>
  );
};

export default DocumentDetailsFields;
