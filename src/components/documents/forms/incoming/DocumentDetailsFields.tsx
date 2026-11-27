
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
import { Button } from '@/components/ui/button';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import MultiDepartmentSelectField from '@/components/documents/forms/MultiDepartmentSelectField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import DatePickerField from '@/components/documents/forms/DatePickerField';
import { OrganizationAutocomplete } from '@/components/documents/forms/OrganizationAutocomplete';
import { Department } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Sparkles, Loader2 } from 'lucide-react';

interface DocumentDetailsFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  t: Record<string, string>;
  departments: Department[];
  showOptionalFields?: boolean;
  hasExtractedText?: boolean;
  isSuggestingSubject?: boolean;
  onSuggestSubject?: () => void;
}

const DocumentDetailsFields: React.FC<DocumentDetailsFieldsProps> = ({
  form,
  t,
  departments,
  showOptionalFields = true,
  hasExtractedText = false,
  isSuggestingSubject = false,
  onSuggestSubject,
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
              <div className="flex flex-wrap items-center justify-between gap-2 min-h-[24px]">
                <FormLabel>{t.subject}</FormLabel>
                {hasExtractedText && onSuggestSubject && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSuggestSubject}
                    disabled={isSuggestingSubject}
                    className="h-7 px-2.5 text-xs font-medium rounded-md border-purple-200 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60"
                  >
                    {isSuggestingSubject ? (
                      <>
                        <Loader2 className="h-3 w-3 me-1.5 animate-spin" />
                        {translate('documents.forms.ai.suggestingSubject')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 me-1.5" />
                        {translate('documents.forms.ai.suggestSubject')}
                      </>
                    )}
                  </Button>
                )}
              </div>
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
                <OrganizationAutocomplete
                  category="source"
                  documentType="incoming"
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder={translate('documents.forms.autocomplete.sourcePlaceholder')}
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

        {showOptionalFields ? (
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
        ) : (
          departments &&
          departments.length > 0 && (
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
          )
        )}
      </div>

      {/* Activity Date Field - Only show if activity is selected */}
      {showOptionalFields && watchActivity && (
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

      {showOptionalFields && departments && departments.length > 0 && (
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
