
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
import DatePickerField from '@/components/documents/forms/DatePickerField';
import { useLanguage } from '@/contexts/LanguageProvider';

interface CorrespondenceFieldsProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
}

const CorrespondenceFields: React.FC<CorrespondenceFieldsProps> = ({
  form
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="correspondenceNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('documents.forms.correspondenceNumber')}</FormLabel>
            <FormControl>
              <Input placeholder={t('documents.forms.correspondenceNumberPlaceholder')} {...field} />
            </FormControl>
            <FormDescription>{t('documents.forms.correspondenceNumberDesc')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="correspondenceDate"
        render={({ field }) => (
          <DatePickerField 
            field={field}
            label={t('documents.forms.correspondenceDate')}
            description={t('documents.forms.correspondenceDateDesc')}
            selectDateText={t('documents.createIncoming.selectDate')}
          />
        )}
      />
    </div>
  );
};

export default CorrespondenceFields;
