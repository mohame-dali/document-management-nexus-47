
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

interface DocumentTypeFieldProps {
  form: UseFormReturn<any>;
  label: string;
  description: string;
  name?: string;
}

const DocumentTypeField: React.FC<DocumentTypeFieldProps> = ({
  form,
  label,
  description,
  name = "typeDocument"
}) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DocumentTypeField;
