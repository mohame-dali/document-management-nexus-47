
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
import { Button } from '@/components/ui/button';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import DatePickerField from '@/components/documents/forms/DatePickerField';
import DocumentOptionSelect from '@/components/ui/document-option-select';
import MultiDocumentOptionSelect from '@/components/ui/multi-document-option-select';
import { MultiOrganizationAutocomplete } from '@/components/documents/forms/OrganizationAutocomplete';
import { Department } from '@/types';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Sparkles, Loader2 } from 'lucide-react';

interface BasicInfoFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  t: Record<string, string>;
  departments: Department[];
  onSerialNumberChange?: (value: string) => void;
  showOptionalFields?: boolean;
  hasExtractedText?: boolean;
  isSuggestingSubject?: boolean;
  onSuggestSubject?: () => void;
}

const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  form,
  t,
  departments,
  onSerialNumberChange,
  showOptionalFields = true,
  hasExtractedText = false,
  isSuggestingSubject = false,
  onSuggestSubject,
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
              keepSelected
            />
          )}
        />
      </div>

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
        name="assignedTo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t.destination || translate('documents.forms.outgoingDestination')}</FormLabel>
            <FormControl>
              <MultiOrganizationAutocomplete
                category="assignedTo"
                documentType="outgoing"
                values={field.value || []}
                onValuesChange={field.onChange}
                placeholder={translate('documents.forms.autocomplete.destinationPlaceholder')}
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

        {showOptionalFields ? (
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
        ) : (
          departments &&
          departments.length > 0 && (
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
          )
        )}
      </div>

      {showOptionalFields && departments && departments.length > 0 && (
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
