
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn, FieldValues } from 'react-hook-form';

interface DescriptionFieldProps<TFieldValues extends FieldValues = FieldValues> {
  form: UseFormReturn<TFieldValues>;
  label: string;
  description: string;
}

const DescriptionField: React.FC<DescriptionFieldProps> = ({
  form,
  label,
  description
}) => {
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea 
              rows={4} 
              className="resize-none" 
              {...field} 
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DescriptionField;
