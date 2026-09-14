
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
import DatePickerField from '@/components/documents/forms/DatePickerField';

interface SerialInfoFieldsProps {
  form: UseFormReturn<any>;
  t: any;
  onSerialNumberChange?: (value: string) => void;
}

const SerialInfoFields: React.FC<SerialInfoFieldsProps> = ({
  form,
  t,
  onSerialNumberChange
}) => {
  return (
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
        name="arrivalDate"
        render={({ field }) => (
          <DatePickerField 
            field={field}
            label={t.arrivalDate}
            description={t.arrivalDateDesc}
            selectDateText={t.selectDate}
          />
        )}
      />
    </div>
  );
};

export default SerialInfoFields;
