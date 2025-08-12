
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

interface CorrespondenceFieldsProps {
  form: UseFormReturn<any>;
}

const CorrespondenceFields: React.FC<CorrespondenceFieldsProps> = ({
  form
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="correspondenceNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Correspondence Number</FormLabel>
            <FormControl>
              <Input placeholder="REF-2025-001" {...field} />
            </FormControl>
            <FormDescription>Reference number of the document</FormDescription>
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
            label="Correspondence Date"
            description="Date of the correspondence"
            selectDateText="Select date"
          />
        )}
      />
    </div>
  );
};

export default CorrespondenceFields;
